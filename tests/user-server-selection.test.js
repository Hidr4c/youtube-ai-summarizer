import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { PromptService } from '../src/content/services/PromptService.js';

/**
 * Mock stream port simulating chrome.runtime.connect({ name: 'ai-stream' })
 */
class MockStreamPort {
  constructor(name = 'ai-stream') {
    this.name = name;
    this.postedMessages = [];
    this.messageListeners = [];
    this.disconnectListeners = [];
    this.onMessage = { addListener: (cb) => this.messageListeners.push(cb) };
    this.onDisconnect = { addListener: (cb) => this.disconnectListeners.push(cb) };
  }
  postMessage(msg) { this.postedMessages.push(msg); }
}

describe('User Server Selection & IP Propagation (LAN & Local)', () => {
  let port;
  let mockAudio;
  let mockTranscriptController;

  beforeEach(() => {
    port = null;
    global.chrome = {
      runtime: {
        connect: (opt) => {
          port = new MockStreamPort(opt?.name);
          return port;
        }
      }
    };

    mockAudio = {
      speakText: () => {},
      stopSpeech: () => {},
      stopDictation: () => {},
      stopAll: () => {}
    };

    mockTranscriptController = {
      cachedTranscript: {
        videoId: 'V1',
        segments: [{ timestamp: '0:00', text: 'Quantum physics intro.' }],
        fullText: 'Quantum physics intro.'
      },
      cachedVideoMetadata: {
        videoId: 'V1',
        title: 'Quantum 101',
        author: 'Dr. Q',
        description: 'About quantum.'
      },
      extractYouTubeTranscript: async () => mockTranscriptController.cachedTranscript.segments,
      requestPlayerDataFromMainWorld: async () => ({})
    };

    // Minimal DOM elements required by SummaryViewController
    global.document = {
      getElementById: (id) => {
        return {
          id,
          value: '',
          classList: { add: () => {}, remove: () => {}, contains: () => false },
          appendChild: () => {},
          textContent: '',
          innerHTML: ''
        };
      }
    };
  });

  it('SummaryViewController propagates custom LAN LM Studio IP from state.serverUrls', async () => {
    // Arrange
    const promptService = new PromptService();
    const controller = new SummaryViewController({
      transcriptController: mockTranscriptController,
      promptService,
      audioController: mockAudio
    });

    const userChosenIp = 'http://192.168.1.182:1234';
    const state = {
      currentProvider: 'lmstudio',
      serverUrls: { lmstudio: userChosenIp },
      apiKeys: {},
      getActiveModel: () => 'deepseek-r1-7b'
    };

    // Act
    await controller.startSummarization({
      state,
      currentLang: 'fr',
      currentProvider: state.currentProvider,
      serverUrls: state.serverUrls,
      apiKeys: state.apiKeys,
      getActiveModel: () => 'deepseek-r1-7b',
      getVideoMetadata: () => mockTranscriptController.cachedVideoMetadata
    });

    // Assert
    assert.ok(port, 'Stream port must be connected');
    assert.equal(port.postedMessages.length, 1);
    const payload = port.postedMessages[0];
    assert.equal(payload.action, 'START_STREAM');
    assert.equal(payload.provider, 'lmstudio');
    assert.equal(payload.serverUrl, userChosenIp, 'User-selected LAN IP must be passed to stream relay');
  });

  it('SummaryViewController propagates custom LAN Ollama IP from stateObj even when ctx lacks serverUrls', async () => {
    // Arrange
    const promptService = new PromptService();
    const controller = new SummaryViewController({
      transcriptController: mockTranscriptController,
      promptService,
      audioController: mockAudio
    });

    const ollamaLanIp = 'http://192.168.1.200:11434';
    const state = {
      currentProvider: 'ollama',
      serverUrls: { ollama: ollamaLanIp },
      apiKeys: {},
      getActiveModel: () => 'llama3.2:latest'
    };

    // Act: simulating index.js invoking startSummarization({ state, ... }) without top-level serverUrls
    await controller.startSummarization({
      state,
      currentLang: 'en',
      getActiveModel: () => 'llama3.2:latest',
      getVideoMetadata: () => mockTranscriptController.cachedVideoMetadata
    });

    // Assert
    assert.ok(port, 'Stream port must be connected');
    const payload = port.postedMessages[0];
    assert.equal(payload.provider, 'ollama');
    assert.equal(payload.serverUrl, ollamaLanIp, 'Ollama LAN IP must be resolved from state object');
  });

  it('StreamRelay.streamOpenAICompatible routes requests directly to the user-selected LM Studio URL', async () => {
    // Arrange
    let requestedEndpoint = null;
    let requestHeaders = null;
    const userChosenIp = 'http://192.168.1.182:1234';

    global.fetch = async (endpoint, options) => {
      requestedEndpoint = endpoint;
      requestHeaders = options.headers;
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined })
          })
        }
      };
    };

    const mockPort = new MockStreamPort();

    // Act
    await StreamRelay.streamOpenAICompatible(
      mockPort,
      'lmstudio',
      userChosenIp,
      '',
      'deepseek-r1-7b',
      [{ role: 'user', content: 'hello' }],
      0.3,
      'auto'
    );

    // Assert: Endpoint must hit user IP and not default loopback
    assert.equal(
      requestedEndpoint,
      'http://192.168.1.182:1234/v1/chat/completions',
      'Outgoing fetch must strictly target user-specified serverUrl'
    );
  });

  it('StreamRelay.streamOpenAICompatible normalizes custom IP without protocol', async () => {
    // Arrange
    let requestedEndpoint = null;
    const rawIpNoScheme = '192.168.1.182:1234/';

    global.fetch = async (endpoint) => {
      requestedEndpoint = endpoint;
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined })
          })
        }
      };
    };

    const mockPort = new MockStreamPort();

    // Act
    await StreamRelay.streamOpenAICompatible(
      mockPort,
      'lmstudio',
      rawIpNoScheme,
      '',
      'deepseek-r1-7b',
      [{ role: 'user', content: 'test' }],
      0.3,
      'auto'
    );

    // Assert
    assert.equal(
      requestedEndpoint,
      'http://192.168.1.182:1234/v1/chat/completions',
      'Protocol must be automatically added and trailing slashes stripped'
    );
  });

  it('StreamRelay.streamOpenAICompatible defaults to 127.0.0.1:1234 when user serverUrl is empty', async () => {
    // Arrange
    let requestedEndpoint = null;

    global.fetch = async (endpoint) => {
      requestedEndpoint = endpoint;
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined })
          })
        }
      };
    };

    const mockPort = new MockStreamPort();

    // Act
    await StreamRelay.streamOpenAICompatible(
      mockPort,
      'lmstudio',
      '',
      '',
      'deepseek-r1-7b',
      [{ role: 'user', content: 'test' }],
      0.3,
      'auto'
    );

    // Assert: Must fallback strictly to generic loopback 127.0.0.1
    assert.equal(
      requestedEndpoint,
      'http://127.0.0.1:1234/v1/chat/completions',
      'Empty serverUrl must fallback strictly to 127.0.0.1 and NEVER to a hardcoded host IP'
    );
  });
});
