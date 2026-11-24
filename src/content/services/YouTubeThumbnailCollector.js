import { ModelCapabilities } from '../../config/ModelCapabilities.js';
import { ChannelFormatAnalyzer } from '../../domain/services/ChannelFormatAnalyzer.js';

const THUMB_CACHE = new Map();
const MAX_CACHE_ENTRIES = 60;
const TILE_W = 320;
const TILE_H = 180;
const COLS = 3;

/**
 * Fetches YouTube video thumbnails safely via the background image proxy and
 * composes indexed contact-sheet grids for Watch, Channel Audits, and Q&A.
 */
export class YouTubeThumbnailCollector {
  static clearCache() {
    THUMB_CACHE.clear();
  }

  static getCandidateUrls(videoId, preferStandard = false) {
    if (!videoId) return [];
    const base = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}`;
    return preferStandard
      ? [`${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`]
      : [`${base}/maxresdefault.jpg`, `${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`];
  }

  static _remember(key, val) {
    if (THUMB_CACHE.size >= MAX_CACHE_ENTRIES) {
      const oldest = THUMB_CACHE.keys().next().value;
      if (oldest) THUMB_CACHE.delete(oldest);
    }
    THUMB_CACHE.set(key, val);
  }

  static async fetchThumbnail(videoId, { preferStandard = false } = {}) {
    if (!videoId || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return null;
    if (THUMB_CACHE.has(videoId)) return THUMB_CACHE.get(videoId);

    for (const url of YouTubeThumbnailCollector.getCandidateUrls(videoId, preferStandard)) {
      const res = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({ action: 'FETCH_SAFE_IMAGE', url }, (r) => resolve(r || null));
        } catch (_) {
          resolve(null);
        }
      });
      if (res?.success && res.dataUrl) {
        const frame = {
          name: `youtube_thumbnail_${videoId}.jpg`,
          label: `YouTube Thumbnail (${videoId})`,
          dataUrl: res.dataUrl,
          width: res.width || 480,
          height: res.height || 360
        };
        YouTubeThumbnailCollector._remember(videoId, frame);
        return frame;
      }
    }
    return null;
  }

  static _loadImage(doc, dataUrl) {
    if (!doc || typeof Image === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  static async _renderContactSheet(entries = [], sheetIndex = 1, doc = typeof document !== 'undefined' ? document : null) {
    if (!doc?.createElement || entries.length === 0) return null;
    const rows = Math.ceil(entries.length / COLS);
    const canvas = doc.createElement('canvas');
    canvas.width = COLS * TILE_W;
    canvas.height = rows * TILE_H;
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let drawn = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const { video, thumb } = entries[i];
      const img = await YouTubeThumbnailCollector._loadImage(doc, thumb.dataUrl);
      if (!img) continue;
      const x = (i % COLS) * TILE_W;
      const y = Math.floor(i / COLS) * TILE_H;
      ctx.drawImage(img, x, y, TILE_W, TILE_H);

      const tag = `#${video.sampleIndex ?? (i + 1)} ${ChannelFormatAnalyzer.isShortItem(video) ? 'SHORT' : 'VIDEO'}`;
      ctx.font = 'bold 15px sans-serif';
      const padW = Math.min(TILE_W - 12, Math.max(84, ctx.measureText(tag).width + 16));
      ctx.fillStyle = 'rgba(10, 12, 16, 0.86)';
      ctx.fillRect(x + 6, y + 6, padW, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tag, x + 13, y + 23);
      drawn += 1;
    }
    if (drawn === 0) return null;
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const firstId = entries[0]?.video?.sampleIndex ?? 1;
      const lastId = entries[entries.length - 1]?.video?.sampleIndex ?? entries.length;
      return {
        name: `channel_thumbnails_sheet_${sheetIndex}.jpg`,
        label: `Channel Video Thumbnails (#${firstId}..#${lastId})`,
        dataUrl
      };
    } catch (_) {
      return null;
    }
  }

  static _pickRepresentativeVideos(videos = [], maxTiles = 12) {
    if (!Array.isArray(videos) || videos.length === 0) return [];
    if (videos.length <= maxTiles) return videos;
    const step = videos.length / maxTiles;
    const picked = [];
    for (let i = 0; i < maxTiles; i += 1) {
      const item = videos[Math.min(videos.length - 1, Math.floor(i * step))];
      if (item && !picked.includes(item)) picked.push(item);
    }
    return picked;
  }

  static async buildChannelThumbnailSheets(videos = [], { maxTiles = 12, perSheet = 6, doc = typeof document !== 'undefined' ? document : null } = {}) {
    if (!doc?.createElement) return [];
    const subset = YouTubeThumbnailCollector._pickRepresentativeVideos(
      videos.map((v, idx) => ({ ...v, sampleIndex: v.sampleIndex ?? (idx + 1) })),
      maxTiles
    );
    const fetched = await Promise.all(
      subset.map(async (video) => ({
        video,
        thumb: await YouTubeThumbnailCollector.fetchThumbnail(video.id, { preferStandard: true })
      }))
    );
    const valid = fetched.filter((e) => e.thumb?.dataUrl);
    const sheets = [];
    for (let i = 0; i < valid.length; i += perSheet) {
      const sheet = await YouTubeThumbnailCollector._renderContactSheet(valid.slice(i, i + perSheet), sheets.length + 1, doc);
      if (sheet?.dataUrl) sheets.push(sheet);
    }
    return sheets;
  }

  static async collectForChannelAudit(state = {}, videos = [], maxTiles = 12) {
    const provider = state?.currentProvider || 'lmstudio';
    const activeModel = typeof state?.getActiveModel === 'function' ? state.getActiveModel() : (state?.selectedModel || '');
    if (!ModelCapabilities.supportsImages(provider, activeModel, state?.modelCapabilities?.[activeModel] || null)) return [];
    return YouTubeThumbnailCollector.buildChannelThumbnailSheets(videos, { maxTiles }).catch(() => []);
  }
}

export default YouTubeThumbnailCollector;
