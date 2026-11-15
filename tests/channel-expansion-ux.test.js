import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { I18N } from '../src/locales/index.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { ChannelCompanionTemplate } from '../src/content/ui/ChannelCompanionTemplate.js';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';
import { ChannelChatController } from '../src/content/ui/ChannelChatController.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';
import { NavigationObserver } from '../src/content/ui/NavigationObserver.js';
import { ChannelIntelligenceFetcher } from '../src/background/ChannelIntelligenceFetcher.js';
import { ChannelIntelligenceManager } from '../src/content/services/ChannelIntelligenceManager.js';
import { ChannelAuditBatchRunner } from '../src/content/services/ChannelAuditBatchRunner.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';
import { parseChannelAuditLimit, parseChannelVideoCount, getChannelAuditOptionsForTotal, resolveEffectiveChannelLimit, renderChannelMaxOptionsHtml } from '../src/config/ExtensionConstants.js';
import { BannerView } from '../src/content/ui/BannerView.js';
import { InnerTubeBridge } from '../src/injected/InnerTubeBridge.js';
import { YouTubeDOMContext } from '../src/content/services/YouTubeDOMContext.js';

function makeMockElement(id = '', initialValue = '') {
  const classes = new Set();
  const listeners = new Map();
  return {
    id,
    value: initialValue,
    disabled: false,
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (force) classes.add(c);
        else classes.delete(c);
        return !!force;
      }
    },
    getAttribute: (attr) => (attr === 'data-period' ? 'year' : null),
    addEventListener: (evt, fn) => listeners.set(evt, fn),
    click: () => listeners.get('click')?.({ currentTarget: null }),
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

