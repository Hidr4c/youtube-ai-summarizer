/**
 * Domain service identifying YouTube long-form videos vs Shorts across catalog collection,
 * stratified sampling, and comparative editorial analytics.
 */
export class ChannelFormatAnalyzer {
  /**
   * Determines whether a normalized catalog or report item represents a YouTube Short.
   * @param {Object} item
   * @returns {boolean}
   */
  static isShortItem(item = {}) {
    if (!item || typeof item !== 'object') return false;
    if (item.isShort === true || item.contentType === 'short') return true;
    const url = String(item.url || '');
    return url.includes('/shorts/');
  }

  /**
   * Tags an item consistently with explicit format metadata and normalized URL.
   * @param {Object} item
   * @param {boolean} [forceShort=false]
   * @returns {Object}
   */
  static tagItem(item = {}, forceShort = false) {
    const isShort = Boolean(forceShort || this.isShortItem(item));
    const id = item.id || '';
    const defaultUrl = id
      ? (isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`)
      : (item.url || '');
    return {
      ...item,
      isShort,
      contentType: isShort ? 'short' : 'video',
      url: (isShort && id) ? `https://www.youtube.com/shorts/${id}` : (item.url || defaultUrl)
    };
  }

  /**
   * Merges primary (/videos or root) and Shorts (/shorts) channel catalogs into one balanced list.
   * Preserves format tags, deduplicates IDs (keeping isShort=true if present in /shorts),
   * and interleaves both formats cleanly up to the requested catalog cap.
   * @param {Array<Object>} primaryItems
   * @param {Array<Object>} shortItems
   * @param {number|'all'} [limit=30]
   * @returns {{ videos: Array<Object>, longVideoCount: number, shortsCount: number, hasMixedFormats: boolean }}
   */
  static mergeVideoAndShortCatalogs(primaryItems = [], shortItems = [], limit = 30) {
    const targetLimit = limit === 'all' ? 5000 : Math.max(1, parseInt(limit, 10) || 30);
    const shortsIdSet = new Set((shortItems || []).map((s) => s?.id).filter(Boolean));
    const byId = new Map();

    const longPool = [];
    const shortPool = [];

    for (const raw of (primaryItems || [])) {
      if (!raw) continue;
      const tagged = this.tagItem(raw, shortsIdSet.has(raw.id));
      if (tagged.id && byId.has(tagged.id)) continue;
      if (tagged.id) byId.set(tagged.id, tagged);
      if (tagged.isShort) shortPool.push(tagged);
      else longPool.push(tagged);
    }

    for (const raw of (shortItems || [])) {
      if (!raw) continue;
      const tagged = this.tagItem(raw, true);
      if (tagged.id && byId.has(tagged.id)) continue;
      if (tagged.id) byId.set(tagged.id, tagged);
      shortPool.push(tagged);
    }

    let merged;
    if (longPool.length > 0 && shortPool.length > 0) {
      const idealShortShare = Math.min(shortPool.length, Math.max(2, Math.round(targetLimit * 0.4)));
      const longShare = Math.min(longPool.length, targetLimit - idealShortShare);
      const shortShare = Math.min(shortPool.length, targetLimit - longShare);
      const selectedLong = longPool.slice(0, longShare);
      const selectedShort = shortPool.slice(0, shortShare);
      merged = [...selectedLong, ...selectedShort];
    } else {
      merged = [...longPool, ...shortPool].slice(0, targetLimit);
    }

    const longVideoCount = merged.filter((v) => !v.isShort).length;
    const shortsCount = merged.filter((v) => v.isShort).length;
    return {
      videos: merged,
      longVideoCount,
      shortsCount,
      hasMixedFormats: longVideoCount > 0 && shortsCount > 0
    };
  }

  /**
   * Combines /videos and /shorts fetched dossiers into one unified channel dossier with format counts.
   * @param {Object|null} primaryDossier
   * @param {Object|null} shortsDossier
   * @param {number|'all'} limit
   * @param {Function} [formatMarkdownFn]
   * @returns {Object|null}
   */
  static mergeDossiers(primaryDossier, shortsDossier, limit = 30, formatMarkdownFn = null) {
    const base = primaryDossier || shortsDossier;
    if (!base) return null;
    const alt = primaryDossier && shortsDossier ? shortsDossier : null;
    const mergedMeta = this.mergeVideoAndShortCatalogs(
      primaryDossier?.recentVideos || [],
      shortsDossier?.recentVideos || [],
      limit
    );
    const mergedDossier = {
      ...base,
      title: base.title || alt?.title || '',
      handle: base.handle || alt?.handle || '',
      subscribers: base.subscribers || alt?.subscribers || '',
      videoCount: base.videoCount || alt?.videoCount || '',
      totalChannelVideos: base.totalChannelVideos || alt?.totalChannelVideos || null,
      bio: base.bio || alt?.bio || '',
      recentVideos: mergedMeta.videos,
      longVideoCount: mergedMeta.longVideoCount,
      shortsCount: mergedMeta.shortsCount,
      hasMixedFormats: mergedMeta.hasMixedFormats,
      hasMore: Boolean(primaryDossier?.hasMore || shortsDossier?.hasMore),
      totalFetched: mergedMeta.videos.length
    };
    if (typeof formatMarkdownFn === 'function') {
      mergedDossier.markdownDossier = formatMarkdownFn(mergedDossier);
    }
    return mergedDossier;
  }

