import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_MODELS,
  PROVIDER_CONFIGS,
  resolveDeprecatedModel
} from '../src/config/AIProviderPresets.js';
import { CloudModelDiscovery, CLOUD_MODELS_ENDPOINTS } from '../src/services/ai/providers/CloudModelDiscovery.js';
import { AIProviderFactory } from '../src/services/ai/providers/AIProviderFactory.js';
import { GeminiProvider } from '../src/services/ai/providers/GeminiProvider.js';
import { GroqProvider } from '../src/services/ai/providers/GroqProvider.js';
import { ClaudeProvider } from '../src/services/ai/providers/ClaudeProvider.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { LocalModelDiscovery } from '../src/content/services/LocalModelDiscovery.js';
import { ConnectionTester } from '../src/content/services/ConnectionTester.js';
import { SettingsDrawerController } from '../src/content/ui/SettingsDrawerController.js';
import { QuickOnboardingHelper } from '../src/content/services/QuickOnboardingHelper.js';
import { BannerView } from '../src/content/ui/BannerView.js';
import { createInPageState, loadPreferences } from '../src/content/services/InPageState.js';
import { SettingsDrawerEventHandler } from '../src/content/ui/SettingsDrawerEventHandler.js';

function makeJsonResponse(status, payload, statusText = 'OK') {
  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async json() { return typeof payload === 'string' ? JSON.parse(payload) : payload; },
    async text() { return bodyStr; }
  };
}

function makeSseResponse(events) {
  const encoder = new TextEncoder();
  const payload = events.map(e => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');
  let sent = false;
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: {
      getReader() {
        return {
          async read() {
            if (sent) return { done: true, value: undefined };
            sent = true;
            return { done: false, value: encoder.encode(payload) };
          },
          async cancel() {}
        };
      }
    }
  };
}

