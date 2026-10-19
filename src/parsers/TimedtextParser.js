import { TextCleaner } from './TextCleaner.js';
import { TranscriptSegment } from '../domain/models/TranscriptSegment.js';

/**
 * Parser for YouTube timedtext JSON3 events and XML subtitles
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

  /**
   * Parses standard XML or TTML string into TranscriptSegment list
   * @param {string} xmlStr
   * @returns {Array<TranscriptSegment>}
   */
  static parseTimedtextXml(xmlStr) {
    if (!xmlStr || typeof xmlStr !== 'string') return [];
    try {
      if (typeof DOMParser === 'undefined') return [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'text/xml');

      // Case A: Standard <text start="..." dur="..."> tags
      const textNodes = Array.from(doc.querySelectorAll('text'));
      if (textNodes.length > 3) {
        return textNodes.map(n => {
          const sec = parseFloat(n.getAttribute('start') || '0');
          const dur = parseFloat(n.getAttribute('dur') || '0');
          const text = TextCleaner.cleanTranscriptText(n.textContent || '');
          return new TranscriptSegment(Math.round(sec * 1000), Math.round(dur * 1000), text);
        }).filter(s => s.text.length > 0);
      }

      // Case B: TTML <p t="..." d="..."> tags
      const pNodes = Array.from(doc.querySelectorAll('p'));
      if (pNodes.length > 3) {
        return pNodes.map(p => {
          const tAttr = p.getAttribute('t');
          const dAttr = p.getAttribute('d');
          const startMs = tAttr ? parseInt(tAttr, 10) : Math.round(parseFloat(p.getAttribute('begin') || '0') * 1000);
          const durMs = dAttr ? parseInt(dAttr, 10) : 0;
          const text = TextCleaner.cleanTranscriptText(p.textContent || '');
          return new TranscriptSegment(startMs, durMs, text);
        }).filter(s => s.text.length > 0);
      }
    } catch (_) {}
    return [];
  }
}

export default TimedtextParser;
