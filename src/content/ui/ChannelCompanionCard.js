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
import { PaneExportHelper } from './PaneExportHelper.js';
import { WebPageLayoutShifter } from './WebPageLayoutShifter.js';
import { I18N } from '../../locales/index.js';

/**
 * Official Top-of-Page Channel Companion Banner (@handle, /channel/, /c/).
 * Anchors cleanly above YouTube masthead with unified 1-line 1-click header tabs.
 */
export class ChannelCompanionCard {
  constructor(options = {}) {
    this.service = options.channelAuditService;
    this.viewController = options.channelAuditViewController;
    this.settingsDrawer = options.settingsDrawer || null;
    this.audioController = options.audioController || null;
    this.state = options.state || {};
    this.currentChannel = '';
    this.isExpanded = false;
    this.activeTab = 'channelAudit';
    this._webLayoutShifter = new WebPageLayoutShifter();
    this.runController = new ChannelCompanionRunController(this);
    this.channelChat = new ChannelChatController({
      channelAuditService: this.service,
      audioController: options.audioController,
      transcriptController: options.transcriptController,
      channelManager: options.channelManager
    });
  }

  _findChannelAnchor() {
    if (typeof document === 'undefined' || !document.body) return null;
    return { parent: document.body, reference: document.body.firstElementChild || null };
  }

  tryInjectCompanion(forceReinject = false) {
    if (!this.state.extensionEnabled || !isChannelPage()) {
      this._webLayoutShifter?.detach();
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
      this._webLayoutShifter?.attach?.(existing);
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
    banner.className = 'yt-ai-channel-card yt-ai-top-shell is-collapsed';
    if (banner.style) {
      banner.style.cssText = 'width:100%;max-width:100%;margin:0;background:var(--yt-ai-bg);border-bottom:1px solid var(--yt-ai-border-subtle);color:var(--yt-ai-text);box-sizing:border-box;display:block;position:relative;z-index:2147483647;';
    }
    ThemeManager.syncThemeWithYouTube(banner);

    const lang = this.state.currentLang || 'fr';
    const isFr = lang.startsWith('fr');
    const t = I18N[lang] || I18N.en;
    const drawerHtml = SettingsDrawerTemplate.render(t, { showCloseBtn: true, currentLang: lang, currentMode: this.state.summaryMode || 'standard' });
    const activeJob = this.service?.getActiveJob?.(channelIdentifier) || null;
    if (activeJob) this.isExpanded = true;
    const maxVideos = resolveEffectiveChannelLimit(activeJob?.maxVideos || this.state.channelAuditMaxVideos || 30, this.knownTotalVideos);
    const html = ChannelCompanionTemplate.render({
      channelIdentifier,
      isFr,
      lang,
      maxVideos,
      totalVideos: this.knownTotalVideos,
      isExpanded: this.isExpanded,
      channelAuditMode: this.state.channelAuditMode || 'standard',
      drawerHtml
    });

    safeSetInnerHTML(banner, html);
    if (anchor.reference) anchor.parent.insertBefore(banner, anchor.reference);
    else anchor.parent.appendChild(banner);

    if (!this.isExpanded) {
      const body = banner.querySelector('#ytAiCompanionBody');
      body?.classList?.add('yt-ai-hidden');
      if (body?.style) body.style.display = 'none';
    } else {
      banner.classList?.remove('is-collapsed');
    }
    this._webLayoutShifter?.attach(banner);
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
    const setExpanded = (expand) => {
      if (!body) return;
      this.isExpanded = Boolean(expand);
      banner.classList?.toggle?.('is-collapsed', !this.isExpanded);
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
      this._webLayoutShifter?.sync();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('resize'));
    };
    const handleToggle = () => setExpanded(!this.isExpanded);
    if (toggleBtn && body) toggleBtn.addEventListener('click', handleToggle);
    if (brandToggle && body) brandToggle.addEventListener('click', handleToggle);

    const onLangChange = (e) => {
      const newLang = e.target.value;
      if (!newLang) return;
      this.state.currentLang = newLang;
      this.state.savePreference?.('targetLang', newLang);
      this.refreshLanguage(newLang);
      this.audioController?.populateVoiceDropdown?.(newLang);
    };
    banner.querySelector('#ytAiLangSelect')?.addEventListener('change', onLangChange);
    banner.querySelector('#ytAiCompLangSelect')?.addEventListener('change', onLangChange);

    banner.querySelector('#ytAiChannelAuditModeSelect')?.addEventListener('change', (e) => {
      this.state.channelAuditMode = e.target.value;
      this.state.savePreference?.('channelAuditMode', e.target.value);
    });

    banner.querySelector('#ytAiCompanionSettingsBtn')?.addEventListener('click', () => {
      SettingsDrawerController.toggleSettingsDrawer();
      const drawer = banner.querySelector('#ytAiSettingsDrawer');
      if (drawer && !drawer.classList.contains('yt-ai-hidden')) this.settingsDrawer?.syncProviderUI();
      this._webLayoutShifter?.sync();
    });

    if (this.settingsDrawer) SettingsDrawerEventHandler.bind(banner, this.settingsDrawer, this.state, null);

    banner.querySelector('#ytAiChanTabAuditBtn')?.addEventListener('click', () => {
      setExpanded(true);
      this.switchTab('channelAudit');
      const resultBox = banner.querySelector('#ytAiChannelResultContainer');
      const hasResult = Boolean(resultBox && !resultBox.classList?.contains?.('yt-ai-hidden') && resultBox.innerHTML?.trim());
      if (!hasResult && !this.service?.isAuditRunning?.(this.currentChannel)) {
        this.handleRunAudit();
      }
    });
    banner.querySelector('#ytAiChanTabChatBtn')?.addEventListener('click', () => {
      setExpanded(true);
      this.switchTab('channelChat');
      setTimeout(() => banner.querySelector('#ytAiChannelChatInput')?.focus?.(), 80);
    });

    banner.querySelector('#ytAiRunChannelAuditBtn')?.addEventListener('click', () => {
      if (this.service?.isAuditRunning?.(this.currentChannel)) {
        this.handleStopAudit();
        return;
      }
      setExpanded(true);
      this.switchTab('channelAudit');
      this.handleRunAudit();
    });

    ['selectstart', 'copy'].forEach((evt) => banner.addEventListener?.(evt, (e) => e.stopPropagation?.()));

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
    PaneExportHelper.bind({
      root: banner,
      prefix: 'ytAiCompanionAudit',
      copyBtnId: 'ytAiCopyCompanionAuditBtn',
      getLang: () => this.state.currentLang,
      getPayload: () => ({ markdown: banner.querySelector('#ytAiChannelResultContainer')?.innerText || '', title: this.currentChannel })
    });
  }

  handleStopAudit() { this.runController.stop(); }
  handleRunAudit() { return this.runController.run(); }
  _renderReport(report, resultBox, lang) { this.runController.renderReport(report, resultBox, lang); }
  _restoreCachedReport(channelId) { return this.runController.restoreCachedReport(channelId); }
}

export default ChannelCompanionCard;
