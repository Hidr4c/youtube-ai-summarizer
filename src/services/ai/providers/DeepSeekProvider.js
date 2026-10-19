import { BaseAIProvider } from './BaseAIProvider.js';
import { CLOUD_MODELS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for DeepSeek
 */
export class DeepSeekProvider extends BaseAIProvider {
  constructor() {
    super('deepseek', 'DeepSeek', false);
    this.endpoint = 'https://api.deepseek.com/chat/completions';
  }

  async fetchModels() {
    return CLOUD_MODELS.deepseek || [];
  }

  async testConnection(_serverUrl, apiKey, model = 'deepseek-chat') {
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

export default DeepSeekProvider;
