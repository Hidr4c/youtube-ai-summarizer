import { SettingsDrawerController } from './SettingsDrawerController.js';

/**
 * Reusable event binder for Settings Drawer across Watch and Channel views
 */
export class SettingsDrawerEventHandler {
  /**
   * Binds all interactions within the settings drawer container
   * @param {HTMLElement} rootContainer
   * @param {SettingsDrawerController} settingsDrawer
   * @param {Object} state
   * @param {Object} [bannerView=null]
   */
  static bind(rootContainer, settingsDrawer, state, bannerView = null) {
    if (!rootContainer || !settingsDrawer || !state) return;

    // 1. Close button and Subtab navigation
    rootContainer.querySelector('#ytAiSettingsCloseBtn')?.addEventListener('click', () => {
      SettingsDrawerController.setSettingsDrawerOpen(false);
    });

    rootContainer.querySelectorAll('.yt-ai-settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-subtab');
        if (sub) SettingsDrawerController.switchSettingsSubtab(sub);
      });
    });

    // 2. Provider selection & API key
    rootContainer.querySelector('#ytAiProviderSelect')?.addEventListener('change', (e) => {
      state.currentProvider = e.target.value;
      state.savePreference('aiProvider', state.currentProvider);
      settingsDrawer.syncProviderUI();
    });

    rootContainer.querySelector('#ytAiApiKeyInput')?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.apiKeys[state.currentProvider] = val;
      state.savePreference(`apiKey_${state.currentProvider}`, val);
      if (state.keyVerified) delete state.keyVerified[state.currentProvider];
      if (bannerView) bannerView.updateHeaderBadge();
    });

    settingsDrawer.bindPasteButton();

    // 3. Server selector & custom address
    rootContainer.querySelector('#ytAiServerSelect')?.addEventListener('change', (e) => {
      const isOllama = state.currentProvider === 'ollama';
      const def = isOllama ? 'http://localhost:11434' : 'http://localhost:1234';
      if (e.target.value === 'custom') {
        const custom = prompt(`Address for ${isOllama ? 'Ollama' : 'LM Studio'}:`, state.serverUrls[state.currentProvider] || def);
        if (custom) {
          const clean = custom.trim().replace(/\/+$/, '');
          state.serverUrls[state.currentProvider] = clean;
          state.savePreference(`serverUrl_${state.currentProvider}`, clean);
          settingsDrawer.updateServerUrlUI();
          settingsDrawer.refreshModelsList();
        }
      } else {
        state.serverUrls[state.currentProvider] = e.target.value;
        state.savePreference(`serverUrl_${state.currentProvider}`, e.target.value);
        settingsDrawer.updateServerUrlUI();
        settingsDrawer.refreshModelsList();
      }
    });

    // 4. Model operations
    rootContainer.querySelector('#ytAiRefreshModelsBtn')?.addEventListener('click', () => settingsDrawer.refreshModelsList(true));
    rootContainer.querySelector('#ytAiTestModelBtn')?.addEventListener('click', () => settingsDrawer.handleTestConnection());
    rootContainer.querySelector('#ytAiTestWhisperBtn')?.addEventListener('click', () => settingsDrawer.handleTestWhisper());

    rootContainer.querySelector('#ytAiModelSelect')?.addEventListener('change', (e) => {
      state.setActiveModel(e.target.value);
      state.savePreference(`selectedModel_${state.currentProvider}`, e.target.value);
      state.savePreference('selectedModel', e.target.value);
      if (bannerView) bannerView.updateHeaderModelText();
    });

    // 5. Parameters & Prompt
    rootContainer.querySelector('#ytAiTemperatureSelect')?.addEventListener('change', (e) => {
      state.temperature = e.target.value;
      state.savePreference('temperature', e.target.value);
    });

    rootContainer.querySelector('#ytAiMaxTokensSelect')?.addEventListener('change', (e) => {
      state.maxTokens = e.target.value;
      state.savePreference('maxTokens', e.target.value);
    });

    rootContainer.querySelector('#ytAiAutoSummarizeCheck')?.addEventListener('change', (e) => {
      state.autoSummarize = e.target.checked;
      state.savePreference('autoSummarize', e.target.checked);
    });

    rootContainer.querySelector('#ytAiCustomPromptInput')?.addEventListener('input', (e) => {
      state.customPrompt = e.target.value;
      state.savePreference('customPrompt', e.target.value);
    });

    // 6. Voice & Audio
    rootContainer.querySelector('#ytAiTtsSpeedSelect')?.addEventListener('change', (e) => {
      state.ttsSpeed = e.target.value;
      state.savePreference('ttsSpeed', e.target.value);
    });

    rootContainer.querySelector('#ytAiVoiceSelect')?.addEventListener('change', (e) => {
      state.selectedVoiceURI = e.target.value;
      state.savePreference('selectedVoiceURI', e.target.value);
    });

    rootContainer.querySelector('#ytAiMicSelect')?.addEventListener('change', (e) => {
      state.selectedMicDeviceId = e.target.value;
      state.savePreference('selectedMicDeviceId', e.target.value);
    });

    rootContainer.querySelector('#ytAiWhisperUrlInput')?.addEventListener('input', (e) => {
      state.localWhisperUrl = e.target.value.trim();
      state.savePreference('localWhisperUrl', state.localWhisperUrl);
    });
  }
}

export default SettingsDrawerEventHandler;