  /**
   * Balances stratified temporal sampling across long-form videos and Shorts when both exist.
   * @param {Array<Object>} allVideos
   * @param {number} maxSample
   * @param {Function} temporalSelectFn
   * @returns {Array<Object>}
   */
  static sampleMixedFormats(allVideos = [], maxSample = 12, temporalSelectFn) {
    const tagged = (allVideos || []).map((v) => this.tagItem(v));
    if (tagged.length <= maxSample) {
      return temporalSelectFn(tagged, maxSample);
    }

    const videosPool = tagged.filter((v) => !v.isShort);
    const shortsPool = tagged.filter((v) => v.isShort);
    if (videosPool.length === 0 || shortsPool.length === 0) {
      return temporalSelectFn(tagged, maxSample);
    }

    const shortsShare = Math.min(
      shortsPool.length,
      Math.max(shortsPool.length >= 2 ? 2 : 1, Math.round(maxSample * 0.35))
    );
    const videosShare = Math.min(videosPool.length, maxSample - shortsShare);
    const finalShortQuota = Math.min(shortsPool.length, maxSample - videosShare);

    const pickedVideos = temporalSelectFn(videosPool, videosShare);
    const pickedShorts = temporalSelectFn(shortsPool, finalShortQuota);
    return [...pickedVideos, ...pickedShorts].map((v, idx) => ({ ...v, sampleIndex: idx + 1 }));
  }

  /**
   * Computes separate editorial reliability and clickbait averages for Videos vs Shorts.
   * @param {Array<Object>} evaluatedVideos
   * @returns {Object}
   */
  static computeFormatBreakdown(evaluatedVideos = []) {
    const videosList = [];
    const shortsList = [];

    for (const v of (evaluatedVideos || [])) {
      if (this.isShortItem(v)) shortsList.push(v);
      else videosList.push(v);
    }

    const totalCount = videosList.length + shortsList.length;
    const summarize = (list, sharePct) => {
      if (list.length === 0) {
        return {
          count: 0,
          sharePct: 0,
          avgScore: null,
          avgClickbait: null,
          reliableCount: 0,
          cautionCount: 0,
          riskCount: 0,
          reliablePct: 0,
          cautionPct: 0,
          riskPct: 0
        };
      }
      const scoreSum = list.reduce((acc, v) => acc + (typeof v.score === 'number' ? v.score : 50), 0);
      const cbSum = list.reduce((acc, v) => acc + (typeof v.clickbait === 'number' ? v.clickbait : 20), 0);
      const reliableCount = list.filter((v) => (typeof v.score === 'number' ? v.score : 50) >= 75).length;
      const cautionCount = list.filter((v) => {
        const s = typeof v.score === 'number' ? v.score : 50;
        return s >= 50 && s < 75;
      }).length;
      const riskCount = Math.max(0, list.length - reliableCount - cautionCount);
      const reliablePct = Math.round((reliableCount / list.length) * 100);
      const cautionPct = Math.round((cautionCount / list.length) * 100);
      const riskPct = Math.max(0, 100 - reliablePct - cautionPct);
      return {
        count: list.length,
        sharePct,
        avgScore: Math.round(scoreSum / list.length),
        avgClickbait: Math.round(cbSum / list.length),
        reliableCount,
        cautionCount,
        riskCount,
        reliablePct,
        cautionPct,
        riskPct
      };
    };

    const videoShare = totalCount > 0 ? Math.round((videosList.length / totalCount) * 100) : 0;
    const shortShare = totalCount > 0 ? (shortsList.length > 0 ? Math.max(0, 100 - videoShare) : 0) : 0;
    const videos = summarize(videosList, videoShare);
    const shorts = summarize(shortsList, shortShare);
    const hasMixedFormats = videos.count > 0 && shorts.count > 0;
    return {
      videos,
      shorts,
      hasMixedFormats,
      scoreGap: hasMixedFormats ? videos.avgScore - shorts.avgScore : 0,
      clickbaitGap: hasMixedFormats ? shorts.avgClickbait - videos.avgClickbait : 0
    };
  }

  /**
   * Formats a merged channel dossier with explicit [Video] / [Short] tags into markdown.
   * @param {Object} dossier
   * @returns {string}
   */
  static formatMarkdownDossier(dossier = {}) {
    const { title, handle, subscribers, videoCount, bio, recentVideos = [] } = dossier;
    const longsCount = recentVideos.filter((v) => !this.isShortItem(v)).length;
    const shortsCount = recentVideos.length - longsCount;
    const mixNote = shortsCount > 0 ? ` (${longsCount} Vidéos • ${shortsCount} Shorts)` : '';
    const lines = [
      `### 📺 DOSSIER OFFICIEL DE LA CHAÎNE : ${title || 'Créateur YouTube'} (${handle || ''})`,
      `- **Audience & Volume** : ${subscribers || 'Non communiqué'} • ${videoCount || `${recentVideos.length} vidéos récentes`}${mixNote}`
    ];
    if (bio) lines.push(`- **Bio Officielle** :\n"""\n${bio.trim()}\n"""`);
    if (recentVideos.length > 0) {
      const cap = 40;
      lines.push(`- **Derniers contenus publiés (${recentVideos.length})** :`);
      recentVideos.slice(0, cap).forEach((v, idx) => {
        const isS = this.isShortItem(v);
        const tag = isS ? '[Short]' : '[Vidéo]';
        const vUrl = v.url || (isS ? `https://www.youtube.com/shorts/${v.id}` : `https://youtu.be/${v.id}`);
        lines.push(`  ${idx + 1}. ${tag} **${v.title}** ${v.meta ? `(${v.meta})` : ''} - ${vUrl}`);
      });
      if (recentVideos.length > cap) {
        lines.push(`  ... (+${recentVideos.length - cap} autres contenus indexés dans le catalogue)`);
      }
    }
    return lines.join('\n');
  }
}

export default ChannelFormatAnalyzer;
