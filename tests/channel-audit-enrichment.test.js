import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';
import { ChannelStatisticalSampler } from '../src/services/implementations/ChannelStatisticalSampler.js';

describe('ChannelAuditEnrichment - High-Density Dossier & Period Filtering', () => {
  it('builds enriched user prompt with chapters, descriptions and community comments', () => {
    const channel = {
      title: 'Science & Avenir',
      handle: '@scienceavenir',
      subscribers: '850 k abonnés',
      videoCount: '320 vidéos',
      bio: 'Comprendre le monde par la science.'
    };

    const sampledVideos = [
      {
        id: 'vid1',
        title: 'Fusion Nucléaire : Le Réacteur ITER',
        meta: 'il y a 3 jours',
        era: 'recent',
        sampleIndex: 1,
        chapters: ['[0:00] Introduction', '[02:15] Le Tokamak', '[08:30] Défis des plasmas'],
        description: 'Merci à Infomaniak pour leur soutien. Sources : CEA, Nature Energy (https://nature.com).',
        comments: [
          { author: '@physicien', text: 'Excellente vulgarisation sur le confinement magnétique.' },
          { author: '@curieux', text: 'Clair et sans sensationnalisme.' }
        ]
      },
      {
        id: 'vid2',
        title: 'Ordinateurs Quantiques',
        meta: 'il y a 8 mois',
        era: 'mid',
        sampleIndex: 2,
        description: 'Explication des qubits supraconducteurs.'
      }
    ];

    const promptFr = ChannelAuditPromptBuilder.buildUserPrompt(channel, sampledVideos, 'fr');

    assert.ok(promptFr.includes('Fusion Nucléaire'));
    assert.ok(promptFr.includes('Chapitres : [0:00] Introduction | [02:15] Le Tokamak'));
    assert.ok(promptFr.includes('Infomaniak'));
    assert.ok(promptFr.includes('Réactions du public :'));
    assert.ok(promptFr.includes('@physicien'));
    assert.ok(promptFr.includes('@curieux'));

    // English variant
    const promptEn = ChannelAuditPromptBuilder.buildUserPrompt(channel, sampledVideos, 'en');
    assert.ok(promptEn.includes('CONSOLIDATED STATISTICAL CHANNEL AUDIT'));
    assert.ok(promptEn.includes('REPRESENTATIVE GROUP SAMPLE'));
  });

  it('filters catalog videos by period (month, 6months, year, all)', () => {
    const videos = [
      { id: 'v1', meta: 'il y a 2 jours' },
      { id: 'v2', meta: 'il y a 3 semaines' },
      { id: 'v3', meta: 'il y a 4 mois' },
      { id: 'v4', meta: 'il y a 10 mois' },
      { id: 'v5', meta: 'il y a 2 ans' }
    ];

    const monthVids = ChannelStatisticalSampler.filterVideosByPeriod(videos, 'month');
    assert.equal(monthVids.length, 2);
    assert.equal(monthVids[0].id, 'v1');
    assert.equal(monthVids[1].id, 'v2');

    const sixMonthsVids = ChannelStatisticalSampler.filterVideosByPeriod(videos, '6months');
    assert.equal(sixMonthsVids.length, 3);

    const yearVids = ChannelStatisticalSampler.filterVideosByPeriod(videos, 'year');
    assert.equal(yearVids.length, 4);

    const allVids = ChannelStatisticalSampler.filterVideosByPeriod(videos, 'all');
    assert.equal(allVids.length, 5);
  });

  it('enriches sampled videos with batch dossiers in ChannelAuditService', async () => {
    const mockChannelManager = {
      getOrFetchChannelDossier: async () => ({
        success: true,
        channel: {
          title: 'Tech Channel',
          handle: '@tech',
          recentVideos: [
            { id: 'v1', title: 'Vid 1', meta: 'il y a 1 jour' },
            { id: 'v2', title: 'Vid 2', meta: 'il y a 5 mois' }
          ]
        }
      })
    };

    // Mock chrome.runtime.sendMessage for batch dossiers
    globalThis.chrome = {
      runtime: {
        sendMessage: mock.fn((msg, callback) => {
          if (msg.action === 'FETCH_BATCH_DOSSIERS') {
            callback({
              success: true,
              dossiers: {
                v1: {
                  description: 'Full description for v1',
                  chapters: ['[0:00] Intro', '[1:00] Sponso'],
                  hasCaptions: true,
                  comments: [{ author: 'Fan', text: 'Super video' }]
                }
              }
            });
          }
        }),
        connect: () => ({
          onMessage: { addListener: () => {} },
          onDisconnect: { addListener: () => {} },
          postMessage: () => {},
          disconnect: () => {}
        })
      }
    };

    const service = new ChannelAuditService({ channelManager: mockChannelManager });

    // Mock _streamAI directly to test enrichment stage
    service._streamAI = mock.fn(async () => `
[EVAL_VIDEOS]
1 | 90 | 10 | Fiable | Solide
2 | 80 | 15 | Fiable | Bien
[/EVAL_VIDEOS]
[SCORE_GLOBAL: 85/100]
[INDICE_CLICKBAIT: 12%]
`);

    const progressUpdates = [];
    const report = await service.executeChannelAudit({
      channelQuery: '@tech',
      period: 'all',
      lang: 'fr',
      onProgress: (p) => progressUpdates.push(p)
    });

    assert.ok(report);
    assert.equal(report.globalScore, 85);
    assert.ok(progressUpdates.some(p => p.step === 'enrich'));
    assert.ok(progressUpdates.some(p => p.step === 'sample'));

    // Verify cache persistence
    const cached = service.getCachedReport('@tech');
    assert.equal(cached.globalScore, 85);
  });
});
