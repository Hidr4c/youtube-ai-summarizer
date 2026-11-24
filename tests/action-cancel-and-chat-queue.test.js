import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { ChatViewController } from '../src/content/ui/ChatViewController.js';
import { ChannelChatController } from '../src/content/ui/ChannelChatController.js';
import { WebPageController } from '../src/content/services/WebPageController.js';
import { ChatQueueHelper } from '../src/content/ui/ChatQueueHelper.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { ChannelCompanionTemplate } from '../src/content/ui/ChannelCompanionTemplate.js';
import { I18N } from '../src/locales/index.js';

function createRichDom(ids = []) {
  const elements = new Map();
  const makeNode = (tagName = 'div', id = '') => {
    const classes = new Set();
    const listeners = new Map();
    let _html = '';
    const node = {
      tagName: tagName.toUpperCase(),
      id,
      className: '',
      value: '',
      textContent: '',
      title: '',
      disabled: false,
      dataset: {},
      style: {},
      children: [],
      parentNode: null,
      scrollHeight: 60,
      get firstChild() { return this.children[0] || null; },
      get innerHTML() { return _html; },
      set innerHTML(v) { _html = String(v); if (!_html) this.children = []; },
      classList: {
        add: (...cls) => cls.forEach((c) => classes.add(c)),
        remove: (...cls) => cls.forEach((c) => classes.delete(c)),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : Boolean(force);
          if (on) classes.add(c); else classes.delete(c);
          return on;
        },
        contains: (c) => classes.has(c)
      },
      appendChild(child) {
        if (!child) return child;
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        return child;
      },
      remove() {
        this._removed = true;
        if (this.parentNode) this.parentNode.removeChild(this);
      },
      focus() { this._focused = true; },
      addEventListener(evt, fn) {
        if (!listeners.has(evt)) listeners.set(evt, []);
        listeners.get(evt).push(fn);
      },
      click() {
        (listeners.get('click') || []).forEach((fn) => fn({ stopPropagation() {} }));
      },
      querySelector(sel) {
        const cls = sel.startsWith('.') ? sel.slice(1) : sel;
        for (const c of this.children) {
          if (String(c.className || '').split(/\s+/).includes(cls) || c.classList?.contains(cls)) return c;
          const nested = c.querySelector?.(sel);
          if (nested) return nested;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const cls = sel.startsWith('.') ? sel.slice(1) : sel;
        for (const c of this.children) {
          if (String(c.className || '').split(/\s+/).includes(cls) || c.classList?.contains(cls)) out.push(c);
          if (c.querySelectorAll) out.push(...c.querySelectorAll(sel));
        }
        return out;
      },
      setAttribute() {}
    };
    return node;
  };

  ids.forEach((id) => elements.set(id, makeNode('div', id)));
  globalThis.document = {
    body: { innerText: 'Sample page text content for testing ClarifAI UX features cleanly.' },
    title: 'Sample Test Page',
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => (sel.startsWith('#') ? elements.get(sel.slice(1)) || null : null),
    querySelectorAll: () => [],
    createElement: (tag) => makeNode(tag)
  };
  globalThis.window = { location: { href: 'https://example.com/article', origin: 'https://example.com', hostname: 'example.com', protocol: 'https:' } };
  return { elements };
}

function createFakeChromeStreamHarness() {
  const ports = [];
  globalThis.chrome = {
    runtime: {
      sendMessage: (_msg, cb) => cb?.({ success: false }),
      connect: () => {
        const msgListeners = [];
        const discListeners = [];
        const p = {
          disconnected: false,
          onMessage: { addListener: (fn) => msgListeners.push(fn) },
          onDisconnect: { addListener: (fn) => discListeners.push(fn) },
          postMessage: () => {},
          disconnect() { this.disconnected = true; },
          emitMessage: (m) => msgListeners.forEach((fn) => fn(m)),
          emitDisconnect: () => discListeners.forEach((fn) => fn())
        };
        ports.push(p);
        return p;
      }
    }
  };
  return ports;
}

