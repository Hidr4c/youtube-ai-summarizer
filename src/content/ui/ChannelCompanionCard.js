import { isChannelPage, getChannelIdentifier, syncFullscreenVisibility } from './NavigationObserver.js';
import { safeSetInnerHTML } from './MarkdownRenderer.js';
import { ThemeManager } from './ThemeManager.js';
import { ChannelCompanionTemplate } from './ChannelCompanionTemplate.js';
import { ChannelChatController } from './ChannelChatController.js';
import { ChannelCompanionRunController } from './ChannelCompanionRunController.js';
import { ChannelCompanionI18n } from './ChannelCompanionI18n.js';
import { YouTubeDOMContext } from '../services/YouTubeDOMContext.js';
import { parseChannelAuditLimit, resolveEffectiveChannelLimit, syncChannelMaxSelectElement } from '../../config/ExtensionConstants.js';
import { SettingsDrawerTemplate } from '../templates/SettingsDrawerTemplate.js';
import { SettingsDrawerController } from './SettingsDrawerController.js';
import { SettingsDrawerEventHandler } from './SettingsDrawerEventHandler.js';
import { I18N } from '../../locales/index.js';

/**
 * Official Top-of-Page Channel Companion Banner (@handle, /channel/, /c/).
 * Exposes channel-only tabs and delegates execution/recovery to ChannelCompanionRunController.
 */
export class ChannelCompanionCard {
  constructor(options = {}) {
    this.service = options.channelAuditService;
    this.viewController = options.channelAuditViewController;
    this.settingsDrawer = options.settingsDrawer || null;
    this.audioController = options.audioController || null;
    this.state = options.state || {};
    this.currentChannel = '';
    this.isExpanded = true;
    this.activeTab = 'channelAudit';
    this.runController = new ChannelCompanionRunController(this);
    this.channelChat = new ChannelChatController({
      channelAuditService: this.service,
      audioController: options.audioController,
      transcriptController: options.transcriptController,
      channelManager: options.channelManager
    });
  }

  _findChannelAnchor() {
    const phc = document.querySelector('#page-header-container');
    if (phc) {
      const ref = phc.querySelector('#page-header-banner') || phc.querySelector('#page-header') || phc.firstElementChild;
      return { parent: phc, reference: ref };
    }
    const cc = document.querySelector('tp-yt-app-header #contentContainer');
    if (cc) {
      const phcIn = cc.querySelector('#page-header-container');
      if (phcIn) {
        const ref = phcIn.querySelector('#page-header-banner') || phcIn.querySelector('#page-header') || phcIn.firstElementChild;
        return { parent: phcIn, reference: ref };
      }
      return { parent: cc, reference: cc.firstElementChild };
    }
    const mobileBrowse = document.querySelector('ytm-browse');
    if (mobileBrowse) {
      const ref = mobileBrowse.querySelector('ytm-section-list-renderer, ytm-single-column-browse-results-renderer') || mobileBrowse.firstElementChild;
      return { parent: mobileBrowse, reference: ref };
    }
    return null;
  }

