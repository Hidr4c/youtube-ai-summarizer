/**
 * Interface for Dynamic Multilingual Localization
 */
export class II18nService {
  /**
   * Sets current active language
   * @param {string} langCode (e.g. 'en', 'fr')
   */
  setLanguage(langCode) {
    throw new Error('Not implemented');
  }

  /**
   * Gets current active language code
   * @returns {string}
   */
  getLanguage() {
    throw new Error('Not implemented');
  }

  /**
   * Resolves translation string by key
   * @param {string} key
   * @param {Object} [params]
   * @returns {string|any}
   */
  t(key, params = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Returns current language dictionary
   * @returns {Object}
   */
  getDictionary() {
    throw new Error('Not implemented');
  }
}

export default II18nService;
