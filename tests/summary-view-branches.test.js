import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';

function createEl(id = '') {
  const classes = new Set();
  const listeners = {};
  let _innerHTML = '';
  return {
    id,
    value: '',
    textContent: '',
    disabled: false,
    open: false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    addEventListener: (e, fn) => { (listeners[e] ||= []).push(fn); },
    focus: () => {},
    get innerHTML() { return _innerHTML; },
    set innerHTML(v) { _innerHTML = String(v); }
  };
}

function makeFakePort(events = []) {
  const onMsg = [];
  const onDisc = [];
  return {
    onMessage: { addListener: (fn) => onMsg.push(fn) },
    onDisconnect: { addListener: (fn) => onDisc.push(fn) },
    disconnect: () => {},
    postMessage: () => {
      queueMicrotask(() => {
        for (const ev of events) {
          if (ev.type === '__DISCONNECT__') onDisc.forEach(f => f());
          else onMsg.forEach(f => f(ev));
        }
      });
    }
  };
}

describe('SummaryViewController Branch Coverage', () => {
  it('covers validation, reasoning, streaming, error retry, stop and language sync', async () => {
    const origDoc = globalThis.document;
    const origChrome = globalThis.chrome;
    const origWin = globalThis.window;
    try {
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=sum1') };
      const els = new Map([
        ['ytAiLangSelect', Object.assign(createEl('ytAiLangSelect'), { value: 'en' })],
        ['ytAiModeSelect', Object.assign(createEl('ytAiModeSelect'), { value: 'standard' })],
        ['ytAiSummaryBody', createEl('ytAiSummaryBody')],
        ['ytAiReasoningBox', createEl('ytAiReasoningBox')],
        ['ytAiReasoningText', createEl('ytAiReasoningText')],
        ['ytAiReasoningStatus', createEl('ytAiReasoningStatus')],
        ['ytAiSummarizeBtn', createEl('ytAiSummarizeBtn')],
        ['ytAiStopSummaryBtn', createEl('ytAiStopSummaryBtn')],
        ['ytAiSettingsDrawer', createEl('ytAiSettingsDrawer')],
        ['ytAiSettingsToggleBtn', createEl('ytAiSettingsToggleBtn')],
        ['ytAiApiKeyInput', createEl('ytAiApiKeyInput')],
        ['ytAiRetrySummarizeBtn', createEl('ytAiRetrySummarizeBtn')]
      ]);
      const qSelectors = new Map();
      globalThis.document = {
        getElementById: (id) => els.get(id) || null,
        querySelector: (s) => qSelectors.get(s) || null,
        querySelectorAll: () => []
      };

      const banners = [];
      const sumCtrl = new SummaryViewController({
        transcriptController: {
          cachedTranscript: { fullText: 'Hello world transcript' },
          cachedVideoMetadata: { videoId: 'sum1', title: 'T', author: 'A', description: 'Desc' },
          extractYouTubeTranscript: async () => [{ timestamp: '00:00', text: 'Hello' }],
          requestPlayerDataFromMainWorld: async () => {}
        },
        promptService: { constructor: { condenseTranscriptForContext: (t) => t, buildPrompts: () => ({ systemPrompt: 's', userPrompt: 'u' }) } }
      });

      await sumCtrl.startSummarization({ showStatusBanner: (m) => banners.push(m) });
      assert.equal(banners.length, 1);

      await sumCtrl.startSummarization({
        selectedModel: 'gpt-4o',
        currentProvider: 'openai',
        apiKeys: {},
        showStatusBanner: (m) => banners.push(m)
      });
      assert.equal(banners.length, 2);

      globalThis.chrome = {
        runtime: {
          connect: () => makeFakePort([
            { type: 'CHUNK', reasoning: 'Step 1...' },
            { type: 'CHUNK', content: '## Final summary' },
            { type: 'DONE' }
          ])
        }
      };

      await sumCtrl.startSummarization({ selectedModel: 'qwen/long-model-name-over-14', currentProvider: 'lmstudio' });
      await new Promise((r) => setTimeout(r, 15));
      assert.equal(sumCtrl.fullSummaryMarkdown, '## Final summary');
      assert.equal(sumCtrl.isGenerating, false);

      sumCtrl.applyLanguage('fr');
      sumCtrl.stopGeneration('fr');
      sumCtrl.fullSummaryMarkdown = '';
      sumCtrl.stopGeneration('fr');
      assert.match(els.get('ytAiSummaryBody').innerHTML, /stopped-note/);

      sumCtrl.isGenerating = true;
      qSelectors.set('#ytAiSummaryBody .yt-ai-loading', createEl('load'));
      sumCtrl.applyLanguage('en');
      sumCtrl.isGenerating = false;
      sumCtrl.renderErrorState('Oops failure', 'en', {});
      qSelectors.set('#ytAiSummaryBody .yt-ai-error-title strong', createEl('errStrong'));
      sumCtrl.applyLanguage('fr');
      sumCtrl.resetSummaryOutput('en');
      assert.equal(sumCtrl.fullSummaryMarkdown, '');
    } finally {
      globalThis.document = origDoc;
      globalThis.chrome = origChrome;
      globalThis.window = origWin;
    }
  });
});
