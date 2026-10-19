/**
 * Text-to-Speech (TTS) Service using Web Speech API
 */
export class WebSpeechTTSService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.currentUtterance = null;
    this.isPlaying = false;
  }

  /**
   * Cleans Markdown formatting, timestamps, and emojis before feeding to speech synthesizer
   * @param {string} md
   * @returns {string}
   */
  static cleanMarkdownForSpeech(md) {
    if (!md || typeof md !== 'string') return '';
    return md
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/###+\s+/g, '. ')
      .replace(/##+\s+/g, '. ')
      .replace(/#+\s+/g, '. ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[-*•]\s+/gm, '')
      .replace(/\[\d{1,2}:\d{2}\]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\.\s*\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speaks markdown or text aloud
   * @param {string} text
   * @param {Object} options
   * @param {Function} onStart
   * @param {Function} onEnd
   * @param {Function} onError
   */
  speak(text, { speed = 1.0, lang = 'en', voiceURI = '' } = {}, onStart = null, onEnd = null, onError = null) {
    if (!this.isSupported) {
      if (onError) onError(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    this.stop();

    const cleanText = WebSpeechTTSService.cleanMarkdownForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Number(speed) || 1.0;
    utterance.lang = lang || 'en';

    if (voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const selected = voices.find(v => v.voiceURI === voiceURI);
      if (selected) utterance.voice = selected;
    }

    utterance.onstart = () => {
      this.isPlaying = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isPlaying = false;
      this.currentUtterance = null;
      if (onError) onError(e);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stops currently playing speech
   */
  stop() {
    if (this.isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.currentUtterance = null;
  }
}

export default WebSpeechTTSService;
