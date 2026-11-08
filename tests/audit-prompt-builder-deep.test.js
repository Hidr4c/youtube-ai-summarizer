import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';

describe('AuditPromptBuilder - Deep Multilingual & Directive Integrity Gate', () => {
  it('supports all 8 official languages with tailored linguistic persona', () => {
    const langs = ['fr', 'en', 'es', 'de', 'it', 'ru', 'ja', 'zh'];
    const expectedKeywords = {
      fr: 'FRANÇAIS',
      en: 'ENGLISH',
      es: 'ESPAÑOL',
      de: 'DEUTSCH',
      it: 'ITALIANO',
      ru: 'РУССКОМ',
      ja: '日本語',
      zh: '中文'
    };

    for (const l of langs) {
      const prompt = AuditPromptBuilder.buildSystemPrompt(l);
      assert.ok(prompt.includes(expectedKeywords[l]), `Prompt for ${l} should contain ${expectedKeywords[l]}`);
      assert.ok(prompt.includes('[SCORE: XX/100]'), 'Every prompt must enforce standard score format');
    }
  });

  it('falls back to English persona when an unsupported language code is passed', () => {
    const prompt = AuditPromptBuilder.buildSystemPrompt('unsupported_lang');
    assert.ok(prompt.includes('ENGLISH'));
    assert.ok(prompt.includes('REAL-WORLD TEMPORAL REFERENCE'));
  });

  it('anchors dynamically to contemporary year and prevents obsolete static dates', () => {
    const currentYear = String(new Date().getFullYear());
    const promptFr = AuditPromptBuilder.buildSystemPrompt('fr');
    const promptEn = AuditPromptBuilder.buildSystemPrompt('en');

    assert.ok(promptFr.includes(currentYear), 'French prompt must contain current year');
    assert.ok(promptEn.includes(currentYear), 'English prompt must contain current year');

    // Never contain hardcoded static years from the past
    assert.equal(promptFr.includes('2020'), false);
    assert.equal(promptFr.includes('2021'), false);
    assert.equal(promptFr.includes('2022'), false);
  });

  it('enforces nuanced stance: normal for creators to earn a living with transparency', () => {
    const prompt = AuditPromptBuilder.buildSystemPrompt('fr');
    assert.ok(prompt.includes('Transparence et discernement'));
    assert.ok(prompt.includes("le mal n'est pas partout"));
    assert.ok(prompt.includes('sponsors, partenariats commerciaux, vente de ses propres ouvrages'));
    assert.ok(prompt.includes('Distingue avec subtilité une argumentation honnête et vérifiée d\'un discours marketing répété'));
  });

  it('enforces objective verification: author claims of honesty are not taken at face value', () => {
    const prompt = AuditPromptBuilder.buildSystemPrompt('fr');
    assert.ok(prompt.includes('Posture déclarative vs Preuve réelle'));
    assert.ok(prompt.includes('ne prends jamais les déclarations d\'honnêteté de l\'auteur pour argent comptant'));
    assert.ok(prompt.includes('C\'est à toi d\'évaluer son honnêteté réelle'));
  });

  it('forbids penalizing the creator when platform subtitles are unavailable due to technical reasons', () => {
    const prompt = AuditPromptBuilder.buildSystemPrompt('fr');
    assert.ok(prompt.includes('Zéro malus pour contrainte technique'));
    assert.ok(prompt.includes('STRICTEMENT INTERDIT de pénaliser le créateur'));
  });

  it('builds full user prompt with metadata, official description, and community feedback', () => {
    const userPrompt = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: '[01:15] Explication détaillée du fonctionnement du moteur.',
      videoMeta: {
        title: 'Comprendre les moteurs thermiques',
        author: 'Science Énergie',
        publishDate: '2026-10-15',
        description: 'Retrouvez mon livre "L\'Énergie en clair" sur le site officiel.'
      },
      commentsBlock: '- @SpectateurA : Excellente vulgarisation !\n- @SpectateurB : Erreur possible à 03:20 ?',
      lang: 'fr',
      isDialogue: true
    });

    assert.ok(userPrompt.includes('Comprendre les moteurs thermiques'));
    assert.ok(userPrompt.includes('Science Énergie'));
    assert.ok(userPrompt.includes('L\'Énergie en clair'));
    assert.ok(userPrompt.includes('Excellente vulgarisation'));
    assert.ok(userPrompt.includes('TRANSCRIPTION DES DIALOGUES DE LA VIDÉO'));
    assert.ok(userPrompt.includes('Explication détaillée'));
  });

  it('adapts user prompt when subtitles are missing or non-dialogue (structural chapters)', () => {
    const userPrompt = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: '[00:00] Intro\n[05:00] Test routier\n[10:00] Bilan',
      videoMeta: {
        title: 'Essai Sans Paroles',
        author: 'Moto Silencieuse'
      },
      commentsBlock: '',
      lang: 'fr',
      isDialogue: false
    });

    assert.ok(userPrompt.includes('CHAPITRAGE & CONTENU DE LA DESCRIPTION'));
    assert.ok(userPrompt.includes('contrainte technique externe'));
    assert.ok(userPrompt.includes('STRICTEMENT INTERDIT de baisser la note'));
    assert.ok(userPrompt.includes('Test routier'));
    assert.equal(userPrompt.includes('TRANSCRIPTION DES DIALOGUES DE LA VIDÉO'), false);
  });
});
