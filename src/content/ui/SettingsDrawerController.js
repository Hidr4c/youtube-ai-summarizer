import { I18N } from '../../locales/index.js';
import { CLOUD_MODELS, API_KEY_PORTALS, PROVIDER_NAMES, resolveDeprecatedModel } from '../../config/AIProviderPresets.js';
import { LocalModelDiscovery } from '../services/LocalModelDiscovery.js';
import { ConnectionTester } from '../services/ConnectionTester.js';
import { QuickOnboardingHelper } from '../services/QuickOnboardingHelper.js';
import { SettingsDrawerI18n } from './SettingsDrawerI18n.js';

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
      return;
    }
    const el = document.getElementById('ytAiStatusBanner') || document.getElementById('ytAiCompanionStatusBanner');
    if (!el) return;
    const clean = (text || '').trim().replace(/^❌\s*/, '');
    el.textContent = isError ? `❌ ${clean}` : clean;
    el.className = `yt-ai-reasoning ${isError ? 'offline' : ''}`;
    el.classList.remove('yt-ai-hidden');
    setTimeout(() => { if (el.textContent.includes(clean)) el.classList.add('yt-ai-hidden'); }, 7000);
  }

  updateHeaderBadge() { this.bannerView?.updateHeaderBadge?.(); }

  updateHeaderModelText() {
    this.bannerView?.updateHeaderModelText?.();
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') window.dispatchEvent?.(new CustomEvent('yt-ai-model-changed'));
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
    SettingsDrawerI18n.syncLocalContextVisibility(this.state.currentProvider, {
      model: this.state.getActiveModel?.(), serverUrl: this.state.serverUrls?.[this.state.currentProvider], lang: this.state.currentLang
    });

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

      const info = QuickOnboardingHelper.getQuickStartInfo(this.state.currentProvider, this.state.currentLang);
      if (getApiKeyLink && info) {
        getApiKeyLink.href = info.url;
        getApiKeyLink.textContent = info.label;
      }
      const hintEl = document.getElementById("ytAiApiKeyHint");
      if (hintEl) hintEl.textContent = info?.hint || "";

      const t = I18N[this.state.currentLang] || I18N.en;
      if (apiKeyInput) {
        apiKeyInput.value = this.state.apiKeys[this.state.currentProvider] || '';
        apiKeyInput.placeholder = `${t.apiKeyLabel} ${this.state.currentProvider.toUpperCase()}...`;
      }

      const name = PROVIDER_NAMES[this.state.currentProvider] || this.state.currentProvider;
      if (summaryTitle) summaryTitle.textContent = `${t.summaryTitle} (${name})`;
      this.populateCloudModels(this.state.currentProvider);
    }

    this.bindPasteButton();
    this.updateHeaderBadge();
    this.updateHeaderModelText();
  }

  populateCloudModels(provider, overrideList = null, forceRefresh = false) {
    const select = document.getElementById('ytAiModelSelect');
    if (!select) return;

    const list = (Array.isArray(overrideList) && overrideList.length > 0) ? overrideList : (CLOUD_MODELS[provider] || []);
    const sameList = select.options && select.options.length === list.length
      && Array.from(select.options).every((o, i) => o.value === list[i].id);
    if (!sameList) {
      select.innerHTML = '';
      list.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name || m.id;
        select.appendChild(opt);
      });
    }

    const activeM = resolveDeprecatedModel(provider, this.state.getActiveModel());
    if (select.options.length > 0) {
      select.value = Array.from(select.options).some(o => o.value === activeM) ? activeM : select.options[0].value;
      this.state.setActiveModel(select.value);
      this.state.savePreference(`selectedModel_${provider}`, select.value);
      this.state.savePreference('selectedModel', select.value);
    }
    this.updateHeaderModelText();

    const key = (this.state.apiKeys?.[provider] || '').trim();
    if ((!overrideList || forceRefresh) && key) {
      const seq = (this._cloudFetchSeq = (this._cloudFetchSeq || 0) + 1);
      LocalModelDiscovery.refreshCloudModels(provider, key, (live) => {
        if (seq !== this._cloudFetchSeq || this.state.currentProvider !== provider || (this.state.apiKeys?.[provider] || '').trim() !== key) return;
        if (typeof document !== 'undefined' && document.activeElement === select && !forceRefresh) return;
        this.populateCloudModels(provider, live, false);
      });
    }
  }

  updateServerUrlUI() {
    const serverSelect = document.getElementById('ytAiServerSelect');
    if (!serverSelect) return;

    const isOllama = this.state.currentProvider === 'ollama';
    const currentUrl = this.state.serverUrls[this.state.currentProvider] || (isOllama ? 'http://localhost:11434' : 'http://localhost:1234');
    serverSelect.innerHTML = '';
    const presets = isOllama ? ['http://localhost:11434', 'http://127.0.0.1:11434'] : ['http://localhost:1234', 'http://127.0.0.1:1234'];

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
    customOpt.textContent = !presets.includes(currentUrl) ? `Custom (${currentUrl.replace(/https?:\/\//, '')})` : (t.customServer || 'Custom IP...');
    if (!presets.includes(currentUrl)) customOpt.selected = true;
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
    if (Array.isArray(models) && this.state?.modelCapabilities) models.forEach((m) => { if (m?.id) this.state.modelCapabilities[m.id] = m; });
    const activeVal = LocalModelDiscovery.populateModelSelect(
      document.getElementById('ytAiModelSelect'), models,
      this.state.currentProvider, this.state.getActiveModel(), this.state.currentLang
    );
    if (activeVal) {
      this.state.setActiveModel(activeVal);
      this.state.savePreference(`selectedModel_${this.state.currentProvider}`, activeVal);
      this.state.savePreference('selectedModel', activeVal);
    }
    this.updateHeaderModelText();
  }

  bindPasteButton() {
    const btn = document.getElementById("ytAiPasteApiKeyBtn");
    const input = document.getElementById("ytAiApiKeyInput");
    if (!btn || !input || btn.dataset?.bound === "true" || btn.getAttribute?.('data-bound') === "true") return;
    if (btn.dataset) btn.dataset.bound = "true";
    btn.setAttribute?.('data-bound', 'true');
    btn.addEventListener("click", async () => {
      const pasted = await QuickOnboardingHelper.pasteApiKeyFromClipboard(input, (val) => {
        QuickOnboardingHelper.validateAndSyncCloudKey({
          state: this.state, provider: this.state.currentProvider, key: val, settingsDrawer: this,
          showStatusBanner: (m, e) => this.showStatusBanner(m, e), updateHeaderBadge: () => this.updateHeaderBadge()
        });
      });
      if (!pasted) {
        const msg = (I18N[this.state.currentLang] || I18N.en).pasteClipboardHint || '[i] Clipboard empty or blocked — paste with Ctrl+V in the API Key field.';
        this.showStatusBanner(msg, false);
      }
    });
  }

  handleTestConnection() {
    const provider = this.state.currentProvider;
    const model = resolveDeprecatedModel(provider, this.state.getActiveModel());
    this.showStatusBanner(`Testing connection to ${model}...`, false);
    ConnectionTester.testModelConnection({
      provider, serverUrl: this.state.serverUrls[provider] || '',
      apiKey: this.state.apiKeys[provider], model, lang: this.state.currentLang
    }, (res) => {
      QuickOnboardingHelper.applyVerificationState(this.state, provider, model, res);
      if (!res.isError && res.resolvedModel && res.resolvedModel !== model) this.populateCloudModels(provider);
      this.updateHeaderBadge();
      this.showStatusBanner(res.message || res.error, res.isError);
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
