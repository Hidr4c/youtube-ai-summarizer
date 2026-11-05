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

    // 1. Targeted search strictly on modern YouTube transcript segment elements (NEVER chapter macro-markers)
    const modernNodes = document.querySelectorAll(
      'transcript-segment-view-model, ytd-transcript-segment-renderer, [class*="ytTranscriptSegmentViewModelHost"]:not(transcript-segment-view-model *)'
    );

    if (modernNodes && modernNodes.length > 0) {
      modernNodes.forEach(node => {
        const timeEl = node.querySelector(
          '.ytTranscriptSegmentViewModelTimestamp, .segment-timestamp, #time, [class*="Timestamp"], [class*="timestamp"]'
        );
        const textEl = node.querySelector(
          'span[role="text"], .ytAttributedStringInlineHost, span.ytAttributedStringHost, .yt-core-attributed-string, .segment-text, #title, #details, [class*="Title"], yt-formatted-string'
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

      if (results.length > 0) return results;
    }

    // 2. Fallback textuel STRICTEMENT sur les panneaux de transcription dédiés (JAMAIS sur les panneaux de chapitres)
    const candidatePanels = Array.from(document.querySelectorAll(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="transcript"]:not([target-id*="macro-markers"])'
    ));

    let panel = candidatePanels.find(p => {
      const vis = p.getAttribute('visibility');
      return vis === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED' || (p.offsetParent !== null && p.offsetWidth > 50);
    }) || candidatePanels[0];

    // Modern unified panel (Chapters & Transcript): only if Transcription tab is actively selected
    if (!panel) {
      const macroPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"]');
      if (macroPanel) {
        const tab = macroPanel.querySelector('[role="tab"][aria-selected="true"], yt-chip-cloud-chip-renderer.selected, button[aria-selected="true"]');
        const tabText = (tab?.textContent || '').toLowerCase();
        if (tabText.includes('transcription') || tabText.includes('transcript')) {
          panel = macroPanel;
        }
      }
    }

    if (panel) {
      const panelText = panel.innerText || '';
      const lines = panelText.split('\n').map(l => l.trim()).filter(Boolean);
      const parsed = [];
      let curTime = '';
      let curText = '';

      const ignoredHeaders = [
        'dans cette vidéo', 'in this video', 'chapitres', 'chapters',
        'transcription', 'transcript', 'rechercher dans', 'search transcript',
        'synchroniser avec', 'sync with video', 'tout', 'all', 'source :', 'podcast',
        'générés automatiquement', 'auto-generated', 'english', 'français'
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (ignoredHeaders.some(h => lower.includes(h))) continue;

        // Check for inline timestamp "[0:12] text" or "0:12 text"
        const inlineMatch = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/);
        if (inlineMatch) {
          if (curTime && curText) {
            parsed.push({ timestamp: curTime, text: curText.trim() });
            curText = '';
          }
          parsed.push({ timestamp: inlineMatch[1], text: inlineMatch[2].trim() });
          curTime = '';
          continue;
        }

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

      if (parsed.length > 0) {
        return parsed;
      }
    }

    return null;
  }
}

export const extractTranscriptFromActiveDOM = DOMTranscriptExtractor.extractTranscriptFromActiveDOM;
export default DOMTranscriptExtractor;
