/**
 * Entity representing current YouTube video metadata
 */
export class VideoMetadata {
  constructor(videoId = '', title = '', author = '', url = '', extra = {}) {
    this.videoId = String(videoId || '').trim();
    this.title = String(title || '').trim();
    this.author = String(author || '').trim();
    this.url = String(url || '').trim();
    this.subscribers = String(extra?.subscribers || '').trim();
    this.description = String(extra?.description || '').trim();
    this.keywords = Array.isArray(extra?.keywords) ? extra.keywords : [];
    this.category = String(extra?.category || '').trim();
    this.publishDate = String(extra?.publishDate || '').trim();
    this.viewCount = String(extra?.viewCount || '').trim();
    this.channelId = String(extra?.channelId || '').trim();
  }

  /**
   * Extracts YouTube Video ID from any URL or string
   * @param {string} urlString
   * @returns {string}
   */
  static extractVideoId(urlString) {
    if (!urlString) return '';
    try {
      const url = new URL(urlString, 'https://www.youtube.com');
      if (url.searchParams.has('v')) {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2] || '';
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/')[2] || '';
      }
    } catch {
      const match = urlString.match(/(?:v=|\/shorts\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : '';
    }
    return '';
  }
}

export default VideoMetadata;