describe('Cloud Model Discovery, Alias Normalization & 404 Self-Healing', () => {
  const originalFetch = globalThis.fetch;
  const originalChrome = globalThis.chrome;
  const originalDocument = globalThis.document;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.chrome = originalChrome;
    globalThis.document = originalDocument;
  });

  it('normalizes retired Gemini, Groq, and OpenRouter model IDs to active equivalents', () => {
    assert.equal(PROVIDER_CONFIGS.gemini.defaultModel, 'gemini-flash-latest');
    assert.equal(PROVIDER_CONFIGS.groq.defaultModel, 'openai/gpt-oss-120b');

    assert.equal(resolveDeprecatedModel('gemini', 'gemini-1.5-flash'), 'gemini-flash-latest');
    assert.equal(resolveDeprecatedModel('gemini', 'models/gemini-1.5-pro'), 'gemini-pro-latest');
    assert.equal(resolveDeprecatedModel('gemini', 'gemini-2.0-flash'), 'gemini-flash-latest');
    assert.equal(resolveDeprecatedModel('gemini', 'gemini-2.0-flash-lite'), 'gemini-3.5-flash-lite');
    assert.equal(resolveDeprecatedModel('groq', 'llama-3.3-70b-versatile'), 'openai/gpt-oss-120b');
    assert.equal(resolveDeprecatedModel('groq', 'llama-3.1-8b-instant'), 'openai/gpt-oss-20b');
    assert.equal(resolveDeprecatedModel('gemini', 'gemini-3.8-flash'), 'gemini-3.8-flash');
  });

  it('fetches, filters non-chat models, and ranks live Gemini OpenAI-compatible models with AQ key', async () => {
    let seenAuth = '';
    const mockFetch = async (url, opts) => {
      seenAuth = opts?.headers?.Authorization || '';
      assert.ok(url.includes('/v1beta/openai/models'));
      return makeJsonResponse(200, {
        data: [
          { id: 'models/gemini-embedding-001' },
          { id: 'models/veo-2.0-generate-001' },
          { id: 'models/gemini-pro-latest', displayName: 'Gemini Pro Latest' },
          { id: 'models/gemini-flash-latest' },
          { id: 'models/gemini-3.8-flash' }
        ]
      });
    };

    const models = await CloudModelDiscovery.fetchLiveModels('gemini', 'AQ.mock-gemini-key', mockFetch);
    assert.equal(seenAuth, 'Bearer AQ.mock-gemini-key');
    assert.equal(models[0].id, 'gemini-flash-latest');
    assert.ok(models.some(m => m.id === 'gemini-3.8-flash'));
    assert.ok(models.some(m => m.id === 'gemini-pro-latest'));
    assert.ok(!models.some(m => m.id.includes('embedding')));
    assert.ok(!models.some(m => m.id.includes('veo')));
  });

  it('falls back to native Gemini /v1beta/models with x-goog-api-key and filters generateContent', async () => {
    const calls = [];
    const mockFetch = async (url, opts) => {
      calls.push({ url, headers: opts.headers });
      if (url.includes('/v1beta/openai/models')) {
        return makeJsonResponse(404, { error: { message: 'openai models endpoint unavailable' } });
      }
      return makeJsonResponse(200, {
        models: [
          { name: 'models/gemini-1.5-flash-001', supportedGenerationMethods: ['countTokens'] },
          { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-3.5-flash-lite', displayName: 'Gemini 3.5 Flash-Lite', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] }
        ]
      });
    };

    const models = await CloudModelDiscovery.fetchLiveModels('gemini', 'AQ.mock-native-key', mockFetch);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].headers['x-goog-api-key'], 'AQ.mock-native-key');
    assert.deepEqual(models.map(m => m.id), ['gemini-flash-latest', 'gemini-3.5-flash-lite']);
  });

  it('falls back gracefully to presets when offline or key missing', async () => {
    const noKey = await CloudModelDiscovery.fetchLiveModels('gemini', '', async () => {
      throw new Error('Should not call fetch without key');
    });
    assert.deepEqual(noKey, CLOUD_MODELS.gemini);

    const netErr = await CloudModelDiscovery.fetchLiveModels('groq', 'gsk_mock', async () => {
      throw new Error('Network unreachable');
    });
    assert.deepEqual(netErr, CLOUD_MODELS.groq);
  });

  it('recognizes retired model errors and formats actionable HTTP errors', () => {
    const gErr = JSON.stringify({
      error: {
        code: 404,
        message: 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.',
        status: 'NOT_FOUND'
      }
    });
    assert.equal(CloudModelDiscovery.isRetiredModelError(404, gErr), true);
    assert.equal(CloudModelDiscovery.isRetiredModelError(400, 'Model is decommissioned'), true);
    assert.equal(CloudModelDiscovery.isRetiredModelError(401, 'Unauthorized'), false);

    assert.match(CloudModelDiscovery.formatHttpError('gemini', 401, '{"error":{"message":"API key not valid"}}'), /Clé API refusée/);
    assert.match(CloudModelDiscovery.formatHttpError('gemini', 429, '{"error":{"message":"RESOURCE_EXHAUSTED"}}'), /Quota \/ limite atteinte/);
    assert.match(CloudModelDiscovery.formatHttpError('gemini', 404, gErr), /Modèle introuvable ou retiré/);
  });

  it('recovers automatically during GeminiProvider.testConnection and GroqProvider.testConnection', async () => {
    const attempted = [];
    globalThis.fetch = async (url, opts) => {
      if (url.endsWith('/v1beta/openai/models')) {
        return makeJsonResponse(200, {
          data: [{ id: 'gemini-3.8-flash' }, { id: 'gemini-pro-latest' }]
        });
      }
      const body = JSON.parse(opts.body);
      attempted.push(body.model);
      if (body.model === 'gemini-future-shut-down') {
        return makeJsonResponse(404, {
          error: { code: 404, message: 'models/gemini-future-shut-down is not found for API version v1beta', status: 'NOT_FOUND' }
        });
      }
      return makeJsonResponse(200, { choices: [{ message: { content: 'pong' } }] });
    };

    const gemini = new GeminiProvider();
    const res1 = await gemini.testConnection('', 'AQ.test-key', 'gemini-1.5-flash');
    assert.equal(res1.ok, true);
    assert.equal(res1.resolvedModel, 'gemini-flash-latest');
    assert.equal(attempted[0], 'gemini-flash-latest');

    const res2 = await gemini.testConnection('', 'AQ.test-key', 'gemini-future-shut-down');
    assert.equal(res2.ok, true);
    assert.equal(res2.resolvedModel, 'gemini-3.8-flash');

    globalThis.fetch = async () => makeJsonResponse(429, { error: { message: 'rate limit exceeded' } });
    const groq = new GroqProvider();
    const res3 = await groq.testConnection('', 'gsk_test', 'openai/gpt-oss-120b');
    assert.equal(res3.ok, false);
    assert.match(res3.error, /Quota \/ limite atteinte sur GROQ/);
  });

  it('auto-heals 404 retired models inside StreamRelay and emits MODEL_RESOLVED + SSE chunks', async () => {
    const posted = [];
    const requests = [];
    globalThis.fetch = async (url, opts) => {
      requests.push(url);
      if (url.endsWith('/v1beta/openai/models')) {
        return makeJsonResponse(200, {
          data: [{ id: 'gemini-flash-latest' }]
        });
      }
      const body = JSON.parse(opts.body);
      if (body.model === 'gemini-retired-custom') {
        return makeJsonResponse(404, {
          error: {
            code: 404,
            message: 'models/gemini-retired-custom is not found for API version v1beta, or is not supported for generateContent.',
            status: 'NOT_FOUND'
          }
        });
      }
      return makeSseResponse([
        { choices: [{ delta: { content: 'Bonjour ' } }] },
        { choices: [{ delta: { content: 'monde!' } }] },
        '[DONE]'
      ]);
    };

    await StreamRelay.streamOpenAICompatible(
      { postMessage: (m) => posted.push(m) },
      'gemini',
      '',
      'AQ.mock-stream-key',
      'gemini-retired-custom',
      [{ role: 'user', content: 'Salut' }],
      0.3,
      'auto',
      null,
      (m) => posted.push(m)
    );

    assert.ok(posted.some(m => m.type === 'MODEL_RESOLVED' && m.model === 'gemini-flash-latest'));
    const fullText = posted.filter(m => m.type === 'CHUNK').map(m => m.text).join('');
    assert.equal(fullText, 'Bonjour monde!');
    assert.ok(requests.some(u => u.includes('/v1beta/openai/models')));
  });

  it('formats Claude HTTP errors cleanly and streams Claude deltas via shared SSE loop', async () => {
    globalThis.fetch = async () => makeJsonResponse(401, { error: { message: 'invalid x-api-key' } });
    const claude = new ClaudeProvider();
    const failed = await claude.testConnection('', 'sk-ant-bad', 'claude-3-5-haiku-20241022');
    assert.equal(failed.ok, false);
    assert.match(failed.error, /Erreur CLAUDE \(401\)/);

    const posted = [];
    globalThis.fetch = async () => makeSseResponse([
      { type: 'message_start' },
      { type: 'content_block_delta', delta: { text: 'Claude ' } },
      { type: 'content_block_delta', delta: { text: 'OK' } }
    ]);
    await StreamRelay.streamClaude(
      { postMessage: (m) => posted.push(m) },
      'sk-ant-valid',
      'claude-3-5-haiku-20241022',
      'Sys',
      [{ role: 'user', content: 'Hi' }],
      0.2,
      1024,
      null,
      (m) => posted.push(m)
    );
    assert.equal(posted.map(m => m.text).join(''), 'Claude OK');
  });

  it('normalizes stale saved model in SettingsDrawerController and refreshes live cloud list', () => {
    const options = [];
    const selectMock = {
      options,
      _value: '',
      set innerHTML(_v) { options.length = 0; },
      appendChild(opt) { options.push(opt); },
      get value() { return this._value; },
      set value(v) { this._value = v; }
    };

    globalThis.document = {
      getElementById: (id) => (id === 'ytAiModelSelect' ? selectMock : null),
      createElement: () => ({ value: '', textContent: '' })
    };
    globalThis.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (req, cb) => {
          if (req.action === 'FETCH_MODELS' && req.provider === 'gemini') {
            cb({
              success: true,
              models: [
                { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash' },
                { id: 'gemini-flash-latest', name: 'gemini-flash-latest' }
              ]
            });
          }
        }
      }
    };

    let activeModel = 'gemini-1.5-flash';
    const savedPrefs = {};
    const state = {
      currentProvider: 'gemini',
      apiKeys: { gemini: 'AQ.mock-ui-key' },
      getActiveModel: () => activeModel,
      setActiveModel: (m) => { activeModel = m; },
      savePreference: (k, v) => { savedPrefs[k] = v; }
    };

    const ctrl = new SettingsDrawerController(state);
    ctrl.populateCloudModels('gemini');

    assert.equal(activeModel, 'gemini-flash-latest');
    assert.equal(savedPrefs.selectedModel_gemini, 'gemini-flash-latest');
    assert.equal(selectMock.value, 'gemini-flash-latest');
    assert.ok(options.some(o => o.value === 'gemini-3.8-flash'));

    // Also validate ConnectionTester resolvedModel formatting
    globalThis.chrome.runtime.sendMessage = (_req, cb) => {
      cb({ success: true, latency: 42, resolvedModel: 'gemini-flash-latest' });
    };
    let banner = null;
    ConnectionTester.testModelConnection({
      provider: 'gemini', apiKey: 'AQ.mock-ui-key', model: 'gemini-1.5-flash', lang: 'fr'
    }, (res) => { banner = res; });
    assert.equal(banner.isError, false);
    assert.equal(banner.resolvedModel, 'gemini-flash-latest');
    assert.ok(banner.message.includes('gemini-flash-latest'));
  });

  it('unwraps Google array-wrapped 503 error payloads and fails over automatically to alternate Flash models', async () => {
    const arrayWrapped503 = JSON.stringify([
      {
        error: {
          code: 503,
          message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',
          status: 'UNAVAILABLE'
        }
      }
    ]);
    assert.equal(CloudModelDiscovery.isTransientOverloadError(503, arrayWrapped503), true);
    assert.equal(CloudModelDiscovery.classifyHttpError(503, arrayWrapped503), 'busy');
    const formatted = CloudModelDiscovery.formatHttpError('gemini', 503, arrayWrapped503);
    assert.match(formatted, /Serveur GEMINI temporairement saturé \(503/);
    assert.ok(!formatted.includes('[{"error"'), 'Formatted error must unwrap JSON array cleanly');
    assert.ok(formatted.includes('This model is currently experiencing high demand'));

    const attemptedModels = [];
    const posted = [];
    globalThis.fetch = async (url, opts) => {
      if (url.endsWith('/v1beta/openai/models')) {
        return makeJsonResponse(200, {
          data: [
            { id: 'gemini-flash-latest' },
            { id: 'gemini-3.5-flash-lite' }
          ]
        });
      }
      const body = JSON.parse(opts.body);
      attemptedModels.push(body.model);
      if (body.model === 'gemini-flash-latest') {
        return makeJsonResponse(503, arrayWrapped503);
      }
      return makeSseResponse([
        { choices: [{ delta: { content: 'Failover OK!' } }] },
        '[DONE]'
      ]);
    };

    await StreamRelay.streamOpenAICompatible(
      { postMessage: (m) => posted.push(m) },
      'gemini',
      '',
      'AQ.mock-overload-key',
      'gemini-flash-latest',
      [{ role: 'user', content: 'Test' }],
      0.3,
      'auto',
      null,
      (m) => posted.push(m)
    );

    assert.deepEqual(attemptedModels, ['gemini-flash-latest', 'gemini-3.5-flash-lite']);
    assert.ok(posted.some(m => m.type === 'MODEL_RESOLVED' && m.model === 'gemini-3.5-flash-lite'));
    assert.equal(posted.filter(m => m.type === 'CHUNK').map(m => m.text).join(''), 'Failover OK!');
  });

  it('distinguishes 503 busy errors from invalid-key auth errors on header badge and Tester action', () => {
    const badgeEl = { className: '' };
    const badgeTextEl = { textContent: '' };
    globalThis.document = {
      getElementById: (id) => {
        if (id === 'ytAiBadge') return badgeEl;
        if (id === 'ytAiBadgeText') return badgeTextEl;
        return null;
      }
    };

    const state = {
      currentProvider: 'gemini',
      currentLang: 'fr',
      apiKeys: { gemini: 'AQ.valid-key' },
      keyVerified: {},
      serverUrls: {},
      getActiveModel: () => 'gemini-flash-latest',
      setActiveModel: () => {},
      savePreference: () => {}
    };

    // Simulate 503 busy response through ConnectionTester + SettingsDrawerController.handleTestConnection
    globalThis.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (_req, cb) => {
          cb({
            success: false,
            errorKind: 'busy',
            error: 'Serveur GEMINI temporairement saturé (503 — forte demande).'
          });
        }
      }
    };

    const bannerView = new BannerView(state);
    const ctrl = new SettingsDrawerController(state, { bannerView });
    ctrl.handleTestConnection();

    assert.equal(state.keyVerified.gemini, 'busy');
    assert.ok(!badgeTextEl.textContent.includes('Clé invalide'), '503 busy error must never claim key is invalid');
    assert.match(badgeTextEl.textContent, /Serveur saturé/);

    // Verify 401 auth failure still sets keyVerified = false ('Clé invalide')
    globalThis.chrome.runtime.sendMessage = (_req, cb) => {
      cb({ success: false, errorKind: 'auth', error: 'Erreur GEMINI (401) : Clé API refusée ou invalide.' });
    };
    ctrl.handleTestConnection();
    assert.equal(state.keyVerified.gemini, false);
    assert.match(badgeTextEl.textContent, /Clé invalide/);

    // QuickOnboardingHelper.applyVerificationState direct parity
    QuickOnboardingHelper.applyVerificationState(state, 'gemini', 'gemini-flash-latest', { isError: false });
    assert.equal(state.keyVerified.gemini, true);
  });

  it('persists API keys, models, and verification flags for all cloud providers in InPageState', () => {
    const stored = {
      aiProvider: 'openrouter',
      apiKey_openrouter: 'sk-or-v1-mock',
      selectedModel_openrouter: 'deepseek/deepseek-r1',
      keyVerified_openrouter: true,
      apiKey_mistral: 'mis-mock',
      keyVerified_gemini: 'busy'
    };
    globalThis.chrome = {
      storage: {
        local: {
          get: (_keys, cb) => cb(stored),
          set: () => {}
        }
      }
    };

    const state = createInPageState();
    assert.ok('openrouter' in state.apiKeys && 'mistral' in state.apiKeys && 'qwen' in state.apiKeys);
    assert.equal(state.getActiveModel(), '', 'Local provider with no saved model must stay empty');

    let done = false;
    loadPreferences(state, () => { done = true; });
    assert.equal(done, true);
    assert.equal(state.currentProvider, 'openrouter');
    assert.equal(state.apiKeys.openrouter, 'sk-or-v1-mock');
    assert.equal(state.apiKeys.mistral, 'mis-mock');
    assert.equal(state.getActiveModel(), 'deepseek/deepseek-r1');
    assert.equal(state.keyVerified.openrouter, true);
    assert.equal(state.keyVerified.gemini, 'busy');

    state.currentProvider = 'gemini';
    assert.equal(state.getActiveModel(), PROVIDER_CONFIGS.gemini.defaultModel);
  });

  it('tries native Gemini x-goog-api-key even on OpenAI endpoint 401, filters image/robotics, and coalesces in-flight calls', async () => {
    let nativeCalls = 0;
    globalThis.fetch = async (url, opts) => {
      if (url.includes('/v1beta/openai/models')) {
        return makeJsonResponse(401, { error: { message: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' } });
      }
      nativeCalls++;
      assert.equal(opts.headers['x-goog-api-key'], 'AQ.concurrent-key');
      return makeJsonResponse(200, {
        models: [
          { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-robotics-er-1.5-preview', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] }
        ]
      });
    };

    const [a, b] = await Promise.all([
      CloudModelDiscovery.fetchLiveModels('gemini', 'AQ.concurrent-key'),
      CloudModelDiscovery.fetchLiveModels('gemini', 'AQ.concurrent-key')
    ]);
    assert.equal(nativeCalls, 1, 'Concurrent identical requests must coalesce into a single native call');
    assert.deepEqual(a.map(m => m.id), ['gemini-3.5-flash-lite']);
    assert.deepEqual(b, a);
  });

  it('drops stale async cloud model responses on rapid switch and syncs Channel Page header & visibility toggle', () => {
    const callbacks = [];
    const options = [];
    const headerModelEl = { textContent: '' };
    const badgeEl = { className: '' };
    const badgeTextEl = { textContent: '' };
    const keyInputEl = {
      type: 'password',
      value: '',
      listeners: {},
      addEventListener(ev, fn) { this.listeners[ev] = fn; }
    };
    const eyeBtnEl = {
      textContent: '👁',
      listeners: {},
      addEventListener(ev, fn) { this.listeners[ev] = fn; }
    };
    const selectMock = {
      options,
      _value: '',
      listeners: {},
      addEventListener(ev, fn) { this.listeners[ev] = fn; },
      set innerHTML(_v) { options.length = 0; },
      appendChild(opt) { options.push(opt); },
      get value() { return this._value; },
      set value(v) { this._value = v; }
    };

    const byId = {
      ytAiModelSelect: selectMock,
      ytAiHeaderModelText: headerModelEl,
      ytAiBadge: badgeEl,
      ytAiBadgeText: badgeTextEl,
      ytAiApiKeyInput: keyInputEl,
      ytAiToggleKeyVisBtn: eyeBtnEl
    };
    globalThis.document = {
      activeElement: null,
      getElementById: (id) => byId[id] || null,
      createElement: () => ({ value: '', textContent: '' })
    };
    globalThis.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (req, cb) => {
          if (req.action === 'FETCH_MODELS') callbacks.push({ req, cb });
        }
      },
      storage: { local: { set: () => {} } }
    };

    const state = createInPageState();
    state.currentProvider = 'gemini';
    state.apiKeys.gemini = 'AQ.old-key';
    const bannerView = new BannerView(state);
    const ctrl = new SettingsDrawerController(state, { bannerView });

    // Trigger fetch 1 for gemini + old key, then rapidly change key before callback 1 resolves
    ctrl.populateCloudModels('gemini');
    assert.match(headerModelEl.textContent, /gemini-flash-latest/);

    state.apiKeys.gemini = 'AQ.new-key';
    ctrl.populateCloudModels('gemini');
    assert.equal(callbacks.length, 2);

    // Resolve stale callback #1 -> MUST be ignored
    callbacks[0].cb({ success: true, models: [{ id: 'stale-model', name: 'stale-model' }] });
    assert.ok(!options.some(o => o.value === 'stale-model'), 'Stale async model list must not overwrite UI');

    // Resolve current callback #2 -> MUST apply cleanly
    callbacks[1].cb({ success: true, models: [{ id: 'gemini-3.8-flash', name: 'gemini-3.8-flash' }] });
    assert.ok(options.some(o => o.value === 'gemini-3.8-flash'));

    // Channel Companion mode (bannerView = null) still updates badge & header model + key visibility toggle works
    const rootMock = {
      querySelector: (sel) => {
        if (sel === '#ytAiApiKeyInput') return keyInputEl;
        if (sel === '#ytAiToggleKeyVisBtn') return eyeBtnEl;
        if (sel === '#ytAiModelSelect') return selectMock;
        return null;
      },
      querySelectorAll: () => []
    };
    SettingsDrawerEventHandler.bind(rootMock, ctrl, state, null);

    eyeBtnEl.listeners.click({ currentTarget: eyeBtnEl });
    assert.equal(keyInputEl.type, 'text');
    assert.equal(eyeBtnEl.textContent, '🙈');

    selectMock.listeners.change({ target: { value: 'gemini-3.8-flash' } });
    assert.match(headerModelEl.textContent, /gemini-3\.8-flash/);

    // MODEL_RESOLVED sync updates state, dropdown, and header pill immediately
    QuickOnboardingHelper.syncResolvedModel(state, 'gemini', 'gemini-flash-latest');
    assert.equal(state.getActiveModel(), 'gemini-flash-latest');
    assert.match(headerModelEl.textContent, /gemini-flash-latest/);
  });

  it('supports live /models discovery, filtering, and smart ranking across ALL 11 Cloud providers', async () => {
    const allCloud = ['gemini', 'groq', 'openai', 'claude', 'deepseek', 'grok', 'qwen', 'mistral', 'openrouter', 'perplexity', 'together'];
    for (const p of allCloud) {
      assert.ok(CLOUD_MODELS_ENDPOINTS[p], `CLOUD_MODELS_ENDPOINTS must define "${p}"`);
      const inst = AIProviderFactory.getProvider(p);
      assert.equal(inst.isLocal(), false);
      assert.ok(inst.getDisplayName().length > 0);
    }

    // 1. OpenAI: filters non-chat & ranks presets before legacy models
    const openaiList = await CloudModelDiscovery.fetchLiveModels('openai', 'sk-openai', async (url) => {
      assert.equal(url, CLOUD_MODELS_ENDPOINTS.openai);
      return makeJsonResponse(200, {
        data: [
          { id: 'babbage-002' },
          { id: 'dall-e-3' },
          { id: 'gpt-image-1' },
          { id: 'text-embedding-3-large' },
          { id: 'gpt-4.1-mini' },
          { id: 'gpt-4o-mini' }
        ]
      });
    });
    assert.equal(openaiList[0].id, 'gpt-4o-mini');
    assert.ok(openaiList.some(m => m.id === 'gpt-4.1-mini'));
    assert.ok(!openaiList.some(m => /babbage|dall-e|image|embed/.test(m.id)));

    // 2. Mistral: excludes capabilities.completion_chat === false
    const mistralList = await CloudModelDiscovery.fetchLiveModels('mistral', 'mis-key', async () => makeJsonResponse(200, {
      data: [
        { id: 'mistral-embed', capabilities: { completion_chat: false } },
        { id: 'mistral-large-2411', capabilities: { completion_chat: true } },
        { id: 'mistral-small-latest', capabilities: { completion_chat: true } }
      ]
    }));
    assert.deepEqual(mistralList.map(m => m.id), ['mistral-small-latest', 'mistral-large-2411']);

    // 3. OpenRouter: filters image modalities, tags zero-price free models, sends HTTP-Referer
    const orList = await CloudModelDiscovery.fetchLiveModels('openrouter', 'sk-or', async (_url, opts) => {
      assert.equal(opts.headers['HTTP-Referer'], 'https://youtube.com');
      return makeJsonResponse(200, {
        data: [
          { id: 'black-forest/flux-pro', architecture: { modality: 'text->image' } },
          { id: 'qwen/qwen3-8b:free', name: 'Qwen 3 8B', pricing: { prompt: '0', completion: '0' }, architecture: { modality: 'text->text' } },
          { id: 'meta/zero-price', name: 'Meta Chat', pricing: { prompt: '0', completion: '0' }, architecture: { modality: 'text->text' } },
          { id: 'deepseek/deepseek-r1', architecture: { modality: 'text->text' } }
        ]
      });
    });
    assert.equal(orList[0].id, 'deepseek/deepseek-r1');
    assert.ok(orList.some(m => m.id === 'meta/zero-price' && m.name.includes('(Free)')));
    assert.ok(!orList.some(m => m.name.includes('(Free) (Free)')));
    assert.ok(!orList.some(m => m.id.includes('flux')));

    // 4. Together AI: supports raw top-level JSON array + excludes image type
    const togetherList = await CloudModelDiscovery.fetchLiveModels('together', 'tog-key', async () => makeJsonResponse(200, [
      { id: 'black-forest-labs/FLUX.1-schnell', type: 'image' },
      { id: 'Qwen/Qwen3-Coder', type: 'chat', display_name: 'Qwen3 Coder' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', type: 'chat' }
    ]));
    assert.equal(togetherList[0].id, 'meta-llama/Llama-3.3-70B-Instruct-Turbo');
    assert.ok(togetherList.some(m => m.id === 'Qwen/Qwen3-Coder' && m.name.includes('Qwen3 Coder')));
    assert.ok(!togetherList.some(m => m.id.includes('FLUX')));

    // 5. Qwen DashScope + Grok + DeepSeek live endpoints via AIProviderFactory
    globalThis.fetch = async (url) => {
      if (url === CLOUD_MODELS_ENDPOINTS.qwen) {
        return makeJsonResponse(200, { data: [{ id: 'wanx-v1' }, { id: 'qwen-plus' }, { id: 'qwen3-max' }] });
      }
      if (url === CLOUD_MODELS_ENDPOINTS.grok) {
        return makeJsonResponse(200, { data: [{ id: 'grok-3-mini' }, { id: 'grok-2-latest' }] });
      }
      return makeJsonResponse(404, {});
    };
    const qwenModels = await AIProviderFactory.getProvider('qwen').fetchModels('', 'qwen-key');
    assert.equal(qwenModels[0].id, 'qwen-plus');
    assert.ok(qwenModels.some(m => m.id === 'qwen3-max'));
    assert.ok(!qwenModels.some(m => m.id.includes('wanx')));

    const grokModels = await AIProviderFactory.getProvider('grok').fetchModels('', 'grok-key');
    assert.equal(grokModels[0].id, 'grok-2-latest');
    assert.ok(grokModels.some(m => m.id === 'grok-3-mini'));
  });

  it('recovers automatically on Claude 529 overloaded / 404 retired models in testConnection and StreamRelay', async () => {
    globalThis.fetch = async (url, opts) => {
      if (url === CLOUD_MODELS_ENDPOINTS.claude) {
        return makeJsonResponse(200, {
          data: [
            { type: 'model', id: 'claude-sonnet-4-5', display_name: 'Claude Sonnet 4.5' },
            { type: 'model', id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku' }
          ]
        });
      }
      const body = JSON.parse(opts.body);
      if (body.model === 'claude-3-5-haiku-20241022') {
        return makeJsonResponse(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } });
      }
      if (body.stream) {
        return makeSseResponse([
          { type: 'content_block_delta', delta: { text: 'Claude failover works!' } }
        ]);
      }
      return makeJsonResponse(200, { content: [{ text: 'pong' }] });
    };

    const claude = new ClaudeProvider();
    const ping = await claude.testConnection('', 'sk-ant-valid', 'claude-3-5-haiku-20241022');
    assert.equal(ping.ok, true);
    assert.equal(ping.resolvedModel, 'claude-sonnet-4-5');

    const posted = [];
    await StreamRelay.streamClaude(
      { postMessage: (m) => posted.push(m) },
      'sk-ant-valid',
      'claude-3-5-haiku-20241022',
      'Sys',
      [{ role: 'user', content: 'Hi' }],
      0.2,
      512,
      null,
      (m) => posted.push(m)
    );
    assert.ok(posted.some(m => m.type === 'MODEL_RESOLVED' && m.provider === 'claude' && m.model === 'claude-sonnet-4-5'));
    assert.equal(posted.filter(m => m.type === 'CHUNK').map(m => m.text).join(''), 'Claude failover works!');
  });
});
