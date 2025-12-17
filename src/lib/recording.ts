/**
 * Audio recording utility for capturing call audio
 */

export class CallRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private inputStream: MediaStream | null = null;
  private outputStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  /**
   * Start recording with optional input (mic) and output (AI) streams
   */
  async start(inputStream?: MediaStream | null, outputStream?: MediaStream | null): Promise<void> {
    this.chunks = [];
    this.inputStream = inputStream || null;
    this.outputStream = outputStream || null;

    try {
      // Try to combine streams if both are available
      if (inputStream && outputStream) {
        this.audioContext = new AudioContext();
        const dest = this.audioContext.createMediaStreamDestination();

        const inputSource = this.audioContext.createMediaStreamSource(inputStream);
        const outputSource = this.audioContext.createMediaStreamSource(outputStream);

        // Mix both streams
        inputSource.connect(dest);
        outputSource.connect(dest);

        this.combinedStream = dest.stream;
      } else {
        // Use whichever stream is available
        this.combinedStream = inputStream || outputStream || null;
      }

      if (!this.combinedStream) {
        console.warn('No streams available for recording');
        return;
      }

      // Determine supported MIME type
      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(this.combinedStream, {
        mimeType,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (err) {
      console.error('Failed to start recording:', err);
      throw new Error('Could not start recording');
    }
  }

  /**
   * Stop recording and return the recorded blob
   */
  async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  private cleanup(): void {
    this.mediaRecorder = null;
    this.chunks = [];
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.combinedStream = null;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Default fallback
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Upload recording to server
 */
export async function uploadRecording(blob: Blob, sessionId: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('audio', blob, `recording-${sessionId}.webm`);
    formData.append('sessionId', sessionId);

    const response = await fetch('/api/recording/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url;
  } catch (err) {
    console.error('Failed to upload recording:', err);
    return null;
  }
}
