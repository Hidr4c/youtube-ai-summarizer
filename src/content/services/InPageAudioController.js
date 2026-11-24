import { InPageTTSService } from './InPageTTSService.js';
import { InPageSTTService } from './InPageSTTService.js';

/**
 * Facade combining TTS and STT audio operations for in-page UI
 */
export class InPageAudioController {
  constructor() {
    this.tts = new InPageTTSService();
    this.stt = new InPageSTTService();
    this.stt.onStopSpeechCallback = () => this.tts.stopSpeech();
  }

  init(currentLang, onVoicesReady) {
    this.tts.initSpeechSynthesis(onVoicesReady);
    this.stt.initMicrophoneDevices();
  }

  populateVoiceDropdown(currentLang) {
    this.tts.populateVoiceDropdown(currentLang);
  }

  speakText(text, buttonEl, options) {
    this.tts.speakText(text, buttonEl, options);
  }

  pauseSpeech() { this.tts.pauseSpeech(); }
  resumeSpeech() { this.tts.resumeSpeech(); }
  togglePauseResume() { this.tts.togglePauseResume(); }
  seekSpeechToChunk(index) { this.tts.seekToChunk(index); }
  restartSpeech() { this.tts.restartSpeech(); }
  getSpeechState() { return this.tts.getPlaybackState(); }
  subscribeSpeechState(listener) { return this.tts.subscribeState(listener); }
  stopSpeech() { this.tts.stopSpeech(); }

  toggleDictation(options) {
    return this.stt.toggleDictation(options);
  }

  stopDictation() {
    this.stt.stopDictation();
  }

  stopAll() {
    this.stopSpeech();
    this.stopDictation();
  }

  showMicNotice(text, isError) {
    this.stt.showMicNotice(text, isError);
  }
}

export default InPageAudioController;
