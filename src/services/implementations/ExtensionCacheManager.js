import { ChromeStorageService } from './ChromeStorageService.js';

const INDEX_KEY = 'yt_ai_cache_index';
const CACHE_PREFIX = 'yt_ai_cache_';

/**
 * Clean Architecture Extension Cache Persistence Manager
 * Manages video summaries, transcripts, and audit dossiers in chrome.storage.local
 */
export class ExtensionCacheManager {
  /**
   * @param {Object} [dependencies]
   */
  constructor(dependencies = {}) {
    this.storage = dependencies.storage || new ChromeStorageService();
  }

  /**
   * Retrieves the current index of all cached items
   * @returns {Promise<Array<Object>>}
   */
  async getIndex() {
    const list = await this.storage.get(INDEX_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  /**
   * Saves or updates cache entry for a video
   * @param {string} videoId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async saveEntry(videoId, payload = {}) {
    if (!videoId) return null;

    const key = `${CACHE_PREFIX}${videoId}`;
    const now = Date.now();
    const data = {
      videoId,
      title: payload.title || 'YouTube Video',
      cachedAt: now,
      summary: payload.summary || null,
      audit: payload.audit || null,
      comments: payload.comments || null,
      transcript: payload.transcript || null
    };

    const types = [];
    if (data.summary) types.push('summary');
    if (data.audit) types.push('audit');
    if (data.comments) types.push('comments');
    if (data.transcript) types.push('transcript');

    const serialized = JSON.stringify(data);
    const sizeBytes = serialized.length * 2; // rough UTF-16 byte estimate

    await this.storage.set(key, data);

    const index = await this.getIndex();
    const existingIdx = index.findIndex(item => item.videoId === videoId);
    const record = {
      videoId,
      title: data.title,
      cachedAt: now,
      sizeBytes,
      types
    };

    if (existingIdx >= 0) {
      index[existingIdx] = record;
    } else {
      index.push(record);
    }

    await this.storage.set(INDEX_KEY, index);
    return record;
  }

  /**
   * Retrieves cached data for a specific video
   * @param {string} videoId
   * @returns {Promise<Object|null>}
   */
  async getEntry(videoId) {
    if (!videoId) return null;
    return await this.storage.get(`${CACHE_PREFIX}${videoId}`, null);
  }

  /**
   * Calculates comprehensive cache metrics
   * @returns {Promise<{totalBytes: number, totalVideos: number, formattedSize: string, entries: Array}>}
   */
  async getStats() {
    const index = await this.getIndex();
    let totalBytes = 0;
    for (const item of index) {
      totalBytes += item.sizeBytes || 0;
    }

    const sorted = [...index].sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0));

    return {
      totalBytes,
      totalVideos: index.length,
      formattedSize: ExtensionCacheManager.formatBytes(totalBytes),
      entries: sorted
    };
  }

  /**
   * Purges all cached video data while preserving user settings
   * @returns {Promise<{clearedCount: number, freedBytes: number}>}
   */
  async clearAll() {
    const index = await this.getIndex();
    const keys = index.map(item => `${CACHE_PREFIX}${item.videoId}`);
    let freedBytes = 0;
    for (const item of index) {
      freedBytes += item.sizeBytes || 0;
    }

    if (keys.length > 0) {
      await this.storage.removeMultiple(keys);
    }
    await this.storage.remove(INDEX_KEY);

    return {
      clearedCount: index.length,
      freedBytes
    };
  }

  /**
   * Purges items older than a given number of days
   * @param {number} days
   * @returns {Promise<{clearedCount: number, freedBytes: number}>}
   */
  async clearOlderThan(days) {
    const numericDays = Number(days);
    if (!numericDays || numericDays <= 0) return { clearedCount: 0, freedBytes: 0 };

    const index = await this.getIndex();
    const cutoff = Date.now() - (numericDays * 24 * 60 * 60 * 1000);
    const toRemove = [];
    const remaining = [];
    let freedBytes = 0;

    for (const item of index) {
      if ((item.cachedAt || 0) < cutoff) {
        toRemove.push(`${CACHE_PREFIX}${item.videoId}`);
        freedBytes += item.sizeBytes || 0;
      } else {
        remaining.push(item);
      }
    }

    if (toRemove.length > 0) {
      await this.storage.removeMultiple(toRemove);
      await this.storage.set(INDEX_KEY, remaining);
    }

    return {
      clearedCount: toRemove.length,
      freedBytes
    };
  }

  /**
   * Purges oldest entries until total cache size is under target maxBytes
   * @param {number} maxBytes
   * @returns {Promise<{clearedCount: number, freedBytes: number}>}
   */
  async clearToMaxBytes(maxBytes) {
    const target = Number(maxBytes);
    if (isNaN(target) || target < 0) return { clearedCount: 0, freedBytes: 0 };

    const index = await this.getIndex();
    // Sort oldest first
    const sorted = [...index].sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));

    let currentTotal = sorted.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const toRemoveKeys = [];
    const remaining = [];
    let freedBytes = 0;

    for (const item of sorted) {
      if (currentTotal > target) {
        toRemoveKeys.push(`${CACHE_PREFIX}${item.videoId}`);
        freedBytes += item.sizeBytes || 0;
        currentTotal -= item.sizeBytes || 0;
      } else {
        remaining.push(item);
      }
    }

    if (toRemoveKeys.length > 0) {
      await this.storage.removeMultiple(toRemoveKeys);
      await this.storage.set(INDEX_KEY, remaining);
    }

    return {
      clearedCount: toRemoveKeys.length,
      freedBytes
    };
  }

  /**
   * Human-readable byte size formatter
   * @param {number} bytes
   * @returns {string}
   */
  static formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 Ko';
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${Math.round(kb)} Ko`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} Mo`;
  }
}

export default ExtensionCacheManager;
