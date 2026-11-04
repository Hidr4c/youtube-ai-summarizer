/**
 * Background Service for fetching and parsing YouTube Watch page transcripts
 * Uses resilient balanced-brace JSON extraction for ytInitialPlayerResponse & captionTracks
 */
export class WatchPageTranscriptFetcher {
  /**
   * Extracts balanced JSON string starting from opening brace '{'
   */
  static extractBalancedJson(str, startFrom = 0) {
    const start = str.indexOf('{', startFrom);
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < str.length; i++) {
      const c = str[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (!inString) {
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) return str.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  /**
   * Extracts balanced array string starting from opening bracket '['
   */
  static extractBalancedArray(str, startFrom = 0) {
    const start = str.indexOf('[', startFrom);
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < str.length; i++) {
      const c = str[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (!inString) {
        if (c === '[') depth++;
        else if (c === ']') {
          depth--;
          if (depth === 0) return str.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  /**
   * Parses timedtext JSON3 or XML payload into uniform segments
   */
  static parseTimedtextPayload(rawText) {
    const segments = [];
    if (!rawText || !rawText.trim()) return segments;

    // 1. Try parsing JSON3 format
    if (rawText.trim().startsWith('{')) {
      try {
        const json = JSON.parse(rawText);
        if (Array.isArray(json.events)) {
          for (const ev of json.events) {
            if (!ev.segs) continue;
            const sec = Math.floor((ev.tStartMs || 0) / 1000);
            const m = Math.floor(sec / 60);
            const s = (sec % 60).toString().padStart(2, '0');
            const text = ev.segs.map(seg => seg.utf8 || '').join('').replace(/\s+/g, ' ').trim();
            if (text && text !== '\n') {
              segments.push({ timestamp: `${m}:${s}`, startMs: ev.tStartMs || (sec * 1000), text });
            }
          }
        }
      } catch (_) {}
    }

    if (segments.length > 0) return segments;

    // 2. Try parsing XML format (<text start="1.5" dur="2.0">...</text>)
    const regex = /<text\b[^>]*\bstart="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = regex.exec(rawText)) !== null) {
      const sec = Math.floor(parseFloat(match[1]) || 0);
      const m = Math.floor(sec / 60);
      const s = (sec % 60).toString().padStart(2, '0');
      const text = match[2]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        segments.push({ timestamp: `${m}:${s}`, startMs: sec * 1000, text });
      }
    }

    return segments;
  }

  /**
   * Fetches watch page and extracts full transcript and video metadata
   * @param {string} videoId
   * @param {string} lang
   * @returns {Promise<{success: boolean, videoId: string, title?: string, author?: string, segments?: Array, fullText?: string, error?: string}>}
   */
  static async fetchTranscript(videoId, lang = 'fr') {
    if (!videoId) return { success: false, error: 'No videoId provided' };

    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'Accept-Language': `${lang},en;q=0.8`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      let captionTracks = [];
      let title = '';
      let author = '';

      const respIdx = html.indexOf('ytInitialPlayerResponse =');
      if (respIdx !== -1) {
        const jsonStr = this.extractBalancedJson(html, respIdx);
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            title = parsed.videoDetails?.title || '';
            author = parsed.videoDetails?.author || '';
            captionTracks = parsed.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          } catch (_) {}
        }
      }

      if (!captionTracks.length) {
        const tracksIdx = html.indexOf('"captionTracks":');
        if (tracksIdx !== -1) {
          const arrStr = this.extractBalancedArray(html, tracksIdx);
          if (arrStr) {
            try { captionTracks = JSON.parse(arrStr); } catch (_) {}
          }
        }
      }

      if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].replace(' - YouTube', '').trim();
      }

      if (!captionTracks.length) {
        return { success: false, videoId, title, author, error: 'No caption tracks found' };
      }

      let track = captionTracks.find(t => t.languageCode === lang);
      if (!track) track = captionTracks.find(t => t.languageCode?.startsWith(lang));
      if (!track) track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
      if (!track) track = captionTracks[0];

      if (!track?.baseUrl) {
        return { success: false, videoId, title, author, error: 'No track baseUrl' };
      }

      const ttUrl = track.baseUrl + (track.baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const ttRes = await fetch(ttUrl, { credentials: 'include' });
      let ttText = '';
      if (ttRes.ok) {
        ttText = await ttRes.text();
      } else {
        const fallbackRes = await fetch(track.baseUrl, { credentials: 'include' });
        if (fallbackRes.ok) ttText = await fallbackRes.text();
      }

      const segments = this.parseTimedtextPayload(ttText);
      const fullText = segments.map(s => s.text).join(' ');

      return {
        success: segments.length > 0,
        videoId,
        title,
        author,
        segments,
        fullText,
        captions: captionTracks
      };
    } catch (err) {
      return { success: false, videoId, error: err.message };
    }
  }
}

export default WatchPageTranscriptFetcher;
