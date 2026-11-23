import { CLOUD_MODELS, PROVIDER_CONFIGS, resolveDeprecatedModel } from '../../../config/AIProviderPresets.js';
import { CloudErrorClassifier } from './CloudErrorClassifier.js';

export const CLOUD_MODELS_ENDPOINTS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
  geminiNative: 'https://generativelanguage.googleapis.com/v1beta/models',
  groq: 'https://api.groq.com/openai/v1/models',
  openai: 'https://api.openai.com/v1/models',
  claude: 'https://api.anthropic.com/v1/models',
  deepseek: 'https://api.deepseek.com/models',
  grok: 'https://api.x.ai/v1/models',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models',
  mistral: 'https://api.mistral.ai/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
  perplexity: 'https://api.perplexity.ai/models',
  together: 'https://api.together.xyz/v1/models'
};

const NON_CHAT_MODEL_RE = /(?:embed|whisper|tts|imagen|veo|sora|dall-e|moderation|audio|realtime|aqa|bisociation|prompt-guard|safeguard|transcribe|-image|image-|gpt-image|robotics|computer-use|banana|learnlm|-live-|live-preview|babbage|davinci|voxtral|ocr|wanx|paraformer)/i;
const EXCLUDED_TYPES = new Set(['image', 'embedding', 'moderation', 'rerank', 'audio', 'video', 'tts', 'transcribe']);

const _inFlightLiveModels = new Map();

/**
 * Dynamic model discovery, universal ranking, and 404/503/529 failover across all 11 Cloud AI providers.
 */
export class CloudModelDiscovery {
  static _extractErrorDetail(rawText = '') { return CloudErrorClassifier.extractErrorDetail(rawText); }
  static isAuthError(status, errText = '') { return CloudErrorClassifier.isAuthError(status, errText); }
  static isTransientOverloadError(status, errText = '') { return CloudErrorClassifier.isTransientOverloadError(status, errText); }
  static isRetiredModelError(status, errText = '') { return CloudErrorClassifier.isRetiredModelError(status, errText); }
  static classifyHttpError(status, errText = '') { return CloudErrorClassifier.classifyHttpError(status, errText); }
  static formatHttpError(provider, status, errText = '') { return CloudErrorClassifier.formatHttpError(provider, status, errText); }

  /**
   * Filters non-chat entries and ranks discovered models consistently across all Cloud providers.
   * @param {string} provider
   * @param {Array<Object>} rawList
   * @returns {Array<{ id: string, name: string }>}
   */
  static normalizeModelList(provider, rawList = []) {
    const p = String(provider || '').toLowerCase();
    const presets = CLOUD_MODELS[p] || [];
    const presetNameMap = new Map(presets.map(m => [m.id, m.name]));
    const presetOrderMap = new Map(presets.map((m, idx) => [m.id, idx]));
    const seen = new Set();
    const cleaned = [];

    for (const item of rawList) {
      if (Array.isArray(item?.supportedGenerationMethods) && !item.supportedGenerationMethods.includes('generateContent')) continue;
      if (item?.capabilities && item.capabilities.completion_chat === false) continue;
      if (item?.type && EXCLUDED_TYPES.has(String(item.type).toLowerCase())) continue;
      if (item?.architecture?.modality && !/->\s*text/i.test(String(item.architecture.modality))) continue;

      const rawId = item?.id || item?.name || '';
      const id = String(rawId).replace(/^models\//, '').trim();
      if (!id || seen.has(id) || NON_CHAT_MODEL_RE.test(id)) continue;
      if (p === 'gemini' && !/^gemini-/i.test(id)) continue;
      seen.add(id);

      const apiLabel = item?.displayName || item?.display_name || (item?.name && item.name !== id ? item.name : '');
      const isFreeTier = String(item?.pricing?.prompt) === '0' && String(item?.pricing?.completion) === '0';
      let displayName = presetNameMap.get(id) || (apiLabel && apiLabel !== id ? `${id} (${apiLabel})` : id);
      if (isFreeTier && !/free|gratuit/i.test(displayName)) displayName = `${displayName} (Free)`;
      cleaned.push({ id, name: displayName, _isFree: isFreeTier || id.endsWith(':free') });
    }

    const rankModel = (entry) => {
      const id = entry.id;
      if (p === 'gemini') {
        if (id === 'gemini-flash-latest') return 0;
        if (id.includes('flash') && !id.includes('exp') && !id.includes('1.5') && !id.includes('2.0')) return 1;
        if (id === 'gemini-pro-latest' || (id.includes('pro') && !id.includes('exp') && !id.includes('1.5'))) return 2;
        if (id.includes('flash')) return 3;
        return 4;
      }
      if (presetOrderMap.has(id)) return presetOrderMap.get(id);
      if (p === 'openrouter' && entry._isFree) return 100;
      if (/(?:latest|gpt-4o|gpt-4\.1|gpt-5|o3|o4|claude-3-5|claude-3-7|claude-sonnet-4|claude-haiku-4|deepseek|qwen|grok|sonar|oss)/i.test(id)) return 200;
      return 300;
    };

    cleaned.sort((a, b) => rankModel(a) - rankModel(b) || b.id.localeCompare(a.id));
    return cleaned.map(({ id, name }) => ({ id, name }));
  }

  /**
   * Queries live cloud provider `/models` catalog, coalescing concurrent identical lookups
   * and falling back to `CLOUD_MODELS[provider]` when offline or unconfigured.
   * @param {string} provider
   * @param {string} [apiKey='']
   * @param {Function} [fetchFn=fetch]
   * @returns {Promise<Array<{ id: string, name: string }>>}
   */
  static async fetchLiveModels(provider, apiKey = '', fetchFn = fetch) {
    const p = String(provider || '').toLowerCase();
    const fallback = CLOUD_MODELS[p] || [];
    const cleanKey = String(apiKey || '').trim();
    const endpoint = CLOUD_MODELS_ENDPOINTS[p];
    if (!cleanKey || !endpoint) return fallback;

    const inflightKey = `${p}:${cleanKey}`;
    if (fetchFn === fetch && _inFlightLiveModels.has(inflightKey)) {
      return _inFlightLiveModels.get(inflightKey);
    }

    const work = CloudModelDiscovery._fetchLiveModelsRequest(p, cleanKey, endpoint, fallback, fetchFn);
    if (fetchFn !== fetch) return work;

    _inFlightLiveModels.set(inflightKey, work);
    try {
      return await work;
    } finally {
      _inFlightLiveModels.delete(inflightKey);
    }
  }

  /**
   * Executes live provider `/models` fetch with provider-specific auth & response extraction.
   * @private
   */
  static async _fetchLiveModelsRequest(p, cleanKey, endpoint, fallback, fetchFn) {
    try {
      const headers = p === 'claude'
        ? { 'x-api-key': cleanKey, 'anthropic-version': '2023-06-01', 'Accept': 'application/json' }
        : { 'Authorization': `Bearer ${cleanKey}`, 'Accept': 'application/json' };
      if (p === 'openrouter') {
        headers['HTTP-Referer'] = 'https://youtube.com';
        headers['X-Title'] = 'YouTube AI Summarizer';
      }
      const res = await fetchFn(endpoint, { method: 'GET', headers });
      if (res && res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.models) ? json.models : []));
        const normalized = CloudModelDiscovery.normalizeModelList(p, rawList);
        if (normalized.length > 0) return normalized;
      }