describe('Launch-to-Cancel Action Buttons & Interactive Q&A Queue/Revert', () => {
  it('SummaryViewController toggles #ytAiSummarizeBtn to clickable Cancel while running and aborts cleanly on second click', async () => {
    const { elements } = createRichDom(['ytAiLangSelect', 'ytAiModeSelect', 'ytAiSummarizeBtn', 'ytAiStopSummaryBtn', 'ytAiSummaryBody', 'ytAiReasoningBox', 'ytAiReasoningText', 'ytAiReasoningStatus']);
    elements.get('ytAiLangSelect').value = 'fr';
    const ports = createFakeChromeStreamHarness();

    const transcriptController = {
      cachedTranscript: { videoId: 'vid123', segments: [{ start: 0, text: 'hello' }], fullText: 'hello world test transcript' },
      cachedVideoMetadata: { videoId: 'vid123', title: 'Test Video', author: 'Author', description: 'Desc' },
      extractYouTubeTranscript: async () => transcriptController.cachedTranscript.segments,
      requestPlayerDataFromMainWorld: async () => {}
    };
    const promptService = { constructor: { condenseTranscriptForContext: (t) => t, buildPrompts: () => ({ systemPrompt: 's', userPrompt: 'u' }) } };
    const ctrl = new SummaryViewController({ transcriptController, promptService });
    const ctx = { state: { currentLang: 'fr', currentProvider: 'lmstudio', getActiveModel: () => 'qwen3' }, currentLang: 'fr' };

    await ctrl.startSummarization(ctx);
    const btn = elements.get('ytAiSummarizeBtn');
    assert.equal(ctrl.isGenerating, true);
    assert.equal(btn.disabled, false, 'Summarize button must remain clickable while generating');
    assert.equal(btn.classList.contains('yt-ai-btn-stop'), true);
    assert.equal(ports.length, 1);

    await ctrl.startSummarization(ctx);
    assert.equal(ctrl.isGenerating, false, 'Second click on summarize button must cancel generation');
    assert.equal(ports[0].disconnected, true, 'Active stream port must disconnect on cancel');
    assert.equal(btn.classList.contains('yt-ai-btn-stop'), false);
    assert.equal(btn.disabled, false);
  });

  it('WebPageActionRunner turns Summary, Page Audit, and Site Audit buttons into clickable Cancel controls cleanly', async () => {
    const { elements } = createRichDom([
      'ytAiLangSelect', 'ytAiModeSelect', 'ytAiSummarizeBtn', 'ytAiSummaryBody',
      'ytAiRunAuditBtn', 'ytAiAuditBody', 'ytAiRunWatchChannelAuditBtn', 'ytAiWatchChannelResultContainer',
      'ytAiWatchChannelHandle', 'ytAiWatchChannelMaxVideos'
    ]);
    elements.get('ytAiLangSelect').value = 'en';
    const ports = createFakeChromeStreamHarness();

    const state = { currentLang: 'en', currentProvider: 'lmstudio', getActiveModel: () => 'qwen3', serverUrls: { lmstudio: 'http://localhost:1234' }, apiKeys: {} };
    const webCtrl = new WebPageController({ state, bannerView: { setExpanded() {}, switchTab() {} } });

    await webCtrl.triggerSummary();
    const sumBtn = elements.get('ytAiSummarizeBtn');
    assert.equal(webCtrl.isSummarizing, true);
    assert.equal(sumBtn.disabled, false);
    assert.equal(sumBtn.classList.contains('yt-ai-btn-stop'), true);
    assert.ok(sumBtn.textContent.includes('Cancel'));

    await webCtrl.triggerPageAudit();
    const auditBtn = elements.get('ytAiRunAuditBtn');
    assert.equal(webCtrl.isAuditing, true);
    assert.equal(auditBtn.disabled, false);
    assert.equal(auditBtn.classList.contains('yt-ai-btn-stop'), true);

    await webCtrl.triggerSummary();
    assert.equal(webCtrl.isSummarizing, false, 'Clicking Summary button again must cancel Summary');
    assert.equal(webCtrl.isAuditing, true, 'Canceling Summary must not disturb concurrent Page Audit');
    assert.equal(ports[0].disconnected, true);
    assert.equal(sumBtn.classList.contains('yt-ai-btn-stop'), false);

    await webCtrl.triggerPageAudit();
    assert.equal(webCtrl.isAuditing, false, 'Clicking Page Audit button again must cancel Page Audit');
    assert.equal(ports[1].disconnected, true);

    await webCtrl.triggerDomainAudit();
    const siteBtn = elements.get('ytAiRunWatchChannelAuditBtn');
    assert.equal(webCtrl.isDomainAuditing, true);
    assert.equal(siteBtn.disabled, false);
    assert.equal(siteBtn.classList.contains('yt-ai-btn-stop'), true);

    await webCtrl.triggerDomainAudit();
    assert.equal(webCtrl.isDomainAuditing, false, 'Clicking Site Audit button again must cancel Site Audit');
    assert.equal(siteBtn.classList.contains('yt-ai-btn-stop'), false);
  });

  it('Queues chained messages FIFO, recalls queued or active turns back to textarea, and supports Antigravity-style turn revert', async () => {
    const { elements } = createRichDom(['ytAiLangSelect', 'ytAiModeSelect', 'ytAiChatMessages', 'ytAiChatQueue', 'ytAiChatInput', 'ytAiChatCount', 'ytAiChatAttachments']);
    elements.get('ytAiLangSelect').value = 'en';
    const ports = createFakeChromeStreamHarness();

    const chatCtrl = new ChatViewController({
      transcriptController: {
        cachedTranscript: { videoId: '', segments: [{ start: 0, text: 't' }], fullText: 'transcript text' },
        cachedVideoMetadata: { title: 'Video', author: 'Creator', description: '' },
        extractYouTubeTranscript: async () => [{ start: 0, text: 't' }]
      },
      promptService: { constructor: { condenseTranscriptForContext: (t) => t, buildChatSystemPrompt: () => 'sys' } }
    });
    const ctx = { currentLang: 'en', currentProvider: 'lmstudio', getActiveModel: () => 'qwen3', apiKeys: {}, serverUrls: {} };

    // 1. Send first turn -> starts streaming immediately
    elements.get('ytAiChatInput').value = 'First question';
    await chatCtrl.handleSendChatMessage(null, ctx);
    assert.equal(elements.get('ytAiChatInput').value, '');
    assert.equal(chatCtrl._chatQueueState.isBusy, true);
    assert.equal(ports.length, 1);

    // 2. Chain second and third messages while first is busy -> queued FIFO
    elements.get('ytAiChatInput').value = 'Second question';
    await chatCtrl.handleSendChatMessage(null, ctx);
    elements.get('ytAiChatInput').value = 'Third question';
    await chatCtrl.handleSendChatMessage(null, ctx);
    assert.equal(chatCtrl._chatQueueState.queue.length, 2);
    assert.equal(elements.get('ytAiChatQueue').classList.contains('yt-ai-hidden'), false);
    assert.equal(ports.length, 1, 'Queued messages must wait until turn 1 completes');

    // 3. Recall third queued item back into textarea to edit it
    const q3Id = chatCtrl._chatQueueState.queue[1].id;
    ChatQueueHelper.recallQueuedItem(chatCtrl, q3Id, chatCtrl._getQueueConfig(ctx));
    assert.equal(elements.get('ytAiChatInput').value, 'Third question');
    assert.equal(chatCtrl._chatQueueState.queue.length, 1);
    elements.get('ytAiChatInput').value = '';

    // 4. Complete first turn -> second queued item starts automatically
    ports[0].emitMessage({ type: 'CHUNK', content: 'Answer one.' });
    ports[0].emitMessage({ type: 'DONE' });
    assert.equal(chatCtrl.chatHistory.length, 2);
    assert.equal(elements.get('ytAiChatCount').textContent, '1');
    assert.equal(ports.length, 2, 'Completing turn 1 must auto-dispatch queued turn 2');
    assert.equal(chatCtrl._chatQueueState.queue.length, 0);

    // 5. Cancel active turn 2 back to input for editing
    ChatQueueHelper.cancelActiveTurn(chatCtrl, chatCtrl._getQueueConfig(ctx), true, false);
    assert.equal(ports[1].disconnected, true);
    assert.equal(elements.get('ytAiChatInput').value, 'Second question');
    assert.equal(chatCtrl.chatHistory.length, 2, 'Turn 1 must remain cleanly in history');

    // 6. Send edited turn 2 and complete it so we have 2 completed turns
    elements.get('ytAiChatInput').value = 'Edited second question';
    await chatCtrl.handleSendChatMessage(null, ctx);
    ports[2].emitMessage({ type: 'CHUNK', content: 'Answer two.' });
    ports[2].emitMessage({ type: 'DONE' });
    assert.equal(chatCtrl.chatHistory.length, 4);
    assert.equal(elements.get('ytAiChatCount').textContent, '2');

    // 7. Revert to turn 0 (Antigravity-style rollback)
    const firstTurn = chatCtrl._chatQueueState.completedTurns[0];
    ChatQueueHelper.revertToTurn(chatCtrl, firstTurn, chatCtrl._getQueueConfig(ctx));
    assert.equal(chatCtrl.chatHistory.length, 0);
    assert.equal(elements.get('ytAiChatCount').textContent, '0');
    assert.equal(elements.get('ytAiChatInput').value, 'First question');
    assert.equal(elements.get('ytAiChatMessages').children.length, 0);
  });

  it('Web Q&A & Channel Chat Q&A support FIFO queue, attachment restore on recall/revert, and locale key parity', async () => {
    const { elements } = createRichDom([
      'ytAiLangSelect', 'ytAiModeSelect', 'ytAiChatMessages', 'ytAiChatQueue', 'ytAiChatInput', 'ytAiChatCount', 'ytAiChatAttachments',
      'ytAiCompLangSelect', 'ytAiChannelChatMessages', 'ytAiChannelChatQueue', 'ytAiChannelChatInput', 'ytAiChannelChatCount'
    ]);
    elements.get('ytAiLangSelect').value = 'fr';
    const ports = createFakeChromeStreamHarness();

    const state = { currentLang: 'fr', currentProvider: 'lmstudio', getActiveModel: () => 'qwen3', serverUrls: { lmstudio: 'http://localhost:1234' }, apiKeys: {} };
    const chatCtrl = new ChatViewController();
    const webCtrl = new WebPageController({ state, bannerView: { setExpanded() {}, switchTab() {} } });
    const attSample = [{ kind: 'text', name: 'notes.md', mimeType: 'text/markdown', textContent: 'hello' }];

    webCtrl.sendChatMessage('Web Q1', attSample, { attachmentHelper: chatCtrl.attachmentHelper });
    webCtrl.sendChatMessage('Web Q2', [], { attachmentHelper: chatCtrl.attachmentHelper });
    assert.equal(webCtrl._chatQueueState.queue.length, 1);
    ports[0].emitMessage({ type: 'CHUNK', content: 'Web A1' });
    ports[0].emitMessage({ type: 'DONE' });
    assert.equal(webCtrl.chatHistory.length, 2);
    assert.equal(ports.length, 2);

    // Revert turn 0 in Web Q&A and confirm attachments are restored cleanly
    ChatQueueHelper.revertToTurn(webCtrl, webCtrl._chatQueueState.completedTurns[0], {
      inputId: 'ytAiChatInput', messagesId: 'ytAiChatMessages', queueContainerId: 'ytAiChatQueue',
      countBadgeId: 'ytAiChatCount', attachmentHelper: chatCtrl.attachmentHelper, getStreamClient: (c) => c.getStreamClient('chat')
    });
    assert.equal(elements.get('ytAiChatInput').value, 'Web Q1');
    assert.equal(chatCtrl.attachmentHelper.attachments.length, 1);

    // Channel Chat Q&A queueing
    const chanCtrl = new ChannelChatController({
      channelManager: { getOrFetchChannelDossier: async () => ({ success: false }) }
    });
    chanCtrl.currentChannel = '/@demo';
    await chanCtrl.sendMessage('Chan Q1', { state, channelIdentifier: '/@demo' });
    await chanCtrl.sendMessage('Chan Q2', { state, channelIdentifier: '/@demo' });
    assert.equal(chanCtrl._chatQueueState.queue.length, 1);
    ports[2].emitMessage({ type: 'CHUNK', content: 'Chan A1' });
    ports[2].emitMessage({ type: 'DONE' });
    assert.equal(chanCtrl.chatHistory.length, 2);

    // Templates expose queue dock IDs and I18N parity holds cleanly
    assert.ok(BannerTemplate.render({ currentLang: 'fr' }).includes('id="ytAiChatQueue"'));
    assert.ok(ChannelCompanionTemplate.render({ channelIdentifier: '/@demo', isFr: true, lang: 'fr' }).includes('id="ytAiChannelChatQueue"'));
    assert.ok(I18N.fr.webCancelBtn && I18N.en.webCancelBtn);
  });
});
