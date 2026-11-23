import {
  clampOverlappingHighZIndex,
  collectFixedCandidate,
  hasFixedContainingAncestor,
  restoreElementOverrides,
  shiftFixedCandidate,
  shiftOverlappingAbsoluteElement,
  shiftStickyCandidate,
  syncFullVhMaxHeight
} from './WebPageShifterRules.js';

/** Keeps host pages shifted below the top extension banner. */
export class WebPageLayoutShifter {
  constructor() {
    this._container = null;
    this._resizeObserver = null;
    this._mutationObserver = null;
    this._onScroll = null;
    this._rafId = null;
    this._lateSyncTimers = [];
    this._bannerHeight = 0;
    this._trackedFixed = new Set();
    this._bodyPatched = false;
    this._origBodyPaddingTop = '';
  }

  /** Attaches observers to the injected web-mode banner container. */
  attach(container) {
    if (!container) return;
    this.detach();
    this._container = container;

    if (typeof ResizeObserver === 'function') {
      this._resizeObserver = new ResizeObserver(() => this.scheduleSync());
      this._resizeObserver.observe(container);
    }

    if (typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.body) {
      this._mutationObserver = new MutationObserver((mutations) => {
        if (mutations.some(m => !container.contains?.(m.target))) this.scheduleSync();
      });
      this._mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this._onScroll = () => {
        if (this._bannerHeight > 0) {
          const scrollY = (typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0);
          const fixedShift = Math.max(0, this._bannerHeight - scrollY);
          document.documentElement?.style?.setProperty?.('--yt-ai-shell-offset', `${fixedShift}px`);
          this._syncTrackedFixed(fixedShift);
        }
        this.scheduleSync();
      };
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onScroll, { passive: true });
    }

