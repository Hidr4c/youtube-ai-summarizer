import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelAuditJobTracker } from '../src/content/services/ChannelAuditJobTracker.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';
import { AuditProgressBar } from '../src/content/ui/AuditProgressBar.js';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { AuditService } from '../src/content/services/AuditService.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { I18N } from '../src/locales/index.js';

function createDomNode(tag = 'div', id = '') {
  const classes = new Set();
  const listeners = new Map();
  const attrs = new Map();
  const node = {
    tagName: tag.toUpperCase(),
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    title: '',
    open: false,
    style: {},
    dataset: {},
    children: [],
    parentNode: null,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (force) classes.add(c); else classes.delete(c);
        return !!force;
      }
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => (k === 'data-period' ? (attrs.get(k) || 'all') : (attrs.get(k) ?? null)),
    addEventListener: (evt, fn) => listeners.set(evt, fn),
    click: () => listeners.get('click')?.({ currentTarget: node, stopPropagation: () => {} }),
    appendChild: (c) => { c.parentNode = node; node.children.push(c); return c; },
    insertBefore: (c) => { c.parentNode = node; node.children.unshift(c); return c; },
    remove: () => { node.parentNode = null; },
    querySelector: () => null,
    querySelectorAll: () => []
  };
  return node;
}

