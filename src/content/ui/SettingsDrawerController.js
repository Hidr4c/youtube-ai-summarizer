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
    if (this.bannerView) {
      this.bannerView.showStatusBanner(text, isError);
    }
  }

  updateHeaderBadge() {
    if (this.bannerView) {
      this.bannerView.updateHeaderBadge();
    }
  }

  updateHeaderModelText() {
    if (this.bannerView) {
      this.bannerView.updateHeaderModelText();
    }
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

  populateCloudModels(provider) {
    const select = document.getElementById('ytAiModelSelect');
    if (!select) return;
    select.innerHTML = '';

    const list = CLOUD_MODELS[provider] || [];
    list.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });

    const activeM = this.state.getActiveModel();
    if (select.options.length > 0) {
      let found = false;
      for (const opt of select.options) {
        if (opt.value === activeM) {
          select.value = activeM;
          found = true;
          break;
        }
      }
      if (!found) select.selectedIndex = 0;
      this.state.setActiveModel(select.value);
      this.state.savePreference(`selectedModel_${provider}`, select.value);
      this.state.savePreference('selectedModel', select.value);
    }
  }

  updateServerUrlUI() {
    const serverSelect = document.getElementById('ytAiServerSelect');
    if (!serverSelect) return;

    const isOllama = this.state.currentProvider === 'ollama';
    const currentUrl = this.state.serverUrls[this.state.currentProvider] || (isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234');
    serverSelect.innerHTML = '';
    const presets = isOllama
      ? ['http://localhost:11434', 'http://127.0.0.1:11434', 'http://192.168.56.1:11434']
      : ['http://192.168.56.1:1234', 'http://localhost:1234', 'http://127.0.0.1:1234'];

    presets.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u.replace(/https?:\/\//, '');
      if (u === currentUrl) opt.selected = true;
      serverSelect.appendChild(opt);
    });

    const t = I18N[this.state.currentLang] || I18N.en;
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = t.customServer || 'Custom IP...';
    if (!presets.includes(currentUrl)) {
      customOpt.selected = true;
      customOpt.textContent = `Custom (${currentUrl.replace(/https?:\/\//, '')})`;
    }
    serverSelect.appendChild(customOpt);
  }

  refreshModelsList(showFeedback = false) {
    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[this.state.currentLang] || I18N.en;
    if (badgeText) badgeText.textContent = t.checking || 'Connecting...';

    LocalModelDiscovery.refreshModelsList(this.state, showFeedback, (models, currentUrl) => {
      this.state.availableLocalModels[this.state.currentProvider] = models;
      const isOllama = this.state.currentProvider === 'ollama';
      const providerLabel = isOllama ? 'Ollama' : 'LM Studio';
      if (badge) badge.className = 'yt-ai-badge online';
      if (badgeText) badgeText.textContent = `${providerLabel} (${currentUrl.replace(/https?:\/\//, '')})`;

      this.populateModelDropdown(models);
      if (showFeedback) {
        this.showStatusBanner(`✅ Connected to ${providerLabel} (${models.length} models ready)`, false);
      }
    }, () => {
      this.tryFallbackUrls();
    });
  }

  tryFallbackUrls(testedUrls = []) {
    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[this.state.currentLang] || I18N.en;
    const isOllama = this.state.currentProvider === 'ollama';
    const providerLabel = isOllama ? 'Ollama' : 'LM Studio';

    LocalModelDiscovery.tryFallbackUrls(this.state, testedUrls, (candidate, models) => {
      this.state.serverUrls[this.state.currentProvider] = candidate;
      this.state.savePreference(`serverUrl_${this.state.currentProvider}`, candidate);
      this.updateServerUrlUI();
      this.state.availableLocalModels[this.state.currentProvider] = models;
      if (badge) badge.className = 'yt-ai-badge online';
      if (badgeText) badgeText.textContent = `${providerLabel} (${candidate.replace(/https?:\/\//, '')})`;
      this.populateModelDropdown(models);
      this.showStatusBanner(`✅ Connected to ${providerLabel} (${models.length} models ready)`, false);
    }, () => {
      if (badge) badge.className = 'yt-ai-badge offline';
      if (badgeText) badgeText.textContent = `${providerLabel} (${t.offlineBadge || 'Offline'})`;
      this.populateModelDropdown([]);
    });
  }

  populateModelDropdown(models) {
    const select = document.getElementById('ytAiModelSelect');
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
