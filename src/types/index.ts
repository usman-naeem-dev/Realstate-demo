// Types for the AI Voice Demo application

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface CallMetrics {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  duration: number; // in seconds
  estimatedCost: number;
  inputTokens: number;
  outputTokens: number;
  audioInputMs: number;
  audioOutputMs: number;
}

export interface VoiceOption {
  id: string;
  name: string;
}

export interface SessionConfig {
  voice: string;
  prompt: string;
  inputCostPerMinute: number;
  outputCostPerMinute: number;
  agentSpeaksFirst: boolean; // New: whether agent should initiate conversation
}

// Call history record
export interface CallRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  voice: string;
  prompt: string;
  transcript: TranscriptEntry[];
  estimatedCost: number;
  inputTokens: number;
  outputTokens: number;
  recordingUrl?: string; // blob URL for the recording
  recordingBlob?: Blob; // actual recording blob
}

// WebSocket message types between client and server
export type ClientMessage =
  | { type: 'session.start'; config: SessionConfig }
  | { type: 'audio.input'; audio: string } // base64 encoded audio
  | { type: 'session.end' };

export type ServerMessage =
  | { type: 'session.created'; sessionId: string }
  | { type: 'session.ready' }
  | { type: 'audio.output'; audio: string } // base64 encoded audio
  | { type: 'transcript.partial'; role: 'user' | 'assistant'; text: string; itemId: string }
  | { type: 'transcript.final'; role: 'user' | 'assistant'; text: string; itemId: string }
  | { type: 'usage.update'; inputTokens: number; outputTokens: number; audioInputMs: number; audioOutputMs: number }
  | { type: 'error'; message: string }
  | { type: 'session.ended' };

// OpenAI Realtime API event types (subset we care about)
export interface OpenAIRealtimeEvent {
  type: string;
  [key: string]: unknown;
}
