import { BannerI18n } from './BannerI18n.js';
import { I18N } from '../../locales/index.js';
import { PROVIDER_NAMES } from '../../config/AIProviderPresets.js';
import { BannerTemplate } from '../templates/BannerTemplate.js';
import { ThemeManager } from './ThemeManager.js';
import { safeSetInnerHTML, escapeHtml } from './MarkdownRenderer.js';
import { isWatchPage } from './NavigationObserver.js';

/**
 * Controller & DOM View for In-Page Summarizer Banner (Header, Tabs, State)
 */
export class BannerView {
  constructor(state = {}) {
    this.state = state;
    this.isExpanded = false;
    this.currentMode = 'standard';
  }

  tryInjectBanner(onInit = null) {
    if (!this.state.extensionEnabled) {
      const existing = document.getElementById('yt-ai-summarizer-container');
      if (existing) existing.remove();
      return;
    }
    if (!isWatchPage()) return;
    const existing = document.getElementById('yt-ai-summarizer-container');
    if (existing && existing.isConnected) return;
    if (existing) existing.remove();

    const watchContainer = document.querySelector?.('ytd-watch-flexy, ytd-watch-grid');
    let parent = null;
    let refChild = null;

    if (watchContainer && watchContainer.isConnected) {
      parent = watchContainer;
      refChild = watchContainer.querySelector('#player-theater-container') ||
                 watchContainer.querySelector('#columns') ||
                 watchContainer.firstChild;
    } else {
      const columns = document.getElementById('columns') || document.querySelector?.('ytd-watch-flexy #columns, ytd-watch-grid #columns');
      if (columns && columns.parentNode) {
        parent = columns.parentNode;
        refChild = columns;
      } else {
        const primary = document.getElementById('primary') || document.getElementById('below');
        if (primary && primary.parentNode) {
          parent = primary.parentNode;
          refChild = primary;
        }
      }
    }

    if (!parent) {
      setTimeout(() => this.tryInjectBanner(onInit), 250);
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'yt-ai-summarizer-container';
    banner.className = 'is-collapsed';
    ThemeManager.syncThemeWithYouTube(banner);

    const lang = this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    safeSetInnerHTML(banner, BannerTemplate.render(t, {
      version: (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) ? `v${chrome.runtime.getManifest().version}` : 'v1.4.0',
      currentMode: this.currentMode || this.state.summaryMode || 'standard',
      currentLang: lang
    }));

    parent.insertBefore(banner, refChild);
    if (typeof onInit === 'function') onInit(banner);
  }

  setExpanded(expand) {
    this.isExpanded = expand;
    const container = document.getElementById('yt-ai-summarizer-container');
    const toggleText = document.getElementById('ytAiToggleText');
    const toggleIcon = document.getElementById('ytAiToggleIcon');
    const lang = document.getElementById('ytAiLangSelect')?.value || this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    if (!container) return;

    if (this.isExpanded) {
      container.classList.remove('is-collapsed');
      if (toggleText) toggleText.textContent = t.collapse || 'Collapse';
      if (toggleIcon) toggleIcon.textContent = '▲';
    } else {
      container.classList.add('is-collapsed');
      if (toggleText) toggleText.textContent = t.expand || 'Expand';
      if (toggleIcon) toggleIcon.textContent = '▾';
      const drawer = document.getElementById('ytAiSettingsDrawer');
      drawer?.classList.add('yt-ai-hidden');
      document.getElementById('ytAiSettingsToggleBtn')?.classList.remove('active');
    }
  }

  toggleExpand() {
    this.setExpanded(!this.isExpanded);
  }

  switchTab(tabName) {
    document.querySelectorAll('.yt-ai-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.yt-ai-tab-pane').forEach(p => p.classList.remove('active'));

    const tabMap = {
      summary: { btn: 'ytAiTabSummaryBtn', pane: 'ytAiPaneSummary' },
      chat: { btn: 'ytAiTabChatBtn', pane: 'ytAiPaneChat' },
      transcript: { btn: 'ytAiTabTranscriptBtn', pane: 'ytAiPaneTranscript' }
    };

    const target = tabMap[tabName];
    if (target) {
      document.getElementById(target.btn)?.classList.add('active');
      document.getElementById(target.pane)?.classList.add('active');
    }

    if (tabName === 'chat') {
      setTimeout(() => document.getElementById('ytAiChatInput')?.focus(), 100);
    }
  }

  setSummaryMode(mode) {
    this.currentMode = mode;
    if (this.state) this.state.summaryMode = mode;
    const modeSelect = document.getElementById('ytAiModeSelect');
    if (modeSelect) {
      modeSelect.value = mode;
      this.state.savePreference('summaryMode', mode);
    }
    document.querySelectorAll('.yt-ai-format-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-mode') === mode);
    });
  }

  showStatusBanner(text, isError = false) {
    const banner = document.getElementById('ytAiStatusBanner');
    if (!banner) return;
    let cleanText = (text || '').trim();
    if (isError) {
      cleanText = cleanText.replace(/^❌\s*/, '');
      cleanText = `❌ ${cleanText}`;
    }
    banner.textContent = cleanText;
    banner.className = `yt-ai-reasoning ${isError ? 'offline' : ''}`;
    banner.classList.remove('yt-ai-hidden');
    setTimeout(() => {
      if (banner.textContent === cleanText) banner.classList.add('yt-ai-hidden');
    }, 7000);
  }

  updateHeaderBadge() {
    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[this.state.currentLang] || I18N.en;
    if (!badge || !badgeText) return;

    if (this.state.currentProvider === 'lmstudio' || this.state.currentProvider === 'ollama') {
      const name = this.state.currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
      const models = this.state.availableLocalModels[this.state.currentProvider] || [];
      const currentUrl = this.state.serverUrls[this.state.currentProvider] || (this.state.currentProvider === 'ollama' ? 'http://localhost:11434' : 'http://127.0.0.1:1234');
      const cleanHost = currentUrl.replace(/https?:\/\//, '');

      if (models.length > 0) {
        badge.className = 'yt-ai-badge online';
        badgeText.textContent = `${name} (${cleanHost})`;
      } else {
        badge.className = 'yt-ai-badge';
        badgeText.textContent = `${name} (${t.checking || 'Connecting...'})`;
      }
      return;
    }

    const hasKey = !!this.state.apiKeys[this.state.currentProvider];
    const name = PROVIDER_NAMES[this.state.currentProvider] || this.state.currentProvider;
    const isVerified = this.state.keyVerified ? this.state.keyVerified[this.state.currentProvider] : null;

    if (!hasKey) {
      badge.className = 'yt-ai-badge offline';
      badgeText.textContent = `${name} (${t.keyRequired || 'Key required'})`;
    } else if (isVerified === true) {
      badge.className = 'yt-ai-badge online';
      badgeText.textContent = `${name} (${t.keyOk || 'Key OK'})`;
    } else if (isVerified === false) {
      badge.className = 'yt-ai-badge offline';
      badgeText.textContent = `${name} (${t.invalidKey || 'Invalid key'})`;
    } else {
      badge.className = 'yt-ai-badge';
      badgeText.textContent = `${name} (${t.keySaved || 'Key saved'})`;
    }
  }

  updateHeaderModelText() {
    const el = document.getElementById('ytAiHeaderModelText');
    const t = I18N[this.state.currentLang] || I18N.en;
    const activeM = this.state.getActiveModel();
    if (el) {
      el.textContent = activeM ? `${t.modelPrefix || 'Model: '}${activeM}` : (t.noModelSelected || 'No model');
    }
  }

  applyLanguage(lang, summaryViewController = null, chatViewController = null) {
    BannerI18n.applyLanguage(lang, this.state, summaryViewController, chatViewController, this.isExpanded);
    this.updateHeaderBadge();
    this.updateHeaderModelText();
  }
}

export default BannerView;
