import { parseChannelVideoCount } from '../config/ExtensionConstants.js';

/**
 * Service for fetching and compiling comprehensive YouTube channel dossiers
 * Extracts creator bio, subscriber count, total uploads, and 30 latest video releases
 */
export class ChannelIntelligenceFetcher {
  /**
   * Fetches official channel dossier by creator handle, URL or search query
   * @param {string} query Handle (@JulienChieze), URL or search query
   * @param {number} [limit=30]
   * @returns {Promise<{success: boolean, channel?: Object, error?: string}>}
   */
  static async fetchChannelDossier(query, limit = 30, options = {}) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Query string is required');
      }

      const cleanQuery = query.trim();
      let canonicalPath = await this.resolveChannelPath(cleanQuery);
      if (!canonicalPath) {
        throw new Error(`Impossible de trouver la chaîne YouTube pour : "${cleanQuery}"`);
      }

      if (!canonicalPath.endsWith('/videos')) {
        canonicalPath = canonicalPath.replace(/\/+$/, '') + '/videos';
      }

      const channelUrl = `https://www.youtube.com${canonicalPath}`;
      const response = await fetch(channelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} lors de l'accès à la chaîne`);
      }

      const html = await response.text();
      const ytDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!ytDataMatch) {
        throw new Error('Impossible d\'extraire ytInitialData de la page chaîne');
      }

      const apiKey = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1] || '';
      const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1] || '2.20260101.00.00';
      const visitorData = html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/)?.[1] || '';
      const data = JSON.parse(ytDataMatch[1]);
      const dossier = await this.parseChannelDataWithPagination(data, canonicalPath, limit, {
        apiKey,
        clientVersion,
        visitorData: visitorData || data?.responseContext?.visitorData || '',
        browseFetcher: options.browseFetcher || null
      });
      return { success: true, channel: dossier };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Resolves search query or handle to canonical YouTube channel path
   * @param {string} rawQuery
   * @returns {Promise<string|null>}
   */
  static async resolveChannelPath(rawQuery) {
    if (rawQuery.startsWith('http://') || rawQuery.startsWith('https://')) {
      try {
        const parsed = new URL(rawQuery);
        return parsed.pathname;
      } catch (_) {}
    }

    if (rawQuery.startsWith('@')) {
      return `/${rawQuery}`;
    }

    if (rawQuery.startsWith('/@') || rawQuery.startsWith('/channel/') || rawQuery.startsWith('/c/')) {
      return rawQuery;
    }

    // Search YouTube specifically for channels (sp=EgIQAg%253D%253D is YouTube channel filter)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}&sp=EgIQAg%253D%253D`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!searchRes.ok) return null;
    const html = await searchRes.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return null;

    try {
      const data = JSON.parse(match[1]);
      const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      const itemSection = contents?.[0]?.itemSectionRenderer?.contents;
      const channelRenderer = itemSection?.find(c => c.channelRenderer)?.channelRenderer;
      if (channelRenderer?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl) {
        return channelRenderer.navigationEndpoint.browseEndpoint.canonicalBaseUrl;
      }
    } catch (_) {}

    return null;
  }

  /**
   * Parses channel header, subscriber count, bio, and latest videos from ytInitialData
   */
  static parseChannelData(data, canonicalPath, limit = 30) {
    const header = data.header?.pageHeaderRenderer;
    const title = header?.pageTitle || '';
    const bio = header?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content || '';

    let handle = canonicalPath.replace(/^\//, '').replace(/\/videos$/, '');
    let subscribers = '';
    let videoCount = '';

    const metadataRows = header?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
    for (const row of metadataRows) {
      for (const part of (row.metadataParts || [])) {
        const text = part.text?.content || '';
        if (text.startsWith('@')) handle = text;
        else if (/abonn[ée]|subscriber/i.test(text)) subscribers = text;
        else if (/vid[ée]o/i.test(text)) videoCount = text;
      }
    }

    const contents = this._findGridContents(data);
    const { videos: recentVideos } = this._extractGridVideos(contents, new Set(), limit);
    const markdownDossier = this.formatMarkdownDossier({
      title, handle, subscribers, videoCount, bio, recentVideos
    });
    const totalChannelVideos = parseChannelVideoCount(videoCount);
    return { title, handle, subscribers, videoCount, totalChannelVideos, bio, recentVideos, markdownDossier };
  }

  /** Parses channel data and paginates InnerTube continuations up to limit. */
  static async parseChannelDataWithPagination(data, fallbackPath, limit = 30, innerTube = {}) {
    const targetLimit = limit === 'all' ? 5000 : Math.max(1, parseInt(limit, 10) || 30);
    const dossier = this.parseChannelData(data, fallbackPath, targetLimit);
    const contents = this._findGridContents(data);
    const seenIds = new Set(dossier.recentVideos.map((v) => v.id).filter(Boolean));
    let { continuationToken: nextToken, truncatedOnPage } = this._extractGridVideos(contents, new Set(), targetLimit);

    let pageCount = 0;
    const maxPages = 200;
    let paginationFailed = false;
    while (dossier.recentVideos.length < targetLimit && nextToken && innerTube.apiKey && pageCount < maxPages) {
      pageCount++;
      const prevToken = nextToken;
      let pageRes = null;
      if (typeof innerTube.browseFetcher === 'function') {
        pageRes = await innerTube.browseFetcher({
          apiKey: innerTube.apiKey,
          clientVersion: innerTube.clientVersion,
          visitorData: innerTube.visitorData || '',
          continuation: nextToken
        });
      }
      if (!pageRes || pageRes.ok === false) {
        pageRes = await this._fetchBrowseContinuationResult(innerTube.apiKey, innerTube.clientVersion, nextToken, innerTube.visitorData);
      }
      if (!pageRes?.ok) { paginationFailed = true; break; }
      const pageItems = pageRes.items || [];
      if (pageItems.length === 0) { nextToken = null; break; }

      const extracted = this._extractGridVideos(pageItems, seenIds, targetLimit - dossier.recentVideos.length);
      dossier.recentVideos.push(...extracted.videos);
      nextToken = extracted.continuationToken;
      truncatedOnPage = extracted.truncatedOnPage;
      if (extracted.videos.length === 0 && (!nextToken || nextToken === prevToken)) {
        nextToken = null;
        break;
      }
    }

    dossier.hasMore = Boolean(nextToken || truncatedOnPage || paginationFailed);
    dossier.totalFetched = dossier.recentVideos.length;
    if (!dossier.hasMore && !paginationFailed && dossier.recentVideos.length > 0) {
      dossier.totalChannelVideos = dossier.recentVideos.length;
    }
    dossier.markdownDossier = this.formatMarkdownDossier(dossier);
    return dossier;
  }

  /** Calls InnerTube browse continuation endpoint and returns flattened continuation items. */
  static async _fetchBrowseContinuation(apiKey, clientVersion, continuation, visitorData = '') {
    const res = await this._fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData);
    return res.items || [];
  }

  /** Calls InnerTube browse continuation endpoint and reports HTTP status + items. */
  static async _fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData = '') {
    try {
      const client = { clientName: 'WEB', clientVersion: clientVersion || '2.20260101.00.00', hl: 'fr', gl: 'FR' };
      if (visitorData) client.visitorData = visitorData;
      const headers = { 'Content-Type': 'application/json' };
      if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;
      const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers, body: JSON.stringify({ context: { client }, continuation })
      });
      if (!res.ok) return { ok: false, status: res.status, items: [] };
      const json = await res.json();
      const items = [];
      for (const action of (json.onResponseReceivedActions || [])) {
        const batch = action.appendContinuationItemsAction?.continuationItems || action.reloadContinuationItemsCommand?.continuationItems;
        if (Array.isArray(batch)) items.push(...batch);
      }
      return { ok: true, status: 200, items };
    } catch (_) {
      return { ok: false, status: 0, items: [] };
    }
  }

  /** Locates grid items array inside ytInitialData channel tabs. */
  static _findGridContents(data) {
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    return tabs.find((t) => t.tabRenderer?.content?.richGridRenderer)?.tabRenderer?.content?.richGridRenderer?.contents || [];
  }

  /** Extracts deduplicated video items and trailing continuation token from grid contents. */
  static _extractGridVideos(contents = [], seenIds = new Set(), maxNew = 30) {
    const videos = [];
    let continuationToken = null;
    let truncatedOnPage = false;

    for (const item of contents) {
      const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (token) { continuationToken = token; continue; }
      const parsed = this._parseGridVideoItem(item);
      if (!parsed || (parsed.id && seenIds.has(parsed.id))) continue;
      if (videos.length >= maxNew) { truncatedOnPage = true; continue; }
      if (parsed.id) seenIds.add(parsed.id);
      videos.push(parsed);
    }
    return { videos, continuationToken, truncatedOnPage };
  }

  /** Parses lockupViewModel or videoRenderer grid item into normalized metadata. */
  static _parseGridVideoItem(item) {
    const lockup = item?.richItemRenderer?.content?.lockupViewModel;
    if (lockup) {
      const vId = lockup.contentId || '';
      const vTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || '';
      const metaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      const parts = metaRows.flatMap((r) => (r.metadataParts || []).map((p) => p.text?.content).filter(Boolean));
      return { id: vId, title: vTitle, url: vId ? `https://www.youtube.com/watch?v=${vId}` : '', meta: parts.join(' • ') };
    }
    const vr = item?.richItemRenderer?.content?.videoRenderer || item?.gridVideoRenderer;
    if (!vr) return null;
    const vId = vr.videoId || '';
    const vTitle = vr.title?.runs?.map((r) => r.text).join('') || vr.title?.simpleText || '';
    const parts = [vr.viewCountText?.simpleText, vr.publishedTimeText?.simpleText].filter(Boolean);
    return { id: vId, title: vTitle, url: vId ? `https://www.youtube.com/watch?v=${vId}` : '', meta: parts.join(' • ') };
  }

  /** Formats structured dossier into concise Markdown block for prompt context */
  static formatMarkdownDossier(dossier) {
    const { title, handle, subscribers, videoCount, bio, recentVideos = [] } = dossier;
    const lines = [
      `### 📺 DOSSIER OFFICIEL DE LA CHAÎNE : ${title || 'Créateur YouTube'} (${handle || ''})`,
      `- **Audience & Volume** : ${subscribers || 'Non communiqué'} • ${videoCount || `${recentVideos.length} vidéos récentes`}`
    ];
    if (bio) lines.push(`- **Bio Officielle** :\n"""\n${bio.trim()}\n"""`);
    if (recentVideos.length > 0) {
      const cap = 40;
      lines.push(`- **Dernières vidéos publiées (${recentVideos.length})** :`);
      recentVideos.slice(0, cap).forEach((v, idx) => {
        lines.push(`  ${idx + 1}. **${v.title}** ${v.meta ? `(${v.meta})` : ''} - https://youtu.be/${v.id}`);
      });
      if (recentVideos.length > cap) {
        lines.push(`  ... (+${recentVideos.length - cap} autres vidéos indexées dans le catalogue)`);
      }
    }
    return lines.join('\n');
  }
}

export default ChannelIntelligenceFetcher;
