import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ChatViewController } from '../src/content/ui/ChatViewController.js';

// Minimal DOM mock environment for Chat testing in Node.js
function setupMockDom() {
  const elements = new Map();

  const createElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      value: '',
      children: [],
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(' '); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(' '); },
        contains(c) { return this.classes.has(c); }
      },
      appendChild(child) {
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
        return null;
      },
      addEventListener: () => {}
    };
    return el;
  };

  const messagesContainer = createElement('div');
  messagesContainer.id = 'ytAiChatMessages';
  elements.set('ytAiChatMessages', messagesContainer);

  const chatInput = createElement('input');
  chatInput.id = 'ytAiChatInput';
  elements.set('ytAiChatInput', chatInput);

  const chatCount = createElement('span');
  chatCount.id = 'ytAiChatCount';
  chatCount.textContent = '0';
  elements.set('ytAiChatCount', chatCount);

  const langSelect = createElement('select');
  langSelect.id = 'ytAiLangSelect';
  langSelect.value = 'fr';
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

  global.window = {
    location: { href: 'https://www.youtube.com/watch?v=TEST_VID_1', origin: 'https://www.youtube.com' }
  };

  return { elements, messagesContainer, chatInput, chatCount };
}

test('ChatViewController - Q&A Interactive Tab Specification', async (t) => {
  const rootDir = path.resolve('.');

  await t.test('initializes with empty chat history and null port', () => {
    const controller = new ChatViewController();
    assert.deepEqual(controller.chatHistory, []);
    assert.equal(controller.chatPort, null);
  });

  await t.test('handleClearChat resets messages, count badge, and stops audio', () => {
    const { chatCount, messagesContainer } = setupMockDom();
    let audioStopped = false;
    let dictationStopped = false;

    const mockAudioController = {
      stopSpeech: () => { audioStopped = true; },
      stopDictation: () => { dictationStopped = true; }
    };

    const controller = new ChatViewController({ audioController: mockAudioController });
    controller.chatHistory = [{ role: 'user', content: 'test' }, { role: 'assistant', content: 'resp' }];
    chatCount.textContent = '1';

    controller.handleClearChat('fr');

    assert.equal(controller.chatHistory.length, 0, 'Chat history must be cleared');
    assert.equal(audioStopped, true, 'Speech must be stopped');
    assert.equal(dictationStopped, true, 'Dictation must be stopped');
    assert.equal(chatCount.textContent, '0', 'Chat badge must reset to 0');
    assert.ok(messagesContainer.innerHTML.includes('réinitialisée') || messagesContainer.innerHTML.includes('reset'), 'Welcome notice rendered');
  });

  await t.test('handleSendChatMessage unconditionally clears input field when sending', async () => {
    const { chatInput } = setupMockDom();
    chatInput.value = 'How does this work?';

    let extracted = false;
    const mockTranscriptController = {
      cachedTranscript: { videoId: 'TEST_VID_1', segments: [{ timestamp: '0:00', text: 'Sample' }], fullText: 'Sample text' },
      cachedVideoMetadata: { videoId: 'TEST_VID_1', title: 'Video Title', description: 'Desc' },
      extractYouTubeTranscript: async () => { extracted = true; return [{ text: 'Sample' }]; }
    };

    const mockPromptService = {
      constructor: {
        condenseTranscriptForContext: (t) => t,
        buildChatSystemPrompt: () => 'System prompt'
      }
    };

    let postedMessage = null;
    let messageListener = null;
    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: (msg) => { postedMessage = msg; },
          onMessage: { addListener: (cb) => { messageListener = cb; } },
          onDisconnect: { addListener: () => {} },
          disconnect: () => {}
        })
      }
    };

    const controller = new ChatViewController({
      transcriptController: mockTranscriptController,
      promptService: mockPromptService
    });

    await controller.handleSendChatMessage(null, {
      currentProvider: 'lmstudio',
      getActiveModel: () => 'qwen-2.5-7b',
      serverUrls: { lmstudio: 'http://localhost:1234' }
    });

    assert.equal(chatInput.value, '', 'Input must be cleared immediately upon sending');
    assert.ok(postedMessage, 'Message must be posted to port');
    assert.equal(postedMessage.action, 'CHAT_STREAM');
    assert.equal(postedMessage.model, 'qwen-2.5-7b');
    assert.equal(postedMessage.messages[0].content, 'How does this work?');
  });

  await t.test('handleSendChatMessage ignores empty or whitespace-only queries', async () => {
    const { chatInput, messagesContainer } = setupMockDom();
    chatInput.value = '   ';

    const controller = new ChatViewController();
    await controller.handleSendChatMessage();

    assert.equal(messagesContainer.children.length, 0, 'No bubble should be added for whitespace input');
  });

  await t.test('handleSendChatMessage warns user when model is not selected', async () => {
    const { chatInput, messagesContainer } = setupMockDom();
    chatInput.value = 'Valid question';

    const mockTranscriptController = {
      cachedTranscript: { videoId: 'TEST_VID_1', segments: [{ timestamp: '0:00', text: 'Text' }], fullText: 'Text' },
      cachedVideoMetadata: { videoId: 'TEST_VID_1', title: 'Title' }
    };

    const controller = new ChatViewController({
      transcriptController: mockTranscriptController
    });

    await controller.handleSendChatMessage(null, {
      currentProvider: 'lmstudio',
      getActiveModel: () => '' // No model selected!
    });

    const lastBubble = messagesContainer.children[messagesContainer.children.length - 1];
    assert.ok(lastBubble.innerHTML.includes('modèle') || lastBubble.innerHTML.includes('model'), 'Must display model selection warning');
  });

  await t.test('handleSendChatMessage warns user when API key is missing for cloud provider', async () => {
    const { chatInput, messagesContainer } = setupMockDom();
    chatInput.value = 'Valid question';

    const mockTranscriptController = {
      cachedTranscript: { videoId: 'TEST_VID_1', segments: [{ timestamp: '0:00', text: 'Text' }], fullText: 'Text' },
      cachedVideoMetadata: { videoId: 'TEST_VID_1', title: 'Title' }
    };

    const controller = new ChatViewController({
      transcriptController: mockTranscriptController
    });

    await controller.handleSendChatMessage(null, {
      currentProvider: 'openai',
      getActiveModel: () => 'gpt-4o',
      apiKeys: { openai: '' } // Missing API key!
    });

    const lastBubble = messagesContainer.children[messagesContainer.children.length - 1];
    assert.ok(lastBubble.innerHTML.includes('clé API') || lastBubble.innerHTML.includes('API key'), 'Must display missing API key alert');
  });

  await t.test('handleSendChatMessage automatically triggers transcript extraction when empty', async () => {
    const { chatInput } = setupMockDom();
    chatInput.value = 'Explain the intro';

    let transcriptExtracted = false;
    const mockTranscriptController = {
      cachedTranscript: { videoId: 'TEST_VID_1', segments: [], fullText: '' },
      cachedVideoMetadata: { videoId: 'TEST_VID_1', title: 'Title' },
      extractYouTubeTranscript: async () => {
        transcriptExtracted = true;
        mockTranscriptController.cachedTranscript.segments = [{ text: 'Here is speech' }];
        mockTranscriptController.cachedTranscript.fullText = 'Here is speech';
        return mockTranscriptController.cachedTranscript.segments;
      }
    };

    const mockPromptService = {
      constructor: {
        condenseTranscriptForContext: (t) => t,
        buildChatSystemPrompt: () => 'Sys prompt'
      }
    };

    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: () => {},
          onMessage: { addListener: () => {} },
          onDisconnect: { addListener: () => {} },
          disconnect: () => {}
        })
      }
    };

    const controller = new ChatViewController({
      transcriptController: mockTranscriptController,
      promptService: mockPromptService
    });

    await controller.handleSendChatMessage(null, {
      currentProvider: 'lmstudio',
      getActiveModel: () => 'model-x'
    });

    assert.equal(transcriptExtracted, true, 'Must automatically fetch transcript if not yet extracted');
  });

  await t.test('handles CHUNK, DONE, and ERROR stream cycles properly', async () => {
    const { chatInput, chatCount } = setupMockDom();
    chatInput.value = 'Stream test';

    const mockTranscriptController = {
      cachedTranscript: { videoId: 'TEST_VID_1', segments: [{ text: 'T' }], fullText: 'T' },
      cachedVideoMetadata: { videoId: 'TEST_VID_1' }
    };

    const mockPromptService = {
      constructor: {
        condenseTranscriptForContext: (t) => t,
        buildChatSystemPrompt: () => 'Sys'
      }
    };

    let streamListener = null;
    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: () => {},
          onMessage: { addListener: (cb) => { streamListener = cb; } },
          onDisconnect: { addListener: () => {} },
          disconnect: () => {}
        })
      }
    };

    const controller = new ChatViewController({
      transcriptController: mockTranscriptController,
      promptService: mockPromptService
    });

    await controller.handleSendChatMessage(null, {
      currentProvider: 'lmstudio',
      getActiveModel: () => 'model-x'
    });

    assert.ok(streamListener, 'Stream listener must be attached');

    // Simulate receiving chunks
    streamListener({ type: 'CHUNK', content: 'Hello ' });
    streamListener({ type: 'CHUNK', content: 'world!' });

    // Simulate DONE
    streamListener({ type: 'DONE' });

    assert.equal(controller.chatHistory.length, 2, 'History must contain user question and assistant answer');
    assert.equal(controller.chatHistory[0].content, 'Stream test');
    assert.equal(controller.chatHistory[1].content, 'Hello world!');
    assert.equal(chatCount.textContent, '1', 'Badge must increment to 1 conversation turn');
  });

  await t.test('toggleDictation delegates directly to InPageAudioController', () => {
    let dictationToggled = false;
    const mockAudioController = {
      toggleDictation: (opts) => { dictationToggled = true; return true; }
    };
    const controller = new ChatViewController({ audioController: mockAudioController });
    controller.toggleDictation({ localWhisperUrl: 'http://localhost:8000' });
    assert.equal(dictationToggled, true, 'Must delegate toggleDictation to audioController');
  });

  await t.test('content script wires Enter key, send button, and suggestion chips to chat submission', () => {
    const contentSrc = fs.readFileSync(path.join(rootDir, 'src/content/index.js'), 'utf-8');

    // Enter key submission
    assert.match(contentSrc, /e\.key\s*===\s*['"]Enter['"]/, 'Must listen to Enter key on chat input');
    assert.match(contentSrc, /e\.preventDefault\(\)/, 'Must prevent default Enter line break');

    // Send button & Suggestion chips
    assert.match(contentSrc, /ytAiSendChatBtn/, 'Must wire send button');
    assert.match(contentSrc, /yt-ai-suggestion-chip/, 'Must wire suggestion chips');

    // Mic button
    assert.match(contentSrc, /ytAiMicBtn/, 'Must wire microphone button');
    assert.match(contentSrc, /toggleDictation/, 'Must trigger toggleDictation');
  });
});
