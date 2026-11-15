import { BannerI18n } from './BannerI18n.js';
import { getExtensionVersionTag } from '../templates/BannerHeaderParts.js';
import { I18N } from '../../locales/index.js';
import { PROVIDER_NAMES } from '../../config/AIProviderPresets.js';
import { BannerTemplate } from '../templates/BannerTemplate.js';
import { ThemeManager } from './ThemeManager.js';
import { safeSetInnerHTML, escapeHtml } from './MarkdownRenderer.js';
import { isWatchPage, isFullscreen, syncFullscreenVisibility } from './NavigationObserver.js';

/**
 * Controller & DOM View for In-Page Summarizer Banner (Header, Tabs, State)
 */
export class BannerView {
  constructor(state = {}) {
    this.state = state;
    this.isExpanded = false;
    this.currentMode = 'standard';
  }

  /**
   * Resolves the direct child node within watchContainer before which the banner should be inserted.
   * Ensures the banner is positioned at the very top, flush below the search bar and above video elements.
   * @param {HTMLElement} watchContainer
   * @returns {Node|null}
   */
  _resolveWatchAnchor(watchContainer) {
    if (!watchContainer) return null;
    const isMobileWatch = watchContainer.tagName?.toUpperCase() === 'YTM-WATCH';
    if (isMobileWatch) {
      return watchContainer.querySelector?.('ytm-single-column-watch-next-results-renderer, .watch-below-the-player')
        || watchContainer.firstElementChild || null;
    }

    const directChildren = Array.from(watchContainer.children || []);

    const directAnchor = directChildren.find(c =>
      c.id === 'full-bleed-container' ||
      c.id === 'player-full-bleed-container' ||
      c.id === 'player-theater-container' ||
      c.id === 'columns'
    );
    if (directAnchor) return directAnchor;

    const candidateIds = ['full-bleed-container', 'player-full-bleed-container', 'player-theater-container', 'columns'];
    for (const id of candidateIds) {
      const node = watchContainer.querySelector?.(`#${id}`);
      if (node && node.parentNode === watchContainer) {
        return node;
      }
    }

    const firstVisual = directChildren.find(c =>
      c.tagName && !['IRON-MEDIA-QUERY', 'DOM-IF', 'TEMPLATE'].includes(c.tagName.toUpperCase())
    );
    if (firstVisual) return firstVisual;

    return watchContainer.firstElementChild || null;
  }

  tryInjectBanner(onInit = null) {
    if (!this.state.extensionEnabled) {
      const existing = document.getElementById('yt-ai-summarizer-container');
      if (existing) existing.remove();
      return;
    }
    if (!isWatchPage()) return;

    const watchContainer = document.querySelector?.('ytd-watch-flexy, ytd-watch-grid, ytm-watch');
    let parent = null;
    let refChild = null;

    if (watchContainer && watchContainer.isConnected) {
      if (watchContainer.tagName?.toUpperCase() === 'YTM-WATCH') {
        const below = watchContainer.querySelector?.('.watch-below-the-player');
        parent = below || watchContainer;
        refChild = below ? below.firstElementChild : this._resolveWatchAnchor(watchContainer);
      } else {
        parent = watchContainer;
        refChild = this._resolveWatchAnchor(watchContainer);
      }
    } else {
      // In headless / test mock environments where ytd-watch-* custom elements are omitted,
      // allow a designated test container wrapper, but NEVER inject directly into <body> or <html>
      const candidate = document.querySelector?.('#columns, #primary, ytm-single-column-watch-next-results-renderer');
      const candidateParent = candidate?.parentNode;
      if (candidateParent && candidateParent !== document.body && candidateParent !== document.documentElement) {
        parent = candidateParent;
        refChild = candidate;
      }
    }

    // STRICT DOM GUARD: Never inject directly into <body> or <html>.
    // On YouTube watch pages, must wait for watchContainer (ytd-watch-flexy/grid) to mount.
    if (!parent || parent === document.body || parent === document.documentElement) {
      setTimeout(() => this.tryInjectBanner(onInit), 150);
      return;
    }

    const existing = document.getElementById('yt-ai-summarizer-container');
    if (existing && existing.isConnected) {
      if (existing.parentNode === parent) {
        return; // Correctly positioned in the expected parent container
      }
      // If stuck in body or an obsolete/wrong container, remove it so it moves to parent
      existing.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'yt-ai-summarizer-container';
    banner.className = 'is-collapsed';
    ThemeManager.syncThemeWithYouTube(banner);

    const lang = this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    safeSetInnerHTML(banner, BannerTemplate.render(t, {
      version: getExtensionVersionTag(),
      currentMode: this.currentMode || this.state.summaryMode || 'standard',
      currentLang: lang,
      maxVideos: this.state.channelAuditMaxVideos || 30,
      channelTotalVideos: this.state.currentChannelTotalVideos || null
    }));

    try {
      if (refChild && refChild.parentNode === parent) {
        parent.insertBefore(banner, refChild);
      } else if (parent.firstElementChild) {
        parent.insertBefore(banner, parent.firstElementChild);
      } else {
        parent.appendChild(banner);
      }
    } catch {
      if (typeof parent.prepend === 'function') {
        parent.prepend(banner);
      } else {
        parent.appendChild(banner);
      }
    }

    syncFullscreenVisibility?.();
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

      if (!isFullscreen?.() && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        const masthead = document.getElementById('masthead-container');
        const mastheadHeight = masthead ? (masthead.offsetHeight || 56) : 56;
        const bRect = container.getBoundingClientRect ? container.getBoundingClientRect() : { top: 0 };
        if (bRect.top < mastheadHeight || (window.scrollY && window.scrollY > 0)) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
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
      audit: { btn: 'ytAiTabAuditBtn', pane: 'ytAiPaneAudit' },
      channelAudit: { btn: 'ytAiTabChannelAuditBtn', pane: 'ytAiPaneChannelAudit' },
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

  applyLanguage(lang, summaryViewController = null, chatViewController = null, auditViewController = null) {
    BannerI18n.applyLanguage(lang, this.state, summaryViewController, chatViewController, this.isExpanded, auditViewController);
    this.updateHeaderBadge();
    this.updateHeaderModelText();
  }
}

export default BannerView;
