import { BaseAIProvider } from './BaseAIProvider.js';
import { PROVIDER_CONFIGS, resolveDeprecatedModel } from '../../../config/AIProviderPresets.js';
import { CloudModelDiscovery } from './CloudModelDiscovery.js';

/**
 * AI Provider strategy for Anthropic Claude (supports live model discovery and 404/529 failover).
 */
export class ClaudeProvider extends BaseAIProvider {
  constructor() {
    super('claude', 'Anthropic Claude', false, PROVIDER_CONFIGS.claude.endpoint);
  }

  async testConnection(_serverUrl, apiKey, model = PROVIDER_CONFIGS.claude.defaultModel) {
    if (!apiKey) return { ok: false, error: 'API Key missing' };
    const cleanKey = String(apiKey).trim();
    const effectiveModel = resolveDeprecatedModel('claude', model);
    const boundFetch = (url, opts) => this.fetchWithTimeout(url, opts, 5000);
    const start = performance.now();
    try {
      const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
        endpoint: this.endpoint,
        headers: {
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        payload: {
          model: effectiveModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        },
        provider: 'claude',
        apiKey: cleanKey,
        fetchFn: boundFetch
      });
      const latencyMs = Math.round(performance.now() - start);
      const finalResolved = resolvedModel || (effectiveModel !== String(model || '').trim() ? effectiveModel : undefined);
      if (response.ok) {
        return finalResolved ? { ok: true, latencyMs, resolvedModel: finalResolved } : { ok: true, latencyMs };
      }
      const errorKind = CloudModelDiscovery.classifyHttpError(response.status, errorText);
      return { ok: false, latencyMs, errorKind, error: CloudModelDiscovery.formatHttpError('claude', response.status, errorText) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export default ClaudeProvider;