    this.sync();
    if (typeof setTimeout === 'function') {
      this._lateSyncTimers = [350, 1000, 2200].map(ms => setTimeout(() => this.sync(), ms));
    }
  }

  /** Coalesces layout updates to the next animation frame when available. */
  scheduleSync() {
    if (typeof requestAnimationFrame !== 'function') {
      this.sync();
      return;
    }
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this.sync();
    });
  }

  /** Synchronizes host page offsets with the current banner height. */
  sync() {
    const container = this._container;
    if (!container || !container.isConnected || container.classList?.contains?.('yt-ai-fullscreen-hidden')) {
      this.restore();
      return;
    }
    const isTopShell = container.classList?.contains?.('yt-ai-webpage-mode') || container.classList?.contains?.('yt-ai-top-shell');
    if (!isTopShell) {
      this.restore();
      return;
    }

    const rectH = typeof container.getBoundingClientRect === 'function' ? container.getBoundingClientRect().height : 0;
    const bannerHeight = Math.ceil(rectH || container.offsetHeight || 0);
    if (bannerHeight <= 0 || typeof document === 'undefined' || !document.body) return;
    this._bannerHeight = bannerHeight;

    const scrollY = (typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0);
    const fixedShift = Math.max(0, bannerHeight - scrollY);
    document.documentElement?.style?.setProperty?.('--yt-ai-shell-height', `${bannerHeight}px`);
    document.documentElement?.style?.setProperty?.('--yt-ai-shell-offset', `${fixedShift}px`);

    const getStyle = typeof getComputedStyle === 'function' ? getComputedStyle : null;
    this._syncFlexOrGridBody(container, bannerHeight, getStyle);

    if (!getStyle || typeof document.body.querySelectorAll !== 'function') return;

    const ytTopShell = container.classList?.contains?.('yt-ai-top-shell');
    const ytdApp = (ytTopShell || container.classList?.contains?.('yt-ai-webpage-mode')) ? document.querySelector?.('ytd-app') : null;
    const ignoredTags = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR', 'HR']);
    const fixedCandidates = [];
    const stickyCandidates = [];
    let topChromeBottom = bannerHeight;

    const rootChildren = Array.from(document.documentElement?.children || []).filter(c => c !== document.head && c !== document.body);
    const nodes = [...document.body.querySelectorAll('*'), ...rootChildren];
    for (const el of nodes) {
      if (!el || el === container || container.contains?.(el) || ignoredTags.has(el.tagName)) continue;
      if ((ytdApp && (el === ytdApp || ytdApp.contains?.(el)))
        || (ytTopShell && (el.id === 'masthead-container' || el.id === 'guide' || el.tagName === 'YTD-APP' || el.tagName === 'YTD-MINI-GUIDE-RENDERER'))) {
        continue;
      }

      const style = getStyle(el);
      if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

      if (style.position === 'fixed') {
        const bottom = collectFixedCandidate(el, style, bannerHeight, fixedCandidates);
        if (bottom > topChromeBottom) topChromeBottom = bottom;
      } else if (style.position === 'absolute') {
        shiftOverlappingAbsoluteElement(el, style, bannerHeight, scrollY);
      } else if (style.position === 'sticky' && fixedShift > 0) {
        stickyCandidates.push({ el, style });
      }
      clampOverlappingHighZIndex(el, style, bannerHeight);
    }

    const fixedSet = new Set(fixedCandidates.map(e => e.el));
    for (const entry of fixedCandidates) {
      if (!hasFixedContainingAncestor(entry.el, fixedSet, getStyle, bannerHeight)) {
        shiftFixedCandidate(entry, topChromeBottom, fixedShift, this._trackedFixed);
      }
    }
    for (const { el, style } of stickyCandidates) {
      shiftStickyCandidate(el, style, bannerHeight, fixedShift, fixedSet, this._trackedFixed);
    }
  }

  _syncTrackedFixed(fixedShift) {
    for (const el of this._trackedFixed) {
      if (!el?.isConnected || el.dataset?.ytAiOrigTop === undefined) continue;
      const baseTop = parseFloat(el.dataset.ytAiOrigTop) || 0;
      el.style?.setProperty?.('top', `${baseTop + fixedShift}px`, 'important');
      syncFullVhMaxHeight(el, fixedShift);
    }
  }

  _syncFlexOrGridBody(container, bannerHeight, getStyle) {
    if (!getStyle || !document.body) return;
    const bodyStyle = getStyle(document.body);
    const display = bodyStyle?.display || '';
    const justify = bodyStyle?.justifyContent || '';
    const isRowFlex = (display === 'flex' || display === 'inline-flex') && !(bodyStyle.flexDirection || '').startsWith('column');
    const isCenteredColFlex = (display === 'flex' || display === 'inline-flex') && /^(center|flex-end|end|space-)/i.test(justify);
    const isGrid = display === 'grid' || display === 'inline-grid';

    if (isRowFlex || isCenteredColFlex || isGrid) {
      if (!this._bodyPatched) {
        this._origBodyPaddingTop = document.body.style.paddingTop || '';
        this._bodyPatched = true;
      }
      const basePad = parseFloat(this._origBodyPaddingTop) || 0;
      document.body.style.setProperty('padding-top', `${basePad + bannerHeight}px`, 'important');
      container.style.setProperty('position', 'absolute', 'important');
      container.style.setProperty('top', '0px', 'important');
      container.style.setProperty('left', '0px', 'important');
      container.style.setProperty('right', '0px', 'important');
    } else if (this._bodyPatched) {
      this._restoreBodyPatch(container);
    }
  }

  _restoreBodyPatch(container) {
    if (typeof document !== 'undefined' && document.body && this._bodyPatched) {
      if (this._origBodyPaddingTop) {
        document.body.style.paddingTop = this._origBodyPaddingTop;
      } else {
        document.body.style?.removeProperty?.('padding-top');
      }
      this._bannerHeight = 0;
      this._bodyPatched = false;
    }
    if (container?.style && typeof container.style.removeProperty === 'function') {
      container.style.removeProperty('position');
      container.style.removeProperty('top');
      container.style.removeProperty('left');
      container.style.removeProperty('right');
    }
  }

  /** Restores all host page elements back to their original inline styles. */
  restore() {
    this._trackedFixed.clear();
    this._restoreBodyPatch(this._container);
    if (typeof document === 'undefined') return;
    document.documentElement?.style?.removeProperty?.('--yt-ai-shell-height');
    document.documentElement?.style?.removeProperty?.('--yt-ai-shell-offset');
    if (document.querySelectorAll) restoreElementOverrides();
  }

  /** Disconnects observers and restores host page styles. */
  detach() {
    for (const t of this._lateSyncTimers) clearTimeout(t);
    this._lateSyncTimers = [];
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
    if (this._onScroll && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onScroll);
      this._onScroll = null;
    }
    if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.restore();
    this._container = null;
  }
}

export default WebPageLayoutShifter;
