import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { YouTubeThumbnailCollector } from '../src/content/services/YouTubeThumbnailCollector.js';
import { PageVisionCollector } from '../src/content/services/PageVisionCollector.js';
import { AccessiblePageDescriber } from '../src/content/ui/AccessiblePageDescriber.js';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { PromptBuilder } from '../src/services/implementations/PromptBuilder.js';
import { PromptService } from '../src/content/services/PromptService.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';

describe('YouTube Thumbnails & Full Context Across Summary, Audit, Channel & Q&A', () => {
  it('fetches YouTube video thumbnails with fallback and caches cleanly', async () => {
    const prevChrome = globalThis.chrome;
    YouTubeThumbnailCollector.clearCache();
    const calls = [];
    globalThis.chrome = {
      runtime: {
        sendMessage: (msg, cb) => {
          calls.push(msg.url);
          if (msg.url.includes('maxresdefault')) return cb({ success: false, error: 'HTTP 404' });
          return cb({ success: true, dataUrl: 'data:image/jpeg;base64,VEVTVF9USFVNTUI=', width: 480, height: 360 });
        }
      }
    };
    try {
      const first = await YouTubeThumbnailCollector.fetchThumbnail('abc123XYZ00');
      assert.equal(first.name, 'youtube_thumbnail_abc123XYZ00.jpg');
      assert.equal(first.dataUrl, 'data:image/jpeg;base64,VEVTVF9USFVNTUI=');
      assert.equal(calls.length, 2);

      const cached = await YouTubeThumbnailCollector.fetchThumbnail('abc123XYZ00');
      assert.equal(cached, first);
      assert.equal(calls.length, 2, 'Cached thumbnail should avoid duplicate background fetches');
    } finally {
      YouTubeThumbnailCollector.clearCache();
      globalThis.chrome = prevChrome;
    }
  });

  it('builds indexed Channel Thumbnail contact sheets and skips text-only models', async () => {
    const prevChrome = globalThis.chrome;
    const prevDoc = globalThis.document;
    const prevImage = globalThis.Image;
    YouTubeThumbnailCollector.clearCache();

    const drawnTags = [];
    globalThis.chrome = {
      runtime: {
        sendMessage: (_msg, cb) => cb({ success: true, dataUrl: 'data:image/jpeg;base64,QQ==', width: 320, height: 180 })
      }
    };
    globalThis.Image = class MockImage {
      set src(_v) { setTimeout(() => this.onload?.(), 0); }
    };
    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          font: '',
          fillRect: () => {},
          drawImage: () => {},
          measureText: (txt) => ({ width: String(txt).length * 8 }),
          fillText: (txt) => drawnTags.push(txt)
        }),
        toDataURL: () => 'data:image/jpeg;base64,U0hFRVQ='
      })
    };

    try {
      const videos = [
        { id: 'v1', title: 'Shock Claim!', isShort: false, sampleIndex: 1 },
        { id: 'v2', title: 'Quick Short #shorts', isShort: true, sampleIndex: 2 }
      ];
      const textOnly = await YouTubeThumbnailCollector.collectForChannelAudit(
        { currentProvider: 'lmstudio', selectedModel: 'llama-3.1-8b-instruct' },
        videos
      );
      assert.deepEqual(textOnly, []);

      const sheets = await YouTubeThumbnailCollector.collectForChannelAudit(
        { currentProvider: 'lmstudio', selectedModel: 'qwen3-vl-8b-instruct' },
        videos
      );
      assert.equal(sheets.length, 1);
      assert.equal(sheets[0].name, 'channel_thumbnails_sheet_1.jpg');
      assert.ok(drawnTags.includes('#1 VIDEO'));
      assert.ok(drawnTags.includes('#2 SHORT'));
    } finally {
      YouTubeThumbnailCollector.clearCache();
      globalThis.chrome = prevChrome;
      globalThis.document = prevDoc;
      globalThis.Image = prevImage;
    }
  });

  it('attaches official thumbnail first in collectYouTubeFrames and on Q&A visual/first turns even before <video> buffers', async () => {
    const prevChrome = globalThis.chrome;
    const prevDoc = globalThis.document;
    YouTubeThumbnailCollector.clearCache();

    globalThis.chrome = {
      runtime: {
        sendMessage: (msg, cb) => {
          if (msg.action === 'FETCH_SAFE_IMAGE') {
            return cb({ success: true, dataUrl: 'data:image/jpeg;base64,WVRfVEhVTUI=', width: 1280, height: 720 });
          }
          cb({ success: false });
        }
      }
    };
    globalThis.document = { querySelectorAll: () => [] };

    try {
      const ctx = {
        currentProvider: 'gemini',
        selectedModel: 'gemini-2.5-flash',
        state: { modelCapabilities: { 'gemini-2.5-flash': { vision: true } } }
      };
      const frames = await PageVisionCollector.collectYouTubeFrames(ctx, null, 4, 'vidWatch99');
      assert.equal(frames.length, 1);
      assert.equal(frames[0].name, 'youtube_thumbnail_vidWatch99.jpg');

      const turn1 = await AccessiblePageDescriber.prepareYouTubeMessage(ctx, { role: 'user', content: 'Résume vite' }, null, true, 'Résume vite', 'vidWatch99');
      assert.equal(turn1.images?.length, 1);

      const turn2NoVis = await AccessiblePageDescriber.prepareYouTubeMessage(ctx, { role: 'user', content: 'Quelle est la conclusion ?' }, null, false, 'Quelle est la conclusion ?', 'vidWatch99');
      assert.equal(turn2NoVis.images, undefined);

      const turn3Thumb = await AccessiblePageDescriber.prepareYouTubeMessage(ctx, { role: 'user', content: 'Que dit la vignette exactement ?' }, null, false, 'Que dit la vignette exactement ?', 'vidWatch99');
      assert.equal(turn3Thumb.images?.length, 1);
    } finally {
      YouTubeThumbnailCollector.clearCache();
      globalThis.chrome = prevChrome;
      globalThis.document = prevDoc;
    }
  });

  it('embeds full metadata (views, subscribers, chapters) and thumbnail directives across prompts and ChannelAuditService', async () => {
    const promptBuilder = new PromptBuilder();
    const sumPrompts = promptBuilder.buildSummaryPrompts('Test Title', 'Creator', 'Hello', 'fr', 'standard', '', {
      subscribers: '1.2M', viewCount: '450 000 vues', chapters: [{ timestamp: '00:00', text: 'Intro' }], description: 'Official info'
    });
    assert.ok(sumPrompts.userPrompt.includes('450 000 vues'));
    assert.ok(sumPrompts.userPrompt.includes('[00:00] Intro'));

    const auditPrompt = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: '[00:00] Test',
      videoMeta: { title: 'Test', author: 'Creator', subscribers: '500K', viewCount: '90K views', publishDate: '2026-11-01' },
      lang: 'fr'
    });
    assert.ok(auditPrompt.includes('500K'));
    assert.ok(auditPrompt.includes('90K views'));
    assert.ok(AuditPromptBuilder.buildSystemPrompt('fr').includes('vignettes'));

    const chanUser = ChannelAuditPromptBuilder.buildUserPrompt({ title: 'Chan', handle: '@chan' }, [{ id: 'a1', title: 'V1', sampleIndex: 1 }], 'fr', true);
    assert.ok(chanUser.includes('Vignettes jointes'));
    assert.ok(ChannelAuditPromptBuilder.buildSystemPrompt('en').includes('THUMBNAIL CLICKBAIT'));

    const chatSys = PromptService.buildChatSystemPrompt({ title: 'V', author: 'A', viewCount: '12K' }, 'Text', 'fr', 'standard');
    assert.ok(chatSys.includes('VIGNETTES & VISUELS'));
    assert.ok(chatSys.includes('12K'));

    // Verify ChannelAuditService wires collected thumbnail sheets into streaming payload
    let sentImages = null;
    const prevCollect = YouTubeThumbnailCollector.collectForChannelAudit;
    YouTubeThumbnailCollector.collectForChannelAudit = async () => [{ name: 'channel_thumbnails_sheet_1.jpg', dataUrl: 'data:image/jpeg;base64,QQ==' }];
    try {
      const svc = new ChannelAuditService({
        channelManager: {
          getOrFetchChannelDossier: async () => ({
            success: true,
            channel: { title: 'Demo', handle: '@demo', recentVideos: [{ id: 'v1', title: 'T1', era: 'recent' }] }
          })
        }
      });
      svc._enrichSampledVideos = async () => {};
      svc._streamAI = async (params) => {
        sentImages = params.images;
        return '[EVAL_VIDEOS]\n1 | 90 | 5 | Fiable | Clean\n[/EVAL_VIDEOS]\n[SCORE_GLOBAL: 90/100]\n[INDICE_SENSATIONNALISME: 5%]\n[DISTRIBUTION: Fiable=100%, Modere=0%, Risque=0%]\n[TRAJECTOIRE: STABLE]';
      };
      const report = await svc.executeChannelAudit({ channelQuery: '@demo', state: { currentProvider: 'gemini', selectedModel: 'gemini-2.5-flash' }, lang: 'fr' });
      assert.equal(report.globalScore, 90);
      assert.equal(sentImages?.length, 1);
      assert.equal(sentImages[0].name, 'channel_thumbnails_sheet_1.jpg');
    } finally {
      YouTubeThumbnailCollector.collectForChannelAudit = prevCollect;
    }
  });
});
