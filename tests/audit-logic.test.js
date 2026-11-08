import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AuditReport } from '../src/domain/models/AuditReport.js';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';
import { AuditService } from '../src/content/services/AuditService.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';
import { PromptService } from '../src/content/services/PromptService.js';

describe('AuditReport Domain Aggregate', () => {
  it('correctly classifies reliability score and badge color', () => {
    const reportHigh = new AuditReport({ videoId: 'vid1', reliabilityScore: 92 });
    assert.equal(reportHigh.hasSignificantFlaws(), false);
    assert.equal(reportHigh.getReliabilityBadge('fr').label, 'Solidité Élevée');
    assert.equal(reportHigh.getReliabilityBadge('fr').color, '#2ea043');

    const reportCaution = new AuditReport({ videoId: 'vid2', reliabilityScore: 65 });
    assert.equal(reportCaution.hasSignificantFlaws(), true);
    assert.equal(reportCaution.getReliabilityBadge('fr').label, 'Vigilance / Biais détectés');
    assert.equal(reportCaution.getReliabilityBadge('fr').color, '#d29922');

    const reportLow = new AuditReport({ videoId: 'vid3', reliabilityScore: 35 });
    assert.equal(reportLow.hasSignificantFlaws(), true);
    assert.equal(reportLow.getReliabilityBadge('en').label, 'Questionable / Low Reliability');
    assert.equal(reportLow.getReliabilityBadge('en').color, '#f85149');
  });

  it('formats context block for Q&A chat injection', () => {
    const report = new AuditReport({
      videoId: 'vid123',
      reliabilityScore: 55,
      status: 'caution',
      rawMarkdown: '### ⚖️ Sophismes\n- Fausse causalité détectée à 04:12.'
    });

    const block = report.toChatContextBlock();
    assert.ok(block.includes('[RAPPORT D’AUDIT CRITIQUE, LOGIQUE & VÉRACITÉ]'));
    assert.ok(block.includes('55/100 (caution)'));
    assert.ok(block.includes('Fausse causalité'));
  });
});

describe('AuditPromptBuilder - Logic & Fact-Checking Directives', () => {
  it('builds system prompt in requested language with critical reasoning focus', () => {
    const frSys = AuditPromptBuilder.buildSystemPrompt('fr');
    assert.ok(frSys.includes('FRANÇAIS'));
    assert.ok(frSys.includes('sophismes'));
    assert.ok(frSys.includes('[SCORE: XX/100]'));

    const enSys = AuditPromptBuilder.buildSystemPrompt('en');
    assert.ok(enSys.includes('ENGLISH'));
    assert.ok(enSys.includes('critical thinking'));
  });

  it('builds comprehensive user prompt with metadata, comments and transcript', () => {
    const userPrompt = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: '[00:10] CF Moto dévoile une hypersportive.',
      videoMeta: {
        title: 'CF Moto V4 SR-RR',
        author: 'Moto Magazine',
        publishDate: '2026-11-04',
        description: 'Essai exclusif de la nouvelle moto.'
      },
      commentsBlock: '- ViewerA: Vidéo tournée en 2021 à Valence.\n- ViewerB: C’est un reupload !',
      lang: 'fr'
    });

    assert.ok(userPrompt.includes('CF Moto V4 SR-RR'));
    assert.ok(userPrompt.includes('2026-11-04'));
    assert.ok(userPrompt.includes('RETOURS ET SIGNAUX DES COMMENTATEURS'));
    assert.ok(userPrompt.includes('ViewerA: Vidéo tournée en 2021'));
    assert.ok(userPrompt.includes('[00:10] CF Moto'));
    assert.ok(userPrompt.includes('Analyse Logique') || userPrompt.includes('Rigueur'));
    assert.ok(userPrompt.includes('Recoupement Factuel, Temporel & Spatial'));
    assert.ok(userPrompt.includes('Date d\'observation'));
  });

  it('builds system prompt with mandatory real-world temporal anchor matching current year', () => {
    const sysPrompt = AuditPromptBuilder.buildSystemPrompt('fr');
    const currentYear = String(new Date().getFullYear());
    assert.ok(sysPrompt.includes('REPÈRE CHRONOLOGIQUE DU MONDE RÉEL'));
    assert.ok(sysPrompt.includes(currentYear));
    assert.ok(sysPrompt.includes('Date actuelle d\'observation'));
  });
});

