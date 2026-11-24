import { LANG_LOCALES } from '../../config/AIProviderPresets.js';
import { I18N } from '../../locales/index.js';
import { DEFAULT_LANG_LOCALES, cleanMarkdownForSpeech, splitTextIntoSpeechChunks, populateVoiceSelectElement, playAudioDataUrlWithGuards } from './SpeechTextProcessor.js';

export { DEFAULT_LANG_LOCALES, cleanMarkdownForSpeech, splitTextIntoSpeechChunks };

/**
 * In-Page Text-to-Speech (TTS) Service with full playback transport controls:
 * Play, Pause, Resume, Seek (move playhead across text chunks), Restart, and Stop.
 */
export class InPageTTSService {
  constructor() {
    this.availableVoices = [];
    this.selectedVoiceURI = '';
    this.activeSpeakingButton = null;
    this.speechQueue = [];
    this.speechQueueIndex = 0;
    this.isSpeakingActive = false;
    this.isPaused = false;
    this.activeUtterance = null;
    this.speechKeepAliveTimer = null;
    this.activeAudio = null;
    this.ttsSpeed = '1.0';
    this._playbackToken = 0;
    this._stateListeners = new Set();
    this._activeVoiceToUse = null;
    this._activeTargetLang = 'fr';
    this._activeTargetLocale = 'fr-FR';
    this._activeRate = 1.0;
    this._lastText = '';
    this._lastOptions = {};
  }

  static cleanMarkdownForSpeech(md) {
    return cleanMarkdownForSpeech(md);
  }

  subscribeState(listener) {
    if (typeof listener !== 'function') return () => {};
    this._stateListeners.add(listener);
    return () => this._stateListeners.delete(listener);
  }

  getPlaybackState() {
    const totalChunks = this.speechQueue.length;
    const currentIndex = totalChunks > 0
      ? Math.max(0, Math.min(totalChunks - 1, this.speechQueueIndex))
      : 0;
    return {
      isActive: this.isSpeakingActive,
      isPaused: this.isPaused,
      currentIndex,
      totalChunks,
      currentText: totalChunks > 0 ? (this.speechQueue[currentIndex] || '') : '',
      hasReplayable: Boolean(this._lastText)
    };
  }

  _notifyState() {
    const snapshot = this.getPlaybackState();
    for (const fn of this._stateListeners) {
      try { fn(snapshot); } catch (_) {}
    }
  }

