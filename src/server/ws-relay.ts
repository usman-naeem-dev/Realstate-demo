/**
 * WebSocket Relay Server for OpenAI Realtime API
 * 
 * This server acts as a bridge between the browser and OpenAI's Realtime API.
 * It keeps the API key secure on the server side.
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { ClientMessage, ServerMessage, SessionConfig } from '../types';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17';

interface ClientSession {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  sessionId: string;
  config: SessionConfig | null;
}

const sessions = new Map<string, ClientSession>();

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function connectToOpenAI(session: ClientSession): void {
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
    
    // Configure the session
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: session.config?.prompt || 'You are a helpful assistant.',
        voice: session.config?.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,            // Higher threshold = less sensitive to background noise
          prefix_padding_ms: 200,    // Slightly shorter prefix
          silence_duration_ms: 700,  // Longer silence before cutoff (more natural pauses)
        },
      },
    };
    
    openaiWs.send(JSON.stringify(sessionUpdate));
    sendToClient(session.clientWs, { type: 'session.ready' });

    // If agent should speak first, trigger a response
    if (session.config?.agentSpeaksFirst) {
      setTimeout(() => {
        if (openaiWs.readyState === WebSocket.OPEN) {
          console.log(`[${session.sessionId}] Triggering agent to speak first`);
          const responseCreate = {
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: 'Greet the user warmly and ask how you can help them today. Keep it brief and friendly.',
            },
          };
          openaiWs.send(JSON.stringify(responseCreate));
        }
      }, 500); // Small delay to ensure session is fully configured
    }
  });

  openaiWs.on('message', (data: RawData) => {
    try {
      const event = JSON.parse(data.toString());
      handleOpenAIEvent(session, event);
    } catch (err) {
      console.error(`[${session.sessionId}] Error parsing OpenAI message:`, err);
    }
  });

  openaiWs.on('error', (err) => {
    console.error(`[${session.sessionId}] OpenAI WebSocket error:`, err);
    sendToClient(session.clientWs, { type: 'error', message: 'Connection to AI failed' });
  });

  openaiWs.on('close', (code, reason) => {
    console.log(`[${session.sessionId}] OpenAI connection closed: ${code} ${reason}`);
    sendToClient(session.clientWs, { type: 'session.ended' });
    session.openaiWs = null;
  });
}

function handleOpenAIEvent(session: ClientSession, event: Record<string, unknown>): void {
  const eventType = event.type as string;
  
  // Log event types for debugging (not the full payload to avoid logging audio)
  if (!eventType?.includes('audio')) {
    console.log(`[${session.sessionId}] OpenAI event: ${eventType}`);
  }

  switch (eventType) {
    case 'response.audio.delta': {
      // Forward audio to client
      const delta = event.delta as string;
      if (delta) {
        sendToClient(session.clientWs, { type: 'audio.output', audio: delta });
      }
      break;
    }

    case 'response.audio_transcript.delta': {
      // Partial assistant transcript
      const delta = event.delta as string;
      const itemId = event.item_id as string;
      if (delta) {
        sendToClient(session.clientWs, {
          type: 'transcript.partial',
          role: 'assistant',
          text: delta,
          itemId: itemId || 'unknown',
        });
      }
      break;
    }

    case 'response.audio_transcript.done': {
      // Final assistant transcript
      const transcript = event.transcript as string;
      const itemId = event.item_id as string;
      if (transcript) {
        sendToClient(session.clientWs, {
          type: 'transcript.final',
          role: 'assistant',
          text: transcript,
          itemId: itemId || 'unknown',
        });
      }
      break;
    }

    case 'conversation.item.input_audio_transcription.completed': {
      // User's speech transcript
      const transcript = event.transcript as string;
      const itemId = event.item_id as string;
      if (transcript) {
        sendToClient(session.clientWs, {
          type: 'transcript.final',
          role: 'user',
          text: transcript,
          itemId: itemId || 'unknown',
        });
      }
      break;
    }

    case 'response.done': {
      // Response completed, check for usage
      const response = event.response as Record<string, unknown>;
      const usage = response?.usage as Record<string, unknown> | undefined;
      if (usage) {
        const inputTokenDetails = usage.input_token_details as Record<string, number> | undefined;
        const outputTokenDetails = usage.output_token_details as Record<string, number> | undefined;
        sendToClient(session.clientWs, {
          type: 'usage.update',
          inputTokens: (usage.input_tokens as number) || 0,
          outputTokens: (usage.output_tokens as number) || 0,
          audioInputMs: inputTokenDetails?.audio_tokens || 0,
          audioOutputMs: outputTokenDetails?.audio_tokens || 0,
        });
      }
      break;
    }

    case 'error': {
      const errorEvent = event.error as Record<string, string>;
      console.error(`[${session.sessionId}] OpenAI error:`, errorEvent);
      sendToClient(session.clientWs, {
        type: 'error',
        message: errorEvent?.message || 'Unknown error from AI',
      });
      break;
    }

    // Silently ignore these events
    case 'session.created':
    case 'session.updated':
    case 'input_audio_buffer.speech_started':
    case 'input_audio_buffer.speech_stopped':
    case 'input_audio_buffer.committed':
    case 'response.created':
    case 'response.output_item.added':
    case 'response.output_item.done':
    case 'response.content_part.added':
    case 'response.content_part.done':
    case 'rate_limits.updated':
    case 'conversation.item.created':
      break;

    default:
      // Log unknown events for debugging
      if (!eventType?.startsWith('response.audio.')) {
        console.log(`[${session.sessionId}] Unhandled event type: ${eventType}`);
      }
  }
}

function handleClientMessage(session: ClientSession, message: ClientMessage): void {
  switch (message.type) {
    case 'session.start': {
      session.config = message.config;
      connectToOpenAI(session);
      break;
    }

    case 'audio.input': {
      // Forward audio to OpenAI
      if (session.openaiWs?.readyState === WebSocket.OPEN) {
        const audioEvent = {
          type: 'input_audio_buffer.append',
          audio: message.audio,
        };
        session.openaiWs.send(JSON.stringify(audioEvent));
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
}

export function startWebSocketServer(port: number = 3001): WebSocketServer {
  const wss = new WebSocketServer({ port });

  console.log(`WebSocket relay server started on ws://localhost:${port}`);

  wss.on('connection', (ws: WebSocket) => {
    const sessionId = generateSessionId();
    console.log(`[${sessionId}] Client connected`);

    const session: ClientSession = {
      clientWs: ws,
      openaiWs: null,
      sessionId,
      config: null,
    };

    sessions.set(sessionId, session);

    // Send session ID to client
    sendToClient(ws, { type: 'session.created', sessionId });

    ws.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        handleClientMessage(session, message);
      } catch (err) {
        console.error(`[${sessionId}] Error parsing client message:`, err);
        sendToClient(ws, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      console.log(`[${sessionId}] Client disconnected`);
      if (session.openaiWs) {
        session.openaiWs.close();
      }
      sessions.delete(sessionId);
    });

    ws.on('error', (err) => {
      console.error(`[${sessionId}] Client WebSocket error:`, err);
    });
  });

  return wss;
}

// Note: When running directly, use src/server/index.ts which handles dotenv config
