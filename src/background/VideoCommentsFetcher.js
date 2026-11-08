/**
 * Service for fetching and formatting YouTube video top comments and community sentiment
 */
export class VideoCommentsFetcher {
  /**
   * Fetches top public comments for a YouTube video
   * @param {string} videoId 11-character YouTube video ID
   * @param {number} [limit=25]
   * @returns {Promise<{success: boolean, comments?: Array<Object>, markdownDossier?: string, error?: string}>}
   */
  static async fetchVideoComments(videoId, limit = 25) {
    try {
      if (!videoId || typeof videoId !== 'string') {
        throw new Error('Valid video ID is required');
      }

      const watchUrl = `https://www.youtube.com/watch?v=${videoId.trim()}`;
      const watchRes = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!watchRes.ok) {
        throw new Error(`HTTP ${watchRes.status} loading watch page`);
      }

      const html = await watchRes.text();
      const ytDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!ytDataMatch) {
        throw new Error('Unable to extract ytInitialData for comments');
      }

      const data = JSON.parse(ytDataMatch[1]);
      const token = this.extractCommentsContinuationToken(data);
      if (!token) {
        return {
          success: true,
          comments: [],
          markdownDossier: 'Les commentaires sont désactivés ou indisponibles pour cette vidéo.'
        };
      }

      const comments = await this.fetchCommentsFromInnerTube(token, limit);
      const markdownDossier = this.formatCommentsMarkdown(comments, videoId);

      return {
        success: true,
        comments,
        markdownDossier
      };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Extracts continuation token for comments section from ytInitialData
   */
  static extractCommentsContinuationToken(data) {
    const contents = data.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
    const itemSection = contents.find(c => c.itemSectionRenderer?.sectionIdentifier === 'comment-item-section');
    return itemSection?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
  }

  /**
   * Fetches comment entities via YouTube InnerTube /next endpoint
   */
  static async fetchCommentsFromInnerTube(token, limit = 25) {
    const response = await fetch('https://www.youtube.com/youtubei/v1/next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      },
      body: JSON.stringify({
        context: {
          client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'fr', gl: 'FR' }
        },
        continuation: token
      })
    });

    if (!response.ok) {
      throw new Error(`InnerTube comment endpoint returned HTTP ${response.status}`);
    }

    const json = await response.json();
    const mutations = json.frameworkUpdates?.entityBatchUpdate?.mutations || [];
    const comments = [];

    // Modern InnerTube: comments in entityBatchUpdate mutations
    for (const m of mutations) {
      if (comments.length >= limit) break;
      const p = m.payload?.commentEntityPayload;
      if (p) {
        const author = p.author?.displayName || 'Anonyme';
        const text = p.properties?.content?.content || '';
        const time = p.properties?.publishedTime || '';
        const likes = p.toolbar?.likeCountNotliked || '0';
        if (text) {
          comments.push({ author, text, time, likes });
        }
      }
    }

    // Traditional InnerTube fallback: parse commentThreadRenderer directly
    if (comments.length === 0) {
      const actions = json.onResponseReceivedEndpoints || [];
      const actionContents = actions[1]?.reloadContinuationItemsCommand?.continuationItems ||
                             actions[0]?.appendContinuationItemsAction?.continuationItems ||
                             actions[0]?.reloadContinuationItemsCommand?.continuationItems || [];

      for (const item of actionContents) {
        if (comments.length >= limit) break;
        const thread = item.commentThreadRenderer?.comment?.commentRenderer;
        if (thread) {
          const author = thread.authorText?.simpleText || 'Anonyme';
          const text = thread.contentText?.runs?.map(r => r.text).join('') || thread.contentText?.simpleText || '';
          const likes = thread.voteCount?.simpleText || '0';
          const time = thread.publishedTimeText?.runs?.[0]?.text || '';
          if (text) {
            comments.push({ author, text, time, likes });
          }
        }
      }
    }

    return comments;
  }

  /**
   * Formats comments into clean, structured Markdown block for prompt injection
   */
  static formatCommentsMarkdown(comments, videoId) {
    if (!comments || comments.length === 0) {
      return 'Aucun commentaire disponible sous cette vidéo.';
    }

    const lines = [
      `### [Avis du Public] Commentaires et réactions (${comments.length} avis populaires) :`
    ];

    comments.forEach((c, idx) => {
      const cleanText = c.text.replace(/\n+/g, ' ').trim();
      lines.push(`- **${c.author}** (${c.likes} likes, ${c.time}) : "${cleanText}"`);
    });

    return lines.join('\n');
  }
}

export default VideoCommentsFetcher;
