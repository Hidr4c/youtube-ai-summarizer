/**
 * Manager for channel intelligence intent detection, background fetching and session caching
 */
export class ChannelIntelligenceManager {
  constructor() {
    this.cachedDossiers = new Map();
  }

  /**
   * Detects whether user message is asking for channel or creator analysis
   * @param {string} text User prompt
   * @param {string} [currentAuthor=''] Author of active video
   * @param {string} [currentChannelUrl=''] Channel URL/handle of active video
   * @returns {{isChannelIntent: boolean, query: string, targetCreator: string}}
   */
  detectChannelIntent(text = '', currentAuthor = '', currentChannelUrl = '') {
    if (!text || typeof text !== 'string') {
      return { isChannelIntent: false, query: '', targetCreator: '' };
    }

    const clean = text.trim();

    // 1. Explicit channel handle in text (e.g. @JulienChieze)
    const handleMatch = clean.match(/@([a-zA-Z0-9_\-\.]{3,35})/);
    if (handleMatch) {
      return {
        isChannelIntent: true,
        query: handleMatch[0],
        targetCreator: handleMatch[0]
      };
    }

    // 2. Channel analysis patterns in French & English
    const channelIntentRegex = /(?:analys|pr[ée]sent|d[ée]tail|d[ée]cris|parle|explore|avis\s+sur|qu['’]est-ce\s+que\s+raconte|ligne\s+[ée]ditoriale|qui\s+est|sponsor|travail|partenariat|derni[èe]res?\s+vid[ée]os?|autres?\s+vid[ée]os?)\s+.*?(?:cha[îi]ne|cr[ée]ateur|youtubeur|vid[ée]aste|channel|creator|youtuber)/i;
    const reverseChannelRegex = /(?:cha[îi]ne|cr[ée]ateur|channel|creator)\s+.*?(?:analys|qui\s+est|avis|derni[èe]res?\s+vid[ée]os?|autres?\s+vid[ée]os?|sponsor|travail)/i;

    const isMatch = channelIntentRegex.test(clean) || reverseChannelRegex.test(clean);

    // 3. Named channel extraction: "chaine de Julien Chieze" / "channel of MKBHD"
    const namedMatch = clean.match(/(?:cha[îi]ne\s+de|cha[îi]ne\s+d['’]|channel\s+of)\s+([A-Za-z0-9\u00C0-\u017F\s\-]{3,40})/i);
    let targetCreator = '';
    let query = '';

    if (namedMatch && namedMatch[1]) {
      targetCreator = namedMatch[1].replace(/[?!.,;].*$/, '').trim();
      query = targetCreator;
      return { isChannelIntent: true, query, targetCreator };
    }

    if (isMatch) {
      // Default to the current active video author or channel URL if known
      query = currentChannelUrl || currentAuthor || '';
      targetCreator = currentAuthor || 'Créateur de la vidéo';
      return { isChannelIntent: true, query, targetCreator };
    }

    // 4. Mention of author name in a general query while on video
    if (currentAuthor && currentAuthor.length > 2 && clean.toLowerCase().includes(currentAuthor.toLowerCase())) {
      const creatorInquiry = /(?:analyse|avis|qui\s+est|travail|sponsor|vid[ée]os?|style|parcours)/i;
      if (creatorInquiry.test(clean)) {
        return {
          isChannelIntent: true,
          query: currentChannelUrl || currentAuthor,
          targetCreator: currentAuthor
        };
      }
    }

    return { isChannelIntent: false, query: '', targetCreator: '' };
  }

  /**
   * Fetches or retrieves cached channel dossier
   * @param {string} query Handle, URL, or channel name
   * @param {number} [limit=30]
   * @returns {Promise<{success: boolean, channel?: Object, error?: string}>}
   */
  async getOrFetchChannelDossier(query, limit = 30) {
    if (!query) return { success: false, error: 'Empty query' };

    const cacheKey = String(query).trim().toLowerCase();
    if (this.cachedDossiers.has(cacheKey)) {
      return { success: true, channel: this.cachedDossiers.get(cacheKey) };
    }

    try {
      const response = await new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(
            { action: 'FETCH_CHANNEL_DOSSIER', query, limit },
            (res) => resolve(res || { success: false, error: 'No response from background' })
          );
        } else {
          resolve({ success: false, error: 'Chrome runtime unavailable' });
        }
      });

      if (response && response.success && response.channel) {
        this.cachedDossiers.set(cacheKey, response.channel);
        if (response.channel.handle) {
          this.cachedDossiers.set(response.channel.handle.toLowerCase(), response.channel);
        }
        return { success: true, channel: response.channel };
      }

      return { success: false, error: response?.error || 'Failed to fetch channel dossier' };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Formats channel dossier into prompt context block
   * @param {Object} channel
   * @param {string} [lang='fr']
   * @returns {string}
   */
  formatContextBlock(channel, lang = 'fr') {
    if (!channel || typeof channel !== 'object') return '';
    return channel.markdownDossier || '';
  }

  /**
   * Clears in-memory session cache
   */
  reset() {
    this.cachedDossiers.clear();
  }
}

export default ChannelIntelligenceManager;
