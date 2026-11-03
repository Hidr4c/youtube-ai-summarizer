import { getVideoId } from '../ui/NavigationObserver.js';

/**
 * YouTube In-Page DOM Metadata Scraper and Context Formatter
 */
export class YouTubeDOMContext {
  /**
   * Extracts chapters / timeline markers directly from YouTube video description
   * @returns {Array<{timestamp: string, text: string}> | null}
   */
  static extractChaptersFromDescription() {
    const results = [];
    const entries = document.querySelectorAll(
      'ytd-macro-markers-entry-renderer, #structured-description ytd-macro-markers-entry-renderer, ytd-chapter-renderer'
    );
    if (entries && entries.length > 1) {
      entries.forEach(el => {
        const timeEl = el.querySelector('#time, [class*="time"], a[href*="t="]');
        const titleEl = el.querySelector('#title, #details, [class*="title"], h4');
        const timestamp = timeEl ? timeEl.textContent.trim() : '';
        const text = titleEl ? titleEl.textContent.trim() : '';
        if (timestamp && text) {
          results.push({ timestamp, text });
        }
      });
      if (results.length > 1) return results;
    }
    return null;
  }

  /**
   * Extracts rich metadata from YouTube DOM elements with cached fallback
   * @param {Object} [cachedVideoMetadata]
   * @returns {Object}
   */
  static getVideoMetadata(cachedVideoMetadata = {}) {
    const currentVideoId = getVideoId();
    const isCacheValid = cachedVideoMetadata?.videoId === currentVideoId;
    const safeMeta = isCacheValid ? cachedVideoMetadata : {};

    const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title');
    const authorEl = document.querySelector('ytd-channel-name a, #channel-name a, #owner-name a');
    const subEl = document.querySelector('#owner-sub-count, ytd-video-owner-renderer #owner-sub-count, yt-formatted-string#owner-sub-count, #upload-info #owner-sub-count');
    const descEl = document.querySelector('#description-inline-expander yt-attributed-string, #description, #description-inline-expander');
    const dateEl = document.querySelector('#info-container #info span:nth-child(3), ytd-watch-metadata #info-strings yt-formatted-string, ytd-video-primary-info-renderer #date');
    const tagEls = document.querySelectorAll('#description a[href*="/hashtag/"], #super-title a, a[href*="/hashtag/"]');

    const domSubscribers = subEl?.textContent?.trim() || '';
    const domDescription = descEl?.innerText?.trim() || descEl?.textContent?.trim() || '';
    const domDate = dateEl?.textContent?.trim() || '';
    const domKeywords = Array.from(tagEls).map(el => el.textContent.trim().replace(/^#/, '')).filter(Boolean);

    const title = titleEl?.textContent?.trim() || safeMeta.title || document.title.replace(' - YouTube', '').trim();
    const author = authorEl?.textContent?.trim() || safeMeta.author || 'Chaîne YouTube';
    const subscribers = domSubscribers || safeMeta.subscribers || '';
    const description = safeMeta.description || domDescription || '';
    const keywords = (safeMeta.keywords && safeMeta.keywords.length > 0)
      ? safeMeta.keywords
      : domKeywords;
    const category = safeMeta.category || '';
    const publishDate = safeMeta.publishDate || domDate || '';
    const viewCount = safeMeta.viewCount || '';
    const channelId = safeMeta.channelId || '';

    return {
      videoId: currentVideoId || safeMeta.videoId || '',
      title,
      author,
      subscribers,
      description,
      keywords,
      category,
      publishDate,
      viewCount,
      channelId
    };
  }

  /**
   * Formats video context block for AI prompts
   * @param {Object} meta
   * @param {string} [lang]
   * @returns {string}
   */
  static formatContextInfo(meta, lang = 'fr') {
    if (!meta || typeof meta !== 'object') return '';
    const subscribers = meta.subscribers || '';
    const category = meta.category || '';
    const publishDate = meta.publishDate || '';
    const rawKeywords = meta.keywords || [];
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords.slice(0, 10).join(', ')
      : (typeof rawKeywords === 'string' ? rawKeywords : '');
    let description = String(meta.description || '').trim();

    if (description.length > 2000) {
      description = description.slice(0, 1950) + '... [description condensée]';
    }

    const lines = [];
    const isFr = lang === 'fr';

    if (subscribers) {
      lines.push(isFr ? `- Abonnés chaîne : ${subscribers}` : `- Channel subscribers: ${subscribers}`);
    }
    if (category) {
      lines.push(isFr ? `- Catégorie : ${category}` : `- Category: ${category}`);
    }
    if (publishDate) {
      lines.push(isFr ? `- Date de publication : ${publishDate}` : `- Published date: ${publishDate}`);
    }
    if (keywords) {
      lines.push(isFr ? `- Mots-clés : ${keywords}` : `- Keywords: ${keywords}`);
    }
    if (description) {
      lines.push(isFr ? `- Description officielle :\n"""\n${description}\n"""` : `- Official Description:\n"""\n${description}\n"""`);
    }

    if (lines.length === 0) return '';
    const header = isFr ? 'CONTEXTE DE LA VIDÉO & DE LA CHAÎNE :' : 'VIDEO & CHANNEL CONTEXT:';
    return `${header}\n${lines.join('\n')}\n`;
  }
}

export function extractChaptersFromDescription() {
  return YouTubeDOMContext.extractChaptersFromDescription();
}

export function getVideoMetadata(cached) {
  return YouTubeDOMContext.getVideoMetadata(cached);
}

export function formatContextInfo(meta, lang) {
  return YouTubeDOMContext.formatContextInfo(meta, lang);
}

export default YouTubeDOMContext;
