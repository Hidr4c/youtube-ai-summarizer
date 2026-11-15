import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { I18N } from '../src/locales/index.js';
import { WatchChannelAuditHelper } from '../src/content/ui/WatchChannelAuditHelper.js';
import { YouTubeDOMContext } from '../src/content/services/YouTubeDOMContext.js';

function makeNode(id = '') {
  const classes = new Set();
  const attrs = {};
  const listeners = {};
  const childMap = new Map();
  let _innerHTML = '';
  return {
    id,
    title: '',
    value: '',
    textContent: '',
    disabled: false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, f) => (f === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (f ? classes.add(c) : classes.delete(c))),
      contains: (c) => classes.has(c)
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => attrs[k] ?? null,
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    querySelector: (sel) => childMap.get(sel) || null,
    querySelectorAll: (sel) => childMap.get('ALL:' + sel) || [],
    _setChild: (sel, child) => childMap.set(sel, child),
    _setChildren: (sel, list) => childMap.set('ALL:' + sel, list),
    get innerHTML() { return _innerHTML; },
    set innerHTML(val) { _innerHTML = String(val); }
  };
}

describe('WatchChannelAuditHelper Branch Coverage', () => {
  it('covers subscription events, syncUI, applyAuditViewLanguage & execute paths', async () => {
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    const origGetMeta = YouTubeDOMContext.getVideoMetadata;
    I18N.xx_partial = {};
    try {
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=vid99') };
      const byId = new Map();
      const qMap = new Map();
      const qAllMap = new Map();
      const ensureId = (id) => (byId.has(id) ? byId.get(id) : (byId.set(id, makeNode(id)), byId.get(id)));

      [
        'ytAiLangSelect', 'ytAiWatchChannelTitle', 'ytAiWatchChannelMaxVideos',
        'ytAiWatchChannelResultContainer', 'ytAiWatchChannelProgress',
        'ytAiRunWatchChannelAuditBtn', 'ytAiAuditChannelBtn', 'ytAiAuditProgressContainer',
        'ytAiAuditBody', 'ytAiAuditVideoView', 'ytAiAuditHeaderTitle', 'ytAiRunAuditBtn',
        'ytAiCopyAuditBtn', 'ytAiWatchChannelHandle'
      ].forEach(ensureId);

      qMap.set('#ytAiPaneChannelAudit .yt-ai-period-label', makeNode());
      qMap.set('#ytAiPaneChannelAudit .yt-ai-max-label', makeNode());
      qMap.set('#ytAiWatchChannelProgress .yt-ai-progress-stop', makeNode());
      qAllMap.set('#ytAiPaneChannelAudit .yt-ai-period-pill', ['all', 'year', '6months', 'month'].map((p) => {
        const pill = makeNode();
        pill.setAttribute('data-period', p);
        return pill;
      }));

      const authorEl = Object.assign(makeNode(), { textContent: '@Creator' });
      authorEl.setAttribute('href', '/@Creator');
      qMap.set('ytd-channel-name a, #channel-name a, #owner-name a, ytm-slim-owner-renderer .slim-owner-channel-name, ytm-slim-owner-renderer a', authorEl);

      globalThis.document = {
        title: 'Watch Video - YouTube',
        getElementById: (id) => byId.get(id) || null,
        querySelector: (sel) => (sel.startsWith('#') && !sel.includes(' ') ? byId.get(sel.slice(1)) || null : qMap.get(sel) || null),
        querySelectorAll: (sel) => qAllMap.get(sel) || [],
        createElement: (tag) => makeNode(tag)
      };

      let subscriberFn = null;
      let renderedReportCount = 0;
      const watchRes = ensureId('ytAiWatchChannelResultContainer');
      watchRes._setChild('.yt-ai-stopped-note', makeNode());

      const mockCtrl = {
        lastReport: null,
        auditService: { isAuditing: false },
        stopChannelAudit: () => {},
        switchAuditSubtab: () => {},
        channelAuditService: {
          subscribe: (fn) => { subscriberFn = fn; return () => {}; },
          getActiveJob: () => null,
          ensureHydrated: async () => {},
          getCachedReport: () => ({ id: 'rep1' }),
          isAuditRunning: () => false
        },
        channelAuditViewController: {
          lastReport: { id: 'rep1' },
          renderReport: () => { renderedReportCount++; }
        }
      };

      await WatchChannelAuditHelper.syncUI(mockCtrl, { currentLang: 'en' });
      assert.ok(typeof subscriberFn === 'function');
      subscriberFn(null);
      subscriberFn({ type: 'progress', job: { channelQuery: '/@OtherChannel' } });
      subscriberFn({ type: 'started', job: { channelQuery: '/@Creator', lang: 'en' }, progress: { percent: 15 } });
      ensureId('ytAiWatchChannelProgress')._setChild('.yt-ai-progress-widget', makeNode());
      subscriberFn({ type: 'progress', job: { channelQuery: '/@Creator', lang: 'fr' }, progress: { percent: 45, title: 'Halfway' } });
      subscriberFn({ type: 'completed', job: { channelQuery: '/@Creator', lang: 'en', maxVideos: 30 }, report: { channelTotalVideos: 100 } });
      subscriberFn({ type: 'aborted', job: { channelQuery: '/@Creator', lang: 'xx_partial' } });
      subscriberFn({ type: 'error', job: { channelQuery: '/@Creator', lang: 'en' }, error: new Error('boom') });

      WatchChannelAuditHelper.applyAuditViewLanguage(mockCtrl, 'xx_partial', { channelAuditMaxVideos: 30 });
      watchRes._setChild('.yt-ai-stopped-note', null);
      watchRes._setChild('.yt-ai-placeholder-text', makeNode());
      ensureId('ytAiAuditProgressContainer')._setChild('.yt-ai-progress-stop', makeNode());
      mockCtrl.auditService.isAuditing = true;
      WatchChannelAuditHelper.applyAuditViewLanguage(mockCtrl, 'fr', { channelAuditMaxVideos: 30 });
      watchRes._setChild('.yt-ai-placeholder-text', null);
      watchRes._setChild('.yt-ai-channel-metrics, .yt-ai-audit-hero-card, .yt-ai-channel-audit-card', makeNode());
      mockCtrl.auditService.isAuditing = false;
      mockCtrl.lastReport = { score: 90 };
      WatchChannelAuditHelper.applyAuditViewLanguage(mockCtrl, 'en', { channelAuditMaxVideos: 30 });

      YouTubeDOMContext.getVideoMetadata = () => ({ author: '', channelUrl: '' });
      await WatchChannelAuditHelper.execute(mockCtrl, { currentLang: 'en' });
      assert.match(watchRes.innerHTML, /Impossible/i);

      YouTubeDOMContext.getVideoMetadata = () => ({ author: 'Cre', channelUrl: '/@Creator' });
      const noSubCtrl = {
        stopChannelAudit: () => {},
        switchAuditSubtab: () => {},
        channelAuditViewController: { renderReport: () => { renderedReportCount++; } },
        channelAuditService: {
          getActiveJob: () => ({ progress: { percent: 45, message: 'Active' } }),
          isAuditRunning: () => false,
          executeChannelAudit: async ({ onProgress }) => {
            onProgress({ percent: 60 });
            return { channelTotalVideos: 120 };
          }
        }
      };
      await WatchChannelAuditHelper.syncUI(noSubCtrl, { currentLang: 'en' });
      await WatchChannelAuditHelper.execute(noSubCtrl, { currentLang: 'en', state: {} });
      assert.ok(renderedReportCount >= 3);

      noSubCtrl.channelAuditService.executeChannelAudit = async () => {
        const e = new Error('stopped'); e.name = 'AbortError'; throw e;
      };
      await WatchChannelAuditHelper.execute(noSubCtrl, { currentLang: 'fr', state: {} });
      assert.match(watchRes.innerHTML, /stopped-note/);

      noSubCtrl.channelAuditService.executeChannelAudit = async () => { throw new Error('ErrMsg'); };
      await WatchChannelAuditHelper.execute(noSubCtrl, { currentLang: 'fr', state: {} });
      assert.match(watchRes.innerHTML, /ErrMsg/);

      noSubCtrl.channelAuditService.isAuditRunning = () => true;
      await WatchChannelAuditHelper.execute(noSubCtrl, { currentLang: 'en', state: {} });
    } finally {
      YouTubeDOMContext.getVideoMetadata = origGetMeta;
      delete I18N.xx_partial;
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });
});
