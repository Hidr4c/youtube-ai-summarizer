import { I18N } from '../../locales/index.js';
import { CLOUD_MODELS, API_KEY_PORTALS, PROVIDER_NAMES } from '../../config/AIProviderPresets.js';
import { LocalModelDiscovery } from '../services/LocalModelDiscovery.js';
import { ConnectionTester } from '../services/ConnectionTester.js';

/**
 * Controller for Settings Drawer, provider options, model fetching, and connection testing
 */
export class SettingsDrawerController {
  constructor(state = {}, dependencies = {}) {
    this.state = state;
    this.bannerView = dependencies.bannerView || null;
  }

  static toggleSettingsDrawer(onSetExpanded) {
    const drawer = document.getElementById('ytAiSettingsDrawer');
    const isOpen = drawer && !drawer.classList.contains('yt-ai-hidden');
    SettingsDrawerController.setSettingsDrawerOpen(!isOpen, onSetExpanded);
  }

  static setSettingsDrawerOpen(open, onSetExpanded) {
    const drawer = document.getElementById('ytAiSettingsDrawer');
    const btn = document.getElementById('ytAiSettingsToggleBtn');
    if (!drawer) return;
    if (open) {
      if (typeof onSetExpanded === 'function') onSetExpanded(true);
      drawer.classList.remove('yt-ai-hidden');
      btn?.classList.add('active');
    } else {
      drawer.classList.add('yt-ai-hidden');
      btn?.classList.remove('active');
    }
  }

