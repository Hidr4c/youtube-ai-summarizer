/**
 * In-Page Application State and Chrome Storage Synchronization
 */
export function createInPageState() {
  return {
    extensionEnabled: true,
    currentProvider: 'lmstudio',
    serverUrls: { lmstudio: 'http://127.0.0.1:1234', ollama: 'http://localhost:11434' },
    apiKeys: { openai: '', gemini: '', claude: '', groq: '', deepseek: '' },
    selectedModels: {},
    availableLocalModels: {},
    currentLang: 'fr',
    temperature: '0.3',
    maxTokens: 'auto',
    ttsSpeed: '1.0',
    localWhisperUrl: 'http://127.0.0.1:8000',
    autoSummarize: false,
    customPrompt: '',
    selectedVoiceURI: '',
    selectedMicDeviceId: '',
    cachedAuditReport: null,
    getActiveModel() {
      return this.selectedModels[this.currentProvider] || '';
    },
    setActiveModel(m) {
      this.selectedModels[this.currentProvider] = m;
    },
    savePreference(key, val) {
      if (chrome?.storage?.local) chrome.storage.local.set({ [key]: val });
    }
  };
}

export function loadPreferences(state, callback) {
  if (!chrome?.storage?.local) return callback?.();
  chrome.storage.local.get(null, (items = {}) => {
    if (typeof items.extensionEnabled === 'boolean') state.extensionEnabled = items.extensionEnabled;
    if (items.aiProvider) state.currentProvider = items.aiProvider;
    if (items.targetLang) state.currentLang = items.targetLang;
    if (items.selectedModel) state.setActiveModel(items.selectedModel);
    if (items.summaryMode) state.summaryMode = items.summaryMode;
    if (items.temperature) state.temperature = items.temperature;
    if (items.maxTokens) state.maxTokens = items.maxTokens;
    if (typeof items.autoSummarize === 'boolean') state.autoSummarize = items.autoSummarize;
    if (items.localWhisperUrl) state.localWhisperUrl = items.localWhisperUrl;
    if (items.ttsSpeed) state.ttsSpeed = items.ttsSpeed;
    if (items.selectedVoiceURI) state.selectedVoiceURI = items.selectedVoiceURI;
    ['openai', 'gemini', 'claude', 'groq', 'deepseek', 'lmstudio', 'ollama'].forEach(p => {
      if (items[`apiKey_${p}`]) state.apiKeys[p] = items[`apiKey_${p}`];
      if (items[`serverUrl_${p}`]) state.serverUrls[p] = items[`serverUrl_${p}`];
      if (items[`selectedModel_${p}`]) state.selectedModels[p] = items[`selectedModel_${p}`];
    });
    callback?.();
  });
}

export default createInPageState;
