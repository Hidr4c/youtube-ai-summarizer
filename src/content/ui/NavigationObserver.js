/**
 * YouTube Single Page Application Navigation, Watch & Channel Page Observer
 */
export class NavigationObserver {
  /** Parses an optional URL string against current window origin safely. */
  static _parseUrl(url) {
    try {
      const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://www.youtube.com';
      return url ? new URL(url, base) : (typeof window !== 'undefined' ? window.location : null);
    } catch (_) {
      return null;
    }
  }

  /** Checks if URL is a YouTube Shorts player page (/shorts/<id>). */
  static isShortsPage(url) {
    const u = NavigationObserver._parseUrl(url);
    const path = typeof u?.pathname === 'string' ? u.pathname : '';
    return path.startsWith('/shorts/') && path.length > 8;
  }

  /** Checks if current URL is a YouTube watch page (watch, live, shorts). */
  static isWatchPage(url) {
    const u = NavigationObserver._parseUrl(url);
    if (!u || typeof u.pathname !== 'string') return false;
    if (u.pathname === '/watch' && new URLSearchParams(u.search || '').has('v')) return true;
    if (u.pathname.startsWith('/live/') && u.pathname.length > 6) return true;
    return NavigationObserver.isShortsPage(url);
  }

  /** Checks if current URL is a YouTube channel page (@handle, /channel/, /c/, /user/). */
  static isChannelPage(url) {
    const u = NavigationObserver._parseUrl(url);
    const path = typeof u?.pathname === 'string' ? u.pathname : '';
    if (!path) return false;
    if (path.startsWith('/@') && path.length > 2) return true;
    if (path.startsWith('/channel/') && path.length > 9) return true;
    if (path.startsWith('/c/') && path.length > 3) return true;
    return path.startsWith('/user/') && path.length > 6;
  }

  /** Extracts YouTube channel handle or ID from URL. */
  static getChannelIdentifier(url) {
    const u = NavigationObserver._parseUrl(url);
    const path = typeof u?.pathname === 'string' ? u.pathname : '';
    if (!path) return '';
    if (path.startsWith('/@')) return path.split('/')[1] || '';
    const match = path.match(/^\/(channel|c|user)\/([^\/?#]+)/);
    return match ? match[2] : '';
  }

  /** Extracts YouTube video ID from URL (watch, live, shorts, embed). */
  static getVideoId(url) {
    const u = NavigationObserver._parseUrl(url);
    if (!u) return '';
    const v = new URLSearchParams(u.search || '').get('v');
    if (v) return v;
    if (typeof u.pathname !== 'string') return '';
    const match = u.pathname.match(/^\/(?:live|shorts|embed)\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  /**
   * Resolves the currently active HTMLVideoElement across Watch and Shorts feeds
   * @returns {HTMLVideoElement|null}
   */
  static getActiveVideoElement() {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return null;
    return document.querySelector('ytd-reel-video-renderer[is-active] video')
      || document.querySelector('#shorts-player video')
      || document.querySelector('#movie_player video')
      || document.querySelector('video')
      || null;
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

  /**
   * Detects whether YouTube or the browser viewport is currently in fullscreen mode
   * @returns {boolean}
   */
  static isFullscreen() {
    if (typeof document === 'undefined') return false;
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    if (typeof document.querySelector === 'function') {
      return Boolean(document.querySelector('ytd-watch-flexy[fullscreen], ytd-watch-grid[fullscreen], ytd-shorts[fullscreen], ytm-shorts[fullscreen], ytd-app[fullscreen], ytm-watch[fullscreen], ytm-app[fullscreen], .html5-video-player.ytp-fullscreen'));
    }
    return false;
  }

  /**
   * Synchronizes fullscreen hidden state across injected extension containers
   * @returns {boolean}
   */
  static syncFullscreenVisibility() {
    const fs = NavigationObserver.isFullscreen();
    if (typeof document !== 'undefined') {
      ['yt-ai-summarizer-container', 'yt-ai-channel-companion'].forEach(id => {
        const el = document.getElementById?.(id);
        if (!el?.classList) return;
        if (typeof el.classList.contains === 'function' && el.classList.contains('yt-ai-fullscreen-hidden') === fs) return;
        if (typeof el.classList.toggle === 'function') {
          el.classList.toggle('yt-ai-fullscreen-hidden', fs);
        } else if (fs) {
          el.classList.add?.('yt-ai-fullscreen-hidden');
        } else {
          el.classList.remove?.('yt-ai-fullscreen-hidden');
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
    if (typeof document === 'undefined') return () => {};
    const onFsChange = () => NavigationObserver.syncFullscreenVisibility();
    document.addEventListener?.('fullscreenchange', onFsChange);
    document.addEventListener?.('webkitfullscreenchange', onFsChange);

    let attrObserver = null;
    if (typeof MutationObserver !== 'undefined') {
      attrObserver = new MutationObserver(onFsChange);
      attrObserver.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        attributeFilter: ['fullscreen', 'class']
      });
    }
    onFsChange();
    return () => {
      document.removeEventListener?.('fullscreenchange', onFsChange);
      document.removeEventListener?.('webkitfullscreenchange', onFsChange);
      attrObserver?.disconnect();
    };
  }
  static isYouTubeHost(url) {
    const u = NavigationObserver._parseUrl(url);
    let h = String(u?.hostname || '').toLowerCase();
    if (!h && typeof u?.origin === 'string') {
      try { h = new URL(u.origin).hostname.toLowerCase(); } catch {}
    }
    return h === 'youtu.be' || h === 'youtube.com' || h.endsWith('.youtube.com');
  }
  static isWebPageMode(url) {
    const u = NavigationObserver._parseUrl(url);
    const proto = u?.protocol || (typeof u?.origin === 'string' && u.origin.includes(':') ? `${u.origin.split(':')[0]}:` : '');
    if (!u || !/^https?:$/i.test(proto)) return false;
    return !NavigationObserver.isYouTubeHost(url) || (!NavigationObserver.isWatchPage(url) && !NavigationObserver.isChannelPage(url));
  }
}

export const isYouTubeHost = NavigationObserver.isYouTubeHost;
export const isWebPageMode = NavigationObserver.isWebPageMode;
export const isShortsPage = NavigationObserver.isShortsPage;
export const isWatchPage = NavigationObserver.isWatchPage;
export const isChannelPage = NavigationObserver.isChannelPage;
export const getChannelIdentifier = NavigationObserver.getChannelIdentifier;
export const getVideoId = NavigationObserver.getVideoId;
export const getActiveVideoElement = NavigationObserver.getActiveVideoElement;
export const extractVideoIdFromText = NavigationObserver.extractVideoIdFromText;
export const extractAllVideoIdsFromText = NavigationObserver.extractAllVideoIdsFromText;
export const isFullscreen = NavigationObserver.isFullscreen;
export const syncFullscreenVisibility = NavigationObserver.syncFullscreenVisibility;
export const observeFullscreen = NavigationObserver.observeFullscreen;
export const observeNavigation = NavigationObserver.observeNavigation;
export default NavigationObserver;
