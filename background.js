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
      const { provider = "lmstudio", model, messages, temperature = 0.3, maxTokens, serverUrl, apiKey } = request;
      const config = PROVIDER_CONFIGS[provider] || {};
      let endpoint = config.endpoint;
      let headers = { "Content-Type": "application/json" };
      if (provider === "lmstudio" || provider === "ollama") {
        const base = (serverUrl || (provider === "ollama" ? "http://localhost:11434" : "http://192.168.56.1:1234")).replace(/\/+$/, "");
        endpoint = `${base}/v1/chat/completions`;
      }
      if (apiKey) {
        if (provider === "claude") {
          headers["x-api-key"] = apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }
      const bodyPayload = {
        model,
        messages,
        temperature: Number(temperature) || 0.3,
        stream: true
      };
      if (maxTokens && maxTokens !== "auto") {
        bodyPayload.max_tokens = Number(maxTokens);
      }
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload)
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          port.postMessage({ type: "ERROR", error: errJson.error?.message || `HTTP ${res.status}` });
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed === "data: [DONE]") {
              port.postMessage({ type: "DONE" });
              return;
            }
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const delta = data.choices?.[0]?.delta;
                if (delta) {
                  if (delta.reasoning_content) {
                    port.postMessage({ type: "REASONING_CHUNK", text: delta.reasoning_content });
                  }
                  if (delta.content) {
                    port.postMessage({ type: "CHUNK", text: delta.content });
                  }
                }
              } catch {
              }
            }
          }
        }
        port.postMessage({ type: "DONE" });
      } catch (err) {
        port.postMessage({ type: "ERROR", error: err.message || "Stream connection failed" });
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
    async fetchModels(serverUrl = "http://192.168.56.1:1234") {
      const cleanUrl = serverUrl.replace(/\/+$/, "");
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
    async testConnection(serverUrl = "http://192.168.56.1:1234") {
      const start = performance.now();
      try {
        const cleanUrl = serverUrl.replace(/\/+$/, "");
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
      const cleanUrl = serverUrl.replace(/\/+$/, "");
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
        const cleanUrl = serverUrl.replace(/\/+$/, "");
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

  // src/background/MessageRouter.js
  var MessageRouter = class {
    static init() {
      chrome.runtime.onConnect.addListener((port) => {
        if (port.name === "YT_AI_STREAM") {
          port.onMessage.addListener((msg) => {
            if (msg.action === "STREAM_CHAT") {
              StreamRelay.handleStream(msg, port);
            }
          });
        }
      });
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "FETCH_MODELS") {
          const provider = AIProviderFactory.getProvider(request.provider || "lmstudio");
          provider.fetchModels(request.serverUrl, request.apiKey).then((models) => sendResponse({ ok: true, data: models })).catch((err) => sendResponse({ ok: false, error: err.message }));
          return true;
        }
        if (request.action === "PING_SERVER") {
          const provider = AIProviderFactory.getProvider(request.provider || "lmstudio");
          provider.testConnection(request.serverUrl, request.apiKey, request.model).then((result) => sendResponse(result)).catch((err) => sendResponse({ ok: false, error: err.message }));
          return true;
        }
        if (request.action === "FETCH_TIMEDTEXT") {
          fetch(request.url).then((r) => r.json()).then((data) => sendResponse({ ok: true, data })).catch((err) => sendResponse({ ok: false, error: err.message }));
          return true;
        }
      });
    }
  };

  // src/background/index.js
  if (typeof globalThis !== "undefined") {
    globalThis.PROVIDER_CONFIGS = PROVIDER_CONFIGS;
  }
  MessageRouter.init();
})();
