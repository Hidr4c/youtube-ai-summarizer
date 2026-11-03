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

const ALL_TEMPLATES = {
  ...WESTERN_TEMPLATES,
  ...EASTERN_TEMPLATES
};

/**
 * Returns localized summary formatting instructions for any of the 8 languages
 * @param {string} mode
 * @param {string|boolean} langOrIsFr
 * @returns {string}
 */
export function getFormatInstructions(mode, langOrIsFr = 'en') {
  let lang = 'en';
  if (typeof langOrIsFr === 'boolean') {
    lang = langOrIsFr ? 'fr' : 'en';
  } else if (typeof langOrIsFr === 'string') {
    lang = langOrIsFr;
  }
  const langTemplates = ALL_TEMPLATES[lang] || ALL_TEMPLATES.en;
  return langTemplates[mode] || langTemplates.standard;
}
