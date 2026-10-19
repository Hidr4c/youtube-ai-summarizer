/**
 * Speech Recognition Bridge running in Main World execution context
 */
export class SpeechRecognitionBridge {
  constructor() {
    this.activeSpeechRecognition = null;
  }

  /**
   * Starts speech recognition with specified language locale
   * @param {string} lang
   */
  start(lang = 'en-US') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.postMessage({ type: 'YT_AI_SPEECH_ERROR', error: 'not-supported' }, '*');
      return;
    }
    this.stop();
    try {
      this.activeSpeechRecognition = new SpeechRecognition();
      this.activeSpeechRecognition.lang = lang;
      this.activeSpeechRecognition.continuous = true;
      this.activeSpeechRecognition.interimResults = true;
      this.activeSpeechRecognition.onstart = () => window.postMessage({ type: 'YT_AI_SPEECH_STARTED' }, '*');
      this.activeSpeechRecognition.onresult = (e) => {
        let interimText = '';
        let finalText = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
          else interimText += e.results[i][0].transcript;
        }
        window.postMessage({ type: 'YT_AI_SPEECH_RESULT', finalText, interimText }, '*');
      };
      this.activeSpeechRecognition.onerror = (e) => window.postMessage({ type: 'YT_AI_SPEECH_ERROR', error: e.error }, '*');
      this.activeSpeechRecognition.onend = () => window.postMessage({ type: 'YT_AI_SPEECH_ENDED' }, '*');
      this.activeSpeechRecognition.start();
    } catch (err) {
      window.postMessage({ type: 'YT_AI_SPEECH_ERROR', error: err.message || 'start-failed' }, '*');
    }
  }

  /**
   * Stops active speech recognition
   */
  stop() {
    if (this.activeSpeechRecognition) {
      try { this.activeSpeechRecognition.stop(); } catch (_) {}
      this.activeSpeechRecognition = null;
    }
  }
}

export default SpeechRecognitionBridge;
