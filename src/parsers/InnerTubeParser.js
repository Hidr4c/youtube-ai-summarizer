import { TextCleaner } from './TextCleaner.js';

/**
 * Parser for YouTube InnerTube transcript data structures
 */
export class InnerTubeParser {
  /**
   * Formats milliseconds into m:ss
   * @param {number} ms
   * @returns {string}
   */
  static formatMs(ms) {
    const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Extracts transcript segments from any InnerTube JSON response
   * @param {Object} json
   * @param {Object} [options]
   * @param {boolean} [options.allowChapters=true]
   * @returns {Array<{timestamp: string, text: string}>|null}
   */
  static extractSegmentsFromInnerTubeJson(json, options = {}) {
    if (!json || typeof json !== 'object') return null;

    const { allowChapters = true } = options;
    const speechSegments = [];
    const chapterSegments = [];
    const seenSpeech = new Set();
    const seenChapters = new Set();

    function walk(node, depth = 0) {
      if (!node || depth > 14) return;
      if (typeof node !== 'object') return;

      // 1. Classical transcriptSegmentRenderer
      const seg = node.transcriptSegmentRenderer;
      if (seg) {
        const time = seg.startTimeText?.simpleText || (seg.startTimeText?.runs || []).map(r => r.text || '').join('');
        const text = (seg.snippet?.runs || []).map(r => r.text || '').join('') || seg.snippet?.simpleText || '';
        if (time && text) {
          const cleaned = TextCleaner.cleanTranscriptText(text);
          const key = `${time}|${cleaned.slice(0, 30)}`;
          if (!seenSpeech.has(key)) {
            seenSpeech.add(key);
            speechSegments.push({ timestamp: time.trim(), text: cleaned });
          }
        }
      }

      // 2. Modern transcriptSegmentViewModel
      const vm = node.transcriptSegmentViewModel;
      if (vm) {
        const time = vm.startTimeText?.content || (typeof vm.startTimeText === 'string' ? vm.startTimeText : '');
        let text = '';
        if (vm.snippet) {
          text = vm.snippet.content || (vm.snippet.runs || []).map(r => r.text || '').join('') || (typeof vm.snippet === 'string' ? vm.snippet : '');
        }
        if (time && text) {
          const cleaned = TextCleaner.cleanTranscriptText(text);
          const key = `${time}|${cleaned.slice(0, 30)}`;
          if (!seenSpeech.has(key)) {
            seenSpeech.add(key);
            speechSegments.push({ timestamp: time.trim(), text: cleaned });
          }
        }
      }

      // 3. Macro markers / Chapters (fallback when genuine transcript segments are absent)
      const macro = node.macroMarkersListItemRenderer;
      if (macro) {
        const time = macro.timeDescription?.simpleText || (macro.timeDescription?.runs || []).map(r => r.text || '').join('');
        const title = macro.title?.simpleText || (macro.title?.runs || []).map(r => r.text || '').join('');
        if (time && title) {
          const cleaned = TextCleaner.cleanTranscriptText(title);
          const key = `${time}|${cleaned.slice(0, 30)}`;
          if (!seenChapters.has(key)) {
            seenChapters.add(key);
            chapterSegments.push({ timestamp: time.trim(), text: cleaned });
          }
        }
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          walk(item, depth + 1);
        }
      } else {
        for (const k of Object.keys(node)) {
          if (k === 'parent' || k === 'window') continue;
          walk(node[k], depth + 1);
        }
      }
    }

    walk(json);

    // Prioritize genuine speech segments. Only return chapter segments if no speech segments exist AND allowChapters is true.
    if (speechSegments.length > 0) return speechSegments;
    if (allowChapters && chapterSegments.length > 0) return chapterSegments;
    return null;
  }
}

export default InnerTubeParser;
