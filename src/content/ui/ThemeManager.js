import { isYouTubeHost } from './NavigationObserver.js';
import {
  parseColor,
  contrastRatio,
  blendOver,
  adaptColorForBackground
} from '../../domain/services/ColorContrastHelper.js';

let themeObserverAttached = false;
const observedContainers = new WeakSet();

export function parseRgbaColor(colorStr) {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(String(colorStr || ''));
  if (!m) return null;
  const r = Math.max(0, Math.min(255, Number(m[1])));
  const g = Math.max(0, Math.min(255, Number(m[2])));
  const b = Math.max(0, Math.min(255, Number(m[3])));
  const a = m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1;
  return { r, g, b, a };
}

export function computeLuminance({ r, g, b }) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function tintChannel(v, delta) {
  return Math.max(0, Math.min(255, Math.round(v + delta)));
}

function toRgbCss({ r, g, b }) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function pickFirstOpaqueBg(elements, getStyle) {
  for (const el of elements) {
    if (!el) continue;
    const c = parseRgbaColor(getStyle(el)?.backgroundColor);
    if (c && c.a >= 0.35) return c;
  }
  return null;
}

function pickHostAccentColor(container, getStyle) {
  if (typeof document === 'undefined' || !document.querySelectorAll) return null;
  const candidates = document.querySelectorAll('header a, header button, nav a, nav button, a[class*="btn" i], button, a');
  let count = 0;
  for (const el of candidates) {
    if (!el || (container && (el === container || container.contains?.(el)))) continue;
    if (++count > 45) break;
    const st = getStyle(el);
    if (!st || st.display === 'none' || st.visibility === 'hidden') continue;
    for (const prop of ['backgroundColor', 'color', 'borderTopColor']) {
      const c = parseRgbaColor(st[prop]);
      if (!c || c.a < 0.6) continue;
      const spread = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
      if (spread >= 42) return c;
    }
  }
  return null;
}

/**
 * Samples the live computed styles of any non-YouTube host page (background luminance,
 * header surface, font family, and primary accent color) without any hardcoded site rules.
 * @param {HTMLElement} container
 */
export function applyDynamicWebTheme(container) {
  if (!container || typeof document === 'undefined' || typeof getComputedStyle !== 'function') return false;
  const getStyle = getComputedStyle;
  const headerEl = document.querySelector?.('header, nav, [role="banner"]');
  const headerBg = pickFirstOpaqueBg([headerEl], getStyle);
  const pageBg = pickFirstOpaqueBg([
    document.body,
    document.documentElement,
    document.querySelector?.('main, #app, #root'),
    headerEl
  ], getStyle);

  const baseBg = headerBg || pageBg;
  if (!baseBg) return false;

  const isDark = computeLuminance(baseBg) < 0.48;
  container.classList?.toggle?.('yt-ai-dark-theme', isDark);
  container.classList?.toggle?.('yt-ai-light-theme', !isDark);
  if (container.style) container.style.colorScheme = isDark ? 'dark' : 'light';

  const headerTone = headerBg || baseBg;
  const surfaceBg = pageBg || baseBg;
  const expandedDelta = isDark ? 6 : -4;
  const expandedTone = {
    r: tintChannel(surfaceBg.r, expandedDelta),
    g: tintChannel(surfaceBg.g, expandedDelta),
    b: tintChannel(surfaceBg.b, expandedDelta)
  };

  const st = container.style;
  if (!st?.setProperty) return isDark;

  st.setProperty('--yt-ai-bg', toRgbCss(headerTone));
  st.setProperty('--yt-ai-bg-header', toRgbCss(headerTone));
  st.setProperty('--yt-ai-bg-expanded', toRgbCss(expandedTone));
  st.setProperty('--yt-ai-bg-card', isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.045)');
  st.setProperty('--yt-ai-bg-secondary', isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)');
  st.setProperty('--yt-ai-bg-input', toRgbCss(expandedTone));
  st.setProperty('--yt-ai-bg-option', toRgbCss(headerTone));
  st.setProperty('--yt-ai-border', isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.14)');
  st.setProperty('--yt-ai-border-subtle', isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.08)');
  st.setProperty('--yt-ai-text', isDark ? '#f1f5f9' : '#0f172a');
  st.setProperty('--yt-ai-brand-text', isDark ? '#ffffff' : '#0f172a');
  st.setProperty('--yt-ai-text-secondary', isDark ? '#94a3b8' : '#475569');

  const tintedCard = blendOver({ r: isDark ? 255 : 15, g: isDark ? 255 : 23, b: isDark ? 255 : 42, a: isDark ? 0.08 : 0.06 }, surfaceBg);
  st.setProperty('--yt-ai-status-good', adaptColorForBackground('#22c55e', tintedCard, 5.0));
  st.setProperty('--yt-ai-status-warn', adaptColorForBackground('#eab308', tintedCard, 5.0));
  st.setProperty('--yt-ai-status-danger', adaptColorForBackground('#ef4444', tintedCard, 5.0));
  if (container.dataset) {
    container.dataset.ytAiSurfaceRgb = `${Math.round(surfaceBg.r)},${Math.round(surfaceBg.g)},${Math.round(surfaceBg.b)}`;
  }
  adaptContainerTierContrast(container, surfaceBg);

  const bodyFont = document.body ? getStyle(document.body)?.fontFamily : '';
  if (bodyFont) st.setProperty('font-family', bodyFont);

  const accent = pickHostAccentColor(container, getStyle);
  if (accent) {
    const accentCss = toRgbCss(accent);
    const hoverDelta = computeLuminance(accent) < 0.5 ? 20 : -20;
    const hoverCss = toRgbCss({
      r: tintChannel(accent.r, hoverDelta),
      g: tintChannel(accent.g, hoverDelta),
      b: tintChannel(accent.b, hoverDelta)
    });
    const textOnAccent = computeLuminance(accent) > 0.62 ? '#0f172a' : '#ffffff';
    st.setProperty('--yt-ai-accent', accentCss);
    st.setProperty('--yt-ai-accent-hover', hoverCss);
    st.setProperty('--yt-ai-accent-text', textOnAccent);
    st.setProperty('--yt-ai-point-line', accentCss);
    st.setProperty('--yt-ai-timestamp-text', accentCss);
    st.setProperty('--yt-ai-timestamp-border', `rgba(${Math.round(accent.r)}, ${Math.round(accent.g)}, ${Math.round(accent.b)}, 0.35)`);
    st.setProperty('--yt-ai-timestamp-bg', `rgba(${Math.round(accent.r)}, ${Math.round(accent.g)}, ${Math.round(accent.b)}, 0.14)`);
  }

  return isDark;
}