  static switchSettingsSubtab(subtab) {
    document.querySelectorAll('.yt-ai-settings-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-subtab') === subtab);
    });
    document.querySelectorAll('.yt-ai-settings-subpane').forEach(p => p.classList.remove('active'));
    const paneMap = {
      model: 'ytAiSettingsSubpaneModel',
      audio: 'ytAiSettingsSubpaneAudio',
      params: 'ytAiSettingsSubpaneParams'
    };
    const targetId = paneMap[subtab];
    if (targetId) {
      document.getElementById(targetId)?.classList.add('active');
    }
  }

  showStatusBanner(text, isError = false) {
    if (this.bannerView) this.bannerView.showStatusBanner(text, isError);
  }

  updateHeaderBadge() {
    if (this.bannerView) this.bannerView.updateHeaderBadge();
  }

  updateHeaderModelText() {
    if (this.bannerView) this.bannerView.updateHeaderModelText();
  }

  applyLanguage(lang) {
    this.state.currentLang = lang;
    const t = I18N[lang] || I18N.en;
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    };
    setText('ytAiTabSettingsModelBtn', t.tabSettingsModel);
    setText('ytAiTabSettingsParamsBtn', t.tabSettingsParams);
    setText('ytAiTabSettingsAudioBtn', t.tabSettingsAudio);
    setText('ytAiProviderLabel', t.providerLabel);
    setText('ytAiModelSelectLabel', t.modelSelectLabel);
    setText('ytAiFormatLabel', t.formatLabel);
    setText('ytAiCustomPromptLabel', t.customPromptLabel);
    setText('ytAiVoiceLabel', t.voiceLabel);
    setText('ytAiSpeedLabel', t.speedLabel);
    setText('ytAiMicSelectLabel', t.micSelectLabel);
    setText('ytAiWhisperLabel', t.whisperLabel);

    const customInput = document.getElementById('ytAiCustomPromptInput');
    if (customInput && t.customPromptPlaceholder) customInput.placeholder = t.customPromptPlaceholder;
    const whisperInput = document.getElementById('ytAiWhisperUrlInput');
    if (whisperInput && t.whisperUrlPlaceholder) whisperInput.placeholder = t.whisperUrlPlaceholder;

    this.syncProviderUI();
  }

  syncProviderUI() {
    const providerSelect = document.getElementById('ytAiProviderSelect');
    const lmSettings = document.getElementById('ytAiLmStudioSettings');
    const cloudSettings = document.getElementById('ytAiCloudSettings');
    const apiKeyInput = document.getElementById('ytAiApiKeyInput');
    const getApiKeyLink = document.getElementById('ytAiGetApiKeyLink');
    const summaryTitle = document.getElementById('ytAiSummaryHeaderTitle');
    const serverLabel = document.getElementById('ytAiServerLabel');

    if (providerSelect) providerSelect.value = this.state.currentProvider;
    const isLocal = (this.state.currentProvider === 'lmstudio' || this.state.currentProvider === 'ollama');

    if (isLocal) {
      lmSettings?.classList.remove('yt-ai-hidden');
      cloudSettings?.classList.add('yt-ai-hidden');

      const name = this.state.currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
      const t = I18N[this.state.currentLang] || I18N.en;
      if (serverLabel) serverLabel.textContent = this.state.currentProvider === 'ollama' ? t.serverLabelOllama : t.serverLabelLm;
      if (summaryTitle) summaryTitle.textContent = `${t.summaryTitle} (${name})`;

      this.updateServerUrlUI();
      const localModels = this.state.availableLocalModels[this.state.currentProvider];
      if (localModels && localModels.length > 0) {
        this.populateModelDropdown(localModels);
      } else {
        this.populateModelDropdown([]);
        this.refreshModelsList();
      }
    } else {
      lmSettings?.classList.add('yt-ai-hidden');
      cloudSettings?.classList.remove('yt-ai-hidden');

      const portal = API_KEY_PORTALS[this.state.currentProvider];
      if (getApiKeyLink && portal) {
        getApiKeyLink.href = portal.url;
        getApiKeyLink.textContent = portal.label;
      }

      const t = I18N[this.state.currentLang] || I18N.en;
      if (apiKeyInput) {
        apiKeyInput.value = this.state.apiKeys[this.state.currentProvider] || '';
        apiKeyInput.placeholder = `${t.apiKeyLabel} ${this.state.currentProvider.toUpperCase()}...`;
      }

      const name = PROVIDER_NAMES[this.state.currentProvider] || this.state.currentProvider;
      if (summaryTitle) summaryTitle.textContent = `${t.summaryTitle} (${name})`;
      this.populateCloudModels(this.state.currentProvider);
    }

    this.updateHeaderBadge();
    this.updateHeaderModelText();
  }

  updateServerUrlUI() {
    const serverSelect = document.getElementById('ytAiServerSelect');
    if (!serverSelect) return;
    const isOllama = this.state.currentProvider === 'ollama';
    const def = isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234';
    const current = this.state.serverUrls[this.state.currentProvider] || def;

    const optLocal = document.getElementById('ytAiServerOptionLocalhost');
    const optLan = document.getElementById('ytAiServerOptionLan');
    if (optLocal) optLocal.value = isOllama ? 'http://localhost:11434' : 'http://localhost:1234';
    if (optLan) optLan.value = isOllama ? 'http://192.168.1.100:11434' : 'http://192.168.56.1:1234';

    if (current === optLocal?.value || current === optLan?.value) {
      serverSelect.value = current;
    } else {
      let customOpt = serverSelect.querySelector('option[data-custom="true"]');
      if (!customOpt) {
        customOpt = document.createElement('option');
        customOpt.setAttribute('data-custom', 'true');
        serverSelect.insertBefore(customOpt, serverSelect.lastElementChild);
      }
      customOpt.value = current;
      customOpt.textContent = `Custom (${current})`;
      serverSelect.value = current;
    }
  }

  refreshModelsList() {
    const isLocal = (this.state.currentProvider === 'lmstudio' || this.state.currentProvider === 'ollama');
    if (!isLocal) return;
    const t = I18N[this.state.currentLang] || I18N.en;

    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    if (badge) badge.className = 'yt-ai-badge checking';
    if (badgeText) badgeText.textContent = t.checking || 'Checking...';

    const currentUrl = this.state.serverUrls[this.state.currentProvider];
    LocalModelDiscovery.fetchLocalModels(
      this.state.currentProvider,
      currentUrl,
      (models) => {
        this.state.availableLocalModels[this.state.currentProvider] = models;
        this.populateModelDropdown(models);
        this.updateHeaderBadge();
      },
      (err) => {
        this.populateModelDropdown([]);
        if (badge) badge.className = 'yt-ai-badge offline';
        if (badgeText) badgeText.textContent = t.offline || 'Offline';
        this.updateHeaderModelText();
      }
    );
  }

  populateCloudModels(provider) {
    const select = document.getElementById('ytAiModelSelect');
    if (!select) return;
    select.innerHTML = '';
    const models = CLOUD_MODELS[provider] || [];
    const savedModel = this.state.getActiveModel();

    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    }
    const match = models.find(m => m.id === savedModel);
    if (match) {
      select.value = savedModel;
    } else if (models.length > 0) {
      select.value = models[0].id;
      this.state.setActiveModel(models[0].id);
      this.state.savePreference(`selectedModel_${provider}`, models[0].id);
    }
    this.updateHeaderModelText();
  }

  populateModelDropdown(models) {
    const select = document.getElementById('ytAiModelSelect');
    if (!select) return;
    const currentSaved = this.state.getActiveModel();
    const activeVal = LocalModelDiscovery.populateModelSelect(
      select,
      models,
      this.state.currentProvider,
      currentSaved,
      this.state.currentLang
    );
    if (activeVal) {
      this.state.setActiveModel(activeVal);
      this.state.savePreference(`selectedModel_${this.state.currentProvider}`, activeVal);
      this.state.savePreference('selectedModel', activeVal);
    }
    this.updateHeaderModelText();
  }

  handleTestConnection() {
    const model = this.state.getActiveModel();
    this.showStatusBanner(`Testing connection to ${model}...`, false);
    ConnectionTester.testModelConnection({
      provider: this.state.currentProvider,
      serverUrl: this.state.serverUrls[this.state.currentProvider] || '',
      apiKey: this.state.apiKeys[this.state.currentProvider],
      model,
      lang: this.state.currentLang
    }, ({ message, error, isError }) => {
      this.showStatusBanner(message || error, isError);
    });
  }

  async handleTestWhisper() {
    const url = this.state.localWhisperUrl || document.getElementById('ytAiWhisperUrlInput')?.value.trim();
    this.showStatusBanner(`Testing connection to ${url}...`, false);
    const result = await ConnectionTester.testWhisperEndpoint(url, this.state.currentLang);
    this.showStatusBanner(result.message, result.isError);
  }
}

export default SettingsDrawerController;
