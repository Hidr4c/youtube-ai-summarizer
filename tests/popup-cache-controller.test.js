import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PopupCacheController } from '../src/popup/PopupCacheController.js';

function createMockElement(id = '', tag = 'div') {
  const listeners = {};
  const classes = new Set();
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    children: [],
    options: tag === 'select' ? [
      { text: 'Tout', value: 'all' },
      { text: '> 7 jours', value: '7' },
      { text: '> 30 jours', value: '30' }
    ] : [],
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    click: async () => {
      for (const fn of (listeners['click'] || [])) await fn();
    }
  };
}

describe('PopupCacheController - Popup Cache Management UI', () => {
  let elements = {};

  beforeEach(() => {
    elements = {
      cacheBadgeTitle: createMockElement('cacheBadgeTitle'),
      cacheDesc: createMockElement('cacheDesc'),
      cacheSizeBadge: createMockElement('cacheSizeBadge', 'span'),
      cachePurgeFilter: createMockElement('cachePurgeFilter', 'select'),
      purgeCacheBtn: createMockElement('purgeCacheBtn', 'button'),
      purgeCacheBtnText: createMockElement('purgeCacheBtnText', 'span'),
      cacheNotice: createMockElement('cacheNotice')
    };
    elements.cachePurgeFilter.value = 'all';
    elements.cacheNotice.classList.add('hidden');

    globalThis.document = {
      getElementById: (id) => elements[id] || null
    };
  });

  it('updates cache statistics badge correctly for empty and populated cache', async () => {
    const mockCacheManager = {
      getStats: async () => ({ totalVideos: 0, formattedSize: '0 Ko' }),
      clearAll: async () => ({ clearedCount: 0, freedBytes: 0 })
    };

    const controller = new PopupCacheController({
      cacheManager: mockCacheManager,
      getLang: () => 'fr'
    });

    await controller.updateStats();
    const badge = document.getElementById('cacheSizeBadge');
    assert.ok(badge.textContent.includes('0 Ko'));

    // Populated
    mockCacheManager.getStats = async () => ({ totalVideos: 12, formattedSize: '240 Ko' });
    await controller.updateStats();
    assert.equal(badge.textContent, '240 Ko (12)');
  });

  it('handles purge filter choices (all, 7 days, 30 days) and notifies active tab', async () => {
    let clearedOlderThanArg = null;
    let clearAllCalled = false;
    let messageSent = false;

    const mockCacheManager = {
      getStats: async () => ({ totalVideos: 2, formattedSize: '40 Ko' }),
      clearAll: async () => { clearAllCalled = true; return { clearedCount: 5, freedBytes: 100000 }; },
      clearOlderThan: async (days) => { clearedOlderThanArg = days; return { clearedCount: 2, freedBytes: 40000 }; }
    };

    const activeTab = { id: 101 };
    globalThis.chrome = {
      tabs: {
        sendMessage: async (tabId, msg) => {
          if (tabId === 101 && msg.action === 'CLEAR_CACHE') messageSent = true;
        }
      }
    };

    const controller = new PopupCacheController({
      cacheManager: mockCacheManager,
      getActiveTab: () => activeTab,
      getLang: () => 'fr'
    });

    // 1. Purge all
    document.getElementById('cachePurgeFilter').value = 'all';
    await controller.handlePurge();
    assert.equal(clearAllCalled, true);
    assert.equal(messageSent, true);

    const notice = document.getElementById('cacheNotice');
    assert.ok(notice.textContent.includes('5'));
    assert.equal(notice.classList.contains('hidden'), false);

    // 2. Purge older than 7 days
    document.getElementById('cachePurgeFilter').value = '7';
    await controller.handlePurge();
    assert.equal(clearedOlderThanArg, 7);

    // 3. Purge older than 30 days
    document.getElementById('cachePurgeFilter').value = '30';
    await controller.handlePurge();
    assert.equal(clearedOlderThanArg, 30);
  });

  it('applies localization to cache UI elements', () => {
    const controller = new PopupCacheController({
      getLang: () => 'fr'
    });

    const tFr = {
      cacheTitle: 'Mémoire Cache Locale',
      cacheDesc: 'Stockage des analyses',
      purgeBtn: 'Nettoyer le cache',
      purgeAll: 'Supprimer tout',
      purge7Days: 'Plus de 7 jours',
      purge30Days: 'Plus de 30 jours'
    };

    controller.applyLocalization(tFr);

    assert.equal(document.getElementById('cacheBadgeTitle').textContent, 'Mémoire Cache Locale');
    assert.equal(document.getElementById('purgeCacheBtnText').textContent, 'Nettoyer le cache');
    assert.equal(document.getElementById('cachePurgeFilter').options[0].text, 'Supprimer tout');
    assert.equal(document.getElementById('cachePurgeFilter').options[1].text, 'Plus de 7 jours');
  });
});