  initSpeechSynthesis(onVoicesReady) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.availableVoices = window.speechSynthesis.getVoices();
        if (typeof onVoicesReady === 'function') onVoicesReady(this.availableVoices);
      };
    }
    this.availableVoices = window.speechSynthesis.getVoices();
    if (typeof onVoicesReady === 'function' && this.availableVoices.length > 0) {
      onVoicesReady(this.availableVoices);
    }
  }

  populateVoiceDropdown(targetLang = 'fr') {
    if (typeof document === 'undefined' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.availableVoices = window.speechSynthesis.getVoices();
    this.selectedVoiceURI = populateVoiceSelectElement(
      document.getElementById('ytAiVoiceSelect'),
      this.availableVoices,
      targetLang,
      this.selectedVoiceURI
    );
  }

  _resolveVoice(targetLang, targetLocale) {
    if (!this.availableVoices?.length) this.availableVoices = window.speechSynthesis?.getVoices?.() || [];
    if (this.selectedVoiceURI) {
      const chosen = this.availableVoices.find((v) => v.voiceURI === this.selectedVoiceURI);
      if (chosen?.lang?.toLowerCase().startsWith(targetLang.toLowerCase())) return chosen;
    }
    const found = this.availableVoices.find((v) => v.lang?.toLowerCase() === targetLocale.toLowerCase()) ||
      this.availableVoices.find((v) => v.lang?.toLowerCase().startsWith(targetLang.toLowerCase())) ||
      this.availableVoices.find((v) => v.lang?.toLowerCase().startsWith(targetLocale.split('-')[0].toLowerCase())) || null;
    if (found) this.selectedVoiceURI = found.voiceURI;
    return found;
  }

  speakText(rawText, triggerBtn = null, options = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.isSpeakingActive && triggerBtn && this.activeSpeakingButton === triggerBtn) {
      this.stopSpeech();
      return;
    }
    if (this.isSpeakingActive) this.stopSpeech();

    const cleaned = InPageTTSService.cleanMarkdownForSpeech(rawText);
    if (!cleaned) return;
    const chunks = splitTextIntoSpeechChunks(cleaned, 190);
    if (chunks.length === 0) return;

    this._lastText = rawText;
    this._lastOptions = options || {};
    this.speechQueue = chunks;
    this.speechQueueIndex = 0;
    this.isSpeakingActive = true;
    this.isPaused = false;
    this.activeSpeakingButton = triggerBtn || null;

    const targetLang = options?.lang || document.getElementById?.('ytAiLangSelect')?.value || 'fr';
    const targetLocale = (typeof LANG_LOCALES !== 'undefined' && LANG_LOCALES[targetLang]) || DEFAULT_LANG_LOCALES[targetLang] || 'fr-FR';
    this._activeTargetLang = targetLang;
    this._activeTargetLocale = targetLocale;
    this._activeRate = parseFloat(options?.rate || this.ttsSpeed) || 1.0;
    this._activeVoiceToUse = this._resolveVoice(targetLang, targetLocale);

    if (triggerBtn) {
      triggerBtn.classList?.add('speaking');
      if (triggerBtn.id === 'ytAiSpeakSummaryBtn') triggerBtn.textContent = '⏹ Stop';
    }
    this._playChunkAt(0);
  }

  async _playChunkAt(index) {
    const token = ++this._playbackToken;
    this._cancelNativeEngines();
    if (!this.isSpeakingActive || index < 0 || index >= this.speechQueue.length) {
      this.stopSpeech();
      return;
    }
    this.speechQueueIndex = index;
    this.isPaused = false;
    this._notifyState();
    const chunk = this.speechQueue[index];

    if (!this._activeVoiceToUse && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await new Promise((r) => chrome.runtime.sendMessage({ action: 'TTS_FETCH_AUDIO', text: chunk, lang: this._activeTargetLang }, r));
        if (token !== this._playbackToken || !this.isSpeakingActive || this.isPaused) return;
        if (resp?.success && resp.audioDataUrl) {
          await playAudioDataUrlWithGuards(resp.audioDataUrl, this._activeRate, () => token === this._playbackToken && this.isSpeakingActive && !this.isPaused, (a, prev) => { if (!prev) this.activeAudio = a; else if (this.activeAudio === prev) this.activeAudio = null; });
          if (token === this._playbackToken && this.isSpeakingActive && !this.isPaused) this._advanceOrFinish(index, token);
          return;
        }
      } catch (_) {}
    }
    if (token !== this._playbackToken || !this.isSpeakingActive || this.isPaused) return;

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = this._activeRate;
    utterance.lang = this._activeVoiceToUse?.lang || this._activeTargetLocale;
    if (this._activeVoiceToUse) utterance.voice = this._activeVoiceToUse;
    this.activeUtterance = utterance;

    utterance.onend = () => {
      clearInterval(this.speechKeepAliveTimer);
      if (token === this._playbackToken && this.isSpeakingActive && !this.isPaused) {
        this._advanceOrFinish(index, token);
      }
    };
    utterance.onerror = () => {
      clearInterval(this.speechKeepAliveTimer);
      if (token === this._playbackToken) this.stopSpeech();
    };

    clearInterval(this.speechKeepAliveTimer);
    this.speechKeepAliveTimer = setInterval(() => {
      if (this.isPaused || token !== this._playbackToken) return;
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearInterval(this.speechKeepAliveTimer);
      }
    }, 10000);
    window.speechSynthesis.speak(utterance);
  }

  _advanceOrFinish(currentIndex, token) {
    if (token !== this._playbackToken || !this.isSpeakingActive) return;
    if (currentIndex + 1 < this.speechQueue.length) {
      this._playChunkAt(currentIndex + 1);
    } else {
      this.stopSpeech();
    }
  }

  pauseSpeech() {
    if (!this.isSpeakingActive || this.isPaused) return;
    this.isPaused = true;
    clearInterval(this.speechKeepAliveTimer);
    if (this.activeAudio) {
      try { this.activeAudio.pause?.(); } catch (_) {}
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause?.();
    }
    this._notifyState();
  }

  resumeSpeech() {
    if (!this.isSpeakingActive || !this.isPaused) return;
    this.isPaused = false;
    if (this.activeAudio) {
      try { this.activeAudio.play?.().catch(() => {}); } catch (_) {}
      this._notifyState();
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused || window.speechSynthesis.speaking) {
        window.speechSynthesis.resume?.();
        this._notifyState();
      } else {
        this._playChunkAt(this.speechQueueIndex);
      }
      return;
    }
    this._notifyState();
  }

  togglePauseResume() {
    if (!this.isSpeakingActive) {
      if (this._lastText) this.speakText(this._lastText, null, this._lastOptions);
      return;
    }
    if (this.isPaused) this.resumeSpeech();
    else this.pauseSpeech();
  }

  seekToChunk(targetIndex) {
    if (this.speechQueue.length === 0) {
      if (!this._lastText) return;
      this.speakText(this._lastText, null, this._lastOptions);
    }
    const maxIdx = Math.max(0, this.speechQueue.length - 1);
    const clamped = Math.max(0, Math.min(maxIdx, parseInt(targetIndex, 10) || 0));
    this.isSpeakingActive = true;
    this.isPaused = false;
    this._playChunkAt(clamped);
  }

  restartSpeech() {
    if (this.speechQueue.length === 0 && this._lastText) {
      this.speakText(this._lastText, null, this._lastOptions);
      return;
    }
    if (this.speechQueue.length > 0) this.seekToChunk(0);
  }

  _cancelNativeEngines() {
    clearInterval(this.speechKeepAliveTimer);
    if (this.activeAudio) {
      try { this.activeAudio.pause?.(); this.activeAudio.currentTime = 0; } catch (_) {}
      this.activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel?.(); } catch (_) {}
    }
    this.activeUtterance = null;
  }

  stopSpeech() {
    this._playbackToken += 1;
    this.isSpeakingActive = false;
    this.isPaused = false;
    this._cancelNativeEngines();
    this.speechQueue = [];
    this.speechQueueIndex = 0;
    if (this.activeSpeakingButton) {
      this.resetSpeakingButton(this.activeSpeakingButton);
      this.activeSpeakingButton = null;
    }
    this._notifyState();
  }

  resetSpeakingButton(btn) {
    if (!btn) return;
    btn.classList?.remove('speaking');
    const lang = (typeof document !== 'undefined' ? document.getElementById('ytAiLangSelect')?.value : null) || 'en';
    const t = I18N[lang] || I18N.en;
    btn.textContent = t.listenBtn || (btn.id === 'ytAiSpeakSummaryBtn' ? '🔊 Listen' : '🔊');
  }
}

export default InPageTTSService;
