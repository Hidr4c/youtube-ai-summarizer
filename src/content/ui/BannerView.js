import { BannerI18n } from './BannerI18n.js';
import { getExtensionVersionTag } from '../templates/BannerHeaderParts.js';
import { I18N } from '../../locales/index.js';
import { PROVIDER_NAMES } from '../../config/AIProviderPresets.js';
import { BannerTemplate } from '../templates/BannerTemplate.js';
import { ThemeManager } from './ThemeManager.js';
import { safeSetInnerHTML, escapeHtml } from './MarkdownRenderer.js';
import { isWatchPage, isShortsPage, isWebPageMode, isFullscreen, syncFullscreenVisibility } from './NavigationObserver.js';
import { resolveInjectionTarget, resolveWatchAnchor } from './BannerAnchorHelper.js';
import { WebPageLayoutShifter } from './WebPageLayoutShifter.js';

/**
 * Controller & DOM View for In-Page Summarizer Banner (Header, Tabs, State)
 */
export class BannerView {
  constructor(state = {}) {
    this.state = state;
    this.isExpanded = false;
    this.currentMode = 'standard';
    this._webLayoutShifter = new WebPageLayoutShifter();
  }

  _resolveWatchAnchor(watchContainer) {
    return resolveWatchAnchor(watchContainer);
  }

  _notifyShortsResize() {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    const triggerResize = () => window.dispatchEvent(new Event('resize'));
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(triggerResize);
    else triggerResize();
  }

