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
    /**
     * Removes value for a specific key
     * @param {string} key
     * @returns {Promise<void>}
     */
    async remove(key) {
      throw new Error("Not implemented");
    }
    /**
     * Removes multiple keys at once
     * @param {Array<string>} keys
     * @returns {Promise<void>}
     */
    async removeMultiple(keys) {
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
    /**
     * @param {string} key
     * @returns {Promise<void>}
     */
    async remove(key) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.remove([key], () => resolve());
        });
      }
      try {
        localStorage.removeItem(key);
      } catch {
      }
    }
    /**
     * @param {Array<string>} keys
     * @returns {Promise<void>}
     */
    async removeMultiple(keys) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.remove(keys, () => resolve());
        });
      }
      for (const k of keys) {
        try {
          localStorage.removeItem(k);
        } catch {
        }
      }
    }
  };

  // src/content/ui/NavigationObserver.js
  var NavigationObserver = class _NavigationObserver {
    /** Parses an optional URL string against current window origin safely. */
    static _parseUrl(url) {
      try {
        const base = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://www.youtube.com";
        return url ? new URL(url, base) : typeof window !== "undefined" ? window.location : null;
      } catch (_) {
        return null;
      }
    }
    /** Checks if URL is a YouTube Shorts player page (/shorts/<id>). */
    static isShortsPage(url) {
      const u = _NavigationObserver._parseUrl(url);
      const path = typeof u?.pathname === "string" ? u.pathname : "";
      return path.startsWith("/shorts/") && path.length > 8;
    }
    /** Checks if current URL is a YouTube watch page (watch, live, shorts). */
    static isWatchPage(url) {
      const u = _NavigationObserver._parseUrl(url);
      if (!u || typeof u.pathname !== "string") return false;
      if (u.pathname === "/watch" && new URLSearchParams(u.search || "").has("v")) return true;
      if (u.pathname.startsWith("/live/") && u.pathname.length > 6) return true;
      return _NavigationObserver.isShortsPage(url);
    }
    /** Checks if current URL is a YouTube channel page (@handle, /channel/, /c/, /user/). */
    static isChannelPage(url) {
      const u = _NavigationObserver._parseUrl(url);
      const path = typeof u?.pathname === "string" ? u.pathname : "";
      if (!path) return false;
      if (path.startsWith("/@") && path.length > 2) return true;
      if (path.startsWith("/channel/") && path.length > 9) return true;
      if (path.startsWith("/c/") && path.length > 3) return true;
      return path.startsWith("/user/") && path.length > 6;
    }
    /** Extracts YouTube channel handle or ID from URL. */
    static getChannelIdentifier(url) {
      const u = _NavigationObserver._parseUrl(url);
      const path = typeof u?.pathname === "string" ? u.pathname : "";
      if (!path) return "";
      if (path.startsWith("/@")) return path.split("/")[1] || "";
      const match = path.match(/^\/(channel|c|user)\/([^\/?#]+)/);
      return match ? match[2] : "";
    }
    /** Extracts YouTube video ID from URL (watch, live, shorts, embed). */
    static getVideoId(url) {
      const u = _NavigationObserver._parseUrl(url);
      if (!u) return "";
      const v = new URLSearchParams(u.search || "").get("v");
      if (v) return v;
      if (typeof u.pathname !== "string") return "";
      const match = u.pathname.match(/^\/(?:live|shorts|embed)\/([^/?#]+)/);
      return match ? match[1] : "";
    }
    /**
     * Resolves the currently active HTMLVideoElement across Watch and Shorts feeds
     * @returns {HTMLVideoElement|null}
     */
    static getActiveVideoElement() {
      if (typeof document === "undefined" || typeof document.querySelector !== "function") return null;
      return document.querySelector("ytd-reel-video-renderer[is-active] video") || document.querySelector("#shorts-player video") || document.querySelector("#movie_player video") || document.querySelector("video") || null;
    }
    /**
     * Extracts YouTube video ID embedded within free-form text or URL
     * @param {string} text
     * @returns {string}
     */
    static extractVideoIdFromText(text) {
      const ids = _NavigationObserver.extractAllVideoIdsFromText(text);
      return ids[0] || "";
    }
    /**
     * Extracts all unique YouTube video IDs embedded within free-form text
     * @param {string} text
     * @returns {string[]}
     */
    static extractAllVideoIdsFromText(text) {
      if (!text || typeof text !== "string") return [];
      const urlMatches = text.match(/https?:\/\/[^\s"'<>\)]+/gi) || [];
      const ids = [];
      const parseUrl = (rawUrl) => {
        try {
          const u = new URL(rawUrl);
          const v = u.searchParams.get("v");
          if (v && v.length >= 11) return v.slice(0, 11);
          if (v) return v;
          const liveMatch = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
          if (liveMatch) return liveMatch[1].slice(0, 11);
          if (u.hostname === "youtu.be" || u.hostname.endsWith(".youtu.be")) {
            const id = u.pathname.replace(/^\//, "").split("?")[0];
            if (id) return id.slice(0, 11);
          }
        } catch (_) {
        }
        const fallback = rawUrl.match(/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
        return fallback ? fallback[1] : "";
      };
      for (const raw of urlMatches) {
        const vid = parseUrl(raw);
        if (vid && !ids.includes(vid)) ids.push(vid);
      }
      if (ids.length === 0) {
        const genericMatch = text.matchAll(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi);
        for (const gm of genericMatch) {
          if (gm[1] && !ids.includes(gm[1])) ids.push(gm[1]);
        }
      }
      return ids;
    }
    /**
     * Starts navigation and DOM listeners
     * @param {Object} handlers
     * @param {Function} handlers.onUrlChange
     * @param {Function} handlers.onDomCheck
     */
    static observeNavigation(handlers = {}) {
      let lastObservedUrl = window.location.href;
      let lastVideoId = _NavigationObserver.getVideoId(window.location.href);
      const handleNavigation = () => {
        const currentUrl = window.location.href;
        const currentVideoId = _NavigationObserver.getVideoId(currentUrl);
        const isNewVideo = !!(currentVideoId && currentVideoId !== lastVideoId);
        lastObservedUrl = currentUrl;
        const prevVideoId = lastVideoId;
        if (currentVideoId) {
          lastVideoId = currentVideoId;
        }
        const payload = {
          isNewVideo,
          currentVideoId,
          prevVideoId,
          url: currentUrl,
          isChannel: _NavigationObserver.isChannelPage(currentUrl),
          channelIdentifier: _NavigationObserver.getChannelIdentifier(currentUrl)
        };
        if (typeof handlers === "function") {
          handlers(payload);
        } else {
          if (typeof handlers?.onUrlChange === "function") {
            handlers.onUrlChange(payload);
          }
          if (isNewVideo && typeof handlers?.onVideoChange === "function") {
            handlers.onVideoChange(currentVideoId, prevVideoId);
          }
        }
      };
      window.addEventListener("yt-navigate-finish", handleNavigation);
      window.addEventListener("yt-page-data-updated", handleNavigation);
      window.addEventListener("spfdone", handleNavigation);
      window.addEventListener("popstate", handleNavigation);
      setInterval(() => {
        if (window.location.href !== lastObservedUrl) {
          handleNavigation();
        }
      }, 350);
      const observer = new MutationObserver(() => {
        if (typeof handlers.onDomCheck === "function") {
          handlers.onDomCheck();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return observer;
    }
    /**
     * Detects whether YouTube or the browser viewport is currently in fullscreen mode
     * @returns {boolean}
     */
    static isFullscreen() {
      if (typeof document === "undefined") return false;
      if (document.fullscreenElement || document.webkitFullscreenElement) return true;
      if (typeof document.querySelector === "function") {
        return Boolean(document.querySelector("ytd-watch-flexy[fullscreen], ytd-watch-grid[fullscreen], ytd-shorts[fullscreen], ytm-shorts[fullscreen], ytd-app[fullscreen], ytm-watch[fullscreen], ytm-app[fullscreen], .html5-video-player.ytp-fullscreen"));
      }
      return false;
    }
    /**
     * Synchronizes fullscreen hidden state across injected extension containers
     * @returns {boolean}
     */
    static syncFullscreenVisibility() {
      const fs = _NavigationObserver.isFullscreen();
      if (typeof document !== "undefined") {
        ["yt-ai-summarizer-container", "yt-ai-channel-companion"].forEach((id) => {
          const el = document.getElementById?.(id);
          if (!el?.classList) return;
          if (typeof el.classList.contains === "function" && el.classList.contains("yt-ai-fullscreen-hidden") === fs) return;
          if (typeof el.classList.toggle === "function") {
            el.classList.toggle("yt-ai-fullscreen-hidden", fs);
          } else if (fs) {
            el.classList.add?.("yt-ai-fullscreen-hidden");
          } else {
            el.classList.remove?.("yt-ai-fullscreen-hidden");
          }
        });
      }
      return fs;
    }
    /**
     * Subscribes to native Fullscreen API events and YouTube player attribute transitions
     * @returns {Function} cleanup callback
     */
    static observeFullscreen() {
      if (typeof document === "undefined") return () => {
      };
      const onFsChange = () => _NavigationObserver.syncFullscreenVisibility();
      document.addEventListener?.("fullscreenchange", onFsChange);
      document.addEventListener?.("webkitfullscreenchange", onFsChange);
      let attrObserver = null;
      if (typeof MutationObserver !== "undefined") {
        attrObserver = new MutationObserver(onFsChange);
        attrObserver.observe(document.documentElement, {
          attributes: true,
          subtree: true,
          attributeFilter: ["fullscreen", "class"]
        });
      }
      onFsChange();
      return () => {
        document.removeEventListener?.("fullscreenchange", onFsChange);
        document.removeEventListener?.("webkitfullscreenchange", onFsChange);
        attrObserver?.disconnect();
      };
    }
    static isYouTubeHost(url) {
      const u = _NavigationObserver._parseUrl(url);
      let h = String(u?.hostname || "").toLowerCase();
      if (!h && typeof u?.origin === "string") {
        try {
          h = new URL(u.origin).hostname.toLowerCase();
        } catch {
        }
      }
      return h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com");
    }
    static isWebPageMode(url) {
      const u = _NavigationObserver._parseUrl(url);
      const proto = u?.protocol || (typeof u?.origin === "string" && u.origin.includes(":") ? `${u.origin.split(":")[0]}:` : "");
      if (!u || !/^https?:$/i.test(proto)) return false;
      return !_NavigationObserver.isYouTubeHost(url) || !_NavigationObserver.isWatchPage(url) && !_NavigationObserver.isChannelPage(url);
    }
  };
  var isYouTubeHost = NavigationObserver.isYouTubeHost;
  var isWebPageMode = NavigationObserver.isWebPageMode;
  var isShortsPage = NavigationObserver.isShortsPage;
  var isWatchPage = NavigationObserver.isWatchPage;
  var isChannelPage = NavigationObserver.isChannelPage;
  var getChannelIdentifier = NavigationObserver.getChannelIdentifier;
  var getVideoId = NavigationObserver.getVideoId;
  var getActiveVideoElement = NavigationObserver.getActiveVideoElement;
  var extractVideoIdFromText = NavigationObserver.extractVideoIdFromText;
  var extractAllVideoIdsFromText = NavigationObserver.extractAllVideoIdsFromText;
  var isFullscreen = NavigationObserver.isFullscreen;
  var syncFullscreenVisibility = NavigationObserver.syncFullscreenVisibility;
  var observeFullscreen = NavigationObserver.observeFullscreen;
  var observeNavigation = NavigationObserver.observeNavigation;

  // src/popup/PopupI18n.js
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
      analyzeWebPage: "\u{1F6E1}\uFE0F Analyze this page",
      disabledTitle: "Extension Paused",
      disabledDesc: "The companion banner is disabled on YouTube. Flip the switch above to re-enable anytime.",
      loadingVideo: "Detecting video info...",
      cacheTitle: "\u{1F4BE} Cache & Storage",
      cacheDesc: "Transcripts, summaries, and audits stored locally to save AI tokens.",
      purgeBtn: "Purge",
      purgeAll: "Clear all videos",
      purge7Days: "Older than 7 days",
      purge30Days: "Older than 30 days",
      purgeSuccess: "\u2713 Cache successfully purged ({count} video(s))",
      cacheEmpty: "0 Ko (0 videos)",
      bannerExpanded: "Expanded",
      bannerCollapsed: "Collapsed",
      youtubeVideoFallback: "YouTube Video",
      privacyTagline: "Privacy-First"
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
      analyzeWebPage: "\u{1F6E1}\uFE0F Analyser cette page",
      disabledTitle: "Extension en pause",
      disabledDesc: "Le bandeau est masqu\xE9 sur YouTube. R\xE9activez l'interrupteur ci-dessus \xE0 tout moment.",
      loadingVideo: "D\xE9tection de la vid\xE9o...",
      cacheTitle: "\u{1F4BE} Gestion du Cache",
      cacheDesc: "Transcriptions, synth\xE8ses et audits stock\xE9s localement pour \xE9conomiser vos jetons.",
      purgeBtn: "Purger",
      purgeAll: "Vider tout le cache",
      purge7Days: "Plus ancien que 7 jours",
      purge30Days: "Plus ancien que 30 jours",
      purgeSuccess: "\u2713 Cache purg\xE9 avec succ\xE8s ({count} vid\xE9o(s))",
      cacheEmpty: "0 Ko (0 vid\xE9o)",
      bannerExpanded: "D\xE9pli\xE9",
      bannerCollapsed: "Repli\xE9",
      youtubeVideoFallback: "Vid\xE9o YouTube",
      privacyTagline: "Confidentialit\xE9 d\u2019abord"
    },
    es: {
      switchTitle: "Extensi\xF3n en YouTube",
      switchDesc: "Mostrar panel de IA en p\xE1ginas de v\xEDdeo",
      active: "Activa",
      disabled: "Desactivada",
      currentVideo: "\u{1F3AC} V\xEDdeo actual",
      expandOnPage: "Desplegar en p\xE1gina",
      collapseOnPage: "Plegar en p\xE1gina",
      showOnPage: "Mostrar en p\xE1gina",
      summarize: "Resumir",
      idleTitle: "Listo para YouTube",
      idleDesc: "Abra cualquier v\xEDdeo de YouTube para resumirlo con IA local o nube.",
      goToYoutube: "Ir a YouTube \u2197",
      analyzeWebPage: "\u{1F6E1}\uFE0F Analizar esta p\xE1gina",
      disabledTitle: "Extensi\xF3n pausada",
      disabledDesc: "El banner est\xE1 desactivado. Active el interruptor para reactivarlo.",
      loadingVideo: "Detectando v\xEDdeo...",
      cacheTitle: "\u{1F4BE} Gesti\xF3n de Cach\xE9",
      cacheDesc: "Transcripciones, res\xFAmenes y auditor\xEDas guardados para ahorrar tokens.",
      purgeBtn: "Purgar",
      purgeAll: "Vaciar toda la cach\xE9",
      purge7Days: "M\xE1s de 7 d\xEDas",
      purge30Days: "M\xE1s de 30 d\xEDas",
      purgeSuccess: "\u2713 Cach\xE9 purgada con \xE9xito ({count} v\xEDdeo(s))",
      cacheEmpty: "0 Ko (0 v\xEDdeos)",
      bannerExpanded: "Expandido",
      bannerCollapsed: "Contra\xEDdo",
      youtubeVideoFallback: "V\xEDdeo de YouTube",
      privacyTagline: "Privacidad primero"
    },
    de: {
      switchTitle: "Erweiterung auf YouTube",
      switchDesc: "KI-Zusammenfassungsleiste auf Videos anzeigen",
      active: "Aktiv",
      disabled: "Deaktiviert",
      currentVideo: "\u{1F3AC} Aktuelles Video",
      expandOnPage: "Auf Seite ausklappen",
      collapseOnPage: "Auf Seite einklappen",
      showOnPage: "Auf Seite anzeigen",
      summarize: "Zusammenfassen",
      idleTitle: "Bereit f\xFCr YouTube",
      idleDesc: "\xD6ffnen Sie ein beliebiges YouTube-Video, um es zusammenzufassen.",
      goToYoutube: "Zu YouTube \u2197",
      analyzeWebPage: "\u{1F6E1}\uFE0F Diese Seite analysieren",
      disabledTitle: "Erweiterung pausiert",
      disabledDesc: "Die Leiste ist deaktiviert. Schalten Sie den Schalter um, um sie zu aktivieren.",
      loadingVideo: "Video wird erkannt...",
      cacheTitle: "\u{1F4BE} Cache-Verwaltung",
      cacheDesc: "Lokal gespeicherte Daten zur Einsparung von KI-Tokens.",
      purgeBtn: "Bereinigen",
      purgeAll: "Gesamten Cache leeren",
      purge7Days: "\xC4lter als 7 Tage",
      purge30Days: "\xC4lter als 30 Tage",
      purgeSuccess: "\u2713 Cache erfolgreich bereinigt ({count} Video(s))",
      cacheEmpty: "0 Ko (0 Videos)",
      bannerExpanded: "Ausgeklappt",
      bannerCollapsed: "Eingeklappt",
      youtubeVideoFallback: "YouTube-Video",
      privacyTagline: "Datenschutz zuerst"
    },
    it: {
      switchTitle: "Estensione su YouTube",
      switchDesc: "Mostra pannello IA sui video",
      active: "Attiva",
      disabled: "Disattivata",
      currentVideo: "\u{1F3AC} Video corrente",
      expandOnPage: "Espandi sulla pagina",
      collapseOnPage: "Comprimi sulla pagina",
      showOnPage: "Mostra sulla pagina",
      summarize: "Riassumi",
      idleTitle: "Pronto per YouTube",
      idleDesc: "Apri un video di YouTube per riassumerlo con modelli locali o cloud.",
      goToYoutube: "Vai su YouTube \u2197",
      analyzeWebPage: "\u{1F6E1}\uFE0F Analizza questa pagina",
      disabledTitle: "Estensione in pausa",
      disabledDesc: "Il banner \xE8 disattivato. Attiva l'interruttore per riabilitarlo.",
      loadingVideo: "Rilevamento del video...",
      cacheTitle: "\u{1F4BE} Gestione Cache",
      cacheDesc: "Trascrizioni e riassunti salvati localmente per risparmiare token.",
      purgeBtn: "Svuota",
      purgeAll: "Svuota tutta la cache",
      purge7Days: "Pi\xF9 vecchio di 7 giorni",
      purge30Days: "Pi\xF9 vecchio di 30 giorni",
      purgeSuccess: "\u2713 Cache svuotata con successo ({count} video)",
      cacheEmpty: "0 Ko (0 video)",
      bannerExpanded: "Espanso",
      bannerCollapsed: "Compresso",
      youtubeVideoFallback: "Video YouTube",
      privacyTagline: "Privacy al primo posto"
    },
    ru: {
      switchTitle: "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u043D\u0430 YouTube",
      switchDesc: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C \u0418\u0418 \u043D\u0430 \u0432\u0438\u0434\u0435\u043E",
      active: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E",
      disabled: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
      currentVideo: "\u{1F3AC} \u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0432\u0438\u0434\u0435\u043E",
      expandOnPage: "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435",
      collapseOnPage: "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435",
      showOnPage: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435",
      summarize: "\u0420\u0435\u0437\u044E\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      idleTitle: "\u0413\u043E\u0442\u043E\u0432\u043E \u043A \u0440\u0430\u0431\u043E\u0442\u0435",
      idleDesc: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043B\u044E\u0431\u043E\u0435 \u0432\u0438\u0434\u0435\u043E YouTube \u0434\u043B\u044F \u0441\u0443\u043C\u043C\u0430\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0418\u0418.",
      goToYoutube: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 YouTube \u2197",
      analyzeWebPage: "\u{1F6E1}\uFE0F \u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443",
      disabledTitle: "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
      disabledDesc: "\u041F\u0430\u043D\u0435\u043B\u044C \u0441\u043A\u0440\u044B\u0442\u0430. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443.",
      loadingVideo: "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E...",
      cacheTitle: "\u{1F4BE} \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u044D\u0448\u0435\u043C",
      cacheDesc: "\u0422\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u0438 \u0438 \u0440\u0435\u0437\u044E\u043C\u0435, \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043D\u044B\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u044D\u043A\u043E\u043D\u043E\u043C\u0438\u0438 \u0442\u043E\u043A\u0435\u043D\u043E\u0432.",
      purgeBtn: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C",
      purgeAll: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0432\u0435\u0441\u044C \u043A\u044D\u0448",
      purge7Days: "\u0421\u0442\u0430\u0440\u0448\u0435 7 \u0434\u043D\u0435\u0439",
      purge30Days: "\u0421\u0442\u0430\u0440\u0448\u0435 30 \u0434\u043D\u0435\u0439",
      purgeSuccess: "\u2713 \u041A\u044D\u0448 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0447\u0438\u0449\u0435\u043D ({count} \u0432\u0438\u0434\u0435\u043E)",
      cacheEmpty: "0 Ko (0 \u0432\u0438\u0434\u0435\u043E)",
      bannerExpanded: "\u0420\u0430\u0437\u0432\u0451\u0440\u043D\u0443\u0442\u043E",
      bannerCollapsed: "\u0421\u0432\u0451\u0440\u043D\u0443\u0442\u043E",
      youtubeVideoFallback: "\u0412\u0438\u0434\u0435\u043E YouTube",
      privacyTagline: "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0441\u0442\u044C \u043F\u0440\u0435\u0436\u0434\u0435 \u0432\u0441\u0435\u0433\u043E"
    },
    ja: {
      switchTitle: "YouTube\u62E1\u5F35\u6A5F\u80FD",
      switchDesc: "\u52D5\u753B\u30DA\u30FC\u30B8\u3067AI\u8981\u7D04\u30D1\u30CD\u30EB\u3092\u8868\u793A",
      active: "\u6709\u52B9",
      disabled: "\u7121\u52B9",
      currentVideo: "\u{1F3AC} \u73FE\u5728\u306E\u52D5\u753B",
      expandOnPage: "\u30DA\u30FC\u30B8\u3067\u5C55\u958B",
      collapseOnPage: "\u30DA\u30FC\u30B8\u3067\u6298\u308A\u305F\u305F\u3080",
      showOnPage: "\u30DA\u30FC\u30B8\u3067\u8868\u793A",
      summarize: "\u8981\u7D04\u3059\u308B",
      idleTitle: "YouTube\u306E\u6E96\u5099\u5B8C\u4E86",
      idleDesc: "YouTube\u52D5\u753B\u3092\u958B\u3044\u3066AI\u30E2\u30C7\u30EB\u3067\u8981\u7D04\u3092\u751F\u6210\u3057\u307E\u3059\u3002",
      goToYoutube: "YouTube\u3092\u958B\u304F \u2197",
      analyzeWebPage: "\u{1F6E1}\uFE0F \u3053\u306E\u30DA\u30FC\u30B8\u3092\u5206\u6790",
      disabledTitle: "\u62E1\u5F35\u6A5F\u80FD\u306F\u4E00\u6642\u505C\u6B62\u4E2D",
      disabledDesc: "\u30D0\u30CA\u30FC\u306F\u975E\u8868\u793A\u3067\u3059\u3002\u4E0A\u90E8\u306E\u30B9\u30A4\u30C3\u30C1\u3067\u3044\u3064\u3067\u3082\u518D\u6709\u52B9\u5316\u3067\u304D\u307E\u3059\u3002",
      loadingVideo: "\u52D5\u753B\u60C5\u5831\u3092\u691C\u51FA\u4E2D...",
      cacheTitle: "\u{1F4BE} \u30AD\u30E3\u30C3\u30B7\u30E5\u7BA1\u7406",
      cacheDesc: "AI\u30C8\u30FC\u30AF\u30F3\u3092\u7BC0\u7D04\u3059\u308B\u305F\u3081\u306B\u30ED\u30FC\u30AB\u30EB\u4FDD\u5B58\u3055\u308C\u305F\u8981\u7D04\u3068\u6587\u5B57\u8D77\u3053\u3057\u3002",
      purgeBtn: "\u524A\u9664",
      purgeAll: "\u5168\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u524A\u9664",
      purge7Days: "7\u65E5\u3088\u308A\u524D",
      purge30Days: "30\u65E5\u3088\u308A\u524D",
      purgeSuccess: "\u2713 \u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u524A\u9664\u3057\u307E\u3057\u305F ({count}\u4EF6)",
      cacheEmpty: "0 Ko (0\u4EF6)",
      bannerExpanded: "\u5C55\u958B\u4E2D",
      bannerCollapsed: "\u6298\u308A\u305F\u305F\u307F\u4E2D",
      youtubeVideoFallback: "YouTube\u52D5\u753B",
      privacyTagline: "\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u512A\u5148"
    },
    zh: {
      switchTitle: "YouTube \u6269\u5C55\u529F\u80FD",
      switchDesc: "\u5728\u89C6\u9891\u9875\u9762\u4E0A\u663E\u793A AI \u6458\u8981\u9762\u677F",
      active: "\u5DF2\u542F\u7528",
      disabled: "\u5DF2\u7981\u7528",
      currentVideo: "\u{1F3AC} \u5F53\u524D\u89C6\u9891",
      expandOnPage: "\u5728\u9875\u9762\u5C55\u5F00",
      collapseOnPage: "\u5728\u9875\u9762\u6298\u53E0",
      showOnPage: "\u5728\u9875\u9762\u663E\u793A",
      summarize: "\u751F\u6210\u6458\u8981",
      idleTitle: "YouTube \u5DF2\u5C31\u7EEA",
      idleDesc: "\u6253\u5F00\u4EFB\u610F YouTube \u89C6\u9891\u5373\u53EF\u4F7F\u7528 AI \u6A21\u578B\u751F\u6210\u6458\u8981\u3002",
      goToYoutube: "\u8BBF\u95EE YouTube \u2197",
      analyzeWebPage: "\u{1F6E1}\uFE0F \u5206\u6790\u6B64\u9875\u9762",
      disabledTitle: "\u6269\u5C55\u5DF2\u6682\u505C",
      disabledDesc: "\u6A2A\u5E45\u5DF2\u9690\u85CF\u3002\u968F\u65F6\u6253\u5F00\u4E0A\u65B9\u5F00\u5173\u5373\u53EF\u91CD\u65B0\u542F\u7528\u3002",
      loadingVideo: "\u6B63\u5728\u68C0\u6D4B\u89C6\u9891...",
      cacheTitle: "\u{1F4BE} \u7F13\u5B58\u7BA1\u7406",
      cacheDesc: "\u672C\u5730\u5B58\u50A8\u7684\u6587\u672C\u548C\u6458\u8981\uFF0C\u8282\u7701 AI Token\u3002",
      purgeBtn: "\u6E05\u9664",
      purgeAll: "\u6E05\u7A7A\u6240\u6709\u7F13\u5B58",
      purge7Days: "7\u5929\u4EE5\u524D",
      purge30Days: "30\u5929\u4EE5\u524D",
      purgeSuccess: "\u2713 \u7F13\u5B58\u5DF2\u6210\u529F\u6E05\u7406 ({count} \u4E2A\u89C6\u9891)",
      cacheEmpty: "0 Ko (0 \u4E2A\u89C6\u9891)",
      bannerExpanded: "\u5DF2\u5C55\u5F00",
      bannerCollapsed: "\u5DF2\u6298\u53E0",
      youtubeVideoFallback: "YouTube \u89C6\u9891",
      privacyTagline: "\u9690\u79C1\u4F18\u5148"
    }
  };

  // src/services/implementations/ExtensionCacheManager.js
  var INDEX_KEY = "yt_ai_cache_index";
  var CACHE_PREFIX = "yt_ai_cache_";
  var ExtensionCacheManager = class _ExtensionCacheManager {
    /**
     * @param {Object} [dependencies]
     */
    constructor(dependencies = {}) {
      this.storage = dependencies.storage || new ChromeStorageService();
    }
    /**
     * Retrieves the current index of all cached items
     * @returns {Promise<Array<Object>>}
     */
    async getIndex() {
      const list = await this.storage.get(INDEX_KEY, []);
      return Array.isArray(list) ? list : [];
    }
    /**
     * Saves or updates cache entry for a video
     * @param {string} videoId
     * @param {Object} payload
     * @returns {Promise<Object>}
     */
    async saveEntry(videoId, payload = {}) {
      if (!videoId) return null;
      const key = `${CACHE_PREFIX}${videoId}`;
      const now = Date.now();
      const data = {
        videoId,
        title: payload.title || "YouTube Video",
        cachedAt: now,
        summary: payload.summary || null,
        audit: payload.audit || null,
        comments: payload.comments || null,
        transcript: payload.transcript || null
      };
      const types = [];
      if (data.summary) types.push("summary");
      if (data.audit) types.push("audit");
      if (data.comments) types.push("comments");
      if (data.transcript) types.push("transcript");
      const serialized = JSON.stringify(data);
      const sizeBytes = serialized.length * 2;
      await this.storage.set(key, data);
      const index = await this.getIndex();
      const existingIdx = index.findIndex((item) => item.videoId === videoId);
      const record = {
        videoId,
        title: data.title,
        cachedAt: now,
        sizeBytes,
        types
      };
      if (existingIdx >= 0) {
        index[existingIdx] = record;
      } else {
        index.push(record);
      }
      await this.storage.set(INDEX_KEY, index);
      return record;
    }
    /**
     * Retrieves cached data for a specific video
     * @param {string} videoId
     * @returns {Promise<Object|null>}
     */
    async getEntry(videoId) {
      if (!videoId) return null;
      return await this.storage.get(`${CACHE_PREFIX}${videoId}`, null);
    }
    /**
     * Calculates comprehensive cache metrics
     * @returns {Promise<{totalBytes: number, totalVideos: number, formattedSize: string, entries: Array}>}
     */
    async getStats() {
      const index = await this.getIndex();
      let totalBytes = 0;
      for (const item of index) {
        totalBytes += item.sizeBytes || 0;
      }
      const sorted = [...index].sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0));
      return {
        totalBytes,
        totalVideos: index.length,
        formattedSize: _ExtensionCacheManager.formatBytes(totalBytes),
        entries: sorted
      };
    }
    /**
     * Purges all cached video data while preserving user settings
     * @returns {Promise<{clearedCount: number, freedBytes: number}>}
     */
    async clearAll() {
      const index = await this.getIndex();
      const keys = index.map((item) => `${CACHE_PREFIX}${item.videoId}`);
      let freedBytes = 0;
      for (const item of index) {
        freedBytes += item.sizeBytes || 0;
      }
      if (keys.length > 0) {
        await this.storage.removeMultiple(keys);
      }
      await this.storage.remove(INDEX_KEY);
      return {
        clearedCount: index.length,
        freedBytes
      };
    }
    /**
     * Purges items older than a given number of days
     * @param {number} days
     * @returns {Promise<{clearedCount: number, freedBytes: number}>}
     */
    async clearOlderThan(days) {
      const numericDays = Number(days);
      if (!numericDays || numericDays <= 0) return { clearedCount: 0, freedBytes: 0 };
      const index = await this.getIndex();
      const cutoff = Date.now() - numericDays * 24 * 60 * 60 * 1e3;
      const toRemove = [];
      const remaining = [];
      let freedBytes = 0;
      for (const item of index) {
        if ((item.cachedAt || 0) < cutoff) {
          toRemove.push(`${CACHE_PREFIX}${item.videoId}`);
          freedBytes += item.sizeBytes || 0;
        } else {
          remaining.push(item);
        }
      }
      if (toRemove.length > 0) {
        await this.storage.removeMultiple(toRemove);
        await this.storage.set(INDEX_KEY, remaining);
      }
      return {
        clearedCount: toRemove.length,
        freedBytes
      };
    }
    /**
     * Purges oldest entries until total cache size is under target maxBytes
     * @param {number} maxBytes
     * @returns {Promise<{clearedCount: number, freedBytes: number}>}
     */
    async clearToMaxBytes(maxBytes) {
      const target = Number(maxBytes);
      if (isNaN(target) || target < 0) return { clearedCount: 0, freedBytes: 0 };
      const index = await this.getIndex();
      const sorted = [...index].sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));
      let currentTotal = sorted.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
      const toRemoveKeys = [];
      const remaining = [];
      let freedBytes = 0;
      for (const item of sorted) {
        if (currentTotal > target) {
          toRemoveKeys.push(`${CACHE_PREFIX}${item.videoId}`);
          freedBytes += item.sizeBytes || 0;
          currentTotal -= item.sizeBytes || 0;
        } else {
          remaining.push(item);
        }
      }
      if (toRemoveKeys.length > 0) {
        await this.storage.removeMultiple(toRemoveKeys);
        await this.storage.set(INDEX_KEY, remaining);
      }
      return {
        clearedCount: toRemoveKeys.length,
        freedBytes
      };
    }
    /**
     * Human-readable byte size formatter
     * @param {number} bytes
     * @returns {string}
     */
    static formatBytes(bytes) {
      if (!bytes || bytes <= 0) return "0 Ko";
      const kb = bytes / 1024;
      if (kb < 1024) {
        return `${Math.round(kb)} Ko`;
      }
      const mb = kb / 1024;
      return `${mb.toFixed(1)} Mo`;
    }
  };

  // src/popup/PopupCacheController.js
  var PopupCacheController = class {
    /**
     * @param {Object} [dependencies]
     */
    constructor(dependencies = {}) {
      this.cacheManager = dependencies.cacheManager || new ExtensionCacheManager();
      this.getActiveTab = dependencies.getActiveTab || (() => null);
      this.getLang = dependencies.getLang || (() => "en");
    }
    /**
     * Initializes event listeners and updates UI metrics
     */
    async init() {
      this.bindEvents();
      await this.updateStats();
    }
    /**
     * Attaches click handlers for cache purging
     */
    bindEvents() {
      const purgeBtn = document.getElementById("purgeCacheBtn");
      if (purgeBtn) {
        purgeBtn.addEventListener("click", async () => {
          await this.handlePurge();
        });
      }
    }
    /**
     * Reads filter choice and executes purge
     */
    async handlePurge() {
      const filterEl = document.getElementById("cachePurgeFilter");
      const filter = filterEl?.value || "all";
      let result = { clearedCount: 0, freedBytes: 0 };
      if (filter === "all") {
        result = await this.cacheManager.clearAll();
      } else if (filter === "7") {
        result = await this.cacheManager.clearOlderThan(7);
      } else if (filter === "30") {
        result = await this.cacheManager.clearOlderThan(30);
      }
      await this.updateStats();
      this.showNotice(result.clearedCount);
      this.notifyActiveTab();
    }
    /**
     * Updates cache size and item count badge
     */
    async updateStats() {
      const stats = await this.cacheManager.getStats();
      const badge = document.getElementById("cacheSizeBadge");
      if (!badge) return;
      const lang = this.getLang();
      const t = POPUP_I18N[lang] || POPUP_I18N.en;
      if (stats.totalVideos === 0) {
        badge.textContent = t.cacheEmpty || "0 Ko (0)";
      } else {
        badge.textContent = `${stats.formattedSize} (${stats.totalVideos})`;
      }
    }
    /**
     * Displays temporary feedback notice
     * @param {number} count
     */
    showNotice(count) {
      const notice = document.getElementById("cacheNotice");
      if (!notice) return;
      const lang = this.getLang();
      const t = POPUP_I18N[lang] || POPUP_I18N.en;
      const msg = (t.purgeSuccess || "\u2713 Cache cleared ({count})").replace("{count}", count);
      notice.textContent = msg;
      notice.classList.remove("hidden");
      setTimeout(() => {
        notice.classList.add("hidden");
      }, 2800);
    }
    /**
     * Broadcasts cache invalidation signal to YouTube tab
     */
    notifyActiveTab() {
      const activeTab = this.getActiveTab();
      if (activeTab?.id && typeof chrome !== "undefined" && chrome.tabs?.sendMessage) {
        chrome.tabs.sendMessage(activeTab.id, { action: "CLEAR_CACHE" }).catch(() => {
        });
      }
    }
    /**
     * Applies language dictionary strings to cache UI controls
     * @param {Object} t
     */
    applyLocalization(t) {
      const titleEl = document.getElementById("cacheBadgeTitle");
      if (titleEl) titleEl.textContent = t.cacheTitle || "\u{1F4BE} Cache";
      const descEl = document.getElementById("cacheDesc");
      if (descEl) descEl.textContent = t.cacheDesc || "";
      const btnText = document.getElementById("purgeCacheBtnText");
      if (btnText) btnText.textContent = t.purgeBtn || "Purge";
      const filterEl = document.getElementById("cachePurgeFilter");
      if (filterEl && filterEl.options.length >= 3) {
        filterEl.options[0].text = t.purgeAll || "Clear all";
        filterEl.options[1].text = t.purge7Days || "> 7 days";
        filterEl.options[2].text = t.purge30Days || "> 30 days";
      }
    }
  };

  // src/locales/fr.js
  var fr = {
    "brandName": "ClarifAI",
    "checking": "V\xE9rification...",
    "connectedBadge": "Connect\xE9",
    "offlineBadge": "Hors-ligne",
    "modelLoading": "Mod\xE8le : Chargement...",
    "modelPrefix": "Mod\xE8le : ",
    "summarizeBtn": "\u2728 R\xE9sumer cette vid\xE9o",
    "collapse": "R\xE9duire",
    "expand": "D\xE9plier",
    "providerLabel": "Fournisseur IA :",
    "groupLocal": "\u{1F3E0} Mod\xE8les Locaux (Gratuits & Priv\xE9s)",
    "groupFast": "\u26A1 Inf\xE9rence Cloud Rapide / Gratuite",
    "groupCloud": "\u2601\uFE0F Fournisseurs Cloud Majeurs",
    "serverLabel": "Serveur :",
    "serverLabelLm": "Serveur LM Studio :",
    "serverLabelOllama": "Serveur Ollama :",
    "noModelSelected": "Aucun mod\xE8le s\xE9lectionn\xE9",
    "keyOk": "Cl\xE9 OK",
    "keySaved": "Cl\xE9 enregistr\xE9e",
    "invalidKey": "Cl\xE9 invalide",
    "serverBusy": "Serveur satur\xE9 (r\xE9essayer)",
    "keyRequired": "Cl\xE9 requise",
    "customServer": "Autre IP...",
    "refreshTooltip": "Actualiser la liste des mod\xE8les",
    "toggleKeyVisTooltip": "Afficher / masquer la cl\xE9 API",
    "pasteClipboardHint": "[i] Presse-papiers vide ou bloqu\xE9 \u2014 collez avec Ctrl+V dans le champ Cl\xE9 API.",
    "apiKeyLabel": "Cl\xE9 API :",
    "apiKeyPlaceholder": "Collez votre cl\xE9 API...",
    "getApiKeyLink": "\u{1F511} Obtenir une cl\xE9",
    "modelLabel": "Mod\xE8le :",
    "testModelBtn": "\u26A1 Tester",
    "testModelTooltip": "Tester la connexion et le mod\xE8le",
    "langLabel": "Langue :",
    "formatLabel": "Format :",
    "formatStandard": "\u{1F4CC} Naturelle & \xE9quilibr\xE9e",
    "formatQuick": "\u26A1 Courte & concise",
    "formatDetailed": "\u{1F4DD} D\xE9taill\xE9e & approfondie",
    "voiceLabel": "Voix :",
    "voiceDefault": "Voix syst\xE8me...",
    "micLabel": "Micro :",
    "micDefault": "\u{1F399}\uFE0F Micro par d\xE9faut",
    "tabSummary": "\u{1F4C4} R\xE9sum\xE9 de la vid\xE9o",
    "tabChat": "\u{1F4AC} Poser des questions",
    "tabTranscript": "\u{1F4DC} Transcription",
    "summaryTitle": "\u{1F4C4} R\xE9sum\xE9 de la vid\xE9o",
    "listenBtn": "\u{1F50A} \xC9couter",
    "stopListenBtn": "\u23F9\uFE0F Arr\xEAter",
    "copyBtn": "\u{1F4CB} Copier",
    "copiedBtn": "\u2705 Copi\xE9 !",
    "saveMdBtn": "\u{1F4BE} Sauvegarder .md",
    "reasoningModel": "\u{1F4AD} R\xE9flexion du mod\xE8le",
    "reasoningInProgress": "en cours...",
    "reasoningDone": "termin\xE9e",
    "emptyTitle": "Pr\xEAt \xE0 r\xE9sumer cette vid\xE9o",
    "emptySubtitle": "Extrayez les points cl\xE9s, chapitres et conclusions en quelques secondes gr\xE2ce \xE0 l'IA.",
    "newVideoTitle": "Nouvelle vid\xE9o d\xE9tect\xE9e",
    "summaryPlaceholder": "Cliquez sur \xAB \u2728 R\xE9sumer cette vid\xE9o \xBB pour g\xE9n\xE9rer la synth\xE8se.",
    "newVideoPlaceholder": "Nouvelle vid\xE9o d\xE9tect\xE9e. Cliquez sur \xAB \u2728 R\xE9sumer cette vid\xE9o \xBB pour g\xE9n\xE9rer la synth\xE8se.",
    "generatingSummary": "G\xE9n\xE9ration de la synth\xE8se en cours...",
    "waitingForModel": "Chargement du mod\xE8le / pr\xE9paration du contexte ({sec}s)...",
    "streamInterrupted": "Connexion interrompue avant la r\xE9ponse du mod\xE8le. V\xE9rifiez que le mod\xE8le a fini de charger puis r\xE9essayez.",
    "chatTitle": "\u{1F4AC} Questions & R\xE9ponses sur la vid\xE9o",
    "clearChatBtn": "\u{1F5D1}\uFE0F Effacer la discussion",
    "suggestions": [
      { "label": "\u{1F4A1} Points cl\xE9s", "question": "Quels sont les points cl\xE9s essentiels \xE0 retenir ?" },
      { "label": "\u23F1\uFE0F Quand parle-t-il du sujet ?", "question": "\xC0 quel moment de la vid\xE9o parle-t-il du sujet principal ?" },
      { "label": "\u{1F4CA} Chiffres & Exemples", "question": "Quels sont les exemples, chiffres ou arguments cit\xE9s ?" },
      { "label": "\u{1F3AF} Conclusion & Conseils", "question": "Que conseille ou conclut l'auteur \xE0 la fin ?" }
    ],
    "chatWelcome": "Bonjour ! Posez-moi n'importe quelle question sur le contenu de cette vid\xE9o. Je m'appuie directement sur sa transcription int\xE9grale.",
    "chatPlaceholder": "Posez une question ou dictez au micro... (Entr\xE9e pour envoyer)",
    "chatInputListening": "\u{1F399}\uFE0F Dict\xE9e en cours... Parlez dans votre microphone.",
    "chatResetNotice": "Discussion r\xE9initialis\xE9e. Posez une question sur le contenu de la vid\xE9o !",
    "micTitle": "Dicter votre question au micro",
    "attachTitle": "Joindre une image ou un fichier (ou coller Ctrl+V)",
    "attachTitleTextOnly": "Joindre un fichier texte/code (images r\xE9serv\xE9es aux mod\xE8les multimodaux)",
    "attachImageNotSupported": "Le mod\xE8le s\xE9lectionn\xE9 ne prend pas en charge les images. Choisissez un mod\xE8le multimodal (ex. Qwen3.8, Gemini, GPT-4o, Claude) ou joignez un fichier texte.",
    "attachTooLarge": "L'image d\xE9passe la limite de 8 Mo.",
    "webTabSummary": "\u{1F4C4} R\xE9sum\xE9 de la page",
    "webTabAudit": "\u{1F6E1}\uFE0F Fiabilit\xE9 de la page",
    "webRunAuditBtn": "\u26A1 Auditer la page",
    "webTabDomain": "\u{1F310} Audit du site",
    "webDomainAuditTitle": "\u{1F310} Audit global du site",
    "webRunDomainAuditBtn": "\u26A1 Auditer le site",
    "webDepthLabel": "Profondeur :",
    "webDepthLevelUnit": "niveau(x)",
    "webExtractedTitle": "\u{1F4DC} Contenu extrait & Signaux URL",
    "webSummarizeBtn": "\u2728 R\xE9sumer la page",
    "webReliabilityLabel": "Indice de fiabilit\xE9",
    "webTileConn": "Connexion & URL",
    "webTileBrand": "Identit\xE9 pr\xE9tendue",
    "webTileForms": "Formulaires",
    "webTileDom": "Int\xE9grit\xE9 DOM",
    "webTileSite": "Site analys\xE9",
    "webTileLegal": "Pages officielles",
    "webTileContacts": "Contacts officiels",
    "webValHttp": "HTTP non chiffr\xE9",
    "webValFormsWarn": "Champs sensibles d\xE9tect\xE9s",
    "webValFormsOk": "Aucun pi\xE8ge d\xE9tect\xE9",
    "webValDomWarn": "Signaux suspects",
    "webValDomOk": "DOM sain",
    "webValNoneFound": "Aucun contact visible",
    "webTileStructure": "S\xE9rieux & structure",
    "webPagesFound": "{n} page(s) trouv\xE9e(s)",
    "webNoLegalPages": "Aucune d\xE9tect\xE9e",
    "webValStructComplete": "Site structur\xE9",
    "webValStructPartial": "Structure incompl\xE8te",
    "webValStructMinimal": "Page isol\xE9e / minimal",
    "webBarLegal": "Mentions l\xE9gales & infos",
    "webBarContacts": "Moyens de contact",
    "webBarStructure": "Organisation & menus",
    "webBarHomeInfo": "Clart\xE9 de l\u2019accueil",
    "attachUnsupported": "Type de fichier non pris en charge. Joignez des images ou fichiers texte/code.",
    "micStopTitle": "Arr\xEAter la dict\xE9e",
    "sendBtn": "Envoyer \u27A4",
    "transcriptTitle": "\u{1F4DC} Transcription int\xE9grale",
    "wordsBadge": "mots",
    "copyRawBtn": "\u{1F4CB} Copier brut",
    "transcriptWaiting": "En attente d'extraction... (Sera extraite au lancement du r\xE9sum\xE9 ou d'une question)",
    "micActiveNotice": "\u{1F399}\uFE0F Dict\xE9e vocale active... Parlez maintenant.",
    "micBlockedNotice": "Microphone bloqu\xE9 : veuillez autoriser le micro dans Chrome (cliquez sur l'ic\xF4ne \u{1F512} \xE0 gauche de l'URL youtube.com).",
    "micNoDeviceNotice": "Aucun microphone d\xE9tect\xE9 ou p\xE9riph\xE9rique audio indisponible.",
    "micNetworkNotice": "Erreur r\xE9seau Google Speech. Si vous utilisez Brave, activez 'Services Google pour la reconnaissance vocale' dans brave://settings/privacy, ou v\xE9rifiez qu'aucun bloqueur ne filtre le service.",
    "micErrorNotice": "Erreur micro : ",
    "micNotSupportedNotice": "La reconnaissance vocale n'est pas support\xE9e sur ce navigateur.",
    "listenBubbleTitle": "\xC9couter cette r\xE9ponse",
    "noSummaryToRead": "Aucune synth\xE8se \xE0 lire pour le moment.",
    "noTranscriptError": "Cette vid\xE9o ne dispose d'aucun sous-titre sur YouTube (les sous-titres CC ne sont pas fournis ou pas encore g\xE9n\xE9r\xE9s par YouTube). Essayez une vid\xE9o avec sous-titres ou activez Whisper Local dans les R\xE9glages.",
    "selectModelAlert": "Veuillez s\xE9lectionner un mod\xE8le IA dans la barre de r\xE9glages ci-dessus.",
    "missingKeyAlert": "Veuillez renseigner votre cl\xE9 API pour discuter.",
    "advancedOptions": "\u2699\uFE0F Options Avanc\xE9es (IA, Audio & Automatisation)",
    "settingsBtn": "R\xE9glages",
    "errorLabel": "Erreur : ",
    "settingsHideBtn": "\u2715 Fermer r\xE9glages",
    "tabSettingsModel": "\u{1F916} Mod\xE8le & Fournisseur",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voix & Audio",
    "tabSettingsParams": "\u2699\uFE0F Param\xE8tres IA",
    "testSttBtn": "\u26A1 Tester STT",
    "customPromptPlaceholder": "ex: Insister sur les aspects techniques, expliquer avec des analogies...",
    "whisperUrlPlaceholder": "ex: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "par",
    "footerReportBug": "Signaler un bug",
    "footerDocs": "Documentation",
    "tempStrict": "0.0 - Strict & Pr\xE9cis",
    "tempBalanced": "0.3 - \xC9quilibr\xE9 (D\xE9faut)",
    "tempCreative": "0.7 - Cr\xE9atif & D\xE9taill\xE9",
    "tempWild": "1.0 - Tr\xE8s inventif",
    "tokensAuto": "Automatique (D\xE9faut)",
    "tokensShort": "Court (1 024)",
    "tokensStandard": "Standard (2 048)",
    "tokensDetailed": "D\xE9taill\xE9 (4 096)",
    "tokensMax": "Maximum (8 192)",
    "localContextLabel": "Contexte local (0 = Auto \u2192 1M) :",
    "ctxAuto": "0 \u2014 Auto (D\xE9faut serveur)",
    "ctxServerDefault": "{ctx} tokens (D\xE9faut {provider})",
    "ctxFixedCloud": "Fixe (Mod\xE8le Cloud \u2014 non modifiable)",
    "ctxFixedServer": "Non modifiable (API serveur)",
    "applyContextBtn": "\u26A1 Appliquer",
    "applyContextTooltip": "Recharger le mod\xE8le avec cette taille de contexte",
    "contextAppliedMsg": "Contexte r\xE9gl\xE9 \xE0 {ctx} tokens (pr\xEAt)",
    "contextOllamaHint": "Contexte Ollama r\xE9gl\xE9 \xE0 {ctx} tokens (appliqu\xE9 au prochain appel)",
    "speedSlow": "0.75x (Pos\xE9)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (Rapide)",
    "speedVeryFast": "1.5x (Acc\xE9l\xE9r\xE9)",
    "speedDouble": "2.0x (Double)",
    "tempLabel": "Cr\xE9ativit\xE9 IA (Temp\xE9rature) :",
    "maxTokensLabel": "Longueur max (Tokens) :",
    "ttsSpeedLabel": "Vitesse lecture audio :",
    "whisperUrlLabel": "Serveur Whisper Local (Audio STT) :",
    "autoSummarizeLabel": "\u26A1 R\xE9sumer automatiquement \xE0 l'ouverture d'une vid\xE9o",
    "customPromptLabel": "Directives personnalis\xE9es pour l'IA (optionnel) :",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} Exporter \u25BE",
    "modelReady": 'Mod\xE8le "{model}" op\xE9rationnel ({latency}ms) !',
    "connectionFailed": "\xC9chec : {error}",
    "connectionError": "Erreur de connexion",
    "whisperReady": "Whisper Local STT op\xE9rationnel ({latency}ms) !",
    "whisperFailed": "\xC9chec Whisper STT : {error}",
    "whisperKeyRequired": "Cl\xE9 API requise pour la transcription vocale Whisper.",
    "whisperRecording": "\u{1F399}\uFE0F Enregistrement Whisper (Micro)...",
    "whisperTranscribing": "\u23F3 Transcription audio par Whisper en cours...",
    "whisperNoAudio": "Aucun audio enregistr\xE9. Veuillez parler dans le micro.",
    "micAccessError": "Impossible d'acc\xE9der au microphone",
    "braveMicNotice": "Sous Brave Browser, assurez-vous que les permissions micro sont autoris\xE9es.",
    "chapterBadge": "(Chapitres)",
    "transcriptExtracted": "Transcription extraite",
    "modelResponsive": "Mod\xE8le r\xE9actif : {model}",
    "extractingTranscriptNotice": "Extraction de la transcription de la vid\xE9o en cours...",
    "fetchingExternalTranscriptNotice": "R\xE9cup\xE9ration des sous-titres de la vid\xE9o externe ({videoId})...",
    "analyzingChannelNotice": "Recherche du dossier officiel de la cha\xEEne ({query})...",
    "fetchingCommentsNotice": "R\xE9cup\xE9ration des commentaires et avis du public...",
    "externalTranscriptError": "Impossible d'extraire les sous-titres ou chapitres pour la vid\xE9o externe ({videoId}). Raisons possibles : aucun sous-titre ni chapitre disponible, ou restriction d'acc\xE8s YouTube. Vous pouvez ouvrir l'onglet de cette vid\xE9o pour la r\xE9sumer directement.",
    "retryBtn": "\u{1F504} R\xE9essayer",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F Audit Critique, Logique & V\xE9racit\xE9",
    "subtabAuditVideo": "\u{1F3A5} Audit de cette vid\xE9o",
    "subtabAuditChannel": "\u{1F4CA} Audit de toute la cha\xEEne",
    "runChannelAuditBtn": "\u26A1 Lancer l'audit de la cha\xEEne",
    "channelCompanionDesc": "\xC9valuez l'int\xE9grit\xE9 \xE9ditoriale, la transparence commerciale et l'\xE9volution de la cha\xEEne.",
    "runAuditBtn": "\u26A1 Lancer l'audit",
    "relaunchAuditBtn": "\u26A1 Relancer l'audit",
    "auditInProgress": "Audit en cours...",
    "auditStarting": "Pr\xE9paration du dossier d'audit...",
    "auditAnalyzing": "Examen de la coh\xE9rence logique et des faits en cours...",
    "auditPlaceholder": "Cliquez sur \xAB \u26A1 Lancer l'audit \xBB pour analyser la rigueur logique, les sophismes et la v\xE9racit\xE9 des faits.",
    "discussInChatBtn": "\u{1F4AC} Discuter dans le Chat",
    "auditChannelBtn": "\u{1F50D} Auditer la cha\xEEne",
    "channelAuditTitle": "\u{1F4CA} Audit Global de la Cha\xEEne",
    "channelSampleInfo": "\xC9chantillonnage temporel pond\xE9r\xE9",
    "periodFilterLabel": "P\xE9riode analys\xE9e :",
    "periodAll": "Tout l'historique",
    "periodMonth": "Dernier mois",
    "periodYear": "Ann\xE9e en cours",
    "period6Months": "6 derniers mois",
    "tabChannelAudit": "\u{1F4CA} Audit de la cha\xEEne",
    "channelChatTitle": "\u{1F4AC} Questions & R\xE9ponses sur la cha\xEEne",
    "channelChatWelcome": "Bonjour ! Posez vos questions sur cette cha\xEEne (ligne \xE9ditoriale, vid\xE9os publi\xE9es, sponsors, \xE9volution). Si vous avez lanc\xE9 un audit, il enrichira automatiquement les r\xE9ponses.",
    "channelChatPlaceholder": "Posez vos questions sur la cha\xEEne ou collez des liens vid\xE9o... (Entr\xE9e pour envoyer)",
    "channelChatResetNotice": "Discussion sur la cha\xEEne r\xE9initialis\xE9e. Posez vos questions ci-dessous !",
    "channelChatSuggestions": [
      { "label": "Ligne \xE9ditoriale", "question": "Quelle est la ligne \xE9ditoriale principale et la trajectoire d'\xE9volution de cette cha\xEEne ?" },
      { "label": "Formats & sujets", "question": "Quels sont les sujets cl\xE9s et formats r\xE9currents de ses vid\xE9os r\xE9centes ?" },
      { "label": "Sponsors & transparence", "question": "Que peut-on observer sur la transparence commerciale et les partenariats ?" },
      { "label": "Forces & limites", "question": "Quels sont les points forts et les limites \xE9ditoriales notables de cette cha\xEEne ?" }
    ],
    "maxVideosLabel": "Volume max :",
    "stopAuditBtn": "\u23F9 Arr\xEAter l'audit",
    "stopShortBtn": "Arr\xEAter",
    "auditStoppedNote": "\u23F9 Traitement arr\xEAt\xE9 par l\u2019utilisateur.",
    "channelAuditPlaceholder": "Cliquez sur \xAB \u26A1 Lancer l'audit de la cha\xEEne \xBB ci-dessus pour \xE9valuer cette cha\xEEne.",
    "channelSampleBadge": "\xC9chantillon :",
    "channelVideosUnit": "vid\xE9os",
    "channelAnalyzedVideosUnit": "vid\xE9os analys\xE9es",
    "channelRecentHistoricMix": "Pond\xE9ration r\xE9cente ~65% & historique ~35%",
    "channelSubscribersUnit": "abonn\xE9s",
    "channelEvolutionTitle": "\u{1F4C8} \xC9volution \xC9ditoriale & Qualit\xE9",
    "channelStrengthsTitle": "\u2713 Ce qu'elle fait de bien (Forces)",
    "channelWeaknessesTitle": "! Ce qu'elle fait de moins bien (Vigilance)",
    "channelDrawbacksTitle": "\u2715 \xC9cueils & Pi\xE8ges (\xC0 \xE9viter)",
    "channelSampleVideosTitle": "\u{1F3AC} D\xE9tail des vid\xE9os analys\xE9es",
    "channelSynthesisTitle": "\u{1F4CB} Synth\xE8se Globale",
    "copyAuditBtn": "\u{1F4CB} Copier le rapport complet",
    "channelSensationalismLabel": "Indice Sensationnalisme",
    "channelDistributionLabel": "Distribution par tranches de 5%",
    "channelMedianLabel": "M\xE9diane :",
    "channelHomogeneousLine": "Ligne tr\xE8s homog\xE8ne",
    "channelModerateVarLine": "Variance mod\xE9r\xE9e",
    "channelVolatileLine": "Ligne volatile / h\xE9t\xE9roclite",
    "channelIntegrityProportion": "Proportion d'int\xE9grit\xE9 \xE9ditoriale",
    "channelBucketReliable": "Fiable (\u226575)",
    "channelBucketModerate": "Mod\xE9r\xE9 (50-74)",
    "channelBucketRisk": "Risque (<50)",
    "channelClickbaitLow": "Sobre & factuel",
    "channelClickbaitMod": "Mod\xE9r\xE9",
    "channelClickbaitHigh": "Accroche sensationnaliste",
    "channelVideoScorePrefix": "Fiabilit\xE9",
    "channelNoStrengths": "Aucun point fort majeur signal\xE9.",
    "channelNoWeaknesses": "Aucune faiblesse majeure d\xE9tect\xE9e.",
    "channelNoDrawbacks": "Aucun pi\xE8ge majeur signal\xE9.",
    "pasteBtn": "Coller",
    "pasteTooltip": "Coller depuis le presse-papiers",
    "chapterOnlyNotice": "Sous-titres complets non servis par YouTube. Seuls les chapitres ont pu \xEAtre r\xE9cup\xE9r\xE9s.",
    "forceRetryBtn": "Forcer",
    "extractingLabel": "Extraction en cours...",
    "auditErrorPrefix": "Erreur lors de l'audit :",
    "channelVideosLongBadge": "Vid\xE9o",
    "channelShortsBadge": "Short",
    "channelFormatMixTitle": "\u26A1 Comparatif Vid\xE9os longues vs Shorts",
    "channelFormatVideosLabel": "Vid\xE9os longues",
    "channelFormatShortsLabel": "Shorts",
    "channelFormatAvgScore": "Score moy.",
    "channelFormatAvgClickbait": "Sensationnalisme",
    "webBusyBtn": "\u23F3 Analyse en cours...",
    "webReasoningWait": "\u{1F4AD} R\xE9flexion du mod\xE8le en cours...",
    "webEmptyAiResponse": "Le mod\xE8le IA n'a renvoy\xE9 aucun texte d'analyse (r\xE9ponse vide ou r\xE9flexion interrompue). V\xE9rifiez le mod\xE8le s\xE9lectionn\xE9, la fen\xEAtre de contexte ou Max Tokens dans les R\xE9glages.",
    "closeExtensionBtn": "Fermer et d\xE9sactiver ClarifAI (r\xE9activer depuis la popup de l\u2019extension)",
    "webCancelBtn": "\u23F9 Annuler",
    "chatQueueTitle": "File d'attente ({count})",
    "chatInProgressLabel": "En cours :",
    "chatEditRecallBtn": "Modifier / Annuler",
    "chatRevertBtn": "Revenir ici",
    "chatRevertTitle": "Revenir \xE0 ce message et modifier le texte",
    "chatSendNowBtn": "Envoyer",
    "chatRemoveQueueBtn": "Retirer de la file",
    "describeAccessibleBtn": "\u{1F441}\uFE0F D\xE9crire (Malvoyants)",
    "describeAccessibleTitle": "D\xE9crire en d\xE9tail la page et ses images pour une personne malvoyante avec lecture audio automatique",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F D\xE9cris cette page et ses images en d\xE9tail pour une personne malvoyante (audio-description).",
    "speechBarAriaLabel": "Contr\xF4les de lecture audio",
    "speechRestartBtn": "\u23EE D\xE9but",
    "speechRestartTitle": "Reprendre la lecture au d\xE9but",
    "speechPauseBtn": "\u23F8 Pause",
    "speechResumeBtn": "\u25B6 Reprendre",
    "speechStopBtn": "\u23F9 Arr\xEAter",
    "speechSeekLabel": "D\xE9placer la t\xEAte de lecture dans le texte"
  };
  var fr_default = fr;

  // src/locales/en.js
  var en = {
    "brandName": "ClarifAI",
    "checking": "Checking...",
    "connectedBadge": "Connected",
    "offlineBadge": "Offline",
    "modelLoading": "Model: Loading...",
    "modelPrefix": "Model: ",
    "summarizeBtn": "\u2728 Summarize video",
    "collapse": "Collapse",
    "expand": "Expand",
    "providerLabel": "AI Provider:",
    "groupLocal": "\u{1F3E0} Local Models (Free & Private)",
    "groupFast": "\u26A1 Fast / Free Cloud Inference",
    "groupCloud": "\u2601\uFE0F Major Cloud Providers",
    "serverLabel": "Server:",
    "serverLabelLm": "LM Studio Server:",
    "serverLabelOllama": "Ollama Server:",
    "noModelSelected": "No model selected",
    "keyOk": "Key OK",
    "keySaved": "Key saved",
    "invalidKey": "Invalid key",
    "serverBusy": "Server busy (retry)",
    "keyRequired": "Key required",
    "customServer": "Custom IP...",
    "refreshTooltip": "Refresh models list",
    "toggleKeyVisTooltip": "Show / hide API key",
    "pasteClipboardHint": "[i] Clipboard empty or blocked \u2014 paste with Ctrl+V in the API Key field.",
    "apiKeyLabel": "API Key:",
    "apiKeyPlaceholder": "Paste your API key...",
    "getApiKeyLink": "\u{1F511} Get an API key",
    "modelLabel": "Model:",
    "testModelBtn": "\u26A1 Test",
    "testModelTooltip": "Test connection and model",
    "langLabel": "Language:",
    "formatLabel": "Format:",
    "formatStandard": "\u{1F4CC} Natural & balanced",
    "formatQuick": "\u26A1 Short & concise",
    "formatDetailed": "\u{1F4DD} Detailed & in-depth",
    "voiceLabel": "Voice:",
    "voiceDefault": "System voice...",
    "micLabel": "Mic:",
    "micDefault": "\u{1F399}\uFE0F Default mic",
    "tabSummary": "\u{1F4C4} Video Summary",
    "tabChat": "\u{1F4AC} Ask questions",
    "tabTranscript": "\u{1F4DC} Transcript",
    "summaryTitle": "\u{1F4C4} Video Summary",
    "listenBtn": "\u{1F50A} Listen",
    "stopListenBtn": "\u23F9\uFE0F Stop",
    "copyBtn": "\u{1F4CB} Copy",
    "copiedBtn": "\u2705 Copied!",
    "saveMdBtn": "\u{1F4BE} Save .md",
    "reasoningModel": "\u{1F4AD} Model Reasoning",
    "reasoningInProgress": "in progress...",
    "reasoningDone": "completed",
    "emptyTitle": "Ready to summarize this video",
    "emptySubtitle": "Extract key takeaways, chapters, and insights in seconds with AI.",
    "newVideoTitle": "New video detected",
    "summaryPlaceholder": "Click '\u2728 Summarize video' to generate the summary.",
    "newVideoPlaceholder": "New video detected. Click '\u2728 Summarize video' to generate the summary.",
    "generatingSummary": "Generating summary...",
    "waitingForModel": "Loading AI model / preparing context ({sec}s)...",
    "streamInterrupted": "Connection interrupted before model response. Ensure the model finished loading and retry.",
    "chatTitle": "\u{1F4AC} Video Q&A",
    "clearChatBtn": "\u{1F5D1}\uFE0F Clear conversation",
    "suggestions": [
      { "label": "\u{1F4A1} Key takeaways", "question": "What are the core key takeaways from this video?" },
      { "label": "\u23F1\uFE0F Timestamps", "question": "At what point in the video is the main topic discussed?" },
      { "label": "\u{1F4CA} Data & Figures", "question": "What specific figures, examples, or arguments are presented?" },
      { "label": "\u{1F3AF} Conclusion & Advice", "question": "What is the author's final conclusion or actionable advice?" }
    ],
    "chatWelcome": "Hello! Ask me any question about the content of this video. I base my answers directly on its full transcript.",
    "chatPlaceholder": "Ask a question or dictate with mic... (Press Enter to send)",
    "chatInputListening": "\u{1F399}\uFE0F Dictating... Speak into your microphone.",
    "chatResetNotice": "Conversation reset. Ask any question about the video content!",
    "micTitle": "Dictate your question with microphone",
    "attachTitle": "Attach image or file (or paste Ctrl+V)",
    "attachTitleTextOnly": "Attach text/code file (images require a multimodal model)",
    "attachImageNotSupported": "The selected model does not support images. Select a multimodal model (e.g. Qwen3.8, Gemini, GPT-4o, Claude) or attach a text file.",
    "attachTooLarge": "Image exceeds 8 MB limit.",
    "webTabSummary": "\u{1F4C4} Page Summary",
    "webTabAudit": "\u{1F6E1}\uFE0F Page Reliability",
    "webRunAuditBtn": "\u26A1 Audit Page",
    "webTabDomain": "\u{1F310} Site Audit",
    "webDomainAuditTitle": "\u{1F310} Website & Trust Audit",
    "webRunDomainAuditBtn": "\u26A1 Audit Site",
    "webDepthLabel": "Scan depth:",
    "webDepthLevelUnit": "level(s)",
    "webExtractedTitle": "\u{1F4DC} Extracted Page & URL Signals",
    "webSummarizeBtn": "\u2728 Summarize Page",
    "webReliabilityLabel": "Reliability Score",
    "webTileConn": "Connection & URL",
    "webTileBrand": "Claimed Identity",
    "webTileForms": "Forms & Inputs",
    "webTileDom": "DOM Integrity",
    "webTileSite": "Target Website",
    "webTileLegal": "Legal & Info Pages",
    "webTileContacts": "Official Contacts",
    "webValHttp": "Unencrypted HTTP",
    "webValFormsWarn": "Sensitive inputs found",
    "webValFormsOk": "No traps detected",
    "webValDomWarn": "Suspicious signals",
    "webValDomOk": "Clean DOM",
    "webValNoneFound": "No visible contact",
    "webTileStructure": "Site Structure",
    "webPagesFound": "{n} page(s) found",
    "webNoLegalPages": "None detected",
    "webValStructComplete": "Well structured",
    "webValStructPartial": "Partial structure",
    "webValStructMinimal": "Minimal / single page",
    "webBarLegal": "Legal & info pages",
    "webBarContacts": "Contact channels",
    "webBarStructure": "Navigation & menus",
    "webBarHomeInfo": "Homepage clarity",
    "attachUnsupported": "Unsupported file type. Attach images or text/code files.",
    "micStopTitle": "Stop dictation",
    "sendBtn": "Send \u27A4",
    "transcriptTitle": "\u{1F4DC} Full Transcript",
    "wordsBadge": "words",
    "copyRawBtn": "\u{1F4CB} Copy raw",
    "transcriptWaiting": "Waiting for transcript... (Will be extracted when generating a summary or asking a question)",
    "micActiveNotice": "\u{1F399}\uFE0F Voice dictation active... Speak now.",
    "micBlockedNotice": "Microphone blocked: please allow mic access in Chrome (click the \u{1F512} icon on the left of youtube.com).",
    "micNoDeviceNotice": "No microphone detected or audio device unavailable.",
    "micNetworkNotice": "Google Speech network error. If using Brave, enable 'Google services for voice recognition' in brave://settings/privacy, or check if an adblocker/VPN is blocking speech services.",
    "micErrorNotice": "Microphone error: ",
    "micNotSupportedNotice": "Speech recognition is not supported in this browser.",
    "listenBubbleTitle": "Listen to this answer",
    "noSummaryToRead": "No summary to read aloud yet.",
    "noTranscriptError": "This video does not have any subtitles or captions on YouTube (CC is not available for this video). Please try a video with captions enabled, or configure Local Whisper in Settings.",
    "selectModelAlert": "Please select an AI model in the settings toolbar above.",
    "missingKeyAlert": "Please provide your API key to chat.",
    "advancedOptions": "\u2699\uFE0F Advanced Options (AI, Audio & Automation)",
    "settingsBtn": "Settings",
    "errorLabel": "Error: ",
    "settingsHideBtn": "\u2715 Close Settings",
    "tabSettingsModel": "\u{1F916} AI Model & Server",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voice & Audio",
    "tabSettingsParams": "\u2699\uFE0F Parameters & Prompt",
    "testSttBtn": "\u26A1 Test STT",
    "customPromptPlaceholder": "e.g. Focus on technical details, explain with analogies...",
    "whisperUrlPlaceholder": "e.g. http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "by",
    "footerReportBug": "Report a bug",
    "footerDocs": "Documentation",
    "tempStrict": "0.0 - Strict & Precise",
    "tempBalanced": "0.3 - Balanced (Default)",
    "tempCreative": "0.7 - Creative & Detailed",
    "tempWild": "1.0 - Highly Inventive",
    "tokensAuto": "Automatic (Default)",
    "tokensShort": "Short (1,024)",
    "tokensStandard": "Standard (2,048)",
    "tokensDetailed": "Detailed (4,096)",
    "tokensMax": "Maximum (8,192)",
    "localContextLabel": "Local Context (0 = Auto \u2192 1M):",
    "ctxAuto": "0 \u2014 Auto (Server Default)",
    "ctxServerDefault": "{ctx} tokens ({provider} Default)",
    "ctxFixedCloud": "Fixed (Cloud model \u2014 read-only)",
    "ctxFixedServer": "Read-only (not supported by server)",
    "applyContextBtn": "\u26A1 Apply",
    "applyContextTooltip": "Reload model with this context window size",
    "contextAppliedMsg": "Context window set to {ctx} tokens (ready)",
    "contextOllamaHint": "Ollama context set to {ctx} tokens (applies on next request)",
    "speedSlow": "0.75x (Calm)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (Fast)",
    "speedVeryFast": "1.5x (Speedy)",
    "speedDouble": "2.0x (Double)",
    "tempLabel": "AI Creativity (Temperature):",
    "maxTokensLabel": "Max Length (Tokens):",
    "ttsSpeedLabel": "Voice Speed:",
    "whisperUrlLabel": "Local Whisper Server (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Auto-summarize when opening a video",
    "customPromptLabel": "Custom AI Instructions (optional):",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} Export \u25BE",
    "modelReady": 'Model "{model}" ready ({latency}ms)!',
    "connectionFailed": "Failed: {error}",
    "connectionError": "Connection error",
    "whisperReady": "Local Whisper STT ready ({latency}ms)!",
    "whisperFailed": "Whisper STT failed: {error}",
    "whisperKeyRequired": "API key required for Whisper voice transcription.",
    "whisperRecording": "\u{1F399}\uFE0F Whisper recording (Mic)...",
    "whisperTranscribing": "\u23F3 Transcribing audio with Whisper...",
    "whisperNoAudio": "No audio recorded. Please speak into your microphone.",
    "micAccessError": "Unable to access microphone",
    "braveMicNotice": "On Brave Browser, please make sure microphone permissions are allowed.",
    "chapterBadge": "(Chapters)",
    "transcriptExtracted": "Transcript extracted",
    "modelResponsive": "Responsive model: {model}",
    "extractingTranscriptNotice": "Extracting video transcript...",
    "fetchingExternalTranscriptNotice": "Fetching subtitles for external video ({videoId})...",
    "analyzingChannelNotice": "Fetching official channel dossier for {query}...",
    "fetchingCommentsNotice": "Fetching top public comments and audience reactions...",
    "externalTranscriptError": "Unable to extract subtitles or chapters for external video ({videoId}). Possible reasons: no captions or chapters available, or YouTube access restrictions. You can open this video in a tab to summarize it directly.",
    "retryBtn": "\u{1F504} Retry",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F Critical Logic & Fact-Checking Audit",
    "subtabAuditVideo": "\u{1F3A5} Video Audit",
    "subtabAuditChannel": "\u{1F4CA} Channel Audit",
    "runChannelAuditBtn": "\u26A1 Run Channel Audit",
    "channelCompanionDesc": "Evaluate editorial integrity, sponsor transparency, and multi-year trajectory across this channel.",
    "runAuditBtn": "\u26A1 Run Audit",
    "relaunchAuditBtn": "\u26A1 Re-run Audit",
    "auditInProgress": "Audit in progress...",
    "auditStarting": "Preparing audit dossier...",
    "auditAnalyzing": "Examining logical consistency and facts...",
    "auditPlaceholder": 'Click "\u26A1 Run Audit" to analyze logical rigor, fallacies, and factual accuracy.',
    "discussInChatBtn": "\u{1F4AC} Discuss in Chat",
    "auditChannelBtn": "\u{1F50D} Audit Channel",
    "channelAuditTitle": "\u{1F4CA} Global Channel Audit",
    "channelSampleInfo": "Weighted temporal sampling",
    "periodFilterLabel": "Analyzed period:",
    "periodAll": "All history",
    "periodMonth": "Last month",
    "periodYear": "Current year",
    "period6Months": "Last 6 months",
    "tabChannelAudit": "\u{1F4CA} Channel Audit",
    "channelChatTitle": "\u{1F4AC} Channel Q&A",
    "channelChatWelcome": "Hello! Ask questions about this channel (editorial line, published videos, sponsors, evolution). Any channel audit report is automatically included as context.",
    "channelChatPlaceholder": "Ask questions about this channel or paste video links... (Enter to send)",
    "channelChatResetNotice": "Channel chat reset. Ask your questions below!",
    "channelChatSuggestions": [
      { "label": "Editorial line", "question": "What is the main editorial line and evolution trajectory of this channel?" },
      { "label": "Formats & topics", "question": "What are the main topics and recurring formats in recent videos?" },
      { "label": "Sponsors & rigor", "question": "What can be observed regarding commercial transparency and sponsorships?" },
      { "label": "Strengths & gaps", "question": "What are the key strengths and editorial blind spots of this channel?" }
    ],
    "maxVideosLabel": "Max Limit:",
    "stopAuditBtn": "\u23F9 Stop Audit",
    "stopShortBtn": "Stop",
    "auditStoppedNote": "\u23F9 Processing stopped by user.",
    "channelAuditPlaceholder": 'Click "\u26A1 Run Channel Audit" above to evaluate this channel.',
    "channelSampleBadge": "Sample:",
    "channelVideosUnit": "videos",
    "channelAnalyzedVideosUnit": "analyzed videos",
    "channelRecentHistoricMix": "Weighted ~65% recent & ~35% historical",
    "channelSubscribersUnit": "subscribers",
    "channelEvolutionTitle": "\u{1F4C8} Editorial & Quality Evolution",
    "channelStrengthsTitle": "\u2713 What It Does Well (Strengths)",
    "channelWeaknessesTitle": "! Areas for Vigilance (Weaknesses)",
    "channelDrawbacksTitle": "\u2715 Pitfalls & Red Flags (Drawbacks)",
    "channelSampleVideosTitle": "\u{1F3AC} Analyzed Videos Breakdown",
    "channelSynthesisTitle": "\u{1F4CB} Executive Synthesis",
    "copyAuditBtn": "\u{1F4CB} Copy full channel report",
    "channelSensationalismLabel": "Sensationalism Index",
    "channelDistributionLabel": "5% tier distribution",
    "channelMedianLabel": "Median:",
    "channelHomogeneousLine": "Very consistent line",
    "channelModerateVarLine": "Moderate variance",
    "channelVolatileLine": "Volatile / heteroclite line",
    "channelIntegrityProportion": "Editorial Integrity Distribution",
    "channelBucketReliable": "Reliable (\u226575)",
    "channelBucketModerate": "Moderate (50-74)",
    "channelBucketRisk": "Risk (<50)",
    "channelClickbaitLow": "Editorial & factual",
    "channelClickbaitMod": "Moderate",
    "channelClickbaitHigh": "Sensational / Clickbait",
    "channelVideoScorePrefix": "Reliability",
    "channelNoStrengths": "No major strengths reported.",
    "channelNoWeaknesses": "No major weaknesses reported.",
    "channelNoDrawbacks": "No major red flags reported.",
    "pasteBtn": "Paste",
    "pasteTooltip": "Paste from clipboard",
    "chapterOnlyNotice": "Full subtitles not served by YouTube. Only chapters could be retrieved.",
    "forceRetryBtn": "Force",
    "extractingLabel": "Extracting transcript...",
    "auditErrorPrefix": "Audit error:",
    "channelVideosLongBadge": "Video",
    "channelShortsBadge": "Short",
    "channelFormatMixTitle": "\u26A1 Long-form Videos vs Shorts Comparison",
    "channelFormatVideosLabel": "Long-form Videos",
    "channelFormatShortsLabel": "Shorts",
    "channelFormatAvgScore": "Avg score",
    "channelFormatAvgClickbait": "Sensationalism",
    "webBusyBtn": "\u23F3 Analyzing...",
    "webReasoningWait": "\u{1F4AD} Model is reasoning...",
    "webEmptyAiResponse": "The AI model returned no analysis text (empty response or truncated reasoning). Check your selected model, Context Length, or Max Tokens in Settings.",
    "closeExtensionBtn": "Disable ClarifAI on pages (re-enable anytime from the extension popup)",
    "webCancelBtn": "\u23F9 Cancel",
    "chatQueueTitle": "Queued ({count})",
    "chatInProgressLabel": "Generating:",
    "chatEditRecallBtn": "Edit / Cancel",
    "chatRevertBtn": "Revert",
    "chatRevertTitle": "Revert conversation to this message and edit it",
    "chatSendNowBtn": "Send now",
    "chatRemoveQueueBtn": "Remove from queue",
    "describeAccessibleBtn": "\u{1F441}\uFE0F Describe (Low-Vision)",
    "describeAccessibleTitle": "Generate a vivid spoken description of this page (Instagram, photos, layout) and start automatic playback",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F Describe this page in detail for a blind or low-vision person (audio description).",
    "speechBarAriaLabel": "Audio playback controls",
    "speechRestartBtn": "\u23EE Start",
    "speechRestartTitle": "Restart audio from the beginning",
    "speechPauseBtn": "\u23F8 Pause",
    "speechResumeBtn": "\u25B6 Resume",
    "speechStopBtn": "\u23F9 Stop",
    "speechSeekLabel": "Move reading position in text"
  };
  var en_default = en;

  // src/locales/es.js
  var es = {
    "brandName": "ClarifAI",
    "checking": "Comprobando...",
    "connectedBadge": "Conectado",
    "offlineBadge": "Desconectado",
    "modelLoading": "Modelo: Cargando...",
    "modelPrefix": "Modelo: ",
    "summarizeBtn": "\u2728 Resumir este v\xEDdeo",
    "collapse": "Plegar",
    "expand": "Desplegar",
    "providerLabel": "Proveedor IA:",
    "groupLocal": "\u{1F3E0} Modelos Locales (Gratis y Privados)",
    "groupFast": "\u26A1 Inferencia R\xE1pida / Gratis",
    "groupCloud": "\u2601\uFE0F Proveedores Cloud Principales",
    "serverLabel": "Servidor:",
    "serverLabelLm": "Servidor LM Studio:",
    "serverLabelOllama": "Servidor Ollama:",
    "noModelSelected": "Ning\xFAn modelo seleccionado",
    "keyOk": "Clave OK",
    "keySaved": "Clave guardada",
    "invalidKey": "Clave inv\xE1lida",
    "serverBusy": "Servidor ocupado (reintentar)",
    "keyRequired": "Clave requerida",
    "customServer": "Otra IP...",
    "refreshTooltip": "Actualizar lista de modelos",
    "toggleKeyVisTooltip": "Mostrar / ocultar clave API",
    "pasteClipboardHint": "[i] Portapapeles vac\xEDo o bloqueado \u2014 pega con Ctrl+V en el campo Clave API.",
    "apiKeyLabel": "Clave API:",
    "apiKeyPlaceholder": "Pega tu clave API...",
    "getApiKeyLink": "\u{1F511} Obtener una clave",
    "modelLabel": "Modelo:",
    "testModelBtn": "\u26A1 Probar",
    "testModelTooltip": "Probar conexi\xF3n y modelo",
    "langLabel": "Idioma:",
    "formatLabel": "Formato:",
    "formatStandard": "\u{1F4CC} Natural y equilibrado",
    "formatQuick": "\u26A1 Corto y conciso",
    "formatDetailed": "\u{1F4DD} Detallado y profundo",
    "voiceLabel": "Voz:",
    "voiceDefault": "Voz del sistema...",
    "micLabel": "Micro:",
    "micDefault": "\u{1F399}\uFE0F Micro por defecto",
    "tabSummary": "\u{1F4C4} Resumen del video",
    "tabChat": "\u{1F4AC} Hacer preguntas",
    "tabTranscript": "\u{1F4DC} Transcripci\xF3n",
    "summaryTitle": "\u{1F4C4} Resumen del video",
    "listenBtn": "\u{1F50A} Escuchar",
    "stopListenBtn": "\u23F9\uFE0F Detener",
    "copyBtn": "\u{1F4CB} Copiar",
    "copiedBtn": "\u2705 \xA1Copiado!",
    "saveMdBtn": "\u{1F4BE} Guardar .md",
    "reasoningModel": "\u{1F4AD} Razonamiento del modelo",
    "reasoningInProgress": "en curso...",
    "reasoningDone": "completado",
    "emptyTitle": "Listo para resumir este video",
    "emptySubtitle": "Extraiga puntos clave, cap\xEDtulos y conclusiones en segundos con IA.",
    "newVideoTitle": "Nuevo v\xEDdeo detectado",
    "summaryPlaceholder": "Haz clic en \xAB \u2728 Resumir este v\xEDdeo \xBB para generar el resumen.",
    "newVideoPlaceholder": "Nuevo v\xEDdeo detectado. Haz clic en \xAB \u2728 Resumir este v\xEDdeo \xBB para generar el resumen.",
    "generatingSummary": "Generando resumen...",
    "waitingForModel": "Cargando modelo / preparando contexto ({sec}s)...",
    "streamInterrupted": "Conexi\xF3n interrumpida antes de la respuesta del modelo. Verifica que termin\xF3 de cargar y reintenta.",
    "chatTitle": "\u{1F4AC} Preguntas y Respuestas sobre el v\xEDdeo",
    "clearChatBtn": "\u{1F5D1}\uFE0F Borrar conversaci\xF3n",
    "suggestions": [
      { "label": "\u{1F4A1} Puntos clave", "question": "\xBFCu\xE1les son los puntos clave esenciales a recordar?" },
      { "label": "\u23F1\uFE0F Marcas de tiempo", "question": "\xBFEn qu\xE9 momento del v\xEDdeo se habla del tema principal?" },
      { "label": "\u{1F4CA} Cifras y Ejemplos", "question": "\xBFQu\xE9 ejemplos, cifras o argumentos se mencionan?" },
      { "label": "\u{1F3AF} Conclusi\xF3n y Consejos", "question": "\xBFQu\xE9 concluye o aconseja el autor al final?" }
    ],
    "chatWelcome": "\xA1Hola! Hazme cualquier pregunta sobre el contenido de este v\xEDdeo. Me baso directamente en la transcripci\xF3n completa.",
    "chatPlaceholder": "Haz una pregunta o dicta con el micro... (Intro para enviar)",
    "chatInputListening": "\u{1F399}\uFE0F Dictando... Habla por el micr\xF3fono.",
    "chatResetNotice": "Conversaci\xF3n reiniciada. \xA1Haz una pregunta sobre el contenido del v\xEDdeo!",
    "micTitle": "Dictar tu pregunta con el micro",
    "attachTitle": "Adjuntar imagen o archivo (o pegar Ctrl+V)",
    "attachTitleTextOnly": "Adjuntar archivo de texto/c\xF3digo (las im\xE1genes requieren un modelo multimodal)",
    "attachImageNotSupported": "El modelo seleccionado no admite im\xE1genes. Elija un modelo multimodal o adjunte un archivo de texto.",
    "attachTooLarge": "La imagen supera el l\xEDmite de 8 MB.",
    "webTabSummary": "\u{1F4C4} Resumen de p\xE1gina",
    "webTabAudit": "\u{1F6E1}\uFE0F Fiabilidad de la p\xE1gina",
    "webRunAuditBtn": "\u26A1 Auditar p\xE1gina",
    "webTabDomain": "\u{1F310} Auditor\xEDa del sitio",
    "webDomainAuditTitle": "\u{1F310} Auditor\xEDa global del sitio",
    "webRunDomainAuditBtn": "\u26A1 Auditar sitio",
    "webDepthLabel": "Profundidad:",
    "webDepthLevelUnit": "nivel(es)",
    "webExtractedTitle": "\u{1F4DC} Contenido y se\xF1ales URL",
    "webSummarizeBtn": "\u2728 Resumir p\xE1gina",
    "webReliabilityLabel": "\xCDndice de fiabilidad",
    "webTileConn": "Conexi\xF3n y URL",
    "webTileBrand": "Identidad declarada",
    "webTileForms": "Formularios",
    "webTileDom": "Integridad del DOM",
    "webTileSite": "Sitio analizado",
    "webTileLegal": "P\xE1ginas legales",
    "webTileContacts": "Contactos oficiales",
    "webValHttp": "HTTP sin cifrar",
    "webValFormsWarn": "Campos sensibles detectados",
    "webValFormsOk": "Sin trampas detectadas",
    "webValDomWarn": "Se\xF1ales sospechosas",
    "webValDomOk": "DOM limpio",
    "webValNoneFound": "Sin contacto visible",
    "webTileStructure": "Estructura del sitio",
    "webPagesFound": "{n} p\xE1gina(s) encontrada(s)",
    "webNoLegalPages": "Ninguna detectada",
    "webValStructComplete": "Sitio estructurado",
    "webValStructPartial": "Estructura parcial",
    "webValStructMinimal": "P\xE1gina aislada / m\xEDnima",
    "webBarLegal": "P\xE1ginas legales y avisos",
    "webBarContacts": "Medios de contacto",
    "webBarStructure": "Navegaci\xF3n y men\xFAs",
    "webBarHomeInfo": "Claridad de portada",
    "attachUnsupported": "Tipo de archivo no compatible. Adjunte im\xE1genes o archivos de texto/c\xF3digo.",
    "micStopTitle": "Detener la dictaci\xF3n",
    "sendBtn": "Enviar \u27A4",
    "transcriptTitle": "\u{1F4DC} Transcripci\xF3n completa",
    "wordsBadge": "palabras",
    "copyRawBtn": "\u{1F4CB} Copiar texto",
    "transcriptWaiting": "Esperando extracci\xF3n... (Se extraer\xE1 al iniciar el resumen o una pregunta)",
    "micActiveNotice": "\u{1F399}\uFE0F Dictaci\xF3n por voz activa... Habla ahora.",
    "micBlockedNotice": "Micr\xF3fono bloqueado: permite el acceso al micro en Chrome (icono \u{1F512} a la izquierda de youtube.com).",
    "micNoDeviceNotice": "No se detect\xF3 ning\xFAn micr\xF3fono o el dispositivo no est\xE1 disponible.",
    "micNetworkNotice": "Error de red de Google Speech. Si usas Brave, activa 'Servicios de Google para reconocimiento de voz' en brave://settings/privacy, o comprueba si un bloqueador/VPN lo impide.",
    "micErrorNotice": "Error de micro: ",
    "micNotSupportedNotice": "El reconocimiento de voz no es compatible con este navegador.",
    "listenBubbleTitle": "Escuchar esta respuesta",
    "noSummaryToRead": "No hay ning\xFAn resumen para leer todav\xEDa.",
    "noTranscriptError": "No se pudo extraer la transcripci\xF3n de este v\xEDdeo para responder. Aseg\xFArate de que los subt\xEDtulos est\xE9n disponibles en YouTube.",
    "selectModelAlert": "Por favor selecciona un modelo IA en la barra de configuraci\xF3n superior.",
    "missingKeyAlert": "Por favor proporciona tu clave API para chatear.",
    "advancedOptions": "\u2699\uFE0F Opciones avanzadas (IA, Audio y Automatizaci\xF3n)",
    "settingsBtn": "Ajustes",
    "errorLabel": "Error: ",
    "settingsHideBtn": "\u2715 Cerrar ajustes",
    "tabSettingsModel": "\u{1F916} Modelo y Servidor",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voz y Audio",
    "tabSettingsParams": "\u2699\uFE0F Par\xE1metros de IA",
    "testSttBtn": "\u26A1 Probar STT",
    "customPromptPlaceholder": "ej: Enfatizar aspectos t\xE9cnicos, explicar con analog\xEDas...",
    "whisperUrlPlaceholder": "ej: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "por",
    "footerReportBug": "Reportar un error",
    "footerDocs": "Documentaci\xF3n",
    "tempStrict": "0.0 - Estricto y Preciso",
    "tempBalanced": "0.3 - Equilibrado (Por defecto)",
    "tempCreative": "0.7 - Creativo y Detallado",
    "tempWild": "1.0 - Muy inventivo",
    "tokensAuto": "Autom\xE1tico (Por defecto)",
    "tokensShort": "Corto (1.024)",
    "tokensStandard": "Est\xE1ndar (2.048)",
    "tokensDetailed": "Detallado (4.096)",
    "tokensMax": "M\xE1ximo (8.192)",
    "localContextLabel": "Contexto local (0 = Auto \u2192 1M):",
    "ctxAuto": "0 \u2014 Auto (Por defecto)",
    "ctxServerDefault": "{ctx} tokens (Defecto {provider})",
    "ctxFixedCloud": "Fijo (Modelo Cloud \u2014 no editable)",
    "ctxFixedServer": "No editable (API del servidor)",
    "applyContextBtn": "\u26A1 Aplicar",
    "applyContextTooltip": "Recargar el modelo con este tama\xF1o de contexto",
    "contextAppliedMsg": "Ventana de contexto en {ctx} tokens (listo)",
    "contextOllamaHint": "Contexto de Ollama en {ctx} tokens (pr\xF3xima solicitud)",
    "speedSlow": "0.75x (Pausado)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (R\xE1pido)",
    "speedVeryFast": "1.5x (Acelerado)",
    "speedDouble": "2.0x (Doble)",
    "tempLabel": "Creatividad IA (Temperatura):",
    "maxTokensLabel": "Longitud m\xE1x (Tokens):",
    "ttsSpeedLabel": "Velocidad de voz:",
    "whisperUrlLabel": "Servidor Whisper Local (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Resumir autom\xE1ticamente al abrir un video",
    "customPromptLabel": "Instrucciones personalizadas para la IA:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} Exportar \u25BE",
    "modelReady": '\xA1Modelo "{model}" listo ({latency}ms)!',
    "connectionFailed": "Error: {error}",
    "connectionError": "Error de conexi\xF3n",
    "whisperReady": "\xA1Whisper STT local listo ({latency}ms)!",
    "whisperFailed": "Error de Whisper STT: {error}",
    "whisperKeyRequired": "Clave API requerida para la transcripci\xF3n de voz de Whisper.",
    "whisperRecording": "\u{1F399}\uFE0F Grabaci\xF3n de Whisper (Micr\xF3fono)...",
    "whisperTranscribing": "\u23F3 Transcribiendo audio con Whisper...",
    "whisperNoAudio": "No se grab\xF3 audio. Por favor hable al micr\xF3fono.",
    "micAccessError": "No se puede acceder al micr\xF3fono",
    "braveMicNotice": "En Brave Browser, aseg\xFArese de que los permisos de micr\xF3fono est\xE9n permitidos.",
    "chapterBadge": "(Cap\xEDtulos)",
    "transcriptExtracted": "Transcripci\xF3n extra\xEDda",
    "modelResponsive": "Modelo responsivo: {model}",
    "extractingTranscriptNotice": "Extrayendo transcripci\xF3n del video...",
    "fetchingExternalTranscriptNotice": "Obteniendo subt\xEDtulos para el video externo ({videoId})...",
    "analyzingChannelNotice": "Obteniendo el expediente oficial del canal de {query}...",
    "fetchingCommentsNotice": "Obteniendo comentarios y reacciones del p\xFAblico...",
    "externalTranscriptError": "No se pudieron extraer subt\xEDtulos ni cap\xEDtulos para el video externo ({videoId}). Posibles causas: sin subt\xEDtulos ni cap\xEDtulos disponibles, o restricciones de YouTube. Puede abrir este video en una pesta\xF1a para resumirlo directamente.",
    "retryBtn": "\u{1F504} Reintentar",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F Auditor\xEDa Cr\xEDtica, L\xF3gica y Veracidad",
    "runAuditBtn": "\u26A1 Iniciar auditor\xEDa",
    "relaunchAuditBtn": "\u26A1 Reiniciar auditor\xEDa",
    "auditInProgress": "Auditor\xEDa en curso...",
    "auditStarting": "Preparando expediente de auditor\xEDa...",
    "auditAnalyzing": "Examinando coherencia l\xF3gica y hechos...",
    "auditPlaceholder": "Haga clic en '\u26A1 Iniciar auditor\xEDa' para analizar rigor l\xF3gico y hechos.",
    "discussInChatBtn": "\u{1F4AC} Conversar en el Chat",
    "auditChannelBtn": "\u{1F50D} Auditar canal",
    "channelAuditTitle": "\u{1F4CA} Auditor\xEDa Global del Canal",
    "channelSampleInfo": "Muestreo temporal ponderado",
    "periodFilterLabel": "Per\xEDodo analizado:",
    "periodAll": "Todo el historial",
    "periodMonth": "\xDAltimo mes",
    "periodYear": "A\xF1o actual",
    "period6Months": "\xDAltimos 6 meses",
    "subtabAuditVideo": "\u{1F3A5} Auditor\xEDa de video",
    "subtabAuditChannel": "\u{1F4CA} Auditor\xEDa de canal",
    "runChannelAuditBtn": "\u26A1 Auditar canal",
    "channelCompanionDesc": "Eval\xFAe la integridad editorial, la transparencia de patrocinios y la trayectoria del canal.",
    "tabChannelAudit": "\u{1F4CA} Auditor\xEDa del canal",
    "channelChatTitle": "\u{1F4AC} Preguntas sobre el canal",
    "channelChatWelcome": "\xA1Hola! Haz preguntas sobre este canal (l\xEDnea editorial, v\xEDdeos recientes, patrocinios, evoluci\xF3n).",
    "channelChatPlaceholder": "Haz preguntas sobre el canal o pega enlaces de v\xEDdeo...",
    "channelChatResetNotice": "Chat del canal reiniciado. \xA1Haz tus preguntas abajo!",
    "channelChatSuggestions": [
      { "label": "L\xEDnea editorial", "question": "\xBFCu\xE1l es la l\xEDnea editorial principal y la evoluci\xF3n de este canal?" },
      { "label": "Temas y formatos", "question": "\xBFCu\xE1les son los temas principales y formatos de sus v\xEDdeos recientes?" },
      { "label": "Patrocinios", "question": "\xBFQu\xE9 se observa sobre la transparencia comercial y los patrocinadores?" },
      { "label": "Fortalezas y l\xEDmites", "question": "\xBFCu\xE1les son las principales fortalezas y limitaciones de este canal?" }
    ],
    "maxVideosLabel": "L\xEDmite m\xE1x.:",
    "stopAuditBtn": "\u23F9 Detener auditor\xEDa",
    "stopShortBtn": "Detener",
    "auditStoppedNote": "\u23F9 Proceso detenido por el usuario.",
    "channelAuditPlaceholder": 'Haz clic en "\u26A1 Auditar canal" arriba para evaluar este canal.',
    "channelSampleBadge": "Muestra:",
    "channelVideosUnit": "v\xEDdeos",
    "channelAnalyzedVideosUnit": "v\xEDdeos analizados",
    "channelRecentHistoricMix": "Ponderaci\xF3n ~65% reciente y ~35% hist\xF3rica",
    "channelSubscribersUnit": "suscriptores",
    "channelEvolutionTitle": "\u{1F4C8} Evoluci\xF3n Editorial y Calidad",
    "channelStrengthsTitle": "\u2713 Puntos Fuertes (Fortalezas)",
    "channelWeaknessesTitle": "! Puntos a Vigilar (Debilidades)",
    "channelDrawbacksTitle": "\u2715 Riesgos y Trampas (A evitar)",
    "channelSampleVideosTitle": "\u{1F3AC} Desglose de V\xEDdeos Analizados",
    "channelSynthesisTitle": "\u{1F4CB} S\xEDntesis Ejecutiva",
    "copyAuditBtn": "\u{1F4CB} Copiar informe completo",
    "channelSensationalismLabel": "\xCDndice de Sensacionalismo",
    "channelDistributionLabel": "Distribuci\xF3n por tramos de 5%",
    "channelMedianLabel": "Mediana:",
    "channelHomogeneousLine": "L\xEDnea muy homog\xE9nea",
    "channelModerateVarLine": "Varianza moderada",
    "channelVolatileLine": "L\xEDnea vol\xE1til / heterog\xE9nea",
    "channelIntegrityProportion": "Proporci\xF3n de integridad editorial",
    "channelBucketReliable": "Fiable (\u226575)",
    "channelBucketModerate": "Moderado (50-74)",
    "channelBucketRisk": "Riesgo (<50)",
    "channelClickbaitLow": "Sobrio y factual",
    "channelClickbaitMod": "Moderado",
    "channelClickbaitHigh": "Sensacionalista / Clickbait",
    "channelVideoScorePrefix": "Fiabilidad",
    "channelNoStrengths": "No se se\xF1alaron fortalezas destacadas.",
    "channelNoWeaknesses": "No se detectaron debilidades importantes.",
    "channelNoDrawbacks": "No se se\xF1alaron riesgos mayores.",
    "pasteBtn": "Pegar",
    "pasteTooltip": "Pegar desde el portapapeles",
    "chapterOnlyNotice": "YouTube no sirvi\xF3 los subt\xEDtulos completos. Solo se pudieron recuperar los cap\xEDtulos.",
    "forceRetryBtn": "Forzar",
    "extractingLabel": "Extrayendo...",
    "auditErrorPrefix": "Error en la auditor\xEDa:",
    "channelVideosLongBadge": "V\xEDdeo",
    "channelShortsBadge": "Short",
    "channelFormatMixTitle": "\u26A1 Comparativa V\xEDdeos largos vs Shorts",
    "channelFormatVideosLabel": "V\xEDdeos largos",
    "channelFormatShortsLabel": "Shorts",
    "channelFormatAvgScore": "Puntuaci\xF3n med.",
    "channelFormatAvgClickbait": "Sensacionalismo",
    "webBusyBtn": "\u23F3 Analizando...",
    "webReasoningWait": "\u{1F4AD} El modelo est\xE1 razonando...",
    "webEmptyAiResponse": "El modelo de IA no devolvi\xF3 texto de an\xE1lisis (respuesta vac\xEDa o razonamiento truncado). Compruebe el modelo, la longitud de contexto o Max Tokens en Ajustes.",
    "closeExtensionBtn": "Cerrar y desactivar ClarifAI (reactivar desde el popup de la extensi\xF3n)",
    "webCancelBtn": "\u23F9 Cancelar",
    "chatQueueTitle": "En cola ({count})",
    "chatInProgressLabel": "En curso:",
    "chatEditRecallBtn": "Editar / Cancelar",
    "chatRevertBtn": "Volver aqu\xED",
    "chatRevertTitle": "Volver a este mensaje y editar el texto",
    "chatSendNowBtn": "Enviar ahora",
    "chatRemoveQueueBtn": "Quitar de la cola",
    "describeAccessibleBtn": "\u{1F441}\uFE0F Describir (Baja visi\xF3n)",
    "describeAccessibleTitle": "Describir en detalle la p\xE1gina y sus im\xE1genes para personas con baja visi\xF3n y reproducir el audio autom\xE1ticamente",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F Describe esta p\xE1gina y sus im\xE1genes en detalle para una persona con discapacidad visual (audiodescripci\xF3n).",
    "speechBarAriaLabel": "Controles de reproducci\xF3n de audio",
    "speechRestartBtn": "\u23EE Inicio",
    "speechRestartTitle": "Reiniciar la lectura desde el principio",
    "speechPauseBtn": "\u23F8 Pausa",
    "speechResumeBtn": "\u25B6 Reanudar",
    "speechStopBtn": "\u23F9 Detener",
    "speechSeekLabel": "Mover la posici\xF3n de lectura en el texto"
  };
  var es_default = es;

  // src/locales/de.js
  var de = {
    "brandName": "ClarifAI",
    "checking": "\xDCberpr\xFCfung...",
    "connectedBadge": "Verbunden",
    "offlineBadge": "Offline",
    "modelLoading": "Modell: Laden...",
    "modelPrefix": "Modell: ",
    "summarizeBtn": "\u2728 Video zusammenfassen",
    "collapse": "Einklappen",
    "expand": "Ausklappen",
    "providerLabel": "KI-Anbieter:",
    "groupLocal": "\u{1F3E0} Lokale Modelle (Kostenlos & Privat)",
    "groupFast": "\u26A1 Schnelle / Kostenlose Cloud-Inferenz",
    "groupCloud": "\u2601\uFE0F Gro\xDFe Cloud-Anbieter",
    "serverLabel": "Server:",
    "serverLabelLm": "LM Studio Server:",
    "serverLabelOllama": "Ollama Server:",
    "noModelSelected": "Kein Modell ausgew\xE4hlt",
    "keyOk": "Schl\xFCssel OK",
    "keySaved": "Schl\xFCssel gespeichert",
    "invalidKey": "Ung\xFCltiger Schl\xFCssel",
    "serverBusy": "Server ausgelastet (erneut testen)",
    "keyRequired": "Schl\xFCssel erforderlich",
    "customServer": "Andere IP...",
    "refreshTooltip": "Modellliste aktualisieren",
    "toggleKeyVisTooltip": "API-Schl\xFCssel ein-/ausblenden",
    "pasteClipboardHint": "[i] Zwischenablage leer oder blockiert \u2014 mit Strg+V in das API-Schl\xFCsselfeld einf\xFCgen.",
    "apiKeyLabel": "API-Schl\xFCssel:",
    "apiKeyPlaceholder": "F\xFCgen Sie Ihren API-Schl\xFCssel ein...",
    "getApiKeyLink": "\u{1F511} Schl\xFCssel anfordern",
    "modelLabel": "Modell:",
    "testModelBtn": "\u26A1 Testen",
    "testModelTooltip": "Verbindung und Modell testen",
    "langLabel": "Sprache:",
    "formatLabel": "Format:",
    "formatStandard": "\u{1F4CC} Nat\xFCrlich & ausgewogen",
    "formatQuick": "\u26A1 Kurz & pr\xE4gnant",
    "formatDetailed": "\u{1F4DD} Detailliert & gr\xFCndlich",
    "voiceLabel": "Stimme:",
    "voiceDefault": "Systemstimme...",
    "micLabel": "Mikro:",
    "micDefault": "\u{1F399}\uFE0F Standard-Mikrofon",
    "tabSummary": "\u{1F4C4} Videozusammenfassung",
    "tabChat": "\u{1F4AC} Fragen stellen",
    "tabTranscript": "\u{1F4DC} Transkript",
    "summaryTitle": "\u{1F4C4} Videozusammenfassung",
    "listenBtn": "\u{1F50A} Anh\xF6ren",
    "stopListenBtn": "\u23F9\uFE0F Stopp",
    "copyBtn": "\u{1F4CB} Kopieren",
    "copiedBtn": "\u2705 Kopiert!",
    "saveMdBtn": "\u{1F4BE} Als .md speichern",
    "reasoningModel": "\u{1F4AD} Denkprozess des Modells",
    "reasoningInProgress": "in Bearbeitung...",
    "reasoningDone": "abgeschlossen",
    "emptyTitle": "Bereit, dieses Video zusammenzufassen",
    "emptySubtitle": "Erhalten Sie Kernaussagen, Kapitel und wichtige Erkenntnisse in Sekundenschnelle mit KI.",
    "newVideoTitle": "Neues Video erkannt",
    "summaryPlaceholder": "Klicken Sie auf \xAB \u2728 Video zusammenfassen \xBB, um die Zusammenfassung zu erstellen.",
    "newVideoPlaceholder": "Neues Video erkannt. Klicken Sie auf \xAB \u2728 Video zusammenfassen \xBB, um die Zusammenfassung zu erstellen.",
    "generatingSummary": "Zusammenfassung wird erstellt...",
    "waitingForModel": "Modell wird geladen / Kontext vorbereitet ({sec}s)...",
    "streamInterrupted": "Verbindung vor Modellantwort unterbrochen. Stellen Sie sicher, dass das Modell fertig geladen ist, und versuchen Sie es erneut.",
    "chatTitle": "\u{1F4AC} Fragen & Antworten zum Video",
    "clearChatBtn": "\u{1F5D1}\uFE0F Verlauf l\xF6schen",
    "suggestions": [
      { "label": "\u{1F4A1} Kernaussagen", "question": "Was sind die wichtigsten Kernaussagen dieses Videos?" },
      { "label": "\u23F1\uFE0F Zeitstempel", "question": "An welcher Stelle im Video wird das Hauptthema besprochen?" },
      { "label": "\u{1F4CA} Zahlen & Beispiele", "question": "Welche Beispiele, Zahlen oder Argumente werden genannt?" },
      { "label": "\u{1F3AF} Fazit & Ratschl\xE4ge", "question": "Welches Fazit oder welchen Rat gibt der Autor am Ende?" }
    ],
    "chatWelcome": "Hallo! Stellen Sie mir eine Frage zum Inhalt dieses Videos. Ich beziehe mich direkt auf das vollst\xE4ndige Transkript.",
    "chatPlaceholder": "Frage stellen oder ins Mikro sprechen... (Enter zum Senden)",
    "chatInputListening": "\u{1F399}\uFE0F Aufnahme l\xE4uft... Sprechen Sie jetzt.",
    "chatResetNotice": "Unterhaltung zur\xFCckgesetzt. Stellen Sie eine Frage zum Inhalt des Videos!",
    "micTitle": "Frage \xFCber Mikrofon diktieren",
    "attachTitle": "Bild oder Datei anh\xE4ngen (oder Strg+V einf\xFCgen)",
    "attachTitleTextOnly": "Text-/Codedatei anh\xE4ngen (Bilder erfordern ein multimodales Modell)",
    "attachImageNotSupported": "Das ausgew\xE4hlte Modell unterst\xFCtzt keine Bilder. W\xE4hlen Sie ein multimodales Modell oder h\xE4ngen Sie eine Textdatei an.",
    "attachTooLarge": "Bild \xFCberschreitet das Limit von 8 MB.",
    "webTabSummary": "\u{1F4C4} Seitenzusammenfassung",
    "webTabAudit": "\u{1F6E1}\uFE0F Seitenzuverl\xE4ssigkeit",
    "webRunAuditBtn": "\u26A1 Seite pr\xFCfen",
    "webTabDomain": "\u{1F310} Website-Audit",
    "webDomainAuditTitle": "\u{1F310} Website- & Vertrauensaudit",
    "webRunDomainAuditBtn": "\u26A1 Website pr\xFCfen",
    "webDepthLabel": "Scantiefe:",
    "webDepthLevelUnit": "Ebene(n)",
    "webExtractedTitle": "\u{1F4DC} Extrahierter Text & URL-Signale",
    "webSummarizeBtn": "\u2728 Seite zusammenfassen",
    "webReliabilityLabel": "Zuverl\xE4ssigkeitswert",
    "webTileConn": "Verbindung & URL",
    "webTileBrand": "Angegebene Identit\xE4t",
    "webTileForms": "Formulare",
    "webTileDom": "DOM-Integrit\xE4t",
    "webTileSite": "Analysierte Website",
    "webTileLegal": "Rechtliche Seiten",
    "webTileContacts": "Offizielle Kontakte",
    "webValHttp": "Unverschl\xFCsseltes HTTP",
    "webValFormsWarn": "Sensible Felder erkannt",
    "webValFormsOk": "Keine Fallen erkannt",
    "webValDomWarn": "Verd\xE4chtige Signale",
    "webValDomOk": "Sauberes DOM",
    "webValNoneFound": "Kein Kontakt sichtbar",
    "webTileStructure": "Seitenstruktur",
    "webPagesFound": "{n} Seite(n) gefunden",
    "webNoLegalPages": "Keine erkannt",
    "webValStructComplete": "Klar strukturiert",
    "webValStructPartial": "Teilweise strukturiert",
    "webValStructMinimal": "Einzelseite / minimal",
    "webBarLegal": "Impressum & Rechtliches",
    "webBarContacts": "Kontaktm\xF6glichkeiten",
    "webBarStructure": "Navigation & Aufbau",
    "webBarHomeInfo": "Startseiten-Klarheit",
    "attachUnsupported": "Nicht unterst\xFCtzter Dateityp. Bilder oder Text-/Codedateien anh\xE4ngen.",
    "micStopTitle": "Aufnahme beenden",
    "sendBtn": "Senden \u27A4",
    "transcriptTitle": "\u{1F4DC} Vollst\xE4ndiges Transkript",
    "wordsBadge": "W\xF6rter",
    "copyRawBtn": "\u{1F4CB} Rohtext kopieren",
    "transcriptWaiting": "Warten auf Extraktion... (Wird beim Starten der Zusammenfassung oder einer Frage geladen)",
    "micActiveNotice": "\u{1F399}\uFE0F Sprachaufnahme aktiv... Sprechen Sie jetzt.",
    "micBlockedNotice": "Mikrofon blockiert: Bitte erlauben Sie den Mikrofonzugriff in Chrome (\u{1F512}-Symbol links neben der URL).",
    "micNoDeviceNotice": "Kein Mikrofon erkannt oder Ger\xE4t nicht verf\xFCgbar.",
    "micNetworkNotice": "Google Speech Netzwerkfehler. Wenn Sie Brave nutzen, aktivieren Sie 'Google-Dienste f\xFCr Spracherkennung' in brave://settings/privacy, oder pr\xFCfen Sie Ihren Werbeblocker/VPN.",
    "micErrorNotice": "Mikrofonfehler: ",
    "micNotSupportedNotice": "Spracherkennung wird von diesem Browser nicht unterst\xFCtzt.",
    "listenBubbleTitle": "Diese Antwort anh\xF6ren",
    "noSummaryToRead": "Noch keine Zusammenfassung zum Vorlesen vorhanden.",
    "noTranscriptError": "Das Transkript dieses Videos konnte nicht geladen werden. Bitte stellen Sie sicher, dass Untertitel auf YouTube verf\xFCgbar sind.",
    "selectModelAlert": "Bitte w\xE4hlen Sie oben ein KI-Modell aus.",
    "missingKeyAlert": "Bitte geben Sie Ihren API-Schl\xFCssel ein, um zu chatten.",
    "advancedOptions": "\u2699\uFE0F Erweiterte Optionen (KI, Audio & Automation)",
    "settingsBtn": "Einstellungen",
    "errorLabel": "Fehler: ",
    "settingsHideBtn": "\u2715 Schlie\xDFen",
    "tabSettingsModel": "\u{1F916} Modell & Server",
    "tabSettingsAudio": "\u{1F399}\uFE0F Stimme & Audio",
    "tabSettingsParams": "\u2699\uFE0F KI-Parameter",
    "testSttBtn": "\u26A1 STT testen",
    "customPromptPlaceholder": "z.B. Technische Details betonen, mit Analogien erkl\xE4ren...",
    "whisperUrlPlaceholder": "z.B. http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "von",
    "footerReportBug": "Fehler melden",
    "footerDocs": "Dokumentation",
    "tempStrict": "0.0 - Streng & Pr\xE4zise",
    "tempBalanced": "0.3 - Ausgewogen (Standard)",
    "tempCreative": "0.7 - Kreativ & Detailliert",
    "tempWild": "1.0 - Sehr erfinderisch",
    "tokensAuto": "Automatisch (Standard)",
    "tokensShort": "Kurz (1.024)",
    "tokensStandard": "Standard (2.048)",
    "tokensDetailed": "Detailliert (4.096)",
    "tokensMax": "Maximum (8.192)",
    "localContextLabel": "Lokaler Kontext (0 = Auto \u2192 1M):",
    "ctxAuto": "0 \u2014 Auto (Serverstandard)",
    "ctxServerDefault": "{ctx} Tokens ({provider}-Standard)",
    "ctxFixedCloud": "Fest (Cloud-Modell \u2014 nicht \xE4nderbar)",
    "ctxFixedServer": "Nicht \xE4nderbar (Server-API)",
    "applyContextBtn": "\u26A1 Anwenden",
    "applyContextTooltip": "Modell mit dieser Kontextgr\xF6\xDFe neu laden",
    "contextAppliedMsg": "Kontextfenster auf {ctx} Tokens gesetzt (bereit)",
    "contextOllamaHint": "Ollama-Kontext auf {ctx} Tokens gesetzt (n\xE4chste Anfrage)",
    "speedSlow": "0.75x (Ruhig)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (Schnell)",
    "speedVeryFast": "1.5x (Sehr schnell)",
    "speedDouble": "2.0x (Doppelt)",
    "tempLabel": "KI-Kreativit\xE4t (Temperatur):",
    "maxTokensLabel": "Maximale L\xE4nge (Tokens):",
    "ttsSpeedLabel": "Sprachgeschwindigkeit:",
    "whisperUrlLabel": "Lokaler Whisper-Server (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Automatisch zusammenfassen beim \xD6ffnen",
    "customPromptLabel": "Benutzerdefinierte KI-Anweisungen:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} Export \u25BE",
    "modelReady": 'Modell "{model}" bereit ({latency}ms)!',
    "connectionFailed": "Fehlgeschlagen: {error}",
    "connectionError": "Verbindungsfehler",
    "whisperReady": "Lokales Whisper STT bereit ({latency}ms)!",
    "whisperFailed": "Whisper STT fehlgeschlagen: {error}",
    "whisperKeyRequired": "API-Schl\xFCssel f\xFCr Whisper-Sprachtranskription erforderlich.",
    "whisperRecording": "\u{1F399}\uFE0F Whisper-Aufnahme (Mikrofon)...",
    "whisperTranscribing": "\u23F3 Audio wird mit Whisper transkribiert...",
    "whisperNoAudio": "Kein Ton aufgenommen. Bitte ins Mikrofon sprechen.",
    "micAccessError": "Kein Zugriff auf das Mikrofon",
    "braveMicNotice": "Stellen Sie im Brave Browser sicher, dass Mikrofonberechtigungen erteilt sind.",
    "chapterBadge": "(Kapitel)",
    "transcriptExtracted": "Transkript extrahiert",
    "modelResponsive": "Reaktionsschnelles Modell: {model}",
    "extractingTranscriptNotice": "Video-Transkript wird extrahiert...",
    "fetchingExternalTranscriptNotice": "Untertitel f\xFCr externes Video ({videoId}) werden abgerufen...",
    "analyzingChannelNotice": "Offizielles Kanaldossier f\xFCr {query} wird abgerufen...",
    "fetchingCommentsNotice": "Top-Kommentare und Publikumsreaktionen werden abgerufen...",
    "externalTranscriptError": "Untertitel oder Kapitel f\xFCr das externe Video ({videoId}) konnten nicht extrahiert werden. M\xF6gliche Ursachen: keine Untertitel oder Kapitel verf\xFCgbar oder YouTube-Zugriffsbeschr\xE4nkungen.",
    "retryBtn": "\u{1F504} Wiederholen",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F Kritisches Audit, Logik & Faktencheck",
    "runAuditBtn": "\u26A1 Audit starten",
    "relaunchAuditBtn": "\u26A1 Audit wiederholen",
    "auditInProgress": "Audit l\xE4uft...",
    "auditStarting": "Audit-Dossier wird vorbereitet...",
    "auditAnalyzing": "Logische Konsistenz und Fakten werden gepr\xFCft...",
    "auditPlaceholder": "Klicken Sie auf '\u26A1 Audit starten', um logische Strenge und Fakten zu analysieren.",
    "discussInChatBtn": "\u{1F4AC} Im Chat diskutieren",
    "auditChannelBtn": "\u{1F50D} Kanal pr\xFCfen",
    "channelAuditTitle": "\u{1F4CA} Globales Kanal-Audit",
    "channelSampleInfo": "Gewichtete Zeitstichprobe",
    "periodFilterLabel": "Analysierter Zeitraum:",
    "periodAll": "Gesamter Verlauf",
    "periodMonth": "Letzter Monat",
    "periodYear": "Aktuelles Jahr",
    "period6Months": "Letzte 6 Monate",
    "subtabAuditVideo": "\u{1F3A5} Video-Audit",
    "subtabAuditChannel": "\u{1F4CA} Kanal-Audit",
    "runChannelAuditBtn": "\u26A1 Kanal pr\xFCfen",
    "channelCompanionDesc": "Bewerten Sie die redaktionelle Integrit\xE4t, Transparenz und Entwicklung dieses Kanals.",
    "tabChannelAudit": "\u{1F4CA} Kanal-Audit",
    "channelChatTitle": "\u{1F4AC} Kanal-F&A",
    "channelChatWelcome": "Hallo! Stellen Sie Fragen zu diesem Kanal (Ausrichtung, aktuelle Videos, Sponsoren, Entwicklung).",
    "channelChatPlaceholder": "Fragen zum Kanal stellen oder Video-Links einf\xFCgen...",
    "channelChatResetNotice": "Kanal-Chat zur\xFCckgesetzt. Stellen Sie Ihre Fragen unten!",
    "channelChatSuggestions": [
      { "label": "Redaktionelle Linie", "question": "Was ist die redaktionelle Ausrichtung und Entwicklung dieses Kanals?" },
      { "label": "Themen & Formate", "question": "Welche Hauptthemen und wiederkehrenden Formate gibt es in den letzten Videos?" },
      { "label": "Sponsoren", "question": "Wie transparent geht der Kanal mit Partnern und Sponsorings um?" },
      { "label": "St\xE4rken & Schw\xE4chen", "question": "Was sind die gr\xF6\xDFten St\xE4rken und Schw\xE4chen dieses Kanals?" }
    ],
    "maxVideosLabel": "Max. Anzahl:",
    "stopAuditBtn": "\u23F9 Audit stoppen",
    "stopShortBtn": "Stopp",
    "auditStoppedNote": "\u23F9 Vorgang vom Benutzer gestoppt.",
    "channelAuditPlaceholder": "Klicken Sie oben auf \u201E\u26A1 Kanal-Audit starten\u201C, um diesen Kanal zu bewerten.",
    "channelSampleBadge": "Stichprobe:",
    "channelVideosUnit": "Videos",
    "channelAnalyzedVideosUnit": "analysierte Videos",
    "channelRecentHistoricMix": "Gewichtung ~65% aktuell & ~35% historisch",
    "channelSubscribersUnit": "Abonnenten",
    "channelEvolutionTitle": "\u{1F4C8} Redaktionelle & Qualit\xE4tsentwicklung",
    "channelStrengthsTitle": "\u2713 Was gut funktioniert (St\xE4rken)",
    "channelWeaknessesTitle": "! Beobachtungspunkte (Schw\xE4chen)",
    "channelDrawbacksTitle": "\u2715 Risiken & Fallstricke (Vermeiden)",
    "channelSampleVideosTitle": "\u{1F3AC} Details zu analysierten Videos",
    "channelSynthesisTitle": "\u{1F4CB} Gesamtzusammenfassung",
    "copyAuditBtn": "\u{1F4CB} Vollst\xE4ndigen Bericht kopieren",
    "channelSensationalismLabel": "Sensationsindex",
    "channelDistributionLabel": "Verteilung in 5%-Schritten",
    "channelMedianLabel": "Median:",
    "channelHomogeneousLine": "Sehr konsistente Linie",
    "channelModerateVarLine": "Moderate Streuung",
    "channelVolatileLine": "Volatile / uneinheitliche Linie",
    "channelIntegrityProportion": "Anteil redaktioneller Integrit\xE4t",
    "channelBucketReliable": "Zuverl\xE4ssig (\u226575)",
    "channelBucketModerate": "Moderat (50-74)",
    "channelBucketRisk": "Risiko (<50)",
    "channelClickbaitLow": "Sachlich & seri\xF6s",
    "channelClickbaitMod": "Moderat",
    "channelClickbaitHigh": "Rei\xDFerisch / Clickbait",
    "channelVideoScorePrefix": "Zuverl\xE4ssigkeit",
    "channelNoStrengths": "Keine besonderen St\xE4rken vermerkt.",
    "channelNoWeaknesses": "Keine gr\xF6\xDFeren Schw\xE4chen festgestellt.",
    "channelNoDrawbacks": "Keine gr\xF6\xDFeren Risiken festgestellt.",
    "pasteBtn": "Einf\xFCgen",
    "pasteTooltip": "Aus Zwischenablage einf\xFCgen",
    "chapterOnlyNotice": "Vollst\xE4ndige Untertitel von YouTube nicht verf\xFCgbar. Nur Kapitel konnten abgerufen werden.",
    "forceRetryBtn": "Erzwingen",
    "extractingLabel": "Extraktion l\xE4uft...",
    "auditErrorPrefix": "Audit-Fehler:",
    "channelVideosLongBadge": "Video",
    "channelShortsBadge": "Short",
    "channelFormatMixTitle": "\u26A1 Vergleich: Langvideos vs. Shorts",
    "channelFormatVideosLabel": "Langvideos",
    "channelFormatShortsLabel": "Shorts",
    "channelFormatAvgScore": "\xD8 Bewertung",
    "channelFormatAvgClickbait": "Sensationalismus",
    "webBusyBtn": "\u23F3 Analyse l\xE4uft...",
    "webReasoningWait": "\u{1F4AD} Modell denkt nach...",
    "webEmptyAiResponse": "Das KI-Modell hat keinen Analysetext zur\xFCckgegeben (leere Antwort oder abgebrochenes Reasoning). Pr\xFCfen Sie Modell, Kontextl\xE4nge oder Max Tokens in den Einstellungen.",
    "closeExtensionBtn": "ClarifAI schlie\xDFen und deaktivieren (jederzeit \xFCber das Popup reaktivieren)",
    "webCancelBtn": "\u23F9 Abbrechen",
    "chatQueueTitle": "Warteschlange ({count})",
    "chatInProgressLabel": "L\xE4uft:",
    "chatEditRecallBtn": "Bearbeiten / Abbrechen",
    "chatRevertBtn": "Zur\xFCcksetzen",
    "chatRevertTitle": "Zu dieser Nachricht zur\xFCckkehren und Text bearbeiten",
    "chatSendNowBtn": "Jetzt senden",
    "chatRemoveQueueBtn": "Aus Warteschlange entfernen",
    "describeAccessibleBtn": "\u{1F441}\uFE0F Beschreiben (Sehbehinderte)",
    "describeAccessibleTitle": "Seite und Bilder ausf\xFChrlich f\xFCr sehbehinderte Menschen beschreiben und automatisch vorlesen",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F Beschreibe diese Seite und ihre Bilder ausf\xFChrlich f\xFCr eine sehbehinderte oder blinde Person (Audiodeskription).",
    "speechBarAriaLabel": "Audiowiedergabe-Steuerung",
    "speechRestartBtn": "\u23EE Anfang",
    "speechRestartTitle": "Wiedergabe von vorne starten",
    "speechPauseBtn": "\u23F8 Pause",
    "speechResumeBtn": "\u25B6 Fortsetzen",
    "speechStopBtn": "\u23F9 Stopp",
    "speechSeekLabel": "Leseposition im Text verschieben"
  };
  var de_default = de;

  // src/locales/it.js
  var it = {
    "brandName": "ClarifAI",
    "checking": "Verifica...",
    "connectedBadge": "Connesso",
    "offlineBadge": "Non in linea",
    "modelLoading": "Modello: Caricamento...",
    "modelPrefix": "Modello: ",
    "summarizeBtn": "\u2728 Riassumi questo video",
    "collapse": "Comprimi",
    "expand": "Espandi",
    "providerLabel": "Fornitore IA:",
    "groupLocal": "\u{1F3E0} Modelli Locali (Gratuiti & Privati)",
    "groupFast": "\u26A1 Inferenza Cloud Veloce / Gratuita",
    "groupCloud": "\u2601\uFE0F Principali Fornitori Cloud",
    "serverLabel": "Server:",
    "serverLabelLm": "Server LM Studio:",
    "serverLabelOllama": "Server Ollama:",
    "noModelSelected": "Nessun modello selezionato",
    "keyOk": "Chiave OK",
    "keySaved": "Chiave salvata",
    "invalidKey": "Chiave non valida",
    "serverBusy": "Server occupato (riprova)",
    "keyRequired": "Chiave richiesta",
    "customServer": "Altro IP...",
    "refreshTooltip": "Aggiorna elenco modelli",
    "toggleKeyVisTooltip": "Mostra / nascondi chiave API",
    "pasteClipboardHint": "[i] Appunti vuoti o bloccati \u2014 incolla con Ctrl+V nel campo Chiave API.",
    "apiKeyLabel": "Chiave API:",
    "apiKeyPlaceholder": "Incolla la tua chiave API...",
    "getApiKeyLink": "\u{1F511} Ottieni una chiave",
    "modelLabel": "Modello:",
    "testModelBtn": "\u26A1 Prova",
    "testModelTooltip": "Verifica connessione e modello",
    "langLabel": "Lingua:",
    "formatLabel": "Formato:",
    "formatStandard": "\u{1F4CC} Naturale & bilanciato",
    "formatQuick": "\u26A1 Breve & conciso",
    "formatDetailed": "\u{1F4DD} Dettagliato & approfondito",
    "voiceLabel": "Voce:",
    "voiceDefault": "Voce di sistema...",
    "micLabel": "Microfono:",
    "micDefault": "\u{1F399}\uFE0F Microfono predefinito",
    "tabSummary": "\u{1F4C4} Riassunto video",
    "tabChat": "\u{1F4AC} Fai delle domande",
    "tabTranscript": "\u{1F4DC} Trascrizione",
    "summaryTitle": "\u{1F4C4} Riassunto video",
    "listenBtn": "\u{1F50A} Ascolta",
    "stopListenBtn": "\u23F9\uFE0F Interrompi",
    "copyBtn": "\u{1F4CB} Copia",
    "copiedBtn": "\u2705 Copiato!",
    "saveMdBtn": "\u{1F4BE} Salva .md",
    "reasoningModel": "\u{1F4AD} Ragionamento del modello",
    "reasoningInProgress": "in corso...",
    "reasoningDone": "completato",
    "emptyTitle": "Pronto per riassumere questo video",
    "emptySubtitle": "Estrai punti chiave, capitoli e conclusioni in pochi secondi con l'IA.",
    "newVideoTitle": "Nuovo video rilevato",
    "summaryPlaceholder": "Fai clic su \xAB \u2728 Riassumi questo video \xBB per generare il riassunto.",
    "newVideoPlaceholder": "Nuovo video rilevato. Fai clic su \xAB \u2728 Riassumi questo video \xBB per generare il riassunto.",
    "generatingSummary": "Generazione del riassunto in corso...",
    "waitingForModel": "Caricamento modello / preparazione contesto ({sec}s)...",
    "streamInterrupted": "Connessione interrotta prima della risposta del modello. Verifica che il caricamento sia completato e riprova.",
    "chatTitle": "\u{1F4AC} Domande & Risposte sul video",
    "clearChatBtn": "\u{1F5D1}\uFE0F Cancella conversazione",
    "suggestions": [
      { "label": "\u{1F4A1} Punti chiave", "question": "Quali sono i punti chiave essenziali da ricordare?" },
      { "label": "\u23F1\uFE0F Momenti salienti", "question": "In quale momento del video si parla dell'argomento principale?" },
      { "label": "\u{1F4CA} Dati ed Esempi", "question": "Quali esempi, dati o argomenti specifici vengono citati?" },
      { "label": "\u{1F3AF} Conclusione e Consigli", "question": "Cosa consiglia o conclude l'autore alla fine?" }
    ],
    "chatWelcome": "Ciao! Fammi qualsiasi domanda sui contenuti di questo video. Mi baso direttamente sulla sua trascrizione integrale.",
    "chatPlaceholder": "Fai una domanda o detta al microfono... (Invio per inviare)",
    "chatInputListening": "\u{1F399}\uFE0F Dettatura attiva... Parla al microfono.",
    "chatResetNotice": "Conversazione reimpostata. Fai una domanda sui contenuti del video!",
    "micTitle": "Detta la tua domanda con il microfono",
    "attachTitle": "Allega immagine o file (o incolla Ctrl+V)",
    "attachTitleTextOnly": "Allega file di testo/codice (le immagini richiedono un modello multimodale)",
    "attachImageNotSupported": "Il modello selezionato non supporta le immagini. Seleziona un modello multimodale o allega un file di testo.",
    "attachTooLarge": "L'immagine supera il limite di 8 MB.",
    "webTabSummary": "\u{1F4C4} Riassunto pagina",
    "webTabAudit": "\u{1F6E1}\uFE0F Affidabilit\xE0 della pagina",
    "webRunAuditBtn": "\u26A1 Analizza pagina",
    "webTabDomain": "\u{1F310} Audit del sito",
    "webDomainAuditTitle": "\u{1F310} Audit globale del sito",
    "webRunDomainAuditBtn": "\u26A1 Analizza sito",
    "webDepthLabel": "Profondit\xE0:",
    "webDepthLevelUnit": "livello/i",
    "webExtractedTitle": "\u{1F4DC} Contenuto estratto e segnali URL",
    "webSummarizeBtn": "\u2728 Riassumi pagina",
    "webReliabilityLabel": "Indice di affidabilit\xE0",
    "webTileConn": "Connessione e URL",
    "webTileBrand": "Identit\xE0 dichiarata",
    "webTileForms": "Moduli",
    "webTileDom": "Integrit\xE0 DOM",
    "webTileSite": "Sito analizzato",
    "webTileLegal": "Pagine ufficiali",
    "webTileContacts": "Contatti ufficiali",
    "webValHttp": "HTTP non crittografato",
    "webValFormsWarn": "Campi sensibili rilevati",
    "webValFormsOk": "Nessuna trappola rilevata",
    "webValDomWarn": "Segnali sospetti",
    "webValDomOk": "DOM pulito",
    "webValNoneFound": "Nessun contatto visibile",
    "webTileStructure": "Struttura del sito",
    "webPagesFound": "{n} pagina/e trovata/e",
    "webNoLegalPages": "Nessuna rilevata",
    "webValStructComplete": "Ben strutturato",
    "webValStructPartial": "Struttura parziale",
    "webValStructMinimal": "Pagina isolata / minima",
    "webBarLegal": "Note legali e info",
    "webBarContacts": "Canali di contatto",
    "webBarStructure": "Navigazione e menu",
    "webBarHomeInfo": "Chiarezza homepage",
    "attachUnsupported": "Tipo di file non supportato. Allega immagini o file di testo/codice.",
    "micStopTitle": "Interrompi dettatura",
    "sendBtn": "Invia \u27A4",
    "transcriptTitle": "\u{1F4DC} Trascrizione integrale",
    "wordsBadge": "parole",
    "copyRawBtn": "\u{1F4CB} Copia testo",
    "transcriptWaiting": "In attesa di estrazione... (Verr\xE0 estratta all'avvio del riassunto o di una domanda)",
    "micActiveNotice": "\u{1F399}\uFE0F Dettatura vocale attiva... Parla ora.",
    "micBlockedNotice": "Microfono bloccato: autorizza l'accesso al microfono in Chrome (icona \u{1F512} a sinistra dell'URL).",
    "micNoDeviceNotice": "Nessun microfono rilevato o dispositivo audio non disponibile.",
    "micNetworkNotice": "Errore di rete Google Speech. Se usi Brave, attiva 'Servizi Google per il riconoscimento vocale' in brave://settings/privacy, o controlla che un adblocker/VPN non blocchi il servizio.",
    "micErrorNotice": "Errore microfono: ",
    "micNotSupportedNotice": "Il riconoscimento vocale non \xE8 supportato in questo browser.",
    "listenBubbleTitle": "Ascolta questa risposta",
    "noSummaryToRead": "Nessun riassunto da leggere al momento.",
    "noTranscriptError": "Impossibile estrarre la trascrizione di questo video. Assicurati che i sottotitoli siano disponibili su YouTube.",
    "selectModelAlert": "Seleziona un modello IA nella barra delle impostazioni sopra.",
    "missingKeyAlert": "Inserisci la tua chiave API per chattare.",
    "advancedOptions": "\u2699\uFE0F Opzioni avanzate (IA, Audio & Automazione)",
    "settingsBtn": "Impostazioni",
    "errorLabel": "Errore: ",
    "settingsHideBtn": "\u2715 Chiudi impostazioni",
    "tabSettingsModel": "\u{1F916} Modello & Server",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voce & Audio",
    "tabSettingsParams": "\u2699\uFE0F Parametri IA",
    "testSttBtn": "\u26A1 Prova STT",
    "customPromptPlaceholder": "es: Insistere sugli aspetti tecnici, spiegare con analogie...",
    "whisperUrlPlaceholder": "es: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "da",
    "footerReportBug": "Segnala un bug",
    "footerDocs": "Documentazione",
    "tempStrict": "0.0 - Rigido & Preciso",
    "tempBalanced": "0.3 - Bilanciato (Predefinito)",
    "tempCreative": "0.7 - Creativo & Dettagliato",
    "tempWild": "1.0 - Molto inventivo",
    "tokensAuto": "Automatico (Predefinito)",
    "tokensShort": "Breve (1.024)",
    "tokensStandard": "Standard (2.048)",
    "tokensDetailed": "Dettagliato (4.096)",
    "tokensMax": "Massimo (8.192)",
    "localContextLabel": "Contesto locale (0 = Auto \u2192 1M):",
    "ctxAuto": "0 \u2014 Auto (Predefinito server)",
    "ctxServerDefault": "{ctx} token (Predefinito {provider})",
    "ctxFixedCloud": "Fisso (Modello Cloud \u2014 sola lettura)",
    "ctxFixedServer": "Non modificabile (API server)",
    "applyContextBtn": "\u26A1 Applica",
    "applyContextTooltip": "Ricarica il modello con questa dimensione di contesto",
    "contextAppliedMsg": "Contesto impostato a {ctx} token (pronto)",
    "contextOllamaHint": "Contesto Ollama impostato a {ctx} token (prossima richiesta)",
    "speedSlow": "0.75x (Calmo)",
    "speedNormal": "1.0x (Normale)",
    "speedFast": "1.25x (Veloce)",
    "speedVeryFast": "1.5x (Accelerato)",
    "speedDouble": "2.0x (Doppio)",
    "tempLabel": "Creativit\xE0 IA (Temperatura):",
    "maxTokensLabel": "Lunghezza max (Tokens):",
    "ttsSpeedLabel": "Velocit\xE0 voce:",
    "whisperUrlLabel": "Server Whisper Locale (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Riassumi automaticamente all'apertura del video",
    "customPromptLabel": "Istruzioni personalizzate per l'IA:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} Esporta \u25BE",
    "modelReady": 'Modello "{model}" pronto ({latency}ms)!',
    "connectionFailed": "Non riuscito: {error}",
    "connectionError": "Errore di connessione",
    "whisperReady": "Whisper STT locale pronto ({latency}ms)!",
    "whisperFailed": "Whisper STT non riuscito: {error}",
    "whisperKeyRequired": "Chiave API richiesta per la trascrizione vocale Whisper.",
    "whisperRecording": "\u{1F399}\uFE0F Registrazione Whisper (Microfono)...",
    "whisperTranscribing": "\u23F3 Trascrizione audio con Whisper in corso...",
    "whisperNoAudio": "Nessun audio registrato. Parla nel microfono.",
    "micAccessError": "Impossibile accedere al microfono",
    "braveMicNotice": "Su Brave Browser, assicurati che i permessi del microfono siano consentiti.",
    "chapterBadge": "(Capitoli)",
    "transcriptExtracted": "Trascrizione estratta",
    "modelResponsive": "Modello reattivo: {model}",
    "extractingTranscriptNotice": "Estrazione della trascrizione del video in corso...",
    "fetchingExternalTranscriptNotice": "Recupero dei sottotitoli per il video esterno ({videoId})...",
    "analyzingChannelNotice": "Recupero del dossier ufficiale del canale di {query}...",
    "fetchingCommentsNotice": "Recupero dei commenti e delle reazioni del pubblico...",
    "externalTranscriptError": "Impossibile estrarre sottotitoli o capitoli per il video esterno ({videoId}). Possibili cause: nessun sottotitolo o capitolo disponibile, o restrizioni di accesso YouTube.",
    "retryBtn": "\u{1F504} Riprova",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F Audit Critico, Logica & Veridicit\xE0",
    "runAuditBtn": "\u26A1 Avvia audit",
    "relaunchAuditBtn": "\u26A1 Riavvia audit",
    "auditInProgress": "Audit in corso...",
    "auditStarting": "Preparazione dossier audit...",
    "auditAnalyzing": "Verifica della coerenza logica e dei fatti...",
    "auditPlaceholder": "Clicca su '\u26A1 Avvia audit' per analizzare il rigore logico e la veridicit\xE0.",
    "discussInChatBtn": "\u{1F4AC} Discuti nella Chat",
    "auditChannelBtn": "\u{1F50D} Esamina canale",
    "channelAuditTitle": "\u{1F4CA} Audit Globale del Canale",
    "channelSampleInfo": "Campionamento temporale ponderato",
    "periodFilterLabel": "Periodo analizzato:",
    "periodAll": "Tutta la cronologia",
    "periodMonth": "Ultimo mese",
    "periodYear": "Anno in corso",
    "period6Months": "Ultimi 6 mesi",
    "subtabAuditVideo": "\u{1F3A5} Audit video",
    "subtabAuditChannel": "\u{1F4CA} Audit canale",
    "runChannelAuditBtn": "\u26A1 Analizza canale",
    "channelCompanionDesc": "Valuta l'integrit\xE0 editoriale, la trasparenza delle sponsorizzazioni e la traiettoria del canale.",
    "tabChannelAudit": "\u{1F4CA} Audit del canale",
    "channelChatTitle": "\u{1F4AC} Domande sul canale",
    "channelChatWelcome": "Ciao! Fai domande su questo canale (linea editoriale, video pubblicati, sponsorizzazioni, evoluzione).",
    "channelChatPlaceholder": "Fai domande sul canale o incolla link di video...",
    "channelChatResetNotice": "Chat del canale reimpostata. Fai le tue domande qui sotto!",
    "channelChatSuggestions": [
      { "label": "Linea editoriale", "question": "Qual \xE8 la linea editoriale principale e l'evoluzione di questo canale?" },
      { "label": "Temi e formati", "question": "Quali sono i temi principali e i formati ricorrenti nei video recenti?" },
      { "label": "Sponsor e trasparenza", "question": "Cosa si osserva sulla trasparenza commerciale e sulle sponsorizzazioni?" },
      { "label": "Punti di forza", "question": "Quali sono i principali punti di forza e limiti di questo canale?" }
    ],
    "maxVideosLabel": "Limite max:",
    "stopAuditBtn": "\u23F9 Ferma audit",
    "stopShortBtn": "Ferma",
    "auditStoppedNote": "\u23F9 Elaborazione interrotta dall'utente.",
    "channelAuditPlaceholder": 'Fai clic su "\u26A1 Avvia audit canale" sopra per valutare questo canale.',
    "channelSampleBadge": "Campione:",
    "channelVideosUnit": "video",
    "channelAnalyzedVideosUnit": "video analizzati",
    "channelRecentHistoricMix": "Ponderazione ~65% recenti e ~35% storici",
    "channelSubscribersUnit": "iscritti",
    "channelEvolutionTitle": "\u{1F4C8} Evoluzione Editoriale e Qualit\xE0",
    "channelStrengthsTitle": "\u2713 Punti di Forza (Cosa funziona)",
    "channelWeaknessesTitle": "! Punti di Attenzione (Debolezze)",
    "channelDrawbacksTitle": "\u2715 Rischi e Trappole (Da evitare)",
    "channelSampleVideosTitle": "\u{1F3AC} Dettaglio Video Analizzati",
    "channelSynthesisTitle": "\u{1F4CB} Sintesi Generale",
    "copyAuditBtn": "\u{1F4CB} Copia report completo",
    "channelSensationalismLabel": "Indice Sensazionalismo",
    "channelDistributionLabel": "Distribuzione per fasce del 5%",
    "channelMedianLabel": "Mediana:",
    "channelHomogeneousLine": "Linea molto coerente",
    "channelModerateVarLine": "Varianza moderata",
    "channelVolatileLine": "Linea volatile / eterogenea",
    "channelIntegrityProportion": "Proporzione di integrit\xE0 editoriale",
    "channelBucketReliable": "Affidabile (\u226575)",
    "channelBucketModerate": "Moderato (50-74)",
    "channelBucketRisk": "Rischio (<50)",
    "channelClickbaitLow": "Sobrio e fattuale",
    "channelClickbaitMod": "Moderato",
    "channelClickbaitHigh": "Sensazionalistico / Clickbait",
    "channelVideoScorePrefix": "Affidabilit\xE0",
    "channelNoStrengths": "Nessun punto di forza rilevante segnalato.",
    "channelNoWeaknesses": "Nessuna debolezza grave rilevata.",
    "channelNoDrawbacks": "Nessun rischio maggiore segnalato.",
    "pasteBtn": "Incolla",
    "pasteTooltip": "Incolla dagli appunti",
    "chapterOnlyNotice": "Sottotitoli completi non forniti da YouTube. Solo i capitoli sono stati recuperati.",
    "forceRetryBtn": "Forza",
    "extractingLabel": "Estrazione in corso...",
    "auditErrorPrefix": "Errore di audit:",
    "channelVideosLongBadge": "Video",
    "channelShortsBadge": "Short",
    "channelFormatMixTitle": "\u26A1 Confronto Video lunghi vs Shorts",
    "channelFormatVideosLabel": "Video lunghi",
    "channelFormatShortsLabel": "Shorts",
    "channelFormatAvgScore": "Punteggio med.",
    "channelFormatAvgClickbait": "Sensazionalismo",
    "webBusyBtn": "\u23F3 Analisi in corso...",
    "webReasoningWait": "\u{1F4AD} Il modello sta ragionando...",
    "webEmptyAiResponse": "Il modello IA non ha restituito alcun testo di analisi (risposta vuota o ragionamento troncato). Verificare modello, lunghezza contesto o Max Tokens nelle Impostazioni.",
    "closeExtensionBtn": "Chiudi e disattiva ClarifAI (riattiva dal popup dell\u2019estensione)",
    "webCancelBtn": "\u23F9 Annulla",
    "chatQueueTitle": "In coda ({count})",
    "chatInProgressLabel": "In corso:",
    "chatEditRecallBtn": "Modifica / Annulla",
    "chatRevertBtn": "Torna qui",
    "chatRevertTitle": "Torna a questo messaggio e modifica il testo",
    "chatSendNowBtn": "Invia ora",
    "chatRemoveQueueBtn": "Rimuovi dalla coda",
    "describeAccessibleBtn": "\u{1F441}\uFE0F Descrivi (Ipovedenti)",
    "describeAccessibleTitle": "Descrivi in dettaglio la pagina e le immagini per persone ipovedenti con lettura automatica",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F Descrivi questa pagina e le sue immagini in dettaglio per una persona ipovedente o non vedente (audiodescrizione).",
    "speechBarAriaLabel": "Controlli di riproduzione audio",
    "speechRestartBtn": "\u23EE Inizio",
    "speechRestartTitle": "Ricomincia la lettura dall'inizio",
    "speechPauseBtn": "\u23F8 Pausa",
    "speechResumeBtn": "\u25B6 Riprendi",
    "speechStopBtn": "\u23F9 Ferma",
    "speechSeekLabel": "Sposta la posizione di lettura nel testo"
  };
  var it_default = it;

  // src/locales/ru.js
  var ru = {
    "brandName": "ClarifAI",
    "checking": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430...",
    "connectedBadge": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    "offlineBadge": "\u041E\u0444\u043B\u0430\u0439\u043D",
    "modelLoading": "\u041C\u043E\u0434\u0435\u043B\u044C: \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",
    "modelPrefix": "\u041C\u043E\u0434\u0435\u043B\u044C: ",
    "summarizeBtn": "\u2728 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443",
    "collapse": "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
    "expand": "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
    "providerLabel": "\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0418\u0418:",
    "groupLocal": "\u{1F3E0} \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 (\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E & \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u043E)",
    "groupFast": "\u26A1 \u0411\u044B\u0441\u0442\u0440\u044B\u0439 / \u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u043E\u0431\u043B\u0430\u0447\u043D\u044B\u0439 \u0438\u043D\u0444\u0435\u0440\u0435\u043D\u0441",
    "groupCloud": "\u2601\uFE0F \u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u043E\u0431\u043B\u0430\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B",
    "serverLabel": "\u0421\u0435\u0440\u0432\u0435\u0440:",
    "serverLabelLm": "\u0421\u0435\u0440\u0432\u0435\u0440 LM Studio:",
    "serverLabelOllama": "\u0421\u0435\u0440\u0432\u0435\u0440 Ollama:",
    "noModelSelected": "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430",
    "keyOk": "\u041A\u043B\u044E\u0447 OK",
    "keySaved": "\u041A\u043B\u044E\u0447 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D",
    "invalidKey": "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447",
    "serverBusy": "\u0421\u0435\u0440\u0432\u0435\u0440 \u0437\u0430\u043D\u044F\u0442 (\u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C)",
    "keyRequired": "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043A\u043B\u044E\u0447",
    "customServer": "\u0414\u0440\u0443\u0433\u043E\u0439 IP...",
    "refreshTooltip": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u043C\u043E\u0434\u0435\u043B\u0435\u0439",
    "toggleKeyVisTooltip": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C / \u0441\u043A\u0440\u044B\u0442\u044C API-\u043A\u043B\u044E\u0447",
    "pasteClipboardHint": "[i] \u0411\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430 \u043F\u0443\u0441\u0442 \u0438\u043B\u0438 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D \u2014 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 Ctrl+V \u0432 \u043F\u043E\u043B\u0435 API-\u043A\u043B\u044E\u0447\u0430.",
    "apiKeyLabel": "\u041A\u043B\u044E\u0447 API:",
    "apiKeyPlaceholder": "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0432\u0430\u0448 API-\u043A\u043B\u044E\u0447...",
    "getApiKeyLink": "\u{1F511} \u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043A\u043B\u044E\u0447",
    "modelLabel": "\u041C\u043E\u0434\u0435\u043B\u044C:",
    "testModelBtn": "\u26A1 \u0422\u0435\u0441\u0442",
    "testModelTooltip": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043C\u043E\u0434\u0435\u043B\u044C",
    "langLabel": "\u042F\u0437\u044B\u043A:",
    "formatLabel": "\u0424\u043E\u0440\u043C\u0430\u0442:",
    "formatStandard": "\u{1F4CC} \u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 & \u0441\u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439",
    "formatQuick": "\u26A1 \u041A\u0440\u0430\u0442\u043A\u0438\u0439 & \u0435\u043C\u043A\u0438\u0439",
    "formatDetailed": "\u{1F4DD} \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 & \u0443\u0433\u043B\u0443\u0431\u043B\u0435\u043D\u043D\u044B\u0439",
    "voiceLabel": "\u0413\u043E\u043B\u043E\u0441:",
    "voiceDefault": "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439 \u0433\u043E\u043B\u043E\u0441...",
    "micLabel": "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D:",
    "micDefault": "\u{1F399}\uFE0F \u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "tabSummary": "\u{1F4C4} \u0421\u0432\u043E\u0434\u043A\u0430 \u0432\u0438\u0434\u0435\u043E",
    "tabChat": "\u{1F4AC} \u0417\u0430\u0434\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u044B",
    "tabTranscript": "\u{1F4DC} \u0422\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044F",
    "summaryTitle": "\u{1F4C4} \u0421\u0432\u043E\u0434\u043A\u0430 \u0432\u0438\u0434\u0435\u043E",
    "listenBtn": "\u{1F50A} \u0421\u043B\u0443\u0448\u0430\u0442\u044C",
    "stopListenBtn": "\u23F9\uFE0F \u0421\u0442\u043E\u043F",
    "copyBtn": "\u{1F4CB} \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "copiedBtn": "\u2705 \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E!",
    "saveMdBtn": "\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C .md",
    "reasoningModel": "\u{1F4AD} \u0420\u0430\u0441\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u044F \u043C\u043E\u0434\u0435\u043B\u0438",
    "reasoningInProgress": "\u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435...",
    "reasoningDone": "\u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
    "emptyTitle": "\u0413\u043E\u0442\u043E\u0432\u044B \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E",
    "emptySubtitle": "\u0418\u0437\u0432\u043B\u0435\u043A\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0442\u0435\u0437\u0438\u0441\u044B, \u0433\u043B\u0430\u0432\u044B \u0438 \u0432\u044B\u0432\u043E\u0434\u044B \u0437\u0430 \u0441\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u0435 \u0441\u0435\u043A\u0443\u043D\u0434\u044B \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0418\u0418.",
    "newVideoTitle": "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E \u043D\u043E\u0432\u043E\u0435 \u0432\u0438\u0434\u0435\u043E",
    "summaryPlaceholder": "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB \u2728 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \xBB, \u0447\u0442\u043E\u0431\u044B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435.",
    "newVideoPlaceholder": "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E \u043D\u043E\u0432\u043E\u0435 \u0432\u0438\u0434\u0435\u043E. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB \u2728 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \xBB.",
    "generatingSummary": "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0441\u0432\u043E\u0434\u043A\u0438...",
    "waitingForModel": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0438 / \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430 ({sec}s)...",
    "streamInterrupted": "\u0421\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u043E \u0434\u043E \u043E\u0442\u0432\u0435\u0442\u0430 \u043C\u043E\u0434\u0435\u043B\u0438. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u043C\u043E\u0434\u0435\u043B\u044C \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u0430 \u043D\u0430 100%, \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443.",
    "chatTitle": "\u{1F4AC} \u0412\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0432\u0435\u0442\u044B \u043F\u043E \u0432\u0438\u0434\u0435\u043E",
    "clearChatBtn": "\u{1F5D1}\uFE0F \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433",
    "suggestions": [
      { "label": "\u{1F4A1} \u0413\u043B\u0430\u0432\u043D\u044B\u0435 \u043C\u044B\u0441\u043B\u0438", "question": "\u041A\u0430\u043A\u043E\u0432\u044B \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0438 \u0438\u0434\u0435\u0438 \u0438\u0437 \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E?" },
      { "label": "\u23F1\uFE0F \u0422\u0430\u0439\u043C\u043A\u043E\u0434\u044B", "question": "\u0412 \u043A\u0430\u043A\u043E\u0439 \u043C\u043E\u043C\u0435\u043D\u0442 \u0432\u0438\u0434\u0435\u043E \u0430\u0432\u0442\u043E\u0440 \u0433\u043E\u0432\u043E\u0440\u0438\u0442 \u043E \u0433\u043B\u0430\u0432\u043D\u043E\u0439 \u0442\u0435\u043C\u0435?" },
      { "label": "\u{1F4CA} \u0424\u0430\u043A\u0442\u044B \u0438 \u0446\u0438\u0444\u0440\u044B", "question": "\u041A\u0430\u043A\u0438\u0435 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u043F\u0440\u0438\u043C\u0435\u0440\u044B, \u0446\u0438\u0444\u0440\u044B \u0438\u043B\u0438 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u0440\u0438\u0432\u043E\u0434\u044F\u0442\u0441\u044F?" },
      { "label": "\u{1F3AF} \u0412\u044B\u0432\u043E\u0434 \u0438 \u0441\u043E\u0432\u0435\u0442\u044B", "question": "\u041A \u043A\u0430\u043A\u043E\u043C\u0443 \u0432\u044B\u0432\u043E\u0434\u0443 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u0430\u0432\u0442\u043E\u0440 \u0438 \u0447\u0442\u043E \u0441\u043E\u0432\u0435\u0442\u0443\u0435\u0442 \u0432 \u043A\u043E\u043D\u0446\u0435?" }
    ],
    "chatWelcome": "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u043C\u043D\u0435 \u043B\u044E\u0431\u043E\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0438 \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E. \u042F \u043E\u043F\u0438\u0440\u0430\u044E\u0441\u044C \u0438\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043D\u0430 \u0435\u0433\u043E \u043F\u043E\u043B\u043D\u0443\u044E \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044E.",
    "chatPlaceholder": "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u0438\u043B\u0438 \u043F\u0440\u043E\u0434\u0438\u043A\u0442\u0443\u0439\u0442\u0435 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D... (Enter \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438)",
    "chatInputListening": "\u{1F399}\uFE0F \u0418\u0434\u0435\u0442 \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0430... \u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D.",
    "chatResetNotice": "\u0414\u0438\u0430\u043B\u043E\u0433 \u0441\u0431\u0440\u043E\u0448\u0435\u043D. \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0438 \u0432\u0438\u0434\u0435\u043E!",
    "micTitle": "\u041F\u0440\u043E\u0434\u0438\u043A\u0442\u043E\u0432\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D",
    "attachTitle": "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u0444\u0430\u0439\u043B (\u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C Ctrl+V)",
    "attachTitleTextOnly": "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439/\u043A\u043E\u0434\u043E\u0432\u044B\u0439 \u0444\u0430\u0439\u043B (\u0434\u043B\u044F \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043D\u0443\u0436\u043D\u0430 \u043C\u0443\u043B\u044C\u0442\u0438\u043C\u043E\u0434\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C)",
    "attachImageNotSupported": "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0443\u043B\u044C\u0442\u0438\u043C\u043E\u0434\u0430\u043B\u044C\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u043B\u044C \u0438\u043B\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0444\u0430\u0439\u043B.",
    "attachTooLarge": "\u0420\u0430\u0437\u043C\u0435\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043B\u0438\u043C\u0438\u0442 8 \u041C\u0411.",
    "webTabSummary": "\u{1F4C4} \u0421\u0432\u043E\u0434\u043A\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
    "webTabAudit": "\u{1F6E1}\uFE0F \u041D\u0430\u0434\u0451\u0436\u043D\u043E\u0441\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
    "webRunAuditBtn": "\u26A1 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443",
    "webTabDomain": "\u{1F310} \u0410\u0443\u0434\u0438\u0442 \u0441\u0430\u0439\u0442\u0430",
    "webDomainAuditTitle": "\u{1F310} \u0410\u0443\u0434\u0438\u0442 \u043D\u0430\u0434\u0451\u0436\u043D\u043E\u0441\u0442\u0438 \u0441\u0430\u0439\u0442\u0430",
    "webRunDomainAuditBtn": "\u26A1 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0430\u0439\u0442",
    "webDepthLabel": "\u0413\u043B\u0443\u0431\u0438\u043D\u0430:",
    "webDepthLevelUnit": "\u0443\u0440.",
    "webExtractedTitle": "\u{1F4DC} \u0418\u0437\u0432\u043B\u0435\u0447\u0451\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0438 \u0441\u0438\u0433\u043D\u0430\u043B\u044B URL",
    "webSummarizeBtn": "\u2728 \u0420\u0435\u0437\u044E\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443",
    "webReliabilityLabel": "\u0418\u043D\u0434\u0435\u043A\u0441 \u043D\u0430\u0434\u0451\u0436\u043D\u043E\u0441\u0442\u0438",
    "webTileConn": "\u0421\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0438 URL",
    "webTileBrand": "\u0417\u0430\u044F\u0432\u043B\u0435\u043D\u043D\u0430\u044F \u043B\u0438\u0447\u043D\u043E\u0441\u0442\u044C",
    "webTileForms": "\u0424\u043E\u0440\u043C\u044B \u0438 \u043F\u043E\u043B\u044F",
    "webTileDom": "\u0426\u0435\u043B\u043E\u0441\u0442\u043D\u043E\u0441\u0442\u044C DOM",
    "webTileSite": "\u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0435\u043C\u044B\u0439 \u0441\u0430\u0439\u0442",
    "webTileLegal": "\u041E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
    "webTileContacts": "\u041E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B",
    "webValHttp": "\u041D\u0435\u0448\u0438\u0444\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 HTTP",
    "webValFormsWarn": "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u0432\u0430\u0436\u043D\u044B\u0435 \u043F\u043E\u043B\u044F",
    "webValFormsOk": "\u041B\u043E\u0432\u0443\u0448\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E",
    "webValDomWarn": "\u041F\u043E\u0434\u043E\u0437\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0441\u0438\u0433\u043D\u0430\u043B\u044B",
    "webValDomOk": "\u0427\u0438\u0441\u0442\u044B\u0439 DOM",
    "webValNoneFound": "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B",
    "webTileStructure": "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0441\u0430\u0439\u0442\u0430",
    "webPagesFound": "\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446: {n}",
    "webNoLegalPages": "\u041D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B",
    "webValStructComplete": "\u041F\u043E\u043B\u043D\u0430\u044F \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430",
    "webValStructPartial": "\u041D\u0435\u043F\u043E\u043B\u043D\u0430\u044F \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430",
    "webValStructMinimal": "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0430\u0439\u0442",
    "webBarLegal": "\u042E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
    "webBarContacts": "\u0421\u043F\u043E\u0441\u043E\u0431\u044B \u0441\u0432\u044F\u0437\u0438",
    "webBarStructure": "\u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u0438 \u0440\u0430\u0437\u0434\u0435\u043B\u044B",
    "webBarHomeInfo": "\u041F\u043E\u043D\u044F\u0442\u043D\u043E\u0441\u0442\u044C \u0433\u043B\u0430\u0432\u043D\u043E\u0439",
    "attachUnsupported": "\u041D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0442\u0438\u043F \u0444\u0430\u0439\u043B\u0430. \u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0435/\u043A\u043E\u0434\u043E\u0432\u044B\u0435 \u0444\u0430\u0439\u043B\u044B.",
    "micStopTitle": "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0443",
    "sendBtn": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u27A4",
    "transcriptTitle": "\u{1F4DC} \u041F\u043E\u043B\u043D\u0430\u044F \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044F",
    "wordsBadge": "\u0441\u043B\u043E\u0432",
    "copyRawBtn": "\u{1F4CB} \u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442",
    "transcriptWaiting": "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F... (\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0441\u044F \u043F\u0440\u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0438 \u0441\u0432\u043E\u0434\u043A\u0438 \u0438\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u0435)",
    "micActiveNotice": "\u{1F399}\uFE0F \u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u044F \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u0430... \u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435.",
    "micBlockedNotice": "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D: \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443 \u0432 Chrome (\u0437\u043D\u0430\u0447\u043E\u043A \u{1F512} \u0441\u043B\u0435\u0432\u0430 \u043E\u0442 URL).",
    "micNoDeviceNotice": "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D \u0438\u043B\u0438 \u0430\u0443\u0434\u0438\u043E\u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.",
    "micNetworkNotice": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438 Google Speech. \u0415\u0441\u043B\u0438 \u0432\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0435 Brave, \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 '\u0421\u043B\u0443\u0436\u0431\u044B Google \u0434\u043B\u044F \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438' \u0432 brave://settings/privacy, \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0449\u0438\u043A/VPN.",
    "micErrorNotice": "\u041E\u0448\u0438\u0431\u043A\u0430 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0430: ",
    "micNotSupportedNotice": "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
    "listenBubbleTitle": "\u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u043E\u0442\u0432\u0435\u0442",
    "noSummaryToRead": "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0441\u0432\u043E\u0434\u043A\u0438 \u0434\u043B\u044F \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u044F.",
    "noTranscriptError": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u043D\u0430 YouTube.",
    "selectModelAlert": "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044C \u0418\u0418 \u043D\u0430 \u043F\u0430\u043D\u0435\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u0432\u044B\u0448\u0435.",
    "missingKeyAlert": "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0430\u0448 API-\u043A\u043B\u044E\u0447 \u0434\u043B\u044F \u043E\u0431\u0449\u0435\u043D\u0438\u044F.",
    "advancedOptions": "\u2699\uFE0F \u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 (\u0418\u0418, \u0410\u0443\u0434\u0438\u043E & \u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F)",
    "settingsBtn": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "errorLabel": "\u041E\u0448\u0438\u0431\u043A\u0430: ",
    "settingsHideBtn": "\u2715 \u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "tabSettingsModel": "\u{1F916} \u041C\u043E\u0434\u0435\u043B\u044C \u0438 \u0421\u0435\u0440\u0432\u0435\u0440",
    "tabSettingsAudio": "\u{1F399}\uFE0F \u0413\u043E\u043B\u043E\u0441 \u0438 \u0410\u0443\u0434\u0438\u043E",
    "tabSettingsParams": "\u2699\uFE0F \u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0418\u0418",
    "testSttBtn": "\u26A1 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C STT",
    "customPromptPlaceholder": "\u043D\u0430\u043F\u0440.: \u0412\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0434\u0435\u0442\u0430\u043B\u0438, \u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u0442\u044B\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438...",
    "whisperUrlPlaceholder": "\u043D\u0430\u043F\u0440.: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "\u043E\u0442",
    "footerReportBug": "\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C \u043E\u0431 \u043E\u0448\u0438\u0431\u043A\u0435",
    "footerDocs": "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F",
    "tempStrict": "0.0 - \u0422\u043E\u0447\u043D\u044B\u0439 \u0438 \u0441\u0442\u0440\u043E\u0433\u0438\u0439",
    "tempBalanced": "0.3 - \u0421\u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 (\u041F\u043E \u0443\u043C\u043E\u043B\u0447.)",
    "tempCreative": "0.7 - \u0422\u0432\u043E\u0440\u0447\u0435\u0441\u043A\u0438\u0439 \u0438 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439",
    "tempWild": "1.0 - \u041E\u0447\u0435\u043D\u044C \u0438\u0437\u043E\u0431\u0440\u0435\u0442\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439",
    "tokensAuto": "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 (\u041F\u043E \u0443\u043C\u043E\u043B\u0447.)",
    "tokensShort": "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 (1 024)",
    "tokensStandard": "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 (2 048)",
    "tokensDetailed": "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 (4 096)",
    "tokensMax": "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C (8 192)",
    "localContextLabel": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 (0 = \u0410\u0432\u0442\u043E \u2192 1M):",
    "ctxAuto": "0 \u2014 \u0410\u0432\u0442\u043E (\u041F\u043E \u0443\u043C\u043E\u043B\u0447.)",
    "ctxServerDefault": "{ctx} \u0442\u043E\u043A\u0435\u043D\u043E\u0432 (\u041F\u043E \u0443\u043C\u043E\u043B\u0447. {provider})",
    "ctxFixedCloud": "\u0424\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E (\u041E\u0431\u043B\u0430\u0447\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C)",
    "ctxFixedServer": "\u041D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E (API \u0441\u0435\u0440\u0432\u0435\u0440\u0430)",
    "applyContextBtn": "\u26A1 \u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C",
    "applyContextTooltip": "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C \u0441 \u044D\u0442\u0438\u043C \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430",
    "contextAppliedMsg": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u043D\u0430 {ctx} \u0442\u043E\u043A\u0435\u043D\u043E\u0432 (\u0433\u043E\u0442\u043E\u0432)",
    "contextOllamaHint": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 Ollama \u0437\u0430\u0434\u0430\u043D ({ctx} \u0442\u043E\u043A\u0435\u043D\u043E\u0432, \u043F\u0440\u0438 \u0441\u043B\u0435\u0434. \u0437\u0430\u043F\u0440\u043E\u0441\u0435)",
    "speedSlow": "0.75x (\u0421\u043F\u043E\u043A\u043E\u0439\u043D\u043E)",
    "speedNormal": "1.0x (\u041E\u0431\u044B\u0447\u043D\u043E)",
    "speedFast": "1.25x (\u0411\u044B\u0441\u0442\u0440\u043E)",
    "speedVeryFast": "1.5x (\u0423\u0441\u043A\u043E\u0440\u0435\u043D\u043E)",
    "speedDouble": "2.0x (\u0414\u0432\u043E\u0439\u043D\u0430\u044F)",
    "tempLabel": "\u041A\u0440\u0435\u0430\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0418\u0418 (\u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430):",
    "maxTokensLabel": "\u041C\u0430\u043A\u0441. \u0434\u043B\u0438\u043D\u0430 (\u0422\u043E\u043A\u0435\u043D\u044B):",
    "ttsSpeedLabel": "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0440\u0435\u0447\u0438:",
    "whisperUrlLabel": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0435\u0440 Whisper (Audio STT):",
    "autoSummarizeLabel": "\u26A1 \u0410\u0432\u0442\u043E-\u0441\u0430\u043C\u043C\u0430\u0440\u0438 \u043F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u0432\u0438\u0434\u0435\u043E",
    "customPromptLabel": "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u0434\u043B\u044F \u0418\u0418:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} \u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u25BE",
    "modelReady": '\u041C\u043E\u0434\u0435\u043B\u044C "{model}" \u0433\u043E\u0442\u043E\u0432\u0430 ({latency}\u043C\u0441)!',
    "connectionFailed": "\u0421\u0431\u043E\u0439: {error}",
    "connectionError": "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F",
    "whisperReady": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 Whisper STT \u0433\u043E\u0442\u043E\u0432 ({latency}\u043C\u0441)!",
    "whisperFailed": "\u0421\u0431\u043E\u0439 Whisper STT: {error}",
    "whisperKeyRequired": "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043A\u043B\u044E\u0447 API \u0434\u043B\u044F \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u0438 Whisper.",
    "whisperRecording": "\u{1F399}\uFE0F \u0417\u0430\u043F\u0438\u0441\u044C Whisper (\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D)...",
    "whisperTranscribing": "\u23F3 \u0422\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u044F \u0430\u0443\u0434\u0438\u043E \u0447\u0435\u0440\u0435\u0437 Whisper...",
    "whisperNoAudio": "\u0410\u0443\u0434\u0438\u043E \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D.",
    "micAccessError": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443",
    "braveMicNotice": "\u0412 Brave Browser \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043D\u0430 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B.",
    "chapterBadge": "(\u0413\u043B\u0430\u0432\u044B)",
    "transcriptExtracted": "\u0422\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0442 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D",
    "modelResponsive": "\u041E\u0442\u0437\u044B\u0432\u0447\u0438\u0432\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C: {model}",
    "extractingTranscriptNotice": "\u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u0438 \u0432\u0438\u0434\u0435\u043E...",
    "fetchingExternalTranscriptNotice": "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u043E\u0432 \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u0432\u0438\u0434\u0435\u043E ({videoId})...",
    "analyzingChannelNotice": "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0434\u043E\u0441\u044C\u0435 \u043A\u0430\u043D\u0430\u043B\u0430 {query}...",
    "fetchingCommentsNotice": "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0445 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432 \u0438 \u0440\u0435\u0430\u043A\u0446\u0438\u0439 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438...",
    "externalTranscriptError": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0438\u043B\u0438 \u0433\u043B\u0430\u0432\u044B \u0434\u043B\u044F \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u0432\u0438\u0434\u0435\u043E ({videoId}). \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B: \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0438\u043B\u0438 \u0433\u043B\u0430\u0432\u044B \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442, \u043B\u0438\u0431\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F YouTube.",
    "retryBtn": "\u{1F504} \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F \u041A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0430\u0443\u0434\u0438\u0442, \u043B\u043E\u0433\u0438\u043A\u0430 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0444\u0430\u043A\u0442\u043E\u0432",
    "runAuditBtn": "\u26A1 \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442",
    "relaunchAuditBtn": "\u26A1 \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442",
    "auditInProgress": "\u0410\u0443\u0434\u0438\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F...",
    "auditStarting": "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0434\u043E\u0441\u044C\u0435 \u0430\u0443\u0434\u0438\u0442\u0430...",
    "auditAnalyzing": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u043F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0438 \u0444\u0430\u043A\u0442\u043E\u0432...",
    "auditPlaceholder": "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u26A1 \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442\xBB \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043B\u043E\u0433\u0438\u043A\u0438 \u0438 \u0444\u0430\u043A\u0442\u043E\u0432.",
    "discussInChatBtn": "\u{1F4AC} \u041E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0432 \u0447\u0430\u0442\u0435",
    "auditChannelBtn": "\u{1F50D} \u0410\u0443\u0434\u0438\u0442 \u043A\u0430\u043D\u0430\u043B\u0430",
    "channelAuditTitle": "\u{1F4CA} \u041E\u0431\u0449\u0438\u0439 \u0430\u0443\u0434\u0438\u0442 \u043A\u0430\u043D\u0430\u043B\u0430",
    "channelSampleInfo": "\u0412\u0437\u0432\u0435\u0448\u0435\u043D\u043D\u0430\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0432\u044B\u0431\u043E\u0440\u043A\u0430",
    "periodFilterLabel": "\u041F\u0435\u0440\u0438\u043E\u0434 \u0430\u043D\u0430\u043B\u0438\u0437\u0430:",
    "periodAll": "\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F",
    "periodMonth": "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043C\u0435\u0441\u044F\u0446",
    "periodYear": "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0433\u043E\u0434",
    "period6Months": "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432",
    "subtabAuditVideo": "\u{1F3A5} \u0410\u0443\u0434\u0438\u0442 \u0432\u0438\u0434\u0435\u043E",
    "subtabAuditChannel": "\u{1F4CA} \u0410\u0443\u0434\u0438\u0442 \u043A\u0430\u043D\u0430\u043B\u0430",
    "runChannelAuditBtn": "\u26A1 \u0410\u0443\u0434\u0438\u0442 \u043A\u0430\u043D\u0430\u043B\u0430",
    "channelCompanionDesc": "\u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u043E\u043D\u043D\u043E\u0439 \u0447\u0435\u0441\u0442\u043D\u043E\u0441\u0442\u0438, \u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u043E\u0441\u0442\u0438 \u0441\u043F\u043E\u043D\u0441\u043E\u0440\u043E\u0432 \u0438 \u0442\u0440\u0430\u0435\u043A\u0442\u043E\u0440\u0438\u0438 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u044F \u043A\u0430\u043D\u0430\u043B\u0430.",
    "tabChannelAudit": "\u{1F4CA} \u0410\u0443\u0434\u0438\u0442 \u043A\u0430\u043D\u0430\u043B\u0430",
    "channelChatTitle": "\u{1F4AC} \u0412\u043E\u043F\u0440\u043E\u0441\u044B \u043F\u043E \u043A\u0430\u043D\u0430\u043B\u0443",
    "channelChatWelcome": "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u043E\u0431 \u044D\u0442\u043E\u043C \u043A\u0430\u043D\u0430\u043B\u0435 (\u0440\u0435\u0434\u0430\u043A\u0446\u0438\u043E\u043D\u043D\u0430\u044F \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0430, \u0432\u0438\u0434\u0435\u043E, \u0440\u0435\u043A\u043B\u0430\u043C\u0430, \u044D\u0432\u043E\u043B\u044E\u0446\u0438\u044F).",
    "channelChatPlaceholder": "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u043E \u043A\u0430\u043D\u0430\u043B\u0435 \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0432\u0438\u0434\u0435\u043E...",
    "channelChatResetNotice": "\u0427\u0430\u0442 \u043A\u0430\u043D\u0430\u043B\u0430 \u0441\u0431\u0440\u043E\u0448\u0435\u043D. \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u043D\u0438\u0436\u0435!",
    "channelChatSuggestions": [
      { "label": "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0430", "question": "\u041A\u0430\u043A\u043E\u0432\u0430 \u043E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u043E\u043D\u043D\u0430\u044F \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u0438 \u044D\u0432\u043E\u043B\u044E\u0446\u0438\u044F \u044D\u0442\u043E\u0433\u043E \u043A\u0430\u043D\u0430\u043B\u0430?" },
      { "label": "\u0422\u0435\u043C\u044B \u0438 \u0444\u043E\u0440\u043C\u0430\u0442\u044B", "question": "\u041A\u0430\u043A\u0438\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0442\u0435\u043C\u044B \u0438 \u0440\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u044B\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u044E\u0442\u0441\u044F \u0432 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0445 \u0432\u0438\u0434\u0435\u043E?" },
      { "label": "\u0420\u0435\u043A\u043B\u0430\u043C\u0430", "question": "\u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0437\u0430\u0442\u044C \u043E \u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u043E\u0441\u0442\u0438 \u0441\u043F\u043E\u043D\u0441\u043E\u0440\u0441\u043A\u0438\u0445 \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0439?" },
      { "label": "\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B", "question": "\u041A\u0430\u043A\u043E\u0432\u044B \u0433\u043B\u0430\u0432\u043D\u044B\u0435 \u0441\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u044D\u0442\u043E\u0433\u043E \u043A\u0430\u043D\u0430\u043B\u0430?" }
    ],
    "maxVideosLabel": "\u041C\u0430\u043A\u0441. \u0432\u0438\u0434\u0435\u043E:",
    "stopAuditBtn": "\u23F9 \u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442",
    "stopShortBtn": "\u0421\u0442\u043E\u043F",
    "auditStoppedNote": "\u23F9 \u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C.",
    "channelAuditPlaceholder": "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u26A1 \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442 \u043A\u0430\u043D\u0430\u043B\u0430\xBB \u0432\u044B\u0448\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0446\u0435\u043D\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u043A\u0430\u043D\u0430\u043B.",
    "channelSampleBadge": "\u0412\u044B\u0431\u043E\u0440\u043A\u0430:",
    "channelVideosUnit": "\u0432\u0438\u0434\u0435\u043E",
    "channelAnalyzedVideosUnit": "\u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0432\u0438\u0434\u0435\u043E",
    "channelRecentHistoricMix": "\u0412\u0435\u0441 ~65% \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0445 \u0438 ~35% \u0430\u0440\u0445\u0438\u0432\u043D\u044B\u0445",
    "channelSubscribersUnit": "\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u043E\u0432",
    "channelEvolutionTitle": "\u{1F4C8} \u0420\u0435\u0434\u0430\u043A\u0446\u0438\u043E\u043D\u043D\u0430\u044F \u044D\u0432\u043E\u043B\u044E\u0446\u0438\u044F \u0438 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E",
    "channelStrengthsTitle": "\u2713 \u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B (\u0427\u0442\u043E \u0445\u043E\u0440\u043E\u0448\u043E)",
    "channelWeaknessesTitle": "! \u041D\u0430 \u0447\u0442\u043E \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u044C \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 (\u0421\u043B\u0430\u0431\u043E\u0441\u0442\u0438)",
    "channelDrawbacksTitle": "\u2715 \u041F\u043E\u0434\u0432\u043E\u0434\u043D\u044B\u0435 \u043A\u0430\u043C\u043D\u0438 \u0438 \u0440\u0438\u0441\u043A\u0438",
    "channelSampleVideosTitle": "\u{1F3AC} \u0420\u0430\u0437\u0431\u043E\u0440 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0432\u0438\u0434\u0435\u043E",
    "channelSynthesisTitle": "\u{1F4CB} \u041E\u0431\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435",
    "copyAuditBtn": "\u{1F4CB} \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u0447\u0435\u0442",
    "channelSensationalismLabel": "\u0418\u043D\u0434\u0435\u043A\u0441 \u0441\u0435\u043D\u0441\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0441\u0442\u0438",
    "channelDistributionLabel": "\u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u043F\u043E \u0448\u0430\u0433\u0443 5%",
    "channelMedianLabel": "\u041C\u0435\u0434\u0438\u0430\u043D\u0430:",
    "channelHomogeneousLine": "\u041E\u0447\u0435\u043D\u044C \u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u0430\u044F \u043F\u043E\u0434\u0430\u0447\u0430",
    "channelModerateVarLine": "\u0423\u043C\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0440\u0430\u0437\u0431\u0440\u043E\u0441",
    "channelVolatileLine": "\u041D\u0435\u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u0430\u044F \u043F\u043E\u0434\u0430\u0447\u0430",
    "channelIntegrityProportion": "\u0414\u043E\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u043E\u043D\u043D\u043E\u0439 \u0434\u043E\u0431\u0440\u043E\u0441\u043E\u0432\u0435\u0441\u0442\u043D\u043E\u0441\u0442\u0438",
    "channelBucketReliable": "\u041D\u0430\u0434\u0435\u0436\u043D\u043E (\u226575)",
    "channelBucketModerate": "\u0421\u0440\u0435\u0434\u043D\u0435 (50-74)",
    "channelBucketRisk": "\u0420\u0438\u0441\u043A (<50)",
    "channelClickbaitLow": "\u0421\u0434\u0435\u0440\u0436\u0430\u043D\u043D\u043E \u0438 \u043F\u043E \u0444\u0430\u043A\u0442\u0430\u043C",
    "channelClickbaitMod": "\u0423\u043C\u0435\u0440\u0435\u043D\u043D\u043E",
    "channelClickbaitHigh": "\u0421\u0435\u043D\u0441\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0441\u0442\u044C / \u041A\u043B\u0438\u043A\u0431\u0435\u0439\u0442",
    "channelVideoScorePrefix": "\u041D\u0430\u0434\u0435\u0436\u043D\u043E\u0441\u0442\u044C",
    "channelNoStrengths": "\u0417\u043D\u0430\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0441\u0438\u043B\u044C\u043D\u044B\u0445 \u0441\u0442\u043E\u0440\u043E\u043D \u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E.",
    "channelNoWeaknesses": "\u0421\u0435\u0440\u044C\u0435\u0437\u043D\u044B\u0445 \u0441\u043B\u0430\u0431\u043E\u0441\u0442\u0435\u0439 \u043D\u0435 \u0432\u044B\u044F\u0432\u043B\u0435\u043D\u043E.",
    "channelNoDrawbacks": "\u0421\u0435\u0440\u044C\u0435\u0437\u043D\u044B\u0445 \u0440\u0438\u0441\u043A\u043E\u0432 \u043D\u0435 \u0432\u044B\u044F\u0432\u043B\u0435\u043D\u043E.",
    "pasteBtn": "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C",
    "pasteTooltip": "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0438\u0437 \u0431\u0443\u0444\u0435\u0440\u0430 \u043E\u0431\u043C\u0435\u043D\u0430",
    "chapterOnlyNotice": "YouTube \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u0438\u043B \u043F\u043E\u043B\u043D\u044B\u0435 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B. \u0423\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0433\u043B\u0430\u0432\u044B.",
    "forceRetryBtn": "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
    "extractingLabel": "\u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u043E\u0432...",
    "auditErrorPrefix": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0443\u0434\u0438\u0442\u0430:",
    "channelVideosLongBadge": "\u0412\u0438\u0434\u0435\u043E",
    "channelShortsBadge": "Short",
    "channelFormatMixTitle": "\u26A1 \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435: \u0414\u043B\u0438\u043D\u043D\u044B\u0435 \u0432\u0438\u0434\u0435\u043E \u0438 Shorts",
    "channelFormatVideosLabel": "\u0414\u043B\u0438\u043D\u043D\u044B\u0435 \u0432\u0438\u0434\u0435\u043E",
    "channelFormatShortsLabel": "Shorts",
    "channelFormatAvgScore": "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B",
    "channelFormatAvgClickbait": "\u0421\u0435\u043D\u0441\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0441\u0442\u044C",
    "webBusyBtn": "\u23F3 \u0410\u043D\u0430\u043B\u0438\u0437...",
    "webReasoningWait": "\u{1F4AD} \u041C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0441\u0441\u0443\u0436\u0434\u0430\u0435\u0442...",
    "webEmptyAiResponse": "\u041C\u043E\u0434\u0435\u043B\u044C \u0418\u0418 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0442\u0435\u043A\u0441\u0442 \u0430\u043D\u0430\u043B\u0438\u0437\u0430 (\u043F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 \u0438\u043B\u0438 \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u043D\u043E\u0435 \u0440\u0430\u0441\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u0435). \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044C, \u0434\u043B\u0438\u043D\u0443 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430 \u0438\u043B\u0438 Max Tokens \u0432 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445.",
    "closeExtensionBtn": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0438 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C ClarifAI (\u043C\u043E\u0436\u043D\u043E \u0441\u043D\u043E\u0432\u0430 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0432 \u043E\u043A\u043D\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F)",
    "webCancelBtn": "\u23F9 \u041E\u0442\u043C\u0435\u043D\u0430",
    "chatQueueTitle": "\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 ({count})",
    "chatInProgressLabel": "\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F:",
    "chatEditRecallBtn": "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C / \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C",
    "chatRevertBtn": "\u041E\u0442\u043A\u0430\u0442\u0438\u0442\u044C",
    "chatRevertTitle": "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u044D\u0442\u043E\u043C\u0443 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044E \u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442",
    "chatSendNowBtn": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C",
    "chatRemoveQueueBtn": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u043E\u0447\u0435\u0440\u0435\u0434\u0438",
    "describeAccessibleBtn": "\u{1F441}\uFE0F \u041E\u043F\u0438\u0441\u0430\u0442\u044C (\u0414\u043B\u044F \u0441\u043B\u0430\u0431\u043E\u0432\u0438\u0434\u044F\u0449\u0438\u0445)",
    "describeAccessibleTitle": "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E \u043E\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u0441\u043B\u0430\u0431\u043E\u0432\u0438\u0434\u044F\u0449\u0438\u0445 \u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043E\u0437\u0432\u0443\u0447\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E \u043E\u043F\u0438\u0448\u0438 \u044D\u0442\u0443 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u043D\u0435\u0437\u0440\u044F\u0447\u0435\u0433\u043E \u0438\u043B\u0438 \u0441\u043B\u0430\u0431\u043E\u0432\u0438\u0434\u044F\u0449\u0435\u0433\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 (\u0430\u0443\u0434\u0438\u043E\u0434\u0435\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044F).",
    "speechBarAriaLabel": "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435\u043C \u0440\u0435\u0447\u0438",
    "speechRestartBtn": "\u23EE \u0412 \u043D\u0430\u0447\u0430\u043B\u043E",
    "speechRestartTitle": "\u041D\u0430\u0447\u0430\u0442\u044C \u0447\u0442\u0435\u043D\u0438\u0435 \u0441 \u043D\u0430\u0447\u0430\u043B\u0430",
    "speechPauseBtn": "\u23F8 \u041F\u0430\u0443\u0437\u0430",
    "speechResumeBtn": "\u25B6 \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    "speechStopBtn": "\u23F9 \u0421\u0442\u043E\u043F",
    "speechSeekLabel": "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u044E \u0447\u0442\u0435\u043D\u0438\u044F \u0432 \u0442\u0435\u043A\u0441\u0442\u0435"
  };
  var ru_default = ru;

  // src/locales/ja.js
  var ja = {
    "brandName": "ClarifAI",
    "checking": "\u78BA\u8A8D\u4E2D...",
    "connectedBadge": "\u63A5\u7D9A\u6E08\u307F",
    "offlineBadge": "\u30AA\u30D5\u30E9\u30A4\u30F3",
    "modelLoading": "\u30E2\u30C7\u30EB: \u8AAD\u307F\u8FBC\u307F\u4E2D...",
    "modelPrefix": "\u30E2\u30C7\u30EB: ",
    "summarizeBtn": "\u2728 \u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B",
    "collapse": "\u6298\u308A\u305F\u305F\u3080",
    "expand": "\u5C55\u958B\u3059\u308B",
    "providerLabel": "AI\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC:",
    "groupLocal": "\u{1F3E0} \u30ED\u30FC\u30AB\u30EB\u30E2\u30C7\u30EB (\u7121\u6599 & \u30D7\u30E9\u30A4\u30D9\u30FC\u30C8)",
    "groupFast": "\u26A1 \u9AD8\u901F / \u7121\u6599\u30AF\u30E9\u30A6\u30C9\u63A8\u8AD6",
    "groupCloud": "\u2601\uFE0F \u4E3B\u8981\u30AF\u30E9\u30A6\u30C9\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC",
    "serverLabel": "\u30B5\u30FC\u30D0\u30FC:",
    "serverLabelLm": "LM Studio \u30B5\u30FC\u30D0\u30FC:",
    "serverLabelOllama": "Ollama \u30B5\u30FC\u30D0\u30FC:",
    "noModelSelected": "\u30E2\u30C7\u30EB\u304C\u9078\u629E\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    "keyOk": "\u30AD\u30FC OK",
    "keySaved": "\u30AD\u30FC\u304C\u4FDD\u5B58\u3055\u308C\u307E\u3057\u305F",
    "invalidKey": "\u7121\u52B9\u306A\u30AD\u30FC",
    "serverBusy": "\u30B5\u30FC\u30D0\u30FC\u6DF7\u96D1\uFF08\u518D\u8A66\u884C\uFF09",
    "keyRequired": "\u30AD\u30FC\u304C\u5FC5\u8981",
    "customServer": "\u30AB\u30B9\u30BF\u30E0IP...",
    "refreshTooltip": "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u66F4\u65B0",
    "toggleKeyVisTooltip": "API\u30AD\u30FC\u3092\u8868\u793A / \u975E\u8868\u793A",
    "pasteClipboardHint": "[i] \u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u304C\u7A7A\u307E\u305F\u306F\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059 \u2014 API\u30AD\u30FC\u6B04\u306B Ctrl+V \u3067\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002",
    "apiKeyLabel": "API\u30AD\u30FC:",
    "apiKeyPlaceholder": "API\u30AD\u30FC\u3092\u8CBC\u308A\u4ED8\u3051...",
    "getApiKeyLink": "\u{1F511} API\u30AD\u30FC\u3092\u53D6\u5F97",
    "modelLabel": "\u30E2\u30C7\u30EB:",
    "testModelBtn": "\u26A1 \u30C6\u30B9\u30C8",
    "testModelTooltip": "\u63A5\u7D9A\u3068\u30E2\u30C7\u30EB\u3092\u30C6\u30B9\u30C8",
    "langLabel": "\u8A00\u8A9E:",
    "formatLabel": "\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8:",
    "formatStandard": "\u{1F4CC} \u81EA\u7136\u3067\u30D0\u30E9\u30F3\u30B9\u306E\u826F\u3044\u69CB\u6210",
    "formatQuick": "\u26A1 \u7C21\u6F54\u30FB\u8981\u70B9\u91CD\u8996",
    "formatDetailed": "\u{1F4DD} \u8A73\u7D30\u30FB\u5FB9\u5E95\u89E3\u8AAC",
    "voiceLabel": "\u97F3\u58F0:",
    "voiceDefault": "\u30B7\u30B9\u30C6\u30E0\u97F3\u58F0...",
    "micLabel": "\u30DE\u30A4\u30AF:",
    "micDefault": "\u{1F399}\uFE0F \u30C7\u30D5\u30A9\u30EB\u30C8\u30DE\u30A4\u30AF",
    "tabSummary": "\u{1F4C4} \u52D5\u753B\u306E\u8981\u7D04",
    "tabChat": "\u{1F4AC} \u8CEA\u554F\u3059\u308B",
    "tabTranscript": "\u{1F4DC} \u6587\u5B57\u8D77\u3053\u3057",
    "summaryTitle": "\u{1F4C4} \u52D5\u753B\u306E\u8981\u7D04",
    "listenBtn": "\u{1F50A} \u97F3\u58F0\u518D\u751F",
    "stopListenBtn": "\u23F9\uFE0F \u505C\u6B62",
    "copyBtn": "\u{1F4CB} \u30B3\u30D4\u30FC",
    "copiedBtn": "\u2705 \u30B3\u30D4\u30FC\u5B8C\u4E86\uFF01",
    "saveMdBtn": "\u{1F4BE} .md \u4FDD\u5B58",
    "reasoningModel": "\u{1F4AD} \u30E2\u30C7\u30EB\u306E\u601D\u8003\u30D7\u30ED\u30BB\u30B9",
    "reasoningInProgress": "\u601D\u8003\u4E2D...",
    "reasoningDone": "\u5B8C\u4E86",
    "emptyTitle": "\u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B\u6E96\u5099\u304C\u6574\u3044\u307E\u3057\u305F",
    "emptySubtitle": "AI\u3092\u4F7F\u3063\u3066\u91CD\u8981\u306A\u30DD\u30A4\u30F3\u30C8\u3001\u30C1\u30E3\u30D7\u30BF\u30FC\u3001\u8981\u70B9\u3092\u6570\u79D2\u3067\u62BD\u51FA\u3057\u307E\u3059\u3002",
    "newVideoTitle": "\u65B0\u3057\u3044\u52D5\u753B\u304C\u691C\u51FA\u3055\u308C\u307E\u3057\u305F",
    "summaryPlaceholder": "\u300C \u2728 \u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B \u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8981\u7D04\u3092\u751F\u6210\u3057\u307E\u3059\u3002",
    "newVideoPlaceholder": "\u65B0\u3057\u3044\u52D5\u753B\u304C\u691C\u51FA\u3055\u308C\u307E\u3057\u305F\u3002\u300C \u2728 \u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B \u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "generatingSummary": "\u8981\u7D04\u3092\u751F\u6210\u4E2D...",
    "waitingForModel": "\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D / \u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u6E96\u5099\u4E2D ({sec}s)...",
    "streamInterrupted": "\u30E2\u30C7\u30EB\u306E\u5FDC\u7B54\u524D\u306B\u63A5\u7D9A\u304C\u4E2D\u65AD\u3055\u308C\u307E\u3057\u305F\u3002\u30E2\u30C7\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u5B8C\u4E86\u3092\u78BA\u8A8D\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "chatTitle": "\u{1F4AC} \u52D5\u753B\u306B\u3064\u3044\u3066\u306EQ&A",
    "clearChatBtn": "\u{1F5D1}\uFE0F \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u3092\u6D88\u53BB",
    "suggestions": [
      { "label": "\u{1F4A1} \u8981\u70B9\u307E\u3068\u3081", "question": "\u3053\u306E\u52D5\u753B\u306E\u6700\u3082\u91CD\u8981\u306A\u30AD\u30FC\u30DD\u30A4\u30F3\u30C8\u306F\u4F55\u3067\u3059\u304B\uFF1F" },
      { "label": "\u23F1\uFE0F \u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7", "question": "\u52D5\u753B\u306E\u3069\u306E\u90E8\u5206\u3067\u30E1\u30A4\u30F3\u30C6\u30FC\u30DE\u306B\u3064\u3044\u3066\u8A71\u3057\u3066\u3044\u307E\u3059\u304B\uFF1F" },
      { "label": "\u{1F4CA} \u30C7\u30FC\u30BF\u3068\u5177\u4F53\u4F8B", "question": "\u5177\u4F53\u7684\u306B\u3069\u306E\u3088\u3046\u306A\u30C7\u30FC\u30BF\u3001\u4E8B\u4F8B\u3001\u8AD6\u62E0\u304C\u6319\u3052\u3089\u308C\u3066\u3044\u307E\u3059\u304B\uFF1F" },
      { "label": "\u{1F3AF} \u7D50\u8AD6\u3068\u30A2\u30C9\u30D0\u30A4\u30B9", "question": "\u52D5\u753B\u306E\u6700\u5F8C\u3067\u8457\u8005\u306F\u3069\u306E\u3088\u3046\u306A\u7D50\u8AD6\u3084\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u8FF0\u3079\u3066\u3044\u307E\u3059\u304B\uFF1F" }
    ],
    "chatWelcome": "\u3053\u3093\u306B\u3061\u306F\uFF01\u3053\u306E\u52D5\u753B\u306E\u5185\u5BB9\u306B\u3064\u3044\u3066\u4F55\u3067\u3082\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u52D5\u753B\u5168\u4F53\u306E\u6587\u5B57\u8D77\u3053\u3057\u306B\u57FA\u3065\u3044\u3066\u56DE\u7B54\u3057\u307E\u3059\u3002",
    "chatPlaceholder": "\u8CEA\u554F\u3092\u5165\u529B\u3059\u308B\u304B\u30DE\u30A4\u30AF\u3067\u97F3\u58F0\u5165\u529B... (Enter\u3067\u9001\u4FE1)",
    "chatInputListening": "\u{1F399}\uFE0F \u97F3\u58F0\u5165\u529B\u4E2D... \u30DE\u30A4\u30AF\u306B\u5411\u304B\u3063\u3066\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "chatResetNotice": "\u4F1A\u8A71\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002\u52D5\u753B\u306E\u5185\u5BB9\u306B\u3064\u3044\u3066\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\uFF01",
    "micTitle": "\u30DE\u30A4\u30AF\u3067\u8CEA\u554F\u3092\u97F3\u58F0\u5165\u529B",
    "attachTitle": "\u753B\u50CF\u307E\u305F\u306F\u30D5\u30A1\u30A4\u30EB\u3092\u6DFB\u4ED8\uFF08\u307E\u305F\u306F Ctrl+V \u3067\u8CBC\u308A\u4ED8\u3051\uFF09",
    "attachTitleTextOnly": "\u30C6\u30AD\u30B9\u30C8/\u30B3\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u3092\u6DFB\u4ED8\uFF08\u753B\u50CF\u306B\u306F\u30DE\u30EB\u30C1\u30E2\u30FC\u30C0\u30EB\u30E2\u30C7\u30EB\u304C\u5FC5\u8981\u3067\u3059\uFF09",
    "attachImageNotSupported": "\u9078\u629E\u4E2D\u306E\u30E2\u30C7\u30EB\u306F\u753B\u50CF\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u30DE\u30EB\u30C1\u30E2\u30FC\u30C0\u30EB\u30E2\u30C7\u30EB\u3092\u9078\u629E\u3059\u308B\u304B\u3001\u30C6\u30AD\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB\u3092\u6DFB\u4ED8\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "attachTooLarge": "\u753B\u50CF\u30B5\u30A4\u30BA\u304C 8 MB \u306E\u4E0A\u9650\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002",
    "webTabSummary": "\u{1F4C4} \u30DA\u30FC\u30B8\u8981\u7D04",
    "webTabAudit": "\u{1F6E1}\uFE0F \u30DA\u30FC\u30B8\u306E\u4FE1\u983C\u6027",
    "webRunAuditBtn": "\u26A1 \u30DA\u30FC\u30B8\u3092\u76E3\u67FB",
    "webTabDomain": "\u{1F310} \u30B5\u30A4\u30C8\u76E3\u67FB",
    "webDomainAuditTitle": "\u{1F310} \u30B5\u30A4\u30C8\u4FE1\u983C\u6027\u76E3\u67FB",
    "webRunDomainAuditBtn": "\u26A1 \u30B5\u30A4\u30C8\u3092\u76E3\u67FB",
    "webDepthLabel": "\u30B9\u30AD\u30E3\u30F3\u6DF1\u5EA6:",
    "webDepthLevelUnit": "\u968E\u5C64",
    "webExtractedTitle": "\u{1F4DC} \u62BD\u51FA\u30C6\u30AD\u30B9\u30C8\u3068URL\u30B7\u30B0\u30CA\u30EB",
    "webSummarizeBtn": "\u2728 \u30DA\u30FC\u30B8\u3092\u8981\u7D04",
    "webReliabilityLabel": "\u4FE1\u983C\u5EA6\u30B9\u30B3\u30A2",
    "webTileConn": "\u63A5\u7D9A\u3068URL",
    "webTileBrand": "\u4E3B\u5F35\u3055\u308C\u305F\u8EAB\u5143",
    "webTileForms": "\u30D5\u30A9\u30FC\u30E0",
    "webTileDom": "DOM\u306E\u6574\u5408\u6027",
    "webTileSite": "\u5206\u6790\u5BFE\u8C61\u30B5\u30A4\u30C8",
    "webTileLegal": "\u516C\u5F0F\u30FB\u6CD5\u7684\u30DA\u30FC\u30B8",
    "webTileContacts": "\u516C\u5F0F\u9023\u7D61\u5148",
    "webValHttp": "\u975E\u6697\u53F7\u5316HTTP",
    "webValFormsWarn": "\u6A5F\u5BC6\u5165\u529B\u3092\u691C\u51FA",
    "webValFormsOk": "\u7F60\u306F\u672A\u691C\u51FA",
    "webValDomWarn": "\u4E0D\u5BE9\u306A\u5146\u5019",
    "webValDomOk": "\u5B89\u5168\u306ADOM",
    "webValNoneFound": "\u9023\u7D61\u5148\u306E\u8A18\u8F09\u306A\u3057",
    "webTileStructure": "\u30B5\u30A4\u30C8\u69CB\u6210",
    "webPagesFound": "{n} \u4EF6\u691C\u51FA",
    "webNoLegalPages": "\u672A\u691C\u51FA",
    "webValStructComplete": "\u69CB\u6210\u304C\u5145\u5B9F",
    "webValStructPartial": "\u4E00\u90E8\u306E\u307F\u69CB\u6210",
    "webValStructMinimal": "\u5358\u4E00\u30DA\u30FC\u30B8 / \u6700\u5C0F\u69CB\u6210",
    "webBarLegal": "\u6CD5\u7684\u60C5\u5831\u30FB\u6982\u8981\u30DA\u30FC\u30B8",
    "webBarContacts": "\u554F\u3044\u5408\u308F\u305B\u624B\u6BB5",
    "webBarStructure": "\u30B5\u30A4\u30C8\u69CB\u6210\u3068\u6848\u5185",
    "webBarHomeInfo": "\u30C8\u30C3\u30D7\u30DA\u30FC\u30B8\u306E\u660E\u78BA\u3055",
    "attachUnsupported": "\u672A\u5BFE\u5FDC\u306E\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059\u3002\u753B\u50CF\u307E\u305F\u306F\u30C6\u30AD\u30B9\u30C8/\u30B3\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u3092\u6DFB\u4ED8\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "micStopTitle": "\u97F3\u58F0\u5165\u529B\u3092\u505C\u6B62",
    "sendBtn": "\u9001\u4FE1 \u27A4",
    "transcriptTitle": "\u{1F4DC} \u5168\u6587\u5B57\u8D77\u3053\u3057",
    "wordsBadge": "\u8A9E",
    "copyRawBtn": "\u{1F4CB} \u30C6\u30AD\u30B9\u30C8\u3092\u30B3\u30D4\u30FC",
    "transcriptWaiting": "\u6587\u5B57\u8D77\u3053\u3057\u3092\u5F85\u6A5F\u4E2D... (\u8981\u7D04\u306E\u958B\u59CB\u307E\u305F\u306F\u8CEA\u554F\u6642\u306B\u53D6\u5F97\u3055\u308C\u307E\u3059)",
    "micActiveNotice": "\u{1F399}\uFE0F \u97F3\u58F0\u5165\u529B\u304C\u6709\u52B9\u3067\u3059... \u304A\u8A71\u3057\u304F\u3060\u3055\u3044\u3002",
    "micBlockedNotice": "\u30DE\u30A4\u30AF\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059: Chrome\u3067\u30DE\u30A4\u30AF\u306E\u4F7F\u7528\u3092\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\uFF08URL\u306E\u5DE6\u5074\u306B\u3042\u308B \u{1F512} \u30A2\u30A4\u30B3\u30F3\uFF09\u3002",
    "micNoDeviceNotice": "\u30DE\u30A4\u30AF\u304C\u691C\u51FA\u3055\u308C\u306A\u3044\u304B\u3001\u30AA\u30FC\u30C7\u30A3\u30AA\u30C7\u30D0\u30A4\u30B9\u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
    "micNetworkNotice": "Google\u97F3\u58F0\u8A8D\u8B58\u306E\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30A8\u30E9\u30FC\u3002Brave\u3092\u3054\u4F7F\u7528\u306E\u5834\u5408\u306F brave://settings/privacy \u3067\u300C\u97F3\u58F0\u8A8D\u8B58\u306BGoogle\u30B5\u30FC\u30D3\u30B9\u3092\u4F7F\u7528\u300D\u3092\u6709\u52B9\u306B\u3059\u308B\u304B\u3001\u5E83\u544A\u30D6\u30ED\u30C3\u30AB\u30FC\u306E\u8A2D\u5B9A\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002",
    "micErrorNotice": "\u30DE\u30A4\u30AF\u30A8\u30E9\u30FC: ",
    "micNotSupportedNotice": "\u304A\u4F7F\u3044\u306E\u30D6\u30E9\u30A6\u30B6\u306F\u97F3\u58F0\u8A8D\u8B58\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093\u3002",
    "listenBubbleTitle": "\u3053\u306E\u56DE\u7B54\u3092\u8AAD\u307F\u4E0A\u3052\u308B",
    "noSummaryToRead": "\u8AAD\u307F\u4E0A\u3052\u308B\u8981\u7D04\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",
    "noTranscriptError": "\u56DE\u7B54\u306B\u5FC5\u8981\u306A\u52D5\u753B\u306E\u6587\u5B57\u8D77\u3053\u3057\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002YouTube\u3067\u5B57\u5E55\u304C\u5229\u7528\u53EF\u80FD\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "selectModelAlert": "\u4E0A\u306E\u8A2D\u5B9A\u30D0\u30FC\u3067AI\u30E2\u30C7\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "missingKeyAlert": "\u30C1\u30E3\u30C3\u30C8\u3092\u5229\u7528\u3059\u308B\u306B\u306FAPI\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "advancedOptions": "\u2699\uFE0F \u8A73\u7D30\u8A2D\u5B9A (AI\u30FB\u97F3\u58F0\u30FB\u81EA\u52D5\u5316)",
    "settingsBtn": "\u8A2D\u5B9A",
    "errorLabel": "\u30A8\u30E9\u30FC: ",
    "settingsHideBtn": "\u2715 \u8A2D\u5B9A\u3092\u9589\u3058\u308B",
    "tabSettingsModel": "\u{1F916} AI\u30E2\u30C7\u30EB & \u30B5\u30FC\u30D0\u30FC",
    "tabSettingsAudio": "\u{1F399}\uFE0F \u97F3\u58F0 & \u30AA\u30FC\u30C7\u30A3\u30AA",
    "tabSettingsParams": "\u2699\uFE0F AI\u30D1\u30E9\u30E1\u30FC\u30BF & \u6307\u793A",
    "testSttBtn": "\u26A1 STT\u30C6\u30B9\u30C8",
    "customPromptPlaceholder": "\u4F8B: \u6280\u8853\u7684\u306A\u8A73\u7D30\u306B\u7126\u70B9\u3092\u5F53\u3066\u3001\u6BD4\u55A9\u3092\u4F7F\u3063\u3066\u8AAC\u660E\u3059\u308B...",
    "whisperUrlPlaceholder": "\u4F8B: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "\u4F5C\u6210\u8005:",
    "footerReportBug": "\u30D0\u30B0\u3092\u5831\u544A",
    "footerDocs": "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8",
    "tempStrict": "0.0 - \u53B3\u683C\u3067\u6B63\u78BA",
    "tempBalanced": "0.3 - \u30D0\u30E9\u30F3\u30B9\u91CD\u8996 (\u63A8\u5968)",
    "tempCreative": "0.7 - \u5275\u9020\u7684\u3067\u8A73\u7D30",
    "tempWild": "1.0 - \u72EC\u5275\u7684",
    "tokensAuto": "\u81EA\u52D5 (\u6A19\u6E96)",
    "tokensShort": "\u77ED\u3044 (1,024\u30C8\u30FC\u30AF\u30F3)",
    "tokensStandard": "\u6A19\u6E96 (2,048\u30C8\u30FC\u30AF\u30F3)",
    "tokensDetailed": "\u8A73\u7D30 (4,096\u30C8\u30FC\u30AF\u30F3)",
    "tokensMax": "\u6700\u5927 (8,192\u30C8\u30FC\u30AF\u30F3)",
    "localContextLabel": "\u30ED\u30FC\u30AB\u30EB\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8 (0 = \u81EA\u52D5 \u2192 1M):",
    "ctxAuto": "0 \u2014 \u81EA\u52D5 (\u30B5\u30FC\u30D0\u30FC\u6A19\u6E96)",
    "ctxServerDefault": "{ctx} \u30C8\u30FC\u30AF\u30F3 ({provider} \u6A19\u6E96)",
    "ctxFixedCloud": "\u56FA\u5B9A (\u30AF\u30E9\u30A6\u30C9\u30E2\u30C7\u30EB\u30FB\u5909\u66F4\u4E0D\u53EF)",
    "ctxFixedServer": "\u5909\u66F4\u4E0D\u53EF (\u30B5\u30FC\u30D0\u30FC\u672A\u5BFE\u5FDC)",
    "applyContextBtn": "\u26A1 \u9069\u7528",
    "applyContextTooltip": "\u3053\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u30B5\u30A4\u30BA\u3067\u30E2\u30C7\u30EB\u3092\u518D\u8AAD\u307F\u8FBC\u307F",
    "contextAppliedMsg": "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u9577\u3092 {ctx} \u30C8\u30FC\u30AF\u30F3\u306B\u8A2D\u5B9A\u3057\u307E\u3057\u305F",
    "contextOllamaHint": "Ollama \u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092 {ctx} \u30C8\u30FC\u30AF\u30F3\u306B\u8A2D\u5B9A\u3057\u307E\u3057\u305F\uFF08\u6B21\u56DE\u5B9F\u884C\u6642\uFF09",
    "speedSlow": "0.75x (\u3086\u3063\u304F\u308A)",
    "speedNormal": "1.0x (\u6A19\u6E96)",
    "speedFast": "1.25x (\u901F\u3044)",
    "speedVeryFast": "1.5x (\u500D\u901F)",
    "speedDouble": "2.0x (2\u500D\u901F)",
    "tempLabel": "AI\u5275\u9020\u6027 (\u6E29\u5EA6):",
    "maxTokensLabel": "\u6700\u5927\u30C8\u30FC\u30AF\u30F3\u6570:",
    "ttsSpeedLabel": "\u97F3\u58F0\u8AAD\u307F\u4E0A\u3052\u901F\u5EA6:",
    "whisperUrlLabel": "\u30ED\u30FC\u30AB\u30EBWhisper\u30B5\u30FC\u30D0\u30FC (\u97F3\u58F0STT):",
    "autoSummarizeLabel": "\u26A1 \u52D5\u753B\u3092\u958B\u3044\u305F\u6642\u306B\u81EA\u52D5\u8981\u7D04",
    "customPromptLabel": "AI\u3078\u306E\u30AB\u30B9\u30BF\u30E0\u6307\u793A (\u4EFB\u610F):",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} \u4FDD\u5B58 \u25BE",
    "modelReady": "\u30E2\u30C7\u30EB\u300C{model}\u300D\u306E\u6E96\u5099\u5B8C\u4E86 ({latency}ms)!",
    "connectionFailed": "\u5931\u6557: {error}",
    "connectionError": "\u63A5\u7D9A\u30A8\u30E9\u30FC",
    "whisperReady": "\u30ED\u30FC\u30AB\u30EBWhisper STT\u306E\u6E96\u5099\u5B8C\u4E86 ({latency}ms)!",
    "whisperFailed": "Whisper STT\u5931\u6557: {error}",
    "whisperKeyRequired": "Whisper\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u306B\u306FAPI\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002",
    "whisperRecording": "\u{1F399}\uFE0F Whisper\u9332\u97F3\u4E2D (\u30DE\u30A4\u30AF)...",
    "whisperTranscribing": "\u23F3 Whisper\u306B\u3088\u308B\u97F3\u58F0\u6587\u5B57\u8D77\u3053\u3057\u4E2D...",
    "whisperNoAudio": "\u97F3\u58F0\u304C\u9332\u97F3\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u30DE\u30A4\u30AF\u306B\u5411\u304B\u3063\u3066\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "micAccessError": "\u30DE\u30A4\u30AF\u306B\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093",
    "braveMicNotice": "Brave\u30D6\u30E9\u30A6\u30B6\u306E\u5834\u5408\u3001\u30DE\u30A4\u30AF\u6A29\u9650\u304C\u8A31\u53EF\u3055\u308C\u3066\u3044\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "chapterBadge": "(\u30C1\u30E3\u30D7\u30BF\u30FC)",
    "transcriptExtracted": "\u6587\u5B57\u8D77\u3053\u3057\u3092\u62BD\u51FA\u3057\u307E\u3057\u305F",
    "modelResponsive": "\u5FDC\u7B54\u30E2\u30C7\u30EB: {model}",
    "extractingTranscriptNotice": "\u52D5\u753B\u306E\u6587\u5B57\u8D77\u3053\u3057\u3092\u62BD\u51FA\u4E2D...",
    "fetchingExternalTranscriptNotice": "\u5916\u90E8\u52D5\u753B\uFF08{videoId}\uFF09\u306E\u5B57\u5E55\u3092\u53D6\u5F97\u4E2D...",
    "analyzingChannelNotice": "{query} \u306E\u516C\u5F0F\u30C1\u30E3\u30F3\u30CD\u30EB\u60C5\u5831\u3092\u53D6\u5F97\u3057\u3066\u3044\u307E\u3059...",
    "fetchingCommentsNotice": "\u4EBA\u6C17\u30B3\u30E1\u30F3\u30C8\u3068\u8996\u8074\u8005\u306E\u53CD\u5FDC\u3092\u53D6\u5F97\u3057\u3066\u3044\u307E\u3059...",
    "externalTranscriptError": "\u5916\u90E8\u52D5\u753B\uFF08{videoId}\uFF09\u306E\u5B57\u5E55\u307E\u305F\u306F\u30C1\u30E3\u30D7\u30BF\u30FC\u3092\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u7406\u7531\uFF1A\u5B57\u5E55\u3084\u30C1\u30E3\u30D7\u30BF\u30FC\u304C\u5B58\u5728\u3057\u306A\u3044\u304B\u3001YouTube\u306E\u30A2\u30AF\u30BB\u30B9\u5236\u9650\u304C\u3042\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002",
    "retryBtn": "\u{1F504} \u518D\u8A66\u884C",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F \u6279\u5224\u7684\u76E3\u67FB\u30FB\u8AD6\u7406\u6027\u3068\u4E8B\u5B9F\u691C\u8A3C",
    "runAuditBtn": "\u26A1 \u76E3\u67FB\u3092\u5B9F\u884C",
    "relaunchAuditBtn": "\u26A1 \u76E3\u67FB\u3092\u518D\u5B9F\u884C",
    "auditInProgress": "\u76E3\u67FB\u3092\u5B9F\u884C\u4E2D...",
    "auditStarting": "\u76E3\u67FB\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u6E96\u5099\u4E2D...",
    "auditAnalyzing": "\u8AD6\u7406\u7684\u4E00\u8CAB\u6027\u3068\u4E8B\u5B9F\u95A2\u4FC2\u3092\u691C\u8A3C\u4E2D...",
    "auditPlaceholder": "\u300C\u26A1 \u76E3\u67FB\u3092\u5B9F\u884C\u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8AD6\u7406\u7684\u59A5\u5F53\u6027\u3068\u4E8B\u5B9F\u3092\u691C\u8A3C\u3057\u307E\u3059\u3002",
    "discussInChatBtn": "\u{1F4AC} \u30C1\u30E3\u30C3\u30C8\u3067\u8B70\u8AD6",
    "auditChannelBtn": "\u{1F50D} \u30C1\u30E3\u30F3\u30CD\u30EB\u3092\u76E3\u67FB",
    "channelAuditTitle": "\u{1F4CA} \u30C1\u30E3\u30F3\u30CD\u30EB\u5168\u4F53\u76E3\u67FB",
    "channelSampleInfo": "\u6642\u9593\u52A0\u91CD\u30B5\u30F3\u30D7\u30EA\u30F3\u30B0",
    "periodFilterLabel": "\u5206\u6790\u671F\u9593:",
    "periodAll": "\u5168\u5C65\u6B74",
    "periodMonth": "\u904E\u53BB1\u304B\u6708",
    "periodYear": "\u4ECA\u5E74",
    "period6Months": "\u904E\u53BB6\u304B\u6708",
    "subtabAuditVideo": "\u{1F3A5} \u52D5\u753B\u306E\u76E3\u67FB",
    "subtabAuditChannel": "\u{1F4CA} \u30C1\u30E3\u30F3\u30CD\u30EB\u306E\u76E3\u67FB",
    "runChannelAuditBtn": "\u26A1 \u30C1\u30E3\u30F3\u30CD\u30EB\u76E3\u67FB\u3092\u5B9F\u884C",
    "channelCompanionDesc": "\u3053\u306E\u30C1\u30E3\u30F3\u30CD\u30EB\u306E\u7DE8\u96C6\u65B9\u91DD\u3001\u30B9\u30DD\u30F3\u30B5\u30FC\u306E\u900F\u660E\u6027\u3001\u304A\u3088\u3073\u8907\u6570\u5E74\u306E\u63A8\u79FB\u3092\u8A55\u4FA1\u3057\u307E\u3059\u3002",
    "tabChannelAudit": "\u{1F4CA} \u30C1\u30E3\u30F3\u30CD\u30EB\u76E3\u67FB",
    "channelChatTitle": "\u{1F4AC} \u30C1\u30E3\u30F3\u30CD\u30EB\u3078\u306E\u8CEA\u554F",
    "channelChatWelcome": "\u3053\u3093\u306B\u3061\u306F\uFF01\u3053\u306E\u30C1\u30E3\u30F3\u30CD\u30EB\uFF08\u7DE8\u96C6\u65B9\u91DD\u3001\u516C\u958B\u52D5\u753B\u3001\u30B9\u30DD\u30F3\u30B5\u30FC\u3001\u63A8\u79FB\uFF09\u306B\u3064\u3044\u3066\u4F55\u3067\u3082\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "channelChatPlaceholder": "\u30C1\u30E3\u30F3\u30CD\u30EB\u306B\u3064\u3044\u3066\u8CEA\u554F\u3059\u308B\u304B\u3001\u52D5\u753B\u30EA\u30F3\u30AF\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044...",
    "channelChatResetNotice": "\u30C1\u30E3\u30C3\u30C8\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002\u4EE5\u4E0B\u306B\u8CEA\u554F\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF01",
    "channelChatSuggestions": [
      { "label": "\u7DE8\u96C6\u65B9\u91DD", "question": "\u3053\u306E\u30C1\u30E3\u30F3\u30CD\u30EB\u306E\u4E3B\u306A\u7DE8\u96C6\u65B9\u91DD\u3068\u63A8\u79FB\u306F\u3069\u3046\u306A\u3063\u3066\u3044\u307E\u3059\u304B\uFF1F" },
      { "label": "\u30C6\u30FC\u30DE\u3068\u5F62\u5F0F", "question": "\u6700\u8FD1\u306E\u52D5\u753B\u306E\u4E3B\u306A\u30C8\u30D4\u30C3\u30AF\u3068\u5B9A\u756A\u5F62\u5F0F\u306F\u4F55\u3067\u3059\u304B\uFF1F" },
      { "label": "\u30B9\u30DD\u30F3\u30B5\u30FC\u900F\u660E\u6027", "question": "\u30BF\u30A4\u30A2\u30C3\u30D7\u3084\u30B9\u30DD\u30F3\u30B5\u30FC\u8868\u8A18\u306E\u900F\u660E\u6027\u306B\u3064\u3044\u3066\u4F55\u304C\u8A00\u3048\u307E\u3059\u304B\uFF1F" },
      { "label": "\u5F37\u307F\u3068\u8AB2\u984C", "question": "\u3053\u306E\u30C1\u30E3\u30F3\u30CD\u30EB\u306E\u4E3B\u306A\u5F37\u307F\u3068\u6539\u5584\u70B9\u306F\u4F55\u3067\u3059\u304B\uFF1F" }
    ],
    "maxVideosLabel": "\u6700\u5927\u4EF6\u6570:",
    "stopAuditBtn": "\u23F9 \u76E3\u67FB\u3092\u505C\u6B62",
    "stopShortBtn": "\u505C\u6B62",
    "auditStoppedNote": "\u23F9 \u30E6\u30FC\u30B6\u30FC\u306B\u3088\u3063\u3066\u51E6\u7406\u304C\u505C\u6B62\u3055\u308C\u307E\u3057\u305F\u3002",
    "channelAuditPlaceholder": "\u4E0A\u306E\u300C\u26A1 \u30C1\u30E3\u30F3\u30CD\u30EB\u76E3\u67FB\u3092\u5B9F\u884C\u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8A55\u4FA1\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "channelSampleBadge": "\u30B5\u30F3\u30D7\u30EB:",
    "channelVideosUnit": "\u672C\u306E\u52D5\u753B",
    "channelAnalyzedVideosUnit": "\u672C\u306E\u5206\u6790\u6E08\u307F\u52D5\u753B",
    "channelRecentHistoricMix": "\u76F4\u8FD1\u7D0465%\u30FB\u904E\u53BB\u7D0435%\u306E\u52A0\u91CD\u5206\u6790",
    "channelSubscribersUnit": "\u4EBA\u306E\u767B\u9332\u8005",
    "channelEvolutionTitle": "\u{1F4C8} \u7DE8\u96C6\u65B9\u91DD\u3068\u54C1\u8CEA\u306E\u63A8\u79FB",
    "channelStrengthsTitle": "\u2713 \u512A\u308C\u3066\u3044\u308B\u70B9\uFF08\u5F37\u307F\uFF09",
    "channelWeaknessesTitle": "! \u6CE8\u610F\u3059\u3079\u304D\u70B9\uFF08\u8AB2\u984C\uFF09",
    "channelDrawbacksTitle": "\u2715 \u30EA\u30B9\u30AF\u3068\u6CE8\u610F\u70B9\uFF08\u56DE\u907F\u63A8\u5968\uFF09",
    "channelSampleVideosTitle": "\u{1F3AC} \u5206\u6790\u5BFE\u8C61\u52D5\u753B\u306E\u8A73\u7D30",
    "channelSynthesisTitle": "\u{1F4CB} \u7DCF\u5408\u7DCF\u62EC",
    "copyAuditBtn": "\u{1F4CB} \u8A73\u7D30\u30EC\u30DD\u30FC\u30C8\u3092\u30B3\u30D4\u30FC",
    "channelSensationalismLabel": "\u6247\u60C5\u6027\u6307\u6570",
    "channelDistributionLabel": "5%\u523B\u307F\u306E\u30B9\u30B3\u30A2\u5206\u5E03",
    "channelMedianLabel": "\u4E2D\u592E\u5024:",
    "channelHomogeneousLine": "\u975E\u5E38\u306B\u5B89\u5B9A\u3057\u305F\u54C1\u8CEA",
    "channelModerateVarLine": "\u4E2D\u7A0B\u5EA6\u306E\u3070\u3089\u3064\u304D",
    "channelVolatileLine": "\u5909\u52D5\u304C\u5927\u304D\u3044\u54C1\u8CEA",
    "channelIntegrityProportion": "\u7DE8\u96C6\u8AA0\u5B9F\u6027\u306E\u5272\u5408",
    "channelBucketReliable": "\u4FE1\u983C (\u226575)",
    "channelBucketModerate": "\u4E2D\u7A0B\u5EA6 (50-74)",
    "channelBucketRisk": "\u30EA\u30B9\u30AF (<50)",
    "channelClickbaitLow": "\u6291\u5236\u7684\u30FB\u4E8B\u5B9F\u30D9\u30FC\u30B9",
    "channelClickbaitMod": "\u4E2D\u7A0B\u5EA6",
    "channelClickbaitHigh": "\u6247\u60C5\u7684\u30FB\u91E3\u308A\u30BF\u30A4\u30C8\u30EB\u50BE\u5411",
    "channelVideoScorePrefix": "\u4FE1\u983C\u6027",
    "channelNoStrengths": "\u7279\u7B46\u3059\u3079\u304D\u5F37\u307F\u306F\u5831\u544A\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    "channelNoWeaknesses": "\u5927\u304D\u306A\u5F31\u70B9\u306F\u691C\u51FA\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    "channelNoDrawbacks": "\u91CD\u5927\u306A\u30EA\u30B9\u30AF\u306F\u5831\u544A\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    "pasteBtn": "\u8CBC\u308A\u4ED8\u3051",
    "pasteTooltip": "\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u304B\u3089\u8CBC\u308A\u4ED8\u3051",
    "chapterOnlyNotice": "YouTube\u304B\u3089\u5B8C\u5168\u306A\u5B57\u5E55\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30C1\u30E3\u30D7\u30BF\u30FC\u306E\u307F\u53D6\u5F97\u3055\u308C\u307E\u3057\u305F\u3002",
    "forceRetryBtn": "\u518D\u8A66\u884C",
    "extractingLabel": "\u62BD\u51FA\u4E2D...",
    "auditErrorPrefix": "\u76E3\u67FB\u30A8\u30E9\u30FC:",
    "channelVideosLongBadge": "\u901A\u5E38\u52D5\u753B",
    "channelShortsBadge": "\u30B7\u30E7\u30FC\u30C8",
    "channelFormatMixTitle": "\u26A1 \u901A\u5E38\u52D5\u753B vs \u30B7\u30E7\u30FC\u30C8\u6BD4\u8F03",
    "channelFormatVideosLabel": "\u901A\u5E38\u52D5\u753B",
    "channelFormatShortsLabel": "\u30B7\u30E7\u30FC\u30C8",
    "channelFormatAvgScore": "\u5E73\u5747\u30B9\u30B3\u30A2",
    "channelFormatAvgClickbait": "\u6247\u60C5\u6027",
    "webBusyBtn": "\u23F3 \u5206\u6790\u4E2D...",
    "webReasoningWait": "\u{1F4AD} \u30E2\u30C7\u30EB\u304C\u63A8\u8AD6\u4E2D...",
    "webEmptyAiResponse": "AI\u30E2\u30C7\u30EB\u304B\u3089\u5206\u6790\u30C6\u30AD\u30B9\u30C8\u304C\u8FD4\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\uFF08\u7A7A\u306E\u5FDC\u7B54\u307E\u305F\u306F\u63A8\u8AD6\u306E\u4E2D\u65AD\uFF09\u3002\u8A2D\u5B9A\u3067\u30E2\u30C7\u30EB\u30FB\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u9577\u30FBMax Tokens\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "closeExtensionBtn": "ClarifAI \u3092\u9589\u3058\u3066\u7121\u52B9\u5316\uFF08\u62E1\u5F35\u6A5F\u80FD\u306E\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u304B\u3089\u518D\u6709\u52B9\u5316\u3067\u304D\u307E\u3059\uFF09",
    "webCancelBtn": "\u23F9 \u30AD\u30E3\u30F3\u30BB\u30EB",
    "chatQueueTitle": "\u9001\u4FE1\u5F85\u3061 ({count})",
    "chatInProgressLabel": "\u751F\u6210\u4E2D:",
    "chatEditRecallBtn": "\u7DE8\u96C6 / \u30AD\u30E3\u30F3\u30BB\u30EB",
    "chatRevertBtn": "\u3053\u3053\u307E\u3067\u623B\u3059",
    "chatRevertTitle": "\u3053\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u307E\u3067\u623B\u3057\u3066\u7DE8\u96C6\u3059\u308B",
    "chatSendNowBtn": "\u4ECA\u3059\u3050\u9001\u4FE1",
    "chatRemoveQueueBtn": "\u30AD\u30E5\u30FC\u304B\u3089\u524A\u9664",
    "describeAccessibleBtn": "\u{1F441}\uFE0F \u8996\u899A\u969C\u5BB3\u8005\u5411\u3051\u89E3\u8AAC",
    "describeAccessibleTitle": "\u30DA\u30FC\u30B8\u3068\u753B\u50CF\u3092\u8996\u899A\u969C\u5BB3\u8005\u5411\u3051\u306B\u8A73\u3057\u304F\u89E3\u8AAC\u3057\u3001\u81EA\u52D5\u3067\u97F3\u58F0\u8AAD\u307F\u4E0A\u3052\u3092\u958B\u59CB\u3057\u307E\u3059",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F \u8996\u899A\u306B\u969C\u5BB3\u306E\u3042\u308B\u65B9\u5411\u3051\u306B\u3001\u3053\u306E\u30DA\u30FC\u30B8\u3068\u753B\u50CF\u306E\u5185\u5BB9\u3092\u97F3\u58F0\u89E3\u8AAC\u3068\u3057\u3066\u8A73\u3057\u304F\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "speechBarAriaLabel": "\u97F3\u58F0\u8AAD\u307F\u4E0A\u3052\u30B3\u30F3\u30C8\u30ED\u30FC\u30EB",
    "speechRestartBtn": "\u23EE \u6700\u521D\u304B\u3089",
    "speechRestartTitle": "\u6700\u521D\u304B\u3089\u8AAD\u307F\u4E0A\u3052\u3092\u518D\u958B",
    "speechPauseBtn": "\u23F8 \u4E00\u6642\u505C\u6B62",
    "speechResumeBtn": "\u25B6 \u518D\u958B",
    "speechStopBtn": "\u23F9 \u505C\u6B62",
    "speechSeekLabel": "\u30C6\u30AD\u30B9\u30C8\u5185\u306E\u8AAD\u307F\u4E0A\u3052\u4F4D\u7F6E\u3092\u79FB\u52D5"
  };
  var ja_default = ja;

  // src/locales/zh.js
  var zh = {
    "brandName": "ClarifAI",
    "checking": "\u68C0\u67E5\u4E2D...",
    "connectedBadge": "\u5DF2\u8FDE\u63A5",
    "offlineBadge": "\u79BB\u7EBF",
    "modelLoading": "\u6A21\u578B: \u52A0\u8F7D\u4E2D...",
    "modelPrefix": "\u6A21\u578B: ",
    "summarizeBtn": "\u2728 \u603B\u7ED3\u6B64\u89C6\u9891",
    "collapse": "\u6298\u53E0",
    "expand": "\u5C55\u5F00",
    "providerLabel": "AI \u63D0\u4F9B\u5546:",
    "groupLocal": "\u{1F3E0} \u672C\u5730\u6A21\u578B (\u514D\u8D39 & \u9690\u79C1)",
    "groupFast": "\u26A1 \u5FEB\u901F / \u514D\u8D39\u4E91\u7AEF\u63A8\u7406",
    "groupCloud": "\u2601\uFE0F \u4E3B\u6D41\u4E91\u7AEF\u63D0\u4F9B\u5546",
    "serverLabel": "\u670D\u52A1\u5668:",
    "serverLabelLm": "LM Studio \u670D\u52A1\u5668:",
    "serverLabelOllama": "Ollama \u670D\u52A1\u5668:",
    "noModelSelected": "\u672A\u9009\u62E9\u6A21\u578B",
    "keyOk": "\u5BC6\u94A5\u6B63\u5E38",
    "keySaved": "\u5BC6\u94A5\u5DF2\u4FDD\u5B58",
    "invalidKey": "\u5BC6\u94A5\u65E0\u6548",
    "serverBusy": "\u670D\u52A1\u5668\u7E41\u5FD9\uFF08\u91CD\u8BD5\uFF09",
    "keyRequired": "\u9700\u8981\u5BC6\u94A5",
    "customServer": "\u81EA\u5B9A\u4E49IP...",
    "refreshTooltip": "\u5237\u65B0\u6A21\u578B\u5217\u8868",
    "toggleKeyVisTooltip": "\u663E\u793A / \u9690\u85CF API \u5BC6\u94A5",
    "pasteClipboardHint": "[i] \u526A\u8D34\u677F\u4E3A\u7A7A\u6216\u53D7\u9650 \u2014 \u8BF7\u5728 API \u5BC6\u94A5\u6846\u4E2D\u4F7F\u7528 Ctrl+V \u7C98\u8D34\u3002",
    "apiKeyLabel": "API \u5BC6\u94A5:",
    "apiKeyPlaceholder": "\u7C98\u8D34\u60A8\u7684 API \u5BC6\u94A5...",
    "getApiKeyLink": "\u{1F511} \u83B7\u53D6\u5BC6\u94A5",
    "modelLabel": "\u6A21\u578B:",
    "testModelBtn": "\u26A1 \u6D4B\u8BD5",
    "testModelTooltip": "\u6D4B\u8BD5\u8FDE\u63A5\u4E0E\u6A21\u578B",
    "langLabel": "\u8BED\u8A00:",
    "formatLabel": "\u683C\u5F0F:",
    "formatStandard": "\u{1F4CC} \u81EA\u7136\u5747\u8861",
    "formatQuick": "\u26A1 \u77ED\u5C0F\u7CBE\u70BC",
    "formatDetailed": "\u{1F4DD} \u8BE6\u7EC6\u6DF1\u5165",
    "voiceLabel": "\u8BED\u97F3:",
    "voiceDefault": "\u7CFB\u7EDF\u8BED\u97F3...",
    "micLabel": "\u9EA6\u514B\u98CE:",
    "micDefault": "\u{1F399}\uFE0F \u9ED8\u8BA4\u9EA6\u514B\u98CE",
    "tabSummary": "\u{1F4C4} \u89C6\u9891\u6458\u8981",
    "tabChat": "\u{1F4AC} \u63D0\u95EE\u4E92\u52A8",
    "tabTranscript": "\u{1F4DC} \u9010\u5B57\u7A3F",
    "summaryTitle": "\u{1F4C4} \u89C6\u9891\u6458\u8981",
    "listenBtn": "\u{1F50A} \u6717\u8BFB",
    "stopListenBtn": "\u23F9\uFE0F \u505C\u6B62",
    "copyBtn": "\u{1F4CB} \u590D\u5236",
    "copiedBtn": "\u2705 \u5DF2\u590D\u5236\uFF01",
    "saveMdBtn": "\u{1F4BE} \u4FDD\u5B58 .md",
    "reasoningModel": "\u{1F4AD} \u6A21\u578B\u601D\u8003\u8FC7\u7A0B",
    "reasoningInProgress": "\u601D\u8003\u4E2D...",
    "reasoningDone": "\u5DF2\u5B8C\u6210",
    "emptyTitle": "\u5DF2\u51C6\u5907\u597D\u603B\u7ED3\u6B64\u89C6\u9891",
    "emptySubtitle": "\u4F7F\u7528 AI \u5728\u51E0\u79D2\u5185\u63D0\u53D6\u6838\u5FC3\u8981\u70B9\u3001\u7AE0\u8282\u548C\u5173\u952E\u7ED3\u8BBA\u3002",
    "newVideoTitle": "\u68C0\u6D4B\u5230\u65B0\u89C6\u9891",
    "summaryPlaceholder": "\u70B9\u51FB\u300C \u2728 \u603B\u7ED3\u6B64\u89C6\u9891 \u300D\u4EE5\u751F\u6210\u6458\u8981\u5185\u5BB9\u3002",
    "newVideoPlaceholder": "\u68C0\u6D4B\u5230\u65B0\u89C6\u9891\u3002\u70B9\u51FB\u300C \u2728 \u603B\u7ED3\u6B64\u89C6\u9891 \u300D\u4EE5\u751F\u6210\u6458\u8981\u3002",
    "generatingSummary": "\u6B63\u5728\u751F\u6210\u6458\u8981...",
    "waitingForModel": "\u6B63\u5728\u52A0\u8F7D\u6A21\u578B / \u51C6\u5907\u4E0A\u4E0B\u6587 ({sec}s)...",
    "streamInterrupted": "\u6A21\u578B\u54CD\u5E94\u524D\u8FDE\u63A5\u4E2D\u65AD\u3002\u8BF7\u786E\u8BA4\u6A21\u578B\u5DF2\u5B8C\u5168\u52A0\u8F7D\u540E\u91CD\u8BD5\u3002",
    "chatTitle": "\u{1F4AC} \u89C6\u9891\u95EE\u7B54\u4E92\u52A8",
    "clearChatBtn": "\u{1F5D1}\uFE0F \u6E05\u7A7A\u5BF9\u8BDD",
    "suggestions": [
      { "label": "\u{1F4A1} \u6838\u5FC3\u8981\u70B9", "question": "\u8FD9\u4E2A\u89C6\u9891\u6700\u6838\u5FC3\u7684\u5173\u952E\u7ED3\u8BBA\u662F\u4EC0\u4E48\uFF1F" },
      { "label": "\u23F1\uFE0F \u65F6\u95F4\u7EBF\u5B9A\u4F4D", "question": "\u89C6\u9891\u5728\u54EA\u4E2A\u65F6\u95F4\u70B9\u8C08\u5230\u4E86\u6838\u5FC3\u4E3B\u9898\uFF1F" },
      { "label": "\u{1F4CA} \u5173\u952E\u6570\u636E\u4E0E\u6848\u4F8B", "question": "\u4F5C\u8005\u63D0\u5230\u4E86\u54EA\u4E9B\u5177\u4F53\u6570\u636E\u3001\u6848\u4F8B\u6216\u8BBA\u636E\uFF1F" },
      { "label": "\u{1F3AF} \u7ED3\u8BBA\u4E0E\u5EFA\u8BAE", "question": "\u4F5C\u8005\u5728\u6700\u540E\u7ED9\u51FA\u4E86\u4EC0\u4E48\u603B\u7ED3\u6216\u5B9E\u7528\u5EFA\u8BAE\uFF1F" }
    ],
    "chatWelcome": "\u60A8\u597D\uFF01\u5173\u4E8E\u8FD9\u4E2A\u89C6\u9891\u7684\u4EFB\u4F55\u5185\u5BB9\uFF0C\u6B22\u8FCE\u968F\u65F6\u5411\u6211\u63D0\u95EE\u3002\u6211\u5C06\u5B8C\u5168\u6839\u636E\u89C6\u9891\u7684\u5B8C\u6574\u5B57\u5E55\u9010\u5B57\u7A3F\u4E3A\u60A8\u89E3\u7B54\u3002",
    "chatPlaceholder": "\u8F93\u5165\u95EE\u9898\u6216\u4F7F\u7528\u9EA6\u514B\u98CE\u8BED\u97F3\u8F93\u5165... (\u6309 Enter \u53D1\u9001)",
    "chatInputListening": "\u{1F399}\uFE0F \u6B63\u5728\u8BED\u97F3\u8F93\u5165... \u8BF7\u5BF9\u7740\u9EA6\u514B\u98CE\u8BF4\u8BDD\u3002",
    "chatResetNotice": "\u5BF9\u8BDD\u5DF2\u91CD\u7F6E\u3002\u6B22\u8FCE\u8BE2\u95EE\u5173\u4E8E\u89C6\u9891\u5185\u5BB9\u7684\u4EFB\u4F55\u95EE\u9898\uFF01",
    "micTitle": "\u4F7F\u7528\u9EA6\u514B\u98CE\u8BED\u97F3\u8F93\u5165\u95EE\u9898",
    "attachTitle": "\u9644\u52A0\u56FE\u7247\u6216\u6587\u4EF6\uFF08\u6216 Ctrl+V \u7C98\u8D34\uFF09",
    "attachTitleTextOnly": "\u9644\u52A0\u6587\u672C/\u4EE3\u7801\u6587\u4EF6\uFF08\u56FE\u7247\u9700\u8981\u591A\u6A21\u6001\u6A21\u578B\uFF09",
    "attachImageNotSupported": "\u5F53\u524D\u6240\u9009\u6A21\u578B\u4E0D\u652F\u6301\u56FE\u7247\u3002\u8BF7\u9009\u62E9\u591A\u6A21\u6001\u6A21\u578B\u6216\u9644\u52A0\u6587\u672C\u6587\u4EF6\u3002",
    "attachTooLarge": "\u56FE\u7247\u5927\u5C0F\u8D85\u8FC7 8 MB \u9650\u5236\u3002",
    "webTabSummary": "\u{1F4C4} \u7F51\u9875\u6458\u8981",
    "webTabAudit": "\u{1F6E1}\uFE0F \u9875\u9762\u53EF\u4FE1\u5EA6",
    "webRunAuditBtn": "\u26A1 \u5BA1\u8BA1\u6B64\u9875",
    "webTabDomain": "\u{1F310} \u7F51\u7AD9\u5BA1\u8BA1",
    "webDomainAuditTitle": "\u{1F310} \u7F51\u7AD9\u4E0E\u53EF\u4FE1\u5EA6\u5BA1\u8BA1",
    "webRunDomainAuditBtn": "\u26A1 \u5BA1\u8BA1\u7F51\u7AD9",
    "webDepthLabel": "\u626B\u63CF\u6DF1\u5EA6\uFF1A",
    "webDepthLevelUnit": "\u5C42",
    "webExtractedTitle": "\u{1F4DC} \u63D0\u53D6\u5185\u5BB9\u4E0E URL \u4FE1\u53F7",
    "webSummarizeBtn": "\u2728 \u603B\u7ED3\u6B64\u9875",
    "webReliabilityLabel": "\u53EF\u4FE1\u5EA6\u8BC4\u5206",
    "webTileConn": "\u8FDE\u63A5\u4E0E URL",
    "webTileBrand": "\u58F0\u79F0\u8EAB\u4EFD",
    "webTileForms": "\u8868\u5355\u4E0E\u8F93\u5165",
    "webTileDom": "DOM \u5B8C\u6574\u6027",
    "webTileSite": "\u5DF2\u5206\u6790\u7AD9\u70B9",
    "webTileLegal": "\u6CD5\u5F8B\u4E0E\u5B98\u65B9\u9875\u9762",
    "webTileContacts": "\u5B98\u65B9\u8054\u7CFB\u65B9\u5F0F",
    "webValHttp": "\u672A\u52A0\u5BC6 HTTP",
    "webValFormsWarn": "\u68C0\u6D4B\u5230\u654F\u611F\u8F93\u5165",
    "webValFormsOk": "\u672A\u68C0\u6D4B\u5230\u9677\u9631",
    "webValDomWarn": "\u53EF\u7591\u4FE1\u53F7",
    "webValDomOk": "DOM \u6B63\u5E38",
    "webValNoneFound": "\u672A\u53D1\u73B0\u53EF\u89C1\u8054\u7CFB\u65B9\u5F0F",
    "webTileStructure": "\u7F51\u7AD9\u7ED3\u6784",
    "webPagesFound": "\u53D1\u73B0 {n} \u4E2A\u9875\u9762",
    "webNoLegalPages": "\u672A\u68C0\u6D4B\u5230",
    "webValStructComplete": "\u7ED3\u6784\u5B8C\u6574",
    "webValStructPartial": "\u7ED3\u6784\u4E0D\u5B8C\u6574",
    "webValStructMinimal": "\u5355\u4E00\u9875\u9762 / \u6781\u7B80",
    "webBarLegal": "\u6CD5\u5F8B\u4E0E\u4FE1\u606F\u9875",
    "webBarContacts": "\u8054\u7CFB\u6E20\u9053",
    "webBarStructure": "\u5BFC\u822A\u4E0E\u7F51\u7AD9\u7ED3\u6784",
    "webBarHomeInfo": "\u9996\u9875\u8EAB\u4EFD\u6E05\u6670\u5EA6",
    "attachUnsupported": "\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B\u3002\u8BF7\u9644\u52A0\u56FE\u7247\u6216\u6587\u672C/\u4EE3\u7801\u6587\u4EF6\u3002",
    "micStopTitle": "\u505C\u6B62\u8BED\u97F3\u8F93\u5165",
    "sendBtn": "\u53D1\u9001 \u27A4",
    "transcriptTitle": "\u{1F4DC} \u5B8C\u6574\u9010\u5B57\u7A3F",
    "wordsBadge": "\u5B57",
    "copyRawBtn": "\u{1F4CB} \u590D\u5236\u7EAF\u6587\u672C",
    "transcriptWaiting": "\u7B49\u5F85\u63D0\u53D6\u4E2D... (\u5C06\u5728\u751F\u6210\u6458\u8981\u6216\u63D0\u95EE\u65F6\u81EA\u52A8\u52A0\u8F7D)",
    "micActiveNotice": "\u{1F399}\uFE0F \u8BED\u97F3\u8F93\u5165\u5DF2\u6FC0\u6D3B... \u8BF7\u5F00\u59CB\u8BF4\u8BDD\u3002",
    "micBlockedNotice": "\u9EA6\u514B\u98CE\u5DF2\u88AB\u963B\u6B62\uFF1A\u8BF7\u5728 Chrome \u4E2D\u5141\u8BB8\u9EA6\u514B\u98CE\u6743\u9650\uFF08\u70B9\u51FB\u7F51\u5740\u5DE6\u4FA7\u7684 \u{1F512} \u56FE\u6807\uFF09\u3002",
    "micNoDeviceNotice": "\u672A\u68C0\u6D4B\u5230\u9EA6\u514B\u98CE\u6216\u97F3\u9891\u8BBE\u5907\u4E0D\u53EF\u7528\u3002",
    "micNetworkNotice": "Google \u8BED\u97F3\u670D\u52A1\u7F51\u7EDC\u9519\u8BEF\u3002\u82E5\u4F7F\u7528 Brave \u6D4F\u89C8\u5668\uFF0C\u8BF7\u5728 brave://settings/privacy \u4E2D\u542F\u7528\u201C\u4F7F\u7528 Google \u8BED\u97F3\u8BC6\u522B\u670D\u52A1\u201D\uFF0C\u6216\u68C0\u67E5\u5E7F\u544A\u62E6\u622A\u63D2\u4EF6/VPN\u8BBE\u7F6E\u3002",
    "micErrorNotice": "\u9EA6\u514B\u98CE\u9519\u8BEF: ",
    "micNotSupportedNotice": "\u6B64\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\u529F\u80FD\u3002",
    "listenBubbleTitle": "\u6717\u8BFB\u6B64\u56DE\u7B54",
    "noSummaryToRead": "\u76EE\u524D\u6682\u65E0\u6458\u8981\u53EF\u4F9B\u6717\u8BFB\u3002",
    "noTranscriptError": "\u65E0\u6CD5\u63D0\u53D6\u8BE5\u89C6\u9891\u7684\u9010\u5B57\u7A3F\u4EE5\u56DE\u7B54\u95EE\u9898\u3002\u8BF7\u786E\u4FDD\u8BE5\u89C6\u9891\u5DF2\u5F00\u542F\u5B57\u5E55\u3002",
    "selectModelAlert": "\u8BF7\u5728\u4E0A\u65B9\u8BBE\u7F6E\u680F\u4E2D\u9009\u62E9\u4E00\u4E2A AI \u6A21\u578B\u3002",
    "missingKeyAlert": "\u8BF7\u8F93\u5165\u60A8\u7684 API \u5BC6\u94A5\u4EE5\u5F00\u59CB\u5BF9\u8BDD\u3002",
    "advancedOptions": "\u2699\uFE0F \u9AD8\u7EA7\u9009\u9879 (AI\u3001\u8BED\u97F3\u4E0E\u81EA\u52A8\u5316)",
    "settingsBtn": "\u8BBE\u7F6E",
    "errorLabel": "\u9519\u8BEF: ",
    "settingsHideBtn": "\u2715 \u5173\u95ED\u8BBE\u7F6E",
    "tabSettingsModel": "\u{1F916} AI\u6A21\u578B\u4E0E\u670D\u52A1\u5668",
    "tabSettingsAudio": "\u{1F399}\uFE0F \u8BED\u97F3\u4E0E\u97F3\u9891",
    "tabSettingsParams": "\u2699\uFE0F AI\u53C2\u6570\u4E0E\u6307\u4EE4",
    "testSttBtn": "\u26A1 \u6D4B\u8BD5\u8BED\u97F3\u8BC6\u522B",
    "customPromptPlaceholder": "\u4F8B\u5982\uFF1A\u7740\u91CD\u6280\u672F\u7EC6\u8282\uFF0C\u4F7F\u7528\u6BD4\u55BB\u6DF1\u5165\u6D45\u51FA...",
    "whisperUrlPlaceholder": "\u4F8B\u5982: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "\u4F5C\u8005:",
    "footerReportBug": "\u53CD\u9988\u95EE\u9898",
    "footerDocs": "\u4F7F\u7528\u6587\u6863",
    "tempStrict": "0.0 - \u4E25\u8C28\u7CBE\u51C6",
    "tempBalanced": "0.3 - \u5747\u8861 (\u63A8\u8350\u9ED8\u8BA4)",
    "tempCreative": "0.7 - \u5BCC\u6709\u521B\u610F\u4E14\u8BE6\u5C3D",
    "tempWild": "1.0 - \u6781\u5177\u53D1\u6563\u6027",
    "tokensAuto": "\u81EA\u52A8 (\u9ED8\u8BA4)",
    "tokensShort": "\u7CBE\u7B80 (1,024\u8BCD\u5143)",
    "tokensStandard": "\u6807\u51C6 (2,048\u8BCD\u5143)",
    "tokensDetailed": "\u8BE6\u5C3D (4,096\u8BCD\u5143)",
    "tokensMax": "\u6700\u5927 (8,192\u8BCD\u5143)",
    "localContextLabel": "\u672C\u5730\u4E0A\u4E0B\u6587 (0 = \u81EA\u52A8 \u2192 1M):",
    "ctxAuto": "0 \u2014 \u81EA\u52A8 (\u670D\u52A1\u9ED8\u8BA4)",
    "ctxServerDefault": "{ctx} tokens ({provider} \u9ED8\u8BA4)",
    "ctxFixedCloud": "\u56FA\u5B9A (\u4E91\u7AEF\u6A21\u578B \u2014 \u4E0D\u53EF\u4FEE\u6539)",
    "ctxFixedServer": "\u4E0D\u53EF\u4FEE\u6539 (\u670D\u52A1\u7AEF\u4E0D\u652F\u6301)",
    "applyContextBtn": "\u26A1 \u5E94\u7528",
    "applyContextTooltip": "\u6309\u6B64\u4E0A\u4E0B\u6587\u957F\u5EA6\u91CD\u65B0\u52A0\u8F7D\u6A21\u578B",
    "contextAppliedMsg": "\u4E0A\u4E0B\u6587\u5DF2\u8BBE\u4E3A {ctx} tokens (\u5C31\u7EEA)",
    "contextOllamaHint": "Ollama \u4E0A\u4E0B\u6587\u5DF2\u8BBE\u4E3A {ctx} tokens (\u4E0B\u6B21\u8BF7\u6C42\u751F\u6548)",
    "speedSlow": "0.75x (\u8212\u7F13)",
    "speedNormal": "1.0x (\u6B63\u5E38)",
    "speedFast": "1.25x (\u8F83\u5FEB)",
    "speedVeryFast": "1.5x (\u5FEB\u901F)",
    "speedDouble": "2.0x (\u53CC\u500D)",
    "tempLabel": "AI\u521B\u9020\u529B (\u6E29\u5EA6):",
    "maxTokensLabel": "\u6700\u5927\u957F\u5EA6 (Tokens):",
    "ttsSpeedLabel": "\u8BED\u97F3\u6717\u8BFB\u901F\u5EA6:",
    "whisperUrlLabel": "\u672C\u5730 Whisper \u8BED\u97F3\u8F6C\u5F55\u670D\u52A1\u5668 (STT):",
    "autoSummarizeLabel": "\u26A1 \u6253\u5F00\u89C6\u9891\u65F6\u81EA\u52A8\u751F\u6210\u6458\u8981",
    "customPromptLabel": "AI \u81EA\u5B9A\u4E49\u6307\u4EE4 (\u53EF\u9009):",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json",
    "exportBtn": "\u{1F4BE} \u5BFC\u51FA \u25BE",
    "modelReady": '\u6A21\u578B "{model}" \u5C31\u7EEA ({latency}ms)\uFF01',
    "connectionFailed": "\u5931\u8D25\uFF1A{error}",
    "connectionError": "\u8FDE\u63A5\u9519\u8BEF",
    "whisperReady": "\u672C\u5730 Whisper STT \u5C31\u7EEA ({latency}ms)\uFF01",
    "whisperFailed": "Whisper STT \u5931\u8D25\uFF1A{error}",
    "whisperKeyRequired": "Whisper \u8BED\u97F3\u8F6C\u5F55\u9700\u8981 API \u5BC6\u94A5\u3002",
    "whisperRecording": "\u{1F399}\uFE0F Whisper \u5F55\u97F3\u4E2D (\u9EA6\u514B\u98CE)...",
    "whisperTranscribing": "\u23F3 \u6B63\u5728\u901A\u8FC7 Whisper \u8F6C\u5F55\u97F3\u9891...",
    "whisperNoAudio": "\u672A\u5F55\u5236\u5230\u97F3\u9891\u3002\u8BF7\u5BF9\u7740\u9EA6\u514B\u98CE\u8BF4\u8BDD\u3002",
    "micAccessError": "\u65E0\u6CD5\u8BBF\u95EE\u9EA6\u514B\u98CE",
    "braveMicNotice": "\u5728 Brave \u6D4F\u89C8\u5668\u4E0A\uFF0C\u8BF7\u786E\u4FDD\u5DF2\u6388\u4E88\u9EA6\u514B\u98CE\u6743\u9650\u3002",
    "chapterBadge": "(\u7AE0\u8282)",
    "transcriptExtracted": "\u5DF2\u63D0\u53D6\u6587\u5B57\u8BB0\u5F55",
    "modelResponsive": "\u54CD\u5E94\u6A21\u578B\uFF1A{model}",
    "extractingTranscriptNotice": "\u6B63\u5728\u63D0\u53D6\u89C6\u9891\u5B57\u5E55...",
    "fetchingExternalTranscriptNotice": "\u6B63\u5728\u83B7\u53D6\u5916\u90E8\u89C6\u9891 ({videoId}) \u7684\u5B57\u5E55...",
    "analyzingChannelNotice": "\u6B63\u5728\u83B7\u53D6 {query} \u7684\u5B98\u65B9\u9891\u9053\u6863\u6848...",
    "fetchingCommentsNotice": "\u6B63\u5728\u83B7\u53D6\u70ED\u95E8\u8BC4\u8BBA\u548C\u89C2\u4F17\u53CD\u9988...",
    "externalTranscriptError": "\u65E0\u6CD5\u63D0\u53D6\u5916\u90E8\u89C6\u9891 ({videoId}) \u7684\u5B57\u5E55\u6216\u7AE0\u8282\u3002\u53EF\u80FD\u7684\u539F\u56E0\uFF1A\u65E0\u53EF\u7528\u5B57\u5E55\u6216\u7AE0\u8282\uFF0C\u6216\u5B58\u5728 YouTube \u8BBF\u95EE\u9650\u5236\u3002",
    "retryBtn": "\u{1F504} \u91CD\u8BD5",
    "tabAudit": "\u{1F6E1}\uFE0F Audit & Fact-Check",
    "auditTitle": "\u{1F6E1}\uFE0F \u6279\u5224\u6027\u903B\u8F91\u5BA1\u8BA1\u4E0E\u4E8B\u5B9E\u6838\u67E5",
    "runAuditBtn": "\u26A1 \u5F00\u59CB\u5BA1\u8BA1",
    "relaunchAuditBtn": "\u26A1 \u91CD\u65B0\u5BA1\u8BA1",
    "auditInProgress": "\u6B63\u5728\u8FDB\u884C\u5BA1\u8BA1...",
    "auditStarting": "\u6B63\u5728\u51C6\u5907\u5BA1\u8BA1\u6863\u6848...",
    "auditAnalyzing": "\u6B63\u5728\u6838\u67E5\u903B\u8F91\u4E00\u81F4\u6027\u4E0E\u4E8B\u5B9E...",
    "auditPlaceholder": "\u70B9\u51FB\u201C\u26A1 \u5F00\u59CB\u5BA1\u8BA1\u201D\u4EE5\u5206\u6790\u903B\u8F91\u4E25\u5BC6\u6027\u4E0E\u4E8B\u5B9E\u771F\u4F2A\u3002",
    "discussInChatBtn": "\u{1F4AC} \u5728\u804A\u5929\u4E2D\u8BA8\u8BBA",
    "auditChannelBtn": "\u{1F50D} \u5BA1\u8BA1\u9891\u9053",
    "channelAuditTitle": "\u{1F4CA} \u5168\u9891\u9053\u603B\u4F53\u5BA1\u8BA1",
    "channelSampleInfo": "\u65F6\u95F4\u52A0\u6743\u62BD\u6837",
    "periodFilterLabel": "\u5206\u6790\u65F6\u95F4\u8303\u56F4:",
    "periodAll": "\u5168\u90E8\u5386\u53F2",
    "periodMonth": "\u6700\u8FD1\u4E00\u4E2A\u6708",
    "periodYear": "\u4ECA\u5E74",
    "period6Months": "\u6700\u8FD16\u4E2A\u6708",
    "subtabAuditVideo": "\u{1F3A5} \u89C6\u9891\u5BA1\u6838",
    "subtabAuditChannel": "\u{1F4CA} \u9891\u9053\u5BA1\u6838",
    "runChannelAuditBtn": "\u26A1 \u8FD0\u884C\u9891\u9053\u5BA1\u6838",
    "channelCompanionDesc": "\u8BC4\u4F30\u8BE5\u9891\u9053\u7684\u7F16\u8F91\u4E25\u8C28\u6027\u3001\u8D5E\u52A9\u900F\u660E\u5EA6\u4EE5\u53CA\u591A\u5E74\u53D1\u5C55\u8F68\u8FF9\u3002",
    "tabChannelAudit": "\u{1F4CA} \u9891\u9053\u5BA1\u6838",
    "channelChatTitle": "\u{1F4AC} \u9891\u9053\u95EE\u7B54\u4E92\u52A8",
    "channelChatWelcome": "\u4F60\u597D\uFF01\u8BF7\u9488\u5BF9\u8BE5\u9891\u9053\u63D0\u51FA\u95EE\u9898\uFF08\u5185\u5BB9\u98CE\u683C\u3001\u8FD1\u671F\u89C6\u9891\u3001\u5546\u4E1A\u5408\u4F5C\u4E0E\u957F\u671F\u6F14\u8FDB\uFF09\u3002",
    "channelChatPlaceholder": "\u9488\u5BF9\u9891\u9053\u63D0\u95EE\u6216\u7C98\u8D34\u89C6\u9891\u94FE\u63A5...",
    "channelChatResetNotice": "\u9891\u9053\u5BF9\u8BDD\u5DF2\u91CD\u7F6E\uFF0C\u8BF7\u5728\u4E0B\u65B9\u63D0\u95EE\uFF01",
    "channelChatSuggestions": [
      { "label": "\u5185\u5BB9\u98CE\u683C", "question": "\u8BE5\u9891\u9053\u7684\u4E3B\u8981\u7F16\u8F91\u98CE\u683C\u4E0E\u957F\u671F\u6F14\u8FDB\u8D8B\u52BF\u662F\u4EC0\u4E48\uFF1F" },
      { "label": "\u4E3B\u9898\u4E0E\u5F62\u5F0F", "question": "\u8FD1\u671F\u89C6\u9891\u7684\u4E3B\u8981\u4E3B\u9898\u548C\u5E38\u89C1\u5236\u4F5C\u5F62\u5F0F\u6709\u54EA\u4E9B\uFF1F" },
      { "label": "\u5546\u4E1A\u900F\u660E\u5EA6", "question": "\u8BE5\u9891\u9053\u5728\u5546\u4E1A\u5408\u4F5C\u4E0E\u5E7F\u544A\u900F\u660E\u5EA6\u65B9\u9762\u8868\u73B0\u5982\u4F55\uFF1F" },
      { "label": "\u4F18\u52BF\u4E0E\u4E0D\u8DB3", "question": "\u8BE5\u9891\u9053\u6709\u54EA\u4E9B\u6838\u5FC3\u4F18\u52BF\u548C\u5185\u5BB9\u5C40\u9650\uFF1F" }
    ],
    "maxVideosLabel": "\u6700\u5927\u6570\u91CF:",
    "stopAuditBtn": "\u23F9 \u505C\u6B62\u5BA1\u8BA1",
    "stopShortBtn": "\u505C\u6B62",
    "auditStoppedNote": "\u23F9 \u7528\u6237\u5DF2\u505C\u6B62\u5904\u7406\u3002",
    "channelAuditPlaceholder": "\u70B9\u51FB\u4E0A\u65B9\u7684\u201C\u26A1 \u8FD0\u884C\u9891\u9053\u5BA1\u8BA1\u201D\u4EE5\u8BC4\u4F30\u6B64\u9891\u9053\u3002",
    "channelSampleBadge": "\u6837\u672C:",
    "channelVideosUnit": "\u4E2A\u89C6\u9891",
    "channelAnalyzedVideosUnit": "\u4E2A\u5DF2\u5206\u6790\u89C6\u9891",
    "channelRecentHistoricMix": "\u52A0\u6743 ~65% \u8FD1\u671F\u4E0E ~35% \u5386\u53F2\u5185\u5BB9",
    "channelSubscribersUnit": "\u4F4D\u8BA2\u9605\u8005",
    "channelEvolutionTitle": "\u{1F4C8} \u7F16\u8F91\u4E0E\u8D28\u91CF\u6F14\u53D8",
    "channelStrengthsTitle": "\u2713 \u6838\u5FC3\u4F18\u52BF\uFF08\u4EAE\u70B9\uFF09",
    "channelWeaknessesTitle": "! \u9700\u5173\u6CE8\u70B9\uFF08\u4E0D\u8DB3\uFF09",
    "channelDrawbacksTitle": "\u2715 \u98CE\u9669\u4E0E\u8B66\u793A\uFF08\u907F\u5751\uFF09",
    "channelSampleVideosTitle": "\u{1F3AC} \u5DF2\u5206\u6790\u89C6\u9891\u8BE6\u60C5",
    "channelSynthesisTitle": "\u{1F4CB} \u7EFC\u5408\u603B\u7ED3",
    "copyAuditBtn": "\u{1F4CB} \u590D\u5236\u5B8C\u6574\u62A5\u544A",
    "channelSensationalismLabel": "\u6807\u9898\u515A/\u5938\u5F20\u6307\u6570",
    "channelDistributionLabel": "\u6309 5% \u533A\u95F4\u5206\u5E03",
    "channelMedianLabel": "\u4E2D\u4F4D\u6570:",
    "channelHomogeneousLine": "\u98CE\u683C\u9AD8\u5EA6\u4E00\u81F4",
    "channelModerateVarLine": "\u4E2D\u7B49\u6CE2\u52A8",
    "channelVolatileLine": "\u98CE\u683C\u6CE2\u52A8\u8F83\u5927",
    "channelIntegrityProportion": "\u7F16\u8F91\u8BDA\u4FE1\u5EA6\u5206\u5E03",
    "channelBucketReliable": "\u53EF\u9760 (\u226575)",
    "channelBucketModerate": "\u4E2D\u7B49 (50-74)",
    "channelBucketRisk": "\u98CE\u9669 (<50)",
    "channelClickbaitLow": "\u514B\u5236\u4E0E\u5BA2\u89C2",
    "channelClickbaitMod": "\u9002\u5EA6",
    "channelClickbaitHigh": "\u6807\u9898\u5938\u5927 / \u6807\u9898\u515A",
    "channelVideoScorePrefix": "\u53EF\u4FE1\u5EA6",
    "channelNoStrengths": "\u672A\u53D1\u73B0\u663E\u8457\u4F18\u52BF\u3002",
    "channelNoWeaknesses": "\u672A\u68C0\u6D4B\u5230\u660E\u663E\u77ED\u677F\u3002",
    "channelNoDrawbacks": "\u672A\u53D1\u73B0\u91CD\u5927\u98CE\u9669\u63D0\u793A\u3002",
    "pasteBtn": "\u7C98\u8D34",
    "pasteTooltip": "\u4ECE\u526A\u8D34\u677F\u7C98\u8D34",
    "chapterOnlyNotice": "YouTube \u672A\u63D0\u4F9B\u5B8C\u6574\u5B57\u5E55\uFF0C\u4EC5\u83B7\u53D6\u5230\u7AE0\u8282\u4FE1\u606F\u3002",
    "forceRetryBtn": "\u5F3A\u5236\u91CD\u8BD5",
    "extractingLabel": "\u6B63\u5728\u63D0\u53D6...",
    "auditErrorPrefix": "\u5BA1\u8BA1\u9519\u8BEF\uFF1A",
    "channelVideosLongBadge": "\u957F\u89C6\u9891",
    "channelShortsBadge": "\u77ED\u89C6\u9891",
    "channelFormatMixTitle": "\u26A1 \u957F\u89C6\u9891 vs \u77ED\u89C6\u9891 (Shorts) \u5BF9\u6BD4\u5206\u6790",
    "channelFormatVideosLabel": "\u957F\u89C6\u9891",
    "channelFormatShortsLabel": "\u77ED\u89C6\u9891",
    "channelFormatAvgScore": "\u5E73\u5747\u8BC4\u5206",
    "channelFormatAvgClickbait": "\u6807\u9898\u515A\u6307\u6570",
    "webBusyBtn": "\u23F3 \u5206\u6790\u4E2D...",
    "webReasoningWait": "\u{1F4AD} \u6A21\u578B\u6B63\u5728\u63A8\u7406...",
    "webEmptyAiResponse": "AI \u6A21\u578B\u672A\u8FD4\u56DE\u4EFB\u4F55\u5206\u6790\u6587\u672C\uFF08\u7A7A\u54CD\u5E94\u6216\u63A8\u7406\u88AB\u622A\u65AD\uFF09\u3002\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u68C0\u67E5\u6240\u9009\u6A21\u578B\u3001\u4E0A\u4E0B\u6587\u957F\u5EA6\u6216 Max Tokens\u3002",
    "closeExtensionBtn": "\u5173\u95ED\u5E76\u505C\u7528 ClarifAI\uFF08\u53EF\u968F\u65F6\u5728\u6269\u5C55\u5F39\u7A97\u4E2D\u91CD\u65B0\u542F\u7528\uFF09",
    "webCancelBtn": "\u23F9 \u53D6\u6D88",
    "chatQueueTitle": "\u6392\u961F\u4E2D ({count})",
    "chatInProgressLabel": "\u751F\u6210\u4E2D\uFF1A",
    "chatEditRecallBtn": "\u4FEE\u6539 / \u53D6\u6D88",
    "chatRevertBtn": "\u56DE\u9000\u81F3\u6B64",
    "chatRevertTitle": "\u56DE\u9000\u5230\u6B64\u6D88\u606F\u5E76\u7F16\u8F91\u6587\u672C",
    "chatSendNowBtn": "\u7ACB\u5373\u53D1\u9001",
    "chatRemoveQueueBtn": "\u79FB\u51FA\u961F\u5217",
    "describeAccessibleBtn": "\u{1F441}\uFE0F \u65E0\u969C\u788D\u9875\u9762\u63CF\u8FF0",
    "describeAccessibleTitle": "\u4E3A\u89C6\u969C\u4EBA\u58EB\u8BE6\u7EC6\u63CF\u8FF0\u9875\u9762\u548C\u56FE\u7247\u5E76\u81EA\u52A8\u5F00\u59CB\u8BED\u97F3\u6717\u8BFB",
    "describeAccessibleQuestion": "\u{1F441}\uFE0F \u8BF7\u4E3A\u89C6\u969C\u4EBA\u58EB\u8BE6\u7EC6\u63CF\u8FF0\u6B64\u9875\u9762\u53CA\u5176\u4E2D\u7684\u56FE\u7247\u5185\u5BB9\uFF08\u8BED\u97F3\u53E3\u8FF0\u5F62\u5F0F\uFF09\u3002",
    "speechBarAriaLabel": "\u8BED\u97F3\u6717\u8BFB\u63A7\u5236",
    "speechRestartBtn": "\u23EE \u4ECE\u5934\u5F00\u59CB",
    "speechRestartTitle": "\u4ECE\u5934\u91CD\u65B0\u6717\u8BFB",
    "speechPauseBtn": "\u23F8 \u6682\u505C",
    "speechResumeBtn": "\u25B6 \u7EE7\u7EED",
    "speechStopBtn": "\u23F9 \u505C\u6B62",
    "speechSeekLabel": "\u5728\u6587\u672C\u4E2D\u79FB\u52A8\u6717\u8BFB\u4F4D\u7F6E"
  };
  var zh_default = zh;

  // src/locales/index.js
  var I18N = {
    fr: fr_default,
    en: en_default,
    es: es_default,
    de: de_default,
    it: it_default,
    ru: ru_default,
    ja: ja_default,
    zh: zh_default
  };
  var SUPPORTED_LANG_CODES = new Set(Object.keys(I18N));
  function detectBrowserLang(overrideLocale = null) {
    const candidates = overrideLocale != null ? [overrideLocale] : [
      typeof chrome !== "undefined" ? chrome?.i18n?.getUILanguage?.() : null,
      typeof navigator !== "undefined" ? navigator?.language : null,
      ...typeof navigator !== "undefined" && Array.isArray(navigator?.languages) ? navigator.languages : []
    ];
    for (const candidate of candidates) {
      if (typeof candidate !== "string" || !candidate.trim()) continue;
      const base = candidate.trim().toLowerCase().split(/[-_]/)[0];
      if (SUPPORTED_LANG_CODES.has(base)) return base;
    }
    return "en";
  }

  // src/popup/PopupController.js
  var PopupController = class {
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
      const data = await this.storage.getMultiple(["extensionEnabled", "targetLang"]);
      this.extensionEnabled = data.extensionEnabled !== void 0 ? Boolean(data.extensionEnabled) : true;
      this.currentLang = data.targetLang || detectBrowserLang();
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
      const analyzeWebBtn = document.getElementById("analyzeWebPageBtn");
      if (analyzeWebBtn) {
        analyzeWebBtn.addEventListener("click", async () => {
          if (!this.activeTab?.id) return;
          try {
            await chrome.tabs.sendMessage(this.activeTab.id, { action: "OPEN_WEB_PANEL" });
          } catch {
            try {
              await chrome.scripting.insertCSS({ target: { tabId: this.activeTab.id }, files: ["dist/content.css"] });
              await chrome.scripting.executeScript({ target: { tabId: this.activeTab.id }, files: ["dist/content.js"] });
              await new Promise((r) => setTimeout(r, 180));
              await chrome.tabs.sendMessage(this.activeTab.id, { action: "OPEN_WEB_PANEL" }).catch(() => {
              });
            } catch (e) {
              console.warn("Web page injection failed:", e);
            }
          }
          window.close();
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
        const isYouTubeWatch = (() => {
          try {
            const u = new URL(this.activeTab.url);
            const isYouTubeHost2 = u.hostname === "youtube.com" || u.hostname.endsWith(".youtube.com");
            return isYouTubeHost2 && isWatchPage(this.activeTab.url);
          } catch {
            return false;
          }
        })();
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
      if (this.inPageStatus?.isWatch || this.inPageStatus?.isWatchPage) {
        idleCard?.classList.add("hidden");
        videoCard?.classList.remove("hidden");
        const t = POPUP_I18N[this.currentLang] || POPUP_I18N.en;
        const titleEl = document.getElementById("videoTitle");
        if (titleEl) {
          titleEl.textContent = this.inPageStatus.title || this.activeTab?.title?.replace(/ - YouTube$/, "") || t.youtubeVideoFallback;
        }
        const stateBadge = document.getElementById("bannerStateBadge");
        const toggleText = document.getElementById("toggleBannerText");
        if (this.inPageStatus.isExpanded) {
          if (stateBadge) stateBadge.textContent = t.bannerExpanded;
          if (toggleText) toggleText.textContent = t.collapseOnPage;
        } else {
          if (stateBadge) stateBadge.textContent = t.bannerCollapsed;
          if (toggleText) toggleText.textContent = t.expandOnPage;
        }
      } else {
        videoCard?.classList.add("hidden");
        idleCard?.classList.remove("hidden");
        const webBtn = document.getElementById("analyzeWebPageBtn");
        const isHttpWeb = Boolean(this.activeTab?.url && /^https?:\/\//i.test(this.activeTab.url));
        if (webBtn) webBtn.classList.toggle("hidden", !isHttpWeb);
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
      const textMap = {
        switchTitle: t.switchTitle,
        switchDesc: t.switchDesc,
        idleTitle: t.idleTitle,
        idleDesc: t.idleDesc,
        disabledTitle: t.disabledTitle,
        disabledDesc: t.disabledDesc,
        summarizeBtnText: t.summarize,
        currentVideoBadge: t.currentVideo,
        openYoutubeBtnText: t.goToYoutube,
        analyzeWebPageBtnText: t.analyzeWebPage || "\u{1F6E1}\uFE0F Analyze this page"
      };
      Object.entries(textMap).forEach(([id, txt]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      });
      const extVersion = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? `v${chrome.runtime.getManifest().version}` : "v2.0.1";
      const versionEl = document.getElementById("brandVersion");
      if (versionEl) versionEl.textContent = `${extVersion} \u2022 ${t.privacyTagline}`;
      this.updateStatusPill(this.extensionEnabled);
      this.renderCards();
      this.cacheController.applyLocalization(t);
    }
  };

  // src/popup/index.js
  document.addEventListener("DOMContentLoaded", () => {
    const controller = new PopupController();
    controller.init();
  });
})();
