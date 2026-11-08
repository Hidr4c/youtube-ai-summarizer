/**
 * YouTube Single Page Application Navigation, Watch & Channel Page Observer
 */
export class NavigationObserver {
  /**
   * Checks if current URL is a YouTube watch page
   * @param {string} [url]
   * @returns {boolean}
   */
  static isWatchPage(url) {
    try {
      const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://www.youtube.com';
      const u = url ? new URL(url, base) : (typeof window !== 'undefined' ? window.location : null);
      if (!u) return false;
      if (u.pathname === '/watch' && new URLSearchParams(u.search).has('v')) return true;
      if (u.pathname.startsWith('/live/') && u.pathname.length > 6) return true;
      if (u.pathname.startsWith('/shorts/') && u.pathname.length > 8) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Checks if current URL is a YouTube channel page (@handle, /channel/, /c/, /user/)
   * @param {string} [url]
   * @returns {boolean}
   */
  static isChannelPage(url) {
    try {
      const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://www.youtube.com';
      const u = url ? new URL(url, base) : (typeof window !== 'undefined' ? window.location : null);
      if (!u) return false;
      const path = u.pathname;
      if (path.startsWith('/@') && path.length > 2) return true;
      if (path.startsWith('/channel/') && path.length > 9) return true;
      if (path.startsWith('/c/') && path.length > 3) return true;
      if (path.startsWith('/user/') && path.length > 6) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Extracts YouTube channel handle or ID from URL
   * @param {string} [url]
   * @returns {string}
   */
  static getChannelIdentifier(url) {
    try {
      const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://www.youtube.com';
      const u = url ? new URL(url, base) : (typeof window !== 'undefined' ? window.location : null);
      if (!u) return '';
      const path = u.pathname;
      if (path.startsWith('/@')) {
        return path.split('/')[1] || '';
      }
      const match = path.match(/^\/(channel|c|user)\/([^\/?#]+)/);
      if (match) return match[2];
      return '';
    } catch (_) {
      return '';
    }
  }

  /**
   * Extracts YouTube video ID from URL (watch, live, shorts, embed)
   * @param {string} [url]
   * @returns {string}
   */
  static getVideoId(url) {
    try {
      const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://www.youtube.com';
      const u = url ? new URL(url, base) : (typeof window !== 'undefined' ? window.location : null);
      if (!u) return '';
      const v = new URLSearchParams(u.search).get('v');
      if (v) return v;
      const liveMatch = u.pathname.match(/^\/live\/([^/?#]+)/);
      if (liveMatch) return liveMatch[1];
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shortsMatch) return shortsMatch[1];
      const embedMatch = u.pathname.match(/^\/embed\/([^/?#]+)/);
      if (embedMatch) return embedMatch[1];
      return '';
    } catch (_) {
      return '';
    }
  }

  /**
   * Extracts YouTube video ID embedded within free-form text or URL
   * @param {string} text
   * @returns {string}
   */
  static extractVideoIdFromText(text) {
    const ids = NavigationObserver.extractAllVideoIdsFromText(text);
    return ids[0] || '';
  }

  /**
   * Extracts all unique YouTube video IDs embedded within free-form text
   * @param {string} text
   * @returns {string[]}
   */
  static extractAllVideoIdsFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const urlMatches = text.match(/https?:\/\/[^\s"'<>\)]+/gi) || [];
    const ids = [];

    const parseUrl = (rawUrl) => {
      try {
        const u = new URL(rawUrl);
        const v = u.searchParams.get('v');
        if (v && v.length >= 11) return v.slice(0, 11);
        if (v) return v;
        const liveMatch = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
        if (liveMatch) return liveMatch[1].slice(0, 11);
        if (u.hostname === 'youtu.be' || u.hostname.endsWith('.youtu.be')) {
          const id = u.pathname.replace(/^\//, '').split('?')[0];
          if (id) return id.slice(0, 11);
        }
      } catch (_) {}
      const fallback = rawUrl.match(/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      return fallback ? fallback[1] : '';
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
    let lastVideoId = NavigationObserver.getVideoId(window.location.href);

    const handleNavigation = () => {
      const currentUrl = window.location.href;
      const currentVideoId = NavigationObserver.getVideoId(currentUrl);
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
        isChannel: NavigationObserver.isChannelPage(currentUrl),
        channelIdentifier: NavigationObserver.getChannelIdentifier(currentUrl)
      };

      if (typeof handlers === 'function') {
        handlers(payload);
      } else {
        if (typeof handlers?.onUrlChange === 'function') {
          handlers.onUrlChange(payload);
        }
        if (isNewVideo && typeof handlers?.onVideoChange === 'function') {
          handlers.onVideoChange(currentVideoId, prevVideoId);
        }
      }
    };

    window.addEventListener('yt-navigate-finish', handleNavigation);
    window.addEventListener('yt-page-data-updated', handleNavigation);
    window.addEventListener('spfdone', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    setInterval(() => {
      if (window.location.href !== lastObservedUrl) {
        handleNavigation();
      }
    }, 350);

    const observer = new MutationObserver(() => {
      if (typeof handlers.onDomCheck === 'function') {
        handlers.onDomCheck();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return observer;
  }
}

export const isWatchPage = NavigationObserver.isWatchPage;
export const isChannelPage = NavigationObserver.isChannelPage;
export const getChannelIdentifier = NavigationObserver.getChannelIdentifier;
export const getVideoId = NavigationObserver.getVideoId;
export const extractVideoIdFromText = NavigationObserver.extractVideoIdFromText;
export const extractAllVideoIdsFromText = NavigationObserver.extractAllVideoIdsFromText;
export const observeNavigation = NavigationObserver.observeNavigation;
export default NavigationObserver;
