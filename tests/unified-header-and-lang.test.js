import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { detectBrowserLang } from '../src/locales/index.js';
import { createInPageState } from '../src/content/services/InPageState.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { SettingsDrawerTemplate } from '../src/content/templates/SettingsDrawerTemplate.js';
import { SettingsDrawerI18n } from '../src/content/ui/SettingsDrawerI18n.js';
import fs from 'node:fs';
import { HeaderTabHandler } from '../src/content/ui/HeaderTabHandler.js';
import { BannerEventHandler } from '../src/content/ui/BannerEventHandler.js';
import { WebPageController } from '../src/content/services/WebPageController.js';
import { WebAuditVisualRenderer } from '../src/content/ui/WebAuditVisualRenderer.js';
import { WebPageLayoutShifter } from '../src/content/ui/WebPageLayoutShifter.js';
import { WebPagePromptBuilder } from '../src/services/implementations/WebPagePromptBuilder.js';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { I18N } from '../src/locales/index.js';

describe('Unified Smart Header & Browser Language Auto-Detection', () => {
  const prevChrome = globalThis.chrome;
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  beforeEach(() => {
    globalThis.chrome = { i18n: { getUILanguage: () => 'fr-FR' } };
    globalThis.window = { location: new URL('https://www.youtube.com/watch?v=abc123') };
  });

  afterEach(() => {
    globalThis.chrome = prevChrome;
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  });

  it('detectBrowserLang maps supported browser locales accurately and falls back to en', () => {
    assert.equal(detectBrowserLang('fr-CA'), 'fr');
    assert.equal(detectBrowserLang('de_DE'), 'de');
    assert.equal(detectBrowserLang('ja'), 'ja');
    assert.equal(detectBrowserLang('zh-CN'), 'zh');
    assert.equal(detectBrowserLang('pt-BR'), 'en');
    assert.equal(detectBrowserLang(), 'fr');
    assert.equal(createInPageState().currentLang, 'fr');
  });

  it('renders single-row unified header tabs, places Format selector left of Summarize CTA, and keeps Language in Settings Params', () => {
    const html = BannerTemplate.render(I18N.fr, { currentLang: 'fr', currentMode: 'detailed' });
    assert.equal(html.includes('class="yt-ai-tabs-nav"'), false, 'Duplicate secondary tab strip must be removed');
    assert.equal(html.includes('class="yt-ai-header-tabs"'), true, 'Unified header tabs must live inside top bar');
    const modeIdx = html.indexOf('id="ytAiModeSelect"');
    const sumIdx = html.indexOf('id="ytAiSummarizeBtn"');
    assert.ok(modeIdx !== -1 && sumIdx !== -1 && modeIdx < sumIdx, 'Format selector must sit to the left of Summarize button');
    assert.ok(html.includes('value="detailed" selected'));

    const settingsHtml = SettingsDrawerTemplate.render(I18N.fr, { currentLang: 'fr', currentMode: 'detailed' });
    assert.equal(settingsHtml.includes('id="ytAiModeSelect"'), false, 'Format selector must not duplicate inside Settings Drawer');
    assert.ok(settingsHtml.includes('id="ytAiLangLabel"'));

    const langEl = { textContent: '' };
    globalThis.document = {
      getElementById: (id) => ({ ytAiLangLabel: langEl }[id] || null),
      querySelector: () => null,
      querySelectorAll: () => []
    };
    SettingsDrawerI18n.applyLanguage('en');
    assert.equal(langEl.textContent, I18N.en.langLabel);

    const quickPrompt = WebPagePromptBuilder.buildSummaryPrompts({ title: 'T', url: 'https://a.test', text: 'Body' }, 'fr', 'quick');
    const detailedPrompt = WebPagePromptBuilder.buildSummaryPrompts({ title: 'T', url: 'https://a.test', text: 'Body' }, 'fr', 'detailed');
    assert.match(quickPrompt.systemPrompt, /ULTRA-CONCISE/);
    assert.match(detailedPrompt.systemPrompt, /thorough/i);

    assert.ok(html.includes('id="ytAiAuditModeSelect"'));
    assert.ok(html.includes('id="ytAiChannelAuditModeSelect"'));
    assert.ok(html.indexOf('id="ytAiAuditModeSelect"') < html.indexOf('id="ytAiRunAuditBtn"'));
    assert.ok(html.indexOf('id="ytAiChannelAuditModeSelect"') < html.indexOf('id="ytAiRunWatchChannelAuditBtn"'));

    const quickPageAudit = WebPagePromptBuilder.buildAuditPrompts({ url: 'https://a.test', text: 'Body' }, 'fr', 'quick');
    const detailedDomainAudit = WebPagePromptBuilder.buildDomainAuditPrompts({ url: 'https://a.test', text: 'Body' }, { legalPages: [] }, 'fr', 'detailed');
    const quickVideoAuditSys = AuditPromptBuilder.buildSystemPrompt('fr', 'quick');
    const detailedChanAuditSys = ChannelAuditPromptBuilder.buildSystemPrompt('en', 'detailed');
    assert.match(quickPageAudit.systemPrompt, /CONCISE/);
    assert.match(detailedDomainAudit.systemPrompt, /DETAILED/);
    assert.match(quickVideoAuditSys, /CONCIS/);
    assert.match(detailedChanAuditSys, /DETAILED/);
  });

  it('1-click header tabs expand + switch + launch only when uncached and idle across Watch & Web modes', async () => {
    let expanded = [];
    let switched = [];
    let sumCalls = 0;
    let auditCalls = 0;
    let channelCalls = 0;
    let txCalls = 0;

    globalThis.document = {
      title: 'Sample Video - YouTube',
      getElementById: () => null,
      querySelector: (sel) => (sel.includes('.yt-ai-placeholder-text') ? {} : null),
      querySelectorAll: () => []
    };

    const makeBtn = (tab) => ({ getAttribute: (k) => (k === 'data-tab' ? tab : null) });
    const ctx = {
      state: { currentLang: 'en' },
      bannerView: {
        setExpanded: (v) => expanded.push(v),
        switchTab: (t) => switched.push(t)
      },
      summaryViewController: { fullSummaryMarkdown: '', isGenerating: false },
      auditViewController: { lastReport: null, auditService: { isAuditing: false }, syncChannelAuditUI: async () => {} },
      transcriptController: { cachedTranscript: {}, extractYouTubeTranscript: () => { txCalls += 1; } },
      webPageController: null,
      triggerSummarize: () => { sumCalls += 1; },
      triggerAudit: () => { auditCalls += 1; },
      triggerChannelAudit: () => { channelCalls += 1; }
    };

    // Uncached clicks launch once
    HeaderTabHandler.handleTabSelection(makeBtn('summary'), ctx);
    HeaderTabHandler.handleTabSelection(makeBtn('audit'), ctx);
    HeaderTabHandler.handleTabSelection(makeBtn('transcript'), ctx);
    assert.deepEqual(expanded, [true, true, true]);
    assert.deepEqual(switched, ['summary', 'audit', 'transcript']);
    assert.equal(sumCalls, 1);
    assert.equal(auditCalls, 1);
    assert.equal(txCalls, 1);

    // Cached results prevent redundant relaunch
    ctx.summaryViewController.fullSummaryMarkdown = 'Cached summary';
    ctx.auditViewController.lastReport = { reliabilityScore: 90 };
    HeaderTabHandler.handleTabSelection(makeBtn('summary'), ctx);
    HeaderTabHandler.handleTabSelection(makeBtn('audit'), ctx);
    assert.equal(sumCalls, 1);
    assert.equal(auditCalls, 1);

    // Universal Web Page mode 1-click site audit launch vs cached switch
    globalThis.window = { location: new URL('https://example.com/article') };
    ctx.webPageController = { summaryMarkdown: '', auditReport: null, domainAuditMarkdown: '' };
    HeaderTabHandler.handleTabSelection(makeBtn('channelAudit'), ctx);
    assert.equal(channelCalls, 1);

    ctx.webPageController.domainAuditMarkdown = 'Cached domain audit';
    HeaderTabHandler.handleTabSelection(makeBtn('channelAudit'), ctx);
    assert.equal(channelCalls, 1);
  });

  it('hides the transcript tab and pane in Universal Web Page mode (YouTube videos only)', () => {
    const hiddenCalls = [];
    const mkHiddenAware = (id) => ({
      id, textContent: '', innerHTML: '', value: '2',
      classList: { add: (cls) => hiddenCalls.push(`${id}:${cls}`), remove: () => {} }
    });
    const fakeEls = new Map([
      ['ytAiTabTranscriptBtn', mkHiddenAware('ytAiTabTranscriptBtn')],
      ['ytAiPaneTranscript', mkHiddenAware('ytAiPaneTranscript')]
    ]);
    globalThis.document = {
      title: 'Web Article',
      body: { innerText: 'Article content' },
      getElementById: (id) => fakeEls.get(id) || null,
      querySelector: (sel) => fakeEls.get(sel.replace(/^#/, '')) || null,
      querySelectorAll: () => []
    };
    globalThis.window = { location: new URL('https://example.org/article') };
    const ctrl = new WebPageController({ state: { currentLang: 'fr' } });
    ctrl.applyWebPageUiLabels('fr');
    assert.equal(hiddenCalls.includes('ytAiTabTranscriptBtn:yt-ai-hidden'), true);
    assert.equal(hiddenCalls.includes('ytAiPaneTranscript:yt-ai-hidden'), true);
  });

  it('protects text selection and clipboard copy against host-page user-select:none and selectstart blockers', () => {
    const css = fs.readFileSync(new URL('../src/content/content.css', import.meta.url), 'utf8');
    assert.match(css, /\.yt-ai-markdown[\s\S]*?user-select:\s*text\s*!important/);

    const listeners = {};
    const banner = {
      addEventListener: (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
      querySelectorAll: () => [],
      querySelector: () => null
    };
    globalThis.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null };
    BannerEventHandler.bind(banner, {
      state: { currentLang: 'en', apiKeys: {}, serverUrls: {} },
      bannerView: {},
      settingsDrawer: { syncProviderUI: () => {}, bindPasteButton: () => {} },
      summaryViewController: {},
      chatViewController: {},
      auditViewController: { syncChannelAuditUI: () => {} },
      audioController: { init: () => {} },
      transcriptController: { cachedTranscript: {} }
    });

    assert.equal(Array.isArray(listeners.selectstart) && listeners.selectstart.length > 0, true);
    assert.equal(Array.isArray(listeners.copy) && listeners.copy.length > 0, true);
    let stopped = 0;
    listeners.selectstart[0]({ stopPropagation: () => { stopped += 1; } });
    listeners.copy[0]({ stopPropagation: () => { stopped += 1; } });
    assert.equal(stopped, 2);
  });

  it('renders compact Export dropdown, 4-axis SVG radar + bars for Page/Site audits, and shields clicks from off-screen overlays', () => {
    const html = BannerTemplate.render(I18N.fr, { currentLang: 'fr' });
    assert.ok(html.includes('id="ytAiExportBtn"'));
    assert.ok(html.includes('id="ytAiExportMenu"'));
    assert.ok(html.includes('id="ytAiDownloadBtn"'));
    assert.ok(html.includes('id="ytAiSaveTxtBtn"'));
    assert.ok(html.includes('id="ytAiSaveJsonBtn"'));

    const domCard = WebAuditVisualRenderer.renderDomainSignalsCard({
      hostname: 'example.org', maxDepth: 2, hasRobotsTxt: true, sitemapUrlCount: 12,
      legalPages: [{ url: '/legal' }, { url: '/privacy' }], contacts: ['hello@example.org']
    }, 'fr');
    assert.ok(domCard.includes('yt-ai-axis-row'), 'Domain signals card must render visual coverage progress bars');

    const auditBox = { innerHTML: '' };
    const mdWithAxes = '[SCORE: 86/100]\n[AXES: Logic=88, Sources=82, Transparency=90, Facts=85]\n### Verdict\n| Critère | Preuve | Statut |\n|---|---|---|\n| HTTPS | Valide | Vérifié |';
    const score = WebAuditVisualRenderer.renderFinalAudit(auditBox, mdWithAxes, domCard, 'fr');
    assert.equal(score, 86);
    assert.ok(auditBox.innerHTML.includes('yt-ai-audit-radar-svg'), 'Web audit must render 4-axis SVG radar');
    assert.ok(auditBox.innerHTML.includes('yt-ai-axis-row'), 'Web audit must render criterion bars');
    assert.ok(auditBox.innerHTML.includes('yt-ai-pill-pass'), 'Table verdict cells must receive colored pills');

    // Off-screen hidden search drawer at top=-820 must NOT be shifted down onto the banner; visible z=2147483647 overlap gets clamped
    const hiddenOverlay = {
      tagName: 'DIV', dataset: {},
      style: { top: '', setProperty: (k, v) => { hiddenOverlay.style[k] = v; }, removeProperty: () => {} },
      getBoundingClientRect: () => ({ left: 0, top: -820, bottom: 0, width: 1366, height: 820 })
    };
    const activeMaxOverlay = {
      tagName: 'DIV', dataset: {},
      style: { zIndex: '', top: '', setProperty: (k, v) => { activeMaxOverlay.style[k] = v; }, removeProperty: () => {} },
      getBoundingClientRect: () => ({ left: 0, top: 0, bottom: 40, width: 1366, height: 40 })
    };
    const bannerContainer = {
      classList: { contains: (c) => c === 'yt-ai-webpage-mode' },
      isConnected: true,
      contains: () => false,
      getBoundingClientRect: () => ({ height: 45 }),
      style: { setProperty: () => {}, removeProperty: () => {} }
    };
    globalThis.document = {
      body: { style: { paddingTop: '' }, querySelectorAll: () => [hiddenOverlay, activeMaxOverlay] },
      querySelectorAll: () => []
    };
    globalThis.getComputedStyle = (el) => {
      if (el === hiddenOverlay) return { display: 'block', visibility: 'visible', opacity: '0', pointerEvents: 'auto', position: 'fixed', top: '0px', zIndex: '2147483647' };
      if (el === activeMaxOverlay) return { display: 'block', visibility: 'visible', opacity: '1', pointerEvents: 'auto', position: 'relative', top: 'auto', zIndex: '2147483647' };
      return { display: 'block', flexDirection: 'column' };
    };
    const shifter = new WebPageLayoutShifter();
    shifter._container = bannerContainer;
    shifter.sync();
    assert.equal(hiddenOverlay.dataset.ytAiOrigTop, undefined, 'Hidden/off-screen overlay must never be shifted onto banner');
    assert.equal(activeMaxOverlay.style['z-index'], '2147483646', 'Overlapping max z-index must be clamped below banner');
  });
});
