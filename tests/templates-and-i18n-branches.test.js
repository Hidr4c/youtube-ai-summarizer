import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { I18N } from '../src/locales/index.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { SettingsDrawerTemplate } from '../src/content/templates/SettingsDrawerTemplate.js';
import { ChannelCompanionTemplate } from '../src/content/ui/ChannelCompanionTemplate.js';
import { BannerI18n } from '../src/content/ui/BannerI18n.js';
import { SettingsDrawerI18n } from '../src/content/ui/SettingsDrawerI18n.js';
import { ChannelCompanionI18n } from '../src/content/ui/ChannelCompanionI18n.js';

function makeNode(id = '') {
  const classes = new Set();
  const attrs = {};
  const listeners = {};
  const childMap = new Map();
  let _innerHTML = '';
  const node = {
    id,
    title: '',
    value: '',
    textContent: '',
    placeholder: '',
    label: '',
    disabled: false,
    open: false,
    outerHTML: `<span class="yt-ai-tab-count-badge">88</span>`,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, force) => (force === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (force ? classes.add(c) : classes.delete(c))),
      contains: (c) => classes.has(c)
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => attrs[k] ?? null,
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    click: () => (listeners.click || []).forEach(fn => fn({ preventDefault() {} })),
    focus: () => {},
    querySelector: (sel) => childMap.get(sel) || null,
    querySelectorAll: (sel) => childMap.get('ALL:' + sel) || [],
    _setChild: (sel, child) => { childMap.set(sel, child); },
    _setChildren: (sel, list) => { childMap.set('ALL:' + sel, list); },
    get innerHTML() { return _innerHTML; },
    set innerHTML(val) { _innerHTML = String(val); }
  };
  return node;
}

function createFullMockDom() {
  const byId = new Map();
  const qMap = new Map();
  const qAllMap = new Map();
  const ensureId = (id) => {
    if (!byId.has(id)) byId.set(id, makeNode(id));
    return byId.get(id);
  };

  const doc = {
    title: 'Sample Video - YouTube',
    getElementById: (id) => byId.get(id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#') && !sel.includes(' ')) return byId.get(sel.slice(1)) || null;
      return qMap.get(sel) || null;
    },
    querySelectorAll: (sel) => qAllMap.get(sel) || [],
    createElement: (tag) => makeNode(tag)
  };
  return { doc, byId, qMap, qAllMap, ensureId };
}

