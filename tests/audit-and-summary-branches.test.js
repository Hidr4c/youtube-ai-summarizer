import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditService } from '../src/content/services/AuditService.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';

function createEl(id = '') {
  const classes = new Set();
  const listeners = {};
  const childMap = new Map();
  let _innerHTML = '';
  return {
    id,
    value: '',
    textContent: '',
    disabled: false,
    open: false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, f) => (f === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (f ? classes.add(c) : classes.delete(c))),
      contains: (c) => classes.has(c)
    },
    getAttribute: (k) => (k === 'data-time' ? '12' : null),
    setAttribute: () => {},
    addEventListener: (e, fn) => { (listeners[e] ||= []).push(fn); },
    focus: () => {},
    querySelector: (s) => childMap.get(s) || null,
    querySelectorAll: (s) => childMap.get('ALL:' + s) || [],
    _setChild: (s, n) => childMap.set(s, n),
    _setChildren: (s, list) => childMap.set('ALL:' + s, list),
    _trigger: (e) => (listeners[e] || []).forEach(fn => fn({ preventDefault() {} })),
    get innerHTML() { return _innerHTML; },
    set innerHTML(v) { _innerHTML = String(v); }
  };
}

function makeFakePort(events = []) {
  const onMsg = [];
  const onDisc = [];
  return {
    onMessage: { addListener: (fn) => onMsg.push(fn) },
    onDisconnect: { addListener: (fn) => onDisc.push(fn) },
    disconnect: () => {},
    postMessage: () => {
      queueMicrotask(() => {
        for (const ev of events) {
          if (ev.type === '__DISCONNECT__') onDisc.forEach(f => f());
          else onMsg.forEach(f => f(ev));
        }
      });
    }
  };
}

