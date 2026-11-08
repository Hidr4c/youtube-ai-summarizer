/**
 * Stratified Statistical Sampler for YouTube Channel Audits
 * Samples videos across temporal cohorts with recency weighting to evaluate channel evolution
 */
export class ChannelStatisticalSampler {
  /**
   * Categorizes a video into a temporal era based on metadata string (FR/EN)
   * @param {Object} video
   * @returns {{era: 'recent'|'mid'|'legacy', eraLabel: string, weight: number, yearEstimate: number}}
   */
  static categorizeVideoEra(video = {}) {
    const meta = (video.meta || '').toLowerCase();
    const currentYear = new Date().getFullYear();

    // 1. Multi-year / Legacy (> 1 year ago, e.g. "il y a 2 ans", "3 years ago")
    const yearMatch = meta.match(/(?:il y a\s*(\d+)\s*ans?|(\d+)\s*y(?:ears?|rs?)\s*ago)/);
    if (yearMatch) {
      const yearsAgo = parseInt(yearMatch[1] || yearMatch[2], 10);
      if (yearsAgo >= 2) {
        return {
          era: 'legacy',
          eraLabel: `Historique (~${yearsAgo} ans)`,
          weight: 0.6,
          yearEstimate: Math.max(2010, currentYear - yearsAgo)
        };
      }
      if (yearsAgo === 1) {
        return {
          era: 'mid',
          eraLabel: 'Intermédiaire (~1 an)',
          weight: 1.0,
          yearEstimate: currentYear - 1
        };
      }
    }

    // 2. Month-based resolution: >= 6 months -> mid, < 6 months -> recent
    const monthMatch = meta.match(/(?:il y a\s*(\d+)\s*(?:mois|m\b|m\.)|(\d+)\s*months?\s*ago)/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1] || monthMatch[2], 10);
      if (months >= 6) {
        return {
          era: 'mid',
          eraLabel: `Intermédiaire (~${months} mois)`,
          weight: 1.0,
          yearEstimate: currentYear - 1
        };
      }
      return {
        era: 'recent',
        eraLabel: `Récent (~${months} mois)`,
        weight: 1.5,
        yearEstimate: currentYear
      };
    }

    // 3. Recent period: hours (h), days (j / d), weeks (sem / w), yesterday
    const isRecent = /(?:il y a\s*\d+\s*(?:h\b|j\b|sem|heure|jour|semaine)|(?:hour|day|week)s?\s*ago|hier|yesterday)/.test(meta);
    if (isRecent) {
      return {
        era: 'recent',
        eraLabel: 'Récent (Derniers mois)',
        weight: 1.5,
        yearEstimate: currentYear
      };
    }

    // Default fallback
    return {
      era: 'recent',
      eraLabel: 'Récent',
      weight: 1.5,
      yearEstimate: currentYear
    };
  }

  /**
   * Filters video pool according to a temporal period shortcut
   * @param {Array<Object>} allVideos
   * @param {'all'|'month'|'6months'|'year'} [period='all']
   * @returns {Array<Object>} Filtered videos
   */
  static filterVideosByPeriod(allVideos = [], period = 'all') {
    if (!Array.isArray(allVideos) || allVideos.length === 0 || period === 'all') {
      return allVideos || [];
    }
    const currentYear = new Date().getFullYear();
    return allVideos.filter(v => {
      const meta = (v.meta || '').toLowerCase();
      if (period === 'month') {
        const isDays = /(?:il y a\s*\d+\s*(?:h\b|j\b|sem|heure|jour|semaine)|(?:hour|day|week)s?\s*ago|hier|yesterday)/.test(meta);
        const isOneMonth = /(?:il y a\s*1\s*(?:mois|m\b|m\.)|1\s*month\s*ago)/.test(meta);
        return isDays || isOneMonth;
      }
      if (period === '6months') {
        const isDays = /(?:il y a\s*\d+\s*(?:h\b|j\b|sem|heure|jour|semaine)|(?:hour|day|week)s?\s*ago|hier|yesterday)/.test(meta);
        const m = meta.match(/(?:il y a\s*(\d+)\s*(?:mois|m\b|m\.)|(\d+)\s*months?\s*ago)/);
        return isDays || (m && parseInt(m[1] || m[2], 10) <= 6);
      }
      if (period === 'year') {
        const isDays = /(?:il y a\s*\d+\s*(?:h\b|j\b|sem|heure|jour|semaine)|(?:hour|day|week)s?\s*ago|hier|yesterday)/.test(meta);
        const m = meta.match(/(?:il y a\s*(\d+)\s*(?:mois|m\b|m\.)|(\d+)\s*months?\s*ago)/);
        const isUnderYear = isDays || (m && parseInt(m[1] || m[2], 10) <= 12);
        const isOneYear = /(?:il y a\s*1\s*(?:an|a\b|a\.)|1\s*year\s*ago)/.test(meta);
        return isUnderYear || isOneYear || this.categorizeVideoEra(v).yearEstimate >= currentYear;
      }
      return true;
    });
  }

  /**
   * Selects a stratified statistical sample from a list of channel videos
   * @param {Array<Object>} allVideos
   * @param {Object} [options]
   * @param {number} [options.maxSample=12]
   * @returns {Array<Object>} Stratified sample with era metadata and weights
   */
  static selectStratifiedSample(allVideos = [], options = {}) {
    const { maxSample = 12 } = options;
    if (!Array.isArray(allVideos) || allVideos.length === 0) return [];

    if (allVideos.length <= maxSample) {
      return allVideos.map((v, idx) => {
        const eraInfo = this.categorizeVideoEra(v);
        return { ...v, sampleIndex: idx + 1, ...eraInfo };
      });
    }

    const enriched = allVideos.map((v, idx) => ({
      ...v,
      originalIndex: idx,
      ...this.categorizeVideoEra(v)
    }));

    const recentPool = enriched.filter(v => v.era === 'recent');
    const midPool = enriched.filter(v => v.era === 'mid');
    const legacyPool = enriched.filter(v => v.era === 'legacy');

    const recentQuota = Math.max(3, Math.round(maxSample * 0.60));
    const midQuota = Math.max(1, Math.round(maxSample * 0.25));
    const legacyQuota = Math.max(1, maxSample - recentQuota - midQuota);

    const selectedRecent = recentPool.slice(0, recentQuota);
    const selectedMid = midPool.slice(0, midQuota);
    const selectedLegacy = legacyPool.slice(0, legacyQuota);

    const selectedIds = new Set([
      ...selectedRecent.map(v => v.id),
      ...selectedMid.map(v => v.id),
      ...selectedLegacy.map(v => v.id)
    ]);

    const result = [...selectedRecent, ...selectedMid, ...selectedLegacy];
    for (const v of enriched) {
      if (result.length >= maxSample) break;
      if (!selectedIds.has(v.id)) {
        selectedIds.add(v.id);
        result.push(v);
      }
    }

    return result.map((v, idx) => ({ ...v, sampleIndex: idx + 1 }));
  }

  /**
   * Computes weighted aggregate statistics across evaluated sample videos
   * @param {Array<Object>} evaluatedVideos
   * @returns {Object} Weighted metrics, distribution, and trajectory
   */
  static computeWeightedMetrics(evaluatedVideos = []) {
    if (!Array.isArray(evaluatedVideos) || evaluatedVideos.length === 0) {
      return {
        weightedScore: 50,
        weightedClickbait: 20,
        distribution: { reliable: 0, caution: 0, clickbait: 0 },
        proportions: { reliablePct: 0, cautionPct: 0, clickbaitPct: 0 },
        trajectory: 'stable',
        trajectoryLabel: 'Ligne éditoriale stable',
        eraScores: { recent: null, mid: null, legacy: null }
      };
    }

    let totalWeight = 0;
    let weightedScoreSum = 0;
    let weightedClickbaitSum = 0;

    let reliableCount = 0;
    let cautionCount = 0;
    let clickbaitCount = 0;

    const eraAccumulators = {
      recent: { sum: 0, weight: 0 },
      mid: { sum: 0, weight: 0 },
      legacy: { sum: 0, weight: 0 }
    };

    for (const v of evaluatedVideos) {
      const score = typeof v.score === 'number' ? Math.max(0, Math.min(100, v.score)) : 50;
      const clickbait = typeof v.clickbait === 'number' ? Math.max(0, Math.min(100, v.clickbait)) : 20;
      const weight = typeof v.weight === 'number' ? v.weight : 1.0;
      const era = v.era || 'recent';

      totalWeight += weight;
      weightedScoreSum += score * weight;
      weightedClickbaitSum += clickbait * weight;

      if (score >= 75) reliableCount++;
      else if (score >= 50) cautionCount++;
      else clickbaitCount++;

      if (eraAccumulators[era]) {
        eraAccumulators[era].sum += score * weight;
        eraAccumulators[era].weight += weight;
      }
    }

    const totalCount = evaluatedVideos.length;
    const finalScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 50;
    const finalClickbait = totalWeight > 0 ? Math.round(weightedClickbaitSum / totalWeight) : 20;

    const reliablePct = Math.round((reliableCount / totalCount) * 100);
    const cautionPct = Math.round((cautionCount / totalCount) * 100);
    const clickbaitPct = Math.max(0, 100 - reliablePct - cautionPct);

    const eraScores = {
      recent: eraAccumulators.recent.weight > 0 ? Math.round(eraAccumulators.recent.sum / eraAccumulators.recent.weight) : null,
      mid: eraAccumulators.mid.weight > 0 ? Math.round(eraAccumulators.mid.sum / eraAccumulators.mid.weight) : null,
      legacy: eraAccumulators.legacy.weight > 0 ? Math.round(eraAccumulators.legacy.sum / eraAccumulators.legacy.weight) : null
    };

    let trajectory = 'stable';
    let trajectoryLabel = 'Ligne éditoriale stable';

    const baselineScore = eraScores.mid ?? eraScores.legacy;
    if (eraScores.recent !== null && baselineScore !== null) {
      const diff = eraScores.recent - baselineScore;
      if (diff >= 6) {
        trajectory = 'improving';
        trajectoryLabel = 'En nette progression (rigueur et nuance en hausse)';
      } else if (diff <= -6) {
        trajectory = 'declining';
        trajectoryLabel = 'En baisse de rigueur (sensationnalisme accru)';
      }
    }

    return {
      weightedScore: finalScore,
      weightedClickbait: finalClickbait,
      distribution: {
        reliable: reliableCount,
        caution: cautionCount,
        clickbait: clickbaitCount
      },
      proportions: {
        reliablePct,
        cautionPct,
        clickbaitPct
      },
      trajectory,
      trajectoryLabel,
      eraScores
    };
  }
}

export default ChannelStatisticalSampler;
