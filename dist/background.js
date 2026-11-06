(() => {
  // src/config/AIProviderPresets.js
  var CLOUD_MODELS = {
    gemini: [
      { id: "gemini-1.5-flash", name: "\u2B50 gemini-1.5-flash (Gratuit, 1M ctx)" },
      { id: "gemini-2.0-flash", name: "gemini-2.0-flash (Nouveau & Rapide)" },
      { id: "gemini-1.5-pro", name: "gemini-1.5-pro (Analyse approfondie)" }
    ],
    groq: [
      { id: "llama-3.3-70b-versatile", name: "\u2B50 llama-3.3-70b-versatile (Ultra-rapide)" },
      { id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b (R1 Thinking)" },
      { id: "llama-3.1-8b-instant", name: "llama-3.1-8b-instant (\xC9clair)" },
      { id: "mixtral-8x7b-32768", name: "mixtral-8x7b-32768 (Mixtral)" }
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
      { id: "google/gemini-2.0-flash-exp:free", name: "google/gemini-2.0-flash-exp (Gratuit)" }
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
  var PROVIDER_CONFIGS = {
    lmstudio: { name: "LM Studio (Local)" },
    ollama: { name: "Ollama (Local / Cloud)" },
    gemini: {
      name: "Google Gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      defaultModel: "gemini-1.5-flash"
    },
    groq: {
      name: "Groq (Inf\xE9rence Rapide)",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      defaultModel: "llama-3.3-70b-versatile"
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

  // src/background/StreamRelay.js
  var StreamRelay = class {
    /**
     * Connects and streams LLM response to client port
     * @param {Object} request
     * @param {chrome.runtime.Port} port
     */
    static async handleStream(request, port) {
      const {
        provider = "lmstudio",
        model,
        systemPrompt,
        userPrompt,
        messages = null,
        temperature = 0.3,
        maxTokens,
        serverUrl,
        apiKey
      } = request;
      let isDisconnected = false;
      const abortController = new AbortController();
      if (port?.onDisconnect?.addListener) {
        port.onDisconnect.addListener(() => {
          isDisconnected = true;
          try {
            abortController.abort();
          } catch (_) {
          }
        });
      }
      const safePost = (msg) => {
        if (isDisconnected) return;
        try {
          port.postMessage(msg);
        } catch (_) {
          isDisconnected = true;
        }
      };
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
          await this.streamClaude(port, apiKey, model, systemPrompt, chatMessages, temperature, maxTokens, abortController.signal, safePost);
        } else {
          await this.streamOpenAICompatible(port, provider, serverUrl, apiKey, model, chatMessages, temperature, maxTokens, abortController.signal, safePost);
        }
        safePost({ type: "DONE" });
      } catch (err) {
        if (isDisconnected || abortController.signal.aborted) return;
        const userFriendlyError = this.formatContextError(err.message || String(err), provider);
        safePost({ type: "ERROR", error: userFriendlyError });
      }
    }
    /**
     * Formats token context limit errors with actionable user hints
     */
    static formatContextError(rawError, provider) {
      const lower = (rawError || "").toLowerCase();
      if (lower.includes("context") || lower.includes("token") || lower.includes("maximum context length") || lower.includes("num_ctx") || lower.includes("too long")) {
        if (provider === "lmstudio" || provider === "ollama") {
          const toolName = provider === "ollama" ? "Ollama" : "LM Studio";
          const hint = provider === "ollama" ? "r\xE9glez num_ctx \xE0 8192" : "augmentez 'Context Length' \xE0 8192 ou 16384";
          return `D\xE9passement de contexte ${toolName} : La transcription d\xE9passe la m\xE9moire allou\xE9e au mod\xE8le. Dans ${toolName}, ${hint}, ou utilisez Google Gemini (1 million de tokens gratuit). D\xE9tail: ${rawError}`;
        }
        return `D\xE9passement de contexte : Le texte est trop long pour la fen\xEAtre du mod\xE8le (${rawError}).`;
      }
      return rawError;
    }
    /**
     * Streams from OpenAI-compatible endpoints (LM Studio, Ollama, Groq, Gemini, DeepSeek, etc.)
     */
    static async streamOpenAICompatible(port, provider, serverUrl, apiKey, model, messages, temperature, maxTokens, signal = null, safePost = null) {
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
      const bodyPayload = {
        model,
        messages,
        temperature: !isNaN(parsedTemp) ? parsedTemp : 0.3,
        stream: true
      };
      if (maxTokens && maxTokens !== "auto") {
        const parsedMax = parseInt(maxTokens, 10);
        if (!isNaN(parsedMax) && parsedMax > 0) {
          bodyPayload.max_tokens = parsedMax;
        }
      }
      const fetchOptions = {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload)
      };
      if (signal) fetchOptions.signal = signal;
      const response = await fetch(endpoint, fetchOptions);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur ${provider.toUpperCase()} (${response.status}) : ${errText || response.statusText}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
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
          if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta || {};
              const chunkMsg = {
                type: "CHUNK",
                content: delta.content || "",
                reasoning: delta.reasoning_content || "",
                text: delta.content || ""
              };
              if (safePost) safePost(chunkMsg);
              else port.postMessage(chunkMsg);
            } catch (e) {
            }
          }
        }
      }
    }
    /**
     * Streams from Anthropic Claude API (/v1/messages)
     */
    static async streamClaude(port, apiKey, model, systemPrompt, messages, temperature, maxTokens, signal = null, safePost = null) {
      if (!apiKey) throw new Error("Cl\xE9 API Claude requise");
      const claudeMessages = messages.filter((m) => m.role !== "system");
      const systemContent = systemPrompt || (messages.find((m) => m.role === "system")?.content || "");
      const parsedTemp = parseFloat(temperature);
      const parsedMax = parseInt(maxTokens, 10);
      const bodyPayload = {
        model: model || "claude-3-5-haiku-20241022",
        max_tokens: !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 4096,
        system: systemContent,
        messages: claudeMessages,
        stream: true
      };
      if (!isNaN(parsedTemp)) {
        bodyPayload.temperature = Math.max(0, Math.min(parsedTemp, 1));
      }
      const fetchOptions = {
        method: "POST",
        headers: {
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify(bodyPayload)
      };
      if (signal) fetchOptions.signal = signal;
      const response = await fetch(PROVIDER_CONFIGS.claude.endpoint, fetchOptions);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur Claude (${response.status}) : ${errText}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
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
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const chunkMsg = {
                  type: "CHUNK",
                  content: parsed.delta.text,
                  reasoning: "",
                  text: parsed.delta.text
                };
                if (safePost) safePost(chunkMsg);
                else port.postMessage(chunkMsg);
              }
            } catch (e) {
            }
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
     */
    constructor(id, displayName, isLocalProvider = false) {
      super();
      this.id = id;
      this.displayName = displayName;
      this.isLocalProvider = isLocalProvider;
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

  // src/services/ai/providers/LMStudioProvider.js
  var LMStudioProvider = class extends BaseAIProvider {
    constructor() {
      super("lmstudio", "LM Studio", true);
    }
    /**
     * Fetches models from LM Studio /v1/models
     * @param {string} serverUrl
     * @returns {Promise<Array<{ id: string, name?: string }>>}
     */
    async fetchModels(serverUrl = "http://127.0.0.1:1234") {
      const cleanUrl = this.normalizeUrl(serverUrl, "http://127.0.0.1:1234");
      const res = await this.fetchWithTimeout(`${cleanUrl}/v1/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.data || []).map((m) => ({ id: m.id, name: m.id }));
    }
    /**
     * Tests connection and latency
     * @param {string} serverUrl
     * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
     */
    async testConnection(serverUrl = "http://127.0.0.1:1234") {
      const start = performance.now();
      try {
        const cleanUrl = this.normalizeUrl(serverUrl, "http://127.0.0.1:1234");
        const res = await this.fetchWithTimeout(`${cleanUrl}/v1/models`, {}, 3e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
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
      super("gemini", "Google Gemini", false);
      this.endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
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
    async testConnection(_serverUrl, apiKey, model = "gemini-1.5-flash") {
      if (!apiKey) return { ok: false, error: "API Key missing" };
      const start = performance.now();
      try {
        const res = await this.fetchWithTimeout(this.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          })
        }, 5e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/GroqProvider.js
  var GroqProvider = class extends BaseAIProvider {
    constructor() {
      super("groq", "Groq (Ultra-Fast)", false);
      this.endpoint = "https://api.groq.com/openai/v1/chat/completions";
    }
    async fetchModels() {
      return CLOUD_MODELS.groq || [];
    }
    async testConnection(_serverUrl, apiKey, model = "llama-3.3-70b-versatile") {
      if (!apiKey) return { ok: false, error: "API Key missing" };
      const start = performance.now();
      try {
        const res = await this.fetchWithTimeout(this.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          })
        }, 5e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/OpenAIProvider.js
  var OpenAIProvider = class extends BaseAIProvider {
    constructor() {
      super("openai", "OpenAI", false);
      this.endpoint = "https://api.openai.com/v1/chat/completions";
    }
    async fetchModels() {
      return CLOUD_MODELS.openai || [];
    }
    async testConnection(_serverUrl, apiKey, model = "gpt-4o-mini") {
      if (!apiKey) return { ok: false, error: "API Key missing" };
      const start = performance.now();
      try {
        const res = await this.fetchWithTimeout(this.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          })
        }, 5e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/ClaudeProvider.js
  var ClaudeProvider = class extends BaseAIProvider {
    constructor() {
      super("claude", "Anthropic Claude", false);
      this.endpoint = "https://api.anthropic.com/v1/messages";
    }
    async fetchModels() {
      return CLOUD_MODELS.claude || [];
    }
    async testConnection(_serverUrl, apiKey, model = "claude-3-5-haiku-20241022") {
      if (!apiKey) return { ok: false, error: "API Key missing" };
      const start = performance.now();
      try {
        const res = await this.fetchWithTimeout(this.endpoint, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          })
        }, 5e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
  };

  // src/services/ai/providers/DeepSeekProvider.js
  var DeepSeekProvider = class extends BaseAIProvider {
    constructor() {
      super("deepseek", "DeepSeek", false);
      this.endpoint = "https://api.deepseek.com/chat/completions";
    }
    async fetchModels() {
      return CLOUD_MODELS.deepseek || [];
    }
    async testConnection(_serverUrl, apiKey, model = "deepseek-chat") {
      if (!apiKey) return { ok: false, error: "API Key missing" };
      const start = performance.now();
      try {
        const res = await this.fetchWithTimeout(this.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          })
        }, 5e3);
        const latencyMs = Math.round(performance.now() - start);
        return { ok: res.ok, latencyMs };
      } catch (err) {
        return { ok: false, error: err.message };
      }
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
          instance = new BaseAIProvider(id, id.toUpperCase(), false);
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
      try {
        const fastResult = await _BackgroundTranscriptFetcher.fetchDirect(videoId, lang);
        if (fastResult?.segments?.length > 0) {
          return { success: true, segments: fastResult.segments, title: fastResult.title };
        }
      } catch (_) {
      }
      if (chrome?.tabs?.create && chrome?.scripting?.executeScript) {
        try {
          const tabResult = await _BackgroundTranscriptFetcher.fetchViaBackgroundTab(videoId, lang);
          if (tabResult?.segments?.length > 0) {
            return { success: true, segments: tabResult.segments, title: tabResult.title };
          }
        } catch (_) {
        }
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
      const timedtextSegments = _BackgroundTranscriptFetcher.extractTimedtextFromHtml(html, lang);
      if (timedtextSegments?.length > 0) {
        return { title, segments: timedtextSegments };
      }
      const chapters = _BackgroundTranscriptFetcher.extractChaptersFromHtml(html);
      if (chapters?.length > 0) {
        return { title, segments: chapters };
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
                      return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments };
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
                        return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments };
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
                    return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments: chapters };
                  }
                  const domMarkers = Array.from(document.querySelectorAll("ytd-macro-markers-list-item-renderer, macro-markers-panel-item-view-model"));
                  if (domMarkers.length > 0) {
                    const domChapters = domMarkers.map((el) => {
                      const timeEl = el.querySelector('#time, [class*="time"]');
                      const titleEl = el.querySelector("h3:not([hidden]), h4:not([hidden]), #title:not([hidden])");
                      return { timestamp: timeEl?.textContent?.trim() || "", text: titleEl?.textContent?.trim() || "" };
                    }).filter((c) => c.timestamp && c.text);
                    if (domChapters.length > 0) {
                      return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim(), segments: domChapters };
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

  // src/background/ChannelIntelligenceFetcher.js
  var ChannelIntelligenceFetcher = class {
    /**
     * Fetches official channel dossier by creator handle, URL or search query
     * @param {string} query Handle (@JulienChieze), URL or search query
     * @param {number} [limit=30]
     * @returns {Promise<{success: boolean, channel?: Object, error?: string}>}
     */
    static async fetchChannelDossier(query, limit = 30) {
      try {
        if (!query || typeof query !== "string") {
          throw new Error("Query string is required");
        }
        const cleanQuery = query.trim();
        let canonicalPath = await this.resolveChannelPath(cleanQuery);
        if (!canonicalPath) {
          throw new Error(`Impossible de trouver la cha\xEEne YouTube pour : "${cleanQuery}"`);
        }
        if (!canonicalPath.endsWith("/videos")) {
          canonicalPath = canonicalPath.replace(/\/+$/, "") + "/videos";
        }
        const channelUrl = `https://www.youtube.com${canonicalPath}`;
        const response = await fetch(channelUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} lors de l'acc\xE8s \xE0 la cha\xEEne`);
        }
        const html = await response.text();
        const ytDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (!ytDataMatch) {
          throw new Error("Impossible d'extraire ytInitialData de la page cha\xEEne");
        }
        const data = JSON.parse(ytDataMatch[1]);
        const dossier = this.parseChannelData(data, canonicalPath, limit);
        return { success: true, channel: dossier };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    }
    /**
     * Resolves search query or handle to canonical YouTube channel path
     * @param {string} rawQuery
     * @returns {Promise<string|null>}
     */
    static async resolveChannelPath(rawQuery) {
      if (rawQuery.startsWith("http://") || rawQuery.startsWith("https://")) {
        try {
          const parsed = new URL(rawQuery);
          return parsed.pathname;
        } catch (_) {
        }
      }
      if (rawQuery.startsWith("@")) {
        return `/${rawQuery}`;
      }
      if (rawQuery.startsWith("/@") || rawQuery.startsWith("/channel/") || rawQuery.startsWith("/c/")) {
        return rawQuery;
      }
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}&sp=EgIQAg%253D%253D`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      if (!searchRes.ok) return null;
      const html = await searchRes.text();
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) return null;
      try {
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        const itemSection = contents?.[0]?.itemSectionRenderer?.contents;
        const channelRenderer = itemSection?.find((c) => c.channelRenderer)?.channelRenderer;
        if (channelRenderer?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl) {
          return channelRenderer.navigationEndpoint.browseEndpoint.canonicalBaseUrl;
        }
      } catch (_) {
      }
      return null;
    }
    /**
     * Parses channel header, subscriber count, bio, and latest videos from ytInitialData
     */
    static parseChannelData(data, canonicalPath, limit = 30) {
      const header = data.header?.pageHeaderRenderer;
      const title = header?.pageTitle || "";
      const bio = header?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content || "";
      let handle = canonicalPath.replace(/^\//, "").replace(/\/videos$/, "");
      let subscribers = "";
      let videoCount = "";
      const metadataRows = header?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      for (const row of metadataRows) {
        for (const part of row.metadataParts || []) {
          const text = part.text?.content || "";
          if (text.startsWith("@")) handle = text;
          else if (/abonn[ée]|subscriber/i.test(text)) subscribers = text;
          else if (/vid[ée]o/i.test(text)) videoCount = text;
        }
      }
      const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const videosTab = tabs.find((t) => t.tabRenderer?.content?.richGridRenderer);
      const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
      const recentVideos = [];
      for (const item of contents) {
        if (recentVideos.length >= limit) break;
        const lockup = item.richItemRenderer?.content?.lockupViewModel;
        if (!lockup) continue;
        const vTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || "";
        const vId = lockup.contentId || "";
        const metaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        const parts = [];
        for (const r of metaRows) {
          for (const p of r.metadataParts || []) {
            if (p.text?.content) parts.push(p.text.content);
          }
        }
        recentVideos.push({
          id: vId,
          title: vTitle,
          url: vId ? `https://www.youtube.com/watch?v=${vId}` : "",
          meta: parts.join(" \u2022 ")
        });
      }
      const markdownDossier = this.formatMarkdownDossier({
        title,
        handle,
        subscribers,
        videoCount,
        bio,
        recentVideos
      });
      return {
        title,
        handle,
        subscribers,
        videoCount,
        bio,
        recentVideos,
        markdownDossier
      };
    }
    /**
     * Formats structured dossier into concise Markdown block for prompt context
     */
    static formatMarkdownDossier(dossier) {
      const { title, handle, subscribers, videoCount, bio, recentVideos = [] } = dossier;
      const lines = [
        `### \u{1F4FA} DOSSIER OFFICIEL DE LA CHA\xCENE : ${title || "Cr\xE9ateur YouTube"} (${handle || ""})`,
        `- **Audience & Volume** : ${subscribers || "Non communiqu\xE9"} \u2022 ${videoCount || `${recentVideos.length} vid\xE9os r\xE9centes`}`
      ];
      if (bio) {
        lines.push(`- **Bio Officielle** :
"""
${bio.slice(0, 1e3)}
"""`);
      }
      if (recentVideos.length > 0) {
        lines.push(`- **Derni\xE8res vid\xE9os publi\xE9es (${recentVideos.length})** :`);
        recentVideos.forEach((v, idx) => {
          lines.push(`  ${idx + 1}. **${v.title}** ${v.meta ? `(${v.meta})` : ""} - https://youtu.be/${v.id}`);
        });
      }
      return lines.join("\n");
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
        const cleanText = c.text.replace(/\n+/g, " ").slice(0, 300);
        lines.push(`- **${c.author}** (${c.likes} likes, ${c.time}) : "${cleanText}"`);
      });
      return lines.join("\n");
    }
  };

  // src/background/MessageRouter.js
  var MessageRouter = class {
    static init() {
      chrome.runtime.onConnect.addListener((port) => {
        if (port.name === "ai-stream" || port.name === "lm-studio-stream" || port.name === "YT_AI_STREAM") {
          port.onMessage.addListener((msg) => {
            if (msg.action === "START_STREAM" || msg.action === "CHAT_STREAM" || msg.action === "STREAM_CHAT") {
              StreamRelay.handleStream(msg, port);
            }
          });
        }
      });
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "FETCH_MODELS") {
          const provider = AIProviderFactory.getProvider(request.provider || "lmstudio");
          provider.fetchModels(request.serverUrl, request.apiKey).then((models) => {
            sendResponse({
              success: true,
              ok: true,
              data: { data: models, models },
              models
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
        if (request.action === "FETCH_CHANNEL_DOSSIER") {
          const { query, limit = 30 } = request;
          ChannelIntelligenceFetcher.fetchChannelDossier(query, limit).then((res) => sendResponse(res)).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_WATCH_PAGE_TRANSCRIPT") {
          const { videoId, lang = "fr" } = request;
          BackgroundTranscriptFetcher.fetchTranscript(videoId, lang).then((res) => sendResponse(res)).catch((err) => sendResponse({ success: false, error: err.message }));
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
