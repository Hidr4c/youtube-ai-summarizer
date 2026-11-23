import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamKeepalive } from '../src/background/StreamKeepalive.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { MessageRouter } from '../src/background/MessageRouter.js';
import { PortKeepaliveHelper } from '../src/content/services/PortKeepaliveHelper.js';
import { CloudModelDiscovery } from '../src/services/ai/providers/CloudModelDiscovery.js';
import { ChatStreamClient } from '../src/content/services/ChatStreamClient.js';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { PromptService } from '../src/content/services/PromptService.js';
import { escapeHtml } from '../src/content/ui/MarkdownRenderer.js';
import { I18N } from '../src/locales/index.js';

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createDomStub(initialIds = {}) {
  const elements = new Map();
  const makeEl = (id = '', overrides = {}) => {
    const classes = new Set();
    const listeners = {};
    let _innerHTML = '';
    return {
      id,
      value: '',
      textContent: '',
      title: '',
      disabled: false,
      open: false,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c)
      },
      addEventListener: (e, fn) => { (listeners[e] ||= []).push(fn); },
      _trigger: (e) => (listeners[e] || []).forEach((fn) => fn()),
      focus: () => {},
      get innerHTML() { return _innerHTML; },
      set innerHTML(v) { _innerHTML = String(v); },
      ...overrides
    };
  };

  for (const [id, extra] of Object.entries(initialIds)) {
    elements.set(id, makeEl(id, extra));
  }
  return { elements, makeEl };
}

function makeControlledPort() {
  const onMsg = [];
  const onDisc = [];
  const posted = [];
  let disconnected = false;
  return {
    posted,
    onMessage: { addListener: (fn) => onMsg.push(fn) },
    onDisconnect: { addListener: (fn) => onDisc.push(fn) },
    postMessage: (msg) => {
      if (disconnected) throw new Error('Port disconnected');
      posted.push(msg);
    },
    disconnect: () => {
      disconnected = true;
    },
    _emitMessage: (msg) => onMsg.forEach((fn) => fn(msg)),
    _triggerDisconnect: () => {
      disconnected = true;
      onDisc.forEach((fn) => fn());
    }
  };
}

