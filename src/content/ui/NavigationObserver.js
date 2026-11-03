/**
 * YouTube Single Page Application Navigation & Watch Page Observer
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

      const payload = { isNewVideo, currentVideoId, prevVideoId, url: currentUrl };
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
export const getVideoId = NavigationObserver.getVideoId;
export const observeNavigation = NavigationObserver.observeNavigation;
export default NavigationObserver;
