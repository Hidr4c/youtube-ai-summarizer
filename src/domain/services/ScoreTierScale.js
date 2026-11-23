import { buildTierCssVars } from './ColorContrastHelper.js';

/**
 * Granular 5%-Stepped Audit Scoring Scale & Fine Distribution Calculator
 * Eliminates coarse 3-tier conflation (e.g. distinguishing 76% from 95%)
 * across 20 exact 5% brackets while computing 20-bin histograms, median & spread.
 */

export const SCORE_TIERS_5PCT = [
  { min: 95, max: 100, hex: '#00d9a6', macro: 'success', fr: 'Recommandable : Excellence & Référence', en: 'Benchmark Excellence & Exemplary Rigor' },
  { min: 90, max: 94, hex: '#10b981', macro: 'success', fr: 'Recommandable : Très Haute Fiabilité', en: 'Superior Factual Rigor & Clarity' },
  { min: 85, max: 89, hex: '#22c55e', macro: 'success', fr: 'Recommandable : Haute Rigueur Éditoriale', en: 'High Editorial Integrity' },
  { min: 80, max: 84, hex: '#4ade80', macro: 'success', fr: 'Recommandable : Solide & Factuelle', en: 'Solid & Factual' },
  { min: 75, max: 79, hex: '#a3e635', macro: 'success', fr: 'Recommandable (Nuances mineures)', en: 'Generally Reliable (Minor Nuances)' },
  { min: 70, max: 74, hex: '#d4e157', macro: 'warning', fr: 'Acceptable avec Réserves Ponctuelles', en: 'Acceptable with Minor Caveats' },
  { min: 65, max: 69, hex: '#eab308', macro: 'warning', fr: 'Inégal / Précisions Souhaitables', en: 'Uneven / Sources Recommended' },
  { min: 60, max: 64, hex: '#facc15', macro: 'warning', fr: 'Vigilance Modérée (Raccourcis)', en: 'Moderate Caution (Simplifications)' },
  { min: 55, max: 59, hex: '#f59e0b', macro: 'warning', fr: 'Biais ou Raccourcis Fréquents', en: 'Frequent Biases or Shortcuts' },
  { min: 50, max: 54, hex: '#fb923c', macro: 'warning', fr: 'Passable / Accroches Prononcées', en: 'Borderline / Marked Clickbait' },
  { min: 45, max: 49, hex: '#f97316', macro: 'danger', fr: 'Fragile / Rigueur Insuffisante', en: 'Weak Rigor / Speculative' },
  { min: 40, max: 44, hex: '#ea580c', macro: 'danger', fr: 'Douteux / Biais Marqués', en: 'Questionable / Heavy Bias' },
  { min: 35, max: 39, hex: '#ef4444', macro: 'danger', fr: 'Sensationnalisme Dominant', en: 'Sensationalism Dominant' },
  { min: 30, max: 34, hex: '#dc2626', macro: 'danger', fr: 'Très Biaisé / Sources Absentes', en: 'Heavily Biased / Unverified' },
  { min: 25, max: 29, hex: '#b91c1c', macro: 'danger', fr: 'Contenu Trompeur Fréquent', en: 'Frequently Misleading Content' },
  { min: 20, max: 24, hex: '#991b1b', macro: 'danger', fr: 'Manipulation / Clickbait Agressif', en: 'Aggressive Clickbait & Manipulation' },
  { min: 15, max: 19, hex: '#881337', macro: 'danger', fr: 'Désinformation Caractérisée', en: 'Marked Disinformation' },
  { min: 10, max: 14, hex: '#7f1d1d', macro: 'danger', fr: 'Fiabilité Critique', en: 'Critical Unreliability' },
  { min: 5, max: 9, hex: '#6b0f1a', macro: 'danger', fr: 'Tromperie Systématique', en: 'Systematic Deception' },
  { min: 0, max: 4, hex: '#4c0519', macro: 'danger', fr: 'Totalement Non Fiable', en: 'Completely Unreliable' }
];

export class ScoreTierScale {
  /**
   * Resolves the exact 5% tier metadata for any integer score 0..100
   * @param {number} rawScore
   * @param {string} [lang='fr']
   * @returns {Object}
   */
  static getTier(rawScore, lang = 'fr') {
    const score = Math.max(0, Math.min(100, Math.round(Number(rawScore) || 0)));
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');

    const tierDef = SCORE_TIERS_5PCT.find(t => score >= t.min && score <= t.max) || SCORE_TIERS_5PCT[SCORE_TIERS_5PCT.length - 1];
    const stepIndex = Math.min(19, Math.floor(score === 100 ? 19 : score / 5));
    const rangeLabel = `${tierDef.min}–${tierDef.max}%`;
    const baseLabel = isFr ? tierDef.fr : tierDef.en;

    return {
      score,
      stepIndex,
      min: tierDef.min,
      max: tierDef.max,
      rangeLabel,
      label: `[${rangeLabel}] ${baseLabel}`,
      shortLabel: baseLabel,
      hexColor: tierDef.hex,
      ...buildTierCssVars(tierDef.hex),
      gradient: ScoreTierScale.buildScoreGradient(score, tierDef.hex),
      macroColor: tierDef.macro,
      scoreClass: tierDef.macro === 'success' ? 'yt-ai-score-high' : tierDef.macro === 'warning' ? 'yt-ai-score-med' : 'yt-ai-score-low'
    };
  }

