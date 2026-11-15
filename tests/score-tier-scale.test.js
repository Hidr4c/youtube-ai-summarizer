import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScoreTierScale, SCORE_TIERS_5PCT } from '../src/domain/services/ScoreTierScale.js';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';
import { AuditReport } from '../src/domain/models/AuditReport.js';

describe('Granular 5%-Stepped Audit Scoring Scale & Distribution', () => {
  it('defines 20 contiguous 5% brackets covering 0 to 100 without gaps', () => {
    assert.equal(SCORE_TIERS_5PCT.length, 20);
    for (let s = 0; s <= 100; s++) {
      const tier = ScoreTierScale.getTier(s, 'fr');
      assert.equal(typeof tier.label, 'string');
      assert.match(tier.hexColor, /^#[0-9a-f]{6}$/i);
      assert.ok(s >= tier.min && s <= tier.max, `Score ${s} must lie inside [${tier.min}, ${tier.max}]`);
    }
  });

  it('clearly distinguishes 76% from 95% by bracket, hex color, and French/English label', () => {
    const t76Fr = ScoreTierScale.getTier(76, 'fr');
    const t95Fr = ScoreTierScale.getTier(95, 'fr');
    const t76En = ScoreTierScale.getTier(76, 'en');
    const t95En = ScoreTierScale.getTier(95, 'en');

    assert.equal(t76Fr.rangeLabel, '75–79%');
    assert.equal(t95Fr.rangeLabel, '95–100%');
    assert.notEqual(t76Fr.hexColor, t95Fr.hexColor);
    assert.notEqual(t76Fr.label, t95Fr.label);
    assert.notEqual(t76En.label, t95En.label);
    assert.equal(t76Fr.macroColor, 'success');
    assert.equal(t95Fr.macroColor, 'success');
  });

  it('computes 20-bin 5% histogram, exact median, stdDev, and consistency profile', () => {
    const homogenous = ScoreTierScale.computeDistributionMetrics([
      { score: 86 }, { score: 87 }, { score: 88 }, { score: 89 }
    ], 'fr');
    assert.equal(homogenous.bins.length, 20);
    assert.equal(homogenous.bins[17].count, 4); // 85-89% bin
    assert.equal(homogenous.bins[17].pct, 100);
    assert.equal(homogenous.median, 88);
    assert.equal(homogenous.consistencyLevel, 'high');
    assert.ok(homogenous.consistencyLabel.includes('σ ='));

    const volatile = ScoreTierScale.computeDistributionMetrics([
      { score: 25 }, { score: 50 }, { score: 92 }, { score: 96 }, { score: 31 }
    ], 'en');
    assert.equal(volatile.median, 50);
    assert.equal(volatile.consistencyLevel, 'volatile');
    assert.equal(volatile.minScore, 25);
    assert.equal(volatile.maxScore, 96);
  });

  it('parses multi-batch [EVAL_VIDEOS] blocks into ChannelAuditReport with fineDistribution', () => {
    const raw = `
[EVAL_VIDEOS]
1 | 96 | 4% | Fiable | Excellent dossier source
2 | 76 | 15% | Fiable | Solide mais raccourci mineur
[/EVAL_VIDEOS]

[EVAL_VIDEOS]
3 | 88 | 8% | Fiable | Clair et rigoureux
[/EVAL_VIDEOS]

[SCORE_GLOBAL: 87/100]
[INDICE_CLICKBAIT: 9%]
[TRAJECTOIRE: PROGRESSION]
### [✓] Forces
- Sourçage strict
### Synthèse
- Chaîne sérieuse.`;

    const sampled = [
      { id: 'v1', title: 'V1', era: 'recent' },
      { id: 'v2', title: 'V2', era: 'mid' },
      { id: 'v3', title: 'V3', era: 'legacy' }
    ];
    const report = ChannelAuditReport.fromRawResponse(raw, {
      channel: { title: 'TestChan', handle: '@test', recentVideos: sampled },
      sampledVideos: sampled,
      totalAvailable: 120,
      requestedLimit: 100,
      lang: 'fr'
    });

    assert.equal(report.evaluatedVideos.length, 3);
    assert.equal(report.totalAvailable, 120);
    assert.equal(report.requestedLimit, 100);
    assert.equal(report.tier.rangeLabel, '85–89%');
    assert.equal(report.fineDistribution.median, 88);
    assert.equal(report.evaluatedVideos[0].score, 96);
    assert.equal(report.evaluatedVideos[1].score, 76);
  });

  it('provides AuditReport.getGranularTier while preserving legacy getReliabilityBadge', () => {
    const r76 = new AuditReport({ videoId: 'a', reliabilityScore: 76 });
    const r95 = new AuditReport({ videoId: 'b', reliabilityScore: 95 });
    assert.notEqual(r76.getGranularTier('fr').rangeLabel, r95.getGranularTier('fr').rangeLabel);
    assert.notEqual(r76.getGranularTier('fr').hexColor, r95.getGranularTier('fr').hexColor);
    assert.equal(r95.getReliabilityBadge('fr').label, 'Solidité Élevée');
  });

  it('produces progressive gradients separating 75%, 89%, and 95% scores and bucketed histogram bars', () => {
    const t75 = ScoreTierScale.getTier(75, 'fr');
    const t89 = ScoreTierScale.getTier(89, 'fr');
    const t95 = ScoreTierScale.getTier(95, 'fr');

    assert.notEqual(t75.hexColor, t89.hexColor);
    assert.notEqual(t89.hexColor, t95.hexColor);
    assert.ok(t75.gradient.includes(t75.hexColor));
    assert.ok(t89.gradient.includes(t89.hexColor));
    assert.ok(t95.gradient.includes(t95.hexColor));
    assert.notEqual(t75.gradient, t95.gradient);

    const fine75 = ScoreTierScale.computeDistributionMetrics([{ score: 76 }, { score: 77 }], 'fr');
    const fine95 = ScoreTierScale.computeDistributionMetrics([{ score: 96 }, { score: 98 }], 'fr');
    const g75 = ScoreTierScale.buildBucketGradient(fine75.bins, 75, 100);
    const g95 = ScoreTierScale.buildBucketGradient(fine95.bins, 75, 100);
    assert.ok(g75.includes('#a3e635'));
    assert.ok(g95.includes('#00d9a6'));
  });
});
