/**
 * Global Extension Constants, Storage Keys & Action Enums
 */

export const ACTIONS = {
  STREAM_CHAT: 'STREAM_CHAT',
  FETCH_MODELS: 'FETCH_MODELS',
  PING_SERVER: 'PING_SERVER',
  FETCH_TIMEDTEXT: 'FETCH_TIMEDTEXT',
  EXTRACT_PAGE_TRANSCRIPT: 'EXTRACT_PAGE_TRANSCRIPT'
};

export const DEFAULT_URLS = {
  LMSTUDIO: 'http://192.168.56.1:1234',
  OLLAMA: 'http://localhost:11434'
};

export const FORMAT_MODES = {
  QUICK: 'quick',
  STANDARD: 'standard',
  DETAILED: 'detailed'
};

export const DEFAULT_SETTINGS = {
  aiProvider: 'lmstudio',
  targetLang: 'en',
  summaryMode: 'standard',
  serverUrl_lmstudio: 'http://192.168.56.1:1234',
  serverUrl_ollama: 'http://localhost:11434',
  temperature: '0.3',
  maxTokens: 'auto',
  ttsSpeed: '1.0',
  autoSummarize: false,
  customPrompt: ''
};
