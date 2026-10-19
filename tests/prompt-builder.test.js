import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptBuilder } from '../src/services/implementations/PromptBuilder.js';

const builder = new PromptBuilder();

test('Prompt Generation & Context Compression', async (t) => {
  await t.test('condenseTranscript keeps short transcripts intact', () => {
    const text = 'This is a short transcript that fits easily within limits.';
    const result = builder.condenseTranscript(text, 1000);
    assert.equal(result, text);
  });

  await t.test('condenseTranscript performs smart 3-part condensation when limit is exceeded', () => {
    const longText = 'A'.repeat(500) + 'B'.repeat(500) + 'C'.repeat(500);
    const maxChars = 300;
    const result = builder.condenseTranscript(longText, maxChars);

    assert.ok(result.length < longText.length, 'Result must be shorter than original');
    assert.ok(result.includes('[... Progression de la vidéo condensée'), 'Must include continuation marker');
    assert.ok(result.startsWith('A'), 'Must preserve start of transcript');
    assert.ok(result.endsWith('C'), 'Must preserve end of transcript');
  });

  await t.test('buildSummaryPrompts generates proper system and user prompts for quick mode', () => {
    const title = 'Zelda Secrets Unveiled';
    const author = 'Game Theorist';
    const transcript = 'Welcome back everyone. Today we analyze hidden lore in Hyrule.';
    const { systemPrompt, userPrompt } = builder.buildSummaryPrompts(title, author, transcript, 'en', 'quick');

    assert.ok(/english/i.test(systemPrompt), 'System prompt must require English output');
    assert.ok(userPrompt.includes(title), 'User prompt must include video title');
    assert.ok(userPrompt.includes(author), 'User prompt must include video author');
    assert.ok(userPrompt.includes(transcript), 'User prompt must include transcript');
    assert.ok(/quick|points/i.test(userPrompt), 'Prompt must specify quick format');
  });

  await t.test('buildSummaryPrompts respects language selection', () => {
    const { systemPrompt: frPrompt } = builder.buildSummaryPrompts('Titre', 'Auteur', 'Texte', 'fr', 'standard');
    assert.ok(/fran[çc]ais/i.test(frPrompt), 'System prompt must require French when lang is fr');

    const { systemPrompt: jaPrompt } = builder.buildSummaryPrompts('Titre', 'Auteur', 'Texte', 'ja', 'standard');
    assert.ok(/日本語|japanese/i.test(jaPrompt), 'System prompt must require Japanese when lang is ja');
  });
});
