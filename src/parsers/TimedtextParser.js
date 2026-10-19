import { TextCleaner } from './TextCleaner.js';
import { TranscriptSegment } from '../domain/models/TranscriptSegment.js';

/**
 * Parser for YouTube timedtext JSON3 events
 */
export class TimedtextParser {
  /**
   * Parses JSON3 events array into normalized TranscriptSegment list
   * @param {Array<Object>} events
   * @returns {Array<TranscriptSegment>}
   */
  static parseTimedtextEvents(events) {
    if (!Array.isArray(events)) return [];

    const segments = [];
    for (const ev of events) {
      if (!ev || !Array.isArray(ev.segs)) continue;

      const rawText = ev.segs
        .map(s => (s && s.utf8 ? s.utf8 : ''))
        .join('');

      const cleanText = TextCleaner.cleanTranscriptText(rawText);
      if (!cleanText || cleanText === '\n') continue;

      const startMs = Number(ev.tStartMs || ev.tOffsetMs) || 0;
      const durationMs = Number(ev.dDurationMs) || 0;

      segments.push(new TranscriptSegment(startMs, durationMs, cleanText));
    }

    return segments;
  }
}

export default TimedtextParser;