describe('Watch & Channel UX, Pagination, Batching, and Fullscreen Regression Suite', () => {
  it('renders Watch banner 5 tabs in exact requested order with plural Q&A label and extended limits', () => {
    const htmlFr = BannerTemplate.render(I18N.fr, { currentLang: 'fr' });
    const tabIds = ['ytAiTabSummaryBtn', 'ytAiTabAuditBtn', 'ytAiTabChannelAuditBtn', 'ytAiTabChatBtn', 'ytAiTabTranscriptBtn'];
    const positions = tabIds.map((id) => htmlFr.indexOf(`id="${id}"`));
    assert.ok(positions.every((p) => p !== -1), 'All 5 Watch tabs must exist');
    for (let i = 1; i < positions.length; i++) {
      assert.ok(positions[i - 1] < positions[i], `Tab ${tabIds[i - 1]} must appear before ${tabIds[i]}`);
    }
    assert.ok(htmlFr.includes('Poser des questions'));
    assert.ok(!htmlFr.includes('Poser une question'));
    assert.ok(htmlFr.includes('value="100"'));
    assert.ok(htmlFr.includes('value="500"'));
    assert.ok(htmlFr.includes('value="1000"'));
    assert.ok(htmlFr.includes('value="all"'));

    const htmlEn = BannerTemplate.render(I18N.en, { currentLang: 'en' });
    assert.ok(htmlEn.includes('Ask questions'));
    assert.equal(parseChannelAuditLimit('all').isAll, true);
    assert.equal(parseChannelAuditLimit('all').fetchCap, 5000);
  });

  it('keeps active channelAudit context and honors "all" limit in AuditViewController.handleTriggerChannelAudit', async () => {
    const prevDoc = global.document;
    let switchSubtabCalled = false;
    let receivedArgs = null;

    const els = {
      ytAiWatchChannelMaxVideos: makeMockElement('ytAiWatchChannelMaxVideos', 'all'),
      ytAiRunWatchChannelAuditBtn: makeMockElement('ytAiRunWatchChannelAuditBtn'),
      ytAiWatchChannelResultContainer: makeMockElement('ytAiWatchChannelResultContainer'),
      ytAiWatchChannelProgress: makeMockElement('ytAiWatchChannelProgress')
    };

    global.document = {
      getElementById: (id) => els[id] || null,
      querySelector: (sel) => {
        if (sel.includes('.yt-ai-period-pill.active')) return els.ytAiWatchChannelMaxVideos;
        if (sel.includes('yt-formatted-string.ytd-channel-name')) return { textContent: 'TechChannel' };
        if (sel.includes('#owner a')) return { getAttribute: () => '/@techchan' };
        return null;
      },
      querySelectorAll: () => [],
      title: 'Sample Video - YouTube'
    };

    try {
      const vc = new AuditViewController({
        auditService: {},
        chatViewController: {},
        channelAuditService: {
          executeChannelAudit: async (args) => {
            receivedArgs = args;
            return { globalScore: 91 };
          }
        },
        channelAuditViewController: { renderReport: () => {} }
      });
      vc.switchAuditSubtab = () => { switchSubtabCalled = true; };

      const state = { channelAuditMaxVideos: 30, channelAuditPeriod: 'all', currentLang: 'fr' };
      await vc.handleTriggerChannelAudit({ state });

      assert.equal(switchSubtabCalled, false, 'Must not switch subtab inside Video Audit when on dedicated channelAudit tab');
      assert.equal(receivedArgs.maxVideos, 'all');
      assert.equal(state.channelAuditMaxVideos, 'all');
    } finally {
      global.document = prevDoc;
    }
  });

  it('renders Channel Page card with ONLY Channel Audit + Channel Q&A tabs (no video tabs) and supports interactive Q&A', async () => {
    const html = ChannelCompanionTemplate.render({ channelIdentifier: '@TestCreator', isFr: true, maxVideos: '500' });
    assert.ok(html.includes('id="ytAiChanTabAuditBtn"'));
    assert.ok(html.includes('id="ytAiChanTabChatBtn"'));
    assert.ok(html.includes('Poser des questions'));
    assert.ok(html.includes('value="all"'));
    assert.ok(!html.includes('ytAiTabSummaryBtn'), 'Channel Page must exclude Video Summary tab');
    assert.ok(!html.includes('ytAiTabTranscriptBtn'), 'Channel Page must exclude Video Transcript tab');
    assert.ok(!html.includes('ytAiTabAuditBtn'), 'Channel Page must exclude Video Fact-Check tab');

    const prevDoc = global.document;
    const prevChrome = global.chrome;
    const msgBox = makeMockElement('ytAiChannelChatMessages');
    const badgeEl = makeMockElement('ytAiChannelChatCount');
    const auditBtn = makeMockElement('ytAiChanTabAuditBtn');
    const chatBtn = makeMockElement('ytAiChanTabChatBtn');
    const paneAudit = makeMockElement('ytAiChanPaneAudit');
    const paneChat = makeMockElement('ytAiChanPaneChat');
    const chatInput = makeMockElement('ytAiChannelChatInput', 'Quelle est leur transparence ?');

    global.document = {
      getElementById: (id) => ({
        ytAiChannelChatMessages: msgBox,
        ytAiChannelChatCount: badgeEl,
        ytAiChanTabAuditBtn: auditBtn,
        ytAiChanTabChatBtn: chatBtn,
        ytAiChanPaneAudit: paneAudit,
        ytAiChanPaneChat: paneChat,
        ytAiChannelChatInput: chatInput
      }[id] || null),
      createElement: () => makeMockElement()
    };

    let sentPrompt = '';
    const listeners = [];
    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: (p) => {
            sentPrompt = p.systemPrompt || '';
            setTimeout(() => {
              listeners.forEach((fn) => fn({ type: 'CHUNK', content: 'Chaîne très transparente.' }));
              listeners.forEach((fn) => fn({ type: 'DONE' }));
            }, 0);
          },
          onMessage: { addListener: (fn) => listeners.push(fn) },
          onDisconnect: { addListener: () => {} },
          disconnect: () => {}
        })
      }
    };

    try {
      const card = new ChannelCompanionCard({ state: { currentLang: 'fr' } });
      card.switchTab('channelChat');
      assert.equal(paneChat.classList.contains('active'), true);
      assert.equal(paneAudit.classList.contains('active'), false);

      const chatCtrl = new ChannelChatController({
        channelManager: {
          getOrFetchChannelDossier: async () => ({
            success: true,
            channel: { title: 'TestCreator', handle: '@TestCreator', recentVideos: [], markdownDossier: 'DOSSIER' }
          }),
          formatContextBlock: () => '### OFFICIAL CHANNEL DOSSIER\nTestCreator bio'
        },
        channelAuditService: {
          getCachedReport: () => ({ globalScore: 95, clickbaitIndex: 3, trajectoryLabel: 'Progression', strengths: ['Sources'], weaknesses: [] })
        }
      });
      chatCtrl.currentChannel = '@TestCreator';

      await chatCtrl.sendMessage(null, {
        channelIdentifier: '@TestCreator',
        state: { currentLang: 'fr', currentProvider: 'lmstudio', getActiveModel: () => 'qwen-local', serverUrls: { lmstudio: 'http://localhost:1234' }, apiKeys: {} }
      });
      await new Promise((r) => setTimeout(r, 20));

      assert.ok(sentPrompt.includes('TestCreator bio'));
      assert.ok(sentPrompt.includes('95/100'));
      assert.equal(badgeEl.textContent, '1');
    } finally {
      global.document = prevDoc;
      global.chrome = prevChrome;
    }
  });

  it('paginates YouTube InnerTube browse continuations beyond 30 videos and updates manager cache limits', async () => {
    const prevFetch = global.fetch;
    const mkLockup = (n) => ({
      richItemRenderer: { content: { lockupViewModel: { contentId: `vid_${n}`, metadata: { lockupMetadataViewModel: { title: { content: `Video ${n}` } } } } } }
    });
    const mkVideoRenderer = (n) => ({
      richItemRenderer: { content: { videoRenderer: { videoId: `vid_${n}`, title: { simpleText: `Legacy Video ${n}` }, viewCountText: { simpleText: '10 k vues' } } } }
    });
    const mkCont = (tok) => ({
      continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: tok } } }
    });

    const initialData = {
      header: { pageHeaderRenderer: { pageTitle: 'BigChannel' } },
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [{ tabRenderer: { content: { richGridRenderer: { contents: [...Array.from({ length: 30 }, (_, i) => mkLockup(i + 1)), mkCont('tok_p2')] } } } }]
        }
      }
    };

    let fetchCalls = 0;
    global.fetch = async (url, init) => {
      fetchCalls++;
      const body = JSON.parse(init.body);
      if (body.continuation === 'tok_p2') {
        return {
          ok: true,
          json: async () => ({
            onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [...Array.from({ length: 30 }, (_, i) => mkLockup(i + 31)), mkCont('tok_p3')] } }]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: Array.from({ length: 15 }, (_, i) => mkVideoRenderer(i + 61)) } }]
        })
      };
    };

    try {
      const dossier = await ChannelIntelligenceFetcher.parseChannelDataWithPagination(initialData, '/@big', 100, { apiKey: 'TEST_KEY', clientVersion: '2.0' });
      assert.equal(fetchCalls, 2);
      assert.equal(dossier.recentVideos.length, 75);
      assert.equal(dossier.totalFetched, 75);
      assert.equal(dossier.hasMore, false);
    } finally {
      global.fetch = prevFetch;
    }

    // Cache invalidation when limit increases and hasMore !== false
    const prevChrome = global.chrome;
    let rpcCalls = 0;
    global.chrome = {
      runtime: {
        sendMessage: (req, cb) => {
          rpcCalls++;
          cb({ success: true, channel: { handle: '@big', title: 'Big', recentVideos: [], hasMore: false } });
        }
      }
    };
    try {
      const mgr = new ChannelIntelligenceManager();
      mgr.cachedDossiers.set('@big', { handle: '@big', title: 'Big', recentVideos: new Array(30), _fetchedLimit: 30, hasMore: true });
      await mgr.getOrFetchChannelDossier('@big', 30);
      assert.equal(rpcCalls, 0);
      await mgr.getOrFetchChannelDossier('@big', 100);
      assert.equal(rpcCalls, 1);
      await mgr.getOrFetchChannelDossier('@big', 500);
      assert.equal(rpcCalls, 1, 'When hasMore is false, entire catalog is already fetched');
    } finally {
      global.chrome = prevChrome;
    }
  });

  it('runs Map-Reduce batching for >30 videos and caps deep dossier enrichment requests', async () => {
    const videos = Array.from({ length: 65 }, (_, i) => ({
      id: `v_${i + 1}`,
      title: `Episode ${i + 1}`,
      era: i < 20 ? 'recent' : i < 45 ? 'mid' : 'legacy',
      sampleIndex: i + 1
    }));

    let streamCalls = 0;
    const raw = await ChannelAuditBatchRunner.run({
      channel: { title: 'MegaChan', handle: '@mega' },
      sampledVideos: videos,
      lang: 'fr',
      state: {},
      streamFn: async ({ userPrompt }) => {
        streamCalls++;
        if (userPrompt.includes('MODE LOT')) {
          const ids = [...userPrompt.matchAll(/^\s+(\d+)\.\s+"/gm)].map((m) => parseInt(m[1], 10));
          return `[EVAL_VIDEOS]\n${ids.map((id) => `${id} | 86 | 8% | Fiable | Bonne rigueur`).join('\n')}\n[/EVAL_VIDEOS]`;
        }
        return '[SCORE_GLOBAL: 86/100]\n[INDICE_CLICKBAIT: 8%]\n[TRAJECTOIRE: PROGRESSION]\n### [✓] Forces\n- Rigoureux\n### Synthèse\n- Solide';
      }
    });

    assert.ok(streamCalls >= 4, 'Must execute >=3 Map batches plus 1 Reduce synthesis call');
    assert.ok(raw.includes('[SCORE_GLOBAL: 86/100]'));

    // Verify ChannelAuditService caps enrichment to <=35 videos & disables comments above 30
    const prevChrome = global.chrome;
    let batchReq = null;
    global.chrome = {
      runtime: {
        sendMessage: (req, cb) => {
          if (req.action === 'FETCH_BATCH_DOSSIERS') {
            batchReq = req;
            cb({ success: true, dossiers: {} });
          }
        },
        connect: () => {
          const ls = [];
          return {
            postMessage: (p) => {
              setTimeout(() => {
                const content = p.userPrompt.includes('MODE LOT')
                  ? '[EVAL_VIDEOS]\n1 | 84 | 10% | Fiable | Bien\n[/EVAL_VIDEOS]'
                  : '[SCORE_GLOBAL: 84/100]\n[INDICE_CLICKBAIT: 10%]\n[TRAJECTOIRE: STABLE]\n### [✓] Forces\n- Clair';
                ls.forEach((f) => f({ type: 'CHUNK', content }));
                ls.forEach((f) => f({ type: 'DONE' }));
              }, 0);
            },
            onMessage: { addListener: (f) => ls.push(f) },
            onDisconnect: { addListener: () => {} },
            disconnect: () => {}
          };
        }
      }
    };

    try {
      const svc = new ChannelAuditService({
        channelManager: {
          getOrFetchChannelDossier: async (_q, limit) => {
            assert.equal(limit, 5000);
            return { success: true, channel: { title: 'MegaChan', handle: '@mega', recentVideos: videos } };
          }
        }
      });
      const report = await svc.executeChannelAudit({ channelQuery: '@mega', maxVideos: 'all', state: {} });
      assert.equal(batchReq.includeComments, false);
      assert.ok(batchReq.videoIds.length <= 35);
      assert.equal(report.totalAvailable, 65);
      assert.equal(report.requestedLimit, 'all');
    } finally {
      global.chrome = prevChrome;
    }
  });

  it('hides both Watch and Channel containers in fullscreen mode (JS observer + CSS rules)', () => {
    const prevDoc = global.document;
    const watchEl = makeMockElement('yt-ai-summarizer-container');
    const chanEl = makeMockElement('yt-ai-channel-companion');
    let fsEl = { tagName: 'YTD-PLAYER' };

    global.document = {
      get fullscreenElement() { return fsEl; },
      getElementById: (id) => (id === 'yt-ai-summarizer-container' ? watchEl : id === 'yt-ai-channel-companion' ? chanEl : null),
      querySelector: () => null
    };

    try {
      assert.equal(NavigationObserver.syncFullscreenVisibility(), true);
      assert.equal(watchEl.classList.contains('yt-ai-fullscreen-hidden'), true);
      assert.equal(chanEl.classList.contains('yt-ai-fullscreen-hidden'), true);

      fsEl = null;
      assert.equal(NavigationObserver.syncFullscreenVisibility(), false);
      assert.equal(watchEl.classList.contains('yt-ai-fullscreen-hidden'), false);
      assert.equal(chanEl.classList.contains('yt-ai-fullscreen-hidden'), false);
    } finally {
      global.document = prevDoc;
    }

    const css = fs.readFileSync(path.join(process.cwd(), 'src/content/content.css'), 'utf8');
    assert.ok(css.includes('.yt-ai-fullscreen-hidden'));
    assert.ok(css.includes('html:has(:fullscreen) #yt-ai-summarizer-container'));
    assert.ok(css.includes('html:has(:fullscreen) #yt-ai-channel-companion'));
  });

  it('parses channel video count labels across FR/EN formats and compact units', () => {
    assert.equal(parseChannelVideoCount('37 vidéos'), 37);
    assert.equal(parseChannelVideoCount('1 234 vidéos'), 1234);
    assert.equal(parseChannelVideoCount('1,234 videos'), 1234);
    assert.equal(parseChannelVideoCount('1,5 k vidéos'), 1500);
    assert.equal(parseChannelVideoCount('2M videos'), 2000000);
    assert.equal(parseChannelVideoCount(''), null);
  });

  it('filters channel audit limit presets strictly below actual channel video count and labels Toutes/All (N)', () => {
    const opts37Fr = getChannelAuditOptionsForTotal(37, true);
    assert.deepEqual(opts37Fr.map((o) => o.value), ['10', '15', '20', '30', 'all']);
    assert.equal(opts37Fr[opts37Fr.length - 1].label, 'Toutes (37)');

    const opts37En = getChannelAuditOptionsForTotal(37, false);
    assert.equal(opts37En[opts37En.length - 1].label, 'All (37)');

    const opts30Fr = getChannelAuditOptionsForTotal(30, true);
    assert.deepEqual(opts30Fr.map((o) => o.value), ['10', '15', '20', 'all']);
    assert.equal(opts30Fr[opts30Fr.length - 1].label, 'Toutes (30)');

    const opts8Fr = getChannelAuditOptionsForTotal(8, true);
    assert.deepEqual(opts8Fr.map((o) => o.value), ['all']);
    assert.equal(opts8Fr[0].label, 'Toutes (8)');

    const opts1420Fr = getChannelAuditOptionsForTotal(1420, true);
    assert.deepEqual(opts1420Fr.map((o) => o.value), ['10', '15', '20', '30', '50', '100', '500', '1000', 'all']);
    assert.equal(opts1420Fr[opts1420Fr.length - 1].label, 'Toutes (1 420)');

    const opts1420En = getChannelAuditOptionsForTotal(1420, false);
    assert.equal(opts1420En[opts1420En.length - 1].label, 'All (1,420)');

    assert.equal(resolveEffectiveChannelLimit(500, 37), 'all');
    const html37 = renderChannelMaxOptionsHtml(500, true, 37);
    assert.ok(html37.includes('<option value="all" selected>Toutes (37)</option>'));
    assert.ok(!html37.includes('value="50"'));
    assert.ok(!html37.includes('value="100"'));
  });

  it('extracts total channel video count from mocked channel header DOM and single-page InnerTube pagination', async () => {
    const prevDoc = global.document;
    global.document = {
      querySelectorAll: (sel) => (sel.includes('#page-header-container') ? [{ textContent: '37 vidéos' }] : []),
      querySelector: () => null
    };
    try {
      assert.equal(YouTubeDOMContext.extractChannelTotalVideosFromDOM(), 37);
    } finally {
      global.document = prevDoc;
    }

    const mkLockup = (n) => ({
      richItemRenderer: { content: { lockupViewModel: { contentId: `v_${n}`, metadata: { lockupMetadataViewModel: { title: { content: `Video ${n}` } } } } } }
    });
    const initialData = {
      header: { pageHeaderRenderer: { pageTitle: 'SmallChannel' } },
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [{ tabRenderer: { content: { richGridRenderer: { contents: Array.from({ length: 37 }, (_, i) => mkLockup(i + 1)) } } } }]
        }
      }
    };
    const dossier = await ChannelIntelligenceFetcher.parseChannelDataWithPagination(initialData, '/@small', 100, null);
    assert.equal(dossier.hasMore, false);
    assert.equal(dossier.recentVideos.length, 37);
    assert.equal(dossier.totalChannelVideos, 37);
  });

  it('supports m.youtube.com mobile watch/channel anchors, fullscreen selectors, and same-origin InnerTube endpoints', () => {
    const prevWin = global.window;
    const prevDoc = global.document;

    global.window = { location: { origin: 'https://m.youtube.com' } };
    assert.equal(InnerTubeBridge._youtubeOrigin(), 'https://m.youtube.com');

    const nextResults = { tagName: 'YTM-SINGLE-COLUMN-WATCH-NEXT-RESULTS-RENDERER' };
    const ytmWatch = {
      tagName: 'YTM-WATCH',
      firstElementChild: nextResults,
      querySelector: (sel) => (sel.includes('ytm-single-column-watch-next-results-renderer') ? nextResults : null)
    };
    const bannerView = new BannerView({});
    assert.equal(bannerView._resolveWatchAnchor(ytmWatch), nextResults);

    const mobileBrowse = {
      tagName: 'YTM-BROWSE',
      firstElementChild: { id: 'mobile-feed' },
      querySelector: () => null
    };
    global.document = {
      querySelector: (sel) => {
        if (sel === 'ytm-browse') return mobileBrowse;
        if (sel.includes('ytm-watch[fullscreen]')) return ytmWatch;
        return null;
      }
    };
    try {
      const card = new ChannelCompanionCard({ state: {} });
      const anchor = card._findChannelAnchor();
      assert.equal(anchor.parent, mobileBrowse);
      assert.equal(NavigationObserver.isFullscreen(), true);
    } finally {
      global.window = prevWin;
      global.document = prevDoc;
    }
  });

  it('paginates beyond 30 videos via browseFetcher proxy and guards totalChannelVideos on continuation error', async () => {
    const mkLockup = (n) => ({
      richItemRenderer: { content: { lockupViewModel: { contentId: `vid_${n}`, metadata: { lockupMetadataViewModel: { title: { content: `Video ${n}` } } } } } }
    });
    const makeGridData = (start, count, token = null) => ({
      header: {
        pageHeaderRenderer: {
          pageTitle: 'BigChannel',
          content: {
            pageHeaderViewModel: {
              metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: '1 300 vidéos' } }] }] } }
            }
          }
        }
      },
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [{
            tabRenderer: {
              content: {
                richGridRenderer: {
                  contents: [
                    ...Array.from({ length: count }, (_, i) => mkLockup(start + i)),
                    ...(token ? [{ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token } } } }] : [])
                  ]
                }
              }
            }
          }]
        }
      }
    });

    const page1 = makeGridData(1, 30, 'tok_p2');
    const dossier = await ChannelIntelligenceFetcher.parseChannelDataWithPagination(page1, '/@big', 'all', {
      apiKey: 'fake_key',
      clientVersion: '2.2026',
      browseFetcher: async ({ continuation }) => {
        if (continuation === 'tok_p2') {
          return {
            ok: true,
            status: 200,
            items: [
              ...Array.from({ length: 30 }, (_, i) => mkLockup(31 + i)),
              { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'tok_p3' } } } }
            ]
          };
        }
        return { ok: true, status: 200, items: Array.from({ length: 15 }, (_, i) => mkLockup(61 + i)) };
      }
    });

    assert.equal(dossier.recentVideos.length, 75);
    assert.equal(dossier.hasMore, false);
    assert.equal(dossier.totalChannelVideos, 75);

    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 403 });
    try {
      const blocked = await ChannelIntelligenceFetcher.parseChannelDataWithPagination(page1, '/@big', 'all', {
        apiKey: 'fake_key',
        clientVersion: '2.2026',
        browseFetcher: async () => ({ ok: false, status: 403, items: [] })
      });
      assert.equal(blocked.recentVideos.length, 30);
      assert.equal(blocked.hasMore, true);
      assert.equal(blocked.totalChannelVideos, 1300, 'Must NOT overwrite catalog total 1300 with 30 on continuation failure');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
