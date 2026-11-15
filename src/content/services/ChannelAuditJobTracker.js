import { ChannelAuditReport } from '../../domain/models/ChannelAuditReport.js';

const STORAGE_KEY = 'yt_ai_channel_audit_cache_v1';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_PERSISTED_ENTRIES = 5;

/**
 * Job State, Channel Key Normalization, Cancellation & Persistence Helper for Channel Audits
 */
export class ChannelAuditJobTracker {
  /**
   * Normalizes any channel URL, path, or handle (@name, /@name/shorts, channel/UC...)
   * into a stable lowercase identifier for matching across YouTube page transitions.
   * @param {string} rawQuery
   * @returns {string}
   */
  static normalizeKey(rawQuery) {
    if (!rawQuery) return '';
    const trimmed = String(rawQuery).trim();
    if (!trimmed) return '';
    try {
      const url = /^https?:\/\//i.test(trimmed)
        ? new URL(trimmed)
        : (trimmed.startsWith('/') ? new URL(trimmed, 'https://www.youtube.com') : null);
      if (url) {
        const path = url.pathname.replace(/\/+$/, '');
        if (path.startsWith('/@')) {
          return (path.split('/')[1] || '').toLowerCase();
        }
        const match = path.match(/^\/(?:channel|c|user)\/([^/?#]+)/i);
        if (match?.[1]) return match[1].toLowerCase();
        if (path) return path.replace(/^\//, '').toLowerCase();
      }
    } catch (_) {}
    return trimmed.replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
  }

  /**
   * Creates a typed AbortError recognized across audit stages and controllers
   * @param {string} [lang='fr']
   * @returns {Error}
   */
  static createAbortError(lang = 'fr') {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const err = new Error(isFr ? 'Traitement arrêté par l’utilisateur.' : 'Audit stopped by user.');
    err.name = 'AbortError';
    err.isAborted = true;
    return err;
  }

  /**
   * Checks whether an error represents intentional user cancellation
   * @param {any} err
   * @returns {boolean}
   */
  static isAbortError(err) {
    return Boolean(err && (err.isAborted === true || err.name === 'AbortError'));
  }

  /**
   * Throws an AbortError immediately when signal is aborted
   * @param {AbortSignal|null} signal
   * @param {string} [lang='fr']
   */
  static throwIfAborted(signal, lang = 'fr') {
    if (signal?.aborted) {
      throw ChannelAuditJobTracker.createAbortError(lang);
    }
  }

  /**
   * Races any non-cancellable async promise (e.g. chrome.runtime.sendMessage)
   * against an AbortSignal so the Stop button frees the UI instantaneously.
   * @param {Promise<any>} promise
   * @param {AbortSignal|null} signal
   * @param {string} [lang='fr']
   * @returns {Promise<any>}
   */
  static raceWithAbort(promise, signal, lang = 'fr') {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(ChannelAuditJobTracker.createAbortError(lang));
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(ChannelAuditJobTracker.createAbortError(lang));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(promise).then(
        (val) => {
          signal.removeEventListener('abort', onAbort);
          resolve(val);
        },
        (err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }

  /**
   * Persists a completed ChannelAuditReport into chrome.storage.local (bounded LRU)
   * @param {string} cacheKey
   * @param {string} channelKey
   * @param {ChannelAuditReport} report
   */
  static persistReport(cacheKey, channelKey, report) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !report) return;
    try {
      chrome.storage.local.get([STORAGE_KEY], (res = {}) => {
        const mapObj = (res && typeof res[STORAGE_KEY] === 'object' && res[STORAGE_KEY]) ? { ...res[STORAGE_KEY] } : {};
        const now = Date.now();
        mapObj[cacheKey] = { savedAt: now, channelKey, data: { ...report } };

        const sortedEntries = Object.entries(mapObj)
          .filter(([, entry]) => entry && now - (entry.savedAt || 0) < CACHE_TTL_MS)
          .sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0))
          .slice(0, MAX_PERSISTED_ENTRIES);

        chrome.storage.local.set({ [STORAGE_KEY]: Object.fromEntries(sortedEntries) });
      });
    } catch (_) {}
  }

  /**
   * Hydrates persisted non-expired channel audit reports into memory cache
   * @param {Map<string, ChannelAuditReport>} targetMap
   * @returns {Promise<void>}
   */
  static hydrateReports(targetMap) {
    if (!(targetMap instanceof Map) || typeof chrome === 'undefined' || !chrome.storage?.local) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEY], (res = {}) => {
          const store = res?.[STORAGE_KEY];
          const now = Date.now();
          if (store && typeof store === 'object') {
            for (const [k, entry] of Object.entries(store)) {
              if (entry?.data && now - (entry.savedAt || 0) < CACHE_TTL_MS) {
                const hydrated = new ChannelAuditReport(entry.data);
                if (!targetMap.has(k)) targetMap.set(k, hydrated);
                if (entry.channelKey && !targetMap.has(entry.channelKey)) {
                  targetMap.set(entry.channelKey, hydrated);
                }
              }
            }
          }
          resolve();
        });
      } catch (_) {
        resolve();
      }
    });
  }

  /**
   * Clears persisted channel audit cache
   */
  static clearPersistedReports() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    try {
      chrome.storage.local.remove([STORAGE_KEY]);
    } catch (_) {}
  }
}

export default ChannelAuditJobTracker;
