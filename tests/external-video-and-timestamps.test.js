import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExternalVideoManager } from '../src/content/services/ExternalVideoManager.js';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';

describe('ExternalVideoManager - Multi-Video Context Specification', () => {
  it('extractYouTubeVideoIds extracts valid video IDs and ignores current video', () => {
    const manager = new ExternalVideoManager();
    const prompt = 'Regarde cette vidéo https://www.youtube.com/watch?v=dQw4w9WgXcQ et aussi https://youtu.be/jNQXAC9IVRw et ce short https://youtube.com/shorts/kJQP7kiw5Fk';
    const ids = manager.extractYouTubeVideoIds(prompt, 'dQw4w9WgXcQ');

    assert.deepStrictEqual(ids.sort(), ['jNQXAC9IVRw', 'kJQP7kiw5Fk'].sort());
  });

  it('extractYouTubeVideoIds returns empty array when no links or only current video is present', () => {
    const manager = new ExternalVideoManager();
    const prompt = 'Est-ce que cette vidéo https://www.youtube.com/watch?v=dQw4w9WgXcQ parle de musique ?';
    const ids = manager.extractYouTubeVideoIds(prompt, 'dQw4w9WgXcQ');

    assert.deepStrictEqual(ids, []);
  });

  it('formatExternalContextBlock condenses transcript and formats clean context', () => {
    const manager = new ExternalVideoManager();
    const externalVideos = [
      {
        videoId: 'jNQXAC9IVRw',
        title: 'Me at the zoo',
        author: 'jawed',
        fullText: 'All right, so here we are in front of the elephants.'
      }
    ];

    const block = manager.formatExternalContextBlock(externalVideos, 100);
    assert.match(block, /Me at the zoo/);
    assert.match(block, /jawed/);
    assert.match(block, /jNQXAC9IVRw/);
    assert.match(block, /elephants/);
  });
});

describe('SummaryViewController - Robust Timestamp Injection Safety Net', () => {
  it('preserves existing timestamps when already present in summary', () => {
    const original = `### 🎯 Points Clés\n- **[01:23] Sujet 1** : Explication.\n- **[03:45] Sujet 2** : Explication.`;
    const segments = [{ timestamp: '00:00', text: 'Introduction' }];
    const result = SummaryViewController.injectTimestampsIfMissing(original, segments);
    assert.strictEqual(result, original);
  });

  it('injects real clickable timestamps when LLM omits them from bullet points', () => {
    const rawMarkdown = `### 🎯 Points Clés\n- **Bourse en crise :** Les actions Nvidia chutent.\n- **Investissement massif :** Meta et Microsoft prévoient 740 milliards.`;
    const segments = [
      { timestamp: '00:45', text: 'bourse en crise actions nvidia chutent brutalement' },
      { timestamp: '02:30', text: 'investissement massif meta microsoft 740 milliards' }
    ];

    const enriched = SummaryViewController.injectTimestampsIfMissing(rawMarkdown, segments);
    assert.match(enriched, /-\s+\*\*\[00:45\]\s+Bourse en crise/);
    assert.match(enriched, /-\s+\*\*\[02:30\]\s+Investissement massif/);
  });

  it('falls back to chronological interpolation when keywords have zero overlap', () => {
    const rawMarkdown = `### 🎯 Points Clés\n- Point alpha sans mot clé\n- Point beta sans mot clé`;
    const segments = [
      { timestamp: '01:00', text: 'intro unrelated words' },
      { timestamp: '05:00', text: 'conclusion unrelated words' }
    ];

    const enriched = SummaryViewController.injectTimestampsIfMissing(rawMarkdown, segments);
    assert.match(enriched, /\[01:00\]/);
    assert.match(enriched, /\[05:00\]/);
  });

  it('injects timestamps even when LLM drops bullet dashes completely (e.g. unbulleted key points section)', () => {
    const rawMarkdown = `### ⚡ En Bref\nCF Moto dévoile sa nouvelle machine.\n\n### 🎯 Points Clés à Retenir\nLa V4 SR-RR est désormais réalité : moteur V4 et aérodynamique.\nÉdition carbone black dédiée à la piste : éléments en carbone.\nPrix estimé entre 20 000 euros.\n\n### 📌 Conclusion\nUne machine performante.`;
    const segments = [
      { timestamp: '01:15', text: 'la v4 sr-rr est désormais réalité moteur v4 et aérodynamique' },
      { timestamp: '03:40', text: 'édition carbone black piste éléments en carbone partout' },
      { timestamp: '06:20', text: 'prix estimé entre 20 000 euros' }
    ];

    const enriched = SummaryViewController.injectTimestampsIfMissing(rawMarkdown, segments);
    assert.match(enriched, /\[01:15\]/);
    assert.match(enriched, /\[03:40\]/);
    assert.match(enriched, /\[06:20\]/);
  });
});
