import { BaseAIProvider } from './BaseAIProvider.js';
import { CLOUD_MODELS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for OpenAI
 */
export class OpenAIProvider extends BaseAIProvider {
  constructor() {
    super('openai', 'OpenAI', false);
    this.endpoint = 'https://api.openai.com/v1/chat/completions';
  }

  async fetchModels() {
    return CLOUD_MODELS.openai || [];
  }

  async testConnection(_serverUrl, apiKey, model = 'gpt-4o-mini') {
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

export default OpenAIProvider;
