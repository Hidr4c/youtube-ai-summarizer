import { ChromeStorageService } from '../services/implementations/ChromeStorageService.js';
import { isWatchPage } from '../content/ui/NavigationObserver.js';
import { POPUP_I18N } from './PopupI18n.js';
import { PopupCacheController } from './PopupCacheController.js';
import { detectBrowserLang } from '../locales/index.js';

/**
 * Controller for Extension Toolbar Action Popup Window
 * Lightweight Control Center for toggling and controlling in-page AI companion
 */
export class PopupController {
  constructor() {
    this.storage = new ChromeStorageService();
    this.currentLang = detectBrowserLang();
    this.extensionEnabled = true;
    this.activeTab = null;
    this.inPageStatus = null;
    this.cacheController = new PopupCacheController({
      getActiveTab: () => this.activeTab,
      getLang: () => this.currentLang
    });
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.inspectActiveTab();
    await this.cacheController.init();
    this.applyLocalization();
  }

  async loadSettings() {
    const data = await this.storage.getMultiple(['extensionEnabled', 'targetLang']);
    this.extensionEnabled = data.extensionEnabled !== undefined ? Boolean(data.extensionEnabled) : true;
    this.currentLang = data.targetLang || detectBrowserLang();

    const toggle = document.getElementById('extensionToggle');
    if (toggle) toggle.checked = this.extensionEnabled;

    const langPicker = document.getElementById('quickLangSelect');
    if (langPicker) langPicker.value = this.currentLang;

    this.updateStatusPill(this.extensionEnabled);
  }

  setupEventListeners() {
    // Master Extension Toggle Switch
    const toggle = document.getElementById('extensionToggle');
    if (toggle) {
      toggle.addEventListener('change', async () => {
        this.extensionEnabled = toggle.checked;
        await this.storage.set('extensionEnabled', this.extensionEnabled);
        this.updateStatusPill(this.extensionEnabled);
        this.updateBadge(this.extensionEnabled);

        // Notify active tab if it's on YouTube
        if (this.activeTab?.id) {
          chrome.tabs.sendMessage(this.activeTab.id, {
            action: 'SET_EXTENSION_ENABLED',
            enabled: this.extensionEnabled
          }).catch(() => {});
        }

        this.renderCards();
      });
    }

    // Toggle In-Page Banner Button
    const toggleBannerBtn = document.getElementById('toggleBannerBtn');
    if (toggleBannerBtn) {
      toggleBannerBtn.addEventListener('click', async () => {
        if (!this.activeTab?.id) return;
        try {
          await chrome.tabs.sendMessage(this.activeTab.id, { action: 'TOGGLE_IN_PAGE_BANNER' });
          window.close(); // Close popup so user interacts with YouTube
        } catch (e) {
          console.warn('Failed to toggle in-page banner:', e);
        }
      });
    }

    // Trigger Summarize Button
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) {
      summarizeBtn.addEventListener('click', async () => {
        if (!this.activeTab?.id) return;
        try {
          await chrome.tabs.sendMessage(this.activeTab.id, { action: 'TRIGGER_SUMMARIZE' });
          window.close(); // Close popup so user views generated summary
        } catch (e) {
          console.warn('Failed to trigger in-page summarization:', e);
        }
      });
    }

    // Analyze / Open ClarifAI Web Page Panel
    const analyzeWebBtn = document.getElementById('analyzeWebPageBtn');
    if (analyzeWebBtn) {
      analyzeWebBtn.addEventListener('click', async () => {
        if (!this.activeTab?.id) return;
        try {
          await chrome.tabs.sendMessage(this.activeTab.id, { action: 'OPEN_WEB_PANEL' });
        } catch {
          try {
            await chrome.scripting.insertCSS({ target: { tabId: this.activeTab.id }, files: ['dist/content.css'] });
            await chrome.scripting.executeScript({ target: { tabId: this.activeTab.id }, files: ['dist/content.js'] });
            await new Promise((r) => setTimeout(r, 180));
            await chrome.tabs.sendMessage(this.activeTab.id, { action: 'OPEN_WEB_PANEL' }).catch(() => {});
          } catch (e) {
            console.warn('Web page injection failed:', e);
          }
        }
        window.close();
      });
    }

