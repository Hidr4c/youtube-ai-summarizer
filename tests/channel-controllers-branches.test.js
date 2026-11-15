import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelCompanionRunController } from '../src/content/ui/ChannelCompanionRunController.js';
import { ChannelChatController } from '../src/content/ui/ChannelChatController.js';

function mkNode(id = '') {
  const classes = new Set();
  const listeners = {};
  const attrs = {};
  const qMap = new Map();
  const qAllMap = new Map();
  let _innerHTML = '';
  const node = {
    id,
    value: '',
    textContent: '',
    disabled: false,
    scrollHeight: 180,
    style: {},
    dataset: { period: 'all' },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, f) => (f === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (f ? classes.add(c) : classes.delete(c))),
      contains: (c) => classes.has(c)
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => attrs[k] ?? null,
    addEventListener: (e, fn) => { (listeners[e] ||= []).push(fn); },
    _emit: (e, payload = {}) => (listeners[e] || []).forEach(fn => fn({ preventDefault() {}, ...payload })),
    appendChild: () => {},
    remove: () => {},
    scrollTo: () => {},
    querySelector: (s) => qMap.get(s) || null,
    querySelectorAll: (s) => qAllMap.get(s) || [],
    _setQ: (s, n) => qMap.set(s, n),
    _setQAll: (s, l) => qAllMap.set(s, l),
    get innerHTML() { return _innerHTML; },
    set innerHTML(v) { _innerHTML = String(v); }
  };
  return node;
}

