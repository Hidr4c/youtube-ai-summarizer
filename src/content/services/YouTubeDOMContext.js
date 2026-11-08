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
    if (typeof document === 'undefined') return null;
    const results = [];
    const entries = document.querySelectorAll(
      'ytd-macro-markers-entry-renderer, #structured-description ytd-macro-markers-entry-renderer, ytd-chapter-renderer, ytd-macro-markers-list-item-renderer, macro-markers-panel-item-view-model'
    );
    if (entries && entries.length > 1) {
      entries.forEach(el => {
        const timeEl = el.querySelector('#time, [class*="time"], a[href*="t="]');
        const titleEls = el.querySelectorAll ? el.querySelectorAll('h3, h4, #title, [class*="title"]') : [];
        let titleEl = null;
        for (const candidate of titleEls) {
          if (!candidate.hasAttribute || !candidate.hasAttribute('hidden')) {
            titleEl = candidate;
            break;
          }
        }
        if (!titleEl) titleEl = el.querySelector('h3, h4, #title, [class*="title"]');
        const timestamp = timeEl ? timeEl.textContent.trim() : '';
        let text = titleEl ? (titleEl.getAttribute?.('title') || titleEl.textContent.trim()) : '';
        if (timestamp && text.endsWith(timestamp)) {
          text = text.slice(0, -timestamp.length).trim();
        }
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
    const hasDoc = typeof document !== 'undefined';

    const titleEl = hasDoc ? document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title') : null;
    const authorEl = hasDoc ? document.querySelector('ytd-channel-name a, #channel-name a, #owner-name a') : null;
    const subEl = hasDoc ? document.querySelector('#owner-sub-count, ytd-video-owner-renderer #owner-sub-count, yt-formatted-string#owner-sub-count, #upload-info #owner-sub-count') : null;
    const descEl = hasDoc ? document.querySelector('#description-inline-expander yt-attributed-string, #description, #description-inline-expander') : null;
    const dateEl = hasDoc ? document.querySelector('#info-container #info span:nth-child(3), ytd-watch-metadata #info-strings yt-formatted-string, ytd-video-primary-info-renderer #date') : null;
    const tagEls = hasDoc ? document.querySelectorAll('#description a[href*="/hashtag/"], #super-title a, a[href*="/hashtag/"]') : [];

    const domSubscribers = subEl?.textContent?.trim() || '';
    const domDescription = descEl?.innerText?.trim() || descEl?.textContent?.trim() || '';
    const domDate = dateEl?.textContent?.trim() || '';
    const domKeywords = Array.from(tagEls).map(el => el.textContent.trim().replace(/^#/, '')).filter(Boolean);
    const domChannelUrl = authorEl?.getAttribute('href') || authorEl?.href || '';

    const title = titleEl?.textContent?.trim() || safeMeta.title || (hasDoc ? document.title.replace(' - YouTube', '').trim() : '');
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
    const channelUrl = safeMeta.channelUrl || domChannelUrl || '';
    const chapters = (hasDoc ? YouTubeDOMContext.extractChaptersFromDescription() : null) || safeMeta.chapters || [];

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
      channelId,
      channelUrl,
      chapters
    };
  }

  /**
   * Formats video context block for AI prompts
   * @param {Object} meta
   * @param {string} [lang]
   * @returns {string}
   */
  static formatContextInfo(meta, lang = 'fr') {
    if (!meta) return '';
    const parts = [];

    if (meta.publishDate) {
      parts.push(lang === 'fr' ? `Date de mise en ligne : ${meta.publishDate}` : `Publish date: ${meta.publishDate}`);
    }
    if (meta.viewCount) {
      parts.push(lang === 'fr' ? `Vues : ${meta.viewCount}` : `Views: ${meta.viewCount}`);
    }
    if (meta.category) {
      parts.push(lang === 'fr' ? `Catégorie officielle : ${meta.category}` : `Category: ${meta.category}`);
    }
    if (meta.keywords && meta.keywords.length > 0) {
      parts.push(lang === 'fr' ? `Mots-clés / Tags : ${meta.keywords.join(', ')}` : `Keywords: ${meta.keywords.join(', ')}`);
    }
    if (meta.chapters && meta.chapters.length > 0) {
      const chapterList = meta.chapters.map(c => `  - [${c.timestamp}] ${c.text}`).join('\n');
      parts.push(lang === 'fr' ? `Structure des chapitres officiels :\n${chapterList}` : `Official chapters structure:\n${chapterList}`);
    }
    if (meta.description && meta.description.trim()) {
      const cleanDesc = meta.description.trim();
      parts.push(lang === 'fr' ? `Description officielle de la vidéo :\n"""\n${cleanDesc}\n"""` : `Official description:\n"""\n${cleanDesc}\n"""`);
    }

    if (parts.length === 0) return '';
    const header = lang === 'fr' ? 'CONTEXTE OFFICIEL DE LA VIDÉO YOUTUBE :' : 'OFFICIAL YOUTUBE VIDEO CONTEXT:';
    return `${header}\n${parts.join('\n\n')}`;
  }
}

export function extractChaptersFromDescription() {
  return YouTubeDOMContext.extractChaptersFromDescription();
}

export function getVideoMetadata(cached) {
  return YouTubeDOMContext.getVideoMetadata(cached);
}

export function formatContextInfo(meta, lang = 'fr') {
  return YouTubeDOMContext.formatContextInfo(meta, lang);
}

export default YouTubeDOMContext;
