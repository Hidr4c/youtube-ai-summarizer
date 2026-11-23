/**
 * Pure WCAG 2.1 relative-luminance and dynamic foreground contrast solver.
 * Adapts tier, status, and chart colors against any host background surface
 * (light, dark, tinted, or mid-tone) while preserving original hue identity.
 */

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(Number(n) || 0)));
}

export function parseColor(input) {
  if (!input) return null;
  if (typeof input === 'object' && typeof input.r === 'number' && typeof input.g === 'number' && typeof input.b === 'number') {
    return {
      r: clampByte(input.r),
      g: clampByte(input.g),
      b: clampByte(input.b),
      a: typeof input.a === 'number' ? Math.max(0, Math.min(1, input.a)) : 1
    };
  }
  const str = String(input).trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str);
  if (hexMatch) {
    const raw = hexMatch[1];
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1
    };
  }
  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(str);
  if (rgbMatch) {
    return {
      r: clampByte(rgbMatch[1]),
      g: clampByte(rgbMatch[2]),
      b: clampByte(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, Number(rgbMatch[4]))) : 1
    };
  }
  return null;
}

export function toHex(rgb) {
  const c = parseColor(rgb);
  if (!c) return '#000000';
  const hex = (n) => clampByte(n).toString(16).padStart(2, '0');
  return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
}

export function blendOver(fgInput, bgInput) {
  const fg = parseColor(fgInput);
  const bg = parseColor(bgInput) || { r: 255, g: 255, b: 255, a: 1 };
  if (!fg) return bg;
  const a = fg.a ?? 1;
  return {
    r: clampByte(fg.r * a + bg.r * (1 - a)),
    g: clampByte(fg.g * a + bg.g * (1 - a)),
    b: clampByte(fg.b * a + bg.b * (1 - a)),
    a: 1
  };
}

function linearizeChannel(byte) {
  const s = clampByte(byte) / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color) {
  const c = parseColor(color);
  if (!c) return 0;
  return 0.2126 * linearizeChannel(c.r) + 0.7152 * linearizeChannel(c.g) + 0.0722 * linearizeChannel(c.b);
}

export function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const v = clampByte(l * 255);
    return { r: v, g: v, b: v, a: 1 };
  }
  const hue2rgb = (p, q, t) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clampByte(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, h) * 255),
    b: clampByte(hue2rgb(p, q, h - 1 / 3) * 255),
    a: 1
  };
}

export function adaptColorForBackground(fgInput, bgInput, minRatio = 5.0) {
  const fg = parseColor(fgInput);
  const bg = parseColor(bgInput);
  if (!fg) return '#0f172a';
  if (!bg) return toHex(fg);

  if (contrastRatio(fg, bg) >= minRatio) return toHex(fg);

  const hsl = rgbToHsl(fg);
  const bgLum = relativeLuminance(bg);
  const darkPole = { r: 0, g: 0, b: 0, a: 1 };
  const lightPole = { r: 255, g: 255, b: 255, a: 1 };
  const cDark = contrastRatio(darkPole, bg);
  const cLight = contrastRatio(lightPole, bg);

  const tryLightnessSearch = (targetPoleL) => {
    let low = Math.min(hsl.l, targetPoleL);
    let high = Math.max(hsl.l, targetPoleL);
    let best = targetPoleL === 0 ? darkPole : lightPole;
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      const cand = hslToRgb({ h: hsl.h, s: hsl.s, l: mid });
      const ok = contrastRatio(cand, bg) >= minRatio;
      if (targetPoleL === 0) {
        if (ok) { best = cand; low = mid; } else { high = mid; }
      } else {
        if (ok) { best = cand; high = mid; } else { low = mid; }
      }
    }
    return toHex(best);
  };

  const preferDark = bgLum > 0.179;
  if (preferDark && cDark >= minRatio) return tryLightnessSearch(0);
  if (!preferDark && cLight >= minRatio) return tryLightnessSearch(1);
  if (cDark >= minRatio) return tryLightnessSearch(0);
  if (cLight >= minRatio) return tryLightnessSearch(1);
  return cDark >= cLight ? '#000000' : '#ffffff';
}

const LIGHT_CARD_SURFACE = blendOver({ r: 46, g: 160, b: 67, a: 0.15 }, { r: 255, g: 255, b: 255, a: 1 });
const DARK_CARD_SURFACE = { r: 27, g: 35, b: 48, a: 1 };

export function buildTierCssVars(baseHex) {
  const norm = toHex(parseColor(baseHex) || { r: 34, g: 197, b: 94, a: 1 });
  const inkLightHex = adaptColorForBackground(norm, LIGHT_CARD_SURFACE, 5.0);
  const inkDarkHex = adaptColorForBackground(norm, DARK_CARD_SURFACE, 5.0);
  return {
    inkLightHex,
    inkDarkHex,
    cssVars: `--yt-ai-tier:${norm};--yt-ai-tier-light:${inkLightHex};--yt-ai-tier-dark:${inkDarkHex};`
  };
}

export const ColorContrastHelper = {
  parseColor,
  toHex,
  blendOver,
  relativeLuminance,
  contrastRatio,
  adaptColorForBackground,
  buildTierCssVars
};

export default ColorContrastHelper;
