import { ChromeStorageService } from '../services/implementations/ChromeStorageService.js';

const POPUP_I18N = {
  en: {
    switchTitle: 'Extension on YouTube',
    switchDesc: 'Show AI summary panel on video pages',
    active: 'Active',
    disabled: 'Disabled',
    currentVideo: '🎬 Current Video',
    expandOnPage: 'Expand on page',
    collapseOnPage: 'Collapse on page',
    showOnPage: 'Show on page',
    summarize: 'Summarize',
    idleTitle: 'Ready for YouTube',
    idleDesc: 'Open any YouTube video to summarize with local or cloud AI models.',
    goToYoutube: 'Go to YouTube ↗',
    disabledTitle: 'Extension Paused',
    disabledDesc: 'The companion banner is disabled on YouTube. Flip the switch above to re-enable anytime.',
    loadingVideo: 'Detecting video info...'
  },
  fr: {
    switchTitle: 'Extension sur YouTube',
    switchDesc: 'Afficher le panneau IA sur les vidéos',
    active: 'Active',
    disabled: 'Désactivée',
    currentVideo: '🎬 Vidéo en cours',
    expandOnPage: 'Déplier sur la page',
    collapseOnPage: 'Replier sur la page',
    showOnPage: 'Afficher sur la page',
    summarize: 'Résumer',
    idleTitle: 'Prêt pour YouTube',
    idleDesc: 'Ouvrez une vidéo YouTube pour générer une synthèse avec vos modèles IA.',
    goToYoutube: 'Accéder à YouTube ↗',
    disabledTitle: 'Extension en pause',
    disabledDesc: 'Le bandeau est masqué sur YouTube. Réactivez l\'interrupteur ci-dessus à tout moment.',
    loadingVideo: 'Détection de la vidéo...'
  }
};

/**
 * Controller for Extension Toolbar Action Popup Window
 * Lightweight Control Center for toggling and controlling in-page AI companion
 */
export class PopupController {
  constructor() {
    this.storage = new ChromeStorageService();
    this.currentLang = 'en';
    this.extensionEnabled = true;
    this.activeTab = null;
    this.inPageStatus = null;
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.inspectActiveTab();
    this.applyLocalization();
  }

  async loadSettings() {
    const data = await this.storage.getMultiple(['extensionEnabled', 'targetLang']);
    this.extensionEnabled = data.extensionEnabled !== undefined ? Boolean(data.extensionEnabled) : true;
    this.currentLang = data.targetLang || (navigator.language.startsWith('fr') ? 'fr' : 'en');

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

      const isYouTubeWatch = this.activeTab.url.includes('youtube.com/watch') && this.activeTab.url.includes('v=');

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

    if (this.inPageStatus?.isWatch) {
      idleCard?.classList.add('hidden');
      videoCard?.classList.remove('hidden');

      const titleEl = document.getElementById('videoTitle');
      if (titleEl) {
        titleEl.textContent = this.inPageStatus.title || this.activeTab?.title?.replace(/ - YouTube$/, '') || 'YouTube Video';
      }

      const stateBadge = document.getElementById('bannerStateBadge');
      const toggleText = document.getElementById('toggleBannerText');
      const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;

      if (this.inPageStatus.isExpanded) {
        if (stateBadge) stateBadge.textContent = 'Expanded';
        if (toggleText) toggleText.textContent = t.collapseOnPage;
      } else {
        if (stateBadge) stateBadge.textContent = 'Collapsed';
        if (toggleText) toggleText.textContent = t.expandOnPage;
      }
    } else {
      videoCard?.classList.add('hidden');
      idleCard?.classList.remove('hidden');
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

    const switchTitle = document.getElementById('switchTitle');
    if (switchTitle) switchTitle.textContent = t.switchTitle;

    const switchDesc = document.getElementById('switchDesc');
    if (switchDesc) switchDesc.textContent = t.switchDesc;

    const idleTitle = document.getElementById('idleTitle');
    if (idleTitle) idleTitle.textContent = t.idleTitle;

    const idleDesc = document.getElementById('idleDesc');
    if (idleDesc) idleDesc.textContent = t.idleDesc;

    const disabledTitle = document.getElementById('disabledTitle');
    if (disabledTitle) disabledTitle.textContent = t.disabledTitle;

    const disabledDesc = document.getElementById('disabledDesc');
    if (disabledDesc) disabledDesc.textContent = t.disabledDesc;

    const summarizeBtnText = document.getElementById('summarizeBtnText');
    if (summarizeBtnText) summarizeBtnText.textContent = t.summarize;

    this.updateStatusPill(this.extensionEnabled);
    this.renderCards();
  }
}

export default PopupController;
