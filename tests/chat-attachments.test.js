import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MultimodalMessageFormatter } from '../src/background/MultimodalMessageFormatter.js';
import { ChatAttachmentHelper } from '../src/content/ui/ChatAttachmentHelper.js';
import { ModelCapabilities } from '../src/config/ModelCapabilities.js';

describe('MultimodalMessageFormatter', () => {
  const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgo=';

  it('keeps plain text messages as strings across providers when no images are attached', () => {
    const msgs = [{ role: 'user', content: 'Hello', files: [{ name: 'notes.txt', textContent: 'line 1' }] }];
    const formatted = MultimodalMessageFormatter.formatMessages(msgs, 'openai');
    assert.equal(formatted.length, 1);
    assert.equal(formatted[0].role, 'user');
    assert.equal(typeof formatted[0].content, 'string');
    assert.equal(formatted[0].content.includes('[Attached file: notes.txt]'), true);
    assert.equal(formatted[0].content.includes('line 1'), true);
  });

  it('formats images for OpenAI-compatible, Claude, and native Ollama endpoints', () => {
    const msgs = [{ role: 'user', content: 'Describe this', images: [{ name: 'snip.png', dataUrl: sampleDataUrl }] }];

    const openai = MultimodalMessageFormatter.formatMessages(msgs, 'openai');
    assert.deepEqual(openai[0].content, [
      { type: 'text', text: 'Describe this' },
      { type: 'image_url', image_url: { url: sampleDataUrl } }
    ]);

    const claude = MultimodalMessageFormatter.formatMessages(msgs, 'claude');
    assert.deepEqual(claude[0].content, [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } },
      { type: 'text', text: 'Describe this' }
    ]);

    const ollama = MultimodalMessageFormatter.formatMessages(msgs, 'ollama');
    assert.equal(ollama[0].content, 'Describe this');
    assert.deepEqual(ollama[0].images, ['iVBORw0KGgo=']);
  });
});

describe('ChatAttachmentHelper', () => {
  function setupMinimalDom() {
    const children = [];
    const previewEl = {
      id: 'ytAiChatAttachments',
      innerHTML: '',
      classList: {
        classes: new Set(['yt-ai-hidden']),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      appendChild(node) { children.push(node); },
      get children() { return children; }
    };
    global.document = {
      getElementById: (id) => (id === 'ytAiChatAttachments' ? previewEl : null),
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          className: '',
          textContent: '',
          src: '',
          alt: '',
          type: '',
          children: [],
          listeners: {},
          appendChild(child) { this.children.push(child); },
          addEventListener(ev, fn) { this.listeners[ev] = fn; }
        };
        return el;
      }
    };
    global.FileReader = class {
      readAsDataURL() {
        this.result = 'data:image/png;base64,AAAA';
        this.onload?.();
      }
      readAsText() {
        this.result = 'console.log(1);';
        this.onload?.();
      }
    };
    return previewEl;
  }

  it('handles clipboard paste for Windows screenshot images without plain text', async () => {
    const previewEl = setupMinimalDom();
    const helper = new ChatAttachmentHelper({ getLang: () => 'fr' });
    let prevented = false;

    const fakeImageFile = { name: 'image.png', type: 'image/png', size: 1024 };
    const pasteEvent = {
      preventDefault: () => { prevented = true; },
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => fakeImageFile }],
        getData: () => ''
      }
    };

    const count = await helper.handlePaste(pasteEvent);
    assert.equal(count, 1);
    assert.equal(prevented, true);
    assert.equal(helper.hasPending(), true);
    assert.equal(previewEl.classList.contains('yt-ai-hidden'), false);
    assert.equal(previewEl.children.length, 1);

    const payload = ChatAttachmentHelper.buildMessagePayload('', helper.consume());
    assert.equal(payload.images.length, 1);
    assert.equal(payload.content.length > 0, true);
    assert.equal(helper.hasPending(), false);
  });

  it('reads text/code files, rejects oversized images/binaries, and builds user bubble HTML', async () => {
    setupMinimalDom();
    const notices = [];
    const helper = new ChatAttachmentHelper({ getLang: () => 'en', onNotice: (m) => notices.push(m) });

    const codeFile = { name: 'app.js', type: '', size: 120, text: async () => 'const x = 1;' };
    const hugeImage = { name: 'huge.png', type: 'image/png', size: 9 * 1024 * 1024 };
    const binaryFile = { name: 'archive.zip', type: 'application/zip', size: 500 };

    const added = await helper.handleFiles([codeFile, hugeImage, binaryFile]);
    assert.equal(added, 1);
    assert.equal(notices.length, 2);

    const html = ChatAttachmentHelper.buildUserBubbleHtml('Check this code', helper.attachments);
    assert.equal(html.includes('yt-ai-bubble-file'), true);
    assert.equal(html.includes('app.js'), true);
    assert.equal(html.includes('Check this code'), true);

    helper.removeAt(0);
    assert.equal(helper.hasPending(), false);
  });

  it('gates image attachments based on ModelCapabilities including multimodal families like Qwen 3.8', async () => {
    setupMinimalDom();
    assert.equal(ModelCapabilities.supportsImages('lmstudio', 'qwen3.8-27b-instruct'), true);
    assert.equal(ModelCapabilities.supportsImages('lmstudio', 'gemma-3-12b-it'), true);
    assert.equal(ModelCapabilities.supportsImages('gemini', 'gemini-2.5-flash'), true);
    assert.equal(ModelCapabilities.supportsImages('lmstudio', 'deepseek-r1-distill-qwen-14b'), false);
    assert.equal(ModelCapabilities.supportsImages('lmstudio', 'custom-local-model', { type: 'vlm' }), true);
    assert.equal(ModelCapabilities.supportsImages('lmstudio', 'custom-local-model', { type: 'llm', capabilities: ['completion'] }), false);

    let currentModel = 'deepseek-r1-distill-qwen-14b';
    const notices = [];
    const helper = new ChatAttachmentHelper({
      getLang: () => 'fr',
      onNotice: (m) => notices.push(m),
      getModelInfo: () => ({ provider: 'lmstudio', model: currentModel, meta: null })
    });

    const imgFile = { name: 'snip.png', type: 'image/png', size: 1024 };
    const textFile = { name: 'notes.md', type: 'text/markdown', size: 50, text: async () => '# Note' };

    assert.equal(await helper.handleFiles([imgFile]), 0);
    assert.equal(notices.length, 1);
    assert.equal(await helper.handleFiles([textFile]), 1);

    currentModel = 'qwen3.8-27b';
    assert.equal(helper.canAttachImages(), true);
    assert.equal(await helper.handleFiles([imgFile]), 1);
  });
});