function populateBannerDom(dom) {
  const ids = [
    'ytAiLangSelect', 'ytAiModeSelect', 'ytAiBrandTitle', 'ytAiSummarizeBtn',
    'ytAiToggleBtn', 'ytAiToggleText', 'ytAiToggleIcon', 'ytAiStopSummaryBtn',
    'ytAiSettingsToggleBtn', 'ytAiSettingsBtnText', 'ytAiTabSummaryBtn', 'ytAiTabAuditBtn',
    'ytAiTabChannelAuditBtn', 'ytAiTabChatBtn', 'ytAiChatCount', 'ytAiTabTranscriptBtn',
    'ytAiWordCount', 'ytAiSummaryHeaderTitle', 'ytAiSpeakSummaryBtn', 'ytAiCopyBtn',
    'ytAiDownloadBtn', 'ytAiSaveTxtBtn', 'ytAiSaveJsonBtn', 'ytAiReasoningTitle',
    'ytAiReasoningStatus', 'ytAiRetrySummarizeBtn', 'ytAiChatInput', 'ytAiSendChatBtn',
    'ytAiClearChatBtn', 'ytAiMicBtn', 'ytAiAuditHeaderTitle', 'ytAiRunAuditBtn',
    'ytAiAuditChatDiscussBtn', 'ytAiCopyAuditBtn', 'ytAiTranscriptHeaderTitle',
    'ytAiTranscriptWordsLabel', 'ytAiCopyTranscriptBtn', 'ytAiTranscriptBody',
    'ytAiFooterAuthor', 'ytAiFooterBy', 'ytAiTabSettingsModelBtn', 'ytAiTabSettingsParamsBtn',
    'ytAiTabSettingsAudioBtn', 'ytAiSettingsCloseBtn', 'ytAiProviderLabel', 'ytAiOptGroupLocal',
    'ytAiOptGroupFast', 'ytAiOptGroupCloud', 'ytAiServerLabel', 'ytAiRefreshModelsBtn',
    'ytAiApiKeyLabel', 'ytAiApiKeyInput', 'ytAiPasteApiKeyBtn', 'ytAiGetApiKeyLink',
    'ytAiModelLabel', 'ytAiTestModelBtn', 'ytAiTempLabel', 'ytAiTemperatureSelect',
    'ytAiMaxTokensLabel', 'ytAiMaxTokensSelect', 'ytAiAutoSummarizeLabel',
    'ytAiCustomPromptLabel', 'ytAiCustomPromptInput', 'ytAiVoiceLabel', 'ytAiTtsSpeedLabel',
    'ytAiTtsSpeedSelect', 'ytAiMicLabel', 'ytAiWhisperUrlLabel', 'ytAiWhisperUrlInput',
    'ytAiTestWhisperBtn', 'ytAiWatchChannelTitle', 'ytAiWatchChannelMaxVideos',
    'ytAiWatchChannelResultContainer', 'ytAiWatchChannelProgress', 'ytAiRunWatchChannelAuditBtn',
    'ytAiAuditChannelBtn', 'ytAiAuditProgressContainer', 'ytAiAuditBody', 'ytAiAuditVideoView'
  ];
  ids.forEach((id) => dom.ensureId(id));

  const modeSel = dom.ensureId('ytAiModeSelect');
  ['option[value="quick"]', 'option[value="standard"]', 'option[value="detailed"]'].forEach((s) => modeSel._setChild(s, makeNode()));
  const tempSel = dom.ensureId('ytAiTemperatureSelect');
  ['0.0', '0.3', '0.7', '1.0'].forEach((v) => tempSel._setChild(`option[value="${v}"]`, makeNode()));
  const tokSel = dom.ensureId('ytAiMaxTokensSelect');
  ['auto', '1024', '2048', '4096', '8192'].forEach((v) => tokSel._setChild(`option[value="${v}"]`, makeNode()));
  const spdSel = dom.ensureId('ytAiTtsSpeedSelect');
  ['0.75', '1.0', '1.25', '1.5', '2.0'].forEach((v) => spdSel._setChild(`option[value="${v}"]`, makeNode()));

  dom.qMap.set('#ytAiServerSelect option[value="custom"]', makeNode());
  dom.qMap.set('#ytAiModelSelect option[value=""]', makeNode());
  dom.qMap.set('#ytAiVoiceSelect option[value=""]', makeNode());
  dom.qMap.set('#ytAiMicSelect option[value=""]', makeNode());
  dom.qMap.set('.yt-ai-chat-suggestions', makeNode());
  dom.qMap.set('#ytAiPaneChat .yt-ai-pane-title span', makeNode());
  dom.qMap.set('#ytAiAuditBody .yt-ai-placeholder-text', makeNode());
  dom.qMap.set('#ytAiPaneChannelAudit .yt-ai-period-label', makeNode());
  dom.qMap.set('#ytAiPaneChannelAudit .yt-ai-max-label', makeNode());
  dom.qMap.set('#ytAiWatchChannelProgress .yt-ai-progress-stop', makeNode());
  dom.qMap.set('#ytAiAuditProgressContainer', dom.ensureId('ytAiAuditProgressContainer'));

  const pills = ['all', 'year', '6months', 'month'].map((p) => {
    const pill = makeNode();
    pill.setAttribute('data-period', p);
    return pill;
  });
  dom.qAllMap.set('#ytAiPaneChannelAudit .yt-ai-period-pill', pills);
}

