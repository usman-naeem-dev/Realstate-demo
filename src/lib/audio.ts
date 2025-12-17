/**
 * Audio utilities for capturing microphone input and playing back audio
 */

import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from './constants';

/**
 * Captures microphone audio and provides PCM16 data chunks
 */
export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioData: ((base64: string) => void) | null = null;
  private isMuted: boolean = false;

  async start(onAudioData: (base64: string) => void): Promise<void> {
    this.onAudioData = onAudioData;

    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Your browser does not support microphone access. ' +
          'Please use a modern browser (Chrome, Firefox, Edge) and ensure you are on HTTPS or localhost.'
        );
      }

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_SAMPLE_RATE,
          channelCount: AUDIO_CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Use ScriptProcessor for compatibility (AudioWorklet would be better for production)
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (this.isMuted || !this.onAudioData) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
        this.onAudioData(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (err) {
      console.error('Failed to start audio capture:', err);
      if (err instanceof Error && err.message.includes('browser does not support')) {
        throw err;
      }
      throw new Error('Could not access microphone. Please check permissions and ensure you are on HTTPS or localhost.');
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.onAudioData = null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Plays back audio from base64 PCM16 chunks
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private scheduledTime: number = 0;
  private isStarted: boolean = false;
  private chunks: AudioBuffer[] = [];

  // For recording
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  async start(): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    // Create a media stream destination for recording the output
    this.mediaStreamDest = this.audioContext.createMediaStreamDestination();
    this.gainNode.connect(this.mediaStreamDest);

    this.scheduledTime = this.audioContext.currentTime;
    this.isStarted = true;
  }

  playChunk(base64Audio: string): void {
    if (!this.audioContext || !this.gainNode || !this.isStarted) return;

    try {
      const pcm16 = this.base64ToInt16Array(base64Audio);
      const float32 = this.int16ToFloat32(pcm16);

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32.length,
        AUDIO_SAMPLE_RATE
      );
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      // Schedule playback
      const now = this.audioContext.currentTime;
      const startTime = Math.max(now, this.scheduledTime);
      source.start(startTime);
      this.scheduledTime = startTime + audioBuffer.duration;

      this.chunks.push(audioBuffer);
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  getOutputStream(): MediaStream | null {
    return this.mediaStreamDest?.stream || null;
  }

  stop(): void {
    this.isStarted = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
    this.mediaStreamDest = null;
    this.chunks = [];
  }

  private base64ToInt16Array(base64: string): Int16Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  private int16ToFloat32(int16Array: Int16Array): Float32Array {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }
    return float32Array;
  }
}
