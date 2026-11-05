import { VideoCommentsFetcher } from '../../background/VideoCommentsFetcher.js';

/**
 * Manager for video comments intent detection, background fetching and session caching
 */
export class VideoCommentsManager {
  constructor() {
    this.cachedComments = new Map();
  }

  /**
   * Detects whether user message is inquiring about video comments or public reaction
   * @param {string} text User prompt
   * @returns {boolean}
   */
  detectCommentsIntent(text = '') {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim();

    const patterns = [
      /commentaires?/i,
      /avis\s+(?:des\s+gens|du\s+public|des\s+spectateurs|des\s+abonn[ée]s|de\s+la\s+communaut[ée]|g[ée]n[ée]ral)/i,
      /r[ée]actions?\s+(?:des\s+gens|du\s+public|des\s+spectateurs|de\s+la\s+communaut[ée]|des\s+abonn[ée]s)/i,
      /(?:ce\s+)?qu['’]\s*en\s+pensent?\s+(?:les\s+gens|le\s+public|les\s+spectateurs|la\s+communaut[ée])/i,
      /que\s+pensent?\s+(?:les\s+gens|le\s+public|les\s+spectateurs|la\s+communaut[ée])/i,
      /qu['’]en\s+dit\s+la\s+communaut[ée]/i,
      /avis\s+g[ée]n[ée]ral\s+sous\s+la\s+vid[ée]o/i,
      /critiques?\s+dans\s+les\s+commentaires/i,
      /(?:retrouve|cherche|trouve|voir)\s+(?:le\s+|un\s+)?(?:commentaire|message|avis|post)/i,
      /(?:quelqu['’]un|un\s+gars|un\s+spectateur|un\s+abonn[ée])\s+(?:a\s+dit|a\s+[ée]crit|disait|parle|demandait)/i,
      /(?:qui|quelqu['’]un)\s+(?:a\s+post[ée]|a\s+comment[ée])/i,
      /un\s+commentaire\s+(?:qui|sur|de)/i,
      /@[a-zA-Z0-9_-]{3,}/,
      /(?:public|audience|community|viewer)\s+(?:feedback|reaction|opinion)/i,
      /(?:what\s+do|how\s+do)\s+people\s+(?:think|react)/i,
      /(?:find|search|lookup)\s+(?:the\s+|a\s+)?comment/i,
      /(?:someone|a\s+user|a\s+viewer)\s+(?:said|wrote|posted|commented)/i,
      /who\s+commented/i,
      /video\s+comments/i
    ];

    return patterns.some(p => p.test(clean));
  }

  /**
   * Fetches or retrieves cached comments for a video
   * @param {string} videoId
   * @param {number} [limit=25]
   * @returns {Promise<{success: boolean, comments?: Array<Object>, markdownDossier?: string, error?: string}>}
   */
  async getOrFetchComments(videoId, limit = 25) {
    if (!videoId) return { success: false, error: 'Empty videoId' };

    const cacheKey = String(videoId).trim();
    if (this.cachedComments.has(cacheKey)) {
      return { success: true, ...this.cachedComments.get(cacheKey) };
    }

    try {
      // 1. Direct in-page fetch (Origin is youtube.com, HTTP 200 guaranteed)
      if (typeof VideoCommentsFetcher?.fetchVideoComments === 'function') {
        const directRes = await VideoCommentsFetcher.fetchVideoComments(videoId, limit);
        if (directRes && directRes.success && directRes.comments?.length > 0) {
          this.cachedComments.set(cacheKey, directRes);
          return directRes;
        }
      }

      // 2. Fallback to background messaging
      const response = await new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(
            { action: 'FETCH_VIDEO_COMMENTS', videoId, limit },
            (res) => resolve(res || { success: false, error: 'No response from background' })
          );
        } else {
          resolve({ success: false, error: 'Chrome runtime unavailable' });
        }
      });

      if (response && response.success) {
        this.cachedComments.set(cacheKey, response);
        return response;
      }

      return { success: false, error: response?.error || 'Failed to fetch comments' };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Formats comments into prompt context block
   * @param {Object} commentsData
   * @returns {string}
   */
  formatContextBlock(commentsData) {
    if (!commentsData) return '';
    return commentsData.markdownDossier || '';
  }

  /**
   * Clears in-memory session cache
   */
  reset() {
    this.cachedComments.clear();
  }
}

export default VideoCommentsManager;
