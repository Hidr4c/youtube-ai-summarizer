import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { LocalModelDiscovery } from '../src/content/services/LocalModelDiscovery.js';

function makeSseResponse(lines, status = 200) {
  const encoder = new TextEncoder();
  const payload = encoder.encode(lines.join('\n') + '\n');
  let consumed = false;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'ERR',
    text: async () => 'Upstream error body',
    body: {
      getReader: () => ({
        read: async () => {
          if (!consumed) {
            consumed = true;
            return { done: false, value: payload };
          }
          return { done: true };
        },
        cancel: async () => {}
      })
    }
  };
}

describe('StreamRelay & LocalModelDiscovery Branch Coverage', () => {
  it('covers StreamRelay OpenAI/OpenRouter/LMStudio auto-discovery, Claude streaming & errors', async () => {
    const origFetch = globalThis.fetch;
    try {
      // 1. handleStream prepends systemPrompt & auto-discovers non-embed model on lmstudio
      const posted = [];
      let capturedReqBody = null;
      globalThis.fetch = async (url, opts) => {
        if (url.endsWith('/v1/models')) {
          return {
            ok: true,
            json: async () => ({ data: [{ id: 'text-embedding-ada' }, { id: 'qwen2.5-7b' }] })
          };
        }
        capturedReqBody = JSON.parse(opts.body);
        return makeSseResponse([
          ': keepalive',
          'data: {"choices":[{"delta":{"reasoning_content":"think","content":"Hi "}}]}',
          'data: {broken json}',
          'data: [DONE]'
        ]);
      };

      const port = {
        onDisconnect: { addListener: () => {} },
        postMessage: (m) => posted.push(m)
      };
      await StreamRelay.handleStream({
        provider: 'lmstudio',
        serverUrl: '127.0.0.1:1234/',
        model: 'loading...',
        systemPrompt: 'Sys',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: '512'
      }, port);

      assert.equal(capturedReqBody.model, 'qwen2.5-7b');
      assert.equal(capturedReqBody.max_tokens, 512);
      assert.equal(capturedReqBody.messages[0].role, 'system');
      assert.ok(posted.some(m => m.type === 'CHUNK' && m.content === 'Hi ' && m.reasoning === 'think'));
      assert.ok(posted.some(m => m.type === 'DONE'));

      // 2. Claude SSE stream + context error formatting
      const claudePosted = [];
      globalThis.fetch = async () => makeSseResponse([
        ': ping',
        'data: {"type":"content_block_delta","delta":{"text":"Claude ok"}}',
        'data: {bad}'
      ]);
      await StreamRelay.handleStream({
        provider: 'claude',
        apiKey: 'sk-ant',
        model: '',
        messages: [{ role: 'system', content: 'Sys' }, { role: 'user', content: 'Q' }]
      }, { onDisconnect: { addListener: () => {} }, postMessage: (m) => claudePosted.push(m) });
      assert.ok(claudePosted.some(m => m.type === 'CHUNK' && m.content === 'Claude ok'));

      // 3. Claude missing key / unsupported provider / HTTP 400 error caught as ERROR post
      const errMsgs = [];
      await StreamRelay.handleStream({ provider: 'claude', apiKey: '' }, { postMessage: (m) => errMsgs.push(m) });
      await StreamRelay.handleStream({ provider: 'unknown_prov' }, { postMessage: (m) => errMsgs.push(m) });
      await StreamRelay.handleStream({ provider: 'openrouter', apiKey: 'k', model: 'gpt' }, {
        postMessage: () => { throw new Error('Port closed'); }
      });

      globalThis.fetch = async () => makeSseResponse([], 400);
      await StreamRelay.handleStream({ provider: 'groq', apiKey: 'k', model: 'llama' }, {
        postMessage: (m) => errMsgs.push(m)
      });
      await StreamRelay.handleStream({ provider: 'claude', apiKey: 'k', model: 'c' }, {
        postMessage: (m) => errMsgs.push(m)
      });
      assert.ok(errMsgs.filter(m => m.type === 'ERROR').length >= 4);

      assert.match(StreamRelay.formatContextError('exceeded num_ctx', 'ollama'), /Ollama/);
      assert.match(StreamRelay.formatContextError('maximum context length', 'openai'), /fenêtre/);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('covers LocalModelDiscovery refresh, response shapes, fallback exhaustion & select population', () => {
    const origChrome = globalThis.chrome;
    const origDoc = globalThis.document;
    try {
      LocalModelDiscovery.refreshModelsList({ currentProvider: 'openai', serverUrls: {} });

      // Test all 4 payload shapes + failure fallback
      const responses = [
        { success: true, data: { data: [{ id: 'm1' }] } },
        { ok: true, data: { models: [{ id: 'm2' }] } },
        { ok: true, data: [{ id: 'm3' }] },
        { ok: true, models: [{ id: 'm4' }] },
        { success: false }
      ];
      const loaded = [];
      let fallbackCalls = 0;
      let idx = 0;
      globalThis.chrome = {
        runtime: {
          lastError: null,
          sendMessage: (msg, cb) => cb(responses[idx++])
        }
      };

      const ctx = { currentProvider: 'ollama', serverUrls: {} };
      for (let i = 0; i < 5; i++) {
        LocalModelDiscovery.refreshModelsList(ctx, false, (m) => loaded.push(m[0].id), () => { fallbackCalls++; });
      }
      assert.deepEqual(loaded, ['m1', 'm2', 'm3', 'm4']);
      assert.equal(fallbackCalls, 1);

      // Fallback chain: first fails, second succeeds; then all fail -> onExhausted
      let step = 0;
      globalThis.chrome = {
        runtime: {
          sendMessage: (msg, cb) => {
            step++;
            if (step === 1) return cb({ ok: true, data: { models: [{ name: 'ol-1' }] } });
            return cb({ ok: false });
          }
        }
      };
      let hitUrl = '';
      LocalModelDiscovery.tryFallbackUrls({ currentProvider: 'ollama', serverUrls: {} }, [], (u) => { hitUrl = u; });
      assert.equal(hitUrl, 'http://127.0.0.1:11434');

      let exhausted = false;
      LocalModelDiscovery.tryFallbackUrls({ currentProvider: 'lmstudio', serverUrls: {} }, [], null, () => { exhausted = true; });
      assert.equal(exhausted, true);

      // populateModelSelect edge cases
      assert.equal(LocalModelDiscovery.populateModelSelect(null, [], 'lmstudio', ''), '');
      globalThis.document = {
        createElement: () => ({ value: '', textContent: '', selected: false })
      };
      const mkSelect = () => {
        const opts = [];
        return {
          options: opts,
          selectedIndex: -1,
          get firstChild() { return opts[0] || null; },
          get value() { return (opts.find(o => o.selected) || opts[this.selectedIndex] || { value: '' }).value; },
          set innerHTML(_) { opts.length = 0; },
          appendChild: (o) => opts.push(o),
          insertBefore: (o) => opts.unshift(o)
        };
      };

      const s1 = mkSelect();
      assert.equal(LocalModelDiscovery.populateModelSelect(s1, [], 'ollama', 'saved-m', 'fr'), 'saved-m');
      const s2 = mkSelect();
      assert.equal(LocalModelDiscovery.populateModelSelect(s2, [], 'lmstudio', '', 'xx'), '');
      const s3 = mkSelect();
      const sel3 = LocalModelDiscovery.populateModelSelect(
        s3,
        [{ id: 'text-embed-model' }, { id: 'qwen-14b' }],
        'lmstudio',
        'missing-saved',
        'en'
      );
      assert.equal(sel3, 'missing-saved');
      const s4 = mkSelect();
      const sel4 = LocalModelDiscovery.populateModelSelect(s4, [{ name: 'llama3' }], 'ollama', 'llama3', 'en');
      assert.equal(sel4, 'llama3');
      const s5 = mkSelect();
      const sel5 = LocalModelDiscovery.populateModelSelect(s5, [{ model: 'auto-first' }], 'lmstudio', '', 'en');
      assert.equal(sel5, 'auto-first');
    } finally {
      globalThis.chrome = origChrome;
      globalThis.document = origDoc;
    }
  });
});
