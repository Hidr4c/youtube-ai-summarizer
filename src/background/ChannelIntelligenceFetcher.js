import { parseChannelVideoCount } from '../config/ExtensionConstants.js';
import { ChannelPageParser } from '../parsers/ChannelPageParser.js';
import { ChannelFormatAnalyzer } from '../domain/services/ChannelFormatAnalyzer.js';
import { ChannelHttpClient } from './ChannelHttpClient.js';

/**
 * Service for fetching and compiling comprehensive YouTube channel dossiers.
 * Supports modern ViewModels, classic Polymer renderers, Studio/subpath URLs,
 * dual /videos + /shorts collection, and fallback across /streams and channel root tabs.
 */
export class ChannelIntelligenceFetcher {
  /**
   * Fetches official channel dossier by creator handle, URL or search query
   * @param {string} query Handle (@JulienChieze), URL or search query
   * @param {number} [limit=30]
   * @param {Object} [options]
   * @returns {Promise<{success: boolean, channel?: Object, error?: string}>}
   */
  static async fetchChannelDossier(query, limit = 30, options = {}) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Query string is required');
      }

      const cleanQuery = query.trim();
      const canonicalRoot = await this.resolveChannelPath(cleanQuery, options);
      if (!canonicalRoot) {
        throw new Error(`Impossible de trouver la chaîne YouTube pour : "${cleanQuery}"`);
      }

      const normalizedRoot = ChannelPageParser.sanitizeChannelPath(canonicalRoot) || canonicalRoot.replace(/\/+$/, '');
      const tabLimit = limit === 'all' ? 'all' : Math.max(8, Math.ceil((parseInt(limit, 10) || 30) * 0.75));
      let videosDossier = null;
      let shortsDossier = null;
      let lastError = null;

      try {
        videosDossier = await this._fetchTabDossier(`${normalizedRoot}/videos`, normalizedRoot, tabLimit, options);
      } catch (err) {
        lastError = err;
      }
      try {
        shortsDossier = await this._fetchTabDossier(`${normalizedRoot}/shorts`, normalizedRoot, tabLimit, options);
      } catch (err) {
        lastError = lastError || err;
      }

      const combined = ChannelFormatAnalyzer.mergeDossiers(
        videosDossier,
        shortsDossier,
        limit,
        (d) => this.formatMarkdownDossier(d)
      );
      if (combined && combined.recentVideos.length > 0) {
        return { success: true, channel: combined };
      }

      let lastDossier = combined;
      for (const tabPath of [`${normalizedRoot}/streams`, normalizedRoot]) {
        if (tabPath === `${normalizedRoot}/videos` || tabPath === `${normalizedRoot}/shorts`) continue;
        try {
          const dossier = await this._fetchTabDossier(tabPath, normalizedRoot, limit, options);
          if (dossier) {
            lastDossier = dossier;
            if (Array.isArray(dossier.recentVideos) && dossier.recentVideos.length > 0) {
              const formatted = ChannelFormatAnalyzer.mergeDossiers(dossier, null, limit, (d) => this.formatMarkdownDossier(d));
              return { success: true, channel: formatted };
            }
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (lastDossier) return { success: true, channel: lastDossier };
      throw lastError || new Error('Impossible d\'extraire ytInitialData de la page chaîne');
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  }

  static async _fetchHtmlPage(url, options = {}) {
    return ChannelHttpClient.fetchHtmlPage(url, options);
  }

  static async _fetchTabDossier(tabPath, canonicalRoot, limit, options = {}) {
    const channelUrl = `https://www.youtube.com${tabPath}`;
    const page = await this._fetchHtmlPage(channelUrl, options);
    if (!page.ok && page.status >= 400) {
      throw new Error(`HTTP ${page.status} lors de l'accès à la chaîne`);
    }

    const data = ChannelPageParser.extractBalancedInitialData(page.html);
    if (!data) {
      throw new Error('Impossible d\'extraire ytInitialData de la page chaîne');
    }

    const isShortsTabRequest = tabPath.endsWith('/shorts');
    const isGenuineShortsTab = isShortsTabRequest && ChannelPageParser.isShortsTabData(data);
    const apiKey = page.html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1] || '';
    const clientVersion = page.html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1] || '2.20260101.00.00';
    const visitorData = page.html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/)?.[1] || '';
    const dossier = await this.parseChannelDataWithPagination(data, `${canonicalRoot}/videos`, limit, {
      apiKey,
      clientVersion,
      visitorData: visitorData || data?.responseContext?.visitorData || '',
      browseFetcher: options.browseFetcher || null,
      forceShort: isGenuineShortsTab
    });
    if (isShortsTabRequest && !isGenuineShortsTab && Array.isArray(dossier?.recentVideos)) {
      dossier.recentVideos = dossier.recentVideos.filter((v) => v.isShort);
      dossier.totalFetched = dossier.recentVideos.length;
    }
    return dossier;
  }

  /**
   * Resolves search query, handle, Studio link or channel URL to canonical YouTube channel root path
   * @param {string} rawQuery
   * @param {Object} [options]
   * @returns {Promise<string|null>}
   */
  static async resolveChannelPath(rawQuery, options = {}) {
    const clean = String(rawQuery || '').trim();
    const directPath = ChannelPageParser.sanitizeChannelPath(clean);
    if (directPath) return directPath;
    if (/^UC[A-Za-z0-9_-]{20,}$/.test(clean)) return `/channel/${clean}`;

    if (clean.startsWith('/@') || clean.startsWith('/channel/') || clean.startsWith('/c/') || clean.startsWith('/user/')) {
      return clean;
    }

    // Search YouTube specifically for channels (sp=EgIQAg%3D%3D is YouTube channel filter), then unfiltered fallback
    const searchUrls = [
      `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}&sp=EgIQAg%3D%3D`,
      `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`
    ];
    for (const searchUrl of searchUrls) {
      const searchRes = await this._fetchHtmlPage(searchUrl, options);
      if (!searchRes.ok || !searchRes.html) continue;

      const data = ChannelPageParser.extractBalancedInitialData(searchRes.html);
      const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const items = sections.flatMap((s) => s?.itemSectionRenderer?.contents || []);
      const channelRenderer = items.find((c) => c.channelRenderer)?.channelRenderer;
      const endpoint = channelRenderer?.navigationEndpoint?.browseEndpoint
        || items.find((c) => c.videoRenderer)?.videoRenderer?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
      const base = endpoint?.canonicalBaseUrl || (channelRenderer?.channelId ? `/channel/${channelRenderer.channelId}` : '');
      const resolved = base ? (ChannelPageParser.sanitizeChannelPath(base) || base) : '';
      if (resolved) return resolved;
    }
    return null;
  }

  /** Parses channel header, subscriber count, bio, and latest videos from ytInitialData */
  static parseChannelData(data, canonicalPath, limit = 30, parseOptions = {}) {
    const { title, handle, subscribers, videoCount, bio } = ChannelPageParser.parseHeader(data, canonicalPath);
    const contents = this._findGridContents(data);
    const { videos: recentVideos } = this._extractGridVideos(contents, new Set(), limit, parseOptions);
    const totalChannelVideos = parseChannelVideoCount(videoCount);
    const baseDossier = { title, handle, subscribers, videoCount, totalChannelVideos, bio, recentVideos };
    return ChannelFormatAnalyzer.mergeDossiers(baseDossier, null, limit, (d) => this.formatMarkdownDossier(d));
  }

  /** Parses channel data and paginates InnerTube continuations up to limit. */
  static async parseChannelDataWithPagination(data, fallbackPath, limit = 30, innerTube = {}) {
    const targetLimit = limit === 'all' ? 5000 : Math.max(1, parseInt(limit, 10) || 30);
    const parseOpts = { forceShort: Boolean(innerTube?.forceShort) };
    const dossier = this.parseChannelData(data, fallbackPath, targetLimit, parseOpts);
    const contents = this._findGridContents(data);
    const seenIds = new Set(dossier.recentVideos.map((v) => v.id).filter(Boolean));
    let { continuationToken: nextToken, truncatedOnPage } = this._extractGridVideos(contents, new Set(), targetLimit, parseOpts);

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

      const extracted = this._extractGridVideos(pageItems, seenIds, targetLimit - dossier.recentVideos.length, parseOpts);
      dossier.recentVideos.push(...extracted.videos);
      nextToken = extracted.continuationToken;
      truncatedOnPage = extracted.truncatedOnPage;
      if (extracted.videos.length === 0 && (!nextToken || nextToken === prevToken)) {
        nextToken = null;
        break;
      }
    }

    const updated = ChannelFormatAnalyzer.mergeDossiers(dossier, null, targetLimit, (d) => this.formatMarkdownDossier(d));
    updated.hasMore = Boolean(nextToken || truncatedOnPage || paginationFailed);
    updated.totalFetched = updated.recentVideos.length;
    if (!updated.hasMore && !paginationFailed && updated.recentVideos.length > 0 && !parseOpts.forceShort) {
      updated.totalChannelVideos = updated.recentVideos.length;
    }
    return updated;
  }

  static async _fetchBrowseContinuation(apiKey, clientVersion, continuation, visitorData = '') {
    const res = await this._fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData);
    return res.items || [];
  }

  static async _fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData = '') {
    return ChannelHttpClient.fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData);
  }

  static _findGridContents(data) {
    return ChannelPageParser.findGridContents(data);
  }

  static _extractGridVideos(contents = [], seenIds = new Set(), maxNew = 30, parseOptions = {}) {
    const videos = [];
    let continuationToken = null;
    let truncatedOnPage = false;

    for (const item of contents) {
      const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (token) { continuationToken = token; continue; }
      const parsed = this._parseGridVideoItem(item, parseOptions);
      if (!parsed || (parsed.id && seenIds.has(parsed.id))) continue;
      if (videos.length >= maxNew) { truncatedOnPage = true; continue; }
      if (parsed.id) seenIds.add(parsed.id);
      videos.push(parsed);
    }
    return { videos, continuationToken, truncatedOnPage };
  }

  static _parseGridVideoItem(item, parseOptions = {}) {
    return ChannelPageParser.parseGridVideoItem(item, parseOptions);
  }

  static formatMarkdownDossier(dossier) {
    return ChannelFormatAnalyzer.formatMarkdownDossier(dossier);
  }
}

export default ChannelIntelligenceFetcher;
