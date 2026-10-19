import { BaseAIProvider } from './BaseAIProvider.js';
import { CLOUD_MODELS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for Google Gemini
 */
export class GeminiProvider extends BaseAIProvider {
  constructor() {
    super('gemini', 'Google Gemini', false);
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  }

  /**
   * Returns preset models for Gemini
   * @returns {Promise<Array<{ id: string, name: string }>>}
   */
  async fetchModels() {
    return CLOUD_MODELS.gemini || [];
  }

  /**
   * Tests API key validity with a quick ping
   * @param {string} _serverUrl
   * @param {string} apiKey
   * @param {string} [model]
   * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
   */
  async testConnection(_serverUrl, apiKey, model = 'gemini-1.5-flash') {
    if (!apiKey) return { ok: false, error: 'API Key missing' };
    const start = performance.now();
    try {
      const res = await this.fetchWithTimeout(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      }, 5000);
      const latencyMs = Math.round(performance.now() - start);
      return { ok: res.ok, latencyMs };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export default GeminiProvider;
