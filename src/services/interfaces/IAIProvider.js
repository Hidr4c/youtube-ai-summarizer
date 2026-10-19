/**
 * Strategy Interface for AI Inference Providers (Local & Cloud)
 */
export class IAIProvider {
  /**
   * Returns provider unique identifier
   * @returns {string}
   */
  getProviderId() {
    throw new Error('Not implemented');
  }

  /**
   * Returns display name
   * @returns {string}
   */
  getDisplayName() {
    throw new Error('Not implemented');
  }

  /**
   * Returns whether provider runs locally or in the cloud
   * @returns {boolean}
   */
  isLocal() {
    throw new Error('Not implemented');
  }

  /**
   * Fetches list of available models
   * @param {string} [serverUrl]
   * @param {string} [apiKey]
   * @returns {Promise<Array<{ id: string, name?: string }>>}
   */
  async fetchModels(serverUrl, apiKey) {
    throw new Error('Not implemented');
  }

  /**
   * Tests connectivity to provider
   * @param {string} [serverUrl]
   * @param {string} [apiKey]
   * @param {string} [model]
   * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
   */
  async testConnection(serverUrl, apiKey, model) {
    throw new Error('Not implemented');
  }
}

export default IAIProvider;
