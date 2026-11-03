import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { ChatViewController } from '../src/content/ui/ChatViewController.js';
import { InPageTranscriptController } from '../src/content/services/InPageTranscriptController.js';
import { PromptService } from '../src/content/services/PromptService.js';
import { I18N } from '../src/locales/index.js';

/**
 * Mock stream port simulating chrome.runtime.connect({ name: 'ai-stream' })
 */
class MockStreamPort {
  constructor(name = 'ai-stream') {
    this.name = name;
    this.postedMessages = [];
    this.messageListeners = [];
    this.disconnectListeners = [];
    this.disconnected = false;

    this.onMessage = {
      addListener: (cb) => { this.messageListeners.push(cb); }
    };
    this.onDisconnect = {
      addListener: (cb) => { this.disconnectListeners.push(cb); }
    };
  }

  postMessage(msg) {
    this.postedMessages.push(msg);
  }

  disconnect() {
    if (this.disconnected) return;
    this.disconnected = true;
  }

  simulateRemoteDisconnect() {
    if (this.disconnected) return;
    this.disconnected = true;
    this.disconnectListeners.forEach(cb => cb());
  }

  emit(msg) {
    this.messageListeners.forEach(cb => cb(msg));
  }

  emitChunk(content, reasoning = null) {
    this.emit({ type: 'CHUNK', content, reasoning });
  }

  emitDone() {
    this.emit({ type: 'DONE' });
  }

  emitError(error) {
    this.emit({ type: 'ERROR', error });
  }
}

/**
 * Lightweight mock DOM environment for end-to-end BDD scenarios
 */
function setupMockDom(url = 'https://www.youtube.com/watch?v=TEST_VID_BDD', lang = 'en') {
  const elements = new Map();

  function createElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      value: '',
      title: '',
      open: false,
      disabled: false,
      children: [],
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(' '); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(' '); },
        contains(c) { return this.classes.has(c); }
      },
      appendChild(child) {
        if (!child) return child;
        child.parentNode = el;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
      remove() {
        if (el.parentNode) el.parentNode.removeChild(el);
      },
      querySelector(sel) {
        if (sel.startsWith('.')) {
          const cls = sel.slice(1);
          const findIn = (node) => {
            for (const child of node.children) {
              if (child.className?.includes(cls)) return child;
              const res = findIn(child);
              if (res) return res;
            }
            return null;
          };
          return findIn(this);
        }
        return null;
      },
      addEventListener(evt, fn) {
        if (!el._listeners) el._listeners = {};
        if (!el._listeners[evt]) el._listeners[evt] = [];
        el._listeners[evt].push(fn);
      },
      dispatchEvent(evt) {
        const type = typeof evt === 'string' ? evt : evt.type;
        const listeners = el._listeners?.[type] || [];
        listeners.forEach(fn => fn(evt));
      },
      click() {
        this.dispatchEvent({ type: 'click', currentTarget: el, target: el });
      }
    };
    return el;
  }

  const ids = [
    'ytAiSummaryBody', 'ytAiReasoningBox', 'ytAiReasoningText', 'ytAiReasoningStatus',
    'ytAiSummarizeBtn', 'ytAiSummaryHeroBtn', 'ytAiChatMessages', 'ytAiChatInput',
    'ytAiChatCount', 'ytAiWordCount', 'ytAiWordCountTab', 'ytAiTranscriptBody',
    'ytAiSpeakSummaryBtn', 'ytAiSendChatBtn', 'ytAiClearChatBtn', 'ytAiMicBtn'
  ];

  ids.forEach(id => {
    const el = createElement(id.includes('Btn') ? 'button' : 'div');
    el.id = id;
    elements.set(id, el);
  });

  const langSelect = createElement('select');
  langSelect.id = 'ytAiLangSelect';
  langSelect.value = lang;
  elements.set('ytAiLangSelect', langSelect);

  const modeSelect = createElement('select');
  modeSelect.id = 'ytAiModeSelect';
  modeSelect.value = 'standard';
  elements.set('ytAiModeSelect', modeSelect);

  global.document = {
    getElementById: (id) => elements.get(id) || null,
    createElement: (tag) => createElement(tag),
    querySelectorAll: () => []
  };

  const parsedUrl = new URL(url);
  global.window = {
    location: {
      href: url,
      origin: parsedUrl.origin,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    postMessage: () => {}
  };

  return { elements, createElement };
}

