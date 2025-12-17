/**
 * WebSocket client for connecting to the relay server
 */

import { ClientMessage, ServerMessage, SessionConfig } from '@/types';

type MessageHandler = (message: ServerMessage) => void;

/**
 * Get the WebSocket URL based on environment
 * In production, uses the same host as the page with wss://
 * In development, uses localhost:3001
 */
function getDefaultWsUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3001';
  }
  
  // Check for explicit environment variable (set at build time)
  const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envWsUrl) {
    return envWsUrl;
  }
  
  // Auto-detect based on current location
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return 'ws://localhost:3001';
  }
  
  // For production: use secure WebSocket on same host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws`;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private sessionId: string | null = null;

  constructor(private wsUrl: string = getDefaultWsUrl()) {}

  /**
   * Connect to the WebSocket relay server
   */
  connect(onMessage: MessageHandler): Promise<void> {
    return new Promise((resolve, reject) => {
      this.messageHandler = onMessage;

      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('Connected to relay server');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ServerMessage;
            
            if (message.type === 'session.created') {
              this.sessionId = message.sessionId;
            }
            
            this.messageHandler?.(message);
          } catch (err) {
            console.error('Error parsing server message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.ws = null;
          
          // Notify handler of disconnection
          this.messageHandler?.({ type: 'session.ended' });
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Start a realtime session with the given configuration
   */
  startSession(config: SessionConfig): void {
    this.send({ type: 'session.start', config });
  }

  /**
   * Send audio data to the server
   */
  sendAudio(base64Audio: string): void {
    this.send({ type: 'audio.input', audio: base64Audio });
  }

  /**
   * End the current session
   */
  endSession(): void {
    this.send({ type: 'session.end' });
  }

  /**
   * Close the WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }
}
