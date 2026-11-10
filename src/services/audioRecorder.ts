export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private startTime = 0;
  private isRecording = false;

  public async start(onVolumeChange?: (volume: number) => void): Promise<boolean> {
    if (this.isRecording) return true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up Web Audio API for volume analysis
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!this.analyser || !this.isRecording) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalized = Math.min(1, average / 128); // 0 to 1
            if (onVolumeChange) {
              onVolumeChange(normalized);
            }
            this.animFrameId = requestAnimationFrame(checkVolume);
          };
          this.animFrameId = requestAnimationFrame(checkVolume);
        }
      } catch (err) {
        console.warn('AudioContext visualization setup failed, continuing recording:', err);
      }

      // Determine supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // 100ms chunk timeslices
      this.isRecording = true;
      return true;
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      this.cleanup();
      throw err;
    }
  }

  public async stop(): Promise<AudioRecordingResult> {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('Recorder is not active');
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder!;
      const mimeType = recorder.mimeType || 'audio/webm';
      const durationSeconds = Math.max(0.5, (Date.now() - this.startTime) / 1000);

      recorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const base64 = await this.blobToBase64(blob);
          this.cleanup();
          resolve({
            blob,
            base64,
            mimeType: mimeType.split(';')[0], // strip codec parameters
            durationSeconds,
          });
        } catch (e) {
          this.cleanup();
          reject(e);
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        this.cleanup();
        reject(e);
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:audio/xxx;base64, prefix
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public cleanup(): void {
    this.isRecording = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.analyser = null;
  }
}