  tryInjectCompanion(forceReinject = false) {
    if (!this.state.extensionEnabled || !isChannelPage()) {
      document.getElementById('yt-ai-channel-companion')?.remove();
      return;
    }

    const channelIdentifier = getChannelIdentifier();
    if (!channelIdentifier) return;

    const anchor = this._findChannelAnchor();
    if (!anchor || !anchor.parent) {
      setTimeout(() => this.tryInjectCompanion(forceReinject), 200);
      return;
    }

    const existing = document.getElementById('yt-ai-channel-companion');
    if (existing && existing.parentNode === anchor.parent && this.currentChannel === channelIdentifier && !forceReinject) {
      syncFullscreenVisibility();
      this.runController.syncActiveJobUI(channelIdentifier, this.state.currentLang || 'fr');
      return;
    }
    if (existing) existing.remove();

    if (this.currentChannel && this.currentChannel !== channelIdentifier) {
      this.channelChat.chatHistory = [];
      this.knownTotalVideos = null;
    }
    this.currentChannel = channelIdentifier;
    this.channelChat.currentChannel = channelIdentifier;
    const domTotal = YouTubeDOMContext.extractChannelTotalVideosFromDOM?.() || null;
    if (domTotal) this.knownTotalVideos = domTotal;

    const banner = document.createElement('div');
    banner.id = 'yt-ai-channel-companion';
    banner.className = 'yt-ai-channel-card';
    if (banner.style) {
      banner.style.cssText = 'width:100%;max-width:100%;margin:0;background:var(--yt-ai-bg);border-bottom:1px solid var(--yt-ai-border-subtle);color:var(--yt-ai-text);box-sizing:border-box;display:block;position:relative;z-index:999;';
    }
    ThemeManager.syncThemeWithYouTube(banner);

    const lang = this.state.currentLang || 'fr';
    const isFr = lang.startsWith('fr');
    const t = I18N[lang] || I18N.en;
    const drawerHtml = SettingsDrawerTemplate.render(t, { showCloseBtn: true });
    const activeJob = this.service?.getActiveJob?.(channelIdentifier) || null;
    const maxVideos = resolveEffectiveChannelLimit(activeJob?.maxVideos || this.state.channelAuditMaxVideos || 30, this.knownTotalVideos);
    const html = ChannelCompanionTemplate.render({
      channelIdentifier,
      isFr,
      lang,
      maxVideos,
      totalVideos: this.knownTotalVideos,
      isExpanded: this.isExpanded,
      drawerHtml
    });

    safeSetInnerHTML(banner, html);
    if (anchor.reference) anchor.parent.insertBefore(banner, anchor.reference);
    else anchor.parent.appendChild(banner);

    if (!this.isExpanded) {
      const body = banner.querySelector('#ytAiCompanionBody');
      body?.classList?.add('yt-ai-hidden');
      if (body?.style) body.style.display = 'none';
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('resize'));

    syncFullscreenVisibility();
    this._bindEvents(banner);
    this.runController.bindSubscription();
    if (!this.runController.syncActiveJobUI(channelIdentifier, lang)) {
      this.runController.restoreCachedReport(channelIdentifier);
    }
    this._syncChannelCatalogTotal(channelIdentifier, lang);
    this.settingsDrawer?.syncProviderUI?.();
  }

  async _syncChannelCatalogTotal(channelId, lang = 'fr') {
    const mgr = this.channelChat?.channelManager || this.service?.channelManager;
    if (!channelId || typeof mgr?.getOrFetchChannelDossier !== 'function') return;
    try {
      const res = await mgr.getOrFetchChannelDossier(channelId, 30);
      if (this.currentChannel !== channelId || !res?.success || !res.channel) return;
      const resolvedTotal = res.channel.hasMore === false && res.channel.recentVideos?.length > 0
        ? res.channel.recentVideos.length
        : (res.channel.totalChannelVideos || null);
      if (resolvedTotal && resolvedTotal > 0) {
        this.knownTotalVideos = resolvedTotal;
        const sel = document.getElementById?.('ytAiCompanionMaxVideos');
        const activeVal = sel?.value || this.state.channelAuditMaxVideos || 30;
        syncChannelMaxSelectElement(sel, activeVal, lang.startsWith('fr'), resolvedTotal);
      }
    } catch (_) {}
  }

  switchTab(tab = 'channelAudit') {
    this.activeTab = tab;
    const root = document.getElementById?.('yt-ai-channel-companion') || document;
    const isAudit = tab === 'channelAudit';
    const setActive = (id, on) => {
      const el = root.querySelector?.(`#${id}`) || document.getElementById?.(id);
      el?.classList?.[on ? 'add' : 'remove']?.('active');
    };
    setActive('ytAiChanTabAuditBtn', isAudit);
    setActive('ytAiChanTabChatBtn', !isAudit);
    setActive('ytAiChanPaneAudit', isAudit);
    setActive('ytAiChanPaneChat', !isAudit);
  }

  reset(lang = 'fr') {
    this.channelChat.resetChat(lang, false);
    const resultBox = document.getElementById('ytAiChannelResultContainer');
    if (resultBox) {
      resultBox.innerHTML = '';
      resultBox.classList.add('yt-ai-hidden');
    }
  }

  refreshLanguage(lang) {
    const resolved = lang || this.state.currentLang || 'fr';
    this.state.currentLang = resolved;
    if (!isChannelPage()) return;
    const existing = document.getElementById?.('yt-ai-channel-companion');
    if (existing) {
      ChannelCompanionI18n.applyLanguage(resolved, this);
    } else {
      this.tryInjectCompanion(true);
    }
  }

