import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CaptionTrackPrioritizer } from '../src/parsers/CaptionTrackPrioritizer.js';

describe('CaptionTrackPrioritizer', () => {
  it('prioritizes exact language match first, then prefix, then en-manual, then en-asr, then others', () => {
    const tracks = [
      { languageCode: 'pt', kind: undefined, baseUrl: 'http://pt' },
      { languageCode: 'en', kind: 'asr', baseUrl: 'http://en-asr' },
      { languageCode: 'es', kind: undefined, baseUrl: 'http://es' },
      { languageCode: 'en', kind: undefined, baseUrl: 'http://en-manual' },
      { languageCode: 'fr-CA', kind: undefined, baseUrl: 'http://fr-ca' },
      { languageCode: 'fr', kind: 'asr', baseUrl: 'http://fr-asr' },
      { languageCode: 'fr', kind: undefined, baseUrl: 'http://fr-manual' }
    ];

    const ordered = CaptionTrackPrioritizer.prioritizeTracks(tracks, 'fr');
    assert.equal(ordered.length, 7);
    assert.equal(ordered[0].baseUrl, 'http://fr-manual', 'Exact non-ASR preferred lang should be first');
    assert.equal(ordered[1].baseUrl, 'http://fr-asr', 'Exact ASR preferred lang should be second');
    assert.equal(ordered[2].baseUrl, 'http://fr-ca', 'Prefix match should follow');
    assert.equal(ordered[3].baseUrl, 'http://en-manual', 'English manual should follow');
    assert.equal(ordered[4].baseUrl, 'http://en-asr', 'English ASR should follow');
  });

  it('handles empty, null or invalid input gracefully', () => {
    assert.deepEqual(CaptionTrackPrioritizer.prioritizeTracks([]), []);
    assert.deepEqual(CaptionTrackPrioritizer.prioritizeTracks(null), []);
    assert.deepEqual(CaptionTrackPrioritizer.prioritizeTracks([{}]), []);
  });
});
