import { BaseAIProvider } from './BaseAIProvider.js';
import { CLOUD_MODELS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for Anthropic Claude
 */
export class ClaudeProvider extends BaseAIProvider {
  constructor() {
    super('claude', 'Anthropic Claude', false);
    this.endpoint = 'https://api.anthropic.com/v1/messages';
  }

  async fetchModels() {
    return CLOUD_MODELS.claude || [];
  }

  async testConnection(_serverUrl, apiKey, model = 'claude-3-5-haiku-20241022') {
    if (!apiKey) return { ok: false, error: 'API Key missing' };
    const start = performance.now();
    try {
      const res = await this.fetchWithTimeout(this.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
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

export default ClaudeProvider;
