import { isShortsPage, getVideoId } from './NavigationObserver.js';

const PAGE_ROOT_TAGS = new Set([
  'YTD-WATCH-FLEXY', 'YTD-WATCH-GRID', 'YTD-BROWSE', 'YTD-SHORTS', 'YTM-WATCH', 'YTM-SHORTS', 'YTM-BROWSE'
]);
const WATCH_ROOT_TAGS = new Set(['YTD-WATCH-FLEXY', 'YTD-WATCH-GRID', 'YTM-WATCH']);
const SHORTS_ROOT_TAGS = new Set(['YTD-SHORTS', 'YTM-SHORTS']);

/**
 * Verifies that a DOM element belongs to the active, non-hidden YouTube page matching current URL/videoId.
 * Prevents stale DOM scraping from hidden SPA-cached containers (e.g. hidden ytd-watch-flexy leaking into Shorts).
 * @param {HTMLElement|null} el
 * @param {string} [expectedVideoId]
 * @returns {boolean}
 */
export function isActivePageElement(el, expectedVideoId = '') {
  if (!el) return false;
  const targetVid = expectedVideoId || getVideoId();
  const shortsMode = isShortsPage();
  let cur = el;

  while (cur) {
    const tag = cur.tagName?.toUpperCase?.() || '';
    if (PAGE_ROOT_TAGS.has(tag)) {
      if (cur.hasAttribute?.('hidden') || cur.style?.display === 'none') return false;
      if (shortsMode && WATCH_ROOT_TAGS.has(tag)) return false;
      if (!shortsMode && SHORTS_ROOT_TAGS.has(tag)) return false;
      const domVid = cur.getAttribute?.('video-id') || '';
      if (targetVid && domVid && domVid !== targetVid) return false;
    } else if (cur !== el && (cur.hasAttribute?.('hidden') || cur.style?.display === 'none') && !tag.startsWith('YTD-ENGAGEMENT-PANEL')) {
      return false;
    }
    cur = cur.parentNode;
  }
  return true;
}

export default isActivePageElement;
