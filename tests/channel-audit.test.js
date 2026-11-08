import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { ChannelAuditService } from '../src/content/services/ChannelAuditService.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';

describe('ChannelAuditReport - Parsing & Aggregate Modeling', () => {
  const sampleRawText = `
[EVAL_VIDEOS]
1 | 95 | 5 | Fiable | Titre factuel, démonstration rigoureuse et transparente.
2 | 80 | 20 | Fiable | Analyse solide malgré une accroche un peu punchy.
3 | 60 | 45 | Modéré | Sujet intéressant mais raccourcis notables dans la conclusion.
4 | 40 | 75 | Risque | Titre trompeur et affirmation non étayée par les sources.
[/EVAL_VIDEOS]

[SCORE_GLOBAL: 82/100]
[INDICE_CLICKBAIT: 18%]
[DISTRIBUTION: Fiable=50%, Modere=25%, Risque=25%]
[TRAJECTOIRE: PROGRESSION]

### [✓] Ce que la chaîne fait de bien (Forces)
- Qualité technique et clarté pédagogique exemplaires.
- Transparence des tests et mise en situation réelle.
- Citation rigoureuse des benchmarks indépendants.

### [!] Ce qu'elle fait de moins bien (Vigilance)
- Vulgarisation parfois simplifiée à l'extrême sur les technologies émergentes.
- Biais occasionnel en faveur des écosystèmes bien établis.

### [X] Écueils et dérives constatés (Pièges)
- Miniatures et titres parfois trop racoleurs par rapport au sujet réel.

### [📈] Évolution temporelle (Trajectoire d'année en année)
La chaîne montre une professionnalisation constante depuis 2023, avec une meilleure vérification des sources et un recul critique renforcé sur les annonces marketing.

### Synthèse & Recommandation Globale
Chaîne hautement recommandée pour un public curieux, à condition de conserver un regard critique sur les titres sensationnels.
`;

  it('parses consolidated raw text into structured aggregate report', () => {
    const context = {
      channel: {
        title: 'Tech Explorer',
        handle: '@techexplorer',
        subscribers: '1,5 M abonnés',
        videoCount: '450 vidéos'
      },
      sampledVideos: [
        { id: 'v1', title: 'Deep Dive Microchips', meta: 'il y a 3 jours', era: 'recent', weight: 1.5 },
        { id: 'v2', title: 'Review 2025 GPU', meta: 'il y a 2 semaines', era: 'recent', weight: 1.5 },
        { id: 'v3', title: 'Old Benchmark', meta: 'il y a 10 mois', era: 'mid', weight: 1.0 },
        { id: 'v4', title: 'First Video Shock', meta: 'il y a 3 ans', era: 'legacy', weight: 0.6 }
      ]
    };

    const report = ChannelAuditReport.fromRawResponse(sampleRawText, context);

    assert.equal(report.channelTitle, 'Tech Explorer');
    assert.equal(report.channelHandle, '@techexplorer');
    assert.equal(report.globalScore, 82);
    assert.equal(report.clickbaitIndex, 18);
    assert.equal(report.trajectory, 'improving');
    assert.ok(report.trajectoryLabel.includes('progression'));

    // Verify 3 qualitative pillars
    assert.equal(report.strengths.length, 3);
    assert.ok(report.strengths[0].includes('Qualité technique'));
    assert.equal(report.weaknesses.length, 2);
    assert.ok(report.weaknesses[0].includes('Vulgarisation'));
    assert.equal(report.drawbacks.length, 1);
    assert.ok(report.drawbacks[0].includes('Miniatures'));

    // Verify evolution & executive summary
    assert.ok(report.temporalEvolution.includes('professionnalisation constante'));
    assert.ok(report.executiveSummary.includes('hautement recommandée'));

    // Verify badge
    assert.equal(report.badge.color, 'success');
    assert.ok(report.badge.label.includes('Recommandable'));

    // Verify parsed video evaluations
    assert.equal(report.evaluatedVideos.length, 4);
    assert.equal(report.evaluatedVideos[0].score, 95);
    assert.equal(report.evaluatedVideos[0].verdict, 'Fiable');
    assert.equal(report.evaluatedVideos[3].score, 40);
    assert.equal(report.evaluatedVideos[3].verdict, 'Risque');
  });

  it('correctly assigns caution and danger badges based on global score', () => {
    const reportCaution = new ChannelAuditReport({ globalScore: 65 });
    assert.equal(reportCaution.badge.color, 'warning');

    const reportDanger = new ChannelAuditReport({ globalScore: 35 });
    assert.equal(reportDanger.badge.color, 'danger');
  });

  it('parses markdown table formatted with leading and trailing pipes gracefully', () => {
    const rawMarkdownTable = `
[EVAL_VIDEOS]
| Échantillon | Score | Clickbait | Verdict | Commentaire |
|---|---|---|---|---|
| 1 | 92 | 8 | Fiable | Démarche claire et factuelle |
| 2 | 70 | 25 | Modéré | Sponsor présent et vulgarisation correcte |
[/EVAL_VIDEOS]
[SCORE_GLOBAL: 81/100]
[INDICE_CLICKBAIT: 16%]
`;
    const context = {
      channel: { title: 'Test Channel' },
      sampledVideos: [
        { id: 'v1', title: 'Vidéo 1', era: 'recent' },
        { id: 'v2', title: 'Vidéo 2', era: 'mid' }
      ]
    };
    const report = ChannelAuditReport.fromRawResponse(rawMarkdownTable, context);
    assert.equal(report.evaluatedVideos.length, 2);
    assert.equal(report.evaluatedVideos[0].score, 92);
    assert.equal(report.evaluatedVideos[0].clickbait, 8);
    assert.equal(report.evaluatedVideos[0].verdict, 'Fiable');
    assert.equal(report.evaluatedVideos[1].score, 70);
    assert.equal(report.evaluatedVideos[1].comment, 'Sponsor présent et vulgarisation correcte');
  });
});