/**
 * Synchronizes container theme with YouTube's native theme tokens
 * or dynamically adapts to any non-YouTube host page's live styles.
 * @param {HTMLElement} [bannerEl]
 */
export function syncThemeWithYouTube(bannerEl) {
  const elements = [
    bannerEl,
    document.getElementById('yt-ai-summarizer-container'),
    document.getElementById('yt-ai-channel-companion'),
    ...(document.querySelectorAll?.('.yt-ai-channel-card') || [])
  ].filter(Boolean);

  if (elements.length === 0) return;

  const onYouTube = typeof window === 'undefined' || !window.location?.href || isYouTubeHost(window.location.href);
  if (!onYouTube) {
    for (const el of elements) {
      applyDynamicWebTheme(el);
      observeContainerContrast(el);
    }
    return;
  }

  const htmlEl = document.documentElement;
  const isDark = htmlEl.hasAttribute('dark') ||
                 htmlEl.getAttribute('dark') === 'true' ||
                 document.body?.classList?.contains('dark-theme') ||
                 window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

  const ytBg = isDark ? { r: 15, g: 15, b: 15 } : { r: 255, g: 255, b: 255 };
  for (const el of elements) {
    if (isDark) {
      el.classList?.remove('yt-ai-light-theme');
      el.classList?.add('yt-ai-dark-theme');
      if (el.style) el.style.colorScheme = 'dark';
    } else {
      el.classList?.remove('yt-ai-dark-theme');
      el.classList?.add('yt-ai-light-theme');
      if (el.style) el.style.colorScheme = 'light';
    }
    if (el.dataset) el.dataset.ytAiSurfaceRgb = `${ytBg.r},${ytBg.g},${ytBg.b}`;
    adaptContainerTierContrast(el, ytBg);
    observeContainerContrast(el);
  }
}

export function adaptContainerTierContrast(container, bgOverride = null) {
  if (!container?.querySelectorAll) return;
  let surface = parseColor(bgOverride);
  if (!surface && container.dataset?.ytAiSurfaceRgb) {
    surface = parseColor(`rgb(${container.dataset.ytAiSurfaceRgb})`);
  }
  if (!surface && typeof getComputedStyle === 'function') {
    const cs = getComputedStyle(container);
    surface = parseColor(cs?.getPropertyValue?.('--yt-ai-bg')) || parseColor(cs?.backgroundColor);
  }
  if (!surface) {
    const isDark = container.classList?.contains?.('yt-ai-dark-theme');
    surface = isDark ? { r: 15, g: 15, b: 15, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  }
  const bgKey = `${surface.r},${surface.g},${surface.b}`;
  const nodes = container.querySelectorAll('[style*="--yt-ai-tier"]');
  for (const el of nodes) {
    const tierHex = el.style?.getPropertyValue?.('--yt-ai-tier')?.trim();
    if (!tierHex) continue;
    if (el.dataset?.ytAiContrastBg === bgKey && el.dataset?.ytAiContrastTier === tierHex) continue;
    const tierRgb = parseColor(tierHex);
    const pillBg = tierRgb ? blendOver({ r: tierRgb.r, g: tierRgb.g, b: tierRgb.b, a: 0.16 }, surface) : surface;
    let ink = adaptColorForBackground(tierHex, pillBg, 5.0);
    if (contrastRatio(parseColor(ink), surface) < 5.0) {
      ink = adaptColorForBackground(ink, surface, 5.0);
    }
    el.style.setProperty('--yt-ai-tier-dyn', ink);
    if (el.dataset) {
      el.dataset.ytAiContrastBg = bgKey;
      el.dataset.ytAiContrastTier = tierHex;
    }
  }
}

function observeContainerContrast(container) {
  if (!container || observedContainers.has(container) || typeof MutationObserver !== 'function') return;
  observedContainers.add(container);
  try {
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        adaptContainerTierContrast(container);
      });
    });
    obs.observe(container, { childList: true, subtree: true });
  } catch (_) {}
}

/**
 * Initializes dynamic MutationObserver for host theme switches.
 * @param {HTMLElement} [banner]
 */
export function initThemeSync(banner) {
  syncThemeWithYouTube(banner);
  if (!themeObserverAttached) {
    themeObserverAttached = true;
    try {
      const themeObserver = new MutationObserver(() => syncThemeWithYouTube());
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dark', 'class']
      });
      if (document.body) {
        themeObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['class', 'style', 'data-theme', 'theme']
        });
      }
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => syncThemeWithYouTube());
      }
    } catch (_) {}
  }
}

export const ThemeManager = { syncThemeWithYouTube, initThemeSync, applyDynamicWebTheme, adaptContainerTierContrast, parseRgbaColor, computeLuminance };
export default ThemeManager;
