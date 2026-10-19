import { ITranscriptService } from '../interfaces/ITranscriptService.js';
import { TimedtextParser } from '../../parsers/TimedtextParser.js';
import { InnerTubeParser } from '../../parsers/InnerTubeParser.js';
import { TranscriptError } from '../../domain/errors/TranscriptError.js';

/**
 * Service for retrieving YouTube video transcripts using multiple fallback strategies
 */
export class YouTubeTranscriptService extends ITranscriptService {
  constructor() {
    super();
    this.pendingResolvers = new Map();
    this.setupPageListener();
  }

  /**
   * Listens for messages dispatched from main_world.js
   */
  setupPageListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'YT_AI_TRANSCRIPT_RESULT') {
        const { videoId, segments, fullText, error } = event.data;
        const resolver = this.pendingResolvers.get(videoId);
        if (resolver) {
          this.pendingResolvers.delete(videoId);
          if (error) {
            resolver.reject(new TranscriptError(error));
          } else {
            resolver.resolve({ segments: segments || [], fullText: fullText || '' });
          }
        }
      }
    });
  }

  /**
   * Fetches transcript for a video
   * @param {string} videoId
   * @param {string} [preferredLang]
   * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
   */
  async getTranscript(videoId, preferredLang = 'en') {
    if (!videoId) {
      throw new TranscriptError('Video ID is required');
    }

    // 1. Try requesting from main_world.js (Direct In-Memory Access)
    try {
      const mainWorldResult = await this.requestFromMainWorld(videoId);
      if (mainWorldResult && mainWorldResult.segments && mainWorldResult.segments.length > 0) {
        return mainWorldResult;
      }
    } catch {}

    // 2. Fallback: Parse from page DOM and HTML source
    try {
      const pageResult = await this.extractFromPageSource(videoId, preferredLang);
      if (pageResult && pageResult.segments && pageResult.segments.length > 0) {
        return pageResult;
      }
    } catch {}

    throw new TranscriptError('No transcript available for this video');
  }

  /**
   * Requests transcript from main_world execution context via postMessage
   * @param {string} videoId
   * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
   */
  requestFromMainWorld(videoId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResolvers.delete(videoId);
        resolve(null);
      }, 3500);

      this.pendingResolvers.set(videoId, {
        resolve: (val) => { clearTimeout(timeout); resolve(val); },
        reject: (err) => { clearTimeout(timeout); reject(err); }
      });

      window.postMessage({ type: 'YT_AI_REQUEST_TRANSCRIPT', videoId }, '*');
    });
  }

  /**
   * Fallback extractor reading HTML and caption tracks
   * @param {string} videoId
   * @param {string} preferredLang
   * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
   */
  async extractFromPageSource(videoId, preferredLang = 'en') {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    if (!res.ok) return null;

    const html = await res.text();
    const captionMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
    if (!captionMatch) return null;

    let tracks = [];
    try {
      tracks = JSON.parse(captionMatch[1]);
    } catch {
      return null;
    }

    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    let selectedTrack = tracks.find(t => t.languageCode === preferredLang);
    if (!selectedTrack) selectedTrack = tracks.find(t => t.languageCode === 'en');
    if (!selectedTrack) selectedTrack = tracks[0];

    const baseUrl = selectedTrack.baseUrl;
    if (!baseUrl) return null;

    const timedtextUrl = `${baseUrl}&fmt=json3`;
    const ttRes = await fetch(timedtextUrl);
    if (!ttRes.ok) return null;

    const json = await ttRes.json();
    const segments = TimedtextParser.parseTimedtextEvents(json.events || []);
    const fullText = segments.map(s => s.text).join(' ');

    return { segments, fullText };
  }
}

export default YouTubeTranscriptService;