  tryInjectBanner(onInit = null) {
    if (!this.state.extensionEnabled) {
      const existing = document.getElementById('yt-ai-summarizer-container');
      if (existing) {
        const wasShorts = existing.classList?.contains?.('yt-ai-shorts-mode') || isShortsPage();
        this._webLayoutShifter?.detach();
        existing.remove();
        if (wasShorts) this._notifyShortsResize();
      }
      return;
    }
    const webMode = isWebPageMode();
    if (!isWatchPage() && !webMode) return;

    const { parent, refChild, isShorts, isWebPage } = resolveInjectionTarget();

    if (!parent || parent === document.documentElement) {
      setTimeout(() => this.tryInjectBanner(onInit), 150);
      return;
    }

    const existing = document.getElementById('yt-ai-summarizer-container');
    if (existing && existing.isConnected) {
      const wasWebPage = Boolean(existing.classList?.contains?.('yt-ai-webpage-mode'));
      if (existing.parentNode === parent && wasWebPage === Boolean(isWebPage)) {
        if (isWebPage && parent.firstElementChild && parent.firstElementChild !== existing) {
          parent.insertBefore(existing, parent.firstElementChild);
        }
        if (existing.classList) {
          if (typeof existing.classList.toggle === 'function') {
            existing.classList.toggle('yt-ai-shorts-mode', isShorts);
          } else if (isShorts) {
            existing.classList.add?.('yt-ai-shorts-mode');
          } else {
            existing.classList.remove?.('yt-ai-shorts-mode');
          }
        }
        this._webLayoutShifter?.attach?.(existing);
        return; // Correctly positioned in the expected parent container
      }
      this.isExpanded = false;
      existing.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'yt-ai-summarizer-container';
    banner.className = isWebPage ? 'is-collapsed yt-ai-webpage-mode' : (isShorts ? 'is-collapsed yt-ai-top-shell yt-ai-shorts-mode' : 'is-collapsed yt-ai-top-shell');
    try { ThemeManager.syncThemeWithYouTube(banner); } catch (_) {}

    const lang = this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    safeSetInnerHTML(banner, BannerTemplate.render(t, {
      version: getExtensionVersionTag(),
      currentMode: this.currentMode || this.state.summaryMode || 'standard',
      auditMode: this.state.auditMode || 'standard',
      channelAuditMode: this.state.channelAuditMode || 'standard',
      currentLang: lang,
      maxVideos: this.state.channelAuditMaxVideos || 30,
      channelTotalVideos: this.state.currentChannelTotalVideos || null
    }));

    try {
      if (isWebPage) {
        if (parent.firstElementChild) parent.insertBefore(banner, parent.firstElementChild);
        else parent.appendChild(banner);
      } else if (refChild && refChild.parentNode === parent) {
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
    this._webLayoutShifter?.attach(banner);
    if (isShorts) {
      this._notifyShortsResize();
      if (typeof window !== 'undefined' && window.scrollY > 0) window.scrollTo?.(0, 0);
    }
    if (typeof onInit === 'function') onInit(banner);
  }

  setExpanded(expand) {
    this.isExpanded = expand;
    const container = document.getElementById('yt-ai-summarizer-container');
    const toggleBtn = document.getElementById('ytAiToggleBtn');
    const toggleText = document.getElementById('ytAiToggleText');
    const toggleIcon = document.getElementById('ytAiToggleIcon');
    const lang = document.getElementById('ytAiLangSelect')?.value || this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    if (!container) return;

    const shortsActive = isShortsPage() || container.classList?.contains?.('yt-ai-shorts-mode');

    if (this.isExpanded) {
      container.classList.remove('is-collapsed');
      const collapseTip = t.collapse || 'Collapse';
      if (toggleBtn) { toggleBtn.title = collapseTip; toggleBtn.setAttribute?.('aria-label', collapseTip); }
      if (toggleText) toggleText.textContent = collapseTip;
      if (toggleIcon && !toggleIcon.querySelector?.('svg')) toggleIcon.textContent = '▲';

      if (!shortsActive && !isFullscreen?.() && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        const masthead = document.getElementById('masthead-container');
        const mastheadHeight = masthead ? (masthead.offsetHeight || 56) : 56;
        const bRect = container.getBoundingClientRect ? container.getBoundingClientRect() : { top: 0 };
        if (bRect.top < mastheadHeight || (window.scrollY && window.scrollY > 0)) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else {
      container.classList.add('is-collapsed');
      const expandTip = t.expand || 'Expand';
      if (toggleBtn) { toggleBtn.title = expandTip; toggleBtn.setAttribute?.('aria-label', expandTip); }
      if (toggleText) toggleText.textContent = expandTip;
      if (toggleIcon && !toggleIcon.querySelector?.('svg')) toggleIcon.textContent = '▾';
      const drawer = document.getElementById('ytAiSettingsDrawer');
      drawer?.classList.add('yt-ai-hidden');
      document.getElementById('ytAiSettingsToggleBtn')?.classList.remove('active');
    }

    if (container.classList?.contains?.('yt-ai-webpage-mode') || container.classList?.contains?.('yt-ai-top-shell')) {
      this._webLayoutShifter?.sync();
    }

    if (shortsActive) {
      const pmEl = document.querySelector?.('ytd-page-manager');
      const scrollTargets = [container.parentNode, pmEl, document.documentElement].filter((el, i, a) => el && a.indexOf(el) === i);
      const resetShortsScroll = () => {
        scrollTargets.forEach((el) => {
          if (typeof el.scrollTop === 'number' && el.scrollTop !== 0) el.scrollTop = 0;
        });
        if (typeof window !== 'undefined' && window.scrollY > 0) window.scrollTo?.(0, 0);
      };
      resetShortsScroll();
      // Guard briefly against YouTube Shorts automatic scrollIntoView() during toggle layout transitions
      const guardWin = typeof window !== 'undefined' ? window : null;
      [...scrollTargets, guardWin].forEach((t) => {
        if (!t || typeof t.addEventListener !== 'function') return;
        const onTransitionScroll = () => resetShortsScroll();
        t.addEventListener('scroll', onTransitionScroll, { passive: true });
        setTimeout(() => t.removeEventListener?.('scroll', onTransitionScroll), 450);
      });
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resetShortsScroll());
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
    const verified = this.state.keyVerified?.[this.state.currentProvider];
    const [cls, msg] = !hasKey
      ? ['yt-ai-badge offline', t.keyRequired || 'Key required']
      : verified === true ? ['yt-ai-badge online', t.keyOk || 'Key OK']
      : verified === 'busy' ? ['yt-ai-badge', t.serverBusy || 'Server busy']
      : verified === false ? ['yt-ai-badge offline', t.invalidKey || 'Invalid key']
      : ['yt-ai-badge', t.keySaved || 'Key saved'];
    badge.className = cls;
    badgeText.textContent = `${name} (${msg})`;
  }

  updateHeaderModelText() {
    const el = document.getElementById('ytAiHeaderModelText');
    const t = I18N[this.state.currentLang] || I18N.en;
    const activeM = this.state.getActiveModel();
    if (el) el.textContent = activeM ? `${t.modelPrefix || 'Model: '}${activeM}` : (t.noModelSelected || 'No model');
  }

  applyLanguage(lang, summaryViewController = null, chatViewController = null, auditViewController = null) {
    BannerI18n.applyLanguage(lang, this.state, summaryViewController, chatViewController, this.isExpanded, auditViewController);
    this.updateHeaderBadge();
    this.updateHeaderModelText();
  }
}

export default BannerView;
