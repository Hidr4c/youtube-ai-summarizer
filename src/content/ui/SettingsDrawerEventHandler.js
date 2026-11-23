import { SettingsDrawerController } from './SettingsDrawerController.js';
import { QuickOnboardingHelper } from '../services/QuickOnboardingHelper.js';
import { LocalContextUiHelper } from './LocalContextUiHelper.js';

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

    const refreshBadge = () => (bannerView?.updateHeaderBadge ? bannerView.updateHeaderBadge() : settingsDrawer.updateHeaderBadge?.());
    const refreshModelText = () => (bannerView?.updateHeaderModelText ? bannerView.updateHeaderModelText() : settingsDrawer.updateHeaderModelText?.());
    const showStatus = (m, e) => (bannerView?.showStatusBanner ? bannerView.showStatusBanner(m, e) : settingsDrawer.showStatusBanner?.(m, e));

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

    // 2. Provider selection & API key (typing, Ctrl+V paste, visibility toggle)
    let keyDebounceTimer = null;
    let lastAutoValidated = '';

    const runCloudKeySync = (val) => {
      const provider = state.currentProvider;
      if (!val || provider === 'lmstudio' || provider === 'ollama') return;
      const sig = `${provider}:${val}`;
      if (sig === lastAutoValidated) return;
      lastAutoValidated = sig;
      QuickOnboardingHelper.validateAndSyncCloudKey({
        state, provider, key: val, settingsDrawer, showStatusBanner: showStatus, updateHeaderBadge: refreshBadge
      });
    };

    rootContainer.querySelector('#ytAiProviderSelect')?.addEventListener('change', (e) => {
      if (keyDebounceTimer) clearTimeout(keyDebounceTimer);
      lastAutoValidated = '';
      state.currentProvider = e.target.value;
      state.savePreference('aiProvider', state.currentProvider);
      settingsDrawer.syncProviderUI();
    });

    const apiKeyInput = rootContainer.querySelector('#ytAiApiKeyInput');
    apiKeyInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (e.target.value !== val) e.target.value = val;
      state.apiKeys[state.currentProvider] = val;
      state.savePreference(`apiKey_${state.currentProvider}`, val);
      if (state.keyVerified) delete state.keyVerified[state.currentProvider];
      state.savePreference(`keyVerified_${state.currentProvider}`, null);
      refreshBadge();
      if (keyDebounceTimer) clearTimeout(keyDebounceTimer);
      if (val && val.length >= 12) {
        keyDebounceTimer = setTimeout(() => runCloudKeySync(val), 550);
      } else {
        lastAutoValidated = '';
      }
    });

    apiKeyInput?.addEventListener('paste', () => {
      setTimeout(() => {
        const val = apiKeyInput.value.trim();
        if (keyDebounceTimer) clearTimeout(keyDebounceTimer);
        if (val) {
          state.apiKeys[state.currentProvider] = val;
          state.savePreference(`apiKey_${state.currentProvider}`, val);
          runCloudKeySync(val);
        }
      }, 0);
    });

    apiKeyInput?.addEventListener('change', (e) => {
      if (keyDebounceTimer) clearTimeout(keyDebounceTimer);
      const val = e.target.value.trim();
      if (val) runCloudKeySync(val);
    });

    rootContainer.querySelector('#ytAiToggleKeyVisBtn')?.addEventListener('click', (e) => {
      if (!apiKeyInput) return;
      const isHidden = apiKeyInput.type === 'password';
      apiKeyInput.type = isHidden ? 'text' : 'password';
      if (e.currentTarget) e.currentTarget.textContent = isHidden ? '🙈' : '👁';
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
    rootContainer.querySelector('#ytAiRefreshCloudModelsBtn')?.addEventListener('click', () => {
      if (state.currentProvider === 'lmstudio' || state.currentProvider === 'ollama') {
        settingsDrawer.refreshModelsList(true);
      } else {
        settingsDrawer.populateCloudModels(state.currentProvider, null, true);
      }
    });
    rootContainer.querySelector('#ytAiTestModelBtn')?.addEventListener('click', () => settingsDrawer.handleTestConnection());
    rootContainer.querySelector('#ytAiTestWhisperBtn')?.addEventListener('click', () => settingsDrawer.handleTestWhisper());

    rootContainer.querySelector('#ytAiModelSelect')?.addEventListener('change', (e) => {
      state.setActiveModel(e.target.value);
      state.savePreference(`selectedModel_${state.currentProvider}`, e.target.value);
      state.savePreference('selectedModel', e.target.value);
      refreshModelText();
    });

    // 5. Parameters & Prompt (hydrate persisted preferences & bind updates)
    const tempEl = rootContainer.querySelector('#ytAiTemperatureSelect');
    if (tempEl && state.temperature) tempEl.value = state.temperature;
    const maxTokEl = rootContainer.querySelector('#ytAiMaxTokensSelect');
    if (maxTokEl && state.maxTokens) maxTokEl.value = state.maxTokens;
    const autoCheckEl = rootContainer.querySelector('#ytAiAutoSummarizeCheck');
    if (autoCheckEl) autoCheckEl.checked = Boolean(state.autoSummarize);
    const customPromptEl = rootContainer.querySelector('#ytAiCustomPromptInput');
    if (customPromptEl && state.customPrompt) customPromptEl.value = state.customPrompt;

    LocalContextUiHelper.bind({ rootContainer, state, showStatus });

    tempEl?.addEventListener('change', (e) => {
      state.temperature = e.target.value;
      state.savePreference('temperature', e.target.value);
    });

    maxTokEl?.addEventListener('change', (e) => {
      state.maxTokens = e.target.value;
      state.savePreference('maxTokens', e.target.value);
    });

    autoCheckEl?.addEventListener('change', (e) => {
      state.autoSummarize = e.target.checked;
      state.savePreference('autoSummarize', e.target.checked);
    });

    customPromptEl?.addEventListener('input', (e) => {
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
