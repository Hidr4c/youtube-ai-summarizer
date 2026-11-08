import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelStatisticalSampler } from '../src/services/implementations/ChannelStatisticalSampler.js';

describe('ChannelStatisticalSampler - Temporal Stratification & Recency Weighting', () => {
  it('categorizes video eras accurately from relative metadata', () => {
    const recent1 = ChannelStatisticalSampler.categorizeVideoEra({ meta: '1,2 M de vues • il y a 3 jours' });
    assert.equal(recent1.era, 'recent');
    assert.equal(recent1.weight, 1.5);

    const recent2 = ChannelStatisticalSampler.categorizeVideoEra({ meta: '500 k views • 2 weeks ago' });
    assert.equal(recent2.era, 'recent');
    assert.equal(recent2.weight, 1.5);

    const mid1 = ChannelStatisticalSampler.categorizeVideoEra({ meta: '800 k de vues • il y a 8 mois' });
    assert.equal(mid1.era, 'mid');
    assert.equal(mid1.weight, 1.0);

    const mid2 = ChannelStatisticalSampler.categorizeVideoEra({ meta: '2 M views • 1 year ago' });
    assert.equal(mid2.era, 'mid');
    assert.equal(mid2.weight, 1.0);

    const legacy1 = ChannelStatisticalSampler.categorizeVideoEra({ meta: '3 M de vues • il y a 4 ans' });
    assert.equal(legacy1.era, 'legacy');
    assert.equal(legacy1.weight, 0.6);
  });

  it('selects stratified representative sample with quotas for large channels', () => {
    const allVideos = [];
    // 15 recent videos
    for (let i = 1; i <= 15; i++) {
      allVideos.push({ id: `rec_${i}`, title: `Recent Video ${i}`, meta: `il y a ${i} jours` });
    }
    // 10 mid-term videos
    for (let i = 1; i <= 10; i++) {
      allVideos.push({ id: `mid_${i}`, title: `Mid Video ${i}`, meta: `il y a 8 mois` });
    }
    // 10 legacy videos
    for (let i = 1; i <= 10; i++) {
      allVideos.push({ id: `leg_${i}`, title: `Legacy Video ${i}`, meta: `il y a 3 ans` });
    }

    const sample = ChannelStatisticalSampler.selectStratifiedSample(allVideos, { maxSample: 10 });
    assert.equal(sample.length, 10);

    const recentCount = sample.filter(v => v.era === 'recent').length;
    const midCount = sample.filter(v => v.era === 'mid').length;
    const legacyCount = sample.filter(v => v.era === 'legacy').length;

    assert.ok(recentCount >= 5, 'Must contain at least 5 recent videos (~60%)');
    assert.ok(midCount >= 2, 'Must contain at least 2 mid videos (~25%)');
    assert.ok(legacyCount >= 1, 'Must contain at least 1 legacy video (~15%)');
    assert.equal(sample[0].sampleIndex, 1);
  });

  it('handles small channels without loss of video items', () => {
    const smallPool = [
      { id: 'v1', title: 'Video 1', meta: 'il y a 2 jours' },
      { id: 'v2', title: 'Video 2', meta: 'il y a 1 mois' },
      { id: 'v3', title: 'Video 3', meta: 'il y a 1 an' }
    ];

    const sample = ChannelStatisticalSampler.selectStratifiedSample(smallPool, { maxSample: 10 });
    assert.equal(sample.length, 3);
  });

  it('computes weighted metrics, proportions, and improving trajectory', () => {
    const evaluatedVideos = [
      // Recent videos (high weight 1.5, high scores)
      { id: 'r1', score: 90, clickbait: 10, era: 'recent', weight: 1.5 },
      { id: 'r2', score: 85, clickbait: 15, era: 'recent', weight: 1.5 },
      { id: 'r3', score: 88, clickbait: 12, era: 'recent', weight: 1.5 },
      // Mid videos (weight 1.0, moderate scores)
      { id: 'm1', score: 70, clickbait: 30, era: 'mid', weight: 1.0 },
      { id: 'm2', score: 68, clickbait: 35, era: 'mid', weight: 1.0 },
      // Legacy video (weight 0.6, lower scores in the channel early days)
      { id: 'l1', score: 60, clickbait: 45, era: 'legacy', weight: 0.6 }
    ];

    const stats = ChannelStatisticalSampler.computeWeightedMetrics(evaluatedVideos);

    // Weighted score must give higher weight to recent 90, 85, 88
    assert.ok(stats.weightedScore >= 80, `Expected weighted score >= 80, got ${stats.weightedScore}`);
    assert.ok(stats.weightedClickbait <= 25, `Expected weighted clickbait <= 25%, got ${stats.weightedClickbait}%`);

    // Proportions
    assert.equal(stats.distribution.reliable, 3);
    assert.equal(stats.distribution.caution, 3);
    assert.equal(stats.distribution.clickbait, 0);

    const sumPct = stats.proportions.reliablePct + stats.proportions.cautionPct + stats.proportions.clickbaitPct;
    assert.equal(sumPct, 100);

    // Trajectory must detect improvement from legacy/mid baseline to recent
    assert.equal(stats.trajectory, 'improving');
    assert.ok(stats.trajectoryLabel.includes('progression'));
  });

  it('computes declining trajectory when recent videos degrade in quality', () => {
    const degradedVideos = [
      // Recent videos have fallen into sensational clickbait
      { id: 'r1', score: 45, clickbait: 70, era: 'recent', weight: 1.5 },
      { id: 'r2', score: 50, clickbait: 65, era: 'recent', weight: 1.5 },
      // Mid / legacy were rigorous
      { id: 'm1', score: 85, clickbait: 15, era: 'mid', weight: 1.0 },
      { id: 'l1', score: 80, clickbait: 10, era: 'legacy', weight: 0.6 }
    ];

    const stats = ChannelStatisticalSampler.computeWeightedMetrics(degradedVideos);
    assert.equal(stats.trajectory, 'declining');
    assert.ok(stats.trajectoryLabel.includes('baisse'));
  });

  it('filters video pool by period shortcuts (all, month, 6months, year)', () => {
    const pool = [
      { id: 'v_days', meta: 'il y a 4 jours' },
      { id: 'v_month', meta: 'il y a 1 mois' },
      { id: 'v_3months', meta: 'il y a 3 mois' },
      { id: 'v_8months', meta: 'il y a 8 mois' },
      { id: 'v_2years', meta: 'il y a 2 ans' }
    ];

    // 'all' returns entire list
    const all = ChannelStatisticalSampler.filterVideosByPeriod(pool, 'all');
    assert.equal(all.length, 5);

    // 'month' returns only days & 1 month
    const month = ChannelStatisticalSampler.filterVideosByPeriod(pool, 'month');
    assert.equal(month.length, 2);
    assert.deepEqual(month.map(v => v.id), ['v_days', 'v_month']);

    // '6months' returns up to 6 months
    const sixMonths = ChannelStatisticalSampler.filterVideosByPeriod(pool, '6months');
    assert.equal(sixMonths.length, 3);
    assert.deepEqual(sixMonths.map(v => v.id), ['v_days', 'v_month', 'v_3months']);

    // 'year' returns videos from current year
    const year = ChannelStatisticalSampler.filterVideosByPeriod(pool, 'year');
    assert.ok(year.length >= 2);
    assert.ok(year.every(v => v.id !== 'v_2years'));
  });
});
