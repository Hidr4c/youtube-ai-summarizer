/**
 * AI Provider Configurations, Model Presets & Context Limits
 */

export const CLOUD_MODELS = {
  gemini: [
    { id: 'gemini-flash-latest', name: '⭐ gemini-flash-latest (Gratuit, Auto-à-jour)' },
    { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (Rapide & Polyvalent)' },
    { id: 'gemini-3.5-flash-lite', name: 'gemini-3.5-flash-lite (Ultra-léger, Gratuit)' },
    { id: 'gemini-pro-latest', name: 'gemini-pro-latest (Analyse approfondie)' }
  ],
  groq: [
    { id: 'openai/gpt-oss-120b', name: '⭐ openai/gpt-oss-120b (Puissant & Gratuit)' },
    { id: 'openai/gpt-oss-20b', name: 'openai/gpt-oss-20b (Ultra-rapide)' },
    { id: 'qwen/qwen3.8-27b', name: 'qwen/qwen3.8-27b (Polyvalent)' }
  ],
  openai: [
    { id: 'gpt-4o-mini', name: '⭐ gpt-4o-mini (Économique & Rapide)' },
    { id: 'gpt-4o', name: 'gpt-4o (Modèle phare)' },
    { id: 'o3-mini', name: 'o3-mini (Raisonnement)' }
  ],
  claude: [
    { id: 'claude-3-5-haiku-20241022', name: '⭐ claude-3-5-haiku (Rapide)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet (Excellence)' }
  ],
  deepseek: [
    { id: 'deepseek-chat', name: '⭐ deepseek-chat (V3)' },
    { id: 'deepseek-reasoner', name: 'deepseek-reasoner (R1 Thinking)' }
  ],
  grok: [
    { id: 'grok-2-latest', name: '⭐ grok-2-latest' },
    { id: 'grok-2-vision-1212', name: 'grok-2-vision' },
    { id: 'grok-beta', name: 'grok-beta' }
  ],
  qwen: [
    { id: 'qwen-plus', name: '⭐ qwen-plus (Équilibré & Efficace)' },
    { id: 'qwen-max', name: 'qwen-max (Maximum de puissance)' },
    { id: 'qwen-turbo', name: 'qwen-turbo (Ultra rapide)' },
    { id: 'qwen2.5-72b-instruct', name: 'qwen2.5-72b-instruct' }
  ],
  mistral: [
    { id: 'mistral-small-latest', name: '⭐ mistral-small-latest (Rapide)' },
    { id: 'mistral-large-latest', name: 'mistral-large-latest (Modèle phare)' },
    { id: 'codestral-latest', name: 'codestral-latest' }
  ],
  openrouter: [
    { id: 'deepseek/deepseek-r1', name: '⭐ deepseek/deepseek-r1' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'qwen/qwen-2.5-72b-instruct' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'meta-llama/llama-3.3-70b-instruct' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'anthropic/claude-3.5-sonnet' },
    { id: 'openai/gpt-oss-120b', name: 'openai/gpt-oss-120b' }
  ],
  perplexity: [
    { id: 'sonar', name: '⭐ sonar (Rapide)' },
    { id: 'sonar-pro', name: 'sonar-pro' },
    { id: 'sonar-reasoning', name: 'sonar-reasoning' }
  ],
  together: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: '⭐ Llama-3.3-70B-Instruct-Turbo' },
    { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen2.5-72B-Instruct-Turbo' },
    { id: 'deepseek-ai/DeepSeek-R1', name: 'deepseek-ai/DeepSeek-R1' }
  ]
};

