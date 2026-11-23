import { MultimodalMessageFormatter } from './MultimodalMessageFormatter.js';

/**
 * Manages programmatic local LLM context window configuration for LM Studio (v1 load/unload)
 * and Ollama (/api/chat options.num_ctx) with safe loopback mirror fallback.
 */
export class LocalContextManager {
  static isCloudHosted(provider = '', model = '', serverUrl = '') {
    const prov = String(provider || '').toLowerCase();
    if (prov !== 'lmstudio' && prov !== 'ollama') return true;
    const cleanModel = String(model || '').trim();
    const cleanUrl = String(serverUrl || '').trim();
    return /(?:^|[:\-])cloud$/i.test(cleanModel) || /ollama\.com/i.test(cleanUrl);
  }

  /**
   * Parses a user context length preference ('auto' or positive token count).
   * @param {string|number|null} rawValue
   * @returns {number|null}
   */
  static parseContextLength(rawValue) {
    if (!rawValue || rawValue === 'auto') return null;
    const num = parseInt(String(rawValue), 10);
    if (!Number.isFinite(num) || num < 1024) return null;
    return Math.min(num, 1048576);
  }

  /**
   * Normalizes a local provider base URL and computes its loopback mirror (localhost <-> 127.0.0.1).
   * @param {string} serverUrl
   * @param {string} [provider='lmstudio']
   * @returns {{ base: string, mirror: string|null }}
   */
  static resolveBaseAndMirror(serverUrl, provider = 'lmstudio') {
    const def = provider === 'ollama' ? 'http://localhost:11434' : 'http://127.0.0.1:1234';
    let base = String(serverUrl || def).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
    const mirror = base.includes('localhost')
      ? base.replace('localhost', '127.0.0.1')
      : (base.includes('127.0.0.1') ? base.replace('127.0.0.1', 'localhost') : null);
    return { base, mirror };
  }

  /**
   * Executes a fetch call with optional timeout, external abort signal, and loopback fallback.
   * @private
   */
  static async _fetchWithLoopback(path, options, { base, mirror, timeoutMs = 0, signal = null, fetchFn = fetch }) {
    const run = async (urlBase) => {
      const controller = new AbortController();
      const onExtAbort = () => controller.abort();
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      signal?.addEventListener?.('abort', onExtAbort, { once: true });
      const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
      if (typeof timer?.unref === 'function') timer.unref();
      try {
        return await fetchFn(`${urlBase}${path}`, { ...options, signal: controller.signal });
      } finally {
        if (timer !== null) clearTimeout(timer);
        signal?.removeEventListener?.('abort', onExtAbort);
      }
    };

    try {
      const res = await run(base);
      return { res, activeBase: base };
    } catch (err) {
      if (signal?.aborted || !mirror) throw err;
      const res = await run(mirror);
      return { res, activeBase: mirror };
    }
  }