describe('ChannelAuditPromptBuilder - Consolidated Prompt Generation', () => {
  it('builds system prompt with single-pass consolidated instructions in French', () => {
    const sysPrompt = ChannelAuditPromptBuilder.buildSystemPrompt('fr');
    assert.ok(sysPrompt.includes('[EVAL_VIDEOS]'));
    assert.ok(sysPrompt.includes('[SCORE_GLOBAL'));
    assert.ok(sysPrompt.includes('[INDICE_CLICKBAIT'));
    assert.ok(sysPrompt.includes('[TRAJECTOIRE'));
    assert.ok(sysPrompt.includes('Ce que la chaîne fait de bien'));
    assert.ok(sysPrompt.includes('Évolution temporelle'));
    assert.ok(sysPrompt.includes('~65%'));
  });

  it('builds consolidated user prompt grouping videos by temporal cohorts', () => {
    const channel = {
      title: 'Marques Brownlee',
      handle: '@mkbhd',
      subscribers: '18,5 M d\'abonnés',
      bio: 'Quality tech videos.'
    };
    const sampledVideos = [
      { id: 'v1', title: 'Vision Pro 2', meta: 'il y a 2 jours', era: 'recent', sampleIndex: 1 },
      { id: 'v2', title: 'Pixel 11 Impressions', meta: 'il y a 10 mois', era: 'mid', sampleIndex: 2 },
      { id: 'v3', title: 'First Smartphone 2011', meta: 'il y a 5 ans', era: 'legacy', sampleIndex: 3 }
    ];

    const userPrompt = ChannelAuditPromptBuilder.buildUserPrompt(channel, sampledVideos, 'fr');
    assert.ok(userPrompt.includes('Marques Brownlee'));
    assert.ok(userPrompt.includes('@mkbhd'));
    assert.ok(userPrompt.includes('COHORTE 1 : RÉCENT'));
    assert.ok(userPrompt.includes('Vision Pro 2'));
    assert.ok(userPrompt.includes('COHORTE 2 : INTERMÉDIAIRE'));
    assert.ok(userPrompt.includes('COHORTE 3 : HISTORIQUE'));
    assert.ok(userPrompt.includes('CONSIGNE D\'ANALYSE GROUPÉE'));
  });
});

describe('ChannelAuditService - Caching and Lifecycle', () => {
  it('manages report caching per handle and query', () => {
    const service = new ChannelAuditService();
    assert.equal(service.getCachedReport('@mkbhd'), null);

    const mockReport = new ChannelAuditReport({ channelHandle: '@mkbhd', globalScore: 88 });
    service.cachedReports.set('@mkbhd', mockReport);

    const retrieved = service.getCachedReport('@mkbhd');
    assert.equal(retrieved.globalScore, 88);

    service.clearCache();
    assert.equal(service.getCachedReport('@mkbhd'), null);
  });

  it('switches between video audit and channel audit subtabs in UI', () => {
    const elements = {
      ytAiAuditVideoView: { classList: new Set() },
      ytAiChannelAuditContainer: { classList: new Set(['yt-ai-hidden']) },
      ytAiAuditSubtabVideoBtn: { classList: new Set(['active']) },
      ytAiAuditSubtabChannelBtn: { classList: new Set() }
    };

    const mockDoc = {
      getElementById: (id) => {
        const el = elements[id];
        if (!el) return null;
        return {
          classList: {
            add: (c) => el.classList.add(c),
            remove: (c) => el.classList.delete(c),
            contains: (c) => el.classList.has(c),
            toggle: (c, force) => {
              const shouldAdd = typeof force === 'boolean' ? force : !el.classList.has(c);
              if (shouldAdd) el.classList.add(c);
              else el.classList.delete(c);
              return el.classList.has(c);
            }
          }
        };
      }
    };

    const prevDoc = global.document;
    global.document = mockDoc;

    try {
      const controller = new AuditViewController();

      // Switch to channel subtab
      controller.switchAuditSubtab('channel');
      assert.ok(elements.ytAiAuditVideoView.classList.has('yt-ai-hidden'));
      assert.ok(!elements.ytAiChannelAuditContainer.classList.has('yt-ai-hidden'));
      assert.ok(!elements.ytAiAuditSubtabVideoBtn.classList.has('active'));
      assert.ok(elements.ytAiAuditSubtabChannelBtn.classList.has('active'));

      // Switch back to video subtab
      controller.switchAuditSubtab('video');
      assert.ok(!elements.ytAiAuditVideoView.classList.has('yt-ai-hidden'));
      assert.ok(elements.ytAiChannelAuditContainer.classList.has('yt-ai-hidden'));
      assert.ok(elements.ytAiAuditSubtabVideoBtn.classList.has('active'));
      assert.ok(!elements.ytAiAuditSubtabChannelBtn.classList.has('active'));
    } finally {
      global.document = prevDoc;
    }
  });
});
