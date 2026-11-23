/**
 * Main-world DOM helpers for locating the active YouTube player and state containers
 * across both classic Watch pages (#movie_player / ytd-watch-flexy) and Shorts feeds
 * (#shorts-player / ytd-reel-video-renderer[is-active] / ytm-shorts).
 */
export class PlayerElementHelper {
  /**
   * Checks whether an element or any ancestor page container is hidden or of the wrong page type
   * @param {HTMLElement|null} el
   * @returns {boolean}
   */
  static _isElementActive(el) {
    if (!el) return false;
    const isShorts = typeof window !== 'undefined' && (window.location?.pathname || '').startsWith('/shorts/');
    let cur = el;
    while (cur) {
      const tag = cur.tagName?.toUpperCase?.() || '';
      if (tag === 'YTD-WATCH-FLEXY' || tag === 'YTD-WATCH-GRID' || tag === 'YTM-WATCH' || tag === 'YTD-SHORTS' || tag === 'YTM-SHORTS') {
        if (cur.hasAttribute?.('hidden') || cur.style?.display === 'none') return false;
        if (isShorts && (tag === 'YTD-WATCH-FLEXY' || tag === 'YTD-WATCH-GRID' || tag === 'YTM-WATCH')) return false;
        if (!isShorts && (tag === 'YTD-SHORTS' || tag === 'YTM-SHORTS')) return false;
      }
      cur = cur.parentNode;
    }
    return true;
  }

  /**
   * Extracts video ID from a Polymer container/response payload object
   * @param {Object|null} data
   * @param {HTMLElement|null} [el]
   * @returns {string}
   */
  static extractContainerVideoId(data, el = null) {
    return data?.videoDetails?.videoId
      || data?.playerResponse?.videoDetails?.videoId
      || data?.currentVideoEndpoint?.watchEndpoint?.videoId
      || data?.currentVideoEndpoint?.reelWatchEndpoint?.videoId
      || data?.endpoint?.reelWatchEndpoint?.videoId
      || data?.endpoint?.watchEndpoint?.videoId
      || el?.getAttribute?.('video-id')
      || '';
  }

  /**
   * Resolves the currently active YouTube player API element strictly matching requestedVideoId when given
   * @param {string} [requestedVideoId]
   * @returns {HTMLElement|null}
   */
  static resolvePlayerElement(requestedVideoId) {
    if (typeof document === 'undefined') return null;
    const candidates = [
      document.getElementById('shorts-player'),
      document.querySelector?.('ytd-reel-video-renderer[is-active] #shorts-player, ytd-reel-video-renderer[is-active] .html5-video-player, ytm-shorts .html5-video-player'),
      document.getElementById('movie_player')
    ].filter(p => p && PlayerElementHelper._isElementActive(p));

    if (candidates.length === 0) return null;
    if (!requestedVideoId) return candidates[0];

    return candidates.find(player => {
      const pid = player.getVideoData?.()?.video_id || player.getPlayerResponse?.()?.videoDetails?.videoId;
      return pid === requestedVideoId;
    }) || null;
  }

  /**
   * Resolves Polymer playerData/data from the active visible Watch or Shorts container strictly matching requestedVideoId
   * @param {string} [requestedVideoId]
   * @returns {Object|null}
   */
  static resolveContainerPlayerData(requestedVideoId) {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return null;
    const prioritySelectors = [
      'ytd-reel-video-renderer[is-active], ytm-reel-video-renderer[is-active]',
      'ytd-shorts:not([hidden]), ytm-shorts:not([hidden])',
      'ytd-watch-flexy:not([hidden]), ytd-watch-grid:not([hidden]), ytm-watch:not([hidden])'
    ];
    for (const sel of prioritySelectors) {
      const containers = Array.from(document.querySelectorAll(sel) || []);
      for (const el of containers) {
        if (!PlayerElementHelper._isElementActive(el)) continue;
        const data = el?.playerData || el?.data;
        if (!data) continue;
        const vid = PlayerElementHelper.extractContainerVideoId(data, el);
        if (requestedVideoId) {
          if (vid === requestedVideoId) return data?.playerResponse || data;
        } else {
          return data?.playerResponse || data;
        }
      }
    }
    return null;
  }

  /**
   * Extracts video ID embedded inside window.ytInitialData across watch and reel endpoints
   * @param {Object} [initialData]
   * @returns {string}
   */
  static extractInitialDataVideoId(initialData) {
    return initialData?.currentVideoEndpoint?.watchEndpoint?.videoId
      || initialData?.currentVideoEndpoint?.reelWatchEndpoint?.videoId
      || '';
  }
}

export default PlayerElementHelper;