describe('Templates, I18N Coordinators & WatchChannelAuditHelper Branch Coverage', () => {
  it('renders BannerTemplate, SettingsDrawerTemplate, and ChannelCompanionTemplate with both empty and localized dicts', () => {
    const drawerDefault = SettingsDrawerTemplate.render({});
    assert.ok(drawerDefault.includes('Loading...'));
    const drawerLocalized = SettingsDrawerTemplate.render(I18N.fr, { initialOptionHtml: '<option value="m1">m1</option>', initialModelLabel: 'm1' });
    assert.ok(drawerLocalized.includes('m1'));

    const bannerEmpty = BannerTemplate.render({}, { currentMode: '', currentLang: 'en' });
    assert.ok(bannerEmpty.includes('Key takeaways'));
    const bannerDetailed = BannerTemplate.render({ suggestions: [{ label: 'Q"1', question: 'Why "now"?' }] }, { currentMode: 'detailed', currentLang: 'fr' });
    assert.ok(bannerDetailed.includes('selected'));

    const compFr = ChannelCompanionTemplate.render({ channelIdentifier: '@Test', isFr: true, lang: null, maxVideos: 30, isExpanded: true });
    assert.ok(compFr.includes('@Test'));
    const compEnFallback = ChannelCompanionTemplate.render({ channelIdentifier: '@Fallback', isFr: false, lang: 'unknown_lang', maxVideos: 'all', totalVideos: 120, isExpanded: false, version: '1.5.1' });
    assert.ok(compEnFallback.includes('Expand') || compEnFallback.includes('v1.5.1'));
  });

  it('exercises BannerI18n & SettingsDrawerI18n with populated DOM, empty-node fallbacks, and partial I18N', () => {
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    I18N.xx_partial = {};
    try {
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=abc123def45') };
      const dom = createFullMockDom();
      populateBannerDom(dom);
      globalThis.document = dom.doc;

      // Branch 1: stopped note + generating state + badge present + footer without ytAiFooterBy
      dom.byId.delete('ytAiFooterBy');
      dom.ensureId('ytAiTabAuditBtn')._setChild('.yt-ai-tab-count-badge', makeNode());
      dom.ensureId('ytAiTranscriptBody')._setChild('.yt-ai-placeholder-text', makeNode());
      dom.qMap.set('#ytAiSummaryBody .yt-ai-stopped-note', makeNode());

      const state = { currentLang: 'en', channelAuditMaxVideos: 30 };
      BannerI18n.applyLanguage('xx_partial', state, { isGenerating: true, renderSummaryEmptyState() {} }, null, true, null);
      assert.equal(state.currentLang, 'xx_partial');

      // Branch 2: placeholder text branch + custom controllers + collapsed state + footerBy present
      dom.ensureId('ytAiFooterBy');
      dom.ensureId('ytAiTabAuditBtn')._setChild('.yt-ai-tab-count-badge', null);
      dom.qMap.delete('#ytAiSummaryBody .yt-ai-stopped-note');
      dom.qMap.set('#ytAiSummaryBody .yt-ai-placeholder-text', makeNode());
      dom.byId.delete('ytAiRetrySummarizeBtn');
      dom.ensureId('ytAiTranscriptBody')._setChild('.yt-ai-placeholder-text', null);
      dom.ensureId('ytAiTranscriptBody')._setChild('.yt-ai-loading', Object.assign(makeNode(), { textContent: 'Loading...' }));

      let auditLangCalled = false;
      let summaryLangCalled = false;
      let chatLangCalled = false;
      BannerI18n.applyLanguage(
        'fr',
        state,
        { isGenerating: false, fullSummaryMarkdown: '', applyLanguage: () => { summaryLangCalled = true; }, renderSummaryEmptyState() {} },
        { applyLanguage: () => { chatLangCalled = true; } },
        false,
        { applyLanguage: () => { auditLangCalled = true; } }
      );
      assert.equal(summaryLangCalled, true);
      assert.equal(chatLangCalled, true);
      assert.equal(auditLangCalled, true);

      // Branch 3: completely empty DOM handles missing nodes gracefully
      globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
      SettingsDrawerI18n.applyLanguage('en');
      BannerI18n.applyLanguage('en', {});
    } finally {
      delete I18N.xx_partial;
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  it('exercises ChannelCompanionI18n language synchronization branches', () => {
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    I18N.xx_partial = {};
    try {
      globalThis.window = { location: new URL('https://www.youtube.com/watch?v=vid99') };
      const dom = createFullMockDom();
      populateBannerDom(dom);
      globalThis.document = dom.doc;

      ChannelCompanionI18n.applyLanguage('en', null);

      const compRoot = dom.ensureId('yt-ai-channel-companion');
      ['#ytAiCompBrandTitle', '#ytAiBrandToggle', '#ytAiCompLangSelect', '#ytAiRunChannelAuditBtn',
        '#ytAiCompanionSettingsBtn', '#ytAiCompSettingsBtnText', '#ytAiCompanionToggleBtn',
        '#ytAiCompToggleText', '#ytAiCompToggleIcon', '#ytAiChanTabAuditBtn', '#ytAiChanTabChatBtn',
        '#ytAiChannelChatCount', '#ytAiCompDesc', '.yt-ai-period-label', '.yt-ai-max-label',
        '#ytAiCompanionMaxVideos', '#ytAiChannelProgress', '#ytAiChannelResultContainer',
        '.yt-ai-chat-suggestions', '.yt-ai-welcome-bubble', '#ytAiChannelChatInput',
        '#ytAiChannelMicBtn', '#ytAiChannelSendChatBtn', '#ytAiChannelClearChatBtn'
      ].forEach((sel) => compRoot._setChild(sel, dom.ensureId(sel.replace(/^#/, ''))));
      compRoot._setChildren('.yt-ai-period-pill', dom.qAllMap.get('#ytAiPaneChannelAudit .yt-ai-period-pill'));

      compRoot.querySelector('#ytAiChannelProgress')._setChild('.yt-ai-progress-stop', makeNode());
      dom.ensureId('ytAiChannelResultContainer')._setChild('.yt-ai-channel-audit-wrapper', makeNode());

      let renderedReportCount = 0;
      const card = {
        state: { currentLang: 'en', channelAuditMaxVideos: 30 },
        currentChannel: '@Creator',
        isExpanded: false,
        knownTotalVideos: 40,
        service: { isAuditRunning: () => false },
        viewController: { lastReport: { score: 85 }, renderReport: () => { renderedReportCount++; } },
        channelChat: { chatHistory: [] }
      };

      ChannelCompanionI18n.applyLanguage('xx_partial', card);
      assert.equal(renderedReportCount, 1);

      card.service.isAuditRunning = () => true;
      card.isExpanded = true;
      card.channelChat.chatHistory = [{ role: 'user', content: 'hi' }];
      ChannelCompanionI18n.applyLanguage('fr', card);
    } finally {
      delete I18N.xx_partial;
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });
});
