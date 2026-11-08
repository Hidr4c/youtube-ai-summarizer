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
  static async fetchChannelDossier(query, limit = 30) {
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

      const data = JSON.parse(ytDataMatch[1]);
      const dossier = this.parseChannelData(data, canonicalPath, limit);
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

    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const videosTab = tabs.find(t => t.tabRenderer?.content?.richGridRenderer);
    const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

    const recentVideos = [];
    for (const item of contents) {
      if (recentVideos.length >= limit) break;
      const lockup = item.richItemRenderer?.content?.lockupViewModel;
      if (!lockup) continue;

      const vTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || '';
      const vId = lockup.contentId || '';
      const metaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      const parts = [];
      for (const r of metaRows) {
        for (const p of (r.metadataParts || [])) {
          if (p.text?.content) parts.push(p.text.content);
        }
      }

      recentVideos.push({
        id: vId,
        title: vTitle,
        url: vId ? `https://www.youtube.com/watch?v=${vId}` : '',
        meta: parts.join(' • ')
      });
    }

    const markdownDossier = this.formatMarkdownDossier({
      title,
      handle,
      subscribers,
      videoCount,
      bio,
      recentVideos
    });

    return {
      title,
      handle,
      subscribers,
      videoCount,
      bio,
      recentVideos,
      markdownDossier
    };
  }

  /**
   * Formats structured dossier into concise Markdown block for prompt context
   */
  static formatMarkdownDossier(dossier) {
    const { title, handle, subscribers, videoCount, bio, recentVideos = [] } = dossier;
    const lines = [
      `### 📺 DOSSIER OFFICIEL DE LA CHAÎNE : ${title || 'Créateur YouTube'} (${handle || ''})`,
      `- **Audience & Volume** : ${subscribers || 'Non communiqué'} • ${videoCount || `${recentVideos.length} vidéos récentes`}`
    ];

    if (bio) {
      lines.push(`- **Bio Officielle** :\n"""\n${bio.trim()}\n"""`);
    }

    if (recentVideos.length > 0) {
      lines.push(`- **Dernières vidéos publiées (${recentVideos.length})** :`);
      recentVideos.forEach((v, idx) => {
        lines.push(`  ${idx + 1}. **${v.title}** ${v.meta ? `(${v.meta})` : ''} - https://youtu.be/${v.id}`);
      });
    }

    return lines.join('\n');
  }
}

export default ChannelIntelligenceFetcher;