describe('BDD End-to-End User Journeys: AI Summary, Interactive Chat, and SPA Navigation', () => {
  const promptServiceInstance = new PromptService();

  it('Scenario 1: Given video with subtitles, When user requests summary, Then stream renders reasoning and markdown, and enables audio TTS', async () => {
    const dom = setupMockDom('https://www.youtube.com/watch?v=VID_SUM_1', 'fr');
    let port = null;
    global.chrome = {
      runtime: {
        connect: (opt) => {
          port = new MockStreamPort(opt?.name);
          return port;
        }
      }
    };

    let spokenText = '';
    const mockAudio = {
      speakText: (text) => { spokenText = text; },
      stopSpeech: () => {},
      stopDictation: () => {},
      stopAll: () => {}
    };

    const mockTranscriptController = {
      cachedTranscript: {
        videoId: 'VID_SUM_1',
        segments: [
          { timestamp: '0:00', text: 'Intro to quantum physics.' },
          { timestamp: '1:00', text: 'Qubits exist in superposition.' }
        ],
        fullText: 'Intro to quantum physics. Qubits exist in superposition.'
      },
      cachedVideoMetadata: {
        videoId: 'VID_SUM_1',
        title: 'Quantum Physics 101',
        author: 'Dr. Quantum',
        description: 'Comprehensive guide to quantum computing.'
      },
      extractYouTubeTranscript: async () => mockTranscriptController.cachedTranscript.segments,
      requestPlayerDataFromMainWorld: async () => ({})
    };

    const summaryController = new SummaryViewController({
      transcriptController: mockTranscriptController,
      promptService: promptServiceInstance,
      audioController: mockAudio
    });

    // Given: empty state rendered with hero button
    summaryController.renderSummaryEmptyState(false, 'fr', () => summaryController.startSummarization({
      currentLang: 'fr',
      currentProvider: 'lmstudio',
      getActiveModel: () => 'deepseek-r1-7b'
    }));

    const heroBtn = dom.elements.get('ytAiSummaryHeroBtn');
    assert.ok(heroBtn, 'Hero summarize button must be rendered in empty state');

    // When: user clicks Hero button to trigger summarization
    await summaryController.startSummarization({
      currentLang: 'fr',
      currentProvider: 'lmstudio',
      getActiveModel: () => 'deepseek-r1-7b',
      getVideoMetadata: () => mockTranscriptController.cachedVideoMetadata
    });

    // Then: AI stream port connects and request payload is validated
    assert.ok(port, 'AI stream port must be opened');
    assert.equal(port.postedMessages[0].action, 'START_STREAM');
    assert.equal(port.postedMessages[0].provider, 'lmstudio');
    assert.equal(port.postedMessages[0].model, 'deepseek-r1-7b');
    assert.equal(summaryController.isGenerating, true, 'Generating state must be active');

    // When: AI stream relays reasoning chunks
    port.emitChunk('', 'Analyse des principes quantiques...');
    const reasoningBox = dom.elements.get('ytAiReasoningBox');
    const reasoningText = dom.elements.get('ytAiReasoningText');
    assert.equal(reasoningBox.classList.contains('yt-ai-hidden'), false, 'Reasoning container must be visible');
    assert.equal(reasoningText.textContent, 'Analyse des principes quantiques...');

    // When: AI stream relays markdown content chunks followed by DONE
    port.emitChunk('### ⚡ En Bref\nLes qubits utilisent la superposition.\n\n- **Superposition** : États multiples.');
    port.emitDone();

    // Then: Markdown is rendered to HTML, button restored, and speech ready
    const summaryBody = dom.elements.get('ytAiSummaryBody');
    assert.ok(summaryBody.innerHTML.includes('En Bref'), 'Summary must contain rendered heading');
    assert.ok(summaryBody.innerHTML.includes('Superposition'), 'Summary must contain rendered bullet points');
    assert.equal(summaryController.isGenerating, false, 'Generating state must be reset to false');
    assert.equal(port.disconnected, true, 'Stream port must be disconnected upon completion');

    // And: User can read summary via audio TTS
    mockAudio.speakText(summaryController.fullSummaryMarkdown);
    assert.ok(spokenText.includes('superposition'), 'Audio TTS must receive full generated summary text');
  });

  it('Scenario 2: Given extracted transcript, When user sends chat question or chip, Then input clears, stream replies, badge increments, and TTS attaches', async () => {
    const dom = setupMockDom('https://www.youtube.com/watch?v=VID_CHAT_1', 'fr');
    let port = null;
    global.chrome = {
      runtime: {
        connect: (opt) => {
          port = new MockStreamPort(opt?.name);
          return port;
        }
      }
    };

    let spokenAnswer = '';
    const mockAudio = {
      speakText: (text) => { spokenAnswer = text; },
      stopSpeech: () => {},
      stopDictation: () => {},
      stopAll: () => {}
    };

    const mockTranscriptController = {
      cachedTranscript: {
        videoId: 'VID_CHAT_1',
        segments: [{ text: 'Qubits operate at absolute zero temperature.' }],
        fullText: 'Qubits operate at absolute zero temperature.'
      },
      cachedVideoMetadata: {
        videoId: 'VID_CHAT_1',
        title: 'Quantum Temperature',
        description: 'Why do quantum computers need cooling?'
      },
      requestPlayerDataFromMainWorld: async () => ({})
    };

    const chatController = new ChatViewController({
      transcriptController: mockTranscriptController,
      promptService: promptServiceInstance,
      audioController: mockAudio
    });

    // Given: user types a question in the input field
    const inputEl = dom.elements.get('ytAiChatInput');
    inputEl.value = 'Pourquoi faut-il refroidir les qubits ?';

    // When: user sends message
    await chatController.handleSendChatMessage(null, {
      currentLang: 'fr',
      currentProvider: 'openai',
      apiKeys: { openai: 'sk-mock-key-1234' },
      getActiveModel: () => 'gpt-4o'
    });

    // Then: input is unconditionally cleared immediately
    assert.equal(inputEl.value, '', 'Input field must be cleared immediately upon sending');

    // And: user question bubble is rendered in chat container
    const messages = dom.elements.get('ytAiChatMessages');
    assert.ok(messages.children.length >= 2, 'Must contain user bubble and assistant bubble');
    assert.ok(messages.children[0].innerHTML.includes('Pourquoi faut-il refroidir les qubits ?'));

    // When: AI streams answer chunks and completes with DONE
    port.emitChunk('Les qubits nécessitent un froid extrême ');
    port.emitChunk('pour éviter la décohérence quantique.');
    port.emitDone();

    // Then: conversation history updated, turns badge incremented to 1
    assert.equal(chatController.chatHistory.length, 2);
    assert.equal(chatController.chatHistory[0].content, 'Pourquoi faut-il refroidir les qubits ?');
    assert.ok(chatController.chatHistory[1].content.includes('décohérence quantique'));
    assert.equal(dom.elements.get('ytAiChatCount').textContent, '1', 'Badge must increment to 1 turn');

    // And: TTS button is attached to the assistant bubble
    const aiBubble = messages.children[1];
    const ttsBtn = aiBubble.querySelector('.yt-ai-tts-btn');
    assert.ok(ttsBtn, 'TTS listen button must be attached to the AI response bubble');

    // When: User clicks quick suggestion chip
    await chatController.handleSendChatMessage('Résume les 3 points clés', {
      currentLang: 'fr',
      currentProvider: 'openai',
      apiKeys: { openai: 'sk-mock-key-1234' },
      getActiveModel: () => 'gpt-4o'
    });

    port.emitChunk('1. Froid 2. Superposition 3. Intrication');
    port.emitDone();

    // Then: conversation turns badge increments to 2
    assert.equal(dom.elements.get('ytAiChatCount').textContent, '2', 'Badge must increment to 2 turns');
    assert.equal(chatController.chatHistory.length, 4, 'History must contain 4 messages (2 user, 2 ai)');
  });

  it('Scenario 3: Given ongoing session on Video A, When SPA navigates to Video B, Then cache and UI are purged, and new video context is isolated', async () => {
    const dom = setupMockDom('https://www.youtube.com/watch?v=VID_ALPHA', 'fr');
    let audioStopped = false;

    const mockAudio = {
      stopAll: () => { audioStopped = true; },
      stopSpeech: () => {},
      stopDictation: () => {}
    };

    const transcriptController = new InPageTranscriptController();
    transcriptController.saveCachedTranscript('VID_ALPHA', [{ timestamp: '0:00', text: 'Video A content' }], false);
    transcriptController.cachedVideoMetadata = { videoId: 'VID_ALPHA', title: 'Video A', description: 'Desc A' };
    transcriptController.requestPlayerDataFromMainWorld = async () => ({});

    const summaryController = new SummaryViewController({
      transcriptController,
      promptService: promptServiceInstance,
      audioController: mockAudio
    });
    summaryController.fullSummaryMarkdown = 'Summary of Video A';

    const chatController = new ChatViewController({
      transcriptController,
      promptService: promptServiceInstance,
      audioController: mockAudio
    });
    chatController.chatHistory = [{ role: 'user', content: 'Q1' }, { role: 'assistant', content: 'A1' }];
    dom.elements.get('ytAiChatCount').textContent = '1';

    // When: SPA navigates to Video B
    const newUrl = 'https://www.youtube.com/watch?v=VID_BETA';
    const parsedNewUrl = new URL(newUrl);
    global.window.location = {
      href: newUrl,
      origin: parsedNewUrl.origin,
      pathname: parsedNewUrl.pathname,
      search: parsedNewUrl.search
    };

    // Execute SPA navigation reset cycle (identical to src/content/index.js)
    mockAudio.stopAll();
    transcriptController.resetAllState('fr');
    summaryController.resetSummaryOutput('fr');
    chatController.resetChatOutput('fr');

    // Then: All state on Video A is thoroughly purged
    assert.equal(audioStopped, true, 'Speech and dictation must be stopped');
    assert.equal(transcriptController.cachedTranscript.videoId, '', 'Cached transcript videoId must be reset');
    assert.equal(transcriptController.cachedTranscript.segments.length, 0, 'Segments must be emptied');
    assert.equal(dom.elements.get('ytAiWordCount').textContent, '0', 'Word count badge must reset to 0');
    assert.equal(summaryController.fullSummaryMarkdown, '', 'Summary markdown must be cleared');
    assert.equal(chatController.chatHistory.length, 0, 'Chat history must be cleared');
    assert.equal(dom.elements.get('ytAiChatCount').textContent, '0', 'Chat turns badge must reset to 0');

    // And: Summary body displays new video empty state
    const summaryBody = dom.elements.get('ytAiSummaryBody');
    assert.ok(summaryBody.innerHTML.includes('yt-ai-hero-btn'), 'New video empty state with hero button must be rendered');

    // When: User asks question on Video B without manual summary
    let newVideoExtracted = false;
    transcriptController.extractYouTubeTranscript = async () => {
      newVideoExtracted = true;
      transcriptController.saveCachedTranscript('VID_BETA', [{ timestamp: '0:00', text: 'Video B content' }], false);
      transcriptController.cachedVideoMetadata = { videoId: 'VID_BETA', title: 'Video B', description: 'Desc B' };
      return transcriptController.cachedTranscript.segments;
    };

    let chatPort = null;
    global.chrome.runtime.connect = () => {
      chatPort = new MockStreamPort();
      return chatPort;
    };

    await chatController.handleSendChatMessage('Explain Video B', {
      currentLang: 'fr',
      currentProvider: 'lmstudio',
      getActiveModel: () => 'local-model'
    });

    assert.equal(newVideoExtracted, true, 'Chat must automatically extract transcript for Video B');
    assert.ok(chatPort, 'Chat stream must be connected for Video B');
  });

  it('Scenario 4: Given an active request, When AI stream emits error, Then error message renders safely without crashing and UI buttons restore', async () => {
    const dom = setupMockDom('https://www.youtube.com/watch?v=VID_ERR_1', 'en');
    let port = null;
    global.chrome = {
      runtime: {
        connect: () => {
          port = new MockStreamPort();
          return port;
        }
      }
    };

    const mockTranscriptController = {
      cachedTranscript: { videoId: 'VID_ERR_1', segments: [{ text: 'Text' }], fullText: 'Text' },
      cachedVideoMetadata: { videoId: 'VID_ERR_1', title: 'Error Test', description: 'Desc' },
      extractYouTubeTranscript: async () => [{ text: 'Text' }],
      requestPlayerDataFromMainWorld: async () => ({})
    };

    const summaryController = new SummaryViewController({
      transcriptController: mockTranscriptController,
      promptService: promptServiceInstance
    });

    let bannerStatus = null;
    await summaryController.startSummarization({
      currentLang: 'en',
      currentProvider: 'lmstudio',
      getActiveModel: () => 'failing-model',
      showStatusBanner: (msg, isErr) => { bannerStatus = { msg, isErr }; }
    });

    assert.equal(summaryController.isGenerating, true);

    // When: Port emits AI provider error
    port.emitError('Server overloaded (503 Service Unavailable)');

    // Then: UI reflects error gracefully
    assert.equal(summaryController.isGenerating, false, 'Generation state must be reset to false');
    assert.equal(dom.elements.get('ytAiSummarizeBtn').disabled, false, 'Summarize button must be re-enabled');
    const summaryBody = dom.elements.get('ytAiSummaryBody');
    assert.ok(summaryBody.innerHTML.includes('503 Service Unavailable'), 'Error message must be displayed to user');
    assert.equal(bannerStatus?.isErr, true, 'Status banner must be notified of error');
  });

  it('Scenario 5: Given DOM transcript is unavailable, When extractYouTubeTranscript runs, Then controller cascades through available strategies', async () => {
    const dom = setupMockDom('https://www.youtube.com/watch?v=VID_STRAT_1', 'fr');
    const controller = new InPageTranscriptController();

    // Strategy 2 fallback simulation (Main World player data with 16 segments)
    controller.requestPlayerDataFromMainWorld = async (vid) => {
      const segs = [];
      for (let i = 0; i < 16; i++) {
        segs.push({ timestamp: `0:${i < 10 ? '0' + i : i}`, text: `Transcript segment ${i} for video explanation.` });
      }
      return { videoId: vid, segments: segs };
    };

    const segments = await controller.extractYouTubeTranscript('fr', false);
    assert.ok(segments && segments.length >= 16, 'Must successfully extract transcript via cascading strategy');
    assert.equal(controller.cachedTranscript.videoId, 'VID_STRAT_1');
    assert.ok(parseInt(dom.elements.get('ytAiWordCount').textContent, 10) > 0, 'Word count must be populated');
    assert.ok(dom.elements.get('ytAiTranscriptBody').innerHTML.includes('yt-ai-timestamp-link'), 'Transcript tab must contain clickable timestamp links');
  });

  it('Scenario 6: Given multi-language selection, When empty states and suggestions are rendered, Then correct locale strings are applied', () => {
    const dom = setupMockDom('https://www.youtube.com/watch?v=VID_LANG_1', 'es');
    const summaryController = new SummaryViewController();

    // Test Spanish empty state
    summaryController.renderSummaryEmptyState(false, 'es');
    const summaryBody = dom.elements.get('ytAiSummaryBody');
    assert.ok(summaryBody.innerHTML.includes(I18N.es.emptyTitle), 'Must render Spanish title');
    assert.ok(summaryBody.innerHTML.includes(I18N.es.summarizeBtn), 'Must render Spanish button label');

    // Test German empty state
    summaryController.renderSummaryEmptyState(true, 'de');
    assert.ok(summaryBody.innerHTML.includes(I18N.de.newVideoTitle), 'Must render German new video title');

    // Verify prompt suggestions exist across all 8 supported languages
    ['fr', 'en', 'es', 'de', 'ja', 'zh', 'ru', 'it'].forEach(lang => {
      assert.ok(I18N[lang]?.suggestions?.length >= 4, `Language ${lang} must provide at least 4 prompt suggestions`);
    });
  });
});
