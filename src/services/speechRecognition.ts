// Web Speech API interface definitions for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class SpeechHandler {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const combined = (finalTranscript + ' ' + interimTranscript).trim();
          if (this.onResultCallback && combined) {
            this.onResultCallback(combined, Boolean(finalTranscript));
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition event error:', event.error);
          let message = 'Microphone error occurred.';
          if (event.error === 'not-allowed') {
            message = 'Microphone permission denied. Please enable microphone access.';
          } else if (event.error === 'no-speech') {
            message = 'No speech detected. Please speak clearly.';
          } else if (event.error === 'network') {
            message = 'Network issue with speech recognition.';
          }
          if (this.onErrorCallback) {
            this.onErrorCallback(message);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.onEndCallback) {
            this.onEndCallback();
          }
        };
      } catch (e) {
        console.warn('SpeechRecognition initialization failed:', e);
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser. You can type your task instead.');
      return false;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err: any) {
      // If already started, ignore or restart
      if (err.name === 'InvalidStateError') {
        this.recognition.stop();
        setTimeout(() => {
          try {
            this.recognition.start();
            this.isListening = true;
          } catch (e) {
            onError('Could not start microphone session.');
          }
        }, 100);
        return true;
      }
      onError('Unable to start speech recognition.');
      return false;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }
}
