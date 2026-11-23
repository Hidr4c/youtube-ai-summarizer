import { parseChannelVideoCount } from '../config/ExtensionConstants.js';

const CHANNEL_SUBPATHS_RE = /\/(?:videos|shorts|streams|live|playlists|community|posts|channels|about|featured|search|content|editing|analytics|monetization)(?:\/.*)?$/i;

/**
 * Multi-version YouTube channel URL sanitizer and ytInitialData parser.
 * Supports modern ViewModels (lockupViewModel, shortsLockupViewModel, pageHeaderRenderer),
 * classic Polymer renderers (videoRenderer, gridVideoRenderer, reelItemRenderer, c4TabbedHeaderRenderer),
 * sectionListRenderer grids, and creator metadata fallbacks.
 */
export class ChannelPageParser {
  /**
   * Normalizes any YouTube / Studio URL or relative path to a canonical channel path
   * (/@handle, /channel/UC..., /c/Name, /user/Name), stripping tab/studio suffixes.
   * @param {string} rawHref
   * @returns {string}
   */
  static sanitizeChannelPath(rawHref = '') {
    if (!rawHref || typeof rawHref !== 'string') return '';
    const trimmed = rawHref.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('@')) {
      const handle = trimmed.split(/[/?#]/)[0];
      return handle.length > 1 ? `/${handle}` : '';
    }

    let pathname = '';
    try {
      if (/^https?:\/\//i.test(trimmed)) {
        const u = new URL(trimmed);
        if (!u.hostname.endsWith('youtube.com')) return '';
        pathname = u.pathname || '';
      } else if (trimmed.startsWith('/')) {
        pathname = new URL(trimmed, 'https://www.youtube.com').pathname || '';
      }
    } catch (_) {
      return '';
    }

    if (!pathname) return '';
    const handleMatch = pathname.match(/^\/(@[^/?#]+)/);
    if (handleMatch) return `/${handleMatch[1]}`;

    const idMatch = pathname.match(/^\/(channel|c|user)\/([^/?#]+)/i);
    if (idMatch) {
      const cleaned = pathname.replace(CHANNEL_SUBPATHS_RE, '').replace(/\/+$/, '');
      const canonicalMatch = cleaned.match(/^\/(channel|c|user)\/([^/?#]+)/i);
      return canonicalMatch ? `/${canonicalMatch[1].toLowerCase()}/${canonicalMatch[2]}` : `/${idMatch[1].toLowerCase()}/${idMatch[2]}`;
    }
    return '';
  }

  /**
   * Extracts balanced JSON object for ytInitialData from channel HTML across script formats
   * @param {string} html
   * @returns {Object|null}
   */
  static extractBalancedInitialData(html) {
    if (!html || typeof html !== 'string') return null;
    const markers = ['var ytInitialData =', 'window["ytInitialData"] =', 'ytInitialData ='];
    for (const marker of markers) {
      let idx = html.indexOf(marker);
      while (idx !== -1) {
        const braceStart = html.indexOf('{', idx + marker.length);
        if (braceStart !== -1 && braceStart - (idx + marker.length) < 32) {
          const parsed = ChannelPageParser._parseBalancedJsonAt(html, braceStart);
          if (parsed) return parsed;
        }
        idx = html.indexOf(marker, idx + marker.length);
      }
    }
    const regexMatch = html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/s);
    if (regexMatch) {
      try { return JSON.parse(regexMatch[1]); } catch (_) {}
    }
    return null;
  }

  static _parseBalancedJsonAt(str, start) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < str.length; i++) {
      const c = str[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(str.slice(start, i + 1)); } catch (_) { return null; }
          }
        }
      }
    }
    return null;
  }

  /**
   * Parses channel header metadata across pageHeaderRenderer, c4TabbedHeaderRenderer, and channelMetadataRenderer
   * @param {Object} data
   * @param {string} canonicalPath
   * @returns {{ title: string, handle: string, subscribers: string, videoCount: string, bio: string }}
   */
  static parseHeader(data, canonicalPath = '') {
    const pageHeader = data?.header?.pageHeaderRenderer;
    const c4Header = data?.header?.c4TabbedHeaderRenderer;
    const metaRenderer = data?.metadata?.channelMetadataRenderer;
    const micro = data?.microformat?.microformatDataRenderer;

    let title = pageHeader?.pageTitle || c4Header?.title || metaRenderer?.title || micro?.title || '';
    let bio = pageHeader?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content
      || metaRenderer?.description || micro?.description || '';

    let handle = canonicalPath.replace(/^\//, '').replace(CHANNEL_SUBPATHS_RE, '');
    if (metaRenderer?.vanityChannelUrl) {
      const vanityPath = ChannelPageParser.sanitizeChannelPath(metaRenderer.vanityChannelUrl);
      if (vanityPath.startsWith('/@')) handle = vanityPath.slice(1);
    }

    let subscribers = c4Header?.subscriberCountText?.simpleText || '';
    let videoCount = c4Header?.videosCountText?.runs?.map(r => r.text).join('') || c4Header?.videosCountText?.simpleText || '';

    const metadataRows = pageHeader?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
    for (const row of metadataRows) {
      for (const part of (row.metadataParts || [])) {
        const text = part.text?.content || '';
        if (text.startsWith('@')) handle = text;
        else if (/abonn[ée]|subscriber/i.test(text)) subscribers = text;
        else if (/vid[ée]o/i.test(text)) videoCount = text;
      }
    }
    return { title, handle, subscribers, videoCount, bio };
  }

  /**
   * Locates grid items array across richGridRenderer, sectionListRenderer, mobile singleColumn, and reel/grid tabs
   * @param {Object} data
   * @returns {Array<Object>}
   */
  static findGridContents(data) {
    const twoColTabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const oneColTabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    const tabs = [...twoColTabs, ...oneColTabs];

    for (const t of tabs) {
      const rich = t.tabRenderer?.content?.richGridRenderer?.contents;
      if (Array.isArray(rich) && rich.length > 0) return rich;
    }
    for (const t of tabs) {
      const secList = t.tabRenderer?.content?.sectionListRenderer?.contents || [];
      const flattened = [];
      for (const sec of secList) {
        for (const item of (sec?.itemSectionRenderer?.contents || [])) {
          if (item?.gridRenderer?.items) flattened.push(...item.gridRenderer.items);
          else if (item?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items) flattened.push(...item.shelfRenderer.content.expandedShelfContentsRenderer.items);
          else if (item?.shelfRenderer?.content?.horizontalListRenderer?.items) flattened.push(...item.shelfRenderer.content.horizontalListRenderer.items);
          else if (item?.reelShelfRenderer?.items) flattened.push(...item.reelShelfRenderer.items);
          else flattened.push(item);
        }
        if (sec?.continuationItemRenderer) flattened.push(sec);
      }
      if (flattened.length > 0) return flattened;
    }
    return [];
  }

  /**
   * Verifies that parsed ytInitialData actually depicts a channel Shorts tab rather than a Home fallback redirect.
   * @param {Object} data
   * @returns {boolean}
   */
  static isShortsTabData(data) {
    const twoColTabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const oneColTabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    const selectedTab = [...twoColTabs, ...oneColTabs].find((t) => t?.tabRenderer?.selected)?.tabRenderer;
    const tabUrl = selectedTab?.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
    const tabTitle = selectedTab?.title || '';
    if (tabUrl.endsWith('/shorts') || /^shorts$/i.test(tabTitle)) return true;
    const items = this.findGridContents(data);
    return items.some((it) => Boolean(
      it?.richItemRenderer?.content?.shortsLockupViewModel
      || it?.shortsLockupViewModel
      || it?.richItemRenderer?.content?.reelItemRenderer
      || it?.reelItemRenderer
    ));
  }

  /**
   * Normalizes modern and legacy YouTube video/short grid renderers into uniform metadata
   * @param {Object} item
   * @param {Object} [options]
   * @returns {{ id: string, title: string, url: string, meta: string, isShort: boolean, contentType: 'short'|'video' }|null}
   */
  static parseGridVideoItem(item, options = {}) {
    const forceShort = Boolean(options.forceShort);
    const lockup = item?.richItemRenderer?.content?.lockupViewModel || item?.lockupViewModel;
    if (lockup) {
      const vId = lockup.contentId || '';
      const vTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || '';
      const metaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      const parts = metaRows.flatMap((r) => (r.metadataParts || []).map((p) => p.text?.content).filter(Boolean));
      const tapCmd = lockup.rendererContext?.commandContext?.onTap?.innertubeCommand;
      const isShort = Boolean(forceShort || tapCmd?.reelWatchEndpoint || tapCmd?.commandMetadata?.webCommandMetadata?.url?.startsWith?.('/shorts/'));
      const url = vId ? (isShort ? `https://www.youtube.com/shorts/${vId}` : `https://www.youtube.com/watch?v=${vId}`) : '';
      return { id: vId, title: vTitle, url, meta: parts.join(' • '), isShort, contentType: isShort ? 'short' : 'video' };
    }

    const shortsLockup = item?.richItemRenderer?.content?.shortsLockupViewModel || item?.shortsLockupViewModel;
    if (shortsLockup) {
      const vId = shortsLockup.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId
        || String(shortsLockup.entityId || '').replace(/^shorts-lockup-/, '')
        || '';
      const vTitle = shortsLockup.overlayMetadata?.primaryText?.content || shortsLockup.accessibilityText || '';
      const views = shortsLockup.overlayMetadata?.secondaryText?.content || '';
      if (!vId) return null;
      return { id: vId, title: vTitle, url: `https://www.youtube.com/shorts/${vId}`, meta: views, isShort: true, contentType: 'short' };
    }

    const reel = item?.richItemRenderer?.content?.reelItemRenderer || item?.reelItemRenderer;
    if (reel) {
      const vId = reel.videoId || reel.navigationEndpoint?.reelWatchEndpoint?.videoId || '';
      const vTitle = reel.headline?.simpleText || reel.headline?.runs?.map(r => r.text).join('') || '';
      const views = reel.viewCountText?.simpleText || '';
      if (!vId) return null;
      return { id: vId, title: vTitle, url: `https://www.youtube.com/shorts/${vId}`, meta: views, isShort: true, contentType: 'short' };
    }

    const vr = item?.richItemRenderer?.content?.videoRenderer
      || item?.gridVideoRenderer
      || item?.videoRenderer
      || item?.compactVideoRenderer
      || item?.playlistVideoRenderer;
    if (!vr) return null;
    const vId = vr.videoId || '';
    const vTitle = vr.title?.runs?.map((r) => r.text).join('') || vr.title?.simpleText || '';
    const parts = [vr.viewCountText?.simpleText, vr.publishedTimeText?.simpleText].filter(Boolean);
    const isShort = Boolean(forceShort || vr.navigationEndpoint?.reelWatchEndpoint || vr.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url?.startsWith?.('/shorts/'));
    const url = vId ? (isShort ? `https://www.youtube.com/shorts/${vId}` : `https://www.youtube.com/watch?v=${vId}`) : '';
    return { id: vId, title: vTitle, url, meta: parts.join(' • '), isShort, contentType: isShort ? 'short' : 'video' };
  }

  static computeTotalVideos(videoCountStr, fallbackCount) {
    return parseChannelVideoCount(videoCountStr) || fallbackCount || null;
  }
}

export default ChannelPageParser;
