/**
 * Stateless DOM rules for shifting fixed, sticky, and absolute elements
 * below the top banner and restoring their original inline styles.
 */

const RESTORE_SPECS = [
  ['[data-yt-ai-orig-top]', 'ytAiOrigTop', 'ytAiOrigTopInline', 'top', 'top'],
  ['[data-yt-ai-orig-abs-top]', 'ytAiOrigAbsTop', 'ytAiOrigAbsTopInline', 'top', 'top'],
  ['[data-yt-ai-orig-maxh]', 'ytAiOrigMaxh', 'ytAiOrigMaxh', 'maxHeight', 'max-height'],
  ['[data-yt-ai-orig-z]', 'ytAiOrigZ', '', 'zIndex', 'z-index']
];

export function hasFixedContainingAncestor(el, fixedSet, getStyle, bannerHeight) {
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const ps = getStyle(p);
    const createsCb = ps && ((ps.transform && ps.transform !== 'none') || (ps.filter && ps.filter !== 'none')
      || (ps.perspective && ps.perspective !== 'none') || /transform|filter|perspective/.test(ps.willChange || ''));
    if (createsCb) {
      if (fixedSet.has(p) || p.dataset?.ytAiOrigTop !== undefined || p.dataset?.ytAiOrigAbsTop !== undefined) return true;
      const pr = typeof p.getBoundingClientRect === 'function' ? p.getBoundingClientRect() : null;
      if (pr && pr.top >= bannerHeight) return true;
    }
    p = p.parentElement;
  }
  return false;
}

export function collectFixedCandidate(el, style, bannerHeight, outList) {
  const alreadyTracked = el.dataset?.ytAiOrigTop !== undefined;
  const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
  if (!rect || rect.height <= 0 || rect.width <= 0) return 0;
  if (!alreadyTracked && (rect.bottom <= 0 || (style.top === 'auto' && rect.top >= bannerHeight))) return 0;
  const parsedTop = parseFloat(style.top);
  const baseTop = alreadyTracked ? (parseFloat(el.dataset.ytAiOrigTop) || 0) : (Number.isFinite(parsedTop) ? parsedTop : rect.top);
  outList.push({ el, baseTop, rect, alreadyTracked });
  return (baseTop < bannerHeight && rect.height <= 200) ? baseTop + rect.height : 0;
}

export function syncFullVhMaxHeight(el, fixedShift) {
  if (el.dataset?.ytAiFullVh !== '1') return;
  if (fixedShift > 0) {
    el.style.setProperty('max-height', `calc(100vh - ${fixedShift}px)`, 'important');
  } else if (el.dataset.ytAiOrigMaxh) {
    el.style.maxHeight = el.dataset.ytAiOrigMaxh;
  } else {
    el.style?.removeProperty?.('max-height');
  }
}

export function shiftFixedCandidate({ el, baseTop, rect, alreadyTracked }, topChromeBottom, fixedShift, trackedFixed) {
  if (!alreadyTracked) {
    if (rect.top > topChromeBottom + 4) return;
    el.dataset.ytAiOrigTopInline = el.style.top || '';
    el.dataset.ytAiOrigTop = String(baseTop);
    const vh = typeof window !== 'undefined' ? (window.innerHeight || 0) : 0;
    if (vh > 0 && rect.height >= vh - 4 && baseTop <= 2 && el.dataset.ytAiOrigMaxh === undefined) {
      el.dataset.ytAiOrigMaxh = el.style.maxHeight || '';
      el.dataset.ytAiFullVh = '1';
    }
  }
  trackedFixed.add(el);
  const trackedBase = parseFloat(el.dataset.ytAiOrigTop) || 0;
  el.style.setProperty('top', `${trackedBase + fixedShift}px`, 'important');
  syncFullVhMaxHeight(el, fixedShift);
}

export function shiftStickyCandidate(el, style, bannerHeight, fixedShift, fixedSet, trackedFixed) {
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    if (fixedSet.has(p) || p.dataset?.ytAiOrigTop !== undefined || p.dataset?.ytAiOrigAbsTop !== undefined) return;
    p = p.parentElement;
  }
  const alreadyTracked = el.dataset?.ytAiOrigTop !== undefined;
  const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
  if (!alreadyTracked) {
    if (!rect || rect.height <= 0 || rect.width <= 0 || rect.bottom <= 0 || rect.top >= bannerHeight) return;
    const parsedTop = parseFloat(style.top);
    el.dataset.ytAiOrigTopInline = el.style.top || '';
    el.dataset.ytAiOrigTop = String(Number.isFinite(parsedTop) ? parsedTop : rect.top);
  }
  trackedFixed.add(el);
  const baseTop = parseFloat(el.dataset.ytAiOrigTop) || 0;
  el.style.setProperty('top', `${baseTop + fixedShift}px`, 'important');
}

export function shiftOverlappingAbsoluteElement(el, style, bannerHeight, scrollY) {
  const op = el.offsetParent;
  if (op && typeof document !== 'undefined' && op !== document.body && op !== document.documentElement) return;
  const alreadyTracked = el.dataset?.ytAiOrigAbsTop !== undefined;
  const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
  if (!alreadyTracked) {
    if (!rect || rect.height <= 0 || rect.width <= 0) return;
    const docTop = rect.top + scrollY;
    const docBottom = rect.bottom + scrollY;
    if (docBottom <= 0 || docTop >= bannerHeight) return;
    const parsedTop = parseFloat(style.top);
    el.dataset.ytAiOrigAbsTopInline = el.style.top || '';
    el.dataset.ytAiOrigAbsTop = String(Number.isFinite(parsedTop) ? parsedTop : docTop);
  }
  const baseTop = parseFloat(el.dataset.ytAiOrigAbsTop) || 0;
  el.style.setProperty('top', `${baseTop + bannerHeight}px`, 'important');
}

export function clampOverlappingHighZIndex(el, style, bannerHeight) {
  if (style.pointerEvents === 'none' || style.position === 'static') return;
  const zVal = parseInt(style.zIndex, 10);
  if (!Number.isFinite(zVal) || zVal < 2147483647) return;
  const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
  if (!rect || rect.height <= 0 || rect.width <= 0 || rect.bottom <= 0 || rect.top >= bannerHeight) return;
  if (el.dataset && el.dataset.ytAiOrigZ === undefined) {
    el.dataset.ytAiOrigZ = el.style.zIndex || '';
  }
  el.style.setProperty('z-index', '2147483646', 'important');
}

export function restoreElementOverrides() {
  for (const [sel, valKey, inlineKey, styleProp, cssProp] of RESTORE_SPECS) {
    for (const el of document.querySelectorAll(sel)) {
      const orig = (inlineKey ? el.dataset[inlineKey] : el.dataset[valKey]) || '';
      if (orig) el.style[styleProp] = orig;
      else el.style?.removeProperty?.(cssProp);
      delete el.dataset[valKey];
      if (inlineKey) delete el.dataset[inlineKey];
      if (valKey === 'ytAiOrigMaxh') delete el.dataset.ytAiFullVh;
    }
  }
}
