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

  await t.test('formatContextBlock formats channel info, subscribers, category, keywords and description', () => {
    const meta = {
      author: 'Tech Innovators',
      subscribers: '1.2M subscribers',
      category: 'Science & Technology',
      publishDate: '2024-05-12',
      keywords: ['AI', 'Tech', 'Hardware'],
      description: 'Official video description detailing projects and links: https://example.com'
    };

    const enBlock = builder.formatContextBlock(meta, 'en');
    assert.ok(enBlock.includes('VIDEO & CHANNEL CONTEXT:'));
    assert.ok(enBlock.includes('1.2M subscribers'));
    assert.ok(enBlock.includes('Science & Technology'));
    assert.ok(enBlock.includes('2024-05-12'));
    assert.ok(enBlock.includes('AI, Tech, Hardware'));
    assert.ok(enBlock.includes('Official video description'));

    const frBlock = builder.formatContextBlock(meta, 'fr');
    assert.ok(frBlock.includes('CONTEXTE DE LA VIDÉO & DE LA CHAÎNE :'));
    assert.ok(frBlock.includes('Abonnés chaîne : 1.2M subscribers'));
    assert.ok(frBlock.includes('Catégorie : Science & Technology'));
  });

  await t.test('formatContextBlock cleanly caps extra-long descriptions', () => {
    const longDesc = 'A'.repeat(3000);
    const block = builder.formatContextBlock({ description: longDesc }, 'fr');
    assert.ok(block.includes('description condensée'));
    assert.ok(block.length < 2500, 'Context block must cap excessive descriptions');
  });

  await t.test('buildSummaryPrompts injects video context into user prompt', () => {
    const extraContext = {
      subscribers: '500k',
      category: 'Education',
      description: 'Useful links: https://github.com/test'
    };
    const { userPrompt } = builder.buildSummaryPrompts(
      'Advanced Architecture',
      'Code Mastery',
      'Today we discuss Clean Architecture.',
      'fr',
      'standard',
      '',
      extraContext
    );

    assert.ok(userPrompt.includes('CONTEXTE DE LA VIDÉO & DE LA CHAÎNE :'));
    assert.ok(userPrompt.includes('500k'));
    assert.ok(userPrompt.includes('Education'));
    assert.ok(userPrompt.includes('https://github.com/test'));
  });

  await t.test('buildChatPrompts injects video context and guides AI to use description', () => {
    const extraContext = {
      subscribers: '300k',
      category: 'Programming',
      description: 'Check out the repository here: https://github.com/Hidr4c/test'
    };
    const { systemPrompt } = builder.buildChatPrompts(
      'Clean Code Tutorial',
      'In this tutorial we write tests first.',
      'en',
      [],
      'Where is the github link?',
      extraContext
    );

    assert.ok(systemPrompt.includes('VIDEO & CHANNEL CONTEXT:'));
    assert.ok(systemPrompt.includes('https://github.com/Hidr4c/test'));
    assert.ok(systemPrompt.includes('video transcript and the provided official video context'));
    assert.ok(systemPrompt.includes('Always answer in English.'));
  });
});
