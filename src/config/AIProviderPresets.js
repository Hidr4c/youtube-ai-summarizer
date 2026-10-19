/**
 * AI Provider Configurations, Model Presets & Context Limits
 */

export const CLOUD_MODELS = {
  gemini: [
    { id: 'gemini-1.5-flash', name: '⭐ gemini-1.5-flash (Gratuit, 1M ctx)' },
    { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Nouveau & Rapide)' },
    { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (Analyse approfondie)' }
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: '⭐ llama-3.3-70b-versatile (Ultra-rapide)' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'deepseek-r1-distill-llama-70b (R1 Thinking)' },
    { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant (Éclair)' },
    { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768 (Mixtral)' }
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
    { id: 'google/gemini-2.0-flash-exp:free', name: 'google/gemini-2.0-flash-exp (Gratuit)' }
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
    defaultModel: 'gemini-1.5-flash'
  },
  groq: {
    name: 'Groq (Inférence Rapide)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile'
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
