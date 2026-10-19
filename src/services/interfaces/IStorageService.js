/**
 * Interface for Extension Settings and State Persistence
 */
export class IStorageService {
  /**
   * Retrieves value for a specific key
   * @param {string} key
   * @param {any} defaultValue
   * @returns {Promise<any>}
   */
  async get(key, defaultValue = null) {
    throw new Error('Not implemented');
  }

  /**
   * Stores value for a specific key
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    throw new Error('Not implemented');
  }

  /**
   * Retrieves multiple keys at once
   * @param {Array<string>} keys
   * @returns {Promise<Object>}
   */
  async getMultiple(keys) {
    throw new Error('Not implemented');
  }

  /**
   * Saves multiple key/value pairs
   * @param {Object} items
   * @returns {Promise<void>}
   */
  async setMultiple(items) {
    throw new Error('Not implemented');
  }
}

export default IStorageService;
