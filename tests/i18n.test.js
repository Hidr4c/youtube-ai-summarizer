import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { I18N } from '../src/locales/index.js';

describe('I18N Multi-Language Parity & Integrity', () => {
  const expectedLanguages = ['fr', 'en', 'es', 'de', 'it', 'ru', 'ja', 'zh'];

  it('supports all 8 required languages', () => {
    const definedLangs = Object.keys(I18N);
    for (const lang of expectedLanguages) {
      assert.ok(definedLangs.includes(lang), `Language "${lang}" must be defined in I18N`);
    }
  });

  const enKeys = Object.keys(I18N.en);

  it('guarantees key parity across all languages against English', () => {
    for (const lang of expectedLanguages) {
      const currentKeys = Object.keys(I18N[lang]);
      const missingKeys = enKeys.filter(k => !currentKeys.includes(k));
      assert.deepEqual(
        missingKeys,
        [],
        `Language "${lang}" is missing keys: ${missingKeys.join(', ')}`
      );
    }
  });

  it('all languages have non-empty essential UI strings', () => {
    const essentialKeys = [
      'brandName',
      'summarizeBtn',
      'collapse',
      'expand',
      'tabSummary',
      'tabChat',
      'tabTranscript',
      'formatQuick',
      'formatStandard',
      'formatDetailed',
      'tabSettingsModel',
      'tabSettingsAudio',
      'tabSettingsParams',
      'summaryTitle',
      'chatWelcome',
      'wordsBadge'
    ];

    for (const lang of expectedLanguages) {
      for (const k of essentialKeys) {
        const val = I18N[lang][k];
        assert.ok(
          typeof val === 'string' && val.trim().length > 0,
          `Key "${k}" in language "${lang}" must be a non-empty string`
        );
      }
    }
  });

  it('each language contains at least 4 prompt suggestion chips', () => {
    for (const lang of expectedLanguages) {
      const suggestions = I18N[lang].suggestions;
      assert.ok(
        Array.isArray(suggestions) && suggestions.length >= 4,
        `Language "${lang}" must have at least 4 suggestion chips`
      );
      for (const chip of suggestions) {
        assert.ok(chip.label && chip.label.length > 0, `Suggestion in "${lang}" must have a label`);
        assert.ok(chip.question && chip.question.length > 0, `Suggestion in "${lang}" must have a question`);
      }
    }
  });

  it('BannerView.applyLanguage updates all UI labels, buttons, headers and delegates to drawer', async () => {
    const { BannerView } = await import('../src/content/ui/BannerView.js');

    const domMap = new Map();
    const createEl = (id, tag = 'div') => {
      const el = {
        id,
        tagName: tag.toUpperCase(),
        textContent: '',
        innerHTML: '',
        value: '',
        placeholder: '',
        title: '',
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        }
      };
      domMap.set(id, el);
      return el;
    };

    [
      'ytAiLangSelect', 'ytAiBrandTitle', 'ytAiSummarizeBtn', 'ytAiToggleText', 'ytAiToggleIcon',
      'ytAiSettingsBtnText', 'ytAiTabSettingsModelBtn', 'ytAiTabSettingsAudioBtn', 'ytAiTabSettingsParamsBtn',
      'ytAiTabSummaryBtn', 'ytAiTabChatBtn', 'ytAiTabTranscriptBtn', 'ytAiSummaryHeaderTitle',
      'ytAiSpeakSummaryBtn', 'ytAiCopyBtn', 'ytAiDownloadBtn', 'ytAiSaveTxtBtn', 'ytAiSaveJsonBtn',
      'ytAiClearChatBtn', 'ytAiChatInput', 'ytAiMicBtn', 'ytAiSendChatBtn',
      'ytAiCopyTranscriptBtn', 'ytAiFooterBugLink', 'ytAiFooterDocsLink',
      'ytAiBadge', 'ytAiBadgeText', 'ytAiHeaderModelText', 'ytAiWordCount'
    ].forEach(id => createEl(id));

    const originalDoc = global.document;
    global.document = {
      getElementById: (id) => domMap.get(id) || null,
      querySelector: (sel) => {
        if (sel.includes('#ytAiSummaryHeaderTitle')) return domMap.get('ytAiSummaryHeaderTitle');
        if (sel.includes('#ytAiPaneChat')) return createEl('chatPaneSpan');
        if (sel.includes('#ytAiPaneTranscript')) return createEl('transPaneSpan');
        if (sel.includes('empty-title')) return createEl('emptyTitle');
        if (sel.includes('empty-subtitle')) return createEl('emptySub');
        return null;
      },
      querySelectorAll: () => []
    };

    const state = {
      currentLang: 'fr',
      currentProvider: 'lmstudio',
      serverUrls: { lmstudio: 'http://127.0.0.1:1234' },
      apiKeys: {},
      availableLocalModels: { lmstudio: ['qwen2.5-7b'] },
      getActiveModel: () => 'qwen2.5-7b'
    };

    let drawerLang = null;
    const mockSettingsDrawer = {
      applyLanguage: (lang) => { drawerLang = lang; }
    };

    const bannerView = new BannerView(state);

    // Test switching from French to Chinese (Simplified)
    bannerView.applyLanguage('zh', null, mockSettingsDrawer);
    assert.equal(state.currentLang, 'zh');
    assert.equal(drawerLang, 'zh', 'Must delegate to SettingsDrawer.applyLanguage');
    assert.equal(domMap.get('ytAiSummarizeBtn').textContent, I18N.zh.summarizeBtn);
    assert.equal(domMap.get('ytAiTabSummaryBtn').textContent, I18N.zh.tabSummary);
    assert.equal(domMap.get('ytAiSpeakSummaryBtn').textContent, I18N.zh.listenBtn);
    assert.equal(domMap.get('ytAiCopyBtn').textContent, I18N.zh.copyBtn);
    assert.equal(domMap.get('ytAiDownloadBtn').textContent, I18N.zh.saveMdBtn);
    assert.ok(domMap.get('ytAiSummaryHeaderTitle').textContent.includes(I18N.zh.summaryTitle));
    assert.ok(domMap.get('ytAiSummaryHeaderTitle').textContent.includes('LM STUDIO'));
    assert.equal(domMap.get('ytAiChatInput').placeholder, I18N.zh.chatPlaceholder);

    // Test switching from Chinese to Italian
    bannerView.applyLanguage('it', null, mockSettingsDrawer);
    assert.equal(state.currentLang, 'it');
    assert.equal(drawerLang, 'it');
    assert.equal(domMap.get('ytAiSummarizeBtn').textContent, I18N.it.summarizeBtn);
    assert.equal(domMap.get('ytAiTabSummaryBtn').textContent, I18N.it.tabSummary);
    assert.equal(domMap.get('ytAiSpeakSummaryBtn').textContent, I18N.it.listenBtn);
    assert.equal(domMap.get('ytAiCopyBtn').textContent, I18N.it.copyBtn);
    assert.equal(domMap.get('ytAiDownloadBtn').textContent, I18N.it.saveMdBtn);
    assert.ok(domMap.get('ytAiSummaryHeaderTitle').textContent.includes(I18N.it.summaryTitle));
    assert.ok(domMap.get('ytAiSummaryHeaderTitle').textContent.includes('LM STUDIO'));
    assert.equal(domMap.get('ytAiChatInput').placeholder, I18N.it.chatPlaceholder);

    global.document = originalDoc;
  });
});
