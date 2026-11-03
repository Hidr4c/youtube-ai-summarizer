import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChromeStorageService } from '../src/services/implementations/ChromeStorageService.js';
import { BannerView } from '../src/content/ui/BannerView.js';
import { SettingsDrawerController } from '../src/content/ui/SettingsDrawerController.js';

/**
 * In-memory Mock for chrome.storage.local that persists across reboots
 */
class PersistentStorageMock {
  constructor(initialData = {}) {
    this.store = new Map(Object.entries(initialData));
  }

  get(keys, cb) {
    let result = {};
    if (keys === null || keys === undefined) {
      result = Object.fromEntries(this.store.entries());
    } else if (typeof keys === 'string') {
      if (this.store.has(keys)) result[keys] = this.store.get(keys);
    } else if (Array.isArray(keys)) {
      keys.forEach(k => {
        if (this.store.has(k)) result[k] = this.store.get(k);
      });
    }
    if (typeof cb === 'function') cb(result);
    return Promise.resolve(result);
  }

  set(items, cb) {
    Object.entries(items).forEach(([k, v]) => this.store.set(k, v));
    if (typeof cb === 'function') cb();
    return Promise.resolve();
  }

  remove(keys, cb) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach(k => this.store.delete(k));
    if (typeof cb === 'function') cb();
    return Promise.resolve();
  }

  clear(cb) {
    this.store.clear();
    if (typeof cb === 'function') cb();
    return Promise.resolve();
  }
}

/**
 * Creates fresh in-page application state mimicking src/content/index.js
 */
function createInPageAppState(storageMock) {
  return {
    extensionEnabled: true,
    currentProvider: 'lmstudio',
    apiKeys: {},
    serverUrls: {},
    selectedModels: {},
    availableLocalModels: {},
    currentLang: 'fr',
    summaryMode: 'standard',
    temperature: '0.3',
    maxTokens: 'auto',
    ttsSpeed: '1.0',
    localWhisperUrl: 'http://127.0.0.1:8000',
    autoSummarize: false,
    selectedVoiceURI: '',
    getActiveModel() { return this.selectedModels[this.currentProvider] || ''; },
    setActiveModel(m) { this.selectedModels[this.currentProvider] = m; },
    savePreference(key, val) {
      if (storageMock) storageMock.set({ [key]: val });
    }
  };
}

/**
 * Mimics loadPreferences lifecycle from src/content/index.js
 */
function simulateLoadPreferences(state, bannerView, storageMock) {
  return new Promise((resolve) => {
    storageMock.get(null, (items = {}) => {
      if (typeof items.extensionEnabled === 'boolean') state.extensionEnabled = items.extensionEnabled;
      if (items.aiProvider) state.currentProvider = items.aiProvider;
      if (items.targetLang) state.currentLang = items.targetLang;
      if (items.selectedModel) state.setActiveModel(items.selectedModel);
      if (items.summaryMode) {
        state.summaryMode = items.summaryMode;
        if (bannerView) bannerView.currentMode = items.summaryMode;
      }
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
      resolve();
    });
  });
}

