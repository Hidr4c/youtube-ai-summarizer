(() => {
  // src/services/interfaces/IStorageService.js
  var IStorageService = class {
    /**
     * Retrieves value for a specific key
     * @param {string} key
     * @param {any} defaultValue
     * @returns {Promise<any>}
     */
    async get(key, defaultValue = null) {
      throw new Error("Not implemented");
    }
    /**
     * Stores value for a specific key
     * @param {string} key
     * @param {any} value
     * @returns {Promise<void>}
     */
    async set(key, value) {
      throw new Error("Not implemented");
    }
    /**
     * Retrieves multiple keys at once
     * @param {Array<string>} keys
     * @returns {Promise<Object>}
     */
    async getMultiple(keys) {
      throw new Error("Not implemented");
    }
    /**
     * Saves multiple key/value pairs
     * @param {Object} items
     * @returns {Promise<void>}
     */
    async setMultiple(items) {
      throw new Error("Not implemented");
    }
  };

  // src/services/implementations/ChromeStorageService.js
  var ChromeStorageService = class extends IStorageService {
    constructor() {
      super();
      this.isChromeStorageAvailable = typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
    }
    /**
     * @param {string} key
     * @param {any} defaultValue
     * @returns {Promise<any>}
     */
    async get(key, defaultValue = null) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError || result[key] === void 0) {
              resolve(defaultValue);
            } else {
              resolve(result[key]);
            }
          });
        });
      }
      try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    /**
     * @param {string} key
     * @param {any} value
     * @returns {Promise<void>}
     */
    async set(key, value) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => resolve());
        });
      }
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
      }
    }
    /**
     * @param {Array<string>} keys
     * @returns {Promise<Object>}
     */
    async getMultiple(keys) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        });
      }
      const result = {};
      for (const k of keys) {
        result[k] = await this.get(k, null);
      }
      return result;
    }
    /**
     * @param {Object} items
     * @returns {Promise<void>}
     */
    async setMultiple(items) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.set(items, () => resolve());
        });
      }
      for (const [k, v] of Object.entries(items)) {
        await this.set(k, v);
      }
    }
  };

  // src/popup/PopupController.js
  var POPUP_I18N = {
    en: {
      switchTitle: "Extension on YouTube",
      switchDesc: "Show AI summary panel on video pages",
      active: "Active",
      disabled: "Disabled",
      currentVideo: "\u{1F3AC} Current Video",
      expandOnPage: "Expand on page",
      collapseOnPage: "Collapse on page",
      showOnPage: "Show on page",
      summarize: "Summarize",
      idleTitle: "Ready for YouTube",
      idleDesc: "Open any YouTube video to summarize with local or cloud AI models.",
      goToYoutube: "Go to YouTube \u2197",
      disabledTitle: "Extension Paused",
      disabledDesc: "The companion banner is disabled on YouTube. Flip the switch above to re-enable anytime.",
      loadingVideo: "Detecting video info..."
    },
    fr: {
      switchTitle: "Extension sur YouTube",
      switchDesc: "Afficher le panneau IA sur les vid\xE9os",
      active: "Active",
      disabled: "D\xE9sactiv\xE9e",
      currentVideo: "\u{1F3AC} Vid\xE9o en cours",
      expandOnPage: "D\xE9plier sur la page",
      collapseOnPage: "Replier sur la page",
      showOnPage: "Afficher sur la page",
      summarize: "R\xE9sumer",
      idleTitle: "Pr\xEAt pour YouTube",
      idleDesc: "Ouvrez une vid\xE9o YouTube pour g\xE9n\xE9rer une synth\xE8se avec vos mod\xE8les IA.",
      goToYoutube: "Acc\xE9der \xE0 YouTube \u2197",
      disabledTitle: "Extension en pause",
      disabledDesc: "Le bandeau est masqu\xE9 sur YouTube. R\xE9activez l'interrupteur ci-dessus \xE0 tout moment.",
      loadingVideo: "D\xE9tection de la vid\xE9o..."
    }
  };
  var PopupController = class {
    constructor() {
      this.storage = new ChromeStorageService();
      this.currentLang = "en";
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
      const data = await this.storage.getMultiple(["extensionEnabled", "targetLang"]);
      this.extensionEnabled = data.extensionEnabled !== void 0 ? Boolean(data.extensionEnabled) : true;
      this.currentLang = data.targetLang || (navigator.language.startsWith("fr") ? "fr" : "en");
      const toggle = document.getElementById("extensionToggle");
      if (toggle) toggle.checked = this.extensionEnabled;
      const langPicker = document.getElementById("quickLangSelect");
      if (langPicker) langPicker.value = this.currentLang;
      this.updateStatusPill(this.extensionEnabled);
    }
    setupEventListeners() {
      const toggle = document.getElementById("extensionToggle");
      if (toggle) {
        toggle.addEventListener("change", async () => {
          this.extensionEnabled = toggle.checked;
          await this.storage.set("extensionEnabled", this.extensionEnabled);
          this.updateStatusPill(this.extensionEnabled);
          this.updateBadge(this.extensionEnabled);
          if (this.activeTab?.id) {
            chrome.tabs.sendMessage(this.activeTab.id, {
              action: "SET_EXTENSION_ENABLED",
              enabled: this.extensionEnabled
            }).catch(() => {
            });
          }
          this.renderCards();
        });
      }
      const toggleBannerBtn = document.getElementById("toggleBannerBtn");
      if (toggleBannerBtn) {
        toggleBannerBtn.addEventListener("click", async () => {
          if (!this.activeTab?.id) return;
          try {
            await chrome.tabs.sendMessage(this.activeTab.id, { action: "TOGGLE_IN_PAGE_BANNER" });
            window.close();
          } catch (e) {
            console.warn("Failed to toggle in-page banner:", e);
          }
        });
      }
      const summarizeBtn = document.getElementById("summarizeBtn");
      if (summarizeBtn) {
        summarizeBtn.addEventListener("click", async () => {
          if (!this.activeTab?.id) return;
          try {
            await chrome.tabs.sendMessage(this.activeTab.id, { action: "TRIGGER_SUMMARIZE" });
            window.close();
          } catch (e) {
            console.warn("Failed to trigger in-page summarization:", e);
          }
        });
      }
      const openYoutubeBtn = document.getElementById("openYoutubeBtn");
      if (openYoutubeBtn) {
        openYoutubeBtn.addEventListener("click", () => {
          if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: "https://www.youtube.com" });
            window.close();
          }
        });
      }
      const langPicker = document.getElementById("quickLangSelect");
      if (langPicker) {
        langPicker.addEventListener("change", async (e) => {
          this.currentLang = e.target.value;
          await this.storage.set("targetLang", this.currentLang);
          this.applyLocalization();
          if (this.activeTab?.id) {
            chrome.tabs.sendMessage(this.activeTab.id, {
              action: "SET_LANGUAGE",
              lang: this.currentLang
            }).catch(() => {
            });
          }
        });
      }
    }
    async inspectActiveTab() {
      if (typeof chrome === "undefined" || !chrome.tabs) return;
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.activeTab = tabs[0] || null;
        if (!this.activeTab?.url) {
          this.renderCards();
          return;
        }
        const isYouTubeWatch = this.activeTab.url.includes("youtube.com/watch") && this.activeTab.url.includes("v=");
        if (isYouTubeWatch) {
          try {
            const res = await chrome.tabs.sendMessage(this.activeTab.id, { action: "GET_IN_PAGE_STATUS" });
            if (res) {
              this.inPageStatus = res;
            }
          } catch (err) {
            this.inPageStatus = {
              enabled: this.extensionEnabled,
              isWatch: true,
              hasBanner: true,
              isExpanded: false,
              title: this.activeTab.title ? this.activeTab.title.replace(/ - YouTube$/, "") : ""
            };
          }
        } else {
          this.inPageStatus = null;
        }
        this.renderCards();
      } catch (e) {
        console.warn("Tab inspection error:", e);
        this.renderCards();
      }
    }
    renderCards() {
      const videoCard = document.getElementById("videoCard");
      const idleCard = document.getElementById("idleCard");
      const disabledCard = document.getElementById("disabledNoticeCard");
      if (!this.extensionEnabled) {
        videoCard?.classList.add("hidden");
        idleCard?.classList.add("hidden");
        disabledCard?.classList.remove("hidden");
        return;
      }
      disabledCard?.classList.add("hidden");
      if (this.inPageStatus?.isWatch) {
        idleCard?.classList.add("hidden");
        videoCard?.classList.remove("hidden");
        const titleEl = document.getElementById("videoTitle");
        if (titleEl) {
          titleEl.textContent = this.inPageStatus.title || this.activeTab?.title?.replace(/ - YouTube$/, "") || "YouTube Video";
        }
        const stateBadge = document.getElementById("bannerStateBadge");
        const toggleText = document.getElementById("toggleBannerText");
        const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;
        if (this.inPageStatus.isExpanded) {
          if (stateBadge) stateBadge.textContent = "Expanded";
          if (toggleText) toggleText.textContent = t.collapseOnPage;
        } else {
          if (stateBadge) stateBadge.textContent = "Collapsed";
          if (toggleText) toggleText.textContent = t.expandOnPage;
        }
      } else {
        videoCard?.classList.add("hidden");
        idleCard?.classList.remove("hidden");
      }
    }
    updateStatusPill(enabled) {
      const pill = document.getElementById("statusPill");
      const text = document.getElementById("statusPillText");
      const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;
      if (pill) {
        if (enabled) {
          pill.className = "status-pill active";
          if (text) text.textContent = t.active;
        } else {
          pill.className = "status-pill disabled";
          if (text) text.textContent = t.disabled;
        }
      }
    }
    updateBadge(enabled) {
      if (typeof chrome !== "undefined" && chrome.action?.setBadgeText) {
        if (!enabled) {
          chrome.action.setBadgeText({ text: "OFF" });
          if (chrome.action.setBadgeBackgroundColor) {
            chrome.action.setBadgeBackgroundColor({ color: "#6e7681" });
          }
        } else {
          chrome.action.setBadgeText({ text: "" });
        }
      }
    }
    applyLocalization() {
      const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;
      const switchTitle = document.getElementById("switchTitle");
      if (switchTitle) switchTitle.textContent = t.switchTitle;
      const switchDesc = document.getElementById("switchDesc");
      if (switchDesc) switchDesc.textContent = t.switchDesc;
      const idleTitle = document.getElementById("idleTitle");
      if (idleTitle) idleTitle.textContent = t.idleTitle;
      const idleDesc = document.getElementById("idleDesc");
      if (idleDesc) idleDesc.textContent = t.idleDesc;
      const disabledTitle = document.getElementById("disabledTitle");
      if (disabledTitle) disabledTitle.textContent = t.disabledTitle;
      const disabledDesc = document.getElementById("disabledDesc");
      if (disabledDesc) disabledDesc.textContent = t.disabledDesc;
      const summarizeBtnText = document.getElementById("summarizeBtnText");
      if (summarizeBtnText) summarizeBtnText.textContent = t.summarize;
      this.updateStatusPill(this.extensionEnabled);
      this.renderCards();
    }
  };

  // src/popup/index.js
  document.addEventListener("DOMContentLoaded", () => {
    const controller = new PopupController();
    controller.init();
  });
})();