    // Open YouTube Button
    const openYoutubeBtn = document.getElementById('openYoutubeBtn');
    if (openYoutubeBtn) {
      openYoutubeBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: 'https://www.youtube.com' });
          window.close();
        }
      });
    }

    // Language Picker
    const langPicker = document.getElementById('quickLangSelect');
    if (langPicker) {
      langPicker.addEventListener('change', async (e) => {
        this.currentLang = e.target.value;
        await this.storage.set('targetLang', this.currentLang);
        this.applyLocalization();

        if (this.activeTab?.id) {
          chrome.tabs.sendMessage(this.activeTab.id, {
            action: 'SET_LANGUAGE',
            lang: this.currentLang
          }).catch(() => {});
        }
      });
    }
  }

  async inspectActiveTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.activeTab = tabs[0] || null;
      if (!this.activeTab?.url) {
        this.renderCards();
        return;
      }

      const isYouTubeWatch = (() => {
        try {
          const u = new URL(this.activeTab.url);
          const isYouTubeHost = u.hostname === 'youtube.com' || u.hostname.endsWith('.youtube.com');
          return isYouTubeHost && isWatchPage(this.activeTab.url);
        } catch {
          return false;
        }
      })();

      if (isYouTubeWatch) {
        // Query in-page companion status
        try {
          const res = await chrome.tabs.sendMessage(this.activeTab.id, { action: 'GET_IN_PAGE_STATUS' });
          if (res) {
            this.inPageStatus = res;
          }
        } catch (err) {
          // Content script not answering or just injected
          this.inPageStatus = {
            enabled: this.extensionEnabled,
            isWatch: true,
            hasBanner: true,
            isExpanded: false,
            title: this.activeTab.title ? this.activeTab.title.replace(/ - YouTube$/, '') : ''
          };
        }
      } else {
        this.inPageStatus = null;
      }

      this.renderCards();
    } catch (e) {
      console.warn('Tab inspection error:', e);
      this.renderCards();
    }
  }

  renderCards() {
    const videoCard = document.getElementById('videoCard');
    const idleCard = document.getElementById('idleCard');
    const disabledCard = document.getElementById('disabledNoticeCard');

    if (!this.extensionEnabled) {
      videoCard?.classList.add('hidden');
      idleCard?.classList.add('hidden');
      disabledCard?.classList.remove('hidden');
      return;
    }

    disabledCard?.classList.add('hidden');

    if (this.inPageStatus?.isWatch || this.inPageStatus?.isWatchPage) {
      idleCard?.classList.add('hidden');
      videoCard?.classList.remove('hidden');

      const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;
      const titleEl = document.getElementById('videoTitle');
      if (titleEl) {
        titleEl.textContent = this.inPageStatus.title || this.activeTab?.title?.replace(/ - YouTube$/, '') || t.youtubeVideoFallback;
      }

      const stateBadge = document.getElementById('bannerStateBadge');
      const toggleText = document.getElementById('toggleBannerText');

      if (this.inPageStatus.isExpanded) {
        if (stateBadge) stateBadge.textContent = t.bannerExpanded;
        if (toggleText) toggleText.textContent = t.collapseOnPage;
      } else {
        if (stateBadge) stateBadge.textContent = t.bannerCollapsed;
        if (toggleText) toggleText.textContent = t.expandOnPage;
      }
    } else {
      videoCard?.classList.add('hidden');
      idleCard?.classList.remove('hidden');
      const webBtn = document.getElementById('analyzeWebPageBtn');
      const isHttpWeb = Boolean(this.activeTab?.url && /^https?:\/\//i.test(this.activeTab.url));
      if (webBtn) webBtn.classList.toggle('hidden', !isHttpWeb);
    }
  }

  updateStatusPill(enabled) {
    const pill = document.getElementById('statusPill');
    const text = document.getElementById('statusPillText');
    const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;

    if (pill) {
      if (enabled) {
        pill.className = 'status-pill active';
        if (text) text.textContent = t.active;
      } else {
        pill.className = 'status-pill disabled';
        if (text) text.textContent = t.disabled;
      }
    }
  }

  updateBadge(enabled) {
    if (typeof chrome !== 'undefined' && chrome.action?.setBadgeText) {
      if (!enabled) {
        chrome.action.setBadgeText({ text: 'OFF' });
        if (chrome.action.setBadgeBackgroundColor) {
          chrome.action.setBadgeBackgroundColor({ color: '#6e7681' });
        }
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  }

  applyLocalization() {
    const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;
    const textMap = {
      switchTitle: t.switchTitle, switchDesc: t.switchDesc,
      idleTitle: t.idleTitle, idleDesc: t.idleDesc,
      disabledTitle: t.disabledTitle, disabledDesc: t.disabledDesc,
      summarizeBtnText: t.summarize, currentVideoBadge: t.currentVideo,
      openYoutubeBtnText: t.goToYoutube,
      analyzeWebPageBtnText: t.analyzeWebPage || '🛡️ Analyze this page'
    };
    Object.entries(textMap).forEach(([id, txt]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    });

    const extVersion = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest)
      ? `v${chrome.runtime.getManifest().version}`
      : 'v2.0.1';
    const versionEl = document.getElementById('brandVersion');
    if (versionEl) versionEl.textContent = `${extVersion} • ${t.privacyTagline}`;

    this.updateStatusPill(this.extensionEnabled);
    this.renderCards();
    this.cacheController.applyLocalization(t);
  }
}

export default PopupController;