describe('Channel Audit Navigation Survival & Stop Button Controls', () => {
  it('ChannelAuditJobTracker normalizes handles across channel sub-tabs and full URLs', () => {
    assert.equal(ChannelAuditJobTracker.normalizeKey('@HugoLisoirYoutube'), '@hugolisoiryoutube');
    assert.equal(ChannelAuditJobTracker.normalizeKey('/@HugoLisoirYoutube/shorts'), '@hugolisoiryoutube');
    assert.equal(ChannelAuditJobTracker.normalizeKey('https://www.youtube.com/@HugoLisoirYoutube/videos'), '@hugolisoiryoutube');
    assert.equal(ChannelAuditJobTracker.normalizeKey('/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw/streams'), 'uc_x5xg1ov2p6uzz5fsm9ttw');
  });

  it('ChannelAuditJobTracker persists reports to chrome.storage.local and hydrates them back cleanly', async () => {
    const store = {};
    const prevChrome = global.chrome;
    global.chrome = {
      storage: {
        local: {
          get: (keys, cb) => {
            const out = {};
            for (const k of keys) out[k] = store[k];
            cb?.(out);
          },
          set: (obj, cb) => { Object.assign(store, obj); cb?.(); },
          remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            for (const k of arr) delete store[k];
            cb?.();
          }
        }
      }
    };

    try {
      const report = new ChannelAuditReport({
        channelId: '@Creator',
        channelTitle: 'Creator',
        globalScore: 88,
        clickbaitIndex: 12,
        totalVideosAnalyzed: 25,
        period: 'all'
      });
      ChannelAuditJobTracker.persistReport('@creator::all::30', '@creator', report);

      const targetMap = new Map();
      await ChannelAuditJobTracker.hydrateReports(targetMap);
      assert.equal(targetMap.get('@creator::all::30')?.globalScore, 88);
      assert.equal(targetMap.get('@creator')?.channelTitle, 'Creator');

      ChannelAuditJobTracker.clearPersistedReports();
      assert.deepEqual(store, {});
    } finally {
      global.chrome = prevChrome;
    }
  });

  it('ChannelAuditJobTracker.raceWithAbort rejects immediately when stopped mid-flight', async () => {
    const ac = new AbortController();
    const slow = new Promise(() => {});
    const raced = ChannelAuditJobTracker.raceWithAbort(slow, ac.signal, 'fr');
    ac.abort('stopped');
    await assert.rejects(raced, (err) => ChannelAuditJobTracker.isAbortError(err));
  });

  it('ChannelAuditService survives background execution and supports instant abortAudit("stopped")', async () => {
    let resolveDossier;
    const service = new ChannelAuditService({
      channelManager: {
        getOrFetchChannelDossier: () => new Promise((r) => { resolveDossier = r; }),
        enrichVideosInBatches: async () => []
      }
    });

    const events = [];
    const unsub = service.subscribe((evt) => events.push(evt.type));

    const pending = service.executeChannelAudit({
      channelQuery: '/@ScienceChannel/videos',
      period: 'all',
      maxVideos: 30,
      lang: 'fr',
      state: { currentProvider: 'lmstudio', getActiveModel: () => 'qwen-local', serverUrls: { lmstudio: 'http://localhost:1234' }, apiKeys: {} }
    });

    await new Promise((r) => setTimeout(r, 15));
    assert.ok(service.getActiveJob('/@ScienceChannel/shorts'), 'Active job must match across channel Shorts sub-tab');
    assert.equal(service.isAuditRunning('@ScienceChannel'), true);

    service.abortAudit('stopped');
    await assert.rejects(pending, (err) => ChannelAuditJobTracker.isAbortError(err));
    assert.equal(service.isAuditRunning('@ScienceChannel'), false);
    assert.ok(events.includes('started'));
    assert.ok(events.includes('aborted'));

    resolveDossier?.({ success: false });
    unsub();
  });

  it('ChannelCompanionCard re-attaches live active job UI and stop handler after returning from /shorts/', async () => {
    let resolveAudit;
    const activeJob = {
      id: 'job_1',
      channelQuery: '@SpaceNews',
      channelKey: '@spacenews',
      handleKey: '@spacenews',
      period: '6months',
      maxVideos: 100,
      lang: 'fr',
      status: 'running',
      progress: { percent: 62, message: 'Lot 2/3 en cours...', detail: 'Analyse batch' }
    };
    const listeners = new Set();
    let abortedCalled = false;
    const service = {
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
      getActiveJob: (q) => (ChannelAuditJobTracker.normalizeKey(q) === '@spacenews' && activeJob.status === 'running' ? activeJob : null),
      isAuditRunning: (q) => (ChannelAuditJobTracker.normalizeKey(q) === '@spacenews' && activeJob.status === 'running'),
      ensureHydrated: async () => {},
      abortAudit: () => { abortedCalled = true; activeJob.status = 'aborted'; listeners.forEach(fn => fn({ type: 'aborted', job: activeJob })); },
      executeChannelAudit: () => new Promise((r) => { resolveAudit = r; })
    };

    let renderedReport = null;
    const viewController = {
      renderReport: (rep, box) => { renderedReport = rep; box.innerHTML = 'REPORT_READY'; }
    };

    const pageHeader = createDomNode('div', 'page-header-container');
    const progBox = createDomNode('div', 'ytAiChannelProgress');
    const stopInProgress = createDomNode('button', '');
    progBox.querySelector = (sel) => (sel === '.yt-ai-progress-stop-btn' ? stopInProgress : sel === '.yt-ai-progress-widget' ? null : null);
    const runBtn = createDomNode('button', 'ytAiRunChannelAuditBtn');
    const resultBox = createDomNode('div', 'ytAiChannelResultContainer');
    const bodyEl = createDomNode('div', 'ytAiCompanionBody');

    const prevDoc = global.document;
    const prevWin = global.window;
    global.window = { location: { origin: 'https://www.youtube.com', pathname: '/@SpaceNews', search: '', href: 'https://www.youtube.com/@SpaceNews' } };
    global.document = {
      documentElement: { hasAttribute: () => true, getAttribute: () => 'dark' },
      body: createDomNode('body'),
      getElementById: (id) => ({
        ytAiChannelProgress: progBox,
        ytAiRunChannelAuditBtn: runBtn,
        ytAiChannelResultContainer: resultBox,
        ytAiCompanionBody: bodyEl
      })[id] || null,
      createElement: (tag) => createDomNode(tag),
      querySelector: (sel) => (sel === '#page-header-container' ? pageHeader : null),
      querySelectorAll: () => [],
      fullscreenElement: null
    };

    try {
      const card = new ChannelCompanionCard({
        channelAuditService: service,
        channelAuditViewController: viewController,
        state: { extensionEnabled: true, currentLang: 'fr' }
      });

      card.tryInjectCompanion(true);
      assert.equal(runBtn.classList.contains('yt-ai-btn-stop'), true, 'Re-injected button must display Stop state immediately');
      assert.ok(progBox.innerHTML.includes('Lot 2/3 en cours...'));
      assert.equal(progBox.classList.contains('yt-ai-hidden'), false);

      // Clicking Stop inside progress widget aborts active job cleanly
      stopInProgress.click();
      assert.equal(abortedCalled, true);
      assert.equal(runBtn.classList.contains('yt-ai-btn-stop'), false);

      // Simulate completion event while back on page
      const finalRep = new ChannelAuditReport({ globalScore: 93, channelTitle: 'SpaceNews' });
      listeners.forEach(fn => fn({ type: 'completed', job: activeJob, report: finalRep }));
      assert.equal(renderedReport?.globalScore, 93);
      resolveAudit?.(finalRep);
    } finally {
      global.document = prevDoc;
      global.window = prevWin;
    }
  });

  it('AuditProgressBar renders Stop button and binds single-shot click handler', () => {
    const htmlWithStop = AuditProgressBar.renderWidget({ percent: 40, title: 'Working', showStop: true, stopLabel: 'Arrêter' });
    assert.ok(htmlWithStop.includes('yt-ai-progress-stop-btn'));
    assert.ok(htmlWithStop.includes('data-action="stop-audit"'));

    const htmlNoStop = AuditProgressBar.renderWidget({ percent: 40, title: 'Working', showStop: false });
    assert.equal(htmlNoStop.includes('yt-ai-progress-stop-btn'), false);

    let clicks = 0;
    const stopBtn = createDomNode('button');
    const container = { querySelector: (sel) => (sel === '.yt-ai-progress-stop-btn' ? stopBtn : null) };
    AuditProgressBar.bindStopAction(container, () => { clicks += 1; });
    AuditProgressBar.bindStopAction(container, () => { clicks += 1; });
    stopBtn.click();
    assert.equal(clicks, 1);
    assert.equal(stopBtn.disabled, true);
  });

  it('BannerTemplate exposes Stop summary button and SummaryViewController.stopGeneration stops streaming cleanly', async () => {
    const bannerHtml = BannerTemplate.render(I18N.fr, { currentLang: 'fr' });
    assert.ok(bannerHtml.includes('id="ytAiStopSummaryBtn"'));

    let portDisconnected = false;
    let onMessageCb = null;
    const prevChrome = global.chrome;
    const prevDoc = global.document;
    const prevWin = global.window;

    global.window = { location: { origin: 'https://www.youtube.com', pathname: '/watch', search: '?v=vidStop1' } };
    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: () => {},
          disconnect: () => { portDisconnected = true; },
          onMessage: { addListener: (fn) => { onMessageCb = fn; } },
          onDisconnect: { addListener: () => {} }
        })
      }
    };

    const els = {
      ytAiSummarizeBtn: createDomNode('button', 'ytAiSummarizeBtn'),
      ytAiStopSummaryBtn: createDomNode('button', 'ytAiStopSummaryBtn'),
      ytAiSummaryBody: createDomNode('div', 'ytAiSummaryBody'),
      ytAiReasoningBox: createDomNode('details', 'ytAiReasoningBox')
    };
    els.ytAiStopSummaryBtn.classList.add('yt-ai-hidden');
    global.document = { getElementById: (id) => els[id] || null, querySelector: () => null };

    try {
      const ctrl = new SummaryViewController({
        transcriptController: {
          extractYouTubeTranscript: async () => [{ timestamp: '0:00', text: 'Hello' }],
          cachedTranscript: { fullText: 'Hello world from transcript' },
          cachedVideoMetadata: { videoId: 'vidStop1', title: 'Test', author: 'Auth', description: 'desc' }
        },
        promptService: { constructor: { condenseTranscriptForContext: (t) => t, buildPrompts: () => ({ systemPrompt: 's', userPrompt: 'u' }) } }
      });

      await ctrl.startSummarization({
        currentLang: 'fr',
        currentProvider: 'lmstudio',
        getActiveModel: () => 'qwen-local',
        serverUrls: { lmstudio: 'http://localhost:1234' },
        apiKeys: {}
      });

      assert.equal(els.ytAiStopSummaryBtn.classList.contains('yt-ai-hidden'), false);
      onMessageCb?.({ type: 'CHUNK', content: 'Début de réponse utile.' });
      assert.ok(ctrl.fullSummaryMarkdown.includes('Début de réponse utile.'));

      ctrl.stopGeneration('fr');
      assert.equal(portDisconnected, true);
      assert.equal(ctrl.isGenerating, false);
      assert.equal(els.ytAiSummarizeBtn.disabled, false);
      assert.equal(els.ytAiStopSummaryBtn.classList.contains('yt-ai-hidden'), true);
      assert.ok(els.ytAiSummaryBody.innerHTML.includes('Début de réponse utile.'), 'Partial summary must stay visible after Stop');
    } finally {
      global.chrome = prevChrome;
      global.document = prevDoc;
      global.window = prevWin;
    }
  });

  it('AuditService & AuditViewController handle Stop mid-video-audit cleanly without error alerts', async () => {
    let portDisconnected = false;
    const prevChrome = global.chrome;
    const prevDoc = global.document;
    const prevWin = global.window;

    global.window = { location: { origin: 'https://www.youtube.com', pathname: '/watch', search: '?v=vidAud1' } };
    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: () => {},
          disconnect: () => { portDisconnected = true; },
          onMessage: { addListener: () => {} },
          onDisconnect: { addListener: () => {} }
        })
      }
    };

    const els = {
      ytAiRunAuditBtn: createDomNode('button', 'ytAiRunAuditBtn'),
      ytAiCopyAuditBtn: createDomNode('button', 'ytAiCopyAuditBtn'),
      ytAiAuditStatus: createDomNode('div', 'ytAiAuditStatus'),
      ytAiAuditBody: createDomNode('div', 'ytAiAuditBody'),
      ytAiAuditProgressContainer: createDomNode('div', 'ytAiAuditProgressContainer')
    };
    global.document = {
      getElementById: (id) => els[id] || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      title: 'Test Video - YouTube'
    };

    try {
      const auditService = new AuditService({
        transcriptController: {
          cachedTranscript: { videoId: 'vidAud1', fullText: 'Transcript content', segments: [{ timestamp: '0:01', text: 'Transcript content' }], isChapterOnly: false }
        },
        videoCommentsManager: { getOrFetchComments: async () => ({ success: false }) }
      });

      const vc = new AuditViewController({ auditService, chatViewController: {} });
      const pendingAudit = vc.startAudit({
        state: { currentLang: 'fr', currentProvider: 'lmstudio', getActiveModel: () => 'qwen-local', serverUrls: { lmstudio: 'http://localhost:1234' }, apiKeys: {} }
      });

      await new Promise((r) => setTimeout(r, 15));
      assert.equal(els.ytAiRunAuditBtn.classList.contains('yt-ai-btn-stop'), true);
      vc.stopAudit('fr');
      await pendingAudit;

      assert.equal(portDisconnected, true);
      assert.equal(els.ytAiRunAuditBtn.classList.contains('yt-ai-btn-stop'), false);
      assert.equal(els.ytAiAuditProgressContainer.classList.contains('yt-ai-hidden'), true);
      assert.equal(els.ytAiAuditBody.innerHTML.includes('[!]'), false, 'Stopping an audit must not show red error box');
    } finally {
      global.chrome = prevChrome;
      global.document = prevDoc;
      global.window = prevWin;
    }
  });

  it('AuditViewController.syncChannelAuditUI attaches active running channel job on Watch page and supports Stop', async () => {
    const activeJob = {
      channelQuery: '@SciWatch',
      channelKey: '@sciwatch',
      lang: 'fr',
      period: 'all',
      maxVideos: 30,
      status: 'running',
      progress: { percent: 45, message: 'Traitement du lot 1/2...', detail: 'Vidéos récentes' }
    };
    const listeners = new Set();
    let stopped = false;
    const mockChanService = {
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
      getActiveJob: (q) => (ChannelAuditJobTracker.normalizeKey(q) === '@sciwatch' && activeJob.status === 'running' ? activeJob : null),
      isAuditRunning: (q) => (ChannelAuditJobTracker.normalizeKey(q) === '@sciwatch' && activeJob.status === 'running'),
      abortAudit: () => { stopped = true; activeJob.status = 'aborted'; listeners.forEach(fn => fn({ type: 'aborted', job: activeJob })); }
    };

    const progBox = createDomNode('div', 'ytAiWatchChannelProgress');
    progBox.classList.add('yt-ai-hidden');
    const stopBtn = createDomNode('button');
    progBox.querySelector = (sel) => (sel === '.yt-ai-progress-stop-btn' ? stopBtn : null);
    const runBtn = createDomNode('button', 'ytAiRunWatchChannelAuditBtn');
    const resBox = createDomNode('div', 'ytAiWatchChannelResultContainer');

    const prevDoc = global.document;
    global.document = {
      getElementById: (id) => ({
        ytAiWatchChannelProgress: progBox,
        ytAiRunWatchChannelAuditBtn: runBtn,
        ytAiWatchChannelResultContainer: resBox
      })[id] || null,
      querySelector: (sel) => {
        if (sel.includes('ytd-channel-name a')) return { textContent: 'SciWatch', getAttribute: () => '/@SciWatch' };
        if (sel.includes('yt-formatted-string.ytd-channel-name')) return { textContent: 'SciWatch' };
        return null;
      },
      querySelectorAll: () => [],
      title: 'Video - YouTube'
    };

    try {
      const vc = new AuditViewController({
        auditService: {},
        chatViewController: {},
        channelAuditService: mockChanService,
        channelAuditViewController: { renderReport: () => {} }
      });

      await vc.syncChannelAuditUI({ currentLang: 'fr' });
      assert.equal(runBtn.classList.contains('yt-ai-btn-stop'), true);
      assert.equal(progBox.classList.contains('yt-ai-hidden'), false);
      assert.ok(progBox.innerHTML.includes('Traitement du lot 1/2...'));

      stopBtn.click();
      assert.equal(stopped, true);
      assert.equal(runBtn.classList.contains('yt-ai-btn-stop'), false);
      assert.ok(resBox.innerHTML.includes('arrêté'), 'Aborted status note must render in Watch channel result box');
    } finally {
      global.document = prevDoc;
    }
  });
});
