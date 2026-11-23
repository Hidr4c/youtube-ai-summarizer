import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelPageParser } from '../src/parsers/ChannelPageParser.js';
import { ChannelFormatAnalyzer } from '../src/domain/services/ChannelFormatAnalyzer.js';
import { ChannelIntelligenceFetcher } from '../src/background/ChannelIntelligenceFetcher.js';
import { ChannelStatisticalSampler } from '../src/services/implementations/ChannelStatisticalSampler.js';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { ChannelAuditBatchRunner } from '../src/content/services/ChannelAuditBatchRunner.js';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';
import { ChannelFormatStatsRenderer } from '../src/content/ui/ChannelFormatStatsRenderer.js';
import { I18N } from '../src/locales/index.js';

describe('Channel Audit - Videos vs Shorts Identification & Dual-Format Analysis', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('collects BOTH /videos and /shorts catalogs, deduplicates IDs, and tags each format explicitly', async () => {
    const videosHtml = `<html><script>var ytInitialData = {
      "metadata":{"channelMetadataRenderer":{"title":"Creator Mix","vanityChannelUrl":"https://www.youtube.com/@CreatorMix"}},
      "contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"richGridRenderer":{"contents":[
        {"richItemRenderer":{"content":{"videoRenderer":{"videoId":"VID_LONG_1","title":{"simpleText":"Deep Dive Essay"},"publishedTimeText":{"simpleText":"il y a 2 semaines"},"viewCountText":{"simpleText":"50 k vues"}}}}},
        {"richItemRenderer":{"content":{"videoRenderer":{"videoId":"VID_LONG_2","title":{"simpleText":"Full Documentary"},"publishedTimeText":{"simpleText":"il y a 1 an"},"viewCountText":{"simpleText":"120 k vues"}}}}}
      ]}}}}]}}
    };</script></html>`;

    const shortsHtml = `<html><script>var ytInitialData = {
      "contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"richGridRenderer":{"contents":[
        {"richItemRenderer":{"content":{"shortsLockupViewModel":{"entityId":"shorts-lockup-SHORT_1","overlayMetadata":{"primaryText":{"content":"Quick Tip #shorts"},"secondaryText":{"content":"15 k vues"}},"onTap":{"innertubeCommand":{"reelWatchEndpoint":{"videoId":"SHORT_1"}}}}}}},
        {"richItemRenderer":{"content":{"reelItemRenderer":{"videoId":"SHORT_2","headline":{"simpleText":"Viral Clip"},"viewCountText":{"simpleText":"90 k vues"}}}}}
      ]}}}}]}}
    };</script></html>`;

    const fetched = [];
    globalThis.fetch = async (url) => {
      fetched.push(String(url));
      return {
        ok: true,
        status: 200,
        url: String(url),
        text: async () => (String(url).includes('/shorts') ? shortsHtml : videosHtml)
      };
    };

    const res = await ChannelIntelligenceFetcher.fetchChannelDossier('/@CreatorMix', 10);
    assert.equal(res.success, true);
    assert.ok(fetched.some((u) => u.endsWith('/videos')), 'Must query /videos tab');
    assert.ok(fetched.some((u) => u.endsWith('/shorts')), 'Must query /shorts tab even when /videos succeeded');
    assert.equal(res.channel.longVideoCount, 2);
    assert.equal(res.channel.shortsCount, 2);
    assert.equal(res.channel.hasMixedFormats, true);

    const longItem = res.channel.recentVideos.find((v) => v.id === 'VID_LONG_1');
    const shortItem = res.channel.recentVideos.find((v) => v.id === 'SHORT_1');
    assert.equal(longItem.isShort, false);
    assert.equal(longItem.contentType, 'video');
    assert.equal(shortItem.isShort, true);
    assert.equal(shortItem.contentType, 'short');
    assert.equal(shortItem.url, 'https://www.youtube.com/shorts/SHORT_1');
    assert.ok(res.channel.markdownDossier.includes('[Vidéo]'));
    assert.ok(res.channel.markdownDossier.includes('[Short]'));
  });

  it('guarantees both long-form Videos and Shorts appear in stratified sampling when long pool exceeds maxSample', () => {
    const pool = [];
    for (let i = 1; i <= 20; i++) {
      pool.push({ id: `V_${i}`, title: `Long Video ${i}`, meta: 'il y a 2 semaines', isShort: false, contentType: 'video' });
    }
    for (let j = 1; j <= 8; j++) {
      pool.push({ id: `S_${j}`, title: `Short Clip ${j}`, meta: '5 k vues', isShort: true, contentType: 'short' });
    }

    const sample = ChannelStatisticalSampler.selectStratifiedSample(pool, { maxSample: 10 });
    const sampleVideos = sample.filter((v) => !ChannelFormatAnalyzer.isShortItem(v));
    const sampleShorts = sample.filter((v) => ChannelFormatAnalyzer.isShortItem(v));

    assert.equal(sample.length, 10);
    assert.ok(sampleVideos.length >= 5, 'Must include majority long-form videos');
    assert.ok(sampleShorts.length >= 2, 'Must guarantee Shorts representation in mixed sample');
  });

  it('builds prompts tagging [VIDÉO]/[SHORT] and extracts dual-format breakdown & comparison section into ChannelAuditReport', () => {
    const sampled = [
      { id: 'V1', sampleIndex: 1, title: 'Enquête approfondie', meta: 'il y a 1 mois', era: 'recent', isShort: false, contentType: 'video', weight: 1.5 },
      { id: 'S1', sampleIndex: 2, title: 'Teaser choc 60s', meta: '20 k vues', url: 'https://www.youtube.com/shorts/S1', era: 'recent', isShort: true, contentType: 'short', weight: 1.5 }
    ];

    const promptFr = ChannelAuditPromptBuilder.buildUserPrompt({ title: 'MixChain', handle: '@mixchain' }, sampled, 'fr');
    assert.ok(promptFr.includes('1 Vidéos longues • 1 Shorts'));
    assert.ok(promptFr.includes('[VIDÉO] "Enquête approfondie"'));
    assert.ok(promptFr.includes('[SHORT] "Teaser choc 60s"'));

    const sysPromptEn = ChannelAuditPromptBuilder.buildSystemPrompt('en');
    assert.ok(sysPromptEn.includes('Long-form Videos vs Shorts Comparison'));

    const rawAiResponse = `
[EVAL_VIDEOS]
1 | 88 | 10 | Fiable | Enquête sourcées avec nuances.
2 | 58 | 60 | Modéré | Short plus sensationnaliste recyclant un extrait sans contexte.
[/EVAL_VIDEOS]

[SCORE_GLOBAL: 73/100]
[INDICE_SENSATIONNALISME: 35%]
[DISTRIBUTION: Fiable=50%, Modere=50%, Risque=0%]
[TRAJECTOIRE: STABLE]

### [✓] Ce que la chaîne fait de bien
- **Rigueur documentaire :** Bon travail de fond sur les vidéos longues.
### [!] Ce qu'elle fait de moins bien
- **Accroche rapide :** Les Shorts coupent parfois la nuance.
### [X] Écueils et dérives constatés
- **Aucun écueil critique** hors raccourcis de montage sur Shorts.
### [📈] Évolution temporelle
- **Trajectoire stable :** Qualité constante cette année.
### [⚡] Comparatif Vidéos longues vs Shorts
- **Écart de format :** Les vidéos longues restent rigoureuses (**88/100**) tandis que les Shorts cherchent davantage le clic émotionnel (**58/100**).
### Synthèse & Recommandation Globale
> **Verdict :** Chaîne sérieuse dans ses formats longs, à prendre avec recul sur les extraits Shorts.
`;

    const report = ChannelAuditReport.fromRawResponse(rawAiResponse, {
      channel: { title: 'MixChain', handle: '@mixchain', recentVideos: sampled },
      sampledVideos: sampled,
      lang: 'fr'
    });

    assert.equal(report.formatBreakdown.hasMixedFormats, true);
    assert.equal(report.formatBreakdown.videos.count, 1);
    assert.equal(report.formatBreakdown.videos.sharePct, 50);
    assert.equal(report.formatBreakdown.videos.avgScore, 88);
    assert.equal(report.formatBreakdown.videos.reliablePct, 100);
    assert.equal(report.formatBreakdown.shorts.count, 1);
    assert.equal(report.formatBreakdown.shorts.sharePct, 50);
    assert.equal(report.formatBreakdown.shorts.avgScore, 58);
    assert.equal(report.formatBreakdown.shorts.cautionPct, 100);
    assert.equal(report.formatBreakdown.scoreGap, 30);
    assert.ok(report.formatComparison.includes('Écart de format'));
    assert.equal(report.evaluatedVideos[0].isShort, false);
    assert.equal(report.evaluatedVideos[1].isShort, true);

    const cardHtml = ChannelFormatStatsRenderer.renderFormatComparisonCard(report, I18N.fr, 'fr');
    assert.ok(cardHtml.includes('Comparatif Vidéos longues vs Shorts'));
    assert.ok(cardHtml.includes('yt-ai-format-share-track'));
    assert.ok(cardHtml.includes('yt-ai-format-share-seg-video'));
    assert.ok(cardHtml.includes('yt-ai-format-share-seg-short'));
    assert.ok(cardHtml.includes('yt-ai-format-bar-track'));
    assert.ok(cardHtml.includes('yt-ai-format-tier-strip'));
    assert.ok(cardHtml.includes('50%'));
    assert.ok(cardHtml.includes('88/100'));
    assert.ok(cardHtml.includes('58/100'));
    assert.ok(cardHtml.includes('+30 pts'));

    const badgeVideo = ChannelFormatStatsRenderer.renderItemTypeBadge(report.evaluatedVideos[0], I18N.fr);
    const badgeShort = ChannelFormatStatsRenderer.renderItemTypeBadge(report.evaluatedVideos[1], I18N.fr);
    assert.ok(badgeVideo.includes('Vidéo'));
    assert.ok(badgeShort.includes('Short'));

    const reducePrompt = ChannelAuditBatchRunner._buildReducePrompt(
      { title: 'MixChain', handle: '@mixchain' },
      sampled,
      [
        { index: 1, isShort: false, score: 88, clickbait: 10, raw: '[VIDEO] 1 | 88 | 10' },
        { index: 2, isShort: true, score: 58, clickbait: 60, raw: '[SHORT] 2 | 58 | 60' }
      ],
      'fr'
    );
    assert.ok(reducePrompt.includes('Vidéos longues 1 (moy. 88/100'));
    assert.ok(reducePrompt.includes('Shorts 1 (moy. 58/100'));
  });

  it('ChannelPageParser tags explicit Shorts URLs cleanly across modern and legacy renderers', () => {
    const vItem = ChannelPageParser.parseGridVideoItem({
      videoRenderer: { videoId: 'ABC12345678', title: { simpleText: 'Standard Video' } }
    });
    assert.equal(vItem.isShort, false);
    assert.equal(vItem.contentType, 'video');

    const sLockup = ChannelPageParser.parseGridVideoItem({
      richItemRenderer: {
        content: {
          lockupViewModel: {
            contentId: 'DEF12345678',
            metadata: { lockupMetadataViewModel: { title: { content: 'Hidden Short' } } },
            rendererContext: { commandContext: { onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: 'DEF12345678' } } } } }
          }
        }
      }
    });
    assert.equal(sLockup.isShort, true);
    assert.equal(sLockup.contentType, 'short');
    assert.equal(sLockup.url, 'https://www.youtube.com/shorts/DEF12345678');
  });

  it('does NOT misclassify Home long-form videos as Shorts when /shorts silently redirects to Home tab', async () => {
    const videosHtml = `<html><script>var ytInitialData = {"metadata":{"channelMetadataRenderer":{"title":"NoShortsCreator","vanityChannelUrl":"https://www.youtube.com/@NoShortsCreator"}},"contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"selected":true,"endpoint":{"commandMetadata":{"webCommandMetadata":{"url":"/@NoShortsCreator/videos"}}},"content":{"richGridRenderer":{"contents":[{"richItemRenderer":{"content":{"videoRenderer":{"videoId":"LONG_ONLY_1","title":{"simpleText":"Real Long Video"}}}}}]}}}}]}}};</script></html>`;
    const homeFallbackHtml = `<html><script>var ytInitialData = {"contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"title":"Accueil","selected":false,"content":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[{"videoRenderer":{"videoId":"HOME_LONG_2","title":{"simpleText":"Pinned Home Long Video"}}}]}}]}}}}]}}};</script></html>`;

    globalThis.fetch = async (url) => ({
      ok: true,
      status: 200,
      url: String(url),
      text: async () => (String(url).includes('/shorts') ? homeFallbackHtml : videosHtml)
    });

    const res = await ChannelIntelligenceFetcher.fetchChannelDossier('/@NoShortsCreator', 10);
    assert.equal(res.success, true);
    assert.equal(res.channel.longVideoCount, 1);
    assert.equal(res.channel.shortsCount, 0);
    assert.equal(res.channel.hasMixedFormats, false);
    assert.equal(res.channel.recentVideos.some((v) => v.id === 'HOME_LONG_2'), false);
  });
});
