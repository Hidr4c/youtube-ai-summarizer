const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contentJsPath = path.resolve(__dirname, '..', 'content.js');

function loadPromptHelpers() {
  const content = fs.readFileSync(contentJsPath, 'utf8');

  const condenseMatch = content.match(/function condenseTranscriptForContext\([\s\S]*?\n  \}/);
  assert.ok(condenseMatch, 'condenseTranscriptForContext must exist in content.js');

  const buildPromptsMatch = content.match(/function buildPrompts\([\s\S]*?\n  \}/);
  assert.ok(buildPromptsMatch, 'buildPrompts must exist in content.js');

  global.customPrompt = '';
  const condenseTranscriptForContext = eval('(' + condenseMatch[0] + ')');
  const buildPrompts = eval('(' + buildPromptsMatch[0] + ')');

  return { condenseTranscriptForContext, buildPrompts };
}

test('Prompt Generation & Context Compression', async (t) => {
  const { condenseTranscriptForContext, buildPrompts } = loadPromptHelpers();

  await t.test('condenseTranscriptForContext keeps short transcripts intact', () => {
    const text = 'This is a short transcript that fits easily within limits.';
    const result = condenseTranscriptForContext(text, 1000);
    assert.equal(result, text);
  });

  await t.test('condenseTranscriptForContext performs smart 3-part condensation when limit is exceeded', () => {
    const longText = 'A'.repeat(500) + 'B'.repeat(500) + 'C'.repeat(500);
    const maxChars = 300;
    const result = condenseTranscriptForContext(longText, maxChars);

    assert.ok(result.length < longText.length, 'Result must be shorter than original');
    assert.ok(result.includes('[... Progression de la vidéo condensée'), 'Must include continuation marker');
    assert.ok(result.startsWith('A'), 'Must preserve start of transcript');
    assert.ok(result.endsWith('C'), 'Must preserve end of transcript');
  });

  await t.test('buildPrompts generates proper system and user prompts for quick mode', () => {
    const title = 'Zelda Secrets Unveiled';
    const author = 'Game Theorist';
    const transcript = 'Welcome back everyone. Today we analyze hidden lore in Hyrule.';
    const { systemPrompt, userPrompt } = buildPrompts(title, author, transcript, 'en', 'quick');

    assert.ok(/english/i.test(systemPrompt), 'System prompt must require English output');
    assert.ok(userPrompt.includes(title), 'User prompt must include video title');
    assert.ok(userPrompt.includes(author), 'User prompt must include video author');
    assert.ok(userPrompt.includes(transcript), 'User prompt must include transcript');
    assert.ok(/quick|points/i.test(userPrompt), 'Prompt must specify quick format');
  });

  await t.test('buildPrompts respects language selection', () => {
    const { systemPrompt: frPrompt } = buildPrompts('Titre', 'Auteur', 'Texte', 'fr', 'standard');
    assert.ok(/fran[çc]ais/i.test(frPrompt), 'System prompt must require French when lang is fr');

    const { systemPrompt: jaPrompt } = buildPrompts('Titre', 'Auteur', 'Texte', 'ja', 'standard');
    assert.ok(/日本語|japanese/i.test(jaPrompt), 'System prompt must require Japanese when lang is ja');
  });
});
