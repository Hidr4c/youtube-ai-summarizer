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

/**
 * Cleans Markdown formatting and emojis into natural spoken text.
 * @param {string} md
 * @returns {string}
 */
export function cleanMarkdownForSpeech(md) {
  if (!md) return '';
  return String(md)
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

/**
 * Splits cleaned speech text into sentence-aligned chunks bounded by maxChunkLen.
 * @param {string} text
 * @param {number} [maxChunkLen=200]
 * @returns {Array<string>}
 */
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
        current = sub || '';
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Populates a <select> dropdown with voices matching the target language.
 * @param {HTMLSelectElement|null} select
 * @param {Array<SpeechSynthesisVoice>} voices
 * @param {string} targetLang
 * @param {string} selectedVoiceURI
 * @returns {string} resolved selected voiceURI
 */
export function populateVoiceSelectElement(select, voices = [], targetLang = 'fr', selectedVoiceURI = '') {
  if (!select) return selectedVoiceURI;
  select.innerHTML = '';
  const langCode = (targetLang || 'fr').toLowerCase();
  const matching = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langCode));
  const list = matching.length > 0 ? matching : voices;
  let hasSelected = false;
  list.forEach((voice) => {
    const opt = document.createElement('option');
    opt.value = voice.voiceURI;
    opt.textContent = `${voice.name} (${voice.lang})`;
    if (voice.voiceURI === selectedVoiceURI && matching.some((m) => m.voiceURI === selectedVoiceURI)) {
      opt.selected = true;
      hasSelected = true;
    }
    select.appendChild(opt);
  });
  if (!hasSelected && select.options.length > 0) {
    select.selectedIndex = 0;
    return select.value;
  }
  return selectedVoiceURI;
}

/**
 * Plays a synthesized dataUrl via HTMLAudioElement while checking playback cancellation.
 */
export function playAudioDataUrlWithGuards(dataUrl, rate, shouldContinue, setAudioRef) {
  if (typeof Audio === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    audio.playbackRate = rate;
    setAudioRef?.(audio);
    const finish = () => { setAudioRef?.(null, audio); resolve(); };
    audio.onended = finish;
    audio.onerror = finish;
    if (!shouldContinue()) { finish(); return; }
    audio.play().catch(finish);
  });
}
