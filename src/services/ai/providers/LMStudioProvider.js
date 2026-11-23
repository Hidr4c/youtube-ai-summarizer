import { BaseAIProvider } from './BaseAIProvider.js';
import { DEFAULT_URLS } from '../../../config/ExtensionConstants.js';
import { ModelCapabilities } from '../../../config/ModelCapabilities.js';

/**
 * AI Provider strategy for local LM Studio instances with automatic loopback mirror resolution
 */
export class LMStudioProvider extends BaseAIProvider {
  constructor() {
    super('lmstudio', 'LM Studio', true);
  }

  /**
   * Fetches models from LM Studio /v1/models with automatic loopback mirror (localhost <-> 127.0.0.1)
   * @param {string} [serverUrl]
   * @returns {Promise<Array<{ id: string, name?: string }>>}
   */
  async _fetchModelsAtBase(base) {
    const res = await this.fetchWithTimeout(`${base}/v1/models`, {}, 2000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data || []).map(m => ({ id: m.id, name: m.id }));
  }

  async enrichCapabilities(models, serverUrl = DEFAULT_URLS.LMSTUDIO) {
    if (!Array.isArray(models) || models.length === 0) return models;
    const cleanUrl = this.normalizeUrl(serverUrl, DEFAULT_URLS.LMSTUDIO);
    try {
      const v0 = await this.fetchWithTimeout(`${cleanUrl}/api/v0/models`, {}, 1000);
      if (v0?.ok) {
        const j0 = await v0.json();
        if (Array.isArray(j0?.data)) {
          const metaById = new Map(j0.data.map(m => [m.id, ModelCapabilities.extractMeta(m)]));
          return models.map(m => ({ ...m, ...(metaById.get(m.id) || {}) }));
        }
      }
    } catch (_) {}
    return models;
  }

  async fetchModels(serverUrl = DEFAULT_URLS.LMSTUDIO) {
    const cleanUrl = this.normalizeUrl(serverUrl, DEFAULT_URLS.LMSTUDIO);
    try {
      return await this._fetchModelsAtBase(cleanUrl);
    } catch (primaryErr) {
      const altUrl = cleanUrl.includes('127.0.0.1')
        ? cleanUrl.replace('127.0.0.1', 'localhost')
        : (cleanUrl.includes('localhost') ? cleanUrl.replace('localhost', '127.0.0.1') : null);
      if (altUrl) {
        try {
          return await this._fetchModelsAtBase(altUrl);
        } catch (_) {}
      }
      throw primaryErr;
    }
  }

  /**
   * Tests connection and latency using user-configured serverUrl with loopback mirror fallback
   * @param {string} [serverUrl]
   * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
   */
  async testConnection(serverUrl = DEFAULT_URLS.LMSTUDIO) {
    const start = performance.now();
    const cleanUrl = this.normalizeUrl(serverUrl, DEFAULT_URLS.LMSTUDIO);
    try {
      const res = await this.fetchWithTimeout(`${cleanUrl}/v1/models`, {}, 2500);
      if (res.ok) {
        return { ok: true, latencyMs: Math.round(performance.now() - start) };
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      const altUrl = cleanUrl.includes('127.0.0.1')
        ? cleanUrl.replace('127.0.0.1', 'localhost')
        : (cleanUrl.includes('localhost') ? cleanUrl.replace('localhost', '127.0.0.1') : null);
      if (altUrl) {
        try {
          const res2 = await this.fetchWithTimeout(`${altUrl}/v1/models`, {}, 2500);
          if (res2.ok) {
            return { ok: true, latencyMs: Math.round(performance.now() - start), resolvedUrl: altUrl };
          }
        } catch (_) {}
      }
      return { ok: false, error: err.message };
    }
  }
}

export default LMStudioProvider;