describe('AuditService, AuditViewController, SummaryViewController & ChannelAuditService Branches', () => {
  it('covers AuditService fallback extraction, stream heuristics, score tiers, abort and error paths', async () => {
    const origChrome = globalThis.chrome;
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    try {
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=vid_audit_1') };
      globalThis.document = { title: 'Test - YouTube', querySelector: () => null, querySelectorAll: () => [] };

      const missingSvc = new AuditService({});
      await assert.rejects(() => missingSvc.executeAudit({ videoId: 'vid_no_data', lang: 'en', state: {} }), /indisponibles/i);

      globalThis.chrome = {
        runtime: {
          connect: () => makeFakePort([
            { type: 'CHUNK', reasoning: 'thinking step 1' },
            { type: 'CHUNK', content: 'Checking affiliation link...' },
            { type: 'CHUNK', content: 'Checking source study...' },
            { type: 'CHUNK', content: 'Synthèse [SCORE: 42/100]' },
            { type: 'DONE' }
          ])
        }
      };

      const progEvents = [];
      const svc = new AuditService({
        transcriptController: {
          cachedTranscript: { videoId: 'vid_audit_1', fullText: 'Dialogue text', isChapterOnly: true },
          extractYouTubeTranscript: async () => [{ timestamp: '00:05', text: 'Chapter item' }]
        },
        videoCommentsManager: {
          getOrFetchComments: async () => ({ success: true, markdownDossier: 'User comment dossier' })
        }
      });

      const repLow = await svc.executeAudit({
        videoId: 'vid_audit_1',
        lang: 'fr',
        state: { currentProvider: 'groq', apiKeys: { groq: 'k' }, getActiveModel: () => 'llama3' },
        onProgress: (p) => progEvents.push(p.step)
      });
      assert.equal(repLow.reliabilityScore, 42);
      assert.equal(repLow.status, 'manipulative');
      assert.ok(progEvents.includes('reasoning'));
      assert.equal(svc.getCachedAudit(' vid_audit_1 '), repLow);
      svc.clearCache();
      assert.equal(svc.getCachedAudit('vid_audit_1'), null);

      globalThis.chrome = {
        runtime: {
          connect: () => makeFakePort([{ type: 'ERROR', error: 'Stream exploded' }])
        }
      };
      await assert.rejects(() => svc.executeAudit({
        videoId: 'vid_audit_1',
        lang: 'en',
        state: {}
      }), /Stream exploded/);

      globalThis.chrome = {
        runtime: {
          connect: () => makeFakePort([{ type: '__DISCONNECT__' }])
        }
      };
      await assert.rejects(() => svc.executeAudit({ videoId: 'vid_audit_1', lang: 'en', state: {} }), /interrompu/i);
    } finally {
      globalThis.chrome = origChrome;
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  it('covers AuditViewController UI validation, hero tiers, streaming, abort, timestamp click and clipboard', async () => {
    const origDoc = globalThis.document;
    const origNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    try {
      const elements = new Map([
        ['ytAiLangSelect', Object.assign(createEl('ytAiLangSelect'), { value: 'en' })],
        ['ytAiRunAuditBtn', createEl('ytAiRunAuditBtn')],
        ['ytAiCopyAuditBtn', createEl('ytAiCopyAuditBtn')],
        ['ytAiAuditStatus', createEl('ytAiAuditStatus')],
        ['ytAiAuditBody', createEl('ytAiAuditBody')],
        ['ytAiAuditProgressContainer', createEl('ytAiAuditProgressContainer')],
        ['ytAiTabAuditBtn', createEl('ytAiTabAuditBtn')],
        ['ytAiAuditVideoView', createEl('ytAiAuditVideoView')],
        ['ytAiChannelAuditContainer', createEl('ytAiChannelAuditContainer')],
        ['ytAiAuditSubtabVideoBtn', createEl('ytAiAuditSubtabVideoBtn')],
        ['ytAiAuditSubtabChannelBtn', createEl('ytAiAuditSubtabChannelBtn')]
      ]);
      const fakeVideo = { currentTime: 0, play: () => Promise.resolve() };
      const timestampLink = createEl('ts');
      elements.get('ytAiAuditBody')._setChildren('a[data-seek], a[href^="#t="], .yt-ai-timestamp-link', [timestampLink]);

      globalThis.document = {
        getElementById: (id) => elements.get(id) || null,
        querySelector: (sel) => (sel === 'video' ? fakeVideo : null),
        querySelectorAll: () => []
      };
      let copiedText = '';
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { clipboard: { writeText: async (t) => { copiedText = t; } } }
      });

      const ctrl = new AuditViewController({ auditService: { isAuditing: false, abortAudit() {}, executeAudit: async () => ({}) } });
      assert.equal(ctrl.renderAuditHeroCard(null), '');
      assert.ok(ctrl.renderAuditHeroCard({ reliabilityScore: 30, getReliabilityBadge: () => ({ label: 'Low' }) }, 'fr').includes('yt-ai-score-low'));
      assert.ok(ctrl.renderAuditHeroCard({ reliabilityScore: 60, getReliabilityBadge: () => ({ label: 'Med' }) }, 'en').includes('yt-ai-score-med'));
      assert.ok(ctrl.renderAuditHeroCard({ reliabilityScore: 90, getReliabilityBadge: () => ({ label: 'Hi' }), getGranularTier: () => ({ rangeLabel: '90+', shortLabel: 'Top', desc: 'Ok', hexColor: '#0f0', gradient: 'linear' }) }, 'en').includes('yt-ai-score-high'));

      // Missing model & missing cloud key
      await ctrl.startAudit({ state: {} });
      assert.ok(elements.get('ytAiAuditBody').innerHTML.includes('[!]'));
      await ctrl.startAudit({ state: { selectedModel: 'm1', currentProvider: 'openai', apiKeys: {} } });

      // Stop toggle when already auditing
      ctrl.auditService.isAuditing = true;
      await ctrl.startAudit({ state: { selectedModel: 'm1' } });
      ctrl.auditService.isAuditing = false;

      // Success stream with chunk & copy
      ctrl.auditService.executeAudit = async ({ onProgress, onChunk }) => {
        onProgress({ percent: 50, message: 'Halfway' });
        onChunk('part ', 'part [00:12]');
        return { reliabilityScore: 62, rawMarkdown: '# Report', getReliabilityBadge: () => ({ label: 'Caution' }) };
      };
      await ctrl.startAudit({ state: { selectedModel: 'm1', currentProvider: 'ollama' } });
      timestampLink._trigger('click');
      assert.equal(fakeVideo.currentTime, 12);
      ctrl.handleCopyAudit('en');
      await Promise.resolve();
      assert.equal(copiedText, '# Report');

      // Abort error with & without streamed chunks
      ctrl.auditService.executeAudit = async ({ onChunk }) => {
        onChunk('c', 'chunk');
        const err = new Error('Stopped');
        err.name = 'AbortError';
        throw err;
      };
      await ctrl.startAudit({ state: { selectedModel: 'm1', currentProvider: 'lmstudio' } });
      assert.equal(elements.get('ytAiAuditStatus').classList.contains('yt-ai-hidden'), false);

      ctrl.auditService.executeAudit = async () => { throw new Error('Network fail'); };
      await ctrl.startAudit({ state: { selectedModel: 'm1', currentProvider: 'lmstudio' } });
      assert.match(elements.get('ytAiAuditBody').innerHTML, /Network fail/);

      ctrl.switchAuditSubtab('channel');
      assert.equal(elements.get('ytAiAuditVideoView').classList.contains('yt-ai-hidden'), true);
    } finally {
      globalThis.document = origDoc;
      if (origNavDesc) Object.defineProperty(globalThis, 'navigator', origNavDesc);
    }
  });

  it('covers ChannelAuditService subscriptions, active jobs, batch >30 path, error & abort tracking', async () => {
    const origChrome = globalThis.chrome;
    try {
      const svc = new ChannelAuditService({
        channelManager: {
          getOrFetchChannelDossier: async () => ({
            success: true,
            channel: {
              title: 'Big Channel',
              handle: '@BigChan',
              hasMore: false,
              recentVideos: Array.from({ length: 35 }, (_, i) => ({
                id: `v${i}`,
                title: `Video ${i}`,
                publishDate: '2026-10-01',
                viewCountNum: 100 + i
              }))
            }
          })
        }
      });

      assert.equal(typeof svc.subscribe('not-fn'), 'function');
      const events = [];
      const unsub = svc.subscribe((e) => { events.push(e.type); throw new Error('listener boom'); });

      globalThis.chrome = {
        runtime: {
          sendMessage: (msg, cb) => cb({ success: true, dossiers: { v0: { description: 'Enriched', hasCaptions: true } } }),
          connect: () => makeFakePort([
            { type: 'CHUNK', content: 'Batch summary ok [SCORE: 82/100]' },
            { type: 'DONE' }
          ])
        }
      };

      const rep = await svc.executeChannelAudit({
        channelQuery: '/@BigChan',
        maxVideos: 50,
        period: 'all',
        lang: 'en',
        state: { currentProvider: 'ollama' }
      });
      assert.ok(rep);
      assert.ok(events.includes('started'));
      assert.ok(events.includes('completed'));
      assert.equal(svc.getActiveJob('@BigChan'), null);
      assert.equal(svc.getCachedReport(''), null);
      assert.ok(svc.getCachedReport('@bigchan'));

      // Cached hit returns immediately
      const cached = await svc.executeChannelAudit({ channelQuery: '@BigChan', maxVideos: 50, period: 'all', lang: 'en', state: {} });
      assert.equal(cached, rep);

      // Active job lookup, mismatch, non-running & clear
      svc.activeJob = { status: 'running', channelKey: 'bigchan', handleKey: '@bigchan' };
      assert.ok(svc.getActiveJob());
      assert.ok(svc.getActiveJob('@BigChan'));
      assert.equal(svc.getActiveJob('@Other'), null);
      assert.equal(svc.getActiveJob('   '), null);
      assert.equal(svc.isAuditRunning('@BigChan'), true);
      svc.abortAudit('manual');
      assert.equal(svc.getActiveJob(), null);

      svc.clearCache();
      await assert.rejects(() => svc.executeChannelAudit({ channelQuery: '', state: {} }), /manquant/);

      // Runtime fallback error path when channelManager absent
      const noMgrSvc = new ChannelAuditService({});
      globalThis.chrome = { runtime: {} };
      await assert.rejects(() => noMgrSvc.executeChannelAudit({ channelQuery: '@Missing', state: {} }), /Runtime unavailable/);
      unsub();
    } finally {
      globalThis.chrome = origChrome;
    }
  });
});
