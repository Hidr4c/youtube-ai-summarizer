import { BaseAIProvider } from './BaseAIProvider.js';

/**
 * AI Provider strategy for Ollama instances
 */
export class OllamaProvider extends BaseAIProvider {
  constructor() {
    super('ollama', 'Ollama', true);
  }

  /**
   * Fetches models from Ollama /api/tags or /v1/models
   * @param {string} serverUrl
   * @returns {Promise<Array<{ id: string, name?: string }>>}
   */
  async fetchModels(serverUrl = 'http://localhost:11434') {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    try {
      const res = await this.fetchWithTimeout(`${cleanUrl}/api/tags`);
      if (res.ok) {
        const json = await res.json();
        return (json.models || []).map(m => ({ id: m.name || m.model, name: m.name || m.model }));
      }
    } catch {}

    const res2 = await this.fetchWithTimeout(`${cleanUrl}/v1/models`);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    const json2 = await res2.json();
    return (json2.data || []).map(m => ({ id: m.id, name: m.id }));
  }

  /**
   * Tests connection and latency
   * @param {string} serverUrl
   * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
   */
  async testConnection(serverUrl = 'http://localhost:11434') {
    const start = performance.now();
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const res = await this.fetchWithTimeout(`${cleanUrl}/api/tags`, {}, 3000);
      const latencyMs = Math.round(performance.now() - start);
      return { ok: res.ok, latencyMs };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export default OllamaProvider;
