import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamRenderScheduler } from '../src/content/ui/StreamRenderScheduler.js';
import { LocalContextManager } from '../src/background/LocalContextManager.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { MessageRouter } from '../src/background/MessageRouter.js';
import { resolveContextCharLimit } from '../src/config/AIProviderPresets.js';
import { LOCAL_CONTEXT_RANGE } from '../src/config/ExtensionConstants.js';
import { SettingsDrawerTemplate } from '../src/content/templates/SettingsDrawerTemplate.js';
import { SettingsDrawerI18n } from '../src/content/ui/SettingsDrawerI18n.js';
import { SettingsDrawerEventHandler } from '../src/content/ui/SettingsDrawerEventHandler.js';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { PromptService } from '../src/content/services/PromptService.js';
import { I18N } from '../src/locales/index.js';

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Streaming Render Scheduler & Local Context Window Control', () => {
  it('StreamRenderScheduler coalesces rapid token bursts into leading + trailing renders and supports flush/cancel', async () => {
    const rendered = [];
    const scheduler = StreamRenderScheduler.create((val) => rendered.push(val), 28);

    // Leading edge renders immediately with 0ms lag
    scheduler.schedule('Tok1');
    assert.deepEqual(rendered, ['Tok1']);

    // Rapid burst within 28ms coalesces into one trailing render
    for (let i = 2; i <= 15; i++) {
      scheduler.schedule(`Tok1..Tok${i}`);
    }
    assert.deepEqual(rendered, ['Tok1']);

    await waitMs(45);
    assert.deepEqual(rendered, ['Tok1', 'Tok1..Tok15']);

    // Flush renders pending update synchronously
    scheduler.schedule('FlushMe');
    await waitMs(5);
    scheduler.schedule('FlushFinal');
    scheduler.flush();
    assert.equal(rendered[rendered.length - 1], 'FlushFinal');

    // Cancel suppresses pending trailing render
    scheduler.schedule('TriggerLead');
    scheduler.schedule('ShouldNotRender');
    scheduler.cancel();
    await waitMs(45);
    assert.equal(rendered.includes('ShouldNotRender'), false);
  });

  it('LocalContextManager.parseContextLength, detectLocalContextDefault and resolveContextCharLimit handle 0..1M range and server defaults', async () => {
    assert.equal(LocalContextManager.parseContextLength('auto'), null);
    assert.equal(LocalContextManager.parseContextLength('0'), null);
    assert.equal(LocalContextManager.parseContextLength(null), null);
    assert.equal(LocalContextManager.parseContextLength('512'), null);
    assert.equal(LocalContextManager.parseContextLength('32768'), 32768);
    assert.equal(LocalContextManager.parseContextLength('1048576'), 1048576);
    assert.equal(LocalContextManager.parseContextLength('9999999'), 1048576);

    assert.equal(resolveContextCharLimit('lmstudio', 'auto'), 16000);
    assert.equal(resolveContextCharLimit('lmstudio', '8192'), 15576);
    assert.equal(resolveContextCharLimit('ollama', '32768'), 89304);
    assert.equal(resolveContextCharLimit('ollama', '65536'), 90000);
    assert.equal(resolveContextCharLimit('gemini', '8192'), 120000);

    // LM Studio loaded instance detection (131584) vs unloaded fallback (8192)
    const lmsLoaded = await LocalContextManager.detectLocalContextDefault({
      provider: 'lmstudio',
      serverUrl: 'http://localhost:1234',
      model: 'qwen/qwen3.8-27b',
      fetchFn: async () => ({
        ok: true,
        json: async () => ({
          models: [{
            key: 'qwen/qwen3.8-27b',
            max_context_length: 262144,
            loaded_instances: [{ id: 'qwen/qwen3.8-27b', config: { context_length: 131584 } }]
          }]
        })
      })
    });
    assert.equal(lmsLoaded.contextLength, 131584);
    assert.equal(lmsLoaded.maxContextLength, 262144);
    assert.equal(lmsLoaded.isLoaded, true);
    assert.equal(lmsLoaded.canModifyContext, true);

    const lmsUnloaded = await LocalContextManager.detectLocalContextDefault({
      provider: 'lmstudio',
      serverUrl: 'http://localhost:1234',
      model: 'qwen/qwen3.8-27b',
      fetchFn: async () => ({ ok: true, json: async () => ({ models: [{ key: 'qwen/qwen3.8-27b', max_context_length: 262144, loaded_instances: [] }] }) })
    });
    assert.equal(lmsUnloaded.contextLength, 8192);
    assert.equal(lmsUnloaded.isLoaded, false);
    assert.equal(lmsUnloaded.canModifyContext, true);

    // Unsupported older server (404 on /api/v1/models) and Cloud/Ollama-Cloud models report canModifyContext: false
    const lmsUnsupported = await LocalContextManager.detectLocalContextDefault({
      provider: 'lmstudio',
      serverUrl: 'http://localhost:1234',
      model: 'legacy-model',
      fetchFn: async () => ({ ok: false, status: 404 })
    });
    assert.equal(lmsUnsupported.canModifyContext, false);
    assert.equal(lmsUnsupported.readOnlyReason, 'server');

    const ollamaCloud = await LocalContextManager.detectLocalContextDefault({
      provider: 'ollama',
      serverUrl: 'http://localhost:11434',
      model: 'qwen3-coder:480b-cloud',
      fetchFn: () => { throw new Error('Should not query local ps for :cloud models'); }
    });
    assert.equal(ollamaCloud.canModifyContext, false);
    assert.equal(ollamaCloud.readOnlyReason, 'cloud');

    // Ollama running (/api/ps) and unloaded (/api/show num_ctx vs 4096 default)
    const ollamaRunning = await LocalContextManager.detectLocalContextDefault({
      provider: 'ollama',
      serverUrl: 'http://localhost:11434',
      model: 'qwen3.8:27b',
      fetchFn: async (url) => url.endsWith('/api/ps')
        ? { ok: true, json: async () => ({ models: [{ name: 'qwen3.8:27b', context_length: 32768 }] }) }
        : { ok: false }
    });
    assert.equal(ollamaRunning.contextLength, 32768);
    assert.equal(ollamaRunning.isLoaded, true);
    assert.equal(ollamaRunning.canModifyContext, true);

    const ollamaShow = await LocalContextManager.detectLocalContextDefault({
      provider: 'ollama',
      serverUrl: 'http://localhost:11434',
      model: 'custom-qwen',
      fetchFn: async (url) => url.endsWith('/api/ps')
        ? { ok: true, json: async () => ({ models: [] }) }
        : { ok: true, json: async () => ({ parameters: 'temperature 0.3\nnum_ctx 16384', model_info: { 'qwen.context_length': 131072 } }) }
    });
    assert.equal(ollamaShow.contextLength, 16384);
    assert.equal(ollamaShow.maxContextLength, 131072);
    assert.equal(ollamaShow.isLoaded, false);
    assert.equal(ollamaShow.canModifyContext, true);
  });

  it('LocalContextManager.ensureLmStudioContext skips auto, honors +/-512 alignment tolerance, and reloads mismatched instances', async () => {
    const skipped = await LocalContextManager.ensureLmStudioContext({
      serverUrl: 'http://localhost:1234',
      model: 'qwen/qwen3.8-27b',
      contextLength: 'auto',
      fetchFn: () => { throw new Error('Should not fetch when auto'); }
    });
    assert.equal(skipped.skipped, true);

    // Alignment tolerance: 131072 requested vs 131584 loaded (diff = 512) -> alreadyMatched, zero unload/load
    const callsMatched = [];
    const matched = await LocalContextManager.ensureLmStudioContext({
      serverUrl: 'http://localhost:1234',
      model: 'qwen/qwen3.8-27b',
      contextLength: '131072',
      fetchFn: async (url) => {
        callsMatched.push(url);
        return {
          ok: true,
          json: async () => ({
            models: [{
              key: 'qwen/qwen3.8-27b',
              max_context_length: 262144,
              loaded_instances: [{ id: 'qwen/qwen3.8-27b', config: { context_length: 131584 } }]
            }]
          })
        };
      }
    });
    assert.equal(matched.alreadyMatched, true);
    assert.equal(callsMatched.length, 1);

    // Mismatched context (131584 -> 32768) with loopback fallback (localhost -> 127.0.0.1): unload + load
    const actions = [];
    const progressMsgs = [];
    const reloaded = await LocalContextManager.ensureLmStudioContext({
      serverUrl: 'http://localhost:1234',
      model: 'qwen/qwen3.8-27b',
      apiKey: 'secret-token',
      contextLength: '32768',
      postProgress: (m) => progressMsgs.push(m),
      fetchFn: async (url, opts) => {
        if (url.startsWith('http://localhost:1234/api/v1/models')) {
          throw new TypeError('connect ECONNREFUSED localhost');
        }
        actions.push({ url, method: opts.method, auth: opts.headers?.Authorization, body: opts.body ? JSON.parse(opts.body) : null });
        if (url.endsWith('/api/v1/models')) {
          return {
            ok: true,
            json: async () => ({
              models: [{
                key: 'qwen/qwen3.8-27b',
                max_context_length: 262144,
                loaded_instances: [{ id: 'inst-131k', config: { context_length: 131584 } }]
              }]
            })
          };
        }
        if (url.endsWith('/api/v1/models/unload')) {
          return { ok: true, json: async () => ({ instance_id: 'inst-131k' }) };
        }
        if (url.endsWith('/api/v1/models/load')) {
          return {
            ok: true,
            json: async () => ({ load_time_seconds: 5.4, load_config: { context_length: 32768 } })
          };
        }
        return { ok: false, status: 404 };
      }
    });

    assert.equal(reloaded.applied, true);
    assert.equal(reloaded.reloaded, true);
    assert.equal(reloaded.contextLength, 32768);
    assert.equal(reloaded.loadTimeSeconds, 5.4);
    assert.equal(progressMsgs.some((p) => p.waitingForModel === true), true);
    assert.equal(actions[1].url, 'http://127.0.0.1:1234/api/v1/models/unload');
    assert.deepEqual(actions[1].body, { instance_id: 'inst-131k' });
    assert.equal(actions[2].url, 'http://127.0.0.1:1234/api/v1/models/load');
    assert.equal(actions[2].auth, 'Bearer secret-token');
    assert.deepEqual(actions[2].body, {
      model: 'qwen/qwen3.8-27b',
      context_length: 32768,
      flash_attention: true,
      offload_kv_cache_to_gpu: true,
      echo_load_config: true
    });

    // Older LM Studio returning 404 degrades silently without blocking stream
    const unsupported = await LocalContextManager.ensureLmStudioContext({
      serverUrl: 'http://localhost:1234',
      model: 'qwen/qwen3.8-27b',
      contextLength: '16384',
      fetchFn: async () => ({ ok: false, status: 404 })
    });
    assert.equal(unsupported.applied, false);
    assert.equal(unsupported.unsupported, true);
  });

  it('StreamRelay.handleStream routes custom Ollama num_ctx through native /api/chat NDJSON stream', async () => {
    const origFetch = globalThis.fetch;
    const encoder = new TextEncoder();
    let capturedUrl = '';
    let capturedBody = null;

    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedBody = JSON.parse(opts.body);
      const chunks = [
        encoder.encode('{"message":{"thinking":"Thinking step"}}\n'),
        encoder.encode('{"message":{"content":"Ollama summary ready"},"done":true}') // EOF without trailing newline
      ];
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => (chunks.length ? { done: false, value: chunks.shift() } : { done: true }),
            cancel: async () => {}
          })
        }
      };
    };

    try {
      const posted = [];
      await StreamRelay.handleStream({
        provider: 'ollama',
        serverUrl: 'http://localhost:11434',
        model: 'qwen3.8:27b',
        userPrompt: 'Summarize',
        temperature: '0.4',
        maxTokens: '2048',
        localContextLength: '32768',
        heartbeatIntervalMs: 500
      }, { onDisconnect: { addListener: () => {} }, postMessage: (m) => posted.push(m) });

      assert.equal(capturedUrl, 'http://localhost:11434/api/chat');
      assert.equal(capturedBody.options.num_ctx, 32768);
      assert.equal(capturedBody.options.num_predict, 2048);
      assert.equal(capturedBody.options.temperature, 0.4);
      assert.ok(posted.some((m) => m.type === 'CHUNK' && m.reasoning === 'Thinking step'));
      assert.ok(posted.some((m) => m.type === 'CHUNK' && m.content === 'Ollama summary ready'));
      assert.ok(posted.some((m) => m.type === 'DONE'));
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('MessageRouter handles APPLY_LOCAL_CONTEXT and GET_LOCAL_CONTEXT_DEFAULT cleanly', async () => {
    const origChrome = globalThis.chrome;
    const origEnsure = LocalContextManager.ensureLmStudioContext;
    const origDetect = LocalContextManager.detectLocalContextDefault;
    try {
      let onMsgHandler = null;
      globalThis.chrome = {
        runtime: {
          onConnect: { addListener: () => {} },
          onMessage: { addListener: (fn) => { onMsgHandler = fn; } }
        }
      };

      LocalContextManager.ensureLmStudioContext = async ({ contextLength }) => ({
        applied: true,
        reloaded: true,
        contextLength
      });
      LocalContextManager.detectLocalContextDefault = async () => ({
        contextLength: 131584,
        isLoaded: true,
        provider: 'lmstudio'
      });

      MessageRouter.init();
      assert.ok(typeof onMsgHandler === 'function');

      const detectedRes = await new Promise((resolve) => {
        onMsgHandler({ action: 'GET_LOCAL_CONTEXT_DEFAULT', provider: 'lmstudio', model: 'qwen/qwen3.8-27b' }, {}, resolve);
      });
      assert.equal(detectedRes.success, true);
      assert.equal(detectedRes.contextLength, 131584);

      const ollamaRes = await new Promise((resolve) => {
        onMsgHandler({ action: 'APPLY_LOCAL_CONTEXT', provider: 'ollama', contextLength: '16384' }, {}, resolve);
      });
      assert.equal(ollamaRes.success, true);
      assert.equal(ollamaRes.contextLength, 16384);
      assert.equal(ollamaRes.appliedOnNextRequest, true);

      const lmsRes = await new Promise((resolve) => {
        onMsgHandler({
          action: 'APPLY_LOCAL_CONTEXT',
          provider: 'lmstudio',
          serverUrl: 'http://localhost:1234',
          model: 'qwen/qwen3.8-27b',
          contextLength: '32768'
        }, {}, resolve);
      });
      assert.equal(lmsRes.success, true);
      assert.equal(lmsRes.reloaded, true);
      assert.equal(lmsRes.contextLength, 32768);
    } finally {
      LocalContextManager.ensureLmStudioContext = origEnsure;
      LocalContextManager.detectLocalContextDefault = origDetect;
      globalThis.chrome = origChrome;
    }
  });

  it('SettingsDrawer renders 0..1M slider, defaults to LM Studio/Ollama value, syncs input & applies context + SummaryViewController forwards state params', async () => {
    const origDoc = globalThis.document;
    const origChrome = globalThis.chrome;
    const origWin = globalThis.window;

    try {
      const html = SettingsDrawerTemplate.render(I18N.fr);
      assert.equal(LOCAL_CONTEXT_RANGE.min, 0);
      assert.equal(LOCAL_CONTEXT_RANGE.max, 1048576);
      assert.ok(html.includes('id="ytAiLocalContextSlider"'));
      assert.ok(html.includes('min="0" max="1048576"'));
      assert.ok(html.includes('id="ytAiLocalContextInput"'));
      assert.ok(html.includes('id="ytAiLocalContextValue"'));
      assert.ok(html.includes('ytAiLocalContextContainer'));
      assert.ok(html.includes('ytAiApplyContextBtn'));

      const makeNode = (id = '', extra = {}) => {
        const classes = new Set();
        const listeners = {};
        const attrs = new Map();
        return {
          id,
          value: '',
          textContent: '',
          title: '',
          checked: false,
          disabled: false,
          innerHTML: '',
          setAttribute: (k, v) => attrs.set(k, String(v)),
          getAttribute: (k) => attrs.get(k) || null,
          classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            toggle: (c, f) => (f ? classes.add(c) : classes.delete(c)),
            contains: (c) => classes.has(c)
          },
          addEventListener: (e, fn) => { (listeners[e] ||= []).push(fn); },
          _trigger: (e, evObj = {}) => (listeners[e] || []).forEach((fn) => fn(evObj)),
          querySelector: () => null,
          ...extra
        };
      };

      const ctxContainer = makeNode('ytAiLocalContextContainer');
      const ctxLabel = makeNode('ytAiLocalContextLabel');
      const ctxSlider = makeNode('ytAiLocalContextSlider', { value: '0' });
      const ctxInput = makeNode('ytAiLocalContextInput', { value: '0' });
      const ctxValueBadge = makeNode('ytAiLocalContextValue');
      const applyBtn = makeNode('ytAiApplyContextBtn');
      const tempSel = makeNode('ytAiTemperatureSelect', { value: '0.3' });
      const maxTokSel = makeNode('ytAiMaxTokensSelect', { value: 'auto' });
      const autoCheck = makeNode('ytAiAutoSummarizeCheck');
      const promptInput = makeNode('ytAiCustomPromptInput');

      const mapById = new Map([
        ['ytAiLocalContextContainer', ctxContainer],
        ['ytAiLocalContextLabel', ctxLabel],
        ['ytAiLocalContextSlider', ctxSlider],
        ['ytAiLocalContextInput', ctxInput],
        ['ytAiLocalContextValue', ctxValueBadge],
        ['ytAiApplyContextBtn', applyBtn],
        ['ytAiTemperatureSelect', tempSel],
        ['ytAiMaxTokensSelect', maxTokSel],
        ['ytAiAutoSummarizeCheck', autoCheck],
        ['ytAiCustomPromptInput', promptInput]
      ]);

      globalThis.document = {
        getElementById: (id) => mapById.get(id) || null,
        querySelector: () => null,
        querySelectorAll: () => []
      };

      const sentMsgs = [];
      globalThis.chrome = {
        runtime: {
          sendMessage: (msg, cb) => {
            sentMsgs.push(msg);
            if (msg.action === 'GET_LOCAL_CONTEXT_DEFAULT') {
              cb({ success: true, contextLength: 131584, isLoaded: true, provider: 'lmstudio' });
              return;
            }
            cb({ success: true, contextLength: 32768 });
          }
        }
      };

      const banners = [];
      const savedPrefs = {};
      const state = {
        currentProvider: 'lmstudio',
        currentLang: 'fr',
        serverUrls: { lmstudio: 'http://localhost:1234' },
        apiKeys: {},
        temperature: '0.7',
        maxTokens: '4096',
        localContextLength: 'auto',
        serverDefaultContexts: {},
        autoSummarize: true,
        customPrompt: 'Be concise',
        getActiveModel: () => 'qwen/qwen3.8-27b',
        savePreference: (k, v) => { savedPrefs[k] = v; }
      };

      const rootContainer = {
        querySelector: (sel) => mapById.get(sel.replace(/^#/, '')) || null,
        querySelectorAll: () => []
      };
      const fakeDrawer = { bindPasteButton: () => {}, updateHeaderBadge: () => {}, updateHeaderModelText: () => {} };
      const fakeBanner = { showStatusBanner: (m, e) => banners.push({ m, e }) };

      SettingsDrawerEventHandler.bind(rootContainer, fakeDrawer, state, fakeBanner);

      // Hydrated values and automatic default matching LM Studio loaded instance (131584)
      assert.equal(tempSel.value, '0.7');
      assert.equal(maxTokSel.value, '4096');
      assert.equal(ctxSlider.value, '131584');
      assert.equal(ctxInput.value, '131584');
      assert.ok(ctxValueBadge.textContent.includes('LM Studio'));
      assert.equal(ctxContainer.classList.contains('yt-ai-hidden'), false);
      assert.equal(autoCheck.checked, true);
      assert.equal(promptInput.value, 'Be concise');

      // Greys out / disables slider, input, and Apply button for Cloud, Ollama :cloud, and unsupported server models
      SettingsDrawerI18n.syncLocalContextVisibility('gemini', { lang: 'fr' });
      assert.equal(ctxContainer.classList.contains('yt-ai-hidden'), false);
      assert.equal(ctxContainer.classList.contains('yt-ai-setting-disabled'), true);
      assert.equal(ctxSlider.disabled, true);
      assert.equal(ctxInput.disabled, true);
      assert.equal(applyBtn.disabled, true);
      assert.equal(ctxValueBadge.textContent, I18N.fr.ctxFixedCloud);

      SettingsDrawerI18n.syncLocalContextVisibility('ollama', { model: 'qwen3-coder:480b-cloud', lang: 'en' });
      assert.equal(ctxContainer.classList.contains('yt-ai-setting-disabled'), true);
      assert.equal(ctxSlider.disabled, true);
      assert.equal(ctxValueBadge.textContent, I18N.en.ctxFixedCloud);

      SettingsDrawerI18n.syncLocalContextVisibility('lmstudio', { model: 'old-model', canModifyContext: false, readOnlyReason: 'server', lang: 'fr' });
      assert.equal(ctxContainer.classList.contains('yt-ai-setting-disabled'), true);
      assert.equal(ctxSlider.disabled, true);
      assert.equal(ctxValueBadge.textContent, I18N.fr.ctxFixedServer);

      // Re-enables controls for modifiable local models
      SettingsDrawerI18n.syncLocalContextVisibility('ollama', { model: 'qwen3.8:27b', canModifyContext: true, lang: 'en' });
      assert.equal(ctxContainer.classList.contains('yt-ai-setting-disabled'), false);
      assert.equal(ctxSlider.disabled, false);
      assert.equal(ctxInput.disabled, false);
      assert.equal(applyBtn.disabled, false);

      // Language switch updates label and keeps localized server-default readout
      ctxSlider.value = '131584';
      ctxSlider.setAttribute('data-server-default', 'lmstudio');
      SettingsDrawerI18n.applyLanguage('en');
      assert.equal(ctxLabel.textContent, I18N.en.localContextLabel);
      assert.equal(ctxValueBadge.textContent, '131,584 tokens (LM Studio Default)');

      // Dragging slider up to 1M (1048576) updates input + badge without forcing persistence until change
      ctxSlider.value = '1048576';
      ctxSlider._trigger('input', { target: ctxSlider });
      assert.equal(ctxInput.value, '1048576');
      assert.equal(ctxValueBadge.textContent, '1 048 576 tokens (1M)');
      assert.equal(state.localContextLength, '1048576');

      // Dragging slider to 32768 + change persists value and synchronizes input
      ctxSlider.value = '32768';
      ctxSlider._trigger('change', { target: ctxSlider });
      assert.equal(state.localContextLength, '32768');
      assert.equal(savedPrefs.localContextLength, '32768');

      // Direct numeric edit syncs slider
      ctxInput.value = '16384';
      ctxInput._trigger('input', { target: ctxInput });
      assert.equal(ctxSlider.value, '16384');
      assert.equal(state.localContextLength, '16384');

      // Clicking Apply triggers APPLY_LOCAL_CONTEXT runtime message
      applyBtn._trigger('click');
      const applyMsgs = sentMsgs.filter((m) => m.action === 'APPLY_LOCAL_CONTEXT');
      assert.equal(applyMsgs.length, 1);
      assert.equal(applyMsgs[0].contextLength, '16384');
      assert.ok(banners.some((b) => b.e === false && b.m.includes('32768')));

      // SummaryViewController forwards state.temperature, state.maxTokens, state.localContextLength
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=ctxForward') };
      const sumPosted = [];
      const sumEls = new Map([
        ['ytAiLangSelect', { value: 'fr' }],
        ['ytAiModeSelect', { value: 'standard' }],
        ['ytAiSummaryBody', { innerHTML: '', classList: { add: () => {}, remove: () => {} } }],
        ['ytAiSummarizeBtn', { disabled: false, innerHTML: '', title: '' }],
        ['ytAiStopSummaryBtn', { disabled: false, classList: { add: () => {}, remove: () => {} } }]
      ]);
      globalThis.document.getElementById = (id) => sumEls.get(id) || null;
      globalThis.chrome.runtime.connect = () => ({
        onMessage: { addListener: () => {} },
        onDisconnect: { addListener: () => {} },
        postMessage: (m) => sumPosted.push(m),
        disconnect: () => {}
      });

      const sumCtrl = new SummaryViewController({
        transcriptController: {
          cachedVideoMetadata: { videoId: 'ctxForward', title: 'T', author: 'A', description: 'D' },
          cachedTranscript: { fullText: 'Sample words '.repeat(5) },
          extractYouTubeTranscript: async () => [{ text: 'Sample', start: 0 }]
        },
        promptService: new PromptService()
      });
      await sumCtrl.startSummarization({ state, currentLang: 'fr' });
      assert.equal(sumPosted[0].temperature, '0.7');
      assert.equal(sumPosted[0].maxTokens, '4096');
      assert.equal(sumPosted[0].localContextLength, '32768');

      // Check 8-language parity of new keys
      const requiredKeys = [
        'localContextLabel', 'ctxAuto', 'ctxServerDefault', 'ctxFixedCloud', 'ctxFixedServer',
        'applyContextBtn', 'applyContextTooltip', 'contextAppliedMsg', 'contextOllamaHint'
      ];
      for (const [lang, dict] of Object.entries(I18N)) {
        for (const k of requiredKeys) {
          assert.ok(typeof dict[k] === 'string' && dict[k].length > 0, `${lang}.${k} missing`);
        }
      }
    } finally {
      globalThis.document = origDoc;
      globalThis.chrome = origChrome;
      globalThis.window = origWin;
    }
  });
});
