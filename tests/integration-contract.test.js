import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';
import { ChannelAuditViewController } from '../src/content/ui/ChannelAuditViewController.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { MessageRouter } from '../src/background/MessageRouter.js';

function createMockElement(tag = 'div', id = '') {
  const classes = new Set();
  const children = [];
  const attrs = new Map();
  return {
    tagName: tag.toUpperCase(),
    id,
    className: '',
    children,
    parentNode: null,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => attrs.get(k) || null,
    appendChild: (c) => { c.parentNode = this; children.push(c); return c; },
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

describe('Integration Contract Gates - Preventing Silent Regressions', () => {
  it('ChannelCompanionCard contract with REAL ChannelAuditViewController', async () => {
    // Arrange: Use REAL ChannelAuditViewController instance, NOT a handcrafted mock
    const realViewController = new ChannelAuditViewController();
    let renderCalled = false;
    const originalRender = realViewController.renderReport.bind(realViewController);
    realViewController.renderReport = (report, container, lang) => {
      renderCalled = true;
      return originalRender(report, container, lang);
    };

    const mockService = {
      executeChannelAudit: async () => ({
        globalScore: 85,
        proportions: { reliablePct: 70, cautionPct: 20, clickbaitPct: 10 },
        trajectory: 'improving',
        strengths: ['Bonne rigueur'],
        weaknesses: ['Quelques raccourcis'],
        drawbacks: [],
        evaluatedVideos: []
      })
    };

    // DOM Setup
    const container = createMockElement('div', 'ytAiChannelResultContainer');
    const progBox = createMockElement('div', 'ytAiChannelProgress');
    const runBtn = createMockElement('button', 'ytAiRunChannelAuditBtn');
    const prevDoc = global.document;
    global.document = {
      getElementById: (id) => {
        if (id === 'ytAiChannelResultContainer') return container;
        if (id === 'ytAiChannelProgress') return progBox;
        if (id === 'ytAiRunChannelAuditBtn') return runBtn;
        return null;
      },
      createElement: (tag) => createMockElement(tag)
    };

    try {
      const card = new ChannelCompanionCard({
        channelAuditService: mockService,
        channelAuditViewController: realViewController,
        state: { currentLang: 'fr' }
      });

      // Act
      await card.handleRunAudit();

      // Assert: Must invoke real view controller without throwing
      assert.equal(renderCalled, true, 'Real ChannelAuditViewController render must be called successfully');
      assert.equal(typeof realViewController.renderChannelReport, 'function', 'renderChannelReport alias must exist on real controller');
    } finally {
      global.document = prevDoc;
    }
  });

  it('Port name contract: ChannelAuditService connects to a port supported by MessageRouter', () => {
    // Inspect MessageRouter source code or runtime definition
    // Supported ports in MessageRouter: ai-stream, ai_stream, lm-studio-stream, YT_AI_STREAM
    const acceptedPorts = ['ai-stream', 'ai_stream', 'lm-studio-stream', 'YT_AI_STREAM'];

    // Verify ChannelAuditService uses one of the officially supported port names
    let connectedPortName = null;
    const prevChrome = global.chrome;
    global.chrome = {
      runtime: {
        connect: ({ name }) => {
          connectedPortName = name;
          return {
            onMessage: { addListener: () => {} },
            onDisconnect: { addListener: () => {} },
            postMessage: () => {}
          };
        }
      }
    };

    try {
      const service = new ChannelAuditService();
      // Invoke private _streamAI setup
      service._streamAI({ systemPrompt: 'sys', userPrompt: 'usr', state: {} });
      assert.ok(acceptedPorts.includes(connectedPortName), `Port "${connectedPortName}" must be accepted by MessageRouter`);
    } finally {
      global.chrome = prevChrome;
    }
  });

  it('Cold-start protection: StreamRelay auto-resolves model from /v1/models when model is empty', async () => {
    let capturedBody = null;
    const prevFetch = global.fetch;

    global.fetch = async (url, options) => {
      if (url.endsWith('/v1/models')) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: 'qwen/qwen3.5-9b' }] })
        };
      }
      if (url.endsWith('/v1/chat/completions')) {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          body: {
            getReader: () => ({
              read: async () => ({ done: true, value: undefined })
            })
          }
        };
      }
      return { ok: false };
    };

    try {
      const mockPort = { postMessage: () => {} };
      // Act: pass empty model ''
      await StreamRelay.streamOpenAICompatible(
        mockPort,
        'lmstudio',
        'http://localhost:1234',
        '',
        '', // Empty model!
        [{ role: 'user', content: 'test' }],
        0.3,
        'auto'
      );

      // Assert: Model must NOT be empty string
      assert.equal(capturedBody.model, 'qwen/qwen3.5-9b', 'Must auto-detect model from /v1/models instead of sending empty string');
    } finally {
      global.fetch = prevFetch;
    }
  });
});
