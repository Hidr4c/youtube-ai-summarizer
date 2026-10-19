const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contentJsPath = path.resolve(__dirname, '..', 'content.js');

function loadI18N() {
  const content = fs.readFileSync(contentJsPath, 'utf8');
  const match = content.match(/const I18N = (\{[\s\S]*?\n  \});/);
  assert.ok(match, 'I18N dictionary must exist in content.js');
  return eval('(' + match[1] + ')');
}

test('I18N Multi-Language Parity & Integrity', async (t) => {
  const I18N = loadI18N();
  const expectedLanguages = ['fr', 'en', 'es', 'de', 'it', 'ru', 'ja', 'zh'];

  await t.test('supports all 8 required languages', () => {
    const definedLangs = Object.keys(I18N);
    for (const lang of expectedLanguages) {
      assert.ok(definedLangs.includes(lang), `Language "${lang}" must be defined in I18N`);
    }
  });

  const enKeys = Object.keys(I18N.en);

  await t.test('guarantees key parity across all languages against English', () => {
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

  await t.test('all languages have non-empty essential UI strings', () => {
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

  await t.test('each language contains at least 4 prompt suggestion chips', () => {
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
