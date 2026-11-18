import { IAIProvider } from '../../interfaces/IAIProvider.js';
import { PROVIDER_CONFIGS, resolveDeprecatedModel } from '../../../config/AIProviderPresets.js';
import { CloudModelDiscovery } from './CloudModelDiscovery.js';

/**
 * Base AI Provider implementing shared helpers and unified Cloud discovery/ping logic.
 */
export class BaseAIProvider extends IAIProvider {
  /**
   * @param {string} id
   * @param {string} displayName
   * @param {boolean} isLocalProvider
   * @param {string} [endpoint='']
   */
  constructor(id, displayName, isLocalProvider = false, endpoint = '') {
    super();
    this.id = id;
    this.displayName = displayName;
    this.isLocalProvider = isLocalProvider;
    this.endpoint = endpoint || PROVIDER_CONFIGS[String(id || '').toLowerCase()]?.endpoint || '';
  }

  getProviderId() {
    return this.id;
  }

  getDisplayName() {
    return this.displayName;
  }

  isLocal() {
    return this.isLocalProvider;
  }

  /**
   * Returns live or preset model list for cloud providers.
   * @param {string} [_serverUrl='']
   * @param {string} [apiKey='']
   * @returns {Promise<Array<{ id: string, name: string }>>}
   */
  async fetchModels(_serverUrl = '', apiKey = '') {
    if (this.isLocalProvider) return [];
    const boundFetch = (url, opts) => this.fetchWithTimeout(url, opts, 5000);
    return CloudModelDiscovery.fetchLiveModels(this.id, apiKey, boundFetch);
  }

  /**
   * Tests OpenAI-compatible Cloud API key and model with automatic retired-model recovery.
   * @param {string} _serverUrl
   * @param {string} apiKey
   * @param {string} [model]
   * @returns {Promise<{ ok: boolean, latencyMs?: number, resolvedModel?: string, error?: string }>}
   */
  async testConnection(_serverUrl, apiKey, model) {
    if (!apiKey) return { ok: false, error: 'API Key missing' };
    if (!this.endpoint) return { ok: false, error: `Unsupported provider: ${this.id}` };

    const cleanKey = String(apiKey).trim();
    const effectiveModel = resolveDeprecatedModel(this.id, model);
    const boundFetch = (url, opts) => this.fetchWithTimeout(url, opts, 5000);
    const start = performance.now();
    try {
      const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
        endpoint: this.endpoint,
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        payload: {
          model: effectiveModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        },
        provider: this.id,
        apiKey: cleanKey,
        fetchFn: boundFetch
      });
      const latencyMs = Math.round(performance.now() - start);
      const finalResolved = resolvedModel || (effectiveModel !== String(model || '').trim() ? effectiveModel : undefined);
      if (response.ok) {
        return finalResolved ? { ok: true, latencyMs, resolvedModel: finalResolved } : { ok: true, latencyMs };
      }
      const errorKind = CloudModelDiscovery.classifyHttpError(response.status, errorText);
      return { ok: false, latencyMs, errorKind, error: CloudModelDiscovery.formatHttpError(this.id, response.status, errorText) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Safe fetch with timeout
   * @param {string} url
   * @param {Object} options
   * @param {number} timeoutMs
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Normalizes server URL by ensuring scheme and removing trailing slashes
   * @param {string} url
   * @param {string} defaultUrl
   * @returns {string}
   */
  normalizeUrl(url, defaultUrl = '') {
    let clean = (url || defaultUrl || '').trim().replace(/\/+$/, '');
    if (!clean) return defaultUrl || '';
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    return clean;
  }
}

export default BaseAIProvider;
