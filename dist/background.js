(() => {
  // src/config/AIProviderPresets.js
  var CLOUD_MODELS = {
    gemini: [
      { id: "gemini-flash-latest", name: "\u2B50 gemini-flash-latest (Gratuit, Auto-\xE0-jour)" },
      { id: "gemini-3.8-flash", name: "gemini-3.8-flash (Rapide & Polyvalent)" },
      { id: "gemini-3.5-flash-lite", name: "gemini-3.5-flash-lite (Ultra-l\xE9ger, Gratuit)" },
      { id: "gemini-pro-latest", name: "gemini-pro-latest (Analyse approfondie)" }
    ],
    groq: [
      { id: "openai/gpt-oss-120b", name: "\u2B50 openai/gpt-oss-120b (Puissant & Gratuit)" },
      { id: "openai/gpt-oss-20b", name: "openai/gpt-oss-20b (Ultra-rapide)" },
      { id: "qwen/qwen3.8-27b", name: "qwen/qwen3.8-27b (Polyvalent)" }
    ],
    openai: [
      { id: "gpt-4o-mini", name: "\u2B50 gpt-4o-mini (\xC9conomique & Rapide)" },
      { id: "gpt-4o", name: "gpt-4o (Mod\xE8le phare)" },
      { id: "o3-mini", name: "o3-mini (Raisonnement)" }
    ],
    claude: [
      { id: "claude-3-5-haiku-20241022", name: "\u2B50 claude-3-5-haiku (Rapide)" },
      { id: "claude-3-5-sonnet-20241022", name: "claude-3-5-sonnet (Excellence)" }
    ],
    deepseek: [
      { id: "deepseek-chat", name: "\u2B50 deepseek-chat (V3)" },
      { id: "deepseek-reasoner", name: "deepseek-reasoner (R1 Thinking)" }
    ],
    grok: [
      { id: "grok-2-latest", name: "\u2B50 grok-2-latest" },
      { id: "grok-2-vision-1212", name: "grok-2-vision" },
      { id: "grok-beta", name: "grok-beta" }
    ],
    qwen: [
      { id: "qwen-plus", name: "\u2B50 qwen-plus (\xC9quilibr\xE9 & Efficace)" },
      { id: "qwen-max", name: "qwen-max (Maximum de puissance)" },
      { id: "qwen-turbo", name: "qwen-turbo (Ultra rapide)" },
      { id: "qwen2.5-72b-instruct", name: "qwen2.5-72b-instruct" }
    ],
    mistral: [
      { id: "mistral-small-latest", name: "\u2B50 mistral-small-latest (Rapide)" },
      { id: "mistral-large-latest", name: "mistral-large-latest (Mod\xE8le phare)" },
      { id: "codestral-latest", name: "codestral-latest" }
    ],
    openrouter: [
      { id: "deepseek/deepseek-r1", name: "\u2B50 deepseek/deepseek-r1" },
      { id: "qwen/qwen-2.5-72b-instruct", name: "qwen/qwen-2.5-72b-instruct" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "meta-llama/llama-3.3-70b-instruct" },
      { id: "anthropic/claude-3.5-sonnet", name: "anthropic/claude-3.5-sonnet" },
      { id: "openai/gpt-oss-120b", name: "openai/gpt-oss-120b" }
    ],
    perplexity: [
      { id: "sonar", name: "\u2B50 sonar (Rapide)" },
      { id: "sonar-pro", name: "sonar-pro" },
      { id: "sonar-reasoning", name: "sonar-reasoning" }
    ],
    together: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "\u2B50 Llama-3.3-70B-Instruct-Turbo" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen2.5-72B-Instruct-Turbo" },
      { id: "deepseek-ai/DeepSeek-R1", name: "deepseek-ai/DeepSeek-R1" }
    ]
  };
  var PROVIDER_NAMES = {
    lmstudio: "LM Studio",
    ollama: "Ollama",
    gemini: "Google Gemini",
    groq: "Groq",
    openai: "OpenAI (ChatGPT)",
    claude: "Anthropic Claude",
    deepseek: "DeepSeek",
    grok: "xAI (Grok)",
    qwen: "Qwen (DashScope)",
    mistral: "Mistral AI",
    openrouter: "OpenRouter",
    perplexity: "Perplexity AI",
    together: "Together AI"
  };
  var PROVIDER_CONFIGS = {
    lmstudio: { name: "LM Studio (Local)" },
    ollama: { name: "Ollama (Local / Cloud)" },
    gemini: {
      name: "Google Gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      defaultModel: "gemini-flash-latest"
    },
    groq: {
      name: "Groq (Inf\xE9rence Rapide)",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      defaultModel: "openai/gpt-oss-120b"
    },
    openai: {
      name: "OpenAI (ChatGPT)",
      endpoint: "https://api.openai.com/v1/chat/completions",
      defaultModel: "gpt-4o-mini"
    },
    claude: {
      name: "Anthropic Claude",
      endpoint: "https://api.anthropic.com/v1/messages",
      defaultModel: "claude-3-5-haiku-20241022"
    },
    deepseek: {
      name: "DeepSeek",
      endpoint: "https://api.deepseek.com/chat/completions",
      defaultModel: "deepseek-chat"
    },
    grok: {
      name: "xAI (Grok)",
      endpoint: "https://api.x.ai/v1/chat/completions",
      defaultModel: "grok-2-latest"
    },
    qwen: {
      name: "Qwen (Alibaba DashScope)",
      endpoint: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      defaultModel: "qwen-plus"
    },
    mistral: {
      name: "Mistral AI",
      endpoint: "https://api.mistral.ai/v1/chat/completions",
      defaultModel: "mistral-small-latest"
    },
    openrouter: {
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      defaultModel: "deepseek/deepseek-r1"
    },
    perplexity: {
      name: "Perplexity AI",
      endpoint: "https://api.perplexity.ai/chat/completions",
      defaultModel: "sonar"
    },
    together: {
      name: "Together AI",
      endpoint: "https://api.together.xyz/v1/chat/completions",
      defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
    }
  };
  var DEPRECATED_MODEL_ALIASES = {
    gemini: {
      "gemini-1.5-flash": "gemini-flash-latest",
      "gemini-1.5-flash-latest": "gemini-flash-latest",
      "gemini-1.5-flash-001": "gemini-flash-latest",
      "gemini-1.5-flash-002": "gemini-flash-latest",
      "gemini-1.5-pro": "gemini-pro-latest",
      "gemini-1.5-pro-latest": "gemini-pro-latest",
      "gemini-2.0-flash": "gemini-flash-latest",
      "gemini-2.0-flash-exp": "gemini-flash-latest",
      "gemini-2.0-flash-lite": "gemini-3.5-flash-lite"
    },
    groq: {
      "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
      "llama-3.1-8b-instant": "openai/gpt-oss-20b",
      "mixtral-8x7b-32768": "openai/gpt-oss-120b",
      "llama3-70b-8192": "openai/gpt-oss-120b",
      "llama3-8b-8192": "openai/gpt-oss-20b",
      "gemma2-9b-it": "openai/gpt-oss-20b",
      "deepseek-r1-distill-llama-70b": "openai/gpt-oss-120b"
    },
    claude: {
      "claude-3-5-sonnet-20240620": "claude-3-5-sonnet-20241022",
      "claude-3-sonnet-20240229": "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229": "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307": "claude-3-5-haiku-20241022"
    },
    openai: {
      "gpt-4-vision-preview": "gpt-4o",
      "gpt-4-32k": "gpt-4o",
      "gpt-3.5-turbo-16k": "gpt-4o-mini"
    },
    mistral: {
      "open-mistral-7b": "mistral-small-latest",
      "open-mixtral-8x7b": "mistral-small-latest",
      "mistral-tiny": "mistral-small-latest",
      "mistral-medium": "mistral-large-latest"
    },
    openrouter: {
      "google/gemini-2.0-flash-exp:free": "deepseek/deepseek-r1",
      "meta-llama/llama-3.1-8b-instruct:free": "deepseek/deepseek-r1"
    }
  };
  function resolveDeprecatedModel(provider, modelId) {
    const cleanProvider = String(provider || "").toLowerCase();
    const rawModel = String(modelId || "").trim();
    const cleanModel = cleanProvider === "gemini" ? rawModel.replace(/^models\//, "") : rawModel;
    if (!cleanModel) return PROVIDER_CONFIGS[cleanProvider]?.defaultModel || "";
    const aliasMap = DEPRECATED_MODEL_ALIASES[cleanProvider];
    return aliasMap && aliasMap[cleanModel] ? aliasMap[cleanModel] : cleanModel;
  }

  // src/services/ai/providers/CloudErrorClassifier.js
  var CloudErrorClassifier = class _CloudErrorClassifier {
    /**
     * Unwraps error message text from either JSON objects or array-wrapped error payloads.
     * @param {string} [rawText='']
     * @returns {string}
     */
    static extractErrorDetail(rawText = "") {
      const clean = String(rawText || "").trim();
      if (!clean) return "";
      try {
        const rawParsed = JSON.parse(clean);
        const item = Array.isArray(rawParsed) ? rawParsed[0] : rawParsed;
        return String(item?.error?.message || item?.message || clean).trim();
      } catch (_) {
        return clean;
      }
    }
    /**
     * Detects HTTP status/payload indicating an invalid or unauthorized API key.
     * @param {number} status
     * @param {string} [errText='']
     * @returns {boolean}
     */
    static isAuthError(status, errText = "") {
      const raw = String(errText || "").toLowerCase();
      const msg = _CloudErrorClassifier.extractErrorDetail(errText).toLowerCase();
      return status === 401 || status === 403 || /(?:api key not valid|api_key_invalid|invalid_api_key|authentication_error|unauthorized|permission_denied|clé api refusée)/.test(`${msg} ${raw}`);
    }
    /**
     * Detects temporary server overload / high-demand errors suitable for alternate-model failover.
     * @param {number} status
     * @param {string} [errText='']
     * @returns {boolean}
     */
    static isTransientOverloadError(status, errText = "") {
      const raw = String(errText || "").toLowerCase();
      const msg = _CloudErrorClassifier.extractErrorDetail(errText).toLowerCase();
      return status === 502 || status === 503 || status === 504 || status === 529 || /(?:unavailable|high demand|overloaded|overloaded_error|try again later|service unavailable)/.test(`${msg} ${raw}`);
    }
    /**
     * Detects HTTP status/payload indicating a retired, decommissioned, or unknown model ID.
     * @param {number} status
     * @param {string} [errText='']
     * @returns {boolean}
     */
    static isRetiredModelError(status, errText = "") {
      const raw = String(errText || "").toLowerCase();
      const msg = _CloudErrorClassifier.extractErrorDetail(errText).toLowerCase();
      if (status === 404 || status === 410) return true;
      return (status === 400 || status === 422) && /(?:not found|not_found_error|decommissioned|deprecated|not supported for generatecontent|does not exist|model_not_found)/.test(`${msg} ${raw}`);
    }
    /**
     * Classifies HTTP error into UI badge category ('auth' | 'busy' | 'other').
     * @param {number} status
     * @param {string} [errText='']
     * @returns {'auth'|'busy'|'other'}
     */
    static classifyHttpError(status, errText = "") {
      if (_CloudErrorClassifier.isAuthError(status, errText)) return "auth";
      if (_CloudErrorClassifier.isTransientOverloadError(status, errText) || status === 429) return "busy";
      return "other";
    }
    /**
     * Parses raw provider HTTP error payload into a concise, actionable user message.
     * @param {string} provider
     * @param {number} status
     * @param {string} [errText='']
     * @returns {string}
     */
    static formatHttpError(provider, status, errText = "") {
      const tag = String(provider || "AI").toUpperCase();
      const detail = _CloudErrorClassifier.extractErrorDetail(errText);
      if (_CloudErrorClassifier.isAuthError(status, detail)) {
        return `Erreur ${tag} (${status}) : Cl\xE9 API refus\xE9e ou invalide. V\xE9rifiez ou r\xE9g\xE9n\xE9rez votre cl\xE9 API. D\xE9tail : ${detail}`;
      }
      if (_CloudErrorClassifier.isTransientOverloadError(status, detail)) {
        return `Serveur ${tag} temporairement satur\xE9 (${status} \u2014 forte demande). R\xE9essayez dans un instant ou choisissez un autre mod\xE8le (ex. flash-lite). D\xE9tail : ${detail}`;
      }
      if (status === 429 || /resource_exhausted|rate limit|quota/i.test(detail)) {
        return `Quota / limite atteinte sur ${tag} (${status}). Patientez un instant ou essayez un mod\xE8le plus l\xE9ger (ex. flash-lite). D\xE9tail : ${detail}`;
      }
      if (_CloudErrorClassifier.isRetiredModelError(status, detail)) {
        return `Mod\xE8le introuvable ou retir\xE9 sur ${tag} (${status}). S\xE9lectionnez un autre mod\xE8le ou actualisez la liste dans R\xE9glages. D\xE9tail : ${detail}`;
      }
      return `Erreur ${tag} (${status}) : ${detail || "HTTP Error"}`;
    }
  };

  // src/services/ai/providers/CloudModelDiscovery.js
  var CLOUD_MODELS_ENDPOINTS = {
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai/models",
    geminiNative: "https://generativelanguage.googleapis.com/v1beta/models",
    groq: "https://api.groq.com/openai/v1/models",
    openai: "https://api.openai.com/v1/models",
    claude: "https://api.anthropic.com/v1/models",
    deepseek: "https://api.deepseek.com/models",
    grok: "https://api.x.ai/v1/models",
    qwen: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
    mistral: "https://api.mistral.ai/v1/models",
    openrouter: "https://openrouter.ai/api/v1/models",
    perplexity: "https://api.perplexity.ai/models",
    together: "https://api.together.xyz/v1/models"
  };
  var NON_CHAT_MODEL_RE = /(?:embed|whisper|tts|imagen|veo|sora|dall-e|moderation|audio|realtime|aqa|bisociation|prompt-guard|safeguard|transcribe|-image|image-|gpt-image|robotics|computer-use|banana|learnlm|-live-|live-preview|babbage|davinci|voxtral|ocr|wanx|paraformer)/i;
  var EXCLUDED_TYPES = /* @__PURE__ */ new Set(["image", "embedding", "moderation", "rerank", "audio", "video", "tts", "transcribe"]);
  var _inFlightLiveModels = /* @__PURE__ */ new Map();
  var CloudModelDiscovery = class _CloudModelDiscovery {
    static _extractErrorDetail(rawText = "") {
      return CloudErrorClassifier.extractErrorDetail(rawText);
    }
    static isAuthError(status, errText = "") {
      return CloudErrorClassifier.isAuthError(status, errText);
    }
    static isTransientOverloadError(status, errText = "") {
      return CloudErrorClassifier.isTransientOverloadError(status, errText);
    }
    static isRetiredModelError(status, errText = "") {
      return CloudErrorClassifier.isRetiredModelError(status, errText);
    }
    static classifyHttpError(status, errText = "") {
      return CloudErrorClassifier.classifyHttpError(status, errText);
    }
    static formatHttpError(provider, status, errText = "") {
      return CloudErrorClassifier.formatHttpError(provider, status, errText);
    }
    /**
     * Filters non-chat entries and ranks discovered models consistently across all Cloud providers.
     * @param {string} provider
     * @param {Array<Object>} rawList
     * @returns {Array<{ id: string, name: string }>}
     */
    static normalizeModelList(provider, rawList = []) {
      const p = String(provider || "").toLowerCase();
      const presets = CLOUD_MODELS[p] || [];
      const presetNameMap = new Map(presets.map((m) => [m.id, m.name]));
      const presetOrderMap = new Map(presets.map((m, idx) => [m.id, idx]));
      const seen = /* @__PURE__ */ new Set();
      const cleaned = [];
      for (const item of rawList) {
        if (Array.isArray(item?.supportedGenerationMethods) && !item.supportedGenerationMethods.includes("generateContent")) continue;
        if (item?.capabilities && item.capabilities.completion_chat === false) continue;
        if (item?.type && EXCLUDED_TYPES.has(String(item.type).toLowerCase())) continue;
        if (item?.architecture?.modality && !/->\s*text/i.test(String(item.architecture.modality))) continue;
        const rawId = item?.id || item?.name || "";
        const id = String(rawId).replace(/^models\//, "").trim();
        if (!id || seen.has(id) || NON_CHAT_MODEL_RE.test(id)) continue;
        if (p === "gemini" && !/^gemini-/i.test(id)) continue;
        seen.add(id);
        const apiLabel = item?.displayName || item?.display_name || (item?.name && item.name !== id ? item.name : "");
        const isFreeTier = String(item?.pricing?.prompt) === "0" && String(item?.pricing?.completion) === "0";
        let displayName = presetNameMap.get(id) || (apiLabel && apiLabel !== id ? `${id} (${apiLabel})` : id);
        if (isFreeTier && !/free|gratuit/i.test(displayName)) displayName = `${displayName} (Free)`;
        cleaned.push({ id, name: displayName, _isFree: isFreeTier || id.endsWith(":free") });
      }
      const rankModel = (entry) => {
        const id = entry.id;
        if (p === "gemini") {
          if (id === "gemini-flash-latest") return 0;
          if (id.includes("flash") && !id.includes("exp") && !id.includes("1.5") && !id.includes("2.0")) return 1;
          if (id === "gemini-pro-latest" || id.includes("pro") && !id.includes("exp") && !id.includes("1.5")) return 2;
          if (id.includes("flash")) return 3;
          return 4;
        }
        if (presetOrderMap.has(id)) return presetOrderMap.get(id);
        if (p === "openrouter" && entry._isFree) return 100;
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
    static async fetchLiveModels(provider, apiKey = "", fetchFn = fetch) {
      const p = String(provider || "").toLowerCase();
      const fallback = CLOUD_MODELS[p] || [];
      const cleanKey = String(apiKey || "").trim();
      const endpoint = CLOUD_MODELS_ENDPOINTS[p];
      if (!cleanKey || !endpoint) return fallback;
      const inflightKey = `${p}:${cleanKey}`;
      if (fetchFn === fetch && _inFlightLiveModels.has(inflightKey)) {
        return _inFlightLiveModels.get(inflightKey);
      }
      const work = _CloudModelDiscovery._fetchLiveModelsRequest(p, cleanKey, endpoint, fallback, fetchFn);
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
        const headers = p === "claude" ? { "x-api-key": cleanKey, "anthropic-version": "2023-06-01", "Accept": "application/json" } : { "Authorization": `Bearer ${cleanKey}`, "Accept": "application/json" };
        if (p === "openrouter") {
          headers["HTTP-Referer"] = "https://youtube.com";
          headers["X-Title"] = "YouTube AI Summarizer";
        }
        const res = await fetchFn(endpoint, { method: "GET", headers });
        if (res && res.ok) {
          const json = await res.json();
          const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : [];
          const normalized = _CloudModelDiscovery.normalizeModelList(p, rawList);
          if (normalized.length > 0) return normalized;
        }
        if (p === "gemini") {
          const nativeRes = await fetchFn(CLOUD_MODELS_ENDPOINTS.geminiNative, {
            method: "GET",
            headers: { "x-goog-api-key": cleanKey, "Accept": "application/json" }
          });
          if (nativeRes && nativeRes.ok) {
            const nativeJson = await nativeRes.json();
            const normalized = _CloudModelDiscovery.normalizeModelList("gemini", nativeJson?.models || []);
            if (normalized.length > 0) return normalized;
          }
        }
      } catch (_) {
      }
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
    static async resolveModelFallback(provider, failingModel, apiKey = "", fetchFn = fetch, excludeModels = /* @__PURE__ */ new Set()) {
      const p = String(provider || "").toLowerCase();
      const current = String(failingModel || "").trim();
      const excluded = new Set(excludeModels);
      if (current) excluded.add(current);
      const aliased = resolveDeprecatedModel(p, current);
      if (aliased && !excluded.has(aliased)) return aliased;
      const liveList = await _CloudModelDiscovery.fetchLiveModels(p, apiKey, fetchFn);
      const candidate = liveList.find((m) => m.id && !excluded.has(m.id));
      if (candidate) return candidate.id;
      const def = PROVIDER_CONFIGS[p]?.defaultModel;
      return def && !excluded.has(def) ? def : null;
    }
    /**
     * Executes a chat completion POST and automatically retries with alternate live models
     * on retired-model (404/410) or transient high-demand overload (502/503/504/529) errors.
     * @param {Object} params
     * @returns {Promise<{ response: Response, resolvedModel: string|null, errorText: string }>}
     */
    static async fetchWithModelFallback({ endpoint, headers, payload, signal = null, provider, apiKey = "", fetchFn = fetch }) {
      const isLocal = provider === "lmstudio" || provider === "ollama";
      const post = async (bodyObj, urlOverride = endpoint) => {
        const opts = { method: "POST", headers, body: JSON.stringify(bodyObj) };
        if (signal) opts.signal = signal;
        return fetchFn(urlOverride, opts);
      };
      const tried = /* @__PURE__ */ new Set([payload.model]);
      let response;
      try {
        response = await post(payload);
      } catch (err) {
        const mirror = isLocal && !signal?.aborted ? endpoint.includes("localhost") ? endpoint.replace("localhost", "127.0.0.1") : endpoint.includes("127.0.0.1") ? endpoint.replace("127.0.0.1", "localhost") : null : null;
        if (!mirror) throw err;
        response = await post(payload, mirror);
      }
      if (response.ok) return { response, resolvedModel: null, errorText: "" };
      let errorText = await response.text().catch(() => "");
      let currentModel = payload.model;
      for (let attempt = 0; attempt < 2 && !isLocal; attempt++) {
        const canRecover = CloudErrorClassifier.isRetiredModelError(response.status, errorText) || CloudErrorClassifier.isTransientOverloadError(response.status, errorText);
        if (!canRecover) break;
        const fallbackModel = await _CloudModelDiscovery.resolveModelFallback(provider, currentModel, apiKey, fetchFn, tried);
        if (!fallbackModel || tried.has(fallbackModel)) break;
        tried.add(fallbackModel);
        currentModel = fallbackModel;
        response = await post({ ...payload, model: fallbackModel });
        if (response.ok) return { response, resolvedModel: fallbackModel, errorText: "" };
        errorText = await response.text().catch(() => "");
      }
      return { response, resolvedModel: tried.size > 1 ? currentModel : null, errorText };
    }
  };

  // src/background/StreamKeepalive.js
  var StreamKeepalive = class {
    /**
     * Starts periodic Service Worker wakeups + port keepalive heartbeats.
     * @param {Object} options
     * @param {Function} options.postMessageSafe
     * @param {Function} options.isAborted
     * @param {number} [options.intervalMs=10000]
     * @returns {{ emit: (msg: Object) => void, stop: () => void }}
     */
    static start({ postMessageSafe, isAborted, intervalMs = 1e4 }) {
      let hasStreamData = false;
      const startMs = Date.now();
      const timer = setInterval(() => {
        if (isAborted()) return;
        try {
          if (typeof chrome !== "undefined" && chrome.runtime?.getPlatformInfo) {
            chrome.runtime.getPlatformInfo(() => {
            });
          }
        } catch (_) {
        }
        postMessageSafe({
          type: "KEEPALIVE",
          elapsedSec: Math.max(1, Math.round((Date.now() - startMs) / 1e3)),
          waitingForModel: !hasStreamData
        });
      }, intervalMs);
      if (typeof timer?.unref === "function") timer.unref();
      return {
        emit(msg) {
          if (msg?.type === "CHUNK") hasStreamData = true;
          postMessageSafe(msg);
        },
        stop() {
          clearInterval(timer);
        }
      };
    }
  };

  // src/background/MultimodalMessageFormatter.js
  var MultimodalMessageFormatter = class {
    /**
     * Parses a base64 data URL into media type and raw base64 payload.
     * @param {string} dataUrl
     * @returns {{ mimeType: string, base64: string } | null}
     */
    static parseDataUrl(dataUrl) {
      if (typeof dataUrl !== "string") return null;
      const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
      if (!match) return null;
      return { mimeType: match[1], base64: match[2] };
    }
    /**
     * Appends attached text file contents cleanly to a message's text prompt.
     * @param {Object} msg
     * @returns {string}
     */
    static buildCombinedText(msg) {
      const baseText = typeof msg?.content === "string" ? msg.content : "";
      const files = Array.isArray(msg?.files) ? msg.files : [];
      if (files.length === 0) return baseText;
      const fileBlocks = files.filter((f) => f && f.name && typeof f.textContent === "string").map((f) => `[Attached file: ${f.name}]
\`\`\`
${f.textContent}
\`\`\``);
      if (fileBlocks.length === 0) return baseText;
      return [baseText, ...fileBlocks].filter(Boolean).join("\n\n");
    }
    /**
     * Formats messages for OpenAI-compatible, Claude, or native Ollama /api/chat.
     * @param {Array<Object>} messages
     * @param {'openai'|'claude'|'ollama'} [format='openai']
     * @returns {Array<Object>}
     */
    static formatMessages(messages = [], format = "openai") {
      if (!Array.isArray(messages)) return [];
      return messages.map((msg) => this._formatSingle(msg, format));
    }
    /**
     * @param {Object} msg
     * @param {'openai'|'claude'|'ollama'} format
     * @returns {Object}
     */
    static _formatSingle(msg, format) {
      if (!msg || typeof msg !== "object") return msg;
      const text = this.buildCombinedText(msg);
      const images = Array.isArray(msg.images) ? msg.images.filter((i) => i?.dataUrl) : [];
      if (images.length === 0) {
        return { role: msg.role, content: text };
      }
      if (format === "ollama") {
        const rawImages = images.map((img) => this.parseDataUrl(img.dataUrl)?.base64).filter(Boolean);
        return rawImages.length > 0 ? { role: msg.role, content: text, images: rawImages } : { role: msg.role, content: text };
      }
      if (format === "claude") {
        const blocks = [];
        for (const img of images) {
          const parsed = this.parseDataUrl(img.dataUrl);
          if (parsed) {
            blocks.push({
              type: "image",
              source: { type: "base64", media_type: parsed.mimeType, data: parsed.base64 }
            });
          }
        }
        if (text) blocks.push({ type: "text", text });
        return { role: msg.role, content: blocks };
      }
      const parts = [];
      if (text) parts.push({ type: "text", text });
      for (const img of images) {
        parts.push({ type: "image_url", image_url: { url: img.dataUrl } });
      }
      return { role: msg.role, content: parts };
    }
  };

  // src/background/LocalContextManager.js
  var LocalContextManager = class _LocalContextManager {
    static isCloudHosted(provider = "", model = "", serverUrl = "") {
      const prov = String(provider || "").toLowerCase();
      if (prov !== "lmstudio" && prov !== "ollama") return true;
      const cleanModel = String(model || "").trim();
      const cleanUrl = String(serverUrl || "").trim();
      return /(?:^|[:\-])cloud$/i.test(cleanModel) || /ollama\.com/i.test(cleanUrl);
    }
    /**
     * Parses a user context length preference ('auto' or positive token count).
     * @param {string|number|null} rawValue
     * @returns {number|null}
     */
    static parseContextLength(rawValue) {
      if (!rawValue || rawValue === "auto") return null;
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
    static resolveBaseAndMirror(serverUrl, provider = "lmstudio") {
      const def = provider === "ollama" ? "http://localhost:11434" : "http://127.0.0.1:1234";
      let base = String(serverUrl || def).trim().replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
      const mirror = base.includes("localhost") ? base.replace("localhost", "127.0.0.1") : base.includes("127.0.0.1") ? base.replace("127.0.0.1", "localhost") : null;
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
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        signal?.addEventListener?.("abort", onExtAbort, { once: true });
        const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
        if (typeof timer?.unref === "function") timer.unref();
        try {
          return await fetchFn(`${urlBase}${path}`, { ...options, signal: controller.signal });
        } finally {
          if (timer !== null) clearTimeout(timer);
          signal?.removeEventListener?.("abort", onExtAbort);
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
      apiKey = "",
      contextLength,
      fetchFn = fetch,
      signal = null,
      postProgress = null
    }) {
      const targetCtx = _LocalContextManager.parseContextLength(contextLength);
      if (!targetCtx || !model) return { applied: false, skipped: true };
      const { base, mirror } = _LocalContextManager.resolveBaseAndMirror(serverUrl, "lmstudio");
      const headers = { "Content-Type": "application/json", "Accept": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${String(apiKey).trim()}`;
      let catalogRes;
      let activeBase = base;
      try {
        const out = await _LocalContextManager._fetchWithLoopback(
          "/api/v1/models",
          { method: "GET", headers },
          { base, mirror, timeoutMs: 3e3, signal, fetchFn }
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
      if (!modelEntry) return { applied: false, unsupported: true, reason: "Model not listed in /api/v1/models" };
      const clampedCtx = modelEntry.max_context_length ? Math.min(targetCtx, modelEntry.max_context_length) : targetCtx;
      const instances = Array.isArray(modelEntry.loaded_instances) ? modelEntry.loaded_instances : [];
      const matching = instances.find((inst) => Math.abs((inst.config?.context_length || 0) - clampedCtx) <= 512);
      if (matching) {
        return { applied: true, alreadyMatched: true, contextLength: matching.config.context_length };
      }
      postProgress?.({ type: "KEEPALIVE", elapsedSec: 1, waitingForModel: true });
      for (const inst of instances) {
        if (!inst?.id) continue;
        await _LocalContextManager._fetchWithLoopback(
          "/api/v1/models/unload",
          { method: "POST", headers, body: JSON.stringify({ instance_id: inst.id }) },
          { base: activeBase, mirror: null, timeoutMs: 5e3, signal, fetchFn }
        ).catch(() => null);
      }
      const loadPayload = {
        model: modelEntry.key || model,
        context_length: clampedCtx,
        flash_attention: true,
        offload_kv_cache_to_gpu: true,
        echo_load_config: true
      };
      const { res: loadRes } = await _LocalContextManager._fetchWithLoopback(
        "/api/v1/models/load",
        { method: "POST", headers, body: JSON.stringify(loadPayload) },
        { base: activeBase, mirror: null, timeoutMs: 0, signal, fetchFn }
      );
      if (!loadRes?.ok) {
        const errTxt = await loadRes?.text?.().catch(() => "") || "";
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
      apiKey = "",
      model,
      messages,
      temperature = 0.3,
      maxTokens = "auto",
      contextLength,
      signal = null,
      safePost = null,
      port = null,
      fetchFn = fetch
    }) {
      const targetCtx = _LocalContextManager.parseContextLength(contextLength);
      const { base, mirror } = _LocalContextManager.resolveBaseAndMirror(serverUrl, "ollama");
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${String(apiKey).trim()}`;
      const parsedTemp = parseFloat(temperature);
      const options = { temperature: !isNaN(parsedTemp) ? parsedTemp : 0.3 };
      if (targetCtx) options.num_ctx = targetCtx;
      const parsedMax = maxTokens && maxTokens !== "auto" ? parseInt(maxTokens, 10) : NaN;
      if (!isNaN(parsedMax) && parsedMax > 0) options.num_predict = parsedMax;
      const ollamaMessages = MultimodalMessageFormatter.formatMessages(messages, "ollama");
      const { res } = await _LocalContextManager._fetchWithLoopback(
        "/api/chat",
        { method: "POST", headers, body: JSON.stringify({ model, messages: ollamaMessages, stream: true, options }) },
        { base, mirror, timeoutMs: 0, signal, fetchFn }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Erreur OLLAMA (${res.status}) : ${errText || res.statusText}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      const emit = safePost || ((m) => port?.postMessage?.(m));
      let buffer = "";
      const processLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const parsed = JSON.parse(trimmed);
          const content = parsed?.message?.content || "";
          const reasoning = parsed?.message?.thinking || "";
          if (content || reasoning) emit({ type: "CHUNK", content, reasoning, text: content });
        } catch (_) {
        }
      };
      while (true) {
        if (signal?.aborted) {
          try {
            await reader.cancel();
          } catch (_) {
          }
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
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
    static async detectLocalContextDefault({ provider = "lmstudio", serverUrl = "", model = "", apiKey = "", fetchFn = fetch }) {
      const prov = String(provider || "lmstudio").toLowerCase();
      if (_LocalContextManager.isCloudHosted(prov, model, serverUrl)) {
        return { contextLength: null, maxContextLength: null, isLoaded: false, canModifyContext: false, readOnlyReason: "cloud", provider: prov };
      }
      const fallbackCtx = prov === "ollama" ? 4096 : 8192;
      const { base, mirror } = _LocalContextManager.resolveBaseAndMirror(serverUrl, prov);
      const headers = { "Accept": "application/json", "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${String(apiKey).trim()}`;
      try {
        if (prov === "ollama") {
          const psOut = await _LocalContextManager._fetchWithLoopback("/api/ps", { method: "GET", headers }, { base, mirror, timeoutMs: 2500, fetchFn }).catch(() => null);
          const psJson = psOut?.res?.ok ? await psOut.res.json().catch(() => null) : null;
          const running = Array.isArray(psJson?.models) ? psJson.models : [];
          const activeRun = running.find((m) => m.name === model || m.model === model) || running[0];
          if (activeRun?.context_length > 0) {
            return { contextLength: activeRun.context_length, isLoaded: true, canModifyContext: true, readOnlyReason: null, provider: prov };
          }
          if (model) {
            const showOut = await _LocalContextManager._fetchWithLoopback(
              "/api/show",
              { method: "POST", headers, body: JSON.stringify({ model }) },
              { base: psOut?.activeBase || base, mirror: psOut ? null : mirror, timeoutMs: 2500, fetchFn }
            ).catch(() => null);
            const showJson = showOut?.res?.ok ? await showOut.res.json().catch(() => null) : null;
            const ctxMatch = String(showJson?.parameters || "").match(/num_ctx\s+(\d+)/i);
            const maxInfo = Object.entries(showJson?.model_info || {}).find(([k, v]) => k.endsWith(".context_length") && Number.isFinite(v));
            return {
              contextLength: ctxMatch ? parseInt(ctxMatch[1], 10) : fallbackCtx,
              maxContextLength: maxInfo ? maxInfo[1] : null,
              isLoaded: false,
              canModifyContext: true,
              readOnlyReason: null,
              provider: prov
            };
          }
          return { contextLength: fallbackCtx, isLoaded: false, canModifyContext: true, readOnlyReason: null, provider: prov };
        }
        const out = await _LocalContextManager._fetchWithLoopback("/api/v1/models", { method: "GET", headers }, { base, mirror, timeoutMs: 2500, fetchFn });
        if (!out?.res?.ok) {
          const unsupported = Boolean(out?.res && out.res.status >= 400);
          return { contextLength: fallbackCtx, isLoaded: false, canModifyContext: !unsupported, readOnlyReason: unsupported ? "server" : null, provider: prov };
        }
        const json = await out.res.json().catch(() => null);
        const list = Array.isArray(json?.models) ? json.models : [];
        const match = list.find((m) => m.key === model || m.id === model) || list.find((m) => m.type !== "embedding" && m.loaded_instances?.length > 0);
        const loadedCtx = match?.loaded_instances?.[0]?.config?.context_length;
        const maxCtx = match?.max_context_length || null;
        const editable = match?.type !== "embedding";
        const ctxVal = loadedCtx > 0 ? loadedCtx : maxCtx ? Math.min(fallbackCtx, maxCtx) : fallbackCtx;
        return { contextLength: ctxVal, maxContextLength: maxCtx, isLoaded: loadedCtx > 0, canModifyContext: editable, readOnlyReason: editable ? null : "server", provider: prov };
      } catch (_) {
        return { contextLength: fallbackCtx, isLoaded: false, canModifyContext: true, readOnlyReason: null, provider: prov };
      }
    }
  };

  // src/background/StreamRelay.js
  var StreamRelay = class _StreamRelay {
    /**
     * Connects and streams LLM response to client port
     * @param {Object} request
     * @param {chrome.runtime.Port} port
     */
    static async handleStream(request, port) {
      const provider = request.provider || "lmstudio";
      const serverUrl = request.serverUrl || request.serverUrls?.[provider] || "";
      const apiKey = request.apiKey || request.apiKeys?.[provider] || "";
      const {
        model,
        systemPrompt,
        userPrompt,
        messages = null,
        temperature = 0.3,
        maxTokens,
        localContextLength = "auto"
      } = request;
      let isDisconnected = false;
      const abortController = new AbortController();
      const safePost = (msg) => {
        if (isDisconnected) return;
        try {
          port.postMessage(msg);
        } catch (_) {
          isDisconnected = true;
        }
      };
      const keepalive = StreamKeepalive.start({
        postMessageSafe: safePost,
        isAborted: () => isDisconnected || abortController.signal.aborted,
        intervalMs: request.heartbeatIntervalMs || 1e4
      });
      if (port?.onDisconnect?.addListener) {
        port.onDisconnect.addListener(() => {
          isDisconnected = true;
          keepalive.stop();
          try {
            abortController.abort();
          } catch (_) {
          }
        });
      }
      let chatMessages = messages;
      if (!chatMessages) {
        chatMessages = [
          { role: "system", content: systemPrompt || "" },
          { role: "user", content: userPrompt || "" }
        ];
      } else if (systemPrompt && (!chatMessages[0] || chatMessages[0].role !== "system")) {
        chatMessages = [{ role: "system", content: systemPrompt }, ...chatMessages];
      }
      try {
        if (provider === "claude") {
          await this.streamClaude(port, apiKey, model, systemPrompt, chatMessages, temperature, maxTokens, abortController.signal, keepalive.emit);
        } else {
          await this.streamOpenAICompatible(port, provider, serverUrl, apiKey, model, chatMessages, temperature, maxTokens, abortController.signal, keepalive.emit, localContextLength);
        }
        if (provider !== "lmstudio" && provider !== "ollama") {
          chrome?.storage?.local?.set?.({ [`keyVerified_${provider}`]: true });
        }
        keepalive.emit({ type: "DONE" });
      } catch (err) {
        if (isDisconnected || abortController.signal.aborted) return;
        const userFriendlyError = this.formatContextError(err.message || String(err), provider);
        keepalive.emit({ type: "ERROR", error: userFriendlyError });
      } finally {
        keepalive.stop();
      }
    }
    /**
     * Formats token context limit errors with actionable user hints
     */
    static formatContextError(rawError, provider) {
      if (!/(?:context|token|maximum context length|num_ctx|too long)/i.test(rawError || "")) return rawError;
      if (provider === "lmstudio" || provider === "ollama") {
        const toolName = provider === "ollama" ? "Ollama" : "LM Studio";
        const hint = provider === "ollama" ? "r\xE9glez num_ctx \xE0 8192" : "augmentez 'Context Length' \xE0 8192 ou 16384";
        return `D\xE9passement de contexte ${toolName} : La transcription d\xE9passe la m\xE9moire allou\xE9e au mod\xE8le. Dans ${toolName}, ${hint}, ou utilisez Google Gemini (1 million de tokens gratuit). D\xE9tail: ${rawError}`;
      }
      return `D\xE9passement de contexte : Le texte est trop long pour la fen\xEAtre du mod\xE8le (${rawError}).`;
    }
    /**
     * Streams from OpenAI-compatible endpoints (LM Studio, Ollama, Groq, Gemini, DeepSeek, etc.)
     */
    static async streamOpenAICompatible(port, provider, serverUrl, apiKey, model, messages, temperature, maxTokens, signal = null, safePost = null, localContextLength = "auto") {
      let endpoint = "";
      const headers = { "Content-Type": "application/json" };
      if (provider === "lmstudio") {
        let base = (serverUrl || "http://127.0.0.1:1234").trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(base)) base = "http://" + base;
        endpoint = `${base}/v1/chat/completions`;
      } else if (provider === "ollama") {
        let base = (serverUrl || "http://localhost:11434").trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(base)) base = "http://" + base;
        endpoint = `${base}/v1/chat/completions`;
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      } else {
        const config = PROVIDER_CONFIGS[provider];
        if (!config) throw new Error(`Fournisseur ${provider} non support\xE9`);
        if (!apiKey) throw new Error(`Cl\xE9 API manquante pour ${config.name}`);
        endpoint = config.endpoint;
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
        if (provider === "openrouter") {
          headers["HTTP-Referer"] = "https://youtube.com";
          headers["X-Title"] = "YouTube AI Summarizer";
        }
      }
      const parsedTemp = parseFloat(temperature);
      let effectiveModel = (model || "").trim();
      if (!effectiveModel || effectiveModel === "default" || effectiveModel.toLowerCase() === "loading...") {
        if (provider === "lmstudio" || provider === "ollama") {
          const base = (serverUrl || (provider === "ollama" ? "http://localhost:11434" : "http://127.0.0.1:1234")).trim().replace(/\/+$/, "");
          const cleanBase = !/^https?:\/\//i.test(base) ? `http://${base}` : base;
          try {
            const mRes = await fetch(`${cleanBase}/v1/models`, { headers: { "Accept": "application/json" } });
            if (mRes.ok) {
              const mJson = await mRes.json();
              const list = Array.isArray(mJson?.data) ? mJson.data : Array.isArray(mJson?.models) ? mJson.models : [];
              const found = list.find((m) => {
                const id = m.id || m.name || "";
                return id && !id.toLowerCase().includes("embed");
              });
              if (found) effectiveModel = found.id || found.name;
            }
          } catch (_) {
          }
        }
      }
      if (!effectiveModel) {
        if (provider === "lmstudio") {
          throw new Error("Aucun mod\xE8le n'est charg\xE9 ou s\xE9lectionn\xE9 dans LM Studio. Veuillez d\xE9marrer un mod\xE8le dans LM Studio.");
        }
        throw new Error(`Aucun mod\xE8le s\xE9lectionn\xE9 pour ${provider.toUpperCase()}.`);
      }
      effectiveModel = resolveDeprecatedModel(provider, effectiveModel);
      if (provider === "lmstudio") {
        await LocalContextManager.ensureLmStudioContext({ serverUrl, model: effectiveModel, apiKey, contextLength: localContextLength, signal, postProgress: safePost });
      } else if (provider === "ollama" && !LocalContextManager.isCloudHosted(provider, effectiveModel, serverUrl) && LocalContextManager.parseContextLength(localContextLength)) {
        return LocalContextManager.streamOllamaChat({ serverUrl, apiKey, model: effectiveModel, messages, temperature, maxTokens, contextLength: localContextLength, signal, safePost, port });
      }
      const bodyPayload = {
        model: effectiveModel,
        messages: MultimodalMessageFormatter.formatMessages(messages, "openai"),
        temperature: !isNaN(parsedTemp) ? parsedTemp : 0.3,
        stream: true
      };
      if (maxTokens && maxTokens !== "auto") {
        const parsedMax = parseInt(maxTokens, 10);
        if (!isNaN(parsedMax) && parsedMax > 0) {
          bodyPayload.max_tokens = parsedMax;
        }
      }
      const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
        endpoint,
        headers,
        payload: bodyPayload,
        signal,
        provider,
        apiKey
      });
      if (resolvedModel && response.ok) {
        const postResolved = safePost || ((m) => port?.postMessage?.(m));
        postResolved({ type: "MODEL_RESOLVED", provider, model: resolvedModel });
        chrome?.storage?.local?.set?.({
          [`selectedModel_${provider}`]: resolvedModel,
          selectedModel: resolvedModel,
          [`keyVerified_${provider}`]: true
        });
      }
      if (!response.ok) {
        const msg = provider === "lmstudio" || provider === "ollama" ? `Erreur ${provider.toUpperCase()} (${response.status}) : ${errorText || response.statusText}` : CloudModelDiscovery.formatHttpError(provider, response.status, errorText || response.statusText);
        throw new Error(msg);
      }
      await _StreamRelay._consumeSseStream(response, signal, safePost, port, (parsed) => {
        const delta = parsed.choices?.[0]?.delta || {};
        return { content: delta.content || "", reasoning: delta.reasoning_content || "", text: delta.content || "" };
      });
    }
    /**
     * Streams from Anthropic Claude API (/v1/messages)
     */
    static async streamClaude(port, apiKey, model, systemPrompt, messages, temperature, maxTokens, signal = null, safePost = null) {
      if (!apiKey) throw new Error("Cl\xE9 API Claude requise");
      const claudeMessages = MultimodalMessageFormatter.formatMessages(
        messages.filter((m) => m.role !== "system"),
        "claude"
      );
      const systemContent = systemPrompt || (messages.find((m) => m.role === "system")?.content || "");
      const parsedTemp = parseFloat(temperature);
      const parsedMax = parseInt(maxTokens, 10);
      const bodyPayload = {
        model: resolveDeprecatedModel("claude", model) || PROVIDER_CONFIGS.claude.defaultModel,
        max_tokens: !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 4096,
        system: systemContent,
        messages: claudeMessages,
        stream: true
      };
      if (!isNaN(parsedTemp)) {
        bodyPayload.temperature = Math.max(0, Math.min(parsedTemp, 1));
      }
      const headers = {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      };
      const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
        endpoint: PROVIDER_CONFIGS.claude.endpoint,
        headers,
        payload: bodyPayload,
        signal,
        provider: "claude",
        apiKey: apiKey.trim()
      });
      if (resolvedModel && response.ok) {
        const postResolved = safePost || ((m) => port?.postMessage?.(m));
        postResolved({ type: "MODEL_RESOLVED", provider: "claude", model: resolvedModel });
        chrome?.storage?.local?.set?.({
          selectedModel_claude: resolvedModel,
          selectedModel: resolvedModel,
          keyVerified_claude: true
        });
      }
      if (!response.ok) {
        throw new Error(CloudModelDiscovery.formatHttpError("claude", response.status, errorText || response.statusText));
      }
      await _StreamRelay._consumeSseStream(response, signal, safePost, port, (parsed) => {
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          return { content: parsed.delta.text, reasoning: "", text: parsed.delta.text };
        }
        return null;
      });
    }
    /**
     * Shared Server-Sent Events (SSE) stream reader for OpenAI-compatible and Claude streams
     */
    static async _consumeSseStream(response, signal, safePost, port, extractChunk) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      const emit = safePost || ((m) => port.postMessage(m));
      while (true) {
        if (signal?.aborted) {
          try {
            await reader.cancel();
          } catch (_) {
          }
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]" || !trimmed.startsWith("data: ")) continue;
          try {
            const chunk = extractChunk(JSON.parse(trimmed.slice(6)));
            if (chunk) emit({ type: "CHUNK", ...chunk });
          } catch (_) {
          }
        }
      }
    }
  };

  // src/services/interfaces/IAIProvider.js
  var IAIProvider = class {
    /**
     * Returns provider unique identifier
     * @returns {string}
     */
    getProviderId() {
      throw new Error("Not implemented");
    }
    /**
     * Returns display name
     * @returns {string}
     */
    getDisplayName() {
      throw new Error("Not implemented");
    }
    /**
     * Returns whether provider runs locally or in the cloud
     * @returns {boolean}
     */
    isLocal() {
      throw new Error("Not implemented");
    }
    /**
     * Fetches list of available models
     * @param {string} [serverUrl]
     * @param {string} [apiKey]
     * @returns {Promise<Array<{ id: string, name?: string }>>}
     */
    async fetchModels(serverUrl, apiKey) {
      throw new Error("Not implemented");
    }
    /**
     * Tests connectivity to provider
     * @param {string} [serverUrl]
     * @param {string} [apiKey]
     * @param {string} [model]
     * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
     */
    async testConnection(serverUrl, apiKey, model) {
      throw new Error("Not implemented");
    }
  };

  // src/services/ai/providers/BaseAIProvider.js
  var BaseAIProvider = class extends IAIProvider {
    /**
     * @param {string} id
     * @param {string} displayName
     * @param {boolean} isLocalProvider
     * @param {string} [endpoint='']
     */
    constructor(id, displayName, isLocalProvider = false, endpoint = "") {
      super();
      this.id = id;
      this.displayName = displayName;
      this.isLocalProvider = isLocalProvider;
      this.endpoint = endpoint || PROVIDER_CONFIGS[String(id || "").toLowerCase()]?.endpoint || "";
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
    async fetchModels(_serverUrl = "", apiKey = "") {
      if (this.isLocalProvider) return [];
      const boundFetch = (url, opts) => this.fetchWithTimeout(url, opts, 5e3);
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
      if (!apiKey) return { ok: false, error: "API Key missing" };
      if (!this.endpoint) return { ok: false, error: `Unsupported provider: ${this.id}` };
      const cleanKey = String(apiKey).trim();
      const effectiveModel = resolveDeprecatedModel(this.id, model);
      const boundFetch = (url, opts) => this.fetchWithTimeout(url, opts, 5e3);
      const start = performance.now();
      try {
        const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
          endpoint: this.endpoint,
          headers: {
            "Authorization": `Bearer ${cleanKey}`,
            "Content-Type": "application/json"
          },
          payload: {
            model: effectiveModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          },
          provider: this.id,
          apiKey: cleanKey,
          fetchFn: boundFetch
        });
        const latencyMs = Math.round(performance.now() - start);
        const finalResolved = resolvedModel || (effectiveModel !== String(model || "").trim() ? effectiveModel : void 0);
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
    async fetchWithTimeout(url, options = {}, timeoutMs = 5e3) {
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
    normalizeUrl(url, defaultUrl = "") {
      let clean = (url || defaultUrl || "").trim().replace(/\/+$/, "");
      if (!clean) return defaultUrl || "";
      if (!/^https?:\/\//i.test(clean)) {
        clean = "http://" + clean;
      }
      return clean;
    }
  };

  // src/config/ExtensionConstants.js
  var DEFAULT_URLS = {
    LMSTUDIO: "http://localhost:1234",
    OLLAMA: "http://localhost:11434"
  };
  function parseChannelVideoCount(rawValue) {
    if (typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0) {
      return Math.floor(rawValue);
    }
    if (!rawValue || typeof rawValue !== "string") return null;
    const match = rawValue.match(/([\d\s\u00a0\u202f.,]+)\s*([km])?\b/i);
    if (!match || !match[1]) return null;
    const rawNum = match[1].trim();
    const suffix = (match[2] || "").toLowerCase();
    if (suffix === "k" || suffix === "m") {
      const floatVal = parseFloat(rawNum.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
      if (Number.isNaN(floatVal) || floatVal <= 0) return null;
      return Math.round(floatVal * (suffix === "k" ? 1e3 : 1e6));
    }
    const intVal = parseInt(rawNum.replace(/[^\d]/g, ""), 10);
    return !Number.isNaN(intVal) && intVal > 0 ? intVal : null;
  }

  // src/config/ModelCapabilities.js
  var TEXT_ONLY_RE = /(?:embed|whisper|tts|codellama|starcoder|qwen[\d.]*-coder|deepseek-(?:r1|chat|coder|v2|v3)|sqlcoder)/i;
  var MULTIMODAL_MODEL_RE = new RegExp([
    "vision",
    "-vl(?:$|[-_:\\s])",
    "multimodal",
    "llava",
    "bakllava",
    "moondream",
    "minicpm-?v",
    "internvl",
    "molmo",
    "smolvlm",
    "pixtral",
    "paligemma",
    "phi-?3\\.5-?vision",
    "phi-?4-?multimodal",
    "kimi-?vl",
    "glm-?4v",
    // Natively multimodal families without "vision" in their model ID
    "qwen3\\.[589]",
    "qwen3-?vl",
    "qwen2\\.5-?vl",
    "qwen2-?vl",
    "qwen-?vl",
    "gemma-?3(?!n)",
    "gemma3",
    "llama-?4",
    "llama4",
    "gpt-?4o",
    "gpt-?4\\.1",
    "gpt-?4\\.5",
    "gpt-?5",
    "(?:^|[/:_-])o[134](?:$|[-_:\\s])",
    "claude-?3",
    "claude-?(?:sonnet|opus|haiku)-?4",
    "gemini-?1\\.5",
    "gemini-?2",
    "gemini-?3",
    "mistral-?small-?3",
    "magistral",
    "grok-?3",
    "grok-?4"
  ].join("|"), "i");
  var ModelCapabilities = class {
    /**
     * Determines whether the model accepts image attachments.
     * @param {string} provider
     * @param {string} modelId
     * @param {Object|null} [meta=null] Optional server-reported metadata ({ type, capabilities, architecture, supportsImages })
     * @returns {boolean}
     */
    static supportsImages(provider, modelId, meta = null) {
      if (meta && typeof meta === "object") {
        if (typeof meta.supportsImages === "boolean") return meta.supportsImages;
        if (String(meta.type || "").toLowerCase() === "vlm") return true;
        if (Array.isArray(meta.capabilities)) {
          const caps = meta.capabilities.map((c) => String(c).toLowerCase());
          if (caps.includes("vision") || caps.includes("image") || caps.includes("multimodal")) return true;
        }
        const modality = String(meta.architecture?.modality || meta.modality || "").toLowerCase();
        if (modality.includes("image")) return true;
      }
      const id = String(modelId || "").trim();
      if (!id) return false;
      if (TEXT_ONLY_RE.test(id)) return false;
      return MULTIMODAL_MODEL_RE.test(id);
    }
    /**
     * Extracts normalized capability metadata from a raw LM Studio / Ollama / OpenRouter model entry.
     * @param {Object} rawModel
     * @returns {{ supportsImages: boolean } | null}
     */
    static extractMeta(rawModel) {
      if (!rawModel || typeof rawModel !== "object") return null;
      const type = String(rawModel.type || "").toLowerCase();
      const caps = Array.isArray(rawModel.capabilities) ? rawModel.capabilities.map((c) => String(c).toLowerCase()) : [];
      const modality = String(rawModel.architecture?.modality || rawModel.modality || "").toLowerCase();
      if (type === "vlm" || caps.includes("vision") || caps.includes("image") || caps.includes("multimodal") || modality.includes("image")) {
        return { supportsImages: true };
      }
      if (type === "llm" && caps.length > 0 && !caps.includes("vision")) {
        return { supportsImages: false };
      }
      return null;
    }
  };

  // src/services/ai/providers/LMStudioProvider.js
  var LMStudioProvider = class extends BaseAIProvider {
    constructor() {
      super("lmstudio", "LM Studio", true);
    }
    /**
     * Fetches models from LM Studio /v1/models with automatic loopback mirror (localhost <-> 127.0.0.1)
     * @param {string} [serverUrl]
     * @returns {Promise<Array<{ id: string, name?: string }>>}
     */
    async _fetchModelsAtBase(base) {
      const res = await this.fetchWithTimeout(`${base}/v1/models`, {}, 2e3);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.data || []).map((m) => ({ id: m.id, name: m.id }));
    }
    async enrichCapabilities(models, serverUrl = DEFAULT_URLS.LMSTUDIO) {
      if (!Array.isArray(models) || models.length === 0) return models;
      const cleanUrl = this.normalizeUrl(serverUrl, DEFAULT_URLS.LMSTUDIO);
      try {
        const v0 = await this.fetchWithTimeout(`${cleanUrl}/api/v0/models`, {}, 1e3);
        if (v0?.ok) {
          const j0 = await v0.json();
          if (Array.isArray(j0?.data)) {
            const metaById = new Map(j0.data.map((m) => [m.id, ModelCapabilities.extractMeta(m)]));
            return models.map((m) => ({ ...m, ...metaById.get(m.id) || {} }));
          }
        }
      } catch (_) {
      }
      return models;
    }
    async fetchModels(serverUrl = DEFAULT_URLS.LMSTUDIO) {
      const cleanUrl = this.normalizeUrl(serverUrl, DEFAULT_URLS.LMSTUDIO);
      try {
        return await this._fetchModelsAtBase(cleanUrl);
      } catch (primaryErr) {
        const altUrl = cleanUrl.includes("127.0.0.1") ? cleanUrl.replace("127.0.0.1", "localhost") : cleanUrl.includes("localhost") ? cleanUrl.replace("localhost", "127.0.0.1") : null;
        if (altUrl) {
          try {
            return await this._fetchModelsAtBase(altUrl);
          } catch (_) {
          }
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
        const altUrl = cleanUrl.includes("127.0.0.1") ? cleanUrl.replace("127.0.0.1", "localhost") : cleanUrl.includes("localhost") ? cleanUrl.replace("localhost", "127.0.0.1") : null;
        if (altUrl) {
          try {
            const res2 = await this.fetchWithTimeout(`${altUrl}/v1/models`, {}, 2500);
            if (res2.ok) {
              return { ok: true, latencyMs: Math.round(performance.now() - start), resolvedUrl: altUrl };
            }
          } catch (_) {
          }
        }
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/OllamaProvider.js
  var OllamaProvider = class extends BaseAIProvider {
    constructor() {
      super("ollama", "Ollama", true);
    }
    /**
     * Fetches models from Ollama /api/tags or /v1/models
     * @param {string} serverUrl
     * @returns {Promise<Array<{ id: string, name?: string }>>}
     */
    async fetchModels(serverUrl = "http://localhost:11434") {
      const cleanUrl = this.normalizeUrl(serverUrl, "http://localhost:11434");
      try {
        const res = await this.fetchWithTimeout(`${cleanUrl}/api/tags`);
        if (res.ok) {
          const json = await res.json();
          return (json.models || []).map((m) => ({ id: m.name || m.model, name: m.name || m.model }));
        }
      } catch {
      }
      const res2 = await this.fetchWithTimeout(`${cleanUrl}/v1/models`);
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      const json2 = await res2.json();
      return (json2.data || []).map((m) => ({ id: m.id, name: m.id }));
    }
    /**
     * Tests connection and latency
     * @param {string} serverUrl
     * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
     */
    async testConnection(serverUrl = "http://localhost:11434") {
      const start = performance.now();
      try {
        const cleanUrl = this.normalizeUrl(serverUrl, "http://localhost:11434");
        const res = await this.fetchWithTimeout(`${cleanUrl}/api/tags`, {}, 3e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/GeminiProvider.js
  var GeminiProvider = class extends BaseAIProvider {
    constructor() {
      super("gemini", "Google Gemini", false, PROVIDER_CONFIGS.gemini.endpoint);
    }
  };

  // src/services/ai/providers/GroqProvider.js
  var GroqProvider = class extends BaseAIProvider {
    constructor() {
      super("groq", "Groq (Ultra-Fast)", false, PROVIDER_CONFIGS.groq.endpoint);
    }
  };

  // src/services/ai/providers/OpenAIProvider.js
  var OpenAIProvider = class extends BaseAIProvider {
    constructor() {
      super("openai", "OpenAI", false, PROVIDER_CONFIGS.openai.endpoint);
    }
  };

  // src/services/ai/providers/ClaudeProvider.js
  var ClaudeProvider = class extends BaseAIProvider {
    constructor() {
      super("claude", "Anthropic Claude", false, PROVIDER_CONFIGS.claude.endpoint);
    }
    async testConnection(_serverUrl, apiKey, model = PROVIDER_CONFIGS.claude.defaultModel) {
      if (!apiKey) return { ok: false, error: "API Key missing" };
      const cleanKey = String(apiKey).trim();
      const effectiveModel = resolveDeprecatedModel("claude", model);
      const boundFetch = (url, opts) => this.fetchWithTimeout(url, opts, 5e3);
      const start = performance.now();
      try {
        const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
          endpoint: this.endpoint,
          headers: {
            "x-api-key": cleanKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          payload: {
            model: effectiveModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          },
          provider: "claude",
          apiKey: cleanKey,
          fetchFn: boundFetch
        });
        const latencyMs = Math.round(performance.now() - start);
        const finalResolved = resolvedModel || (effectiveModel !== String(model || "").trim() ? effectiveModel : void 0);
        if (response.ok) {
          return finalResolved ? { ok: true, latencyMs, resolvedModel: finalResolved } : { ok: true, latencyMs };
        }
        const errorKind = CloudModelDiscovery.classifyHttpError(response.status, errorText);
        return { ok: false, latencyMs, errorKind, error: CloudModelDiscovery.formatHttpError("claude", response.status, errorText) };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/DeepSeekProvider.js
  var DeepSeekProvider = class extends BaseAIProvider {
    constructor() {
      super("deepseek", "DeepSeek", false, PROVIDER_CONFIGS.deepseek.endpoint);
    }
  };

  // src/services/ai/providers/AIProviderFactory.js
  var AIProviderFactory = class {
    static instances = /* @__PURE__ */ new Map();
    /**
     * Retrieves or instantiates provider strategy by ID
     * @param {string} providerId
     * @returns {BaseAIProvider}
     */
    static getProvider(providerId = "lmstudio") {
      const id = providerId.toLowerCase();
      if (this.instances.has(id)) {
        return this.instances.get(id);
      }
      let instance;
      switch (id) {
        case "lmstudio":
          instance = new LMStudioProvider();
          break;
        case "ollama":
          instance = new OllamaProvider();
          break;
        case "gemini":
          instance = new GeminiProvider();
          break;
        case "groq":
          instance = new GroqProvider();
          break;
        case "openai":
          instance = new OpenAIProvider();
          break;
        case "claude":
          instance = new ClaudeProvider();
          break;
        case "deepseek":
          instance = new DeepSeekProvider();
          break;
        default:
          instance = new BaseAIProvider(id, PROVIDER_NAMES[id] || id.toUpperCase(), false);
          break;
      }
      this.instances.set(id, instance);
      return instance;
    }
  };

  // src/background/BackgroundTranscriptFetcher.js
  var BackgroundTranscriptFetcher = class _BackgroundTranscriptFetcher {
    /**
     * Main entry point to fetch transcript/chapters for a given video
     * @param {string} videoId
     * @param {string} [lang='fr']
     * @returns {Promise<{success: boolean, segments?: Array, title?: string, error?: string}>}
     */
    static async fetchTranscript(videoId, lang = "fr") {
      if (!videoId) return { success: false, error: "No videoId provided" };
      let chapterFallback = null;
      try {
        const fastResult = await _BackgroundTranscriptFetcher.fetchDirect(videoId, lang);
        if (fastResult?.segments?.length > 0) {
          if (!fastResult.isChapterOnly) {
            return { success: true, videoId, segments: fastResult.segments, title: fastResult.title, isChapterOnly: false };
          }
          chapterFallback = fastResult;
        }
      } catch (_) {
      }
      if (chrome?.tabs?.create && chrome?.scripting?.executeScript) {
        try {
          const tabResult = await _BackgroundTranscriptFetcher.fetchViaBackgroundTab(videoId, lang);
          if (tabResult?.segments?.length > 0) {
            return { success: true, videoId, segments: tabResult.segments, title: tabResult.title, isChapterOnly: !!tabResult.isChapterOnly };
          }
        } catch (_) {
        }
      }
      if (chapterFallback?.segments?.length > 0) {
        return { success: true, videoId, segments: chapterFallback.segments, title: chapterFallback.title, isChapterOnly: true };
      }
      return { success: false, error: "Unable to extract transcript for video " + videoId };
    }
    static async fetchDirect(videoId, lang = "fr") {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { "Accept-Language": `${lang},en;q=0.8`, "User-Agent": navigator.userAgent || "Mozilla/5.0" },
        credentials: "include"
      });
      if (!res.ok) return null;
      const html = await res.text();
      let title = "";
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, "").trim();
      const timedtextSegments = await _BackgroundTranscriptFetcher.extractTimedtextFromHtml(html, lang);
      if (timedtextSegments?.length > 0) {
        return { title, segments: timedtextSegments, isChapterOnly: false };
      }
      const chapters = _BackgroundTranscriptFetcher.extractChaptersFromHtml(html);
      if (chapters?.length > 0) {
        return { title, segments: chapters, isChapterOnly: true };
      }
      return null;
    }
    static async extractTimedtextFromHtml(html, lang = "fr") {
      const key = '"captionTracks":';
      const pos = html.indexOf(key);
      if (pos === -1) return null;
      const start = html.indexOf("[", pos);
      if (start === -1) return null;
      let depth = 0, end = -1, inStr = false, esc = false;
      for (let i = start; i < html.length; i++) {
        const c = html[i];
        if (esc) {
          esc = false;
          continue;
        }
        if (c === "\\") {
          esc = true;
          continue;
        }
        if (c === '"') {
          inStr = !inStr;
          continue;
        }
        if (!inStr) {
          if (c === "[") depth++;
          else if (c === "]") {
            depth--;
            if (depth === 0) {
              end = i + 1;
              break;
            }
          }
        }
      }
      if (end === -1) return null;
      try {
        const tracks = JSON.parse(html.slice(start, end));
        const track = tracks.find((t) => t.languageCode === lang) || tracks.find((t) => t.languageCode?.startsWith(lang)) || tracks.find((t) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
        if (!track?.baseUrl) return null;
        const ttUrl = track.baseUrl + (track.baseUrl.includes("?") ? "&" : "?") + "fmt=json3";
        const ttRes = await fetch(ttUrl, { credentials: "include" });
        if (!ttRes.ok) return null;
        const raw = await ttRes.text();
        if (!raw || !raw.trim().startsWith("{")) return null;
        const ttJson = JSON.parse(raw);
        const segments = [];
        if (Array.isArray(ttJson.events)) {
          for (const ev of ttJson.events) {
            if (!ev.segs) continue;
            const sec = Math.floor((ev.tStartMs || 0) / 1e3);
            const m = Math.floor(sec / 60);
            const s = (sec % 60).toString().padStart(2, "0");
            const text = ev.segs.map((seg) => seg.utf8 || "").join("").replace(/\s+/g, " ").trim();
            if (text && text !== "\n") segments.push({ timestamp: `${m}:${s}`, text });
          }
        }
        return segments.length > 0 ? segments : null;
      } catch (_) {
        return null;
      }
    }
    static extractChaptersFromHtml(html) {
      const dataKey = "ytInitialData = ";
      const dataPos = html.indexOf(dataKey);
      if (dataPos === -1) return null;
      const end = html.indexOf(";<\/script>", dataPos);
      if (end === -1) return null;
      try {
        const data = JSON.parse(html.slice(dataPos + dataKey.length, end));
        const panels = data.engagementPanels || [];
        const chapters = [];
        for (const p of panels) {
          const list = p.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
          if (Array.isArray(list)) {
            for (const item of list) {
              const r = item.macroMarkersListItemRenderer;
              if (r) {
                const time = r.timeDescription?.simpleText || r.timeDescription?.runs?.[0]?.text;
                const txt = r.title?.simpleText || r.title?.runs?.[0]?.text;
                if (time && txt) chapters.push({ timestamp: time.trim(), text: txt.trim() });
              }
            }
          }
        }
        return chapters.length > 0 ? chapters : null;
      } catch (_) {
        return null;
      }
    }
    static async fetchViaBackgroundTab(videoId, lang = "fr") {
      let tab = null;
      try {
        tab = await chrome.tabs.create({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          active: false
        });
        const results = await new Promise((resolve) => {
          let done = false;
          const timer = setTimeout(() => {
            if (!done) {
              done = true;
              resolve(null);
            }
          }, 12e3);
          const checkTab = async () => {
            if (done) return;
            try {
              const execRes = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: "MAIN",
                func: async () => {
                  const player = document.getElementById("movie_player");
                  try {
                    player?.mute?.();
                    player?.pauseVideo?.();
                  } catch (_) {
                  }
                  const countEl = document.getElementById("ytAiWordCount");
                  const initialCount = parseInt(countEl?.innerText?.replace(/\D/g, "") || "0", 10);
                  if (initialCount > 0) {
                    const lines = Array.from(document.querySelectorAll(".yt-ai-transcript-line") || []);
                    const segments = lines.map((el) => {
                      const m = el.innerText.match(/^\[([^\]]+)\]\s*(.*)$/);
                      return m ? { timestamp: m[1], text: m[2] } : { timestamp: "", text: el.innerText };
                    }).filter((s) => s.text);
                    if (segments.length > 0) {
                      return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments, isChapterOnly: false };
                    }
                  }
                  let nativeBtn = document.querySelector('button[aria-label*="transcription" i], button[aria-label*="transcript" i]');
                  if (!nativeBtn) {
                    const expandBtn = document.querySelector("#expand, tp-yt-paper-button#expand, #description-inline-expander #expand");
                    if (expandBtn) expandBtn.click();
                    await new Promise((r) => setTimeout(r, 250));
                    nativeBtn = document.querySelector('button[aria-label*="transcription" i], button[aria-label*="transcript" i], ytd-video-description-transcript-section-renderer button');
                  }
                  if (nativeBtn) nativeBtn.click();
                  for (let retry = 0; retry < 12; retry++) {
                    await new Promise((r) => setTimeout(r, 350));
                    const chip = document.querySelector('chip-bar-view-model button[aria-label*="transcription" i], chip-bar-view-model button[aria-label*="transcript" i]') || Array.from(document.querySelectorAll("chip-bar-view-model button")).find((b) => /transcription|transcript/i.test(b.textContent));
                    if (chip && chip.getAttribute("aria-selected") !== "true") chip.click();
                    const modernSegs = document.querySelectorAll("transcript-segment-view-model, ytd-transcript-segment-renderer");
                    if (modernSegs.length > 0) {
                      const segments = Array.from(modernSegs).map((el) => {
                        const timeEl = el.querySelector('.ytTranscriptSegmentViewModelTimestamp, .segment-timestamp, [class*="Timestamp"], [class*="timestamp"]');
                        const textEl = el.querySelector('span[role="text"], .ytAttributedStringInlineHost, span.ytAttributedStringHost, .yt-core-attributed-string, .segment-text, yt-formatted-string');
                        return { timestamp: timeEl?.textContent?.trim() || "", text: textEl?.textContent?.trim() || "" };
                      }).filter((s) => s.text);
                      if (segments.length > 0) {
                        return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments, isChapterOnly: false };
                      }
                    }
                  }
                  const panels = window.ytInitialData?.engagementPanels || [];
                  const chapters = [];
                  for (const p of panels) {
                    const list = p.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
                    if (Array.isArray(list)) {
                      for (const item of list) {
                        const r = item.macroMarkersListItemRenderer;
                        if (r) {
                          const time = r.timeDescription?.simpleText || r.timeDescription?.runs?.[0]?.text;
                          const txt = r.title?.simpleText || r.title?.runs?.[0]?.text;
                          if (time && txt) chapters.push({ timestamp: time.trim(), text: txt.trim() });
                        }
                      }
                    }
                  }
                  if (chapters.length > 0) {
                    return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments: chapters, isChapterOnly: true };
                  }
                  const domMarkers = Array.from(document.querySelectorAll("ytd-macro-markers-list-item-renderer, macro-markers-panel-item-view-model"));
                  if (domMarkers.length > 0) {
                    const domChapters = domMarkers.map((el) => {
                      const timeEl = el.querySelector('#time, [class*="time"]');
                      const titleEl = el.querySelector("h3:not([hidden]), h4:not([hidden]), #title:not([hidden])");
                      return { timestamp: timeEl?.textContent?.trim() || "", text: titleEl?.textContent?.trim() || "" };
                    }).filter((c) => c.timestamp && c.text);
                    if (domChapters.length > 0) {
                      return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments: domChapters, isChapterOnly: true };
                    }
                  }
                  return null;
                }
              });
              const data = execRes?.[0]?.result;
              if (data?.segments?.length > 0) {
                if (!done) {
                  done = true;
                  clearTimeout(timer);
                  resolve(data);
                }
              } else {
                setTimeout(checkTab, 600);
              }
            } catch (_) {
              setTimeout(checkTab, 600);
            }
          };
          setTimeout(checkTab, 1500);
        });
        return results;
      } finally {
        if (tab?.id) {
          try {
            await chrome.tabs.remove(tab.id);
          } catch (_) {
          }
        }
      }
    }
  };

  // src/parsers/ChannelPageParser.js
  var CHANNEL_SUBPATHS_RE = /\/(?:videos|shorts|streams|live|playlists|community|posts|channels|about|featured|search|content|editing|analytics|monetization)(?:\/.*)?$/i;
  var ChannelPageParser = class _ChannelPageParser {
    /**
     * Normalizes any YouTube / Studio URL or relative path to a canonical channel path
     * (/@handle, /channel/UC..., /c/Name, /user/Name), stripping tab/studio suffixes.
     * @param {string} rawHref
     * @returns {string}
     */
    static sanitizeChannelPath(rawHref = "") {
      if (!rawHref || typeof rawHref !== "string") return "";
      const trimmed = rawHref.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("@")) {
        const handle = trimmed.split(/[/?#]/)[0];
        return handle.length > 1 ? `/${handle}` : "";
      }
      let pathname = "";
      try {
        if (/^https?:\/\//i.test(trimmed)) {
          const u = new URL(trimmed);
          if (!u.hostname.endsWith("youtube.com")) return "";
          pathname = u.pathname || "";
        } else if (trimmed.startsWith("/")) {
          pathname = new URL(trimmed, "https://www.youtube.com").pathname || "";
        }
      } catch (_) {
        return "";
      }
      if (!pathname) return "";
      const handleMatch = pathname.match(/^\/(@[^/?#]+)/);
      if (handleMatch) return `/${handleMatch[1]}`;
      const idMatch = pathname.match(/^\/(channel|c|user)\/([^/?#]+)/i);
      if (idMatch) {
        const cleaned = pathname.replace(CHANNEL_SUBPATHS_RE, "").replace(/\/+$/, "");
        const canonicalMatch = cleaned.match(/^\/(channel|c|user)\/([^/?#]+)/i);
        return canonicalMatch ? `/${canonicalMatch[1].toLowerCase()}/${canonicalMatch[2]}` : `/${idMatch[1].toLowerCase()}/${idMatch[2]}`;
      }
      return "";
    }
    /**
     * Extracts balanced JSON object for ytInitialData from channel HTML across script formats
     * @param {string} html
     * @returns {Object|null}
     */
    static extractBalancedInitialData(html) {
      if (!html || typeof html !== "string") return null;
      const markers = ["var ytInitialData =", 'window["ytInitialData"] =', "ytInitialData ="];
      for (const marker of markers) {
        let idx = html.indexOf(marker);
        while (idx !== -1) {
          const braceStart = html.indexOf("{", idx + marker.length);
          if (braceStart !== -1 && braceStart - (idx + marker.length) < 32) {
            const parsed = _ChannelPageParser._parseBalancedJsonAt(html, braceStart);
            if (parsed) return parsed;
          }
          idx = html.indexOf(marker, idx + marker.length);
        }
      }
      const regexMatch = html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/s);
      if (regexMatch) {
        try {
          return JSON.parse(regexMatch[1]);
        } catch (_) {
        }
      }
      return null;
    }
    static _parseBalancedJsonAt(str, start) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < str.length; i++) {
        const c = str[i];
        if (esc) {
          esc = false;
          continue;
        }
        if (c === "\\") {
          esc = true;
          continue;
        }
        if (c === '"') {
          inStr = !inStr;
          continue;
        }
        if (!inStr) {
          if (c === "{") depth++;
          else if (c === "}") {
            depth--;
            if (depth === 0) {
              try {
                return JSON.parse(str.slice(start, i + 1));
              } catch (_) {
                return null;
              }
            }
          }
        }
      }
      return null;
    }
    /**
     * Parses channel header metadata across pageHeaderRenderer, c4TabbedHeaderRenderer, and channelMetadataRenderer
     * @param {Object} data
     * @param {string} canonicalPath
     * @returns {{ title: string, handle: string, subscribers: string, videoCount: string, bio: string }}
     */
    static parseHeader(data, canonicalPath = "") {
      const pageHeader = data?.header?.pageHeaderRenderer;
      const c4Header = data?.header?.c4TabbedHeaderRenderer;
      const metaRenderer = data?.metadata?.channelMetadataRenderer;
      const micro = data?.microformat?.microformatDataRenderer;
      let title = pageHeader?.pageTitle || c4Header?.title || metaRenderer?.title || micro?.title || "";
      let bio = pageHeader?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content || metaRenderer?.description || micro?.description || "";
      let handle = canonicalPath.replace(/^\//, "").replace(CHANNEL_SUBPATHS_RE, "");
      if (metaRenderer?.vanityChannelUrl) {
        const vanityPath = _ChannelPageParser.sanitizeChannelPath(metaRenderer.vanityChannelUrl);
        if (vanityPath.startsWith("/@")) handle = vanityPath.slice(1);
      }
      let subscribers = c4Header?.subscriberCountText?.simpleText || "";
      let videoCount = c4Header?.videosCountText?.runs?.map((r) => r.text).join("") || c4Header?.videosCountText?.simpleText || "";
      const metadataRows = pageHeader?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      for (const row of metadataRows) {
        for (const part of row.metadataParts || []) {
          const text = part.text?.content || "";
          if (text.startsWith("@")) handle = text;
          else if (/abonn[ée]|subscriber/i.test(text)) subscribers = text;
          else if (/vid[ée]o/i.test(text)) videoCount = text;
        }
      }
      return { title, handle, subscribers, videoCount, bio };
    }
    /**
     * Locates grid items array across richGridRenderer, sectionListRenderer, mobile singleColumn, and reel/grid tabs
     * @param {Object} data
     * @returns {Array<Object>}
     */
    static findGridContents(data) {
      const twoColTabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const oneColTabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
      const tabs = [...twoColTabs, ...oneColTabs];
      for (const t of tabs) {
        const rich = t.tabRenderer?.content?.richGridRenderer?.contents;
        if (Array.isArray(rich) && rich.length > 0) return rich;
      }
      for (const t of tabs) {
        const secList = t.tabRenderer?.content?.sectionListRenderer?.contents || [];
        const flattened = [];
        for (const sec of secList) {
          for (const item of sec?.itemSectionRenderer?.contents || []) {
            if (item?.gridRenderer?.items) flattened.push(...item.gridRenderer.items);
            else if (item?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items) flattened.push(...item.shelfRenderer.content.expandedShelfContentsRenderer.items);
            else if (item?.shelfRenderer?.content?.horizontalListRenderer?.items) flattened.push(...item.shelfRenderer.content.horizontalListRenderer.items);
            else if (item?.reelShelfRenderer?.items) flattened.push(...item.reelShelfRenderer.items);
            else flattened.push(item);
          }
          if (sec?.continuationItemRenderer) flattened.push(sec);
        }
        if (flattened.length > 0) return flattened;
      }
      return [];
    }
    /**
     * Verifies that parsed ytInitialData actually depicts a channel Shorts tab rather than a Home fallback redirect.
     * @param {Object} data
     * @returns {boolean}
     */
    static isShortsTabData(data) {
      const twoColTabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const oneColTabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
      const selectedTab = [...twoColTabs, ...oneColTabs].find((t) => t?.tabRenderer?.selected)?.tabRenderer;
      const tabUrl = selectedTab?.endpoint?.commandMetadata?.webCommandMetadata?.url || "";
      const tabTitle = selectedTab?.title || "";
      if (tabUrl.endsWith("/shorts") || /^shorts$/i.test(tabTitle)) return true;
      const items = this.findGridContents(data);
      return items.some((it) => Boolean(
        it?.richItemRenderer?.content?.shortsLockupViewModel || it?.shortsLockupViewModel || it?.richItemRenderer?.content?.reelItemRenderer || it?.reelItemRenderer
      ));
    }
    /**
     * Normalizes modern and legacy YouTube video/short grid renderers into uniform metadata
     * @param {Object} item
     * @param {Object} [options]
     * @returns {{ id: string, title: string, url: string, meta: string, isShort: boolean, contentType: 'short'|'video' }|null}
     */
    static parseGridVideoItem(item, options = {}) {
      const forceShort = Boolean(options.forceShort);
      const lockup = item?.richItemRenderer?.content?.lockupViewModel || item?.lockupViewModel;
      if (lockup) {
        const vId2 = lockup.contentId || "";
        const vTitle2 = lockup.metadata?.lockupMetadataViewModel?.title?.content || "";
        const metaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        const parts2 = metaRows.flatMap((r) => (r.metadataParts || []).map((p) => p.text?.content).filter(Boolean));
        const tapCmd = lockup.rendererContext?.commandContext?.onTap?.innertubeCommand;
        const isShort2 = Boolean(forceShort || tapCmd?.reelWatchEndpoint || tapCmd?.commandMetadata?.webCommandMetadata?.url?.startsWith?.("/shorts/"));
        const url2 = vId2 ? isShort2 ? `https://www.youtube.com/shorts/${vId2}` : `https://www.youtube.com/watch?v=${vId2}` : "";
        return { id: vId2, title: vTitle2, url: url2, meta: parts2.join(" \u2022 "), isShort: isShort2, contentType: isShort2 ? "short" : "video" };
      }
      const shortsLockup = item?.richItemRenderer?.content?.shortsLockupViewModel || item?.shortsLockupViewModel;
      if (shortsLockup) {
        const vId2 = shortsLockup.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || String(shortsLockup.entityId || "").replace(/^shorts-lockup-/, "") || "";
        const vTitle2 = shortsLockup.overlayMetadata?.primaryText?.content || shortsLockup.accessibilityText || "";
        const views = shortsLockup.overlayMetadata?.secondaryText?.content || "";
        if (!vId2) return null;
        return { id: vId2, title: vTitle2, url: `https://www.youtube.com/shorts/${vId2}`, meta: views, isShort: true, contentType: "short" };
      }
      const reel = item?.richItemRenderer?.content?.reelItemRenderer || item?.reelItemRenderer;
      if (reel) {
        const vId2 = reel.videoId || reel.navigationEndpoint?.reelWatchEndpoint?.videoId || "";
        const vTitle2 = reel.headline?.simpleText || reel.headline?.runs?.map((r) => r.text).join("") || "";
        const views = reel.viewCountText?.simpleText || "";
        if (!vId2) return null;
        return { id: vId2, title: vTitle2, url: `https://www.youtube.com/shorts/${vId2}`, meta: views, isShort: true, contentType: "short" };
      }
      const vr = item?.richItemRenderer?.content?.videoRenderer || item?.gridVideoRenderer || item?.videoRenderer || item?.compactVideoRenderer || item?.playlistVideoRenderer;
      if (!vr) return null;
      const vId = vr.videoId || "";
      const vTitle = vr.title?.runs?.map((r) => r.text).join("") || vr.title?.simpleText || "";
      const parts = [vr.viewCountText?.simpleText, vr.publishedTimeText?.simpleText].filter(Boolean);
      const isShort = Boolean(forceShort || vr.navigationEndpoint?.reelWatchEndpoint || vr.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url?.startsWith?.("/shorts/"));
      const url = vId ? isShort ? `https://www.youtube.com/shorts/${vId}` : `https://www.youtube.com/watch?v=${vId}` : "";
      return { id: vId, title: vTitle, url, meta: parts.join(" \u2022 "), isShort, contentType: isShort ? "short" : "video" };
    }
    static computeTotalVideos(videoCountStr, fallbackCount) {
      return parseChannelVideoCount(videoCountStr) || fallbackCount || null;
    }
  };

  // src/domain/services/ChannelFormatAnalyzer.js
  var ChannelFormatAnalyzer = class {
    /**
     * Determines whether a normalized catalog or report item represents a YouTube Short.
     * @param {Object} item
     * @returns {boolean}
     */
    static isShortItem(item = {}) {
      if (!item || typeof item !== "object") return false;
      if (item.isShort === true || item.contentType === "short") return true;
      const url = String(item.url || "");
      return url.includes("/shorts/");
    }
    /**
     * Tags an item consistently with explicit format metadata and normalized URL.
     * @param {Object} item
     * @param {boolean} [forceShort=false]
     * @returns {Object}
     */
    static tagItem(item = {}, forceShort = false) {
      const isShort = Boolean(forceShort || this.isShortItem(item));
      const id = item.id || "";
      const defaultUrl = id ? isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}` : item.url || "";
      return {
        ...item,
        isShort,
        contentType: isShort ? "short" : "video",
        url: isShort && id ? `https://www.youtube.com/shorts/${id}` : item.url || defaultUrl
      };
    }
    /**
     * Merges primary (/videos or root) and Shorts (/shorts) channel catalogs into one balanced list.
     * Preserves format tags, deduplicates IDs (keeping isShort=true if present in /shorts),
     * and interleaves both formats cleanly up to the requested catalog cap.
     * @param {Array<Object>} primaryItems
     * @param {Array<Object>} shortItems
     * @param {number|'all'} [limit=30]
     * @returns {{ videos: Array<Object>, longVideoCount: number, shortsCount: number, hasMixedFormats: boolean }}
     */
    static mergeVideoAndShortCatalogs(primaryItems = [], shortItems = [], limit = 30) {
      const targetLimit = limit === "all" ? 5e3 : Math.max(1, parseInt(limit, 10) || 30);
      const shortsIdSet = new Set((shortItems || []).map((s) => s?.id).filter(Boolean));
      const byId = /* @__PURE__ */ new Map();
      const longPool = [];
      const shortPool = [];
      for (const raw of primaryItems || []) {
        if (!raw) continue;
        const tagged = this.tagItem(raw, shortsIdSet.has(raw.id));
        if (tagged.id && byId.has(tagged.id)) continue;
        if (tagged.id) byId.set(tagged.id, tagged);
        if (tagged.isShort) shortPool.push(tagged);
        else longPool.push(tagged);
      }
      for (const raw of shortItems || []) {
        if (!raw) continue;
        const tagged = this.tagItem(raw, true);
        if (tagged.id && byId.has(tagged.id)) continue;
        if (tagged.id) byId.set(tagged.id, tagged);
        shortPool.push(tagged);
      }
      let merged;
      if (longPool.length > 0 && shortPool.length > 0) {
        const idealShortShare = Math.min(shortPool.length, Math.max(2, Math.round(targetLimit * 0.4)));
        const longShare = Math.min(longPool.length, targetLimit - idealShortShare);
        const shortShare = Math.min(shortPool.length, targetLimit - longShare);
        const selectedLong = longPool.slice(0, longShare);
        const selectedShort = shortPool.slice(0, shortShare);
        merged = [...selectedLong, ...selectedShort];
      } else {
        merged = [...longPool, ...shortPool].slice(0, targetLimit);
      }
      const longVideoCount = merged.filter((v) => !v.isShort).length;
      const shortsCount = merged.filter((v) => v.isShort).length;
      return {
        videos: merged,
        longVideoCount,
        shortsCount,
        hasMixedFormats: longVideoCount > 0 && shortsCount > 0
      };
    }
    /**
     * Combines /videos and /shorts fetched dossiers into one unified channel dossier with format counts.
     * @param {Object|null} primaryDossier
     * @param {Object|null} shortsDossier
     * @param {number|'all'} limit
     * @param {Function} [formatMarkdownFn]
     * @returns {Object|null}
     */
    static mergeDossiers(primaryDossier, shortsDossier, limit = 30, formatMarkdownFn = null) {
      const base = primaryDossier || shortsDossier;
      if (!base) return null;
      const alt = primaryDossier && shortsDossier ? shortsDossier : null;
      const mergedMeta = this.mergeVideoAndShortCatalogs(
        primaryDossier?.recentVideos || [],
        shortsDossier?.recentVideos || [],
        limit
      );
      const mergedDossier = {
        ...base,
        title: base.title || alt?.title || "",
        handle: base.handle || alt?.handle || "",
        subscribers: base.subscribers || alt?.subscribers || "",
        videoCount: base.videoCount || alt?.videoCount || "",
        totalChannelVideos: base.totalChannelVideos || alt?.totalChannelVideos || null,
        bio: base.bio || alt?.bio || "",
        recentVideos: mergedMeta.videos,
        longVideoCount: mergedMeta.longVideoCount,
        shortsCount: mergedMeta.shortsCount,
        hasMixedFormats: mergedMeta.hasMixedFormats,
        hasMore: Boolean(primaryDossier?.hasMore || shortsDossier?.hasMore),
        totalFetched: mergedMeta.videos.length
      };
      if (typeof formatMarkdownFn === "function") {
        mergedDossier.markdownDossier = formatMarkdownFn(mergedDossier);
      }
      return mergedDossier;
    }
    /**
     * Balances stratified temporal sampling across long-form videos and Shorts when both exist.
     * @param {Array<Object>} allVideos
     * @param {number} maxSample
     * @param {Function} temporalSelectFn
     * @returns {Array<Object>}
     */
    static sampleMixedFormats(allVideos = [], maxSample = 12, temporalSelectFn) {
      const tagged = (allVideos || []).map((v) => this.tagItem(v));
      if (tagged.length <= maxSample) {
        return temporalSelectFn(tagged, maxSample);
      }
      const videosPool = tagged.filter((v) => !v.isShort);
      const shortsPool = tagged.filter((v) => v.isShort);
      if (videosPool.length === 0 || shortsPool.length === 0) {
        return temporalSelectFn(tagged, maxSample);
      }
      const shortsShare = Math.min(
        shortsPool.length,
        Math.max(shortsPool.length >= 2 ? 2 : 1, Math.round(maxSample * 0.35))
      );
      const videosShare = Math.min(videosPool.length, maxSample - shortsShare);
      const finalShortQuota = Math.min(shortsPool.length, maxSample - videosShare);
      const pickedVideos = temporalSelectFn(videosPool, videosShare);
      const pickedShorts = temporalSelectFn(shortsPool, finalShortQuota);
      return [...pickedVideos, ...pickedShorts].map((v, idx) => ({ ...v, sampleIndex: idx + 1 }));
    }
    /**
     * Computes separate editorial reliability and clickbait averages for Videos vs Shorts.
     * @param {Array<Object>} evaluatedVideos
     * @returns {Object}
     */
    static computeFormatBreakdown(evaluatedVideos = []) {
      const videosList = [];
      const shortsList = [];
      for (const v of evaluatedVideos || []) {
        if (this.isShortItem(v)) shortsList.push(v);
        else videosList.push(v);
      }
      const totalCount = videosList.length + shortsList.length;
      const summarize = (list, sharePct) => {
        if (list.length === 0) {
          return {
            count: 0,
            sharePct: 0,
            avgScore: null,
            avgClickbait: null,
            reliableCount: 0,
            cautionCount: 0,
            riskCount: 0,
            reliablePct: 0,
            cautionPct: 0,
            riskPct: 0
          };
        }
        const scoreSum = list.reduce((acc, v) => acc + (typeof v.score === "number" ? v.score : 50), 0);
        const cbSum = list.reduce((acc, v) => acc + (typeof v.clickbait === "number" ? v.clickbait : 20), 0);
        const reliableCount = list.filter((v) => (typeof v.score === "number" ? v.score : 50) >= 75).length;
        const cautionCount = list.filter((v) => {
          const s = typeof v.score === "number" ? v.score : 50;
          return s >= 50 && s < 75;
        }).length;
        const riskCount = Math.max(0, list.length - reliableCount - cautionCount);
        const reliablePct = Math.round(reliableCount / list.length * 100);
        const cautionPct = Math.round(cautionCount / list.length * 100);
        const riskPct = Math.max(0, 100 - reliablePct - cautionPct);
        return {
          count: list.length,
          sharePct,
          avgScore: Math.round(scoreSum / list.length),
          avgClickbait: Math.round(cbSum / list.length),
          reliableCount,
          cautionCount,
          riskCount,
          reliablePct,
          cautionPct,
          riskPct
        };
      };
      const videoShare = totalCount > 0 ? Math.round(videosList.length / totalCount * 100) : 0;
      const shortShare = totalCount > 0 ? shortsList.length > 0 ? Math.max(0, 100 - videoShare) : 0 : 0;
      const videos = summarize(videosList, videoShare);
      const shorts = summarize(shortsList, shortShare);
      const hasMixedFormats = videos.count > 0 && shorts.count > 0;
      return {
        videos,
        shorts,
        hasMixedFormats,
        scoreGap: hasMixedFormats ? videos.avgScore - shorts.avgScore : 0,
        clickbaitGap: hasMixedFormats ? shorts.avgClickbait - videos.avgClickbait : 0
      };
    }
    /**
     * Formats a merged channel dossier with explicit [Video] / [Short] tags into markdown.
     * @param {Object} dossier
     * @returns {string}
     */
    static formatMarkdownDossier(dossier = {}) {
      const { title, handle, subscribers, videoCount, bio, recentVideos = [] } = dossier;
      const longsCount = recentVideos.filter((v) => !this.isShortItem(v)).length;
      const shortsCount = recentVideos.length - longsCount;
      const mixNote = shortsCount > 0 ? ` (${longsCount} Vid\xE9os \u2022 ${shortsCount} Shorts)` : "";
      const lines = [
        `### \u{1F4FA} DOSSIER OFFICIEL DE LA CHA\xCENE : ${title || "Cr\xE9ateur YouTube"} (${handle || ""})`,
        `- **Audience & Volume** : ${subscribers || "Non communiqu\xE9"} \u2022 ${videoCount || `${recentVideos.length} vid\xE9os r\xE9centes`}${mixNote}`
      ];
      if (bio) lines.push(`- **Bio Officielle** :
"""
${bio.trim()}
"""`);
      if (recentVideos.length > 0) {
        const cap = 40;
        lines.push(`- **Derniers contenus publi\xE9s (${recentVideos.length})** :`);
        recentVideos.slice(0, cap).forEach((v, idx) => {
          const isS = this.isShortItem(v);
          const tag = isS ? "[Short]" : "[Vid\xE9o]";
          const vUrl = v.url || (isS ? `https://www.youtube.com/shorts/${v.id}` : `https://youtu.be/${v.id}`);
          lines.push(`  ${idx + 1}. ${tag} **${v.title}** ${v.meta ? `(${v.meta})` : ""} - ${vUrl}`);
        });
        if (recentVideos.length > cap) {
          lines.push(`  ... (+${recentVideos.length - cap} autres contenus index\xE9s dans le catalogue)`);
        }
      }
      return lines.join("\n");
    }
  };

  // src/background/ChannelHttpClient.js
  var CHANNEL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  };
  var ChannelHttpClient = class {
    /**
     * Fetches channel/search HTML bypassing EU consent redirects when possible.
     * @param {string} url
     * @param {Object} [options]
     * @returns {Promise<{ ok: boolean, status: number, html: string, url: string }>}
     */
    static async fetchHtmlPage(url, options = {}) {
      let lastStatus = 0;
      let lastHtml = "";
      let directError = null;
      try {
        const response = await fetch(url, { headers: CHANNEL_HEADERS, credentials: "omit" });
        lastStatus = response?.status || 0;
        const isConsent = Boolean(response?.url && response.url.includes("consent.youtube."));
        if (response?.ok && !isConsent) {
          lastHtml = await response.text();
          if (lastHtml && (ChannelPageParser.extractBalancedInitialData(lastHtml) || typeof options.pageFetcher !== "function")) {
            return { ok: true, status: lastStatus || 200, html: lastHtml, url: response.url || url };
          }
        }
      } catch (err) {
        directError = err;
      }
      if (typeof options.pageFetcher === "function") {
        try {
          const tabRes = await options.pageFetcher(url);
          if (tabRes?.ok && typeof tabRes.html === "string" && tabRes.html.length > 0) {
            return { ok: true, status: tabRes.status || 200, html: tabRes.html, url: tabRes.url || url };
          }
        } catch (_) {
        }
      }
      if (!lastHtml && !String(url).includes("ucbcb=")) {
        try {
          const sep = String(url).includes("?") ? "&" : "?";
          const retry = await fetch(`${url}${sep}ucbcb=1`, { headers: CHANNEL_HEADERS, credentials: "omit" });
          if (retry?.ok && !retry.url?.includes("consent.youtube.")) {
            const retryHtml = await retry.text();
            if (retryHtml && ChannelPageParser.extractBalancedInitialData(retryHtml)) {
              return { ok: true, status: retry.status || 200, html: retryHtml, url: retry.url || url };
            }
          }
        } catch (_) {
        }
      }
      if (lastStatus >= 400) return { ok: false, status: lastStatus, html: "", url };
      if (directError && !lastHtml) throw directError;
      return { ok: Boolean(lastHtml), status: lastStatus || 200, html: lastHtml, url };
    }
    /**
     * Fetches one continuation batch directly from InnerTube browse API.
     * @returns {Promise<{ ok: boolean, status: number, items: Array<Object> }>}
     */
    static async fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData = "") {
      try {
        const client = { clientName: "WEB", clientVersion: clientVersion || "2.20260101.00.00", hl: "fr", gl: "FR" };
        if (visitorData) client.visitorData = visitorData;
        const headers = { "Content-Type": "application/json" };
        if (visitorData) headers["X-Goog-Visitor-Id"] = visitorData;
        const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          credentials: "omit",
          headers,
          body: JSON.stringify({ context: { client }, continuation })
        });
        if (!res.ok) return { ok: false, status: res.status, items: [] };
        const json = await res.json();
        const items = [];
        for (const action of json.onResponseReceivedActions || []) {
          const batch = action.appendContinuationItemsAction?.continuationItems || action.reloadContinuationItemsCommand?.continuationItems;
          if (Array.isArray(batch)) items.push(...batch);
        }
        return { ok: true, status: 200, items };
      } catch (_) {
        return { ok: false, status: 0, items: [] };
      }
    }
  };

  // src/background/ChannelIntelligenceFetcher.js
  var ChannelIntelligenceFetcher = class {
    /**
     * Fetches official channel dossier by creator handle, URL or search query
     * @param {string} query Handle (@JulienChieze), URL or search query
     * @param {number} [limit=30]
     * @param {Object} [options]
     * @returns {Promise<{success: boolean, channel?: Object, error?: string}>}
     */
    static async fetchChannelDossier(query, limit = 30, options = {}) {
      try {
        if (!query || typeof query !== "string") {
          throw new Error("Query string is required");
        }
        const cleanQuery = query.trim();
        const canonicalRoot = await this.resolveChannelPath(cleanQuery, options);
        if (!canonicalRoot) {
          throw new Error(`Impossible de trouver la cha\xEEne YouTube pour : "${cleanQuery}"`);
        }
        const normalizedRoot = ChannelPageParser.sanitizeChannelPath(canonicalRoot) || canonicalRoot.replace(/\/+$/, "");
        const tabLimit = limit === "all" ? "all" : Math.max(8, Math.ceil((parseInt(limit, 10) || 30) * 0.75));
        let videosDossier = null;
        let shortsDossier = null;
        let lastError = null;
        try {
          videosDossier = await this._fetchTabDossier(`${normalizedRoot}/videos`, normalizedRoot, tabLimit, options);
        } catch (err) {
          lastError = err;
        }
        try {
          shortsDossier = await this._fetchTabDossier(`${normalizedRoot}/shorts`, normalizedRoot, tabLimit, options);
        } catch (err) {
          lastError = lastError || err;
        }
        const combined = ChannelFormatAnalyzer.mergeDossiers(
          videosDossier,
          shortsDossier,
          limit,
          (d) => this.formatMarkdownDossier(d)
        );
        if (combined && combined.recentVideos.length > 0) {
          return { success: true, channel: combined };
        }
        let lastDossier = combined;
        for (const tabPath of [`${normalizedRoot}/streams`, normalizedRoot]) {
          if (tabPath === `${normalizedRoot}/videos` || tabPath === `${normalizedRoot}/shorts`) continue;
          try {
            const dossier = await this._fetchTabDossier(tabPath, normalizedRoot, limit, options);
            if (dossier) {
              lastDossier = dossier;
              if (Array.isArray(dossier.recentVideos) && dossier.recentVideos.length > 0) {
                const formatted = ChannelFormatAnalyzer.mergeDossiers(dossier, null, limit, (d) => this.formatMarkdownDossier(d));
                return { success: true, channel: formatted };
              }
            }
          } catch (err) {
            lastError = err;
          }
        }
        if (lastDossier) return { success: true, channel: lastDossier };
        throw lastError || new Error("Impossible d'extraire ytInitialData de la page cha\xEEne");
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    }
    static async _fetchHtmlPage(url, options = {}) {
      return ChannelHttpClient.fetchHtmlPage(url, options);
    }
    static async _fetchTabDossier(tabPath, canonicalRoot, limit, options = {}) {
      const channelUrl = `https://www.youtube.com${tabPath}`;
      const page = await this._fetchHtmlPage(channelUrl, options);
      if (!page.ok && page.status >= 400) {
        throw new Error(`HTTP ${page.status} lors de l'acc\xE8s \xE0 la cha\xEEne`);
      }
      const data = ChannelPageParser.extractBalancedInitialData(page.html);
      if (!data) {
        throw new Error("Impossible d'extraire ytInitialData de la page cha\xEEne");
      }
      const isShortsTabRequest = tabPath.endsWith("/shorts");
      const isGenuineShortsTab = isShortsTabRequest && ChannelPageParser.isShortsTabData(data);
      const apiKey = page.html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1] || "";
      const clientVersion = page.html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1] || "2.20260101.00.00";
      const visitorData = page.html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/)?.[1] || "";
      const dossier = await this.parseChannelDataWithPagination(data, `${canonicalRoot}/videos`, limit, {
        apiKey,
        clientVersion,
        visitorData: visitorData || data?.responseContext?.visitorData || "",
        browseFetcher: options.browseFetcher || null,
        forceShort: isGenuineShortsTab
      });
      if (isShortsTabRequest && !isGenuineShortsTab && Array.isArray(dossier?.recentVideos)) {
        dossier.recentVideos = dossier.recentVideos.filter((v) => v.isShort);
        dossier.totalFetched = dossier.recentVideos.length;
      }
      return dossier;
    }
    /**
     * Resolves search query, handle, Studio link or channel URL to canonical YouTube channel root path
     * @param {string} rawQuery
     * @param {Object} [options]
     * @returns {Promise<string|null>}
     */
    static async resolveChannelPath(rawQuery, options = {}) {
      const clean = String(rawQuery || "").trim();
      const directPath = ChannelPageParser.sanitizeChannelPath(clean);
      if (directPath) return directPath;
      if (/^UC[A-Za-z0-9_-]{20,}$/.test(clean)) return `/channel/${clean}`;
      if (clean.startsWith("/@") || clean.startsWith("/channel/") || clean.startsWith("/c/") || clean.startsWith("/user/")) {
        return clean;
      }
      const searchUrls = [
        `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}&sp=EgIQAg%3D%3D`,
        `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`
      ];
      for (const searchUrl of searchUrls) {
        const searchRes = await this._fetchHtmlPage(searchUrl, options);
        if (!searchRes.ok || !searchRes.html) continue;
        const data = ChannelPageParser.extractBalancedInitialData(searchRes.html);
        const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const items = sections.flatMap((s) => s?.itemSectionRenderer?.contents || []);
        const channelRenderer = items.find((c) => c.channelRenderer)?.channelRenderer;
        const endpoint = channelRenderer?.navigationEndpoint?.browseEndpoint || items.find((c) => c.videoRenderer)?.videoRenderer?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
        const base = endpoint?.canonicalBaseUrl || (channelRenderer?.channelId ? `/channel/${channelRenderer.channelId}` : "");
        const resolved = base ? ChannelPageParser.sanitizeChannelPath(base) || base : "";
        if (resolved) return resolved;
      }
      return null;
    }
    /** Parses channel header, subscriber count, bio, and latest videos from ytInitialData */
    static parseChannelData(data, canonicalPath, limit = 30, parseOptions = {}) {
      const { title, handle, subscribers, videoCount, bio } = ChannelPageParser.parseHeader(data, canonicalPath);
      const contents = this._findGridContents(data);
      const { videos: recentVideos } = this._extractGridVideos(contents, /* @__PURE__ */ new Set(), limit, parseOptions);
      const totalChannelVideos = parseChannelVideoCount(videoCount);
      const baseDossier = { title, handle, subscribers, videoCount, totalChannelVideos, bio, recentVideos };
      return ChannelFormatAnalyzer.mergeDossiers(baseDossier, null, limit, (d) => this.formatMarkdownDossier(d));
    }
    /** Parses channel data and paginates InnerTube continuations up to limit. */
    static async parseChannelDataWithPagination(data, fallbackPath, limit = 30, innerTube = {}) {
      const targetLimit = limit === "all" ? 5e3 : Math.max(1, parseInt(limit, 10) || 30);
      const parseOpts = { forceShort: Boolean(innerTube?.forceShort) };
      const dossier = this.parseChannelData(data, fallbackPath, targetLimit, parseOpts);
      const contents = this._findGridContents(data);
      const seenIds = new Set(dossier.recentVideos.map((v) => v.id).filter(Boolean));
      let { continuationToken: nextToken, truncatedOnPage } = this._extractGridVideos(contents, /* @__PURE__ */ new Set(), targetLimit, parseOpts);
      let pageCount = 0;
      const maxPages = 200;
      let paginationFailed = false;
      while (dossier.recentVideos.length < targetLimit && nextToken && innerTube.apiKey && pageCount < maxPages) {
        pageCount++;
        const prevToken = nextToken;
        let pageRes = null;
        if (typeof innerTube.browseFetcher === "function") {
          pageRes = await innerTube.browseFetcher({
            apiKey: innerTube.apiKey,
            clientVersion: innerTube.clientVersion,
            visitorData: innerTube.visitorData || "",
            continuation: nextToken
          });
        }
        if (!pageRes || pageRes.ok === false) {
          pageRes = await this._fetchBrowseContinuationResult(innerTube.apiKey, innerTube.clientVersion, nextToken, innerTube.visitorData);
        }
        if (!pageRes?.ok) {
          paginationFailed = true;
          break;
        }
        const pageItems = pageRes.items || [];
        if (pageItems.length === 0) {
          nextToken = null;
          break;
        }
        const extracted = this._extractGridVideos(pageItems, seenIds, targetLimit - dossier.recentVideos.length, parseOpts);
        dossier.recentVideos.push(...extracted.videos);
        nextToken = extracted.continuationToken;
        truncatedOnPage = extracted.truncatedOnPage;
        if (extracted.videos.length === 0 && (!nextToken || nextToken === prevToken)) {
          nextToken = null;
          break;
        }
      }
      const updated = ChannelFormatAnalyzer.mergeDossiers(dossier, null, targetLimit, (d) => this.formatMarkdownDossier(d));
      updated.hasMore = Boolean(nextToken || truncatedOnPage || paginationFailed);
      updated.totalFetched = updated.recentVideos.length;
      if (!updated.hasMore && !paginationFailed && updated.recentVideos.length > 0 && !parseOpts.forceShort) {
        updated.totalChannelVideos = updated.recentVideos.length;
      }
      return updated;
    }
    static async _fetchBrowseContinuation(apiKey, clientVersion, continuation, visitorData = "") {
      const res = await this._fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData);
      return res.items || [];
    }
    static async _fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData = "") {
      return ChannelHttpClient.fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData);
    }
    static _findGridContents(data) {
      return ChannelPageParser.findGridContents(data);
    }
    static _extractGridVideos(contents = [], seenIds = /* @__PURE__ */ new Set(), maxNew = 30, parseOptions = {}) {
      const videos = [];
      let continuationToken = null;
      let truncatedOnPage = false;
      for (const item of contents) {
        const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (token) {
          continuationToken = token;
          continue;
        }
        const parsed = this._parseGridVideoItem(item, parseOptions);
        if (!parsed || parsed.id && seenIds.has(parsed.id)) continue;
        if (videos.length >= maxNew) {
          truncatedOnPage = true;
          continue;
        }
        if (parsed.id) seenIds.add(parsed.id);
        videos.push(parsed);
      }
      return { videos, continuationToken, truncatedOnPage };
    }
    static _parseGridVideoItem(item, parseOptions = {}) {
      return ChannelPageParser.parseGridVideoItem(item, parseOptions);
    }
    static formatMarkdownDossier(dossier) {
      return ChannelFormatAnalyzer.formatMarkdownDossier(dossier);
    }
  };

  // src/background/VideoCommentsFetcher.js
  var VideoCommentsFetcher = class {
    /**
     * Fetches top public comments for a YouTube video
     * @param {string} videoId 11-character YouTube video ID
     * @param {number} [limit=25]
     * @returns {Promise<{success: boolean, comments?: Array<Object>, markdownDossier?: string, error?: string}>}
     */
    static async fetchVideoComments(videoId, limit = 25) {
      try {
        if (!videoId || typeof videoId !== "string") {
          throw new Error("Valid video ID is required");
        }
        const watchUrl = `https://www.youtube.com/watch?v=${videoId.trim()}`;
        const watchRes = await fetch(watchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
          }
        });
        if (!watchRes.ok) {
          throw new Error(`HTTP ${watchRes.status} loading watch page`);
        }
        const html = await watchRes.text();
        const ytDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (!ytDataMatch) {
          throw new Error("Unable to extract ytInitialData for comments");
        }
        const data = JSON.parse(ytDataMatch[1]);
        const token = this.extractCommentsContinuationToken(data);
        if (!token) {
          return {
            success: true,
            comments: [],
            markdownDossier: "Les commentaires sont d\xE9sactiv\xE9s ou indisponibles pour cette vid\xE9o."
          };
        }
        const comments = await this.fetchCommentsFromInnerTube(token, limit);
        const markdownDossier = this.formatCommentsMarkdown(comments, videoId);
        return {
          success: true,
          comments,
          markdownDossier
        };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    }
    /**
     * Extracts continuation token for comments section from ytInitialData
     */
    static extractCommentsContinuationToken(data) {
      const contents = data.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
      const itemSection = contents.find((c) => c.itemSectionRenderer?.sectionIdentifier === "comment-item-section");
      return itemSection?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
    }
    /**
     * Fetches comment entities via YouTube InnerTube /next endpoint
     */
    static async fetchCommentsFromInnerTube(token, limit = 25) {
      const response = await fetch("https://www.youtube.com/youtubei/v1/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9"
        },
        body: JSON.stringify({
          context: {
            client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "fr", gl: "FR" }
          },
          continuation: token
        })
      });
      if (!response.ok) {
        throw new Error(`InnerTube comment endpoint returned HTTP ${response.status}`);
      }
      const json = await response.json();
      const mutations = json.frameworkUpdates?.entityBatchUpdate?.mutations || [];
      const comments = [];
      for (const m of mutations) {
        if (comments.length >= limit) break;
        const p = m.payload?.commentEntityPayload;
        if (p) {
          const author = p.author?.displayName || "Anonyme";
          const text = p.properties?.content?.content || "";
          const time = p.properties?.publishedTime || "";
          const likes = p.toolbar?.likeCountNotliked || "0";
          if (text) {
            comments.push({ author, text, time, likes });
          }
        }
      }
      if (comments.length === 0) {
        const actions = json.onResponseReceivedEndpoints || [];
        const actionContents = actions[1]?.reloadContinuationItemsCommand?.continuationItems || actions[0]?.appendContinuationItemsAction?.continuationItems || actions[0]?.reloadContinuationItemsCommand?.continuationItems || [];
        for (const item of actionContents) {
          if (comments.length >= limit) break;
          const thread = item.commentThreadRenderer?.comment?.commentRenderer;
          if (thread) {
            const author = thread.authorText?.simpleText || "Anonyme";
            const text = thread.contentText?.runs?.map((r) => r.text).join("") || thread.contentText?.simpleText || "";
            const likes = thread.voteCount?.simpleText || "0";
            const time = thread.publishedTimeText?.runs?.[0]?.text || "";
            if (text) {
              comments.push({ author, text, time, likes });
            }
          }
        }
      }
      return comments;
    }
    /**
     * Formats comments into clean, structured Markdown block for prompt injection
     */
    static formatCommentsMarkdown(comments, videoId) {
      if (!comments || comments.length === 0) {
        return "Aucun commentaire disponible sous cette vid\xE9o.";
      }
      const lines = [
        `### [Avis du Public] Commentaires et r\xE9actions (${comments.length} avis populaires) :`
      ];
      comments.forEach((c, idx) => {
        const cleanText = c.text.replace(/\n+/g, " ").trim();
        lines.push(`- **${c.author}** (${c.likes} likes, ${c.time}) : "${cleanText}"`);
      });
      return lines.join("\n");
    }
  };

  // src/background/VideoDossierFetcher.js
  var VideoDossierFetcher = class _VideoDossierFetcher {
    /**
     * Fetches rich dossier for a single video ID
     * @param {string} videoId
     * @param {string} [lang='fr']
     * @param {object} [options]
     * @returns {Promise<Object>}
     */
    static async fetchDossier(videoId, lang = "fr", options = {}) {
      if (!videoId) return null;
      const { includeComments = true } = options;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      try {
        const res = await fetch(url, {
          headers: {
            "Accept-Language": `${lang},en;q=0.8`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          credentials: "include"
        });
        if (!res.ok) return null;
        const html = await res.text();
        let title = "";
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, "").trim();
        let description = "";
        const descIdx = html.indexOf('"shortDescription":"');
        if (descIdx !== -1) {
          const start = descIdx + '"shortDescription":"'.length;
          let end = start, esc = false;
          while (end < html.length) {
            if (esc) esc = false;
            else if (html[end] === "\\") esc = true;
            else if (html[end] === '"') break;
            end++;
          }
          try {
            description = JSON.parse(`"${html.substring(start, end)}"`);
          } catch (_) {
            description = html.substring(start, end);
          }
        }
        const chapters = [];
        const lines = description.split("\n");
        for (const line of lines) {
          const m = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)$/);
          if (m) chapters.push(`[${m[1]}] ${m[2].trim()}`);
        }
        const hasCaptions = html.includes('"captionTracks":');
        let comments = [];
        if (includeComments) {
          try {
            const comRes = await VideoCommentsFetcher.fetchVideoComments(videoId, 3);
            if (comRes?.success && Array.isArray(comRes.comments)) {
              comments = comRes.comments.map((c) => ({
                author: c.author || "Anonyme",
                text: (c.text || "").replace(/\s+/g, " ").trim().slice(0, 140),
                likes: c.likes || "0"
              }));
            }
          } catch (_) {
          }
        }
        return {
          videoId,
          title,
          description: description.slice(0, 1200),
          chapters: chapters.slice(0, 12),
          hasCaptions,
          comments
        };
      } catch (_) {
        return null;
      }
    }
    /**
     * Fetches multiple video dossiers in parallel batches
     * @param {Array<string>} videoIds
     * @param {string} [lang='fr']
     * @param {number|Object} [concurrencyOrOptions=4]
     * @returns {Promise<Map<string, Object>>}
     */
    static async fetchDossiersBatch(videoIds = [], lang = "fr", concurrencyOrOptions = 4) {
      const results = /* @__PURE__ */ new Map();
      if (!Array.isArray(videoIds) || videoIds.length === 0) return results;
      const opts = typeof concurrencyOrOptions === "object" && concurrencyOrOptions !== null ? concurrencyOrOptions : { concurrency: concurrencyOrOptions, includeComments: true };
      const concurrency = opts.concurrency || 4;
      const includeComments = opts.includeComments !== false;
      const queue = [...videoIds];
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length > 0) {
          const vId = queue.shift();
          if (!vId) continue;
          const dossier = await _VideoDossierFetcher.fetchDossier(vId, lang, { includeComments });
          if (dossier) results.set(vId, dossier);
        }
      });
      await Promise.all(workers);
      return results;
    }
  };

  // src/background/DomainAuditFetcher.js
  var ASSET_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|ico|pdf|zip|tar|gz|mp[34]|webm|wav|css|js|mjs|woff2?|ttf|eot|xml|json)$/i;
  var MAX_EXCERPT_CHARS = 2e3;
  var DomainAuditFetcher = class _DomainAuditFetcher {
    static normalizeUrlKey(rawUrl, cleanOrigin) {
      try {
        const u = new URL(rawUrl, cleanOrigin);
        if (u.origin !== cleanOrigin || !/^https?:$/i.test(u.protocol)) return "";
        if (u.search) return "";
        if (ASSET_EXT_RE.test(u.pathname)) return "";
        const path = u.pathname.replace(/\/+$/, "") || "/";
        return `${u.origin}${path}`;
      } catch (_) {
        return "";
      }
    }
    static async fetchTextSafe(url, fetchFn = fetch, timeoutMs = 3500) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      try {
        const res = await fetchFn(url, {
          method: "GET",
          credentials: "omit",
          redirect: "follow",
          signal: controller?.signal
        });
        if (!res?.ok) return { ok: false, status: res?.status || 0, url: res?.url || url, text: "" };
        const ctype = res.headers?.get?.("content-type") || "";
        if (ctype && !/(?:text\/|application\/(?:xhtml\+xml|xml))/i.test(ctype)) {
          return { ok: false, status: res.status, url: res?.url || url, text: "" };
        }
        const rawText = await res.text();
        return { ok: true, status: res.status, url: res?.url || url, text: rawText.slice(0, 262144) };
      } catch (_) {
        return { ok: false, status: 0, url, text: "" };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    static _htmlToCleanText(html = "") {
      return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ").replace(/<(?:br|p|div|li|tr|h[1-6]|section|article)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
    }
    static extractStructuredHtml(html = "") {
      const raw = String(html || "");
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
      const headerParts = (raw.match(/<(?:header|nav)\b[\s\S]*?<\/(?:header|nav)>/gi) || []).map((b) => _DomainAuditFetcher._htmlToCleanText(b)).filter(Boolean);
      const footerParts = (raw.match(/<footer\b[\s\S]*?<\/footer>/gi) || []).map((b) => _DomainAuditFetcher._htmlToCleanText(b)).filter(Boolean);
      const withoutChrome = raw.replace(/<(?:header|nav|footer)\b[\s\S]*?<\/(?:header|nav|footer)>/gi, " ");
      const mainMatch = /<(?:main|article)\b[\s\S]*?<\/(?:main|article)>/i.exec(withoutChrome);
      const mainText = _DomainAuditFetcher._htmlToCleanText(mainMatch ? mainMatch[0] : withoutChrome);
      return {
        title,
        header: headerParts.join(" | ").slice(0, 700),
        footer: footerParts.join(" | ").slice(0, 700),
        mainText
      };
    }
    static deduplicateText(text = "", seenBlocks = /* @__PURE__ */ new Set()) {
      const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
      const kept = [];
      for (const line of lines) {
        const norm = line.toLowerCase().replace(/\s+/g, " ");
        if (norm.length >= 35) {
          if (seenBlocks.has(norm)) continue;
          seenBlocks.add(norm);
        }
        kept.push(line);
      }
      return kept.join("\n").slice(0, MAX_EXCERPT_CHARS);
    }
    static stripHtmlToText(html = "") {
      const structured = _DomainAuditFetcher.extractStructuredHtml(html);
      return { title: structured.title, excerpt: structured.mainText.slice(0, MAX_EXCERPT_CHARS) };
    }
    static extractSignalsFromHtml(html = "", cleanOrigin = "") {
      const navUrls = [];
      const contacts = /* @__PURE__ */ new Set();
      const semanticBlocks = html.match(/<(?:footer|nav|header)\b[\s\S]*?<\/(?:footer|nav|header)>/gi);
      const targetHtml = semanticBlocks && semanticBlocks.length > 0 ? semanticBlocks.join("\n") : html;
      const linkRe = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
      let m;
      while ((m = linkRe.exec(targetHtml)) !== null) {
        const raw = m[1].trim();
        if (/^(mailto:|tel:)/i.test(raw)) {
          contacts.add(raw.slice(0, 80));
          continue;
        }
        const key = _DomainAuditFetcher.normalizeUrlKey(raw, cleanOrigin);
        if (key && !navUrls.includes(key)) navUrls.push(key);
        if (navUrls.length >= 12 && contacts.size >= 5) break;
      }
      if (targetHtml !== html && contacts.size < 5) {
        const contactRe = /href\s*=\s*["']((?:mailto:|tel:)[^"']+)["']/gi;
        while ((m = contactRe.exec(html)) !== null) {
          contacts.add(m[1].trim().slice(0, 80));
          if (contacts.size >= 5) break;
        }
      }
      return { legalUrls: navUrls, contacts: Array.from(contacts).slice(0, 5) };
    }
    static extractSitemapUrls(sitemapXml = "", cleanOrigin = "") {
      const urls = [];
      const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
      let m;
      while ((m = locRe.exec(sitemapXml)) !== null) {
        const key = _DomainAuditFetcher.normalizeUrlKey(m[1], cleanOrigin);
        if (key && !urls.includes(key)) urls.push(key);
        if (urls.length >= 10) break;
      }
      return urls;
    }
    /**
     * Collects root homepage, robots.txt, sitemap.xml, and deduplicated multi-level structural pages.
     * Never re-fetches or re-analyzes an already visited URL.
     * @param {Object} params
     */
    static async collectDomainDossier({ origin, hostname = "", currentUrl = "", knownLegalLinks = [], maxDepth = 2, fetchFn = fetch }) {
      if (!origin || !/^https?:\/\//i.test(origin)) {
        return { origin: "", hostname, maxDepth: 1, hasRobotsTxt: false, sitemapUrlCount: 0, contacts: [], home: null, legalPages: [] };
      }
      const depthLimit = Math.max(1, Math.min(4, parseInt(maxDepth, 10) || 2));
      const maxPagesTotal = depthLimit * 4;
      const cleanOrigin = origin.replace(/\/+$/, "");
      const visited = /* @__PURE__ */ new Set();
      const currentKey = currentUrl ? _DomainAuditFetcher.normalizeUrlKey(currentUrl, cleanOrigin) : "";
      if (currentKey) visited.add(currentKey);
      const homeKey = _DomainAuditFetcher.normalizeUrlKey(`${cleanOrigin}/`, cleanOrigin);
      if (homeKey) visited.add(homeKey);
      const [homeRes, robotsRes, sitemapRes] = await Promise.all([
        _DomainAuditFetcher.fetchTextSafe(`${cleanOrigin}/`, fetchFn),
        _DomainAuditFetcher.fetchTextSafe(`${cleanOrigin}/robots.txt`, fetchFn),
        _DomainAuditFetcher.fetchTextSafe(`${cleanOrigin}/sitemap.xml`, fetchFn)
      ]);
      const allContacts = /* @__PURE__ */ new Set();
      const enqueueUnique = (rawUrls, queue) => {
        for (const raw of rawUrls) {
          const key = _DomainAuditFetcher.normalizeUrlKey(raw, cleanOrigin);
          if (key && !visited.has(key)) {
            visited.add(key);
            queue.push(key);
          }
        }
      };
      let frontier = [];
      enqueueUnique((knownLegalLinks || []).map((l) => l?.url).filter(Boolean), frontier);
      if (homeRes.ok && homeRes.text) {
        const hs = _DomainAuditFetcher.extractSignalsFromHtml(homeRes.text, cleanOrigin);
        hs.contacts.forEach((c) => allContacts.add(c));
        enqueueUnique(hs.legalUrls, frontier);
      }
      if (sitemapRes.ok && sitemapRes.text) {
        enqueueUnique(_DomainAuditFetcher.extractSitemapUrls(sitemapRes.text, cleanOrigin), frontier);
      }
      const seenBlocks = /* @__PURE__ */ new Set();
      const homeParsed = homeRes.ok && homeRes.text ? _DomainAuditFetcher.extractStructuredHtml(homeRes.text) : null;
      const siteChrome = homeParsed ? { header: homeParsed.header, footer: homeParsed.footer } : { header: "", footer: "" };
      const home = homeParsed ? { url: homeRes.url, title: homeParsed.title, excerpt: _DomainAuditFetcher.deduplicateText(homeParsed.mainText, seenBlocks) } : null;
      const legalPages = [];
      for (let depth = 1; depth <= depthLimit && frontier.length > 0 && legalPages.length < maxPagesTotal; depth += 1) {
        const batch = frontier.slice(0, Math.min(4, maxPagesTotal - legalPages.length));
        const results = await Promise.all(batch.map((u) => _DomainAuditFetcher.fetchTextSafe(u, fetchFn)));
        const nextFrontier = [];
        for (const r of results) {
          if (!r.ok || !r.text) continue;
          const parsed = _DomainAuditFetcher.extractStructuredHtml(r.text);
          const dedupedMain = _DomainAuditFetcher.deduplicateText(parsed.mainText, seenBlocks);
          const diffNotes = [];
          if (parsed.header && parsed.header !== siteChrome.header) diffNotes.push(`[Changed Header]: ${parsed.header}`);
          if (parsed.footer && parsed.footer !== siteChrome.footer) diffNotes.push(`[Changed Footer]: ${parsed.footer}`);
          const excerpt = [dedupedMain, ...diffNotes].filter(Boolean).join("\n").slice(0, MAX_EXCERPT_CHARS);
          legalPages.push({ url: r.url, depth, title: parsed.title, excerpt });
          if (depth < depthLimit) {
            const sig = _DomainAuditFetcher.extractSignalsFromHtml(r.text, cleanOrigin);
            sig.contacts.forEach((c) => allContacts.add(c));
            enqueueUnique(sig.legalUrls, nextFrontier);
          }
        }
        frontier = nextFrontier;
      }
      const sitemapUrlCount = sitemapRes.ok && sitemapRes.text ? (sitemapRes.text.match(/<loc>/gi) || []).length : 0;
      return {
        origin: cleanOrigin,
        hostname: hostname || new URL(cleanOrigin).hostname,
        maxDepth: depthLimit,
        visitedCount: visited.size,
        hasRobotsTxt: Boolean(robotsRes.ok && robotsRes.text?.trim()),
        sitemapUrlCount,
        contacts: Array.from(allContacts).slice(0, 6),
        siteChrome,
        home,
        legalPages
      };
    }
  };

  // src/background/BackgroundImageFetcher.js
  var MAX_IMAGE_BYTES = 15 * 1024 * 1024;
  var FETCH_TIMEOUT_MS = 6e3;
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  var BackgroundImageFetcher = class {
    static async fetchSafeJpeg(rawUrl) {
      let parsed;
      try {
        parsed = new URL(String(rawUrl || ""));
      } catch (_) {
        return { success: false, error: "Invalid image URL" };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { success: false, error: "Unsupported protocol" };
      }
      const ctrl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
      try {
        const resp = await fetch(parsed.href, { credentials: "omit", signal: ctrl?.signal });
        if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
        const ctype = (resp.headers?.get?.("content-type") || "").toLowerCase();
        if (!ctype.startsWith("image/") || ctype.includes("svg")) {
          return { success: false, error: "Unsupported image MIME type" };
        }
        const blob = await resp.blob();
        if (!blob || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) {
          return { success: false, error: "Image size out of bounds" };
        }
        if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
          return { success: false, error: "OffscreenCanvas unavailable" };
        }
        const bmp = await createImageBitmap(blob);
        try {
          const canvas = new OffscreenCanvas(Math.max(1, bmp.width), Math.max(1, bmp.height));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bmp, 0, 0);
          const jpegBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
          const b64 = arrayBufferToBase64(await jpegBlob.arrayBuffer());
          return { success: true, dataUrl: `data:image/jpeg;base64,${b64}`, width: bmp.width, height: bmp.height };
        } finally {
          bmp.close?.();
        }
      } catch (err) {
        return { success: false, error: err?.message || "Fetch failed" };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };

  // src/background/MessageRouter.js
  var MessageRouter = class {
    static init() {
      chrome.runtime.onConnect.addListener((port) => {
        if (port.name === "ai-stream" || port.name === "ai_stream" || port.name === "lm-studio-stream" || port.name === "YT_AI_STREAM") {
          port.onMessage.addListener((msg) => {
            if (msg?.action === "KEEPALIVE" || msg?.type === "KEEPALIVE") return;
            if (msg.action === "START_STREAM" || msg.action === "CHAT_STREAM" || msg.action === "STREAM_CHAT" || msg.action === "GENERATE_STREAM" || msg.action === "AUDIT_STREAM") {
              StreamRelay.handleStream(msg, port);
            }
          });
        }
      });
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "FETCH_MODELS") {
          const provider = AIProviderFactory.getProvider(request.provider || "lmstudio");
          provider.fetchModels(request.serverUrl, request.apiKey).then(async (models) => {
            const enriched = typeof provider.enrichCapabilities === "function" ? await provider.enrichCapabilities(models, request.serverUrl) : models;
            sendResponse({
              success: true,
              ok: true,
              data: { data: enriched, models: enriched },
              models: enriched
            });
          }).catch((err) => {
            sendResponse({
              success: false,
              ok: false,
              error: err.message
            });
          });
          return true;
        }
        if (request.action === "TEST_PROVIDER" || request.action === "PING_SERVER") {
          const provider = AIProviderFactory.getProvider(request.provider || "lmstudio");
          provider.testConnection(request.serverUrl, request.apiKey, request.model).then((result) => {
            sendResponse({
              success: result.ok,
              ok: result.ok,
              latency: result.latencyMs || 0,
              latencyMs: result.latencyMs || 0,
              resolvedModel: result.resolvedModel || null,
              errorKind: result.errorKind || null,
              error: result.error || null,
              message: result.error ? `Failed: ${result.error}` : "Connected"
            });
          }).catch((err) => {
            sendResponse({
              success: false,
              ok: false,
              error: err.message,
              message: `Failed: ${err.message}`
            });
          });
          return true;
        }
        if (request.action === "GET_LOCAL_CONTEXT_DEFAULT") {
          LocalContextManager.detectLocalContextDefault({
            provider: request.provider || "lmstudio",
            serverUrl: request.serverUrl,
            model: request.model || "",
            apiKey: request.apiKey || ""
          }).then((res) => sendResponse({ success: true, ...res })).catch((err) => sendResponse({ success: false, contextLength: request.provider === "ollama" ? 4096 : 8192, error: err.message }));
          return true;
        }
        if (request.action === "APPLY_LOCAL_CONTEXT") {
          const prov = request.provider || "lmstudio";
          const parsed = LocalContextManager.parseContextLength(request.contextLength);
          if (prov === "ollama") {
            sendResponse({ success: true, provider: "ollama", contextLength: parsed || "auto", appliedOnNextRequest: true });
            return false;
          }
          if (!parsed) {
            sendResponse({ success: true, provider: prov, contextLength: "auto", skipped: true });
            return false;
          }
          LocalContextManager.ensureLmStudioContext({
            serverUrl: request.serverUrl,
            model: request.model,
            apiKey: request.apiKey,
            contextLength: parsed
          }).then((res) => sendResponse({ success: Boolean(res?.applied), ...res })).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_TIMEDTEXT") {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6e3);
          fetch(request.url, { signal: controller.signal, credentials: "include" }).then(async (res) => {
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            sendResponse({ success: true, ok: true, text, data: text });
          }).catch((err) => {
            clearTimeout(timer);
            sendResponse({ success: false, ok: false, error: err.message });
          });
          return true;
        }
        if (request.action === "TTS_FETCH_AUDIO") {
          const text = (request.text || "").trim();
          const lang = request.lang || "en";
          if (!text) {
            sendResponse({ success: false, error: "Empty text" });
            return false;
          }
          (async () => {
            try {
              const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
              const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const buffer = await res.arrayBuffer();
              let binary = "";
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const b64 = btoa(binary);
              sendResponse({ success: true, audioDataUrl: `data:audio/mpeg;base64,${b64}` });
            } catch (err) {
              sendResponse({ success: false, error: err.message });
            }
          })();
          return true;
        }
        if (request.action === "FETCH_VIDEO_COMMENTS") {
          const { videoId, limit = 25 } = request;
          VideoCommentsFetcher.fetchVideoComments(videoId, limit).then((res) => sendResponse(res)).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_DOMAIN_AUDIT") {
          DomainAuditFetcher.collectDomainDossier(request).then((dossier) => sendResponse({ success: true, dossier })).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_CHANNEL_DOSSIER") {
          const { query, limit = 30 } = request;
          const resolveBrowseTabId = () => new Promise((resolve) => {
            if (sender?.tab?.id) return resolve(sender.tab.id);
            if (!chrome.tabs?.query) return resolve(null);
            chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://m.youtube.com/*"] }, (tabs) => {
              const active = (tabs || []).find((t) => t.active) || tabs?.[0];
              resolve(active?.id || null);
            });
          });
          resolveBrowseTabId().then((tabId) => {
            const sendProxy = (payload) => new Promise((resolve) => {
              chrome.tabs.sendMessage(tabId, { action: "PROXY_INNERTUBE_BROWSE", ...payload }, (res) => {
                if (chrome.runtime?.lastError || !res) return resolve({ ok: false, items: [] });
                resolve(res);
              });
            });
            const hasTabProxy = Boolean(tabId && chrome.tabs?.sendMessage);
            const browseFetcher = hasTabProxy ? (params) => sendProxy(params) : null;
            const pageFetcher = hasTabProxy ? (url) => sendProxy({ mode: "html", url }) : null;
            return ChannelIntelligenceFetcher.fetchChannelDossier(query, limit, { browseFetcher, pageFetcher });
          }).then((res) => sendResponse(res)).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_WATCH_PAGE_TRANSCRIPT") {
          const { videoId, lang = "fr" } = request;
          BackgroundTranscriptFetcher.fetchTranscript(videoId, lang).then((res) => sendResponse(res)).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_BATCH_DOSSIERS") {
          const { videoIds = [], lang = "fr", includeComments = true } = request;
          VideoDossierFetcher.fetchDossiersBatch(videoIds, lang, { includeComments }).then((map) => {
            const obj = {};
            for (const [k, v] of map.entries()) obj[k] = v;
            sendResponse({ success: true, dossiers: obj });
          }).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_SAFE_IMAGE") {
          BackgroundImageFetcher.fetchSafeJpeg(request.url).then((res) => sendResponse(res)).catch((err) => sendResponse({ success: false, error: err?.message || "Image fetch failed" }));
          return true;
        }
      });
      if (chrome.runtime?.onInstalled) {
        chrome.runtime.onInstalled.addListener(() => {
          if (!chrome.tabs || !chrome.scripting) return;
          chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
            for (const tab of tabs || []) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: "MAIN",
                files: ["dist/main_world.js"]
              }).catch(() => {
              });
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["dist/content.js"]
              }).catch(() => {
              });
              chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ["dist/content.css"]
              }).catch(() => {
              });
            }
          });
        });
      }
      function updateBadge(enabled) {
        if (typeof chrome !== "undefined" && chrome.action && chrome.action.setBadgeText) {
          if (!enabled) {
            chrome.action.setBadgeText({ text: "OFF" });
            if (chrome.action.setBadgeBackgroundColor) {
              chrome.action.setBadgeBackgroundColor({ color: "#6e7681" });
            }
          } else {
            chrome.action.setBadgeText({ text: "" });
          }
        }
      }
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["extensionEnabled"], (res) => {
          const enabled = res?.extensionEnabled !== void 0 ? Boolean(res.extensionEnabled) : true;
          updateBadge(enabled);
        });
        chrome.storage.onChanged?.addListener((changes, area) => {
          if (area === "local" && changes.extensionEnabled !== void 0) {
            updateBadge(Boolean(changes.extensionEnabled.newValue));
          }
        });
      }
    }
  };

  // src/background/index.js
  if (typeof globalThis !== "undefined") {
    globalThis.PROVIDER_CONFIGS = PROVIDER_CONFIGS;
  }
  MessageRouter.init();
})();
