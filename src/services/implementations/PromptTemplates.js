/**
 * Unified multilingual formatting templates registry for AI Summaries.
 * Aggregates Western and Eastern language presets with zero duplication.
 */
import { WESTERN_TEMPLATES } from './templates/WesternTemplates.js';
import { EASTERN_TEMPLATES } from './templates/EasternTemplates.js';

export const TARGET_LANG_NAMES = {
  fr: 'FRANÇAIS',
  en: 'ENGLISH',
  es: 'ESPAÑOL',
  it: 'ITALIANO',
  de: 'DEUTSCH',
  ja: '日本語 (JAPANESE)',
  ru: 'РУССКИЙ',
  zh: '中文 (SIMPLIFIED CHINESE)'
};

const TEMPLATES = {
  ...WESTERN_TEMPLATES,
  ...EASTERN_TEMPLATES
};

/**
 * Returns localized summary formatting instructions across all 8 languages and 3 modes.
 * @param {string} mode - 'quick' | 'standard' | 'detailed'
 * @param {string|boolean} [langOrIsFr='en']
 * @returns {string}
 */
export function getFormatInstructions(mode, langOrIsFr = 'en') {
  let lang = 'en';
  if (typeof langOrIsFr === 'boolean') {
    lang = langOrIsFr ? 'fr' : 'en';
  } else if (typeof langOrIsFr === 'string') {
    lang = String(langOrIsFr).toLowerCase().slice(0, 2);
  }
  const langTemplates = TEMPLATES[lang] || TEMPLATES.en;
  return langTemplates[mode] || langTemplates.standard;
}

export { TEMPLATES };
export default getFormatInstructions;
