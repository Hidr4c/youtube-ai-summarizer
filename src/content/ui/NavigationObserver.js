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
      const u = url ? new URL(url, window.location.origin) : window.location;
      return u.pathname === '/watch' && new URLSearchParams(u.search).has('v');
    } catch (_) {
      return false;
    }
  }

  /**
   * Extracts YouTube video ID from URL
   * @param {string} [url]
   * @returns {string}
   */
  static getVideoId(url) {
    try {
      const u = url ? new URL(url, window.location.origin) : window.location;
      return new URLSearchParams(u.search).get('v') || '';
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

    const handleNavigation = () => {
      if (typeof handlers === 'function') {
        handlers();
      } else if (typeof handlers?.onUrlChange === 'function') {
        handlers.onUrlChange();
      }
    };

    window.addEventListener('yt-navigate-finish', handleNavigation);
    window.addEventListener('yt-page-data-updated', handleNavigation);
    window.addEventListener('spfdone', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    setInterval(() => {
      if (window.location.href !== lastObservedUrl) {
        lastObservedUrl = window.location.href;
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
