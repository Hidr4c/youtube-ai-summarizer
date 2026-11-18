import { parseChannelAuditLimit } from '../../config/ExtensionConstants.js';
import { PROVIDER_CONFIGS } from '../../config/AIProviderPresets.js';

const ALL_PERSISTED_PROVIDERS = [...Object.keys(PROVIDER_CONFIGS), 'lmstudio', 'ollama'];

/**
 * In-Page Application State and Chrome Storage Synchronization
 */
export function createInPageState() {
  const apiKeys = {};
  Object.keys(PROVIDER_CONFIGS).forEach((p) => { apiKeys[p] = ''; });

  return {
    extensionEnabled: true,
    currentProvider: 'lmstudio',
    serverUrls: { lmstudio: 'http://localhost:1234', ollama: 'http://localhost:11434' },
    apiKeys,
    keyVerified: {},
    selectedModels: {},
    availableLocalModels: {},
    currentLang: 'fr',
    temperature: '0.3',
    maxTokens: 'auto',
    ttsSpeed: '1.0',
    localWhisperUrl: 'http://127.0.0.1:8000',
    autoSummarize: false,
    channelAuditPeriod: 'all',
    channelAuditMaxVideos: 30,
    customPrompt: '',
    selectedVoiceURI: '',
    selectedMicDeviceId: '',
    cachedAuditReport: null,
    getActiveModel() {
      return this.selectedModels[this.currentProvider] || PROVIDER_CONFIGS[this.currentProvider]?.defaultModel || '';
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
    if (items.channelAuditMaxVideos !== undefined) {
      const parsedLimit = parseChannelAuditLimit(items.channelAuditMaxVideos);
      state.channelAuditMaxVideos = parsedLimit.isAll ? 'all' : parsedLimit.numericLimit;
    }
    if (items.channelAuditPeriod) state.channelAuditPeriod = items.channelAuditPeriod;
    if (items.ttsSpeed) state.ttsSpeed = items.ttsSpeed;
    if (items.selectedVoiceURI) state.selectedVoiceURI = items.selectedVoiceURI;
    if (!state.keyVerified) state.keyVerified = {};
    ALL_PERSISTED_PROVIDERS.forEach(p => {
      if (items[`apiKey_${p}`]) state.apiKeys[p] = items[`apiKey_${p}`];
      if (items[`serverUrl_${p}`]) state.serverUrls[p] = items[`serverUrl_${p}`];
      if (items[`selectedModel_${p}`]) state.selectedModels[p] = items[`selectedModel_${p}`];
      if (items[`keyVerified_${p}`] !== undefined && items[`keyVerified_${p}`] !== null) {
        state.keyVerified[p] = items[`keyVerified_${p}`];
      }
    });
    callback?.();
  });
}

export default createInPageState;
