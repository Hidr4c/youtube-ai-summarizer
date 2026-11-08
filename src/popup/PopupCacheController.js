import { ExtensionCacheManager } from '../services/implementations/ExtensionCacheManager.js';
import { POPUP_I18N } from './PopupI18n.js';

/**
 * Controller for Extension Popup Cache Management UI
 */
export class PopupCacheController {
  /**
   * @param {Object} [dependencies]
   */
  constructor(dependencies = {}) {
    this.cacheManager = dependencies.cacheManager || new ExtensionCacheManager();
    this.getActiveTab = dependencies.getActiveTab || (() => null);
    this.getLang = dependencies.getLang || (() => 'en');
  }

  /**
   * Initializes event listeners and updates UI metrics
   */
  async init() {
    this.bindEvents();
    await this.updateStats();
  }

  /**
   * Attaches click handlers for cache purging
   */
  bindEvents() {
    const purgeBtn = document.getElementById('purgeCacheBtn');
    if (purgeBtn) {
      purgeBtn.addEventListener('click', async () => {
        await this.handlePurge();
      });
    }
  }

  /**
   * Reads filter choice and executes purge
   */
  async handlePurge() {
    const filterEl = document.getElementById('cachePurgeFilter');
    const filter = filterEl?.value || 'all';

    let result = { clearedCount: 0, freedBytes: 0 };
    if (filter === 'all') {
      result = await this.cacheManager.clearAll();
    } else if (filter === '7') {
      result = await this.cacheManager.clearOlderThan(7);
    } else if (filter === '30') {
      result = await this.cacheManager.clearOlderThan(30);
    }

    await this.updateStats();
    this.showNotice(result.clearedCount);
    this.notifyActiveTab();
  }

  /**
   * Updates cache size and item count badge
   */
  async updateStats() {
    const stats = await this.cacheManager.getStats();
    const badge = document.getElementById('cacheSizeBadge');
    if (!badge) return;

    const lang = this.getLang();
    const t = POPUP_I18N[lang] || POPUP_I18N.en;

    if (stats.totalVideos === 0) {
      badge.textContent = t.cacheEmpty || '0 Ko (0)';
    } else {
      badge.textContent = `${stats.formattedSize} (${stats.totalVideos})`;
    }
  }

  /**
   * Displays temporary feedback notice
   * @param {number} count
   */
  showNotice(count) {
    const notice = document.getElementById('cacheNotice');
    if (!notice) return;

    const lang = this.getLang();
    const t = POPUP_I18N[lang] || POPUP_I18N.en;
    const msg = (t.purgeSuccess || '✓ Cache cleared ({count})').replace('{count}', count);

    notice.textContent = msg;
    notice.classList.remove('hidden');

    setTimeout(() => {
      notice.classList.add('hidden');
    }, 2800);
  }

  /**
   * Broadcasts cache invalidation signal to YouTube tab
   */
  notifyActiveTab() {
    const activeTab = this.getActiveTab();
    if (activeTab?.id && typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'CLEAR_CACHE' }).catch(() => {});
    }
  }

  /**
   * Applies language dictionary strings to cache UI controls
   * @param {Object} t
   */
  applyLocalization(t) {
    const titleEl = document.getElementById('cacheBadgeTitle');
    if (titleEl) titleEl.textContent = t.cacheTitle || '💾 Cache';

    const descEl = document.getElementById('cacheDesc');
    if (descEl) descEl.textContent = t.cacheDesc || '';

    const btnText = document.getElementById('purgeCacheBtnText');
    if (btnText) btnText.textContent = t.purgeBtn || 'Purge';

    const filterEl = document.getElementById('cachePurgeFilter');
    if (filterEl && filterEl.options.length >= 3) {
      filterEl.options[0].text = t.purgeAll || 'Clear all';
      filterEl.options[1].text = t.purge7Days || '> 7 days';
      filterEl.options[2].text = t.purge30Days || '> 30 days';
    }
  }
}

export default PopupCacheController;