  /**
   * Ensures an LM Studio model is loaded at the requested context_length via v1 REST API.
   * Tolerates +/-512 token alignment rounding from llama.cpp and degrades gracefully on older builds.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async ensureLmStudioContext({
    serverUrl,
    model,
    apiKey = '',
    contextLength,
    fetchFn = fetch,
    signal = null,
    postProgress = null
  }) {
    const targetCtx = LocalContextManager.parseContextLength(contextLength);
    if (!targetCtx || !model) return { applied: false, skipped: true };

    const { base, mirror } = LocalContextManager.resolveBaseAndMirror(serverUrl, 'lmstudio');
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${String(apiKey).trim()}`;

    let catalogRes;
    let activeBase = base;
    try {
      const out = await LocalContextManager._fetchWithLoopback(
        '/api/v1/models',
        { method: 'GET', headers },
        { base, mirror, timeoutMs: 3000, signal, fetchFn }
      );
      catalogRes = out.res;
      activeBase = out.activeBase;
    } catch (err) {
      if (signal?.aborted) throw err;
      return { applied: false, unsupported: true, reason: err.message };
    }

    if (!catalogRes?.ok) return { applied: false, unsupported: true, status: catalogRes?.status || 0 };
    const catalog = await catalogRes.json().catch(() => null);
    const list = Array.isArray(catalog?.models) ? catalog.models : [];
    const modelEntry = list.find((m) => m.key === model || m.id === model || m.loaded_instances?.some((i) => i.id === model));
    if (!modelEntry) return { applied: false, unsupported: true, reason: 'Model not listed in /api/v1/models' };

    const clampedCtx = modelEntry.max_context_length ? Math.min(targetCtx, modelEntry.max_context_length) : targetCtx;
    const instances = Array.isArray(modelEntry.loaded_instances) ? modelEntry.loaded_instances : [];
    const matching = instances.find((inst) => Math.abs((inst.config?.context_length || 0) - clampedCtx) <= 512);
    if (matching) {
      return { applied: true, alreadyMatched: true, contextLength: matching.config.context_length };
    }

    postProgress?.({ type: 'KEEPALIVE', elapsedSec: 1, waitingForModel: true });
    for (const inst of instances) {
      if (!inst?.id) continue;
      await LocalContextManager._fetchWithLoopback(
        '/api/v1/models/unload',
        { method: 'POST', headers, body: JSON.stringify({ instance_id: inst.id }) },
        { base: activeBase, mirror: null, timeoutMs: 5000, signal, fetchFn }
      ).catch(() => null);
    }

    const loadPayload = {
      model: modelEntry.key || model,
      context_length: clampedCtx,
      flash_attention: true,
      offload_kv_cache_to_gpu: true,
      echo_load_config: true
    };
    const { res: loadRes } = await LocalContextManager._fetchWithLoopback(
      '/api/v1/models/load',
      { method: 'POST', headers, body: JSON.stringify(loadPayload) },
      { base: activeBase, mirror: null, timeoutMs: 0, signal, fetchFn }
    );

    if (!loadRes?.ok) {
      const errTxt = await loadRes?.text?.().catch(() => '') || '';
      return { applied: false, status: loadRes?.status || 0, error: errTxt };
    }

    const loadJson = await loadRes.json().catch(() => ({}));
    return {
      applied: true,
      reloaded: true,
      contextLength: loadJson?.load_config?.context_length || clampedCtx,
      loadTimeSeconds: loadJson?.load_time_seconds ?? null
    };
  }

  /**
   * Streams Ollama native /api/chat with explicit options.num_ctx and consumes NDJSON chunks.
   * @param {Object} params
   */
  static async streamOllamaChat({
    serverUrl,
    apiKey = '',
    model,
    messages,
    temperature = 0.3,
    maxTokens = 'auto',
    contextLength,
    signal = null,
    safePost = null,
    port = null,
    fetchFn = fetch
  }) {
    const targetCtx = LocalContextManager.parseContextLength(contextLength);
    const { base, mirror } = LocalContextManager.resolveBaseAndMirror(serverUrl, 'ollama');
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${String(apiKey).trim()}`;

    const parsedTemp = parseFloat(temperature);
    const options = { temperature: !isNaN(parsedTemp) ? parsedTemp : 0.3 };
    if (targetCtx) options.num_ctx = targetCtx;
    const parsedMax = maxTokens && maxTokens !== 'auto' ? parseInt(maxTokens, 10) : NaN;
    if (!isNaN(parsedMax) && parsedMax > 0) options.num_predict = parsedMax;

    const ollamaMessages = MultimodalMessageFormatter.formatMessages(messages, 'ollama');
    const { res } = await LocalContextManager._fetchWithLoopback(
      '/api/chat',
      { method: 'POST', headers, body: JSON.stringify({ model, messages: ollamaMessages, stream: true, options }) },
      { base, mirror, timeoutMs: 0, signal, fetchFn }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Erreur OLLAMA (${res.status}) : ${errText || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const emit = safePost || ((m) => port?.postMessage?.(m));
    let buffer = '';

    const processLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed);
        const content = parsed?.message?.content || '';
        const reasoning = parsed?.message?.thinking || '';
        if (content || reasoning) emit({ type: 'CHUNK', content, reasoning, text: content });
      } catch (_) {}
    };

    while (true) {
      if (signal?.aborted) {
        try { await reader.cancel(); } catch (_) {}
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(processLine);
    }
    if (buffer.trim()) processLine(buffer);
  }

  /**
   * Detects active or server-default context length from local LM Studio (/api/v1/models)
   * or Ollama (/api/ps & /api/show) instances without mutating state.
   * @param {Object} params
   * @returns {Promise<{ contextLength: number, maxContextLength?: number|null, isLoaded: boolean, provider: string }>}
   */
  static async detectLocalContextDefault({ provider = 'lmstudio', serverUrl = '', model = '', apiKey = '', fetchFn = fetch }) {
    const prov = String(provider || 'lmstudio').toLowerCase();
    if (LocalContextManager.isCloudHosted(prov, model, serverUrl)) {
      return { contextLength: null, maxContextLength: null, isLoaded: false, canModifyContext: false, readOnlyReason: 'cloud', provider: prov };
    }
    const fallbackCtx = prov === 'ollama' ? 4096 : 8192;
    const { base, mirror } = LocalContextManager.resolveBaseAndMirror(serverUrl, prov);
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${String(apiKey).trim()}`;

    try {
      if (prov === 'ollama') {
        const psOut = await LocalContextManager._fetchWithLoopback('/api/ps', { method: 'GET', headers }, { base, mirror, timeoutMs: 2500, fetchFn }).catch(() => null);
        const psJson = psOut?.res?.ok ? await psOut.res.json().catch(() => null) : null;
        const running = Array.isArray(psJson?.models) ? psJson.models : [];
        const activeRun = running.find((m) => m.name === model || m.model === model) || running[0];
        if (activeRun?.context_length > 0) {
          return { contextLength: activeRun.context_length, isLoaded: true, canModifyContext: true, readOnlyReason: null, provider: prov };
        }
        if (model) {
          const showOut = await LocalContextManager._fetchWithLoopback(
            '/api/show', { method: 'POST', headers, body: JSON.stringify({ model }) },
            { base: psOut?.activeBase || base, mirror: psOut ? null : mirror, timeoutMs: 2500, fetchFn }
          ).catch(() => null);
          const showJson = showOut?.res?.ok ? await showOut.res.json().catch(() => null) : null;
          const ctxMatch = String(showJson?.parameters || '').match(/num_ctx\s+(\d+)/i);
          const maxInfo = Object.entries(showJson?.model_info || {}).find(([k, v]) => k.endsWith('.context_length') && Number.isFinite(v));
          return {
            contextLength: ctxMatch ? parseInt(ctxMatch[1], 10) : fallbackCtx,
            maxContextLength: maxInfo ? maxInfo[1] : null,
            isLoaded: false, canModifyContext: true, readOnlyReason: null, provider: prov
          };
        }
        return { contextLength: fallbackCtx, isLoaded: false, canModifyContext: true, readOnlyReason: null, provider: prov };
      }

      const out = await LocalContextManager._fetchWithLoopback('/api/v1/models', { method: 'GET', headers }, { base, mirror, timeoutMs: 2500, fetchFn });
      if (!out?.res?.ok) {
        const unsupported = Boolean(out?.res && out.res.status >= 400);
        return { contextLength: fallbackCtx, isLoaded: false, canModifyContext: !unsupported, readOnlyReason: unsupported ? 'server' : null, provider: prov };
      }
      const json = await out.res.json().catch(() => null);
      const list = Array.isArray(json?.models) ? json.models : [];
      const match = list.find((m) => m.key === model || m.id === model) || list.find((m) => m.type !== 'embedding' && m.loaded_instances?.length > 0);
      const loadedCtx = match?.loaded_instances?.[0]?.config?.context_length;
      const maxCtx = match?.max_context_length || null;
      const editable = match?.type !== 'embedding';
      const ctxVal = loadedCtx > 0 ? loadedCtx : (maxCtx ? Math.min(fallbackCtx, maxCtx) : fallbackCtx);
      return { contextLength: ctxVal, maxContextLength: maxCtx, isLoaded: loadedCtx > 0, canModifyContext: editable, readOnlyReason: editable ? null : 'server', provider: prov };
    } catch (_) {
      return { contextLength: fallbackCtx, isLoaded: false, canModifyContext: true, readOnlyReason: null, provider: prov };
    }
  }
}

export default LocalContextManager;