  _bindEvents(banner) {
    const toggleBtn = banner.querySelector('#ytAiCompanionToggleBtn');
    const brandToggle = banner.querySelector('#ytAiBrandToggle');
    const body = banner.querySelector('#ytAiCompanionBody');
    const handleToggle = () => {
      if (!body) return;
      this.isExpanded = !this.isExpanded;
      body.classList?.toggle('yt-ai-hidden', !this.isExpanded);
      if (body.style) body.style.display = this.isExpanded ? 'block' : 'none';
      const t = I18N[this.state.currentLang || 'fr'] || I18N.en;
      const toggleLabel = this.isExpanded ? (t.collapse || 'Collapse') : (t.expand || 'Expand');
      const toggleText = banner.querySelector('#ytAiCompToggleText');
      const toggleIcon = banner.querySelector('#ytAiCompToggleIcon');
      if (toggleText && toggleIcon) {
        toggleText.textContent = toggleLabel;
        toggleIcon.textContent = this.isExpanded ? '▲' : '▾';
      } else if (toggleBtn) {
        toggleBtn.textContent = `${toggleLabel} ${this.isExpanded ? '▲' : '▾'}`;
      }
      if (toggleBtn) toggleBtn.title = toggleLabel;
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('resize'));
    };
    if (toggleBtn && body) {
      toggleBtn.addEventListener('click', handleToggle);
    }
    if (brandToggle && body) {
      brandToggle.addEventListener('click', handleToggle);
    }

    banner.querySelector('#ytAiCompLangSelect')?.addEventListener('change', (e) => {
      const newLang = e.target.value;
      if (!newLang) return;
      this.state.currentLang = newLang;
      this.state.savePreference?.('targetLang', newLang);
      this.refreshLanguage(newLang);
      this.audioController?.populateVoiceDropdown?.(newLang);
    });

    banner.querySelector('#ytAiCompanionSettingsBtn')?.addEventListener('click', () => {
      SettingsDrawerController.toggleSettingsDrawer();
      const drawer = banner.querySelector('#ytAiSettingsDrawer');
      if (drawer && !drawer.classList.contains('yt-ai-hidden')) this.settingsDrawer?.syncProviderUI();
    });

    if (this.settingsDrawer) SettingsDrawerEventHandler.bind(banner, this.settingsDrawer, this.state, null);

    banner.querySelector('#ytAiChanTabAuditBtn')?.addEventListener('click', () => this.switchTab('channelAudit'));
    banner.querySelector('#ytAiChanTabChatBtn')?.addEventListener('click', () => this.switchTab('channelChat'));

    banner.querySelector('#ytAiRunChannelAuditBtn')?.addEventListener('click', () => {
      if (this.service?.isAuditRunning?.(this.currentChannel)) {
        this.handleStopAudit();
        return;
      }
      this.switchTab('channelAudit');
      if (!this.isExpanded && toggleBtn) toggleBtn.click();
      this.handleRunAudit();
    });

    banner.querySelectorAll('.yt-ai-period-pill').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        banner.querySelectorAll('.yt-ai-period-pill').forEach((p) => p.classList.remove('active'));
        const target = e?.currentTarget || pill;
        target.classList?.add('active');
        this.state.channelAuditPeriod = (target.dataset && target.dataset.period) || 'all';
      });
    });

    const maxSelect = banner.querySelector('#ytAiCompanionMaxVideos');
    if (maxSelect) {
      maxSelect.value = String(resolveEffectiveChannelLimit(this.state.channelAuditMaxVideos || 30, this.knownTotalVideos));
      maxSelect.addEventListener('change', (e) => {
        const parsed = parseChannelAuditLimit(e.target.value);
        this.state.channelAuditMaxVideos = parsed.isAll ? 'all' : parsed.numericLimit;
        this.state.savePreference?.('channelAuditMaxVideos', this.state.channelAuditMaxVideos);
      });
    }

    this.channelChat.bindEvents(banner, this.state);
  }

  handleStopAudit() {
    this.runController.stop();
  }

  handleRunAudit() {
    return this.runController.run();
  }

  _renderReport(report, resultBox, lang) {
    this.runController.renderReport(report, resultBox, lang);
  }

  _restoreCachedReport(channelId) {
    return this.runController.restoreCachedReport(channelId);
  }
}

export default ChannelCompanionCard;
