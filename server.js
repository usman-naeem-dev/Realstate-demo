/**
 * Standalone WebSocket Relay Server for Production
 * Deploy this to Railway, Render, Fly.io, etc.
 * 
 * Run: node server.js
 */

const { WebSocketServer, WebSocket } = require('ws');

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17';

const sessions = new Map();

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function connectToOpenAI(session) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    sendToClient(session.clientWs, { type: 'error', message: 'OpenAI API key not configured' });
    return;
  }

  console.log(`[${session.sessionId}] Connecting to OpenAI Realtime API...`);

  const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  session.openaiWs = openaiWs;

  openaiWs.on('open', () => {
    console.log(`[${session.sessionId}] Connected to OpenAI`);
    
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: session.config?.prompt || 'You are a helpful assistant.',
        voice: session.config?.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };
    
    openaiWs.send(JSON.stringify(sessionUpdate));
    sendToClient(session.clientWs, { type: 'session.ready' });

    if (session.config?.agentSpeaksFirst) {
      setTimeout(() => {
        if (openaiWs.readyState === WebSocket.OPEN) {
          console.log(`[${session.sessionId}] Triggering agent to speak first`);
          openaiWs.send(JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: 'Greet the user warmly and ask how you can help them today. Keep it brief and friendly.',
            },
          }));
        }
      }, 500);
    }
  });

  openaiWs.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      handleOpenAIEvent(session, event);
    } catch (err) {
      console.error(`[${session.sessionId}] Error parsing OpenAI message:`, err);
    }
  });

  openaiWs.on('error', (err) => {
    console.error(`[${session.sessionId}] OpenAI WebSocket error:`, err.message);
    sendToClient(session.clientWs, { type: 'error', message: 'Connection to AI failed' });
  });

  openaiWs.on('close', (code, reason) => {
    console.log(`[${session.sessionId}] OpenAI connection closed: ${code}`);
    sendToClient(session.clientWs, { type: 'session.ended' });
    session.openaiWs = null;
  });
}

function handleOpenAIEvent(session, event) {
  const eventType = event.type;
  
  if (!eventType?.includes('audio')) {
    console.log(`[${session.sessionId}] OpenAI event: ${eventType}`);
  }

  switch (eventType) {
    case 'response.audio.delta': {
      if (event.delta) {
        sendToClient(session.clientWs, { type: 'audio.output', audio: event.delta });
      }
      break;
    }

    case 'response.audio_transcript.delta': {
      if (event.delta) {
        sendToClient(session.clientWs, {
          type: 'transcript.partial',
          role: 'assistant',
          text: event.delta,
          itemId: event.item_id || 'unknown',
        });
      }
      break;
    }

    case 'response.audio_transcript.done': {
      if (event.transcript) {
        sendToClient(session.clientWs, {
          type: 'transcript.final',
          role: 'assistant',
          text: event.transcript,
          itemId: event.item_id || 'unknown',
        });
      }
      break;
    }

    case 'conversation.item.input_audio_transcription.completed': {
      if (event.transcript) {
        sendToClient(session.clientWs, {
          type: 'transcript.final',
          role: 'user',
          text: event.transcript,
          itemId: event.item_id || 'unknown',
        });
      }
      break;
    }

    case 'response.done': {
      const usage = event.response?.usage;
      if (usage) {
        sendToClient(session.clientWs, {
          type: 'usage.update',
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          audioInputMs: usage.input_token_details?.audio_tokens * 20 || 0,
          audioOutputMs: usage.output_token_details?.audio_tokens * 20 || 0,
        });
      }
      break;
    }

    case 'error': {
      console.error(`[${session.sessionId}] OpenAI error:`, event.error);
      sendToClient(session.clientWs, {
        type: 'error',
        message: event.error?.message || 'Unknown error from AI',
      });
      break;
    }
  }
}

function handleClientMessage(session, message) {
  try {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'session.start': {
        session.config = data.config;
        connectToOpenAI(session);
        break;
      }

      case 'audio.input': {
        if (session.openaiWs?.readyState === WebSocket.OPEN) {
          session.openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: data.audio,
          }));
        }
        break;
      }

      case 'session.end': {
        if (session.openaiWs) {
          session.openaiWs.close();
          session.openaiWs = null;
        }
        sendToClient(session.clientWs, { type: 'session.ended' });
        break;
      }
    }
  } catch (err) {
    console.error(`[${session.sessionId}] Error handling client message:`, err);
  }
}

// Start server
const port = parseInt(process.env.PORT || '3001', 10);

const wss = new WebSocketServer({ port });

wss.on('connection', (ws) => {
  const sessionId = generateSessionId();
  console.log(`[${sessionId}] Client connected`);

  const session = {
    clientWs: ws,
    openaiWs: null,
    sessionId,
    config: null,
  };

  sessions.set(sessionId, session);
  sendToClient(ws, { type: 'session.created', sessionId });

  ws.on('message', (data) => handleClientMessage(session, data.toString()));

  ws.on('close', () => {
    console.log(`[${sessionId}] Client disconnected`);
    if (session.openaiWs) {
      session.openaiWs.close();
    }
    sessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`[${sessionId}] Client WebSocket error:`, err.message);
  });
});

console.log(`WebSocket relay server started on port ${port}`);
