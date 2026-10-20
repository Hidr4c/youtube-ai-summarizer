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
});
