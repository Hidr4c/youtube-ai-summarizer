import { TimedtextParser } from '../parsers/TimedtextParser.js';

/**
 * In-memory fetcher for YouTube timedtext caption tracks (JSON3 and XML)
 */
export class TimedtextTrackFetcher {
  /**
   * Fetches timedtext segments in memory with 3.5s timeout
   * @param {string} baseUrl
   * @param {string} [preferredLang=null]
   * @returns {Promise<Array<{timestamp: string, text: string}> | null>}
   */
  static async fetchTrackSegments(baseUrl, preferredLang = null) {
    if (!baseUrl) return null;

    // 1. Try translated track if preferredLang is specified and different
    if (preferredLang && !baseUrl.includes(`lang=${preferredLang}`)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const transUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `tlang=${preferredLang}&fmt=json3`;
        const res = await fetch(transUrl, { credentials: 'include', signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.text();
          if (raw && raw.trim().startsWith('{')) {
            const json = JSON.parse(raw);
            const segs = TimedtextParser.parseTimedtextEvents(json?.events);
            if (segs && segs.length > 0) return segs;
          }
        }
      } catch (_) {}
    }

    // 2. Attempt JSON3 format on base URL
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const jsonUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const res = await fetch(jsonUrl, { credentials: 'include', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.text();
        if (raw && raw.trim().startsWith('{')) {
          const json = JSON.parse(raw);
          const segs = TimedtextParser.parseTimedtextEvents(json?.events);
          if (segs && segs.length > 0) return segs;
        }
      }
    } catch (_) {}

    // 2. Fallback to raw base URL (XML or standard JSON)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(baseUrl, { credentials: 'include', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.text();
        if (raw && raw.trim().startsWith('{')) {
          const json = JSON.parse(raw);
          const segs = TimedtextParser.parseTimedtextEvents(json?.events);
          if (segs && segs.length > 0) return segs;
        } else if (raw && (raw.includes('<transcript') || raw.includes('<tt') || raw.includes('<text'))) {
          const segs = TimedtextParser.parseTimedtextXml(raw);
          if (segs && segs.length > 0) return segs;
        }
      }
    } catch (_) {}

    return null;
  }
}

export default TimedtextTrackFetcher;