describe('AuditService - Execution & Streaming', () => {
  let mockTranscriptController;
  let mockCommentsManager;
  let auditService;
  let originalChrome;

  beforeEach(() => {
    originalChrome = global.chrome;
    mockTranscriptController = {
      cachedTranscript: {
        videoId: 'vidTest',
        fullText: '[01:00] Point un [02:00] Point deux'
      },
      cachedVideoMetadata: {
        videoId: 'vidTest',
        title: 'Vidéo Test',
        author: 'Auteur Test',
        publishDate: '2026-11-01'
      },
      extractYouTubeTranscript: async () => [
        { timestamp: '01:00', text: 'Point un' },
        { timestamp: '02:00', text: 'Point deux' }
      ]
    };

    mockCommentsManager = {
      getOrFetchComments: async () => ({
        success: true,
        markdownDossier: '### Commentaires\n- @user1: Attention fake news !'
      })
    };

    auditService = new AuditService({
      transcriptController: mockTranscriptController,
      videoCommentsManager: mockCommentsManager
    });
  });

  afterEach(() => {
    global.chrome = originalChrome;
  });

  it('manages audit report caching per videoId', () => {
    assert.equal(auditService.getCachedAudit('vidTest'), null);
    const rep = new AuditReport({ videoId: 'vidTest', reliabilityScore: 80 });
    auditService.cachedAudits.set('vidTest', rep);
    assert.equal(auditService.getCachedAudit('vidTest'), rep);

    auditService.clearCache();
    assert.equal(auditService.getCachedAudit('vidTest'), null);
  });

  it('executes audit stream, parses score, and returns AuditReport', async () => {
    let sentAction = null;
    let messageListener = null;

    global.chrome = {
      runtime: {
        connect: () => ({
          onMessage: {
            addListener: (fn) => { messageListener = fn; }
          },
          onDisconnect: {
            addListener: () => {}
          },
          postMessage: (payload) => {
            sentAction = payload;
            process.nextTick(() => {
              messageListener({ type: 'CHUNK', text: '[SCORE: 72/100]\n\n### ⚖️ Analyse\n- Aucun sophisme majeur.' });
              messageListener({ type: 'DONE' });
            });
          },
          disconnect: () => {}
        })
      }
    };

    const result = await auditService.executeAudit({
      videoId: 'vidTest',
      lang: 'fr',
      state: {
        currentProvider: 'lmstudio',
        getActiveModel: () => 'qwen-2.5-7b',
        serverUrls: { lmstudio: 'http://127.0.0.1:1234' }
      }
    });

    assert.ok(result instanceof AuditReport);
    assert.equal(result.videoId, 'vidTest');
    assert.equal(result.reliabilityScore, 72);
    assert.equal(result.status, 'reliable');
    assert.ok(result.rawMarkdown.includes('Aucun sophisme majeur'));
    assert.equal(sentAction.action, 'START_STREAM');
    assert.equal(sentAction.provider, 'lmstudio');
  });

  it('rejects chapter-only cached transcript and forces extraction of true dialogue', async () => {
    let extractionCalled = false;
    let extractionUserInitiated = false;

    mockTranscriptController.cachedTranscript = {
      videoId: 'vidTest',
      fullText: '[00:00] Intro [02:00] Fin',
      isChapterOnly: true
    };

    mockTranscriptController.extractYouTubeTranscript = async (lang, isUserInitiated) => {
      extractionCalled = true;
      extractionUserInitiated = isUserInitiated;
      mockTranscriptController.cachedTranscript.isChapterOnly = false;
      return [
        { timestamp: '00:05', text: 'Vrai dialogue prononcé dans la vidéo' }
      ];
    };

    let sentMessage = null;
    global.chrome = {
      runtime: {
        connect: () => ({
          postMessage: (msg) => { sentMessage = msg; },
          onMessage: {
            addListener: (cb) => {
              setTimeout(() => {
                cb({ type: 'CHUNK', content: 'Audit avec le vrai dialogue [SCORE: 85/100]' });
                cb({ type: 'DONE' });
              }, 10);
            }
          },
          onDisconnect: { addListener: () => {} }
        })
      }
    };

    const res = await auditService.executeAudit({
      videoId: 'vidTest',
      lang: 'fr',
      state: { currentProvider: 'lmstudio', getActiveModel: () => 'qwen' }
    });

    assert.equal(extractionCalled, true);
    assert.equal(extractionUserInitiated, true);
    assert.ok(sentMessage.messages[0].content.includes('Vrai dialogue prononcé'));
    assert.equal(res.reliabilityScore, 85);
  });
});

describe('PromptService - Chat Integration with Audit Dossier', () => {
  it('injects audit report findings and critical reasoning directives into chat system prompt', () => {
    const meta = { title: 'Titre Vidéo', author: 'Chaîne X' };
    const safeTranscript = 'Contenu de la vidéo...';
    const auditDossier = '### [RAPPORT D’AUDIT CRITIQUE]\nIndice de fiabilité: 45/100 (manipulative)\n- Contradiction flagrante à [02:15] et [11:40].';

    const systemPrompt = PromptService.buildChatSystemPrompt(
      meta,
      safeTranscript,
      'fr',
      'standard',
      'Résumé...',
      '',
      '',
      auditDossier
    );

    assert.ok(systemPrompt.includes('RAPPORT D’AUDIT CRITIQUE & VÉRACITÉ'));
    assert.ok(systemPrompt.includes('Indice de fiabilité: 45/100'));
    assert.ok(systemPrompt.includes('Contradiction flagrante'));
  });
});
