import fr from './fr.js';
import en from './en.js';
import es from './es.js';
import de from './de.js';
import it from './it.js';
import ru from './ru.js';
import ja from './ja.js';
import zh from './zh.js';

export const I18N = {
  fr,
  en,
  es,
  de,
  it,
  ru,
  ja,
  zh
};

const SUPPORTED_LANG_CODES = new Set(Object.keys(I18N));

/**
 * Resolves the browser UI locale to one of the supported two-letter language codes.
 * Falls back to 'en' when the locale is unavailable or unsupported.
 * @param {string|null} [overrideLocale=null]
 * @returns {string}
 */
export function detectBrowserLang(overrideLocale = null) {
  const candidates = overrideLocale != null
    ? [overrideLocale]
    : [
        typeof chrome !== 'undefined' ? chrome?.i18n?.getUILanguage?.() : null,
        typeof navigator !== 'undefined' ? navigator?.language : null,
        ...(typeof navigator !== 'undefined' && Array.isArray(navigator?.languages) ? navigator.languages : [])
      ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const base = candidate.trim().toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED_LANG_CODES.has(base)) return base;
  }
  return 'en';
}

export default I18N;
