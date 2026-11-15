/**
 * Utility for sorting and prioritizing YouTube caption tracks based on language preference
 */
export class CaptionTrackPrioritizer {
  /**
   * Sorts candidate caption tracks so the most relevant tracks are attempted first
   * @param {Array<Object>} tracks
   * @param {string} [preferredLang='fr']
   * @returns {Array<Object>}
   */
  static prioritizeTracks(tracks, preferredLang = 'fr') {
    if (!Array.isArray(tracks) || tracks.length === 0) return [];

    const norm = (preferredLang || 'en').toLowerCase().trim();
    const exact = [];
    const prefix = [];
    const enManual = [];
    const enAsr = [];
    const others = [];

    const seen = new Set();

    for (const t of tracks) {
      if (!t || !t.baseUrl) continue;
      const key = `${t.languageCode || ''}|${t.kind || ''}|${t.baseUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const code = (t.languageCode || '').toLowerCase();
      const isAsr = t.kind === 'asr';

      if (code === norm) {
        if (!isAsr) exact.unshift(t);
        else exact.push(t);
      } else if (code.startsWith(norm)) {
        prefix.push(t);
      } else if (code === 'en' && !isAsr) {
        enManual.push(t);
      } else if (code === 'en' && isAsr) {
        enAsr.push(t);
      } else {
        others.push(t);
      }
    }

    return [...exact, ...prefix, ...enManual, ...enAsr, ...others];
  }
}

export default CaptionTrackPrioritizer;