describe('MV3 Stream Keepalive, Loopback Resilience & Interrupted State Handling', () => {
  it('StreamKeepalive emits heartbeat pings while waiting for model and flips waitingForModel on CHUNK', async () => {
    const origChrome = globalThis.chrome;
    let platformPings = 0;
    globalThis.chrome = {
      runtime: {
        getPlatformInfo: (cb) => {
          platformPings++;
          cb?.({ os: 'win' });
        }
      }
    };

    try {
      const posted = [];
      const handle = StreamKeepalive.start({
        postMessageSafe: (msg) => posted.push(msg),
        isAborted: () => false,
        intervalMs: 12
      });

      await waitMs(40);
      const waitingPings = posted.filter((m) => m.type === 'KEEPALIVE' && m.waitingForModel === true);
      assert.ok(waitingPings.length >= 2, 'Expected KEEPALIVE pings while waiting for first token');
      assert.ok(waitingPings.every((m) => m.elapsedSec >= 1));
      assert.ok(platformPings >= 2, 'Expected chrome.runtime.getPlatformInfo wakeups');

      handle.emit({ type: 'CHUNK', content: 'First token' });
      await waitMs(30);
      const postChunkPings = posted.filter((m) => m.type === 'KEEPALIVE' && m.waitingForModel === false);
      assert.ok(postChunkPings.length >= 1, 'Expected waitingForModel to flip false after CHUNK');

      handle.stop();
      const countAtStop = posted.length;
      await waitMs(30);
      assert.equal(posted.length, countAtStop, 'Keepalive timer must stop firing after stop()');
    } finally {
      globalThis.chrome = origChrome;
    }
  });

  it('StreamRelay.handleStream sustains heartbeats across slow local model load and clears timers cleanly', async () => {
    const origFetch = globalThis.fetch;
    const origChrome = globalThis.chrome;
    const encoder = new TextEncoder();
    let platformPings = 0;

    globalThis.chrome = {
      runtime: {
        getPlatformInfo: (cb) => {
          platformPings++;
          cb?.({});
        }
      },
      storage: { local: { set: () => {} } }
    };

    globalThis.fetch = async () => {
      await waitMs(45);
      let readOnce = false;
      const chunkBytes = encoder.encode('data: {"choices":[{"delta":{"content":"Summary ready"}}]}\n\ndata: [DONE]\n\n');
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => {
              if (!readOnce) {
                readOnce = true;
                return { done: false, value: chunkBytes };
              }
              return { done: true };
            },
            cancel: async () => {}
          })
        }
      };
    };

    try {
      const posted = [];
      const port = {
        onDisconnect: { addListener: () => {} },
        postMessage: (msg) => posted.push(msg)
      };

      await StreamRelay.handleStream({
        provider: 'lmstudio',
        serverUrl: 'http://localhost:1234',
        model: 'qwen/qwen3.8-27b',
        userPrompt: 'Summarize',
        heartbeatIntervalMs: 12
      }, port);

      const firstChunkIdx = posted.findIndex((m) => m.type === 'CHUNK');
      const keepalivesBeforeChunk = posted.slice(0, firstChunkIdx).filter((m) => m.type === 'KEEPALIVE');
      assert.ok(keepalivesBeforeChunk.length >= 2, 'Expected KEEPALIVE messages before slow model headers resolved');
      assert.ok(keepalivesBeforeChunk.every((m) => m.waitingForModel === true));
      assert.ok(platformPings >= 2);
      assert.ok(posted.some((m) => m.type === 'CHUNK' && m.content === 'Summary ready'));
      assert.ok(posted.some((m) => m.type === 'DONE'));

      const countAfterDone = posted.length;
      await waitMs(30);
      assert.equal(posted.length, countAfterDone, 'StreamRelay finally block must stop keepalive timer');
    } finally {
      globalThis.fetch = origFetch;
      globalThis.chrome = origChrome;
    }
  });

  it('StreamRelay.handleStream aborts in-flight fetch and stops keepalive when port disconnects', async () => {
    const origFetch = globalThis.fetch;
    let fetchAborted = false;

    globalThis.fetch = (_url, opts) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => {
        fetchAborted = true;
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

    try {
      const posted = [];
      const disconnectListeners = [];
      const port = {
        onDisconnect: { addListener: (fn) => disconnectListeners.push(fn) },
        postMessage: (msg) => posted.push(msg)
      };

      const runPromise = StreamRelay.handleStream({
        provider: 'lmstudio',
        serverUrl: 'http://127.0.0.1:1234',
        model: 'qwen/qwen3.8-27b',
        userPrompt: 'Test abort',
        heartbeatIntervalMs: 12
      }, port);

      await waitMs(30);
      disconnectListeners.forEach((fn) => fn());
      await runPromise;

      assert.equal(fetchAborted, true);
      assert.equal(posted.some((m) => m.type === 'ERROR'), false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('PortKeepaliveHelper posts KEEPALIVE, tolerates closed ports and formats escaped waiting HTML', async () => {
    const sent = [];
    const handle = PortKeepaliveHelper.attach({ postMessage: (m) => sent.push(m) }, 12);
    await waitMs(38);
    handle.stop();
    const countAfterStop = sent.length;
    await waitMs(25);

    assert.ok(countAfterStop >= 2);
    assert.ok(sent.every((m) => m.action === 'KEEPALIVE'));
    assert.equal(sent.length, countAfterStop);

    const throwingHandle = PortKeepaliveHelper.attach({
      postMessage: () => { throw new Error('Receiving end does not exist'); }
    }, 10);
    await waitMs(25);
    throwingHandle.stop();

    const safeNull = PortKeepaliveHelper.attach(null, 10);
    safeNull.stop();

    const html = PortKeepaliveHelper.renderWaitingHtml('Loading <model> & context (12s)...', escapeHtml);
    assert.match(html, /class="yt-ai-loading"/);
    assert.match(html, /&lt;model&gt; &amp; context \(12s\)\.\.\./);
  });

  it('CloudModelDiscovery.fetchWithModelFallback mirrors localhost <-> 127.0.0.1 on local network errors', async () => {
    const callsLocalhostFirst = [];
    const res1 = await CloudModelDiscovery.fetchWithModelFallback({
      endpoint: 'http://localhost:1234/v1/chat/completions',
      headers: {},
      payload: { model: 'qwen/qwen3.8-27b', messages: [] },
      provider: 'lmstudio',
      fetchFn: async (url) => {
        callsLocalhostFirst.push(url);
        if (url.includes('localhost')) throw new TypeError('Failed to fetch');
        return { ok: true, status: 200 };
      }
    });
    assert.equal(res1.response.ok, true);
    assert.deepEqual(callsLocalhostFirst, [
      'http://localhost:1234/v1/chat/completions',
      'http://127.0.0.1:1234/v1/chat/completions'
    ]);

    const callsIpFirst = [];
    const res2 = await CloudModelDiscovery.fetchWithModelFallback({
      endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
      headers: {},
      payload: { model: 'llama3', messages: [] },
      provider: 'ollama',
      fetchFn: async (url) => {
        callsIpFirst.push(url);
        if (url.includes('127.0.0.1')) throw new TypeError('Connection refused');
        return { ok: true, status: 200 };
      }
    });
    assert.equal(res2.response.ok, true);
    assert.deepEqual(callsIpFirst, [
      'http://127.0.0.1:11434/v1/chat/completions',
      'http://localhost:11434/v1/chat/completions'
    ]);

    const ac = new AbortController();
    ac.abort();
    const abortedUrls = [];
    await assert.rejects(() => CloudModelDiscovery.fetchWithModelFallback({
      endpoint: 'http://localhost:1234/v1/chat/completions',
      headers: {},
      payload: { model: 'qwen', messages: [] },
      signal: ac.signal,
      provider: 'lmstudio',
      fetchFn: async (url) => {
        abortedUrls.push(url);
        throw new DOMException('Aborted', 'AbortError');
      }
    }));
    assert.deepEqual(abortedUrls, ['http://localhost:1234/v1/chat/completions']);

    const cloudUrls = [];
    await assert.rejects(() => CloudModelDiscovery.fetchWithModelFallback({
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: {},
      payload: { model: 'gpt-4o', messages: [] },
      provider: 'openai',
      fetchFn: async (url) => {
        cloudUrls.push(url);
        throw new TypeError('Network error');
      }
    }));
    assert.deepEqual(cloudUrls, ['https://api.openai.com/v1/chat/completions']);
  });

  it('SummaryViewController renders waiting timer on KEEPALIVE and actionable error on unexpected disconnect', async () => {
    const origDoc = globalThis.document;
    const origChrome = globalThis.chrome;
    const origWin = globalThis.window;

    try {
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=keepaliveVid') };
      const { elements, makeEl } = createDomStub({
        ytAiLangSelect: { value: 'fr' },
        ytAiModeSelect: { value: 'standard' },
        ytAiSummaryBody: {},
        ytAiReasoningBox: {},
        ytAiReasoningText: {},
        ytAiReasoningStatus: {},
        ytAiSummarizeBtn: {},
        ytAiStopSummaryBtn: {},
        ytAiRetrySummarizeBtn: {}
      });

      const retryBtn = makeEl('ytAiRetrySummarizeBtn');
      elements.set('ytAiRetrySummarizeBtn', retryBtn);

      globalThis.document = {
        getElementById: (id) => elements.get(id) || null,
        querySelector: () => null,
        querySelectorAll: () => []
      };

      const port1 = makeControlledPort();
      const port2 = makeControlledPort();
      const ports = [port1, port2];
      globalThis.chrome = {
        runtime: {
          connect: () => ports.shift()
        }
      };

      const controller = new SummaryViewController({
        transcriptController: {
          cachedVideoMetadata: { videoId: 'keepaliveVid', title: 'Test', author: 'Creator', description: 'Desc' },
          cachedTranscript: { fullText: 'Transcript content with several words '.repeat(10) },
          extractYouTubeTranscript: async () => [{ text: 'Transcript content', start: 0 }]
        },
        promptService: new PromptService()
      });

      const banners = [];
      const ctx = {
        currentProvider: 'lmstudio',
        selectedModel: 'qwen/qwen3.8-27b',
        serverUrls: { lmstudio: 'http://localhost:1234' },
        apiKeys: {},
        showStatusBanner: (msg, isError) => banners.push({ msg, isError })
      };

      // Scenario A: KEEPALIVE updates spinner until CHUNK arrives, then DONE finishes cleanly
      await controller.startSummarization(ctx);
      const summaryBody = elements.get('ytAiSummaryBody');
      assert.match(summaryBody.innerHTML, /\(0s\)/);

      port1._emitMessage({ type: 'KEEPALIVE', waitingForModel: true, elapsedSec: 25 });
      assert.match(summaryBody.innerHTML, /\(25s\)/);

      port1._emitMessage({ type: 'CHUNK', content: '## Synthese\nContenu principal' });
      assert.match(summaryBody.innerHTML, /Synthese/);

      port1._emitMessage({ type: 'KEEPALIVE', waitingForModel: true, elapsedSec: 40 });
      assert.match(summaryBody.innerHTML, /Synthese/, 'Late KEEPALIVE must not overwrite streamed summary');

      port1._emitMessage({ type: 'DONE' });
      assert.equal(controller.isGenerating, false);

      // Scenario B: Unexpected Port disconnect while waiting -> renders streamInterrupted + Retry (never silent blank!)
      await controller.startSummarization(ctx);
      port2._triggerDisconnect();

      assert.equal(controller.isGenerating, false);
      assert.ok(summaryBody.innerHTML.includes('yt-ai-error-box'));
      assert.ok(summaryBody.innerHTML.includes('ytAiRetrySummarizeBtn'));
      assert.ok(summaryBody.innerHTML.includes(escapeHtml(I18N.fr.streamInterrupted)));
      assert.ok(banners.some((b) => b.isError === true && b.msg === I18N.fr.streamInterrupted));
    } finally {
      globalThis.document = origDoc;
      globalThis.chrome = origChrome;
      globalThis.window = origWin;
    }
  });

  it('ChatStreamClient surfaces premature disconnect as onError and preserves normal DONE completion', () => {
    const origChrome = globalThis.chrome;
    try {
      const portA = makeControlledPort();
      const portB = makeControlledPort();
      const portC = makeControlledPort();
      const ports = [portA, portB, portC];

      globalThis.chrome = {
        runtime: {
          connect: () => ports.shift()
        }
      };

      const client = new ChatStreamClient();

      // Case A: Unexpected premature disconnect before DONE
      const errA = [];
      let doneA = 0;
      client.startStream({
        provider: 'lmstudio',
        serverUrl: 'http://localhost:1234',
        model: 'qwen',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: () => {},
        onDone: () => { doneA++; },
        onError: (e) => errA.push(e)
      });
      portA._triggerDisconnect();
      assert.equal(doneA, 0);
      assert.deepEqual(errA, ['Connection interrupted before model response.']);

      // Case B: Normal DONE settles stream and completes cleanly via onDone
      const errB = [];
      let doneB = 0;
      const chunksB = [];
      client.startStream({
        provider: 'lmstudio',
        serverUrl: 'http://localhost:1234',
        model: 'qwen',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: (c) => chunksB.push(c),
        onDone: () => { doneB++; },
        onError: (e) => errB.push(e)
      });
      portB._emitMessage({ type: 'CHUNK', content: 'Hello ' });
      portB._emitMessage({ type: 'DONE' });
      assert.deepEqual(chunksB, ['Hello ']);
      assert.equal(doneB, 1);
      assert.deepEqual(errB, []);

      // Case C: Explicit client disconnect ignores late disconnect without error
      const errC = [];
      let doneC = 0;
      client.startStream({
        provider: 'lmstudio',
        serverUrl: 'http://localhost:1234',
        model: 'qwen',
        systemPrompt: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: () => {},
        onDone: () => { doneC++; },
        onError: (e) => errC.push(e)
      });
      client.disconnect();
      portC._triggerDisconnect();
      assert.equal(doneC, 0);
      assert.deepEqual(errC, []);
    } finally {
      globalThis.chrome = origChrome;
    }
  });

  it('MessageRouter ignores KEEPALIVE frames without re-triggering StreamRelay and I18N defines keepalive keys', () => {
    const origChrome = globalThis.chrome;
    const origHandleStream = StreamRelay.handleStream;
    let streamCalls = 0;

    try {
      const connectListeners = [];
      globalThis.chrome = {
        runtime: {
          onConnect: { addListener: (fn) => connectListeners.push(fn) },
          onMessage: { addListener: () => {} }
        }
      };

      StreamRelay.handleStream = async () => {
        streamCalls++;
      };

      MessageRouter.init();
      assert.equal(connectListeners.length, 1);

      const port = makeControlledPort();
      port.name = 'ai-stream';
      connectListeners[0](port);

      port._emitMessage({ action: 'KEEPALIVE' });
      port._emitMessage({ type: 'KEEPALIVE' });
      assert.equal(streamCalls, 0, 'KEEPALIVE messages must never spawn a new StreamRelay');

      port._emitMessage({ action: 'START_STREAM', provider: 'lmstudio', model: 'qwen' });
      assert.equal(streamCalls, 1, 'START_STREAM must invoke StreamRelay.handleStream once');

      for (const [lang, dict] of Object.entries(I18N)) {
        assert.ok(typeof dict.waitingForModel === 'string' && dict.waitingForModel.includes('{sec}'), `${lang}.waitingForModel missing {sec}`);
        assert.ok(typeof dict.streamInterrupted === 'string' && dict.streamInterrupted.length > 10, `${lang}.streamInterrupted missing`);
      }
    } finally {
      StreamRelay.handleStream = origHandleStream;
      globalThis.chrome = origChrome;
    }
  });
});
