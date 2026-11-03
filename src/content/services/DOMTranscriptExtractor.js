/**
 * Extracts transcript segments directly from active YouTube DOM nodes
 */
export class DOMTranscriptExtractor {
  /**
   * Extracts text and timestamps from live YouTube DOM elements
   * @returns {Array<{timestamp: string, text: string}> | null}
   */
  static extractTranscriptFromActiveDOM() {
    const results = [];
    const seen = new Set();

    // 1. Recherche ciblée sur les composants modernes YouTube (transcript-segment-view-model, etc.)
    const modernNodes = document.querySelectorAll(
      'transcript-segment-view-model, ytd-transcript-segment-renderer, [class*="ytTranscriptSegmentViewModelHost"]:not(transcript-segment-view-model *)'
    );

    if (modernNodes && modernNodes.length > 3) {
      modernNodes.forEach(node => {
        const timeEl = node.querySelector(
          '.ytTranscriptSegmentViewModelTimestamp, .segment-timestamp, [class*="Timestamp"], [class*="timestamp"]'
        );
        const textEl = node.querySelector(
          'span[role="text"], .ytAttributedStringInlineHost, span.ytAttributedStringHost, .yt-core-attributed-string, .segment-text, yt-formatted-string'
        );

        let timestamp = timeEl ? timeEl.textContent.trim() : '';
        let text = textEl ? textEl.textContent.trim() : '';

        if (!timestamp) {
          const m = (node.textContent || '').match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
          if (m) timestamp = m[1];
        }
        if (!text && timestamp) {
          text = (node.textContent || '').replace(timestamp, '').trim();
        }

        text = text
          .replace(/^(afficher plus|show more|moins|show less)\b/i, '')
          .replace(/[\n\r]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (text && timestamp) {
          const key = `${timestamp}|${text.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ timestamp, text });
          }
        }
      });

      if (results.length > 3) return results;
    }

    // 2. Fallback textuel STRICTEMENT sur les panneaux de transcription dédiés (JAMAIS sur les panneaux de chapitres)
    const panel = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="transcript"]:not([target-id*="macro-markers"])'
    );

    if (panel) {
      const panelText = panel.innerText || '';
      const lines = panelText.split('\n').map(l => l.trim()).filter(Boolean);
      const parsed = [];
      let curTime = '';
      let curText = '';

      const ignoredHeaders = [
        'transcription', 'transcript', 'rechercher dans', 'search transcript',
        'synchroniser avec', 'sync with video', 'tout', 'all', 'source :', 'podcast'
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (ignoredHeaders.some(h => lower.includes(h))) continue;

        const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)$/);
        if (match) {
          if (curTime && curText) {
            parsed.push({ timestamp: curTime, text: curText.trim() });
            curText = '';
          }
          curTime = match[1];
        } else if (curTime) {
          curText += (curText ? ' ' : '') + line;
        }
      }

      if (curTime && curText) {
        parsed.push({ timestamp: curTime, text: curText.trim() });
      }

      if (parsed.length >= 15) {
        const totalWords = parsed.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
        if (totalWords >= 120) return parsed;
      }
    }

    return null;
  }
}

export const extractTranscriptFromActiveDOM = DOMTranscriptExtractor.extractTranscriptFromActiveDOM;
export default DOMTranscriptExtractor;
