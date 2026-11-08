import { VideoCommentsFetcher } from './VideoCommentsFetcher.js';

/**
 * Service for fetching and compiling rich video dossiers (metadata, description, chapters, captions, comments)
 * Used to enrich statistical channel audit samples with high-density editorial signals.
 */
export class VideoDossierFetcher {
  /**
   * Fetches rich dossier for a single video ID
   * @param {string} videoId
   * @param {string} [lang='fr']
   * @returns {Promise<Object>}
   */
  static async fetchDossier(videoId, lang = 'fr') {
    if (!videoId) return null;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const res = await fetch(url, {
        headers: {
          'Accept-Language': `${lang},en;q=0.8`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        credentials: 'include'
      });

      if (!res.ok) return null;
      const html = await res.text();

      // 1. Title
      let title = '';
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim();

      // 2. Short description
      let description = '';
      const descIdx = html.indexOf('"shortDescription":"');
      if (descIdx !== -1) {
        const start = descIdx + '"shortDescription":"'.length;
        let end = start, esc = false;
        while (end < html.length) {
          if (esc) esc = false;
          else if (html[end] === '\\') esc = true;
          else if (html[end] === '"') break;
          end++;
        }
        try {
          description = JSON.parse(`"${html.substring(start, end)}"`);
        } catch (_) {
          description = html.substring(start, end);
        }
      }

      // 3. Chapters
      const chapters = [];
      const lines = description.split('\n');
      for (const line of lines) {
        const m = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)$/);
        if (m) chapters.push(`[${m[1]}] ${m[2].trim()}`);
      }

      // 4. Captions presence
      const hasCaptions = html.includes('"captionTracks":');

      // 5. Community comments (top 3)
      let comments = [];
      try {
        const comRes = await VideoCommentsFetcher.fetchVideoComments(videoId, 3);
        if (comRes?.success && Array.isArray(comRes.comments)) {
          comments = comRes.comments.map(c => ({
            author: c.author || 'Anonyme',
            text: (c.text || '').replace(/\s+/g, ' ').trim().slice(0, 140),
            likes: c.likes || '0'
          }));
        }
      } catch (_) {}

      return {
        videoId,
        title,
        description: description.slice(0, 1200),
        chapters: chapters.slice(0, 12),
        hasCaptions,
        comments
      };
    } catch (_) {
      return null;
    }
  }

  /**
   * Fetches multiple video dossiers in parallel batches
   * @param {Array<string>} videoIds
   * @param {string} [lang='fr']
   * @param {number} [concurrency=4]
   * @returns {Promise<Map<string, Object>>}
   */
  static async fetchDossiersBatch(videoIds = [], lang = 'fr', concurrency = 4) {
    const results = new Map();
    if (!Array.isArray(videoIds) || videoIds.length === 0) return results;

    const queue = [...videoIds];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const vId = queue.shift();
        if (!vId) continue;
        const dossier = await VideoDossierFetcher.fetchDossier(vId, lang);
        if (dossier) results.set(vId, dossier);
      }
    });

    await Promise.all(workers);
    return results;
  }
}

export default VideoDossierFetcher;
