import { InnerTubeParser } from '../parsers/InnerTubeParser.js';

/**
 * YouTube Main World context extractor
 * Runs directly in the page's execution context to access window.ytInitialPlayerResponse
 */
export class YouTubeContextExtractor {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('message', async (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === 'YT_AI_REQUEST_TRANSCRIPT') {
        const videoId = event.data.videoId;
        const result = await this.extractTranscript(videoId);
        window.postMessage({
          type: 'YT_AI_TRANSCRIPT_RESULT',
          videoId,
          segments: result?.segments || null,
          fullText: result?.fullText || null,
          error: result?.error || null
        }, '*');
      }
    });
  }

  /**
   * Attempts extraction from page globals
   * @param {string} videoId
   */
  async extractTranscript(videoId) {
    // 1. Check window.ytInitialPlayerResponse caption tracks
    try {
      const pr = window.ytInitialPlayerResponse;
      const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
        if (track && track.baseUrl) {
          const res = await fetch(`${track.baseUrl}&fmt=json3`);
          if (res.ok) {
            const json = await res.json();
            const segments = [];
            for (const ev of (json.events || [])) {
              if (ev.segs) {
                const text = ev.segs.map(s => s.utf8 || '').join('').trim();
                if (text) {
                  const ms = ev.tStartMs || ev.tOffsetMs || 0;
                  segments.push({ timestamp: InnerTubeParser.formatMs(ms), text });
                }
              }
            }
            if (segments.length > 0) {
              return { segments, fullText: segments.map(s => s.text).join(' ') };
            }
          }
        }
      }
    } catch {}

    // 2. Check window.ytInitialData
    try {
      const data = window.ytInitialData;
      const segments = InnerTubeParser.extractSegmentsFromInnerTubeJson(data);
      if (segments && segments.length > 0) {
        return { segments, fullText: segments.map(s => s.text).join(' ') };
      }
    } catch {}

    return { error: 'No transcript found in page context' };
  }
}

export default YouTubeContextExtractor;