describe('ChannelCompanionRunController & ChannelChatController Branches', () => {
  it('covers ChannelCompanionRunController events, syncActiveJobUI, run fallback & restoreCachedReport', async () => {
    const origDoc = globalThis.document;
    try {
      const els = new Map([
        ['yt-ai-channel-companion', mkNode('yt-ai-channel-companion')],
        ['ytAiCompLangSelect', Object.assign(mkNode('ytAiCompLangSelect'), { value: 'en' })],
        ['ytAiChannelProgress', mkNode('ytAiChannelProgress')],
        ['ytAiChannelResultContainer', mkNode('ytAiChannelResultContainer')],
        ['ytAiRunChannelAuditBtn', mkNode('ytAiRunChannelAuditBtn')],
        ['ytAiCompanionMaxVideos', Object.assign(mkNode('ytAiCompanionMaxVideos'), { value: '30' })],
        ['ytAiCompanionStatusBanner', mkNode('ytAiCompanionStatusBanner')]
      ]);
      const cardEl = els.get('yt-ai-channel-companion');
      cardEl._setQAll('.yt-ai-period-pill', [Object.assign(mkNode(), { dataset: { period: 'year' } })]);
      cardEl._setQ('#ytAiCompanionMaxVideos', els.get('ytAiCompanionMaxVideos'));

      globalThis.document = {
        getElementById: (id) => els.get(id) || null,
        querySelector: (s) => (s === '#yt-ai-channel-companion .yt-ai-period-pill.active' ? Object.assign(mkNode(), { getAttribute: () => 'year' }) : null),
        querySelectorAll: () => []
      };

      let subCb = null;
      let rendered = 0;
      const card = {
        currentChannel: '@TestChan',
        knownTotalVideos: null,
        state: { currentLang: 'en', channelAuditMaxVideos: 30 },
        viewController: { renderReport: () => { rendered++; } },
        service: {
          subscribe: (fn) => { subCb = fn; return () => {}; },
          getActiveJob: () => ({ period: 'year', maxVideos: 30, progress: { percent: 33, message: 'Working' } }),
          executeChannelAudit: async () => ({ channelTotalVideos: 50 }),
          abortAudit: () => {},
          ensureHydrated: async () => {},
          isAuditRunning: () => false,
          getCachedReport: () => ({ id: 'cachedRep' })
        }
      };

      const runCtrl = new ChannelCompanionRunController(card);
      runCtrl.bindSubscription();
      assert.equal(runCtrl.syncActiveJobUI('@TestChan', 'en'), true);

      subCb(null);
      subCb({ type: 'started', job: { channelQuery: '@OtherChan' } });
      subCb({ type: 'started', job: { channelQuery: '@TestChan', lang: 'fr' }, progress: { percent: 10 } });
      els.get('ytAiChannelProgress')._setQ('.yt-ai-progress-widget', mkNode());
      subCb({ type: 'progress', job: { channelQuery: '@TestChan', lang: 'en' }, progress: { percent: 60 } });
      subCb({ type: 'completed', job: { channelQuery: '@TestChan', lang: 'en', maxVideos: 30 }, report: { channelTotalVideos: 90 } });
      subCb({ type: 'aborted', job: { channelQuery: '@TestChan', lang: 'en' } });
      subCb({ type: 'error', job: { channelQuery: '@TestChan', lang: 'en' }, error: new Error('Fail') });
      assert.equal(rendered, 1);

      // Run without subscribe (direct execution + error branches)
      const directCard = {
        currentChannel: '@Direct',
        state: { currentLang: 'fr' },
        viewController: { renderChannelReport: () => { rendered++; } },
        service: {
          executeChannelAudit: async ({ onProgress }) => { onProgress({ percent: 50 }); return { ok: true }; },
          abortAudit: () => {},
          ensureHydrated: async () => {},
          isAuditRunning: () => false,
          getCachedReport: () => ({ ok: true })
        }
      };
      const directCtrl = new ChannelCompanionRunController(directCard);
      await directCtrl.run();
      assert.equal(rendered, 2);

      directCard.service.executeChannelAudit = async () => { throw new Error('Direct boom'); };
      await directCtrl.run();
      assert.match(els.get('ytAiChannelResultContainer').innerHTML, /Direct boom/);

      await directCtrl.restoreCachedReport('@Direct');
      assert.equal(rendered, 3);
      directCtrl.stop();

      // classList without toggle branch
      const noToggleBtn = mkNode('ytAiRunChannelAuditBtn');
      delete noToggleBtn.classList.toggle;
      els.set('ytAiRunChannelAuditBtn', noToggleBtn);
      directCtrl.setRunButtonRunning(true, 'en');
      directCtrl.setRunButtonRunning(false, 'en');
    } finally {
      globalThis.document = origDoc;
    }
  });

  it('covers ChannelChatController events, missing keys/models, transcript injection & stream lifecycle', async () => {
    const origDoc = globalThis.document;
    const origChrome = globalThis.chrome;
    try {
      const els = new Map([
        ['ytAiChannelChatCount', mkNode('ytAiChannelChatCount')],
        ['ytAiChannelChatMessages', mkNode('ytAiChannelChatMessages')],
        ['ytAiChannelChatInput', Object.assign(mkNode('ytAiChannelChatInput'), { value: '' })],
        ['ytAiCompLangSelect', Object.assign(mkNode('ytAiCompLangSelect'), { value: 'fr' })],
        ['ytAiChannelSendChatBtn', mkNode('ytAiChannelSendChatBtn')],
        ['ytAiChannelClearChatBtn', mkNode('ytAiChannelClearChatBtn')],
        ['ytAiChannelMicBtn', mkNode('ytAiChannelMicBtn')]
      ]);
      const sugBox = mkNode();
      const chip = mkNode();
      chip.setAttribute('data-question', 'Top sponsors?');
      chip.classList.add('yt-ai-channel-suggestion-chip');

      const banner = mkNode('banner');
      banner._setQ('#ytAiChannelSendChatBtn', els.get('ytAiChannelSendChatBtn'));
      banner._setQ('#ytAiChannelChatInput', els.get('ytAiChannelChatInput'));
      banner._setQ('#ytAiChannelClearChatBtn', els.get('ytAiChannelClearChatBtn'));
      banner._setQ('#ytAiChannelMicBtn', els.get('ytAiChannelMicBtn'));
      banner._setQ('.yt-ai-chat-suggestions', sugBox);

      globalThis.document = {
        getElementById: (id) => els.get(id) || null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => mkNode('div')
      };

      let stoppedSpeech = 0;
      const chatCtrl = new ChannelChatController({
        channelManager: {
          getOrFetchChannelDossier: async () => ({ success: true, channel: { title: 'Ch', subscribers: '10k', recentVideos: [] } }),
          formatContextBlock: () => 'CHANNEL DOSSIER'
        },
        channelAuditService: {
          getCachedReport: () => ({
            globalScore: 84,
            tier: { label: 'Solid' },
            clickbaitIndex: 12,
            trajectoryLabel: 'Stable',
            strengths: ['Verified citations'],
            weaknesses: ['Fast intro'],
            executiveSummary: 'Reliable channel'
          })
        },
        audioController: {
          stopSpeech: () => { stoppedSpeech++; },
          stopDictation: () => {},
          toggleDictation: () => { stoppedSpeech++; }
        },
        transcriptController: {
          extractYouTubeTranscript: async () => [{ timestamp: '00:00', text: 'Transcript text' }]
        }
      });
      chatCtrl.currentChannel = '@Ch';
      chatCtrl.transcriptManager.ensureTranscriptsLoaded = async () => ({ loaded: ['dQw4w9WgXcQ'] });
      chatCtrl.transcriptManager.buildMultiVideoContext = () => ({ safeTranscript: 'MULTI CONTEXT' });

      const state = { currentLang: 'fr', currentProvider: 'lmstudio', apiKeys: {} };
      chatCtrl.bindEvents(banner, state);
      els.get('ytAiChannelClearChatBtn')._emit('click');
      els.get('ytAiChannelMicBtn')._emit('click');
      els.get('ytAiChannelChatInput')._emit('input');
      els.get('ytAiChannelChatInput')._emit('keydown', { key: 'Enter', shiftKey: false });
      sugBox._emit('click', { target: chip });
      assert.ok(stoppedSpeech >= 2);

      // Missing model and missing cloud key
      await chatCtrl.sendMessage('   ', { state });
      await chatCtrl.sendMessage('Check model', { state });
      await chatCtrl.sendMessage('Check cloud key', { state: { currentProvider: 'openai', selectedModel: 'gpt-4o', apiKeys: {} } });

      // Stream lifecycle: empty answer vs populated answer vs error
      const calls = [];
      chatCtrl.streamClient.startStream = (opts) => { calls.push(opts); opts.onChunk('Hello '); opts.onDone(); };
      await chatCtrl.sendMessage('Compare with https://youtu.be/dQw4w9WgXcQ', { state: { selectedModel: 'qwen', currentProvider: 'ollama' } });
      assert.equal(calls.length, 1);
      assert.equal(els.get('ytAiChannelChatCount').textContent, '1');

      chatCtrl.streamClient.startStream = (opts) => { opts.onDone(); };
      await chatCtrl.sendMessage('Empty AI reply test', { state: { selectedModel: 'qwen', currentProvider: 'ollama' } });

      chatCtrl.streamClient.startStream = (opts) => { opts.onError('Stream err'); };
      await chatCtrl.sendMessage('Error reply test', { state: { selectedModel: 'qwen', currentProvider: 'ollama' } });

      assert.equal(chatCtrl._formatChannelAuditBlock(null, 'en'), '');
      assert.match(chatCtrl._formatChannelAuditBlock({ globalScore: 70, badge: { label: 'OK' }, clickbaitIndex: 5, trajectoryLabel: 'Up' }, 'en'), /CACHED CHANNEL/);

      // Individual chip listener fallback when sugBox absent
      banner._setQ('.yt-ai-chat-suggestions', null);
      banner._setQAll('.yt-ai-channel-suggestion-chip', [chip]);
      chatCtrl.bindEvents(banner, state);
      chatCtrl.resetChat('en', false);
    } finally {
      globalThis.document = origDoc;
      globalThis.chrome = origChrome;
    }
  });
});
