import { getVideoId, isShortsPage } from '../ui/NavigationObserver.js';
import { isActivePageElement } from '../ui/DomVisibilityHelper.js';
import { parseChannelVideoCount } from '../../config/ExtensionConstants.js';
import { ChannelPageParser } from '../../parsers/ChannelPageParser.js';

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
    const entries = Array.from(document.querySelectorAll(
      'ytd-macro-markers-entry-renderer, #structured-description ytd-macro-markers-entry-renderer, ytd-chapter-renderer, ytd-macro-markers-list-item-renderer, macro-markers-panel-item-view-model'
    )).filter(el => isActivePageElement(el));
    if (entries.length > 1) {
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

  static _resolveChannelOwner(domScope, shortsMode) {
    if (!domScope) return { el: null, url: '' };
    const selectorGroups = shortsMode
      ? [
          '.ytReelChannelBarViewModelChannelName a, yt-reel-channel-bar-view-model a',
          'ytd-reel-player-header-renderer ytd-channel-name a, ytd-reel-player-header-renderer a[href*="/@"], ytd-reel-player-header-renderer a[href*="/channel/"]',
          'ytm-reel-player-header-renderer a[href*="/@"], ytm-reel-player-header-renderer a[href*="/channel/"]'
        ]
      : [
          'ytd-video-owner-renderer ytd-channel-name a, ytd-watch-metadata ytd-channel-name a, #owner #channel-name a, #upload-info #channel-name a',
          'ytd-channel-name a, #channel-name a, #owner-name a, #attributed-channel-name a',
          'yt-video-owner-view-model a[href*="/@"], yt-video-owner-view-model a[href*="/channel/"], yt-video-metadata-view-model a[href*="/@"], yt-video-metadata-view-model a[href*="/channel/"], yt-content-metadata-view-model a[href*="/@"]',
          '#owner a[href*="/@"], #owner a[href*="/channel/"], #owner a[href*="/c/"], #owner a[href*="/user/"], ytd-video-owner-renderer a[href*="/@"], ytd-video-owner-renderer a[href*="/channel/"]',
          'ytd-watch-metadata a[href*="/@"], ytd-watch-metadata a[href*="/channel/"]',
          'ytm-slim-owner-renderer .slim-owner-channel-name, ytm-slim-owner-renderer a'
        ];

    for (const group of selectorGroups) {
      let nodes = typeof domScope.querySelectorAll === 'function' ? Array.from(domScope.querySelectorAll(group) || []) : [];
      if (nodes.length === 0 && typeof domScope.querySelector === 'function') {
        const single = domScope.querySelector(group);
        if (single) nodes = [single];
      }
      const publicMatch = nodes.find(el => {
        const href = el.getAttribute?.('href') || el.href || '';
        return href && !href.includes('studio.youtube.com') && ChannelPageParser.sanitizeChannelPath(href);
      });
      if (publicMatch) {
        return { el: publicMatch, url: ChannelPageParser.sanitizeChannelPath(publicMatch.getAttribute?.('href') || publicMatch.href || '') };
      }
      const anyTextMatch = nodes.find(el => {
        const href = el.getAttribute?.('href') || el.href || '';
        return !href.includes('studio.youtube.com') && el.textContent?.trim();
      });
      if (anyTextMatch) {
        return { el: anyTextMatch, url: ChannelPageParser.sanitizeChannelPath(anyTextMatch.getAttribute?.('href') || anyTextMatch.href || '') };
      }
    }
    return { el: null, url: '' };
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
    const shortsMode = hasDoc && isShortsPage();
    const domScope = (hasDoc && shortsMode)
      ? (document.querySelector('ytd-reel-video-renderer[is-active], ytm-reel-video-renderer[is-active]')
        || document.querySelector('ytd-shorts:not([hidden]), ytm-shorts:not([hidden])')
        || document)
      : (hasDoc ? (document.querySelector('ytd-watch-flexy:not([hidden]), ytd-watch-grid:not([hidden]), ytm-watch:not([hidden])') || document) : null);

    const titleEl = domScope ? domScope.querySelector(
      'h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title, h2.slim-video-information-title, .slim-video-metadata-header h2, .ytShortsVideoTitleViewModelShortsVideoTitle, yt-shorts-video-title-view-model h2, ytd-reel-player-header-renderer h2.title, ytd-reel-player-header-renderer yt-formatted-string.title, ytm-reel-player-header-renderer h2'
    ) : null;
    const { el: authorEl, url: ownerDomUrl } = YouTubeDOMContext._resolveChannelOwner(domScope, shortsMode);
    const subEl = domScope ? domScope.querySelector('#owner-sub-count, ytd-video-owner-renderer #owner-sub-count, yt-formatted-string#owner-sub-count, #upload-info #owner-sub-count, ytm-slim-owner-renderer .slim-owner-bylines') : null;
    const descEl = shortsMode
      ? ((domScope ? domScope.querySelector('yt-reel-metapanel-view-model, #shorts-description') : null)
        || (hasDoc ? document.querySelector('#structured-description ytd-expandable-video-description-body-renderer, ytd-engagement-panel-section-list-renderer[visibility*="EXPANDED"] #description-inline-expander') : null))
      : (domScope ? domScope.querySelector('#description-inline-expander yt-attributed-string, #description, #description-inline-expander, ytm-expandable-video-description-body-renderer') : null);
    const dateEl = (!shortsMode && domScope) ? domScope.querySelector('#info-container #info span:nth-child(3), ytd-watch-metadata #info-strings yt-formatted-string, ytd-video-primary-info-renderer #date') : null;
    const viewsEl = (!shortsMode && domScope) ? domScope.querySelector('#info-container #info span:first-child, ytd-watch-metadata #info span:first-child, ytd-video-primary-info-renderer .view-count') : null;
    const tagEls = domScope ? domScope.querySelectorAll('#description a[href*="/hashtag/"], #super-title a, a[href*="/hashtag/"]') : [];

    const domSubscribers = subEl?.textContent?.trim() || '';
    const domDescription = descEl?.innerText?.trim() || descEl?.textContent?.trim() || '';
    const domDate = dateEl?.textContent?.trim() || '';
    const domViews = viewsEl?.textContent?.trim() || '';
    const domKeywords = Array.from(tagEls).map(el => el.textContent.trim().replace(/^#/, '')).filter(Boolean);
    const itempropHref = (hasDoc && !ownerDomUrl && !safeMeta.channelUrl && !safeMeta.channelId)
      ? (document.querySelector('[itemprop="author"] link[itemprop="url"]')?.getAttribute?.('href') || '')
      : '';
    const domChannelUrl = ownerDomUrl || ChannelPageParser.sanitizeChannelPath(itempropHref);

    const title = titleEl?.textContent?.trim() || safeMeta.title || (hasDoc ? document.title.replace(' - YouTube', '').trim() : '');
    const author = authorEl?.textContent?.trim() || safeMeta.author || 'Chaîne YouTube';
    const subscribers = domSubscribers || safeMeta.subscribers || '';
    const description = safeMeta.description || domDescription || '';
    const keywords = (safeMeta.keywords && safeMeta.keywords.length > 0)
      ? safeMeta.keywords
      : domKeywords;
    const category = safeMeta.category || '';
    const publishDate = safeMeta.publishDate || domDate || '';
    const viewCount = safeMeta.viewCount || domViews || '';
    const channelId = safeMeta.channelId || '';
    const safeMetaUrl = ChannelPageParser.sanitizeChannelPath(safeMeta.channelUrl || '') || safeMeta.channelUrl || '';
    const channelUrl = ownerDomUrl || safeMetaUrl || (channelId ? `/channel/${channelId}` : '') || domChannelUrl;
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

  /**
   * Scrapes the channel total video count displayed in the YouTube channel header DOM
   * @returns {number|null}
   */
  static extractChannelTotalVideosFromDOM() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return null;
    const nodes = document.querySelectorAll(
      '#page-header-container span, #channel-header-container span, tp-yt-app-header span, #page-header-container yt-formatted-string, .yt-content-metadata-view-model__metadata-text, ytm-c4-tabbed-header-renderer span, ytm-page-header-renderer span'
    );
    for (const node of nodes) {
      const txt = node?.textContent?.trim() || '';
      if (!txt || txt.length > 40) continue;
      if (/vid[ée]os?|videos?|видео|本|个视频|個影片/i.test(txt)) {
        const count = parseChannelVideoCount(txt);
        if (count && count > 0) return count;
      }
    }
    return null;
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
