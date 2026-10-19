import { II18nService } from '../interfaces/II18nService.js';
import { I18N } from '../../locales/index.js';

/**
 * Localization Service implementation providing dynamic translation
 * across all 8 supported languages.
 */
export class I18nService extends II18nService {
  /**
   * @param {string} initialLang
   */
  constructor(initialLang = 'en') {
    super();
    this.currentLang = I18N[initialLang] ? initialLang : 'en';
    this.dictionaries = I18N;
  }

  /**
   * @param {string} langCode
   */
  setLanguage(langCode) {
    if (this.dictionaries[langCode]) {
      this.currentLang = langCode;
    }
  }

  /**
   * @returns {string}
   */
  getLanguage() {
    return this.currentLang;
  }

  /**
   * Resolves translation string for current language with fallback to English
   * @param {string} key
   * @param {Object} [params]
   * @returns {string|any}
   */
  t(key, params = {}) {
    const dict = this.dictionaries[this.currentLang] || this.dictionaries.en;
    let val = dict[key] !== undefined ? dict[key] : (this.dictionaries.en[key] || key);

    if (typeof val === 'string' && Object.keys(params).length > 0) {
      for (const [pKey, pVal] of Object.entries(params)) {
        val = val.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }

    return val;
  }

  /**
   * @returns {Object}
   */
  getDictionary() {
    return this.dictionaries[this.currentLang] || this.dictionaries.en;
  }
}

export default I18nService;
