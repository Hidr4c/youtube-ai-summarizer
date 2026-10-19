import { BaseAIProvider } from './BaseAIProvider.js';

/**
 * AI Provider strategy for local LM Studio instances
 */
export class LMStudioProvider extends BaseAIProvider {
  constructor() {
    super('lmstudio', 'LM Studio', true);
  }

  /**
   * Fetches models from LM Studio /v1/models
   * @param {string} serverUrl
   * @returns {Promise<Array<{ id: string, name?: string }>>}
   */
  async fetchModels(serverUrl = 'http://192.168.56.1:1234') {
    const cleanUrl = this.normalizeUrl(serverUrl, 'http://192.168.56.1:1234');
    const res = await this.fetchWithTimeout(`${cleanUrl}/v1/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data || []).map(m => ({ id: m.id, name: m.id }));
  }

  /**
   * Tests connection and latency
   * @param {string} serverUrl
   * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
   */
  async testConnection(serverUrl = 'http://192.168.56.1:1234') {
    const start = performance.now();
    try {
      const cleanUrl = this.normalizeUrl(serverUrl, 'http://192.168.56.1:1234');
      const res = await this.fetchWithTimeout(`${cleanUrl}/v1/models`, {}, 3000);
      const latencyMs = Math.round(performance.now() - start);
      return { ok: res.ok, latencyMs };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export default LMStudioProvider;
