import { LANG_LOCALES } from '../../config/AIProviderPresets.js';

export const DEFAULT_LANG_LOCALES = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  ru: 'ru-RU',
  ja: 'ja-JP',
  zh: 'zh-CN'
};

let activeUtterance = null;

export function splitTextIntoSpeechChunks(text, maxChunkLen = 200) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).length <= maxChunkLen) {
      current = current ? (current + ' ' + trimmed) : trimmed;
    } else {
      if (current) chunks.push(current);
      if (trimmed.length > maxChunkLen) {
        const words = trimmed.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).length <= maxChunkLen) {
            sub = sub ? (sub + ' ' + w) : w;
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        if (sub) current = sub;
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * In-Page Text-to-Speech (TTS) Service
 * Manages Web Speech API voices, sentence chunking, playback queue, and Chrome V8 keepalive.
 */
export class InPageTTSService {
  constructor() {
    this.availableVoices = [];
    this.selectedVoiceURI = '';
    this.activeSpeakingButton = null;
    this.speechQueue = [];
    this.speechQueueIndex = 0;
    this.isSpeakingActive = false;
    this.activeUtterance = null;
    this.speechKeepAliveTimer = null;
    this.ttsSpeed = '1.0';
  }

  static cleanMarkdownForSpeech(md) {
    if (!md) return '';
    return md
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*•]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/[\n\r]+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  initSpeechSynthesis(onVoicesReady) {
    if ('speechSynthesis' in window) {
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
  }

  populateVoiceDropdown(targetLang = 'fr') {
    const select = document.getElementById('ytAiVoiceSelect');
    if (!select || !('speechSynthesis' in window)) return;

    this.availableVoices = window.speechSynthesis.getVoices();
    select.innerHTML = '';

    const langCode = (targetLang || 'fr').toLowerCase();
    const matchingVoices = this.availableVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith(langCode));
    const voicesToShow = matchingVoices.length > 0 ? matchingVoices : this.availableVoices;

    voicesToShow.forEach(voice => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (voice.voiceURI === this.selectedVoiceURI) opt.selected = true;
      select.appendChild(opt);
    });

    if (!select.value && select.options.length > 0) {
      select.selectedIndex = 0;
      this.selectedVoiceURI = select.value;
    }
  }

  speakText(rawText, triggerBtn) {
    if (!('speechSynthesis' in window)) return;

    if (this.isSpeakingActive) {
      this.stopSpeech();
      return;
    }

    const cleaned = InPageTTSService.cleanMarkdownForSpeech(rawText);
    if (!cleaned) return;

    this.speechQueue = splitTextIntoSpeechChunks(cleaned, 220);
    if (this.speechQueue.length === 0) return;

    this.speechQueueIndex = 0;
    this.isSpeakingActive = true;
    this.activeSpeakingButton = triggerBtn;

    if (triggerBtn) {
      triggerBtn.classList.add('speaking');
      if (triggerBtn.id === 'ytAiSpeakSummaryBtn') {
        triggerBtn.textContent = '⏹ Stop';
      }
    }

    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'fr';
    const targetLocale = (typeof LANG_LOCALES !== 'undefined' && LANG_LOCALES[targetLang]) ||
      DEFAULT_LANG_LOCALES[targetLang] || 'fr-FR';
    const rate = parseFloat(this.ttsSpeed) || 1.0;

    const playNextChunk = () => {
      if (!this.isSpeakingActive || this.speechQueueIndex >= this.speechQueue.length) {
        this.stopSpeech();
        return;
      }

      const chunk = this.speechQueue[this.speechQueueIndex++];
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = targetLocale;
      utterance.rate = rate;

      if (this.selectedVoiceURI) {
        const found = this.availableVoices.find(v => v.voiceURI === this.selectedVoiceURI);
        if (found) utterance.voice = found;
      }

      this.activeUtterance = utterance;
      activeUtterance = utterance;

      utterance.onend = () => {
        clearInterval(this.speechKeepAliveTimer);
        playNextChunk();
      };

      utterance.onerror = () => {
        clearInterval(this.speechKeepAliveTimer);
        this.stopSpeech();
      };

      clearInterval(this.speechKeepAliveTimer);
      this.speechKeepAliveTimer = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(this.speechKeepAliveTimer);
        }
      }, 10000);

      window.speechSynthesis.speak(utterance);
    };

    playNextChunk();
  }

  stopSpeech() {
    this.isSpeakingActive = false;
    clearInterval(this.speechKeepAliveTimer);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
    activeUtterance = null;
    this.speechQueue = [];
    this.speechQueueIndex = 0;
    if (this.activeSpeakingButton) {
      this.resetSpeakingButton(this.activeSpeakingButton);
      this.activeSpeakingButton = null;
    }
  }

  resetSpeakingButton(btn) {
    if (!btn) return;
    btn.classList.remove('speaking');
    if (btn.id === 'ytAiSpeakSummaryBtn') {
      btn.textContent = '🔊 Listen';
    } else {
      btn.textContent = '🔊';
    }
  }
}

export const cleanMarkdownForSpeech = InPageTTSService.cleanMarkdownForSpeech;
export default InPageTTSService;
