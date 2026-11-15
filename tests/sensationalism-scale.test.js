import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SensationalismScale } from '../src/domain/services/SensationalismScale.js';

describe('SensationalismScale', () => {
  it('classifies all 5 inverted severity levels across FR and EN', () => {
    const sober = SensationalismScale.getProfile(0, [], 'fr');
    const mild = SensationalismScale.getProfile(9, [], 'fr');
    const moderate = SensationalismScale.getProfile(22, [], 'en');
    const high = SensationalismScale.getProfile(38, [], 'fr');
    const clickbait = SensationalismScale.getProfile(74, [], 'en');

    assert.equal(sober.level, 'sober');
    assert.equal(sober.sweepDeg, 0);
    assert.equal(mild.level, 'mild');
    assert.equal(mild.index, 9);
    assert.ok(mild.sweepDeg >= 10);
    assert.equal(mild.label, 'Accroches légères');
    assert.equal(moderate.level, 'moderate');
    assert.equal(moderate.label, 'Moderate Hyperbole');
    assert.equal(high.level, 'high');
    assert.equal(clickbait.level, 'clickbait');
    assert.equal(clickbait.macroColor, 'danger');
  });

  it('computes exact per-video sensationalism bucket counts and percentages', () => {
    const videos = [
      { id: '1', clickbait: 2 },
      { id: '2', clickbait: 8 },
      { id: '3', clickbait: 15 },
      { id: '4', clickbait: 32 },
      { id: '5', clickbait: 85 }
    ];

    const profile = SensationalismScale.getProfile(28, videos, 'fr');
    assert.equal(profile.hasVideoBreakdown, true);
    assert.equal(profile.videoSampleCount, 5);
    assert.deepEqual(
      profile.buckets.map((b) => ({ id: b.id, count: b.count, pct: b.pct })),
      [
        { id: 'sober', count: 2, pct: 40 },
        { id: 'mild', count: 1, pct: 20 },
        { id: 'moderate', count: 1, pct: 20 },
        { id: 'high', count: 0, pct: 0 },
        { id: 'clickbait', count: 1, pct: 20 }
      ]
    );
  });

  it('omits per-video breakdown when videos lack numeric clickbait scores', () => {
    const profile = SensationalismScale.getProfile(12, [{ id: 'x', score: 85 }], 'fr');
    assert.equal(profile.hasVideoBreakdown, false);
    assert.equal(profile.videoSampleCount, 0);
    assert.equal(profile.markerPct, 12);
    assert.ok(profile.ringBackground.includes('conic-gradient'));
  });
});
