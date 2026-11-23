import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseColor,
  relativeLuminance,
  contrastRatio,
  blendOver,
  adaptColorForBackground,
  buildTierCssVars
} from '../src/domain/services/ColorContrastHelper.js';
import { ScoreTierScale, SCORE_TIERS_5PCT } from '../src/domain/services/ScoreTierScale.js';
import { SensationalismScale } from '../src/domain/services/SensationalismScale.js';
import { ThemeManager } from '../src/content/ui/ThemeManager.js';
import { WebAuditVisualRenderer } from '../src/content/ui/WebAuditVisualRenderer.js';
import { AuditVisualDashboard } from '../src/content/ui/AuditVisualDashboard.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';

describe('Dynamic Adaptive WCAG Contrast for Audit Score Tiers & Host Themes', () => {
  it('enforces >= 5.0 contrast ratio for every 5% tier color on light, tinted, and dark backgrounds', () => {
    const lightWhite = parseColor('#ffffff');
    const lightGreenHero = blendOver({ r: 46, g: 160, b: 67, a: 0.15 }, lightWhite);
    const warmCream = parseColor('#fef3c7');
    const darkSlate = parseColor('#0f172a');

    for (const tier of SCORE_TIERS_5PCT) {
      const { inkLightHex, inkDarkHex, cssVars } = buildTierCssVars(tier.hex);
      assert.ok(cssVars.includes(`--yt-ai-tier:${tier.hex}`));
      assert.ok(cssVars.includes(`--yt-ai-tier-light:${inkLightHex}`));
      assert.ok(cssVars.includes(`--yt-ai-tier-dark:${inkDarkHex}`));

      const cWhite = contrastRatio(parseColor(inkLightHex), lightWhite);
      const cHero = contrastRatio(parseColor(inkLightHex), lightGreenHero);
      const cDark = contrastRatio(parseColor(inkDarkHex), darkSlate);

      assert.ok(cWhite >= 5.0, `Tier ${tier.min}-${tier.max} light ink ${inkLightHex} on white contrast=${cWhite.toFixed(2)}`);
      assert.ok(cHero >= 4.5, `Tier ${tier.min}-${tier.max} light ink ${inkLightHex} on tinted card contrast=${cHero.toFixed(2)}`);
      assert.ok(cDark >= 5.0, `Tier ${tier.min}-${tier.max} dark ink ${inkDarkHex} on dark slate contrast=${cDark.toFixed(2)}`);

      const adaptedCream = adaptColorForBackground(tier.hex, warmCream, 5.0);
      assert.ok(
        contrastRatio(parseColor(adaptedCream), warmCream) >= 5.0,
        `Tier ${tier.min}-${tier.max} on cream contrast`
      );
    }
  });

  it('preserves vibrant lime #a3e635 on dark mode while darkening it dynamically on light backgrounds', () => {
    const darkInk = adaptColorForBackground('#a3e635', '#0f172a', 5.0);
    const lightInk = adaptColorForBackground('#a3e635', '#ffffff', 5.0);

    assert.equal(darkInk.toLowerCase(), '#a3e635');
    assert.notEqual(lightInk.toLowerCase(), '#a3e635');
    assert.ok(relativeLuminance(parseColor(lightInk)) < 0.165);
    assert.ok(contrastRatio(parseColor(lightInk), parseColor('#ffffff')) >= 5.0);
  });

  it('handles mid-tone host backgrounds gracefully by choosing highest-contrast direction', () => {
    const midGray = parseColor('#cbd5e1');
    const slateMid = parseColor('#64748b');

    const limeOnSlate = adaptColorForBackground('#a3e635', midGray, 4.8);
    assert.ok(contrastRatio(parseColor(limeOnSlate), midGray) >= 4.8);

    const yellowOnMid = adaptColorForBackground('#facc15', slateMid, 4.5);
    assert.ok(contrastRatio(parseColor(yellowOnMid), slateMid) >= 4.5);
  });

  it('exposes inkLightHex, inkDarkHex, and cssVars in ScoreTierScale and SensationalismScale without breaking hexColor', () => {
    const t75 = ScoreTierScale.getTier(75, 'fr');
    assert.equal(t75.hexColor, '#a3e635');
    assert.match(t75.inkLightHex, /^#[0-9a-f]{6}$/i);
    assert.match(t75.inkDarkHex, /^#[0-9a-f]{6}$/i);
    assert.ok(t75.cssVars.includes('--yt-ai-tier:#a3e635'));
    assert.ok(contrastRatio(parseColor(t75.inkLightHex), parseColor('#ffffff')) >= 5.0);

    const s10 = SensationalismScale.getProfile(10, [], 'fr');
    assert.equal(s10.hexColor, '#84cc16');
    assert.match(s10.inkLightHex, /^#[0-9a-f]{6}$/i);
    assert.ok(contrastRatio(parseColor(s10.inkLightHex), parseColor('#ffffff')) >= 5.0);
  });

  it('renders adaptive CSS variable tokens instead of raw light hex colors in hero cards & axes', () => {
    const heroWeb = WebAuditVisualRenderer.renderHeroCard(75, 'fr', '[SCORE: 75/100]');
    assert.ok(heroWeb.includes('--yt-ai-tier:#a3e635;'));
    assert.ok(heroWeb.includes('--yt-ai-tier-light:'));
    assert.ok(!heroWeb.includes('color:#a3e635'), 'Must not hardcode washed-out lime text color inline');

    const ctrl = new AuditViewController();
    const heroYt = ctrl.renderAuditHeroCard({
      reliabilityScore: 76,
      rawMarkdown: '[AXES: Logique=75, Sources=60, Transparence=80, Faits=85]',
      getReliabilityBadge: () => ({ label: 'Vigilance', color: '#d29922' }),
      getGranularTier: (lang) => ScoreTierScale.getTier(76, lang)
    }, 'fr');
    assert.ok(heroYt.includes('--yt-ai-tier:#a3e635;'));
    assert.ok(!heroYt.includes('color:#a3e635'));

    const metrics = AuditVisualDashboard.parseVisualMetrics('[AXES: Logique=75, Sources=60, Transparence=80, Faits=85]', 'fr');
    const dash = AuditVisualDashboard.renderVisualDashboard(metrics, 75, 'fr');
    assert.ok(dash.includes('--yt-ai-tier:#a3e635;'));
    assert.ok(dash.includes('--yt-ai-tier:#facc15;'));
    assert.ok(!dash.includes('color:#facc15'));
  });

  it('ThemeManager.applyDynamicWebTheme sets live status contrast vars and adapts descendant --yt-ai-tier elements', () => {
    const origDoc = globalThis.document;
    const origGetComputed = globalThis.getComputedStyle;

    try {
      const makeStyleStore = () => {
        const map = new Map();
        return {
          setProperty: (k, v) => map.set(k, String(v)),
          getPropertyValue: (k) => map.get(k) || '',
          colorScheme: ''
        };
      };

      const childStyle = makeStyleStore();
      childStyle.setProperty('--yt-ai-tier', '#a3e635');
      const pillEl = {
        style: childStyle,
        dataset: {}
      };

      const containerStyle = makeStyleStore();
      const classSet = new Set();
      const container = {
        style: containerStyle,
        dataset: {},
        classList: {
          toggle: (cls, force) => (force ? classSet.add(cls) : classSet.delete(cls)),
          add: (cls) => classSet.add(cls),
          remove: (cls) => classSet.delete(cls),
          contains: (cls) => classSet.has(cls)
        },
        querySelectorAll: (sel) => (sel.includes('--yt-ai-tier') ? [pillEl] : [])
      };

      const headerEl = { tagName: 'HEADER' };
      const bodyEl = { tagName: 'BODY' };
      globalThis.document = {
        body: bodyEl,
        documentElement: { tagName: 'HTML' },
        querySelector: (sel) => (sel.includes('header') ? headerEl : null),
        querySelectorAll: () => []
      };

      // Light host page (#ffffff)
      globalThis.getComputedStyle = (el) => {
        if (el === headerEl || el === bodyEl) {
          return { backgroundColor: 'rgb(255, 255, 255)', fontFamily: 'Inter, sans-serif' };
        }
        return { backgroundColor: 'rgba(0, 0, 0, 0)', getPropertyValue: (k) => containerStyle.getPropertyValue(k) };
      };

      const isDarkLight = ThemeManager.applyDynamicWebTheme(container);
      assert.equal(isDarkLight, false);
      const statusGoodLight = containerStyle.getPropertyValue('--yt-ai-status-good');
      const statusWarnLight = containerStyle.getPropertyValue('--yt-ai-status-warn');
      assert.ok(contrastRatio(parseColor(statusGoodLight), parseColor('#ffffff')) >= 5.0);
      assert.ok(contrastRatio(parseColor(statusWarnLight), parseColor('#ffffff')) >= 5.0);

      const dynPillLight = childStyle.getPropertyValue('--yt-ai-tier-dyn');
      assert.match(dynPillLight, /^#[0-9a-f]{6}$/i);
      assert.ok(contrastRatio(parseColor(dynPillLight), parseColor('#ffffff')) >= 5.0);

      // Dark host page (#0f172a)
      globalThis.getComputedStyle = (el) => {
        if (el === headerEl || el === bodyEl) {
          return { backgroundColor: 'rgb(15, 23, 42)', fontFamily: 'Inter, sans-serif' };
        }
        return { backgroundColor: 'rgba(0, 0, 0, 0)', getPropertyValue: (k) => containerStyle.getPropertyValue(k) };
      };

      const isDarkDark = ThemeManager.applyDynamicWebTheme(container);
      assert.equal(isDarkDark, true);
      const dynPillDark = childStyle.getPropertyValue('--yt-ai-tier-dyn');
      assert.equal(dynPillDark.toLowerCase(), '#a3e635');
    } finally {
      globalThis.document = origDoc;
      globalThis.getComputedStyle = origGetComputed;
    }
  });
});
