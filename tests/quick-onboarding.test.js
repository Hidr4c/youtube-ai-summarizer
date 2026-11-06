import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QuickOnboardingHelper } from '../src/content/services/QuickOnboardingHelper.js';

describe('QuickOnboardingHelper - 1-Click Account Linking & Onboarding', () => {
  describe('getQuickStartInfo', () => {
    it('returns Google Gemini 1-click free info in French and English', () => {
      const fr = QuickOnboardingHelper.getQuickStartInfo('gemini', 'fr');
      assert.ok(fr.url.includes('aistudio.google.com'));
      assert.ok(fr.label.includes('Gemini gratuite'));
      assert.ok(fr.hint.includes('100% gratuit'));

      const en = QuickOnboardingHelper.getQuickStartInfo('gemini', 'en');
      assert.ok(en.url.includes('aistudio.google.com'));
      assert.ok(en.label.includes('Free Gemini Key'));
      assert.ok(en.hint.includes('100% free'));
    });

    it('returns OpenRouter universal hub info in French and English', () => {
      const fr = QuickOnboardingHelper.getQuickStartInfo('openrouter', 'fr');
      assert.ok(fr.url.includes('openrouter.ai'));
      assert.ok(fr.label.includes('OpenRouter'));
      assert.ok(fr.hint.includes('GPT-4o'));

      const en = QuickOnboardingHelper.getQuickStartInfo('openrouter', 'en');
      assert.ok(en.url.includes('openrouter.ai'));
      assert.ok(en.label.includes('OpenRouter'));
      assert.ok(en.hint.includes('GPT-4o'));
    });

    it('returns Groq fast inference info in French and English', () => {
      const fr = QuickOnboardingHelper.getQuickStartInfo('groq', 'fr');
      assert.ok(fr.url.includes('groq.com'));
      assert.ok(fr.label.includes('Groq'));
      assert.ok(fr.hint.includes('Llama'));

      const en = QuickOnboardingHelper.getQuickStartInfo('groq', 'en');
      assert.ok(en.url.includes('groq.com'));
      assert.ok(en.label.includes('Groq'));
      assert.ok(en.hint.includes('Llama'));
    });

    it('returns general provider info for OpenAI, Claude, Mistral, Perplexity, Qwen', () => {
      const providers = ['openai', 'claude', 'mistral', 'perplexity', 'qwen'];
      for (const p of providers) {
        const infoFr = QuickOnboardingHelper.getQuickStartInfo(p, 'fr');
        assert.ok(infoFr.url.startsWith('https://'));
        assert.ok(infoFr.label.length > 0);
        assert.ok(infoFr.hint.length > 0);

        const infoEn = QuickOnboardingHelper.getQuickStartInfo(p, 'en');
        assert.ok(infoEn.url.startsWith('https://'));
        assert.ok(infoEn.label.length > 0);
        assert.ok(infoEn.hint.length > 0);
      }
    });

    it('falls back gracefully on unknown provider', () => {
      const info = QuickOnboardingHelper.getQuickStartInfo('unknown_ai', 'fr');
      assert.ok(info.url.includes('aistudio.google.com'));
      assert.ok(info.label.includes('UNKNOWN_AI'));
    });
  });

  describe('pasteApiKeyFromClipboard', () => {
    let mockInput;
    let originalDesc;

    beforeEach(() => {
      mockInput = { value: '' };
      originalDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    });

    afterEach(() => {
      if (originalDesc) {
        Object.defineProperty(globalThis, 'navigator', originalDesc);
      }
    });

    it('returns false if input element is missing', async () => {
      const res = await QuickOnboardingHelper.pasteApiKeyFromClipboard(null);
      assert.equal(res, false);
    });

    it('reads clipboard, trims string, and updates input & callback', async () => {
      let notifiedKey = null;
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            readText: async () => '   sk-ant-api-test-key-12345   '
          }
        },
        configurable: true,
        writable: true
      });

      const res = await QuickOnboardingHelper.pasteApiKeyFromClipboard(mockInput, (k) => {
        notifiedKey = k;
      });

      assert.equal(res, true);
      assert.equal(mockInput.value, 'sk-ant-api-test-key-12345');
      assert.equal(notifiedKey, 'sk-ant-api-test-key-12345');
    });

    it('returns false and does not notify if clipboard is empty', async () => {
      let notifiedKey = null;
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            readText: async () => '   '
          }
        },
        configurable: true,
        writable: true
      });

      const res = await QuickOnboardingHelper.pasteApiKeyFromClipboard(mockInput, (k) => {
        notifiedKey = k;
      });

      assert.equal(res, false);
      assert.equal(mockInput.value, '');
      assert.equal(notifiedKey, null);
    });

    it('handles clipboard read permission error gracefully', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            readText: async () => { throw new Error('NotAllowedError: Permission denied'); }
          }
        },
        configurable: true,
        writable: true
      });

      const res = await QuickOnboardingHelper.pasteApiKeyFromClipboard(mockInput);
      assert.equal(res, false);
      assert.equal(mockInput.value, '');
    });
  });

  describe('formatMissingKeyNotice', () => {
    it('generates HTML containing direct portal link and guidance', () => {
      const htmlFr = QuickOnboardingHelper.formatMissingKeyNotice('gemini', 'fr');
      assert.ok(htmlFr.includes('class="yt-ai-missing-key-card"'));
      assert.ok(htmlFr.includes('GEMINI'));
      assert.ok(htmlFr.includes('aistudio.google.com'));
      assert.ok(htmlFr.includes('⚡ Obtenir ma clé Gemini gratuite'));

      const htmlEn = QuickOnboardingHelper.formatMissingKeyNotice('openrouter', 'en');
      assert.ok(htmlEn.includes('OPENROUTER'));
      assert.ok(htmlEn.includes('openrouter.ai'));
      assert.ok(htmlEn.toLowerCase().includes('api key required'));
    });
  });

  describe('openExternalWebChat', () => {
    let openedUrl = null;
    let openedTarget = null;

    beforeEach(() => {
      openedUrl = null;
      openedTarget = null;
      global.window = {
        open: (url, target) => {
          openedUrl = url;
          openedTarget = target;
        }
      };
    });

    it('opens ChatGPT with encoded video prompt', () => {
      QuickOnboardingHelper.openExternalWebChat('chatgpt', 'Peux-tu résumer ce texte ?');
      assert.ok(openedUrl.startsWith('https://chatgpt.com/?q='));
      assert.ok(openedUrl.includes('Peux-tu'));
      assert.equal(openedTarget, '_blank');
    });

    it('opens Claude for destination claude', () => {
      QuickOnboardingHelper.openExternalWebChat('claude', 'Some prompt');
      assert.equal(openedUrl, 'https://claude.ai/new');
      assert.equal(openedTarget, '_blank');
    });
  });
  describe('testAndValidateKey', () => {
    let mockState;
    let originalChrome;

    beforeEach(() => {
      mockState = {
        currentLang: 'fr',
        serverUrls: {},
        keyVerified: {}
      };
      originalChrome = global.chrome;
    });

    afterEach(() => {
      global.chrome = originalChrome;
    });

    it('sets state to true and shows success banner when API ping succeeds', () => {
      let bannerMsg = null;
      let badgeUpdated = 0;

      global.chrome = {
        runtime: {
          sendMessage: (req, cb) => {
            cb({ success: true, latency: 135 });
          }
        }
      };

      QuickOnboardingHelper.testAndValidateKey({
        state: mockState,
        provider: 'gemini',
        key: 'AIzaTestValidKey',
        model: 'gemini-2.0-flash',
        showStatusBanner: (msg) => { bannerMsg = msg; },
        updateHeaderBadge: () => { badgeUpdated++; }
      });

      assert.equal(mockState.keyVerified.gemini, true);
      assert.ok(badgeUpdated >= 2);
      assert.ok(bannerMsg.includes('[✓]'));
      assert.ok(bannerMsg.includes('135ms'));
    });

    it('sets state to false and shows error banner when API ping fails', () => {
      let bannerMsg = null;
      let isErrorFlag = false;

      global.chrome = {
        runtime: {
          sendMessage: (req, cb) => {
            cb({ success: false, error: 'HTTP 401 Unauthorized' });
          }
        }
      };

      QuickOnboardingHelper.testAndValidateKey({
        state: mockState,
        provider: 'gemini',
        key: 'bad_key',
        model: 'gemini-2.0-flash',
        showStatusBanner: (msg, isErr) => {
          bannerMsg = msg;
          isErrorFlag = isErr;
        },
        updateHeaderBadge: () => {}
      });

      assert.equal(mockState.keyVerified.gemini, false);
      assert.equal(isErrorFlag, true);
      assert.ok(bannerMsg.includes('401'));
    });

    it('clears verification and returns early if key is empty', () => {
      mockState.keyVerified.gemini = true;
      let badgeCalled = false;

      QuickOnboardingHelper.testAndValidateKey({
        state: mockState,
        provider: 'gemini',
        key: '',
        model: 'gemini-2.0-flash',
        showStatusBanner: () => {},
        updateHeaderBadge: () => { badgeCalled = true; }
      });

      assert.equal(mockState.keyVerified.gemini, undefined);
      assert.equal(badgeCalled, true);
    });
  });
});
