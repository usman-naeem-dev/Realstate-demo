'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { RoomEvent, TranscriptionSegment, Participant } from 'livekit-client';
import '@livekit/components-styles';
import { TranscriptEntry, CallMetrics, SessionConfig } from '@/types';

interface LiveKitVoiceProps {
  config: SessionConfig;
  onTranscriptUpdate: (entry: TranscriptEntry) => void;
  onMetricsUpdate: (metrics: Partial<CallMetrics>) => void;
  onError: (error: string) => void;
  onSessionEnd: () => void;
  isActive: boolean;
}

interface TokenResponse {
  token: string;
  wsUrl: string;
  roomName: string;
  participantName: string;
}

// Get state label and color
function getStateInfo(state: string): { label: string; color: string; icon: string } {
  switch (state) {
    case 'connecting':
      return { label: 'Connecting...', color: 'text-yellow-400', icon: '🔄' };
    case 'listening':
      return { label: 'Listening to you...', color: 'text-green-400', icon: '👂' };
    case 'thinking':
      return { label: 'Esko is thinking...', color: 'text-blue-400', icon: '🤔' };
    case 'speaking':
      return { label: 'Esko is speaking', color: 'text-purple-400', icon: '🗣️' };
    case 'disconnected':
      return { label: 'Disconnected', color: 'text-gray-400', icon: '📴' };
    default:
      return { label: state, color: 'text-gray-400', icon: '⏳' };
  }
}

// Inner component that uses LiveKit hooks
function VoiceAssistantInner({
  onTranscriptUpdate,
  onMetricsUpdate,
  startTime,
}: {
  onTranscriptUpdate: (entry: TranscriptEntry) => void;
  onMetricsUpdate: (metrics: Partial<CallMetrics>) => void;
  startTime: number;
}) {
  const voiceAssistant = useVoiceAssistant();
  const { state, audioTrack } = voiceAssistant;
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const processedTranscripts = useRef<Map<string, string>>(new Map());

  // Check if microphone is active
  const hasMicrophone = localParticipant.isMicrophoneEnabled;

  // Track duration
  useEffect(() => {
    durationRef.current = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      onMetricsUpdate({ duration });
    }, 1000);

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
      }
    };
  }, [startTime, onMetricsUpdate]);

  // Update status based on voice assistant state
  useEffect(() => {
    switch (state) {
      case 'connecting':
        onMetricsUpdate({ status: 'connecting' });
        break;
      case 'listening':
      case 'thinking':
      case 'speaking':
        onMetricsUpdate({ status: 'connected' });
        break;
      case 'disconnected':
        onMetricsUpdate({ status: 'disconnected' });
        break;
    }
  }, [state, onMetricsUpdate]);

  // Listen to room transcription events for ALL transcriptions (user + agent)
  useEffect(() => {
    if (!room) return;

    const handleTranscription = (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      // Check the transcription participant_identity to determine role
      // User transcriptions will have participant_identity="user" (set by agent)
      // Agent transcriptions will have the agent's identity
      
      segments.forEach((segment) => {
        // Use segment id or generate one
        const id = segment.id || `${participant?.identity}-${segment.firstReceivedTime}-${Date.now()}`;
        const existingText = processedTranscripts.current.get(id);
        
        // Skip if already processed with same text or empty
        if (existingText === segment.text || !segment.text.trim()) {
          return;
        }
        
        processedTranscripts.current.set(id, segment.text);
        
        // Determine role based on segment id prefix or participant identity
        // User transcriptions are published with id starting with "user-"
        const isUserTranscription = 
          segment.id?.startsWith('user-') || 
          participant?.identity === 'user';
        
        const role = isUserTranscription ? 'user' : 'assistant';
        
        console.log(`Transcription [${role}]:`, segment.text, { segmentId: segment.id, participantIdentity: participant?.identity });
        
        onTranscriptUpdate({
          id,
          role,
          text: segment.text,
          timestamp: new Date(),
          isFinal: segment.final,
        });
      });
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room, onTranscriptUpdate]);

  const stateInfo = getStateInfo(state);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
      {/* Voice State Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{stateInfo.icon}</span>
        <span className={`text-sm font-medium ${stateInfo.color}`}>
          {stateInfo.label}
        </span>
      </div>

      {/* Audio Visualizer */}
      {audioTrack && (
        <div className="w-full h-20 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={40}
            options={{ minHeight: 3 }}
          />
        </div>
      )}

      {/* Microphone indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className={`w-2 h-2 rounded-full ${hasMicrophone ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span>{hasMicrophone ? 'Microphone active' : 'Microphone off'}</span>
      </div>

      {/* Hidden audio renderer */}
      <RoomAudioRenderer />
    </div>
  );
}

export function LiveKitVoice({
  config,
  onTranscriptUpdate,
  onMetricsUpdate,
  onError,
  onSessionEnd,
  isActive,
}: LiveKitVoiceProps) {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Fetch token when activated
  useEffect(() => {
    if (isActive && !tokenData && !isConnecting) {
      setIsConnecting(true);
      setStartTime(Date.now());

      fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: config.voice,
          prompt: config.prompt,
          agentSpeaksFirst: config.agentSpeaksFirst,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to get token');
          return res.json();
        })
        .then((data) => {
          setTokenData(data);
          setIsConnecting(false);
        })
        .catch((err) => {
          console.error('Failed to get LiveKit token:', err);
          onError('Failed to connect to voice service');
          setIsConnecting(false);
        });
    }
  }, [isActive, tokenData, isConnecting, config, onError]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setTokenData(null);
    }
  }, [isActive]);

  const handleDisconnected = useCallback(() => {
    setTokenData(null);
    onSessionEnd();
  }, [onSessionEnd]);

  if (!isActive) {
    return null;
  }

  if (isConnecting || !tokenData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Connecting to voice service...</div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={tokenData.token}
      serverUrl={tokenData.wsUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={handleDisconnected}
      onError={(err) => onError(err?.message || 'Voice service error')}
      className="bg-gray-900 rounded-lg"
    >
      <VoiceAssistantInner
        onTranscriptUpdate={onTranscriptUpdate}
        onMetricsUpdate={onMetricsUpdate}
        startTime={startTime}
      />
    </LiveKitRoom>
  );
}
