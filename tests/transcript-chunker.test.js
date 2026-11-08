import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TranscriptChunker } from '../src/services/implementations/TranscriptChunker.js';

describe('TranscriptChunker - Zero Loss Sequential Chunking', () => {
  it('returns single chunk when text fits within maxChars', () => {
    const text = '[00:00] Intro de la vidéo [01:30] Explication du sujet [04:00] Conclusion';
    const chunks = TranscriptChunker.splitIntoChunks({ fullText: text, maxChars: 500 });

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].index, 1);
    assert.equal(chunks[0].total, 1);
    assert.equal(chunks[0].text, text);
    assert.equal(chunks[0].startTimestamp, '00:00');
    assert.equal(chunks[0].endTimestamp, '04:00');
  });

  it('splits into timestamp-aware sequential chunks without losing text', () => {
    const text = [
      '[00:00] Premier point de la vidéo.',
      '[05:00] Deuxième point très détaillé avec des arguments.',
      '[10:00] Troisième point examinant les faits.',
      '[15:00] Conclusion et synthèse finale.'
    ].join(' ');

    // Max chars 60 to force chunking across timestamp boundaries
    const chunks = TranscriptChunker.splitIntoChunks({ fullText: text, maxChars: 65 });

    assert.ok(chunks.length > 1);
    assert.equal(chunks[0].index, 1);
    assert.equal(chunks[chunks.length - 1].index, chunks.length);

    // Reconstruct and verify zero words lost
    const reconstructed = chunks.map(c => c.text).join(' ');
    assert.ok(reconstructed.includes('Premier point'));
    assert.ok(reconstructed.includes('Deuxième point'));
    assert.ok(reconstructed.includes('Troisième point'));
    assert.ok(reconstructed.includes('Conclusion'));
  });

  it('handles empty or invalid text safely', () => {
    assert.deepEqual(TranscriptChunker.splitIntoChunks({ fullText: '' }), []);
    assert.deepEqual(TranscriptChunker.splitIntoChunks({ fullText: null }), []);
  });
});
