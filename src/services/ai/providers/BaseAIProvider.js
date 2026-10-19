import { IAIProvider } from '../../interfaces/IAIProvider.js';

/**
 * Base AI Provider implementing shared helpers
 */
export class BaseAIProvider extends IAIProvider {
  /**
   * @param {string} id
   * @param {string} displayName
   * @param {boolean} isLocalProvider
   */
  constructor(id, displayName, isLocalProvider = false) {
    super();
    this.id = id;
    this.displayName = displayName;
    this.isLocalProvider = isLocalProvider;
  }

  getProviderId() {
    return this.id;
  }

  getDisplayName() {
    return this.displayName;
  }

  isLocal() {
    return this.isLocalProvider;
  }

  /**
   * Safe fetch with timeout
   * @param {string} url
   * @param {Object} options
   * @param {number} timeoutMs
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Normalizes server URL by ensuring scheme and removing trailing slashes
   * @param {string} url
   * @param {string} defaultUrl
   * @returns {string}
   */
  normalizeUrl(url, defaultUrl = '') {
    let clean = (url || defaultUrl || '').trim().replace(/\/+$/, '');
    if (!clean) return defaultUrl || '';
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    return clean;
  }
}

export default BaseAIProvider;
