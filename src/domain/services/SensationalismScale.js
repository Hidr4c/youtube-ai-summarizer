import { buildTierCssVars } from './ColorContrastHelper.js';

/**
 * Inverted Sensationalism & Clickbait Severity Scale (0% = Sober/Factual, 100% = Clickbait)
 * Computes semantic rating, radial gauge sweep, continuous spectrum position, and per-video bracket breakdown.
 */

export const SENSATIONALISM_LEVELS = [
  {
    min: 0, max: 4, level: 'sober', hex: '#10b981', macro: 'success',
    frLabel: 'Sobriété factuelle',
    enLabel: 'Factual Sobriety',
    frDesc: 'Titres neutres et fidèles au contenu, sans exagération notable.',
    enDesc: 'Neutral, content-faithful titles with negligible exaggeration.'
  },
  {
    min: 5, max: 14, level: 'mild', hex: '#84cc16', macro: 'success',
    frLabel: 'Accroches légères',
    enLabel: 'Light Editorial Hooks',
    frDesc: 'Fond rigoureux avec quelques formulations dynamiques ou accrocheuses.',
    enDesc: 'Rigorous substance paired with occasional attention-grabbing titles.'
  },
  {
    min: 15, max: 29, level: 'moderate', hex: '#eab308', macro: 'warning',
    frLabel: 'Hyperboles modérées',
    enLabel: 'Moderate Hyperbole',
    frDesc: 'Effets d’annonce fréquents ; vigilance conseillée face aux titres.',
    enDesc: 'Frequent hype framing; verify title promises against actual substance.'
  },
  {
    min: 30, max: 49, level: 'high', hex: '#f97316', macro: 'danger',
    frLabel: 'Sensationnalisme marqué',
    enLabel: 'Marked Sensationalism',
    frDesc: 'Décalage récurrent entre la promesse des titres et les faits exposés.',
    enDesc: 'Recurring gap between sensationalized promises and real evidence.'
  },
  {
    min: 50, max: 100, level: 'clickbait', hex: '#ef4444', macro: 'danger',
    frLabel: 'Clickbait prononcé',
    enLabel: 'Heavy Clickbait',
    frDesc: 'Dramatisation systématique ou accroches fortement trompeuses.',
    enDesc: 'Systematic dramatization, bait framing, or misleading promises.'
  }
];

export const SENSATIONALISM_BUCKETS = [
  { id: 'sober', min: 0, max: 9, range: '0–9%', hex: '#10b981', fr: 'Factuel', en: 'Factual' },
  { id: 'mild', min: 10, max: 24, range: '10–24%', hex: '#84cc16', fr: 'Accrocheur', en: 'Mild Hook' },
  { id: 'moderate', min: 25, max: 44, range: '25–44%', hex: '#eab308', fr: 'Hyperbole', en: 'Hyperbole' },
  { id: 'high', min: 45, max: 69, range: '45–69%', hex: '#f97316', fr: 'Sensationnel', en: 'Sensational' },
  { id: 'clickbait', min: 70, max: 100, range: '70–100%', hex: '#ef4444', fr: 'Clickbait', en: 'Clickbait' }
];

export const SENSATIONALISM_SPECTRUM_GRADIENT =
  'linear-gradient(90deg, #10b981 0%, #84cc16 14%, #eab308 32%, #f97316 55%, #ef4444 100%)';

export class SensationalismScale {
  /**
   * Computes complete visualization metadata for a channel's sensationalism index
   * and per-video sensationalism distribution.
   * @param {number} rawIndex Global clickbait/sensationalism index (0..100)
   * @param {Array<Object>} [evaluatedVideos=[]] Videos with optional numeric clickbait property
   * @param {string} [lang='fr']
   * @returns {Object}
   */
  static getProfile(rawIndex, evaluatedVideos = [], lang = 'fr') {
    const index = Math.max(0, Math.min(100, Math.round(Number(rawIndex) || 0)));
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');

    const levelDef =
      SENSATIONALISM_LEVELS.find((l) => index >= l.min && index <= l.max) ||
      SENSATIONALISM_LEVELS[SENSATIONALISM_LEVELS.length - 1];

    const sweepDeg = index === 0 ? 0 : Math.max(10, Math.round((index / 100) * 360));
    const markerPct = Math.max(2, Math.min(98, index));
    const ringBackground = `conic-gradient(${levelDef.hex} 0deg ${sweepDeg}deg, rgba(255, 255, 255, 0.09) ${sweepDeg}deg 360deg)`;

    const validVideos = (Array.isArray(evaluatedVideos) ? evaluatedVideos : []).filter(
      (v) => typeof v?.clickbait === 'number' && !Number.isNaN(v.clickbait)
    );
    const total = validVideos.length;

    const counts = SENSATIONALISM_BUCKETS.map(() => 0);
    for (const video of validVideos) {
      const cb = Math.max(0, Math.min(100, Math.round(video.clickbait)));
      const idx = SENSATIONALISM_BUCKETS.findIndex((b) => cb >= b.min && cb <= b.max);
      if (idx >= 0) counts[idx] += 1;
    }

    const buckets = SENSATIONALISM_BUCKETS.map((b, i) => {
      const count = counts[i];
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        id: b.id,
        range: b.range,
        label: isFr ? b.fr : b.en,
        hex: b.hex,
        count,
        pct
      };
    });

    return {
      index,
      level: levelDef.level,
      macroColor: levelDef.macro,
      hexColor: levelDef.hex,
      ...buildTierCssVars(levelDef.hex),
      label: isFr ? levelDef.frLabel : levelDef.enLabel,
      description: isFr ? levelDef.frDesc : levelDef.enDesc,
      sweepDeg,
      markerPct,
      ringBackground,
      spectrumGradient: SENSATIONALISM_SPECTRUM_GRADIENT,
      hasVideoBreakdown: total > 0,
      videoSampleCount: total,
      buckets
    };
  }
}

export default SensationalismScale;