export const API_KEY_PORTALS = {
  gemini: { url: 'https://aistudio.google.com/app/apikey', label: '🔑 Obtenir clé Gemini (100% Gratuite)' },
  groq: { url: 'https://console.groq.com/keys', label: '🔑 Obtenir clé Groq (Gratuite & Ultra-rapide)' },
  openai: { url: 'https://platform.openai.com/api-keys', label: '🔑 Obtenir clé OpenAI' },
  claude: { url: 'https://console.anthropic.com/settings/keys', label: '🔑 Obtenir clé Claude' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', label: '🔑 Obtenir clé DeepSeek' },
  grok: { url: 'https://console.x.ai/', label: '🔑 Obtenir clé Grok (xAI)' },
  qwen: { url: 'https://dashscope.console.aliyun.com/', label: '🔑 Obtenir clé Qwen (DashScope)' },
  mistral: { url: 'https://console.mistral.ai/api-keys/', label: '🔑 Obtenir clé Mistral' },
  openrouter: { url: 'https://openrouter.ai/keys', label: '🔑 Obtenir clé OpenRouter' },
  perplexity: { url: 'https://www.perplexity.ai/settings/api', label: '🔑 Obtenir clé Perplexity' },
  together: { url: 'https://api.together.xyz/settings/api-keys', label: '🔑 Obtenir clé Together AI' }
};

export const CONTEXT_LIMITS = {
  lmstudio: 16000,
  ollama: 16000,
  gemini: 120000,
  groq: 50000,
  openai: 80000,
  claude: 90000,
  deepseek: 50000,
  grok: 70000,
  qwen: 60000,
  mistral: 60000,
  openrouter: 80000,
  perplexity: 50000,
  together: 60000
};

/**
 * Computes transcript character budget tailored to configured local context window.
 * @param {string} provider
 * @param {string|number} [localContextLength='auto']
 * @returns {number}
 */
export function resolveContextCharLimit(provider, localContextLength = 'auto') {
  const baseLimit = CONTEXT_LIMITS[provider] || 25000;
  if (provider !== 'lmstudio' && provider !== 'ollama') return baseLimit;
  if (!localContextLength || localContextLength === 'auto') return baseLimit;
  const ctxTokens = parseInt(String(localContextLength), 10);
  if (!Number.isFinite(ctxTokens) || ctxTokens < 2048) return baseLimit;
  return Math.max(8000, Math.min(90000, Math.floor((ctxTokens - 3000) * 3)));
}

export const PROVIDER_NAMES = {
  lmstudio: 'LM Studio',
  ollama: 'Ollama',
  gemini: 'Google Gemini',
  groq: 'Groq',
  openai: 'OpenAI (ChatGPT)',
  claude: 'Anthropic Claude',
  deepseek: 'DeepSeek',
  grok: 'xAI (Grok)',
  qwen: 'Qwen (DashScope)',
  mistral: 'Mistral AI',
  openrouter: 'OpenRouter',
  perplexity: 'Perplexity AI',
  together: 'Together AI'
};

export const PROVIDER_CONFIGS = {
  lmstudio: { name: 'LM Studio (Local)' },
  ollama: { name: 'Ollama (Local / Cloud)' },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-flash-latest'
  },
  groq: {
    name: 'Groq (Inférence Rapide)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'openai/gpt-oss-120b'
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini'
  },
  claude: {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-haiku-20241022'
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat'
  },
  grok: {
    name: 'xAI (Grok)',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-2-latest'
  },
  qwen: {
    name: 'Qwen (Alibaba DashScope)',
    endpoint: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus'
  },
  mistral: {
    name: 'Mistral AI',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest'
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'deepseek/deepseek-r1'
  },
  perplexity: {
    name: 'Perplexity AI',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    defaultModel: 'sonar'
  },
  together: {
    name: 'Together AI',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  }
};

export const DEPRECATED_MODEL_ALIASES = {
  gemini: {
    'gemini-1.5-flash': 'gemini-flash-latest',
    'gemini-1.5-flash-latest': 'gemini-flash-latest',
    'gemini-1.5-flash-001': 'gemini-flash-latest',
    'gemini-1.5-flash-002': 'gemini-flash-latest',
    'gemini-1.5-pro': 'gemini-pro-latest',
    'gemini-1.5-pro-latest': 'gemini-pro-latest',
    'gemini-2.0-flash': 'gemini-flash-latest',
    'gemini-2.0-flash-exp': 'gemini-flash-latest',
    'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite'
  },
  groq: {
    'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
    'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
    'mixtral-8x7b-32768': 'openai/gpt-oss-120b',
    'llama3-70b-8192': 'openai/gpt-oss-120b',
    'llama3-8b-8192': 'openai/gpt-oss-20b',
    'gemma2-9b-it': 'openai/gpt-oss-20b',
    'deepseek-r1-distill-llama-70b': 'openai/gpt-oss-120b'
  },
  claude: {
    'claude-3-5-sonnet-20240620': 'claude-3-5-sonnet-20241022',
    'claude-3-sonnet-20240229': 'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229': 'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307': 'claude-3-5-haiku-20241022'
  },
  openai: {
    'gpt-4-vision-preview': 'gpt-4o',
    'gpt-4-32k': 'gpt-4o',
    'gpt-3.5-turbo-16k': 'gpt-4o-mini'
  },
  mistral: {
    'open-mistral-7b': 'mistral-small-latest',
    'open-mixtral-8x7b': 'mistral-small-latest',
    'mistral-tiny': 'mistral-small-latest',
    'mistral-medium': 'mistral-large-latest'
  },
  openrouter: {
    'google/gemini-2.0-flash-exp:free': 'deepseek/deepseek-r1',
    'meta-llama/llama-3.1-8b-instruct:free': 'deepseek/deepseek-r1'
  }
};

/**
 * Resolves known retired cloud model IDs to their active replacement cleanly.
 * @param {string} provider
 * @param {string} modelId
 * @returns {string}
 */
export function resolveDeprecatedModel(provider, modelId) {
  const cleanProvider = String(provider || '').toLowerCase();
  const rawModel = String(modelId || '').trim();
  const cleanModel = cleanProvider === 'gemini' ? rawModel.replace(/^models\//, '') : rawModel;
  if (!cleanModel) return PROVIDER_CONFIGS[cleanProvider]?.defaultModel || '';
  const aliasMap = DEPRECATED_MODEL_ALIASES[cleanProvider];
  return (aliasMap && aliasMap[cleanModel]) ? aliasMap[cleanModel] : cleanModel;
}

export const LANG_LOCALES = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  ru: 'ru-RU',
  ja: 'ja-JP',
  zh: 'zh-CN'
};