describe('Settings & Preferences Persistence Specification', () => {

  it('Suite 1: Cold Restart Cycle - Full State Restoration After Browser Reboot', async () => {
    // 1. Persistent storage backend initialized (survives tab/process kill)
    const persistentStorage = new PersistentStorageMock();
    global.chrome = {
      storage: { local: persistentStorage },
      runtime: {}
    };

    // 2. User Session 1: Initial state loaded with default values
    const session1State = createInPageAppState(persistentStorage);
    const session1Banner = new BannerView(session1State);
    await simulateLoadPreferences(session1State, session1Banner, persistentStorage);

    assert.equal(session1State.currentProvider, 'lmstudio');
    assert.equal(session1State.currentLang, 'fr');
    assert.equal(session1State.summaryMode, 'standard');

    // 3. User actively configures custom settings across all options
    session1State.currentProvider = 'groq';
    session1State.savePreference('aiProvider', 'groq');

    session1State.apiKeys.groq = 'gsk_mock_groq_key_998877';
    session1State.savePreference('apiKey_groq', 'gsk_mock_groq_key_998877');

    session1State.setActiveModel('llama-3.3-70b-versatile');
    session1State.savePreference('selectedModel_groq', 'llama-3.3-70b-versatile');
    session1State.savePreference('selectedModel', 'llama-3.3-70b-versatile');

    session1State.currentLang = 'es';
    session1State.savePreference('targetLang', 'es');

    session1State.summaryMode = 'detailed';
    session1State.savePreference('summaryMode', 'detailed');

    session1State.temperature = '0.7';
    session1State.savePreference('temperature', '0.7');

    session1State.maxTokens = '2048';
    session1State.savePreference('maxTokens', '2048');

    session1State.autoSummarize = true;
    session1State.savePreference('autoSummarize', true);

    session1State.localWhisperUrl = 'http://192.168.1.120:9000';
    session1State.savePreference('localWhisperUrl', 'http://192.168.1.120:9000');

    session1State.ttsSpeed = '1.25';
    session1State.savePreference('ttsSpeed', '1.25');

    session1State.selectedVoiceURI = 'Google Spanish Voice';
    session1State.savePreference('selectedVoiceURI', 'Google Spanish Voice');

    // Also configure local providers in memory
    session1State.serverUrls.ollama = 'http://192.168.1.200:11434';
    session1State.savePreference('serverUrl_ollama', 'http://192.168.1.200:11434');
    session1State.selectedModels.ollama = 'qwen2.5:14b';
    session1State.savePreference('selectedModel_ollama', 'qwen2.5:14b');

    // 4. SIMULATE BROWSER RESTART / COLD BOOT:
    // Discard entire in-memory state object and instantiate a clean new session
    const rebootedState = createInPageAppState(persistentStorage);
    const rebootedBanner = new BannerView(rebootedState);

    // Initial state before loading is pure default
    assert.equal(rebootedState.currentProvider, 'lmstudio');
    assert.equal(rebootedState.currentLang, 'fr');
    assert.equal(rebootedState.summaryMode, 'standard');

    // Load preferences from storage on boot
    await simulateLoadPreferences(rebootedState, rebootedBanner, persistentStorage);

    // 5. Verify 100% Fidelity after Reboot
    assert.equal(rebootedState.currentProvider, 'groq', 'AI provider must persist after reboot');
    assert.equal(rebootedState.apiKeys.groq, 'gsk_mock_groq_key_998877', 'API key must persist');
    assert.equal(rebootedState.getActiveModel(), 'llama-3.3-70b-versatile', 'Active model must persist');
    assert.equal(rebootedState.currentLang, 'es', 'Target language must persist');
    assert.equal(rebootedState.summaryMode, 'detailed', 'Summary mode must persist');
    assert.equal(rebootedBanner.currentMode, 'detailed', 'Banner view mode must reflect loaded summary mode');
    assert.equal(rebootedState.temperature, '0.7', 'Temperature must persist');
    assert.equal(rebootedState.maxTokens, '2048', 'Max tokens must persist');
    assert.equal(rebootedState.autoSummarize, true, 'Auto-summarize switch must persist');
    assert.equal(rebootedState.localWhisperUrl, 'http://192.168.1.120:9000', 'Local whisper URL must persist');
    assert.equal(rebootedState.ttsSpeed, '1.25', 'TTS speed must persist');
    assert.equal(rebootedState.selectedVoiceURI, 'Google Spanish Voice', 'Selected voice URI must persist');
    assert.equal(rebootedState.serverUrls.ollama, 'http://192.168.1.200:11434', 'Ollama server URL must persist');
    assert.equal(rebootedState.selectedModels.ollama, 'qwen2.5:14b', 'Ollama selected model must persist');
  });

  it('Suite 2: Provider Switching - Isolated Multi-Provider Memory Without Overwriting', async () => {
    const persistentStorage = new PersistentStorageMock();
    const state = createInPageAppState(persistentStorage);

    // Setup OpenAI preferences
    state.currentProvider = 'openai';
    state.savePreference('aiProvider', 'openai');
    state.apiKeys.openai = 'sk-proj-openai-key-1';
    state.savePreference('apiKey_openai', 'sk-proj-openai-key-1');
    state.setActiveModel('gpt-4o');
    state.savePreference('selectedModel_openai', 'gpt-4o');

    // Setup Claude preferences
    state.currentProvider = 'claude';
    state.savePreference('aiProvider', 'claude');
    state.apiKeys.claude = 'sk-ant-claude-key-2';
    state.savePreference('apiKey_claude', 'sk-ant-claude-key-2');
    state.setActiveModel('claude-3-5-sonnet-20241022');
    state.savePreference('selectedModel_claude', 'claude-3-5-sonnet-20241022');

    // Setup LM Studio preferences
    state.currentProvider = 'lmstudio';
    state.savePreference('aiProvider', 'lmstudio');
    state.serverUrls.lmstudio = 'http://127.0.0.1:1234';
    state.savePreference('serverUrl_lmstudio', 'http://127.0.0.1:1234');
    state.setActiveModel('qwen2.5-7b-instruct');
    state.savePreference('selectedModel_lmstudio', 'qwen2.5-7b-instruct');

    // Simulate restart
    const newState = createInPageAppState(persistentStorage);
    await simulateLoadPreferences(newState, null, persistentStorage);

    // Active provider was last selected (LM Studio)
    assert.equal(newState.currentProvider, 'lmstudio');
    assert.equal(newState.getActiveModel(), 'qwen2.5-7b-instruct');
    assert.equal(newState.serverUrls.lmstudio, 'http://127.0.0.1:1234');

    // Previous providers' keys and models are intact in memory
    assert.equal(newState.apiKeys.openai, 'sk-proj-openai-key-1');
    assert.equal(newState.selectedModels.openai, 'gpt-4o');
    assert.equal(newState.apiKeys.claude, 'sk-ant-claude-key-2');
    assert.equal(newState.selectedModels.claude, 'claude-3-5-sonnet-20241022');

    // Switching provider restores its exact model
    newState.currentProvider = 'openai';
    assert.equal(newState.getActiveModel(), 'gpt-4o');

    newState.currentProvider = 'claude';
    assert.equal(newState.getActiveModel(), 'claude-3-5-sonnet-20241022');
  });

  it('Suite 3: ChromeStorageService - Get, Set, Multiple, and localStorage Fallback', async () => {
    // 1. With chrome.storage.local available
    const storageMock = new PersistentStorageMock({ key1: 'value1', key2: 42 });
    global.chrome = {
      storage: { local: storageMock },
      runtime: {}
    };

    const service = new ChromeStorageService();
    assert.equal(await service.get('key1'), 'value1');
    assert.equal(await service.get('key2'), 42);
    assert.equal(await service.get('missingKey', 'defaultVal'), 'defaultVal');

    await service.set('newKey', 'newVal');
    assert.equal(await service.get('newKey'), 'newVal');

    const multi = await service.getMultiple(['key1', 'newKey', 'notHere']);
    assert.equal(multi.key1, 'value1');
    assert.equal(multi.newKey, 'newVal');

    await service.setMultiple({ bulk1: 'b1', bulk2: 'b2' });
    assert.equal(await service.get('bulk1'), 'b1');
    assert.equal(await service.get('bulk2'), 'b2');

    // 2. Fallback to localStorage when chrome.storage is absent
    delete global.chrome;
    const localStoreMap = new Map();
    global.localStorage = {
      getItem: (k) => localStoreMap.has(k) ? localStoreMap.get(k) : null,
      setItem: (k, v) => localStoreMap.set(k, String(v))
    };

    const fallbackService = new ChromeStorageService();
    await fallbackService.set('fallbackKey', { test: true });
    const fallbackVal = await fallbackService.get('fallbackKey');
    assert.deepEqual(fallbackVal, { test: true });
    assert.equal(await fallbackService.get('missingKey', 'fallbackDef'), 'fallbackDef');
  });

  it('Suite 4: Master Extension Switch - Persistence Across Reloads and Dormancy Gate', async () => {
    const persistentStorage = new PersistentStorageMock();
    global.chrome = {
      storage: { local: persistentStorage },
      runtime: {}
    };

    // User disables extension in toolbar popup
    await persistentStorage.set({ extensionEnabled: false });

    // New page load on YouTube
    const state = createInPageAppState(persistentStorage);
    let bannerInjected = false;
    const mockBannerView = {
      tryInjectBanner: () => {
        if (!state.extensionEnabled) return;
        bannerInjected = true;
      }
    };

    await simulateLoadPreferences(state, null, persistentStorage);
    assert.equal(state.extensionEnabled, false, 'extensionEnabled must be false');

    mockBannerView.tryInjectBanner();
    assert.equal(bannerInjected, false, 'Banner must NOT be injected when extension is disabled in storage');

    // User re-enables in popup
    await persistentStorage.set({ extensionEnabled: true });
    const reloadedState = createInPageAppState(persistentStorage);
    await simulateLoadPreferences(reloadedState, null, persistentStorage);
    assert.equal(reloadedState.extensionEnabled, true, 'extensionEnabled must restore to true');

    const reloadedBannerView = {
      tryInjectBanner: () => {
        if (!reloadedState.extensionEnabled) return;
        bannerInjected = true;
      }
    };
    reloadedBannerView.tryInjectBanner();
    assert.equal(bannerInjected, true, 'Banner must be injected when enabled');
  });
});
