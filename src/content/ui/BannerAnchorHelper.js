import { isShortsPage, isWebPageMode, isWatchPage, isChannelPage } from './NavigationObserver.js';

const NON_VISUAL_TAGS = new Set(['IRON-MEDIA-QUERY', 'DOM-IF', 'TEMPLATE', 'STYLE', 'SCRIPT']);

/**
 * Finds the first visible (non-hidden) element matching selector, falling back to first match for mocks
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
export function findVisibleContainer(selector) {
  if (typeof document === 'undefined') return null;
  const all = typeof document.querySelectorAll === 'function' ? Array.from(document.querySelectorAll(selector) || []) : [];
  if (all.length > 0) {
    const visible = all.find(el => el && !el.hasAttribute?.('hidden') && el.style?.display !== 'none');
    return visible || all[0];
  }
  return document.querySelector?.(selector) || null;
}

/**
 * Resolves a direct child anchor node matching preferred IDs inside a container
 * @param {HTMLElement} container
 * @param {string[]} candidateIds
 * @returns {Node|null}
 */
function findAnchorNode(container, candidateIds) {
  const directChildren = Array.from(container.children || []);
  const directAnchor = directChildren.find(c => candidateIds.includes(c.id));
  if (directAnchor) return directAnchor;

  for (const id of candidateIds) {
    const node = container.querySelector?.(`#${id}`);
    if (node && node.parentNode === container) return node;
  }

  return directChildren.find(c => c.tagName && !NON_VISUAL_TAGS.has(c.tagName.toUpperCase()))
    || container.firstElementChild || null;
}

/**
 * Resolves anchor child inside watch container before which banner is inserted
 * @param {HTMLElement} watchContainer
 * @returns {Node|null}
 */
export function resolveWatchAnchor(watchContainer) {
  if (!watchContainer) return null;
  if (watchContainer.tagName?.toUpperCase() === 'YTM-WATCH') {
    return watchContainer.querySelector?.('ytm-single-column-watch-next-results-renderer, .watch-below-the-player')
      || watchContainer.firstElementChild || null;
  }
  return findAnchorNode(watchContainer, ['full-bleed-container', 'player-full-bleed-container', 'player-theater-container', 'columns']);
}

/**
 * Resolves anchor child inside YouTube Shorts container before which banner is inserted
 * @param {HTMLElement} shortsContainer
 * @returns {Node|null}
 */
export function resolveShortsAnchor(shortsContainer) {
  if (!shortsContainer) return null;
  if (shortsContainer.tagName?.toUpperCase() === 'YTM-SHORTS') {
    return shortsContainer.querySelector?.('#shorts-container, ytm-reel-video-renderer, .reel-video-in-sequence')
      || shortsContainer.firstElementChild || null;
  }
  return findAnchorNode(shortsContainer, ['shorts-container', 'shorts-inner-container']);
}

/**
 * Resolves safe top-of-page host anchor (above site masthead/navbar) across Web, Watch and Shorts pages.
 * @param {string} [url]
 * @returns {{ parent: HTMLElement|null, refChild: Node|null, isShorts: boolean, isWebPage: boolean }}
 */
export function resolveInjectionTarget(url) {
  if (typeof document === 'undefined' || !document.body) {
    return { parent: null, refChild: null, isShorts: false, isWebPage: false };
  }
  const webMode = isWebPageMode(url);
  const shortsMode = !webMode && isShortsPage(url);
  return {
    parent: document.body,
    refChild: document.body.firstElementChild || null,
    isShorts: shortsMode,
    isWebPage: webMode
  };
}

/**
 * Coalesces DOM recovery when a SPA framework hydrates or replaces document.body children
 * after initial injection, re-mounting the banner cleanly without infinite observer loops.
 */
export function createSpaDomRecovery({ state, onRecover }) {
  let scheduled = false;
  return () => {
    if (scheduled || !state?.extensionEnabled || typeof document === 'undefined' || !document.body) return;
    const expectedId = isChannelPage() ? 'yt-ai-channel-companion' : ((isWatchPage() || isWebPageMode()) ? 'yt-ai-summarizer-container' : '');
    if (!expectedId) return;
    const existing = document.getElementById(expectedId);
    const misplaced = Boolean(existing && isWebPageMode() && document.body.firstElementChild !== existing);
    if (existing && existing.isConnected && !misplaced) return;
    scheduled = true;
    const run = () => { scheduled = false; onRecover?.(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 50);
  };
}