      if (p === 'gemini') {
        const nativeRes = await fetchFn(CLOUD_MODELS_ENDPOINTS.geminiNative, {
          method: 'GET',
          headers: { 'x-goog-api-key': cleanKey, 'Accept': 'application/json' }
        });
        if (nativeRes && nativeRes.ok) {
          const nativeJson = await nativeRes.json();
          const normalized = CloudModelDiscovery.normalizeModelList('gemini', nativeJson?.models || []);
          if (normalized.length > 0) return normalized;
        }
      }
    } catch (_) {}

    return fallback;
  }

  /**
   * Resolves a working fallback model ID after a retired/404 or transient overload/503/529 failure.
   * @param {string} provider
   * @param {string} failingModel
   * @param {string} [apiKey='']
   * @param {Function} [fetchFn=fetch]
   * @param {Set<string>} [excludeModels=new Set()]
   * @returns {Promise<string|null>}
   */
  static async resolveModelFallback(provider, failingModel, apiKey = '', fetchFn = fetch, excludeModels = new Set()) {
    const p = String(provider || '').toLowerCase();
    const current = String(failingModel || '').trim();
    const excluded = new Set(excludeModels);
    if (current) excluded.add(current);

    const aliased = resolveDeprecatedModel(p, current);
    if (aliased && !excluded.has(aliased)) return aliased;

    const liveList = await CloudModelDiscovery.fetchLiveModels(p, apiKey, fetchFn);
    const candidate = liveList.find(m => m.id && !excluded.has(m.id));
    if (candidate) return candidate.id;

    const def = PROVIDER_CONFIGS[p]?.defaultModel;
    return (def && !excluded.has(def)) ? def : null;
  }

  /**
   * Executes a chat completion POST and automatically retries with alternate live models
   * on retired-model (404/410) or transient high-demand overload (502/503/504/529) errors.
   * @param {Object} params
   * @returns {Promise<{ response: Response, resolvedModel: string|null, errorText: string }>}
   */
  static async fetchWithModelFallback({ endpoint, headers, payload, signal = null, provider, apiKey = '', fetchFn = fetch }) {
    const isLocal = provider === 'lmstudio' || provider === 'ollama';
    const post = async (bodyObj, urlOverride = endpoint) => {
      const opts = { method: 'POST', headers, body: JSON.stringify(bodyObj) };
      if (signal) opts.signal = signal;
      return fetchFn(urlOverride, opts);
    };

    const tried = new Set([payload.model]);
    let response;
    try {
      response = await post(payload);
    } catch (err) {
      const mirror = isLocal && !signal?.aborted
        ? (endpoint.includes('localhost') ? endpoint.replace('localhost', '127.0.0.1') : (endpoint.includes('127.0.0.1') ? endpoint.replace('127.0.0.1', 'localhost') : null))
        : null;
      if (!mirror) throw err;
      response = await post(payload, mirror);
    }
    if (response.ok) return { response, resolvedModel: null, errorText: '' };

    let errorText = await response.text().catch(() => '');
    let currentModel = payload.model;

    for (let attempt = 0; attempt < 2 && !isLocal; attempt++) {
      const canRecover = CloudErrorClassifier.isRetiredModelError(response.status, errorText)
        || CloudErrorClassifier.isTransientOverloadError(response.status, errorText);
      if (!canRecover) break;

      const fallbackModel = await CloudModelDiscovery.resolveModelFallback(provider, currentModel, apiKey, fetchFn, tried);
      if (!fallbackModel || tried.has(fallbackModel)) break;

      tried.add(fallbackModel);
      currentModel = fallbackModel;
      response = await post({ ...payload, model: fallbackModel });
      if (response.ok) return { response, resolvedModel: fallbackModel, errorText: '' };
      errorText = await response.text().catch(() => '');
    }

    return { response, resolvedModel: tried.size > 1 ? currentModel : null, errorText };
  }
}

export default CloudModelDiscovery;
