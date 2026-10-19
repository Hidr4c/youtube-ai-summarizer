import { IStorageService } from '../interfaces/IStorageService.js';

/**
 * Storage Service implementation utilizing chrome.storage.local
 * with automatic fallback to localStorage in non-extension environments.
 */
export class ChromeStorageService extends IStorageService {
  constructor() {
    super();
    this.isChromeStorageAvailable = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  /**
   * @param {string} key
   * @param {any} defaultValue
   * @returns {Promise<any>}
   */
  async get(key, defaultValue = null) {
    if (this.isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError || result[key] === undefined) {
            resolve(defaultValue);
          } else {
            resolve(result[key]);
          }
        });
      });
    }

    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    if (this.isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      });
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  /**
   * @param {Array<string>} keys
   * @returns {Promise<Object>}
   */
  async getMultiple(keys) {
    if (this.isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      });
    }

    const result = {};
    for (const k of keys) {
      result[k] = await this.get(k, null);
    }
    return result;
  }

  /**
   * @param {Object} items
   * @returns {Promise<void>}
   */
  async setMultiple(items) {
    if (this.isChromeStorageAvailable) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, () => resolve());
      });
    }

    for (const [k, v] of Object.entries(items)) {
      await this.set(k, v);
    }
  }
}

export default ChromeStorageService;
