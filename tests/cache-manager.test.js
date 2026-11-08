import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ExtensionCacheManager } from '../src/services/implementations/ExtensionCacheManager.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  async get(key, defaultValue = null) {
    return this.store[key] !== undefined ? this.store[key] : defaultValue;
  }
  async set(key, value) {
    this.store[key] = value;
  }
  async remove(key) {
    delete this.store[key];
  }
  async removeMultiple(keys) {
    for (const k of keys) {
      delete this.store[k];
    }
  }
}

describe('ExtensionCacheManager Specification & Purge Policies', () => {
  let storage;
  let cacheManager;

  beforeEach(() => {
    storage = new MockStorage();
    cacheManager = new ExtensionCacheManager({ storage });
  });

  it('saves entries, builds cache index and computes byte size', async () => {
    const entry = await cacheManager.saveEntry('VID_1', {
      title: 'Video Title One',
      summary: 'Short summary',
      audit: { score: 95 }
    });

    assert.equal(entry.videoId, 'VID_1');
    assert.ok(entry.sizeBytes > 0);
    assert.deepEqual(entry.types, ['summary', 'audit']);

    const stats = await cacheManager.getStats();
    assert.equal(stats.totalVideos, 1);
    assert.ok(stats.totalBytes > 0);
    assert.ok(stats.formattedSize.includes('Ko') || stats.formattedSize.includes('Mo'));

    const fetched = await cacheManager.getEntry('VID_1');
    assert.equal(fetched.videoId, 'VID_1');
    assert.equal(fetched.summary, 'Short summary');
  });

  it('clears all cache while preserving unrelated user preferences', async () => {
    await storage.set('apiKey_openai', 'sk-test-secret');
    await cacheManager.saveEntry('VID_A', { summary: 'Sum A' });
    await cacheManager.saveEntry('VID_B', { summary: 'Sum B' });

    let stats = await cacheManager.getStats();
    assert.equal(stats.totalVideos, 2);

    const purgeResult = await cacheManager.clearAll();
    assert.equal(purgeResult.clearedCount, 2);

    stats = await cacheManager.getStats();
    assert.equal(stats.totalVideos, 0);
    assert.equal(stats.totalBytes, 0);

    // Verify user preferences are untouched
    assert.equal(await storage.get('apiKey_openai'), 'sk-test-secret');
  });

  it('purges items older than specified threshold days', async () => {
    const now = Date.now();
    const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

    await cacheManager.saveEntry('OLD_VID', { summary: 'Old video content' });
    await cacheManager.saveEntry('NEW_VID', { summary: 'Recent video content' });

    // Manually backdate the old entry in the mock store
    const index = await cacheManager.getIndex();
    index.find(i => i.videoId === 'OLD_VID').cachedAt = tenDaysAgo;
    index.find(i => i.videoId === 'NEW_VID').cachedAt = twoDaysAgo;
    await storage.set('yt_ai_cache_index', index);

    // Purge older than 7 days
    const purgeResult = await cacheManager.clearOlderThan(7);
    assert.equal(purgeResult.clearedCount, 1);

    const stats = await cacheManager.getStats();
    assert.equal(stats.totalVideos, 1);
    assert.equal(stats.entries[0].videoId, 'NEW_VID');
  });

  it('purges oldest entries when exceeding max size target', async () => {
    await cacheManager.saveEntry('V1', { summary: 'A'.repeat(500) });
    await cacheManager.saveEntry('V2', { summary: 'B'.repeat(500) });

    const statsBefore = await cacheManager.getStats();
    assert.equal(statsBefore.totalVideos, 2);

    // Set maxBytes to half
    const purgeResult = await cacheManager.clearToMaxBytes(statsBefore.totalBytes / 2);
    assert.equal(purgeResult.clearedCount, 1);

    const statsAfter = await cacheManager.getStats();
    assert.equal(statsAfter.totalVideos, 1);
  });

  it('updates existing entry without creating duplicate records in index', async () => {
    await cacheManager.saveEntry('VID_DUP', { title: 'First Version', summary: 'Summary 1' });
    let index = await cacheManager.getIndex();
    assert.equal(index.length, 1);
    assert.equal(index[0].title, 'First Version');

    await cacheManager.saveEntry('VID_DUP', { title: 'Second Version', summary: 'Summary 2' });
    index = await cacheManager.getIndex();
    assert.equal(index.length, 1, 'Index should still contain exactly 1 entry');
    assert.equal(index[0].title, 'Second Version');

    const entry = await cacheManager.getEntry('VID_DUP');
    assert.equal(entry.summary, 'Summary 2');
  });

  it('handles null, undefined or empty videoId gracefully', async () => {
    assert.equal(await cacheManager.saveEntry(null, { summary: 'test' }), null);
    assert.equal(await cacheManager.saveEntry('', { summary: 'test' }), null);
    assert.equal(await cacheManager.getEntry(null), null);
    assert.equal(await cacheManager.getEntry(''), null);
  });

  it('formats byte sizes into human-readable units accurately', () => {
    assert.equal(ExtensionCacheManager.formatBytes(0), '0 Ko');
    assert.equal(ExtensionCacheManager.formatBytes(-50), '0 Ko');
    assert.equal(ExtensionCacheManager.formatBytes(1024), '1 Ko');
    assert.equal(ExtensionCacheManager.formatBytes(250 * 1024), '250 Ko');
    assert.equal(ExtensionCacheManager.formatBytes(1024 * 1024), '1.0 Mo');
    assert.equal(ExtensionCacheManager.formatBytes(2.5 * 1024 * 1024), '2.5 Mo');
  });

  it('handles invalid arguments in purge methods without throwing', async () => {
    const resOlder = await cacheManager.clearOlderThan('invalid');
    assert.equal(resOlder.clearedCount, 0);

    const resOlderNegative = await cacheManager.clearOlderThan(-5);
    assert.equal(resOlderNegative.clearedCount, 0);

    const resMax = await cacheManager.clearToMaxBytes('not-a-number');
    assert.equal(resMax.clearedCount, 0);
  });
});