  /**
   * Builds a progressive horizontal spectrum CSS gradient up to the exact target score
   * so 75% (lime-green), 89% (leaf-green), and 95% (emerald-cyan) look distinctly graded.
   * @param {number} rawScore
   * @param {string} [endHex]
   * @returns {string}
   */
  static buildScoreGradient(rawScore, endHex = null) {
    const score = Math.max(1, Math.min(100, Math.round(Number(rawScore) || 0)));
    const targetHex = endHex || (SCORE_TIERS_5PCT.find(t => score >= t.min && score <= t.max) || SCORE_TIERS_5PCT[19]).hex;
    const keyframes = [
      [0, '#ef4444'],
      [42, '#f97316'],
      [62, '#eab308'],
      [75, '#a3e635'],
      [85, '#22c55e'],
      [95, '#00d9a6']
    ];
    const stops = [];
    for (const [pos, hex] of keyframes) {
      if (pos < score) {
        const pct = Math.round((pos / score) * 100);
        stops.push(`${hex} ${pct}%`);
      }
    }
    stops.push(`${targetHex} 100%`);
    return stops.length >= 2 ? `linear-gradient(90deg, ${stops.join(', ')})` : targetHex;
  }

  /**
   * Builds a segment gradient from the active 5%-step histogram bins within [minScore, maxScore].
   * @param {Array<Object>} bins
   * @param {number} minScore
   * @param {number} maxScore
   * @param {string} fallbackHex
   * @returns {string}
   */
  static buildBucketGradient(bins = [], minScore = 0, maxScore = 100, fallbackHex = '#22c55e') {
    const active = (bins || []).filter(b => b.count > 0 && b.min >= minScore && b.max <= maxScore);
    if (active.length === 0) return fallbackHex;
    if (active.length === 1) return `linear-gradient(90deg, ${active[0].hexColor}cc, ${active[0].hexColor})`;
    const total = active.reduce((sum, b) => sum + b.count, 0) || 1;
    let cursor = 0;
    const stops = active.map((b, idx) => {
      const start = Math.round((cursor / total) * 100);
      cursor += b.count;
      const end = idx === active.length - 1 ? 100 : Math.round((cursor / total) * 100);
      return `${b.hexColor} ${start}%, ${b.hexColor} ${end}%`;
    });
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }

  /**
   * Computes a 20-bin (5% step) distribution histogram + median + stdDev + homogeneity verdict
   * @param {Array<Object>} evaluatedVideos
   * @param {string} [lang='fr']
   * @returns {Object}
   */
  static computeDistributionMetrics(evaluatedVideos = [], lang = 'fr') {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const bins = Array.from({ length: 20 }, (_, i) => {
      const min = i * 5;
      const max = i === 19 ? 100 : min + 4;
      const tier = SCORE_TIERS_5PCT[19 - i];
      return { index: i, min, max, label: `${min}-${max}%`, count: 0, pct: 0, hexColor: tier.hex };
    });

    if (!Array.isArray(evaluatedVideos) || evaluatedVideos.length === 0) {
      return {
        bins,
        median: 0,
        stdDev: 0,
        minScore: 0,
        maxScore: 0,
        consistencyLevel: 'unknown',
        consistencyLabel: isFr ? 'Données insuffisantes' : 'Insufficient data'
      };
    }

    const scores = evaluatedVideos
      .map(v => (typeof v.score === 'number' ? Math.max(0, Math.min(100, v.score)) : 50))
      .sort((a, b) => a - b);

    const n = scores.length;
    for (const s of scores) {
      const binIdx = Math.min(19, Math.floor(s === 100 ? 19 : s / 5));
      bins[binIdx].count += 1;
    }
    for (const b of bins) {
      b.pct = Math.round((b.count / n) * 100);
    }

    const mid = Math.floor(n / 2);
    const median = n % 2 === 0 ? Math.round((scores[mid - 1] + scores[mid]) / 2) : scores[mid];
    const mean = scores.reduce((acc, s) => acc + s, 0) / n;
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / n;
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

    let consistencyLevel = 'moderate';
    let consistencyLabel = isFr ? `Régularité modérée (σ = ${stdDev})` : `Moderate consistency (σ = ${stdDev})`;
    if (stdDev <= 6.5) {
      consistencyLevel = 'high';
      consistencyLabel = isFr ? `Ligne très homogène (σ = ${stdDev})` : `Highly consistent (σ = ${stdDev})`;
    } else if (stdDev >= 14) {
      consistencyLevel = 'volatile';
      consistencyLabel = isFr ? `Profil contrasté / irrégulier (σ = ${stdDev})` : `Irregular / polarized profile (σ = ${stdDev})`;
    }

    return {
      bins,
      median,
      stdDev,
      minScore: scores[0],
      maxScore: scores[n - 1],
      consistencyLevel,
      consistencyLabel
    };
  }
}

export default ScoreTierScale;
