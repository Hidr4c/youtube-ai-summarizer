import { TimedtextParser } from '../parsers/TimedtextParser.js';

/**
 * In-memory fetcher for YouTube timedtext caption tracks (JSON3 and XML)
 */
export class TimedtextTrackFetcher {
  /**
   * Fetches timedtext segments in memory with 3.5s timeout
   * @param {string} baseUrl
   * @returns {Promise<Array<{timestamp: string, text: string}> | null>}
   */
  static async fetchTrackSegments(baseUrl) {
    if (!baseUrl) return null;

    // 1. Attempt JSON3 format first
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
          if (segs && segs.length > 3) return segs;
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
          if (segs && segs.length > 3) return segs;
        } else if (raw && (raw.includes('<transcript') || raw.includes('<tt') || raw.includes('<text'))) {
          const segs = TimedtextParser.parseTimedtextXml(raw);
          if (segs && segs.length > 3) return segs;
        }
      }
    } catch (_) {}

    return null;
  }
}

export default TimedtextTrackFetcher;
