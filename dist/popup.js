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
      cacheEmpty: "0 Ko (0 videos)"
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
      loadingVideo: "D\xE9tection de la vid\xE9o...",
      cacheTitle: "\u{1F4BE} Gestion du Cache",
      cacheDesc: "Transcriptions, synth\xE8ses et audits stock\xE9s localement pour \xE9conomiser vos jetons.",
      purgeBtn: "Purger",
      purgeAll: "Vider tout le cache",
      purge7Days: "Plus ancien que 7 jours",
      purge30Days: "Plus ancien que 30 jours",
      purgeSuccess: "\u2713 Cache purg\xE9 avec succ\xE8s ({count} vid\xE9o(s))",
      cacheEmpty: "0 Ko (0 vid\xE9o)"
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
      cacheEmpty: "0 Ko (0 v\xEDdeos)"
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
      cacheEmpty: "0 Ko (0 Videos)"
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
      cacheEmpty: "0 Ko (0 video)"
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
      cacheEmpty: "0 Ko (0 \u0432\u0438\u0434\u0435\u043E)"
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
      cacheEmpty: "0 Ko (0\u4EF6)"
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
      cacheEmpty: "0 Ko (0 \u4E2A\u89C6\u9891)"
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

  // src/popup/PopupController.js
  var PopupController = class {
    constructor() {
      this.storage = new ChromeStorageService();
      this.currentLang = "en";
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
      const extVersion = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? `v${chrome.runtime.getManifest().version}` : "v1.4.0";
      const versionEl = document.getElementById("brandVersion");
      if (versionEl) versionEl.textContent = `${extVersion} \u2022 Privacy-First`;
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
