import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MarkdownRenderer, stripScoreTags } from '../src/content/ui/MarkdownRenderer.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';
import { AuditVisualDashboard } from '../src/content/ui/AuditVisualDashboard.js';
import { AuditReport } from '../src/domain/models/AuditReport.js';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';
import { MultiPassPromptBuilder } from '../src/services/implementations/MultiPassPromptBuilder.js';
import { PromptBuilder } from '../src/services/implementations/PromptBuilder.js';
import { getFormatInstructions } from '../src/services/implementations/PromptTemplates.js';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { PromptService } from '../src/content/services/PromptService.js';
import { ChannelAuditViewController } from '../src/content/ui/ChannelAuditViewController.js';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';
import { BannerEventHandler } from '../src/content/ui/BannerEventHandler.js';

describe('Rich Audit & Universal Markdown Presentation', () => {
  const originalDocument = global.document;
  const originalWindow = global.window;

  afterEach(() => {
    global.document = originalDocument;
    global.window = originalWindow;
  });

  it('strips raw [SCORE: XX/100] tags cleanly from display output without damaging content', () => {
    const raw = '[SCORE: 92/100]\n\n### 🎭 Contexte Éditorial\n- **Genre :** Tech\n\n### 🎯 Verdict\n> **Verdict :** Très fiable.';
    const stripped = stripScoreTags(raw);
    assert.equal(stripped.includes('[SCORE:'), false);
    assert.ok(stripped.startsWith('### 🎭 Contexte Éditorial'));

    const boldScore = '**[SCORE: 84/100]**\n### Verdict\nText ok [SCORE: 84/100]';
    assert.equal(stripScoreTags(boldScore).includes('[SCORE:'), false);
    assert.ok(stripScoreTags(boldScore).includes('### Verdict'));
  });

  it('renders rich audit cards, callouts, tables, ordered lists, nested sublists, and clean bracketless timestamps', () => {
    const sampleMd = [
      '### 🎯 Indice de Fiabilité & Verdict Global',
      '> **Verdict :** Démonstration méthodique avec preuves vérifiables [3:48].',
      '',
      '### ⚖️ Analyse Logique',
      '- **Structure :** Chaîne causale claire',
      '  - **Bug identifié :** Sampling forcé documenté',
      '  - **Preuve code :** Pull request vérifiée',
      '',
      'Il construit une chaîne de preuves :',
      '',
      'code source ;',
      '',
      'bug de sampling ;',
      '',
      'pull request ;',
      '',
      'leaderboard.',
      '',
      '### 🔍 Recoupement Factuel',
      '| Point | Preuve | Statut |',
      '|---|---|---|',
      '| Sampling | Commit `[3:48]` & [PR #12](https://github.com/org/repo?t=1:23) | **Vérifié** |',
      '',
      '### 📌 Conseils',
      '1. Vérifier les sources primaires',
      '2. Comparer les benchmarks'
    ].join('\n');

    const html = MarkdownRenderer.renderMarkdown(sampleMd, null, { sectionCards: true });

    // Section cards created for each h3
    const sectionMatches = html.match(/<section class="yt-ai-md-section">/g) || [];
    assert.equal(sectionMatches.length, 4, 'Each H3 section must render inside its own visual card');

    // Leading intro before first H3 renders cleanly in intro wrapper
    const introMd = 'Synthèse rapide introductive [0:45].\n\n### 🎯 Section A\n- Point A';
    const introHtml = MarkdownRenderer.renderMarkdown(introMd, null, { sectionCards: true });
    assert.ok(introHtml.includes('<div class="yt-ai-md-intro">'));
    assert.ok(introHtml.includes('<section class="yt-ai-md-section">'));

    // Callout blockquote & structured table
    assert.ok(html.includes('<blockquote class="yt-ai-blockquote">'));
    assert.ok(html.includes('<table class="yt-ai-md-table">'));

    // Nested sublist properly embedded inside parent item
    assert.ok(html.includes('<ul class="yt-ai-sublist"><li class="yt-ai-subitem">'));

    // Semicolon chain merged cleanly into 1 bullet list instead of 4 detached paragraphs
    assert.ok(html.includes('code source ;'));
    assert.equal(html.includes('<p>code source ;</p>'), false);

    // Bracketless clean timestamp pill while code spans and external links stay uncorrupted
    assert.ok(html.includes('class="yt-ai-timestamp-link" data-time="228"'));
    assert.equal(html.includes('[<a href="javascript:void(0)" class="yt-ai-timestamp-link"'), false);
    assert.ok(html.includes('<code>[3:48]</code>'), 'Inline code timestamps must stay code spans');
    assert.ok(html.includes('href="https://github.com/org/repo?t=1:23"'), 'External links must preserve query params');
    assert.ok(html.includes('<ol class="yt-ai-ordered-list">'));
  });

  it('blocks unsafe javascript markdown links and preserves unmatched timestamp brackets cleanly', () => {
    const html = MarkdownRenderer.formatInline('Inspect [bad](javascript:alert(1)) at [03:48 - 04:10]');
    assert.equal(html.includes('href="javascript:alert'), false);
    assert.ok(html.includes('data-time="228"'));
    assert.ok(html.includes('data-time="250"'));
  });

  it('AuditViewController strips [SCORE: 92/100] below Hero card during streaming & completion without mutating report.rawMarkdown', async () => {
    const elements = new Map();
    const makeEl = (id) => ({
      id,
      innerHTML: '',
      textContent: '',
      disabled: false,
      value: 'fr',
      classList: {
        set: new Set(),
        add(c) { this.set.add(c); },
        remove(c) { this.set.delete(c); },
        contains(c) { return this.set.has(c); }
      },
      querySelectorAll: () => []
    });
    ['ytAiLangSelect', 'ytAiRunAuditBtn', 'ytAiCopyAuditBtn', 'ytAiAuditStatus', 'ytAiAuditBody', 'ytAiAuditProgressContainer', 'ytAiTabAuditBtn']
      .forEach(id => elements.set(id, makeEl(id)));

    global.document = {
      getElementById: (id) => elements.get(id) || null,
      querySelector: () => null
    };
    global.window = {};

    const rawReport = [
      '[SCORE: 92/100]',
      '[AXES: Logic=94, Sources=90, Transparency=95, Facts=89]',
      '[GENRE: Vulgarisation tech]',
      '',
      '### 🎯 Indice de Fiabilité & Verdict Global',
      '> **Verdict :** Très solide.',
      '',
      '### 🔍 Recoupement Factuel',
      '| Affirmation | Preuve | Statut |',
      '|---|---|---|',
      '| Bug sampling | PR vérifiée | **Vérifié** |',
      '| Hypothèse annexe | Données partielles | À nuancer |',
      '| Rumeur infondée | Démenti | Fautif |',
      '',
      '### ⚖️ Analyse Logique',
      "- **Structure & Logique :** L'argumentation & l'ordre causal sont clairs.",
      '',
      '### 💼 Transparence Commerciale',
      '- Aucun sponsor caché.'
    ].join('\n');
    const mockReport = new AuditReport({
      videoId: 'v1',
      reliabilityScore: 92,
      status: 'reliable',
      rawMarkdown: rawReport,
      lang: 'fr'
    });

    let capturedStreamHtml = '';
    const ctrl = new AuditViewController({
      auditService: {
        isAuditing: false,
        async executeAudit({ onChunk }) {
          onChunk('', rawReport);
          capturedStreamHtml = elements.get('ytAiAuditBody').innerHTML;
          return mockReport;
        }
      }
    });

    await ctrl.startAudit({ currentProvider: 'lmstudio', getActiveModel: () => 'qwen-test', apiKeys: {} });

    assert.equal(capturedStreamHtml.includes('[SCORE: 92/100]'), false, 'Streamed audit view must not leak raw [SCORE] tag');
    assert.equal(capturedStreamHtml.includes('[AXES:'), false, 'Streamed audit view must not leak raw [AXES] tag');
    assert.equal(capturedStreamHtml.includes('[GENRE:'), false, 'Streamed audit view must not leak raw [GENRE] tag');
    assert.ok(capturedStreamHtml.includes('<section class="yt-ai-md-section">'), 'Streamed audit view must render section cards');

    const finalHtml = elements.get('ytAiAuditBody').innerHTML;
    assert.ok(finalHtml.includes('yt-ai-audit-hero-card'), 'Hero score card must be rendered');
    assert.ok(finalHtml.includes('yt-ai-genre-pill') && finalHtml.includes('Vulgarisation tech'), 'Genre pill must render inside hero header');
    assert.ok(finalHtml.includes('yt-ai-audit-visual-grid') && finalHtml.includes('yt-ai-audit-radar-svg'), '4-axis radar & bars dashboard must render');
    assert.ok(finalHtml.includes('yt-ai-pill-pass') && finalHtml.includes('yt-ai-pill-warn') && finalHtml.includes('yt-ai-pill-fail'), 'Fact-check table verdicts must render colored pills');
    assert.ok(finalHtml.includes('yt-ai-audit-core-card'), 'Verdict & Fact-check cards must stay open by default');
    assert.ok(finalHtml.includes('yt-ai-audit-accordion') && finalHtml.includes('L&#039;argumentation'), 'Deep sections must collapse cleanly with 1-line preview');
    assert.equal(finalHtml.includes('&amp;amp;') || finalHtml.includes('&amp;#039;'), false, 'Accordion preview must never double-escape HTML entities');
    assert.equal(finalHtml.includes('[SCORE: 92/100]'), false, 'Raw [SCORE: 92/100] text must be stripped below hero card');
    assert.ok(ctrl.lastReport.rawMarkdown.includes('[SCORE: 92/100]'), 'Copied/cached rawMarkdown must stay intact');
  });

  it('AuditVisualDashboard handles missing axes gracefully and parses localized metadata accurately', () => {
    const fallbackGenre = AuditVisualDashboard.parseVisualMetrics('- **Genre & Typologie :** Documentaire scientifique.\nTexte ok.', 'fr');
    assert.equal(fallbackGenre.genre, 'Documentaire scientifique');
    assert.equal(fallbackGenre.axes, null);
    assert.equal(AuditVisualDashboard.renderVisualDashboard(fallbackGenre, 85, 'fr'), '');

    const parsedFr = AuditVisualDashboard.parseVisualMetrics('[AXES: Logique=120, Sources=42, Transparence=65, Faits=88]\n[GENRE: Synthèse Tech Très Longue Avec Beaucoup De Mots Pour Tester Troncature]', 'en');
    assert.equal(parsedFr.axes[0].value, 100);
    assert.equal(parsedFr.axes[1].value, 42);
    assert.ok(parsedFr.genre.endsWith('…'));
  });

  it('Prompt builders enforce scannable Markdown directives across Video Audit, MultiPass Audit & Summaries', () => {
    const auditFrSys = AuditPromptBuilder.buildSystemPrompt('fr');
    const auditEnSys = AuditPromptBuilder.buildSystemPrompt('en');
    const auditFrUser = AuditPromptBuilder.buildAuditUserPrompt({ transcriptText: '[00:10] Demo', lang: 'fr' });
    const multiFr = MultiPassPromptBuilder.buildConsolidatedUserPrompt({ segmentNotes: ['[00:10] Point A'], lang: 'fr' });
    const sumFr = new PromptBuilder().buildSummaryPrompts('Titre', 'Auteur', '[00:10] Intro', 'fr', 'standard');

    assert.ok(auditFrSys.includes('MISE EN FORME SOIGNÉE'));
    assert.ok(auditEnSys.includes('SCANNABLE & VISUAL PRESENTATION'));
    assert.ok(auditFrUser.includes('> **Verdict :**') && auditFrUser.includes('| Élément / Affirmation |'));
    assert.ok(multiFr.includes('> **Verdict :**') && multiFr.includes('| Affirmation / Critère |'));
    assert.ok(sumFr.systemPrompt.includes('MISE EN FORME SOIGNÉE'));
  });

  it('ChannelAuditViewController formats Markdown cleanly in executive synthesis and BannerEventHandler delegates timestamp seek', () => {
    const containerEl = {
      innerHTML: '',
      querySelector: () => null,
      querySelectorAll: () => []
    };
    global.window = {};
    const ctrl = new ChannelAuditViewController();
    const rep = new ChannelAuditReport({
      channelTitle: 'Tech Lab',
      channelHandle: '@techlab',
      globalScore: 88,
      clickbaitIndex: 8,
      trajectory: 'improving',
      trajectoryLabel: 'Progression',
      temporalEvolution: 'Rigueur croissante depuis [01:20].',
      strengths: ['**Sources citées** dans chaque test'],
      weaknesses: ['Rythme parfois dense'],
      drawbacks: [],
      evaluatedVideos: [],
      executiveSummary: '**Chaîne très fiable.**\n- Sources vérifiées [02:15]'
    });
    ctrl.renderReport(rep, containerEl, 'fr');
    assert.ok(containerEl.innerHTML.includes('<strong>Sources citées</strong>'));
    assert.ok(containerEl.innerHTML.includes('yt-ai-timestamp-link'));
    assert.ok(containerEl.innerHTML.includes('<strong>Chaîne très fiable.</strong>'));

    // Verify delegated timestamp seek in BannerEventHandler
    let bannerClickHandler = null;
    const mockVideo = { currentTime: 0, playCalled: false, play: () => { mockVideo.playCalled = true; return Promise.resolve(); } };
    global.document = {
      getElementById: () => null,
      querySelector: (sel) => (sel === 'video' ? mockVideo : null)
    };
    const fakeBanner = {
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: (evt, fn) => { if (evt === 'click') bannerClickHandler = fn; }
    };
    const noop = () => {};
    BannerEventHandler.bind(fakeBanner, {
      state: { currentLang: 'fr', apiKeys: {}, serverUrls: {}, savePreference: noop, getActiveModel: () => 'm' },
      bannerView: { switchTab: noop, toggleExpand: noop, applyLanguage: noop, setExpanded: noop },
      settingsDrawer: { syncProviderUI: noop, bindPasteButton: noop },
      summaryViewController: {},
      chatViewController: {},
      auditViewController: {},
      audioController: { init: noop },
      transcriptController: {}
    });
    assert.equal(typeof bannerClickHandler, 'function');
    const linkTarget = {
      getAttribute: (a) => (a === 'data-time' ? '145' : null),
      closest: () => linkTarget
    };
    let prevented = false;
    bannerClickHandler({ target: linkTarget, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(mockVideo.currentTime, 145);
    assert.equal(mockVideo.playCalled, true);
  });

  it('CSS stylesheet maintains clean section card layout, accent H3 headings, and visible bullet/decimal markers', () => {
    const css = fs.readFileSync(path.resolve('src/content/content.css'), 'utf-8');
    assert.ok(css.includes('.yt-ai-md-section'), 'Section cards must be styled');
    assert.ok(css.includes('ul.yt-ai-points-list > li.yt-ai-point-item::before'), 'Top-level bullet markers must be visible');
    assert.ok(css.includes('ul.yt-ai-sublist > li.yt-ai-subitem::before'), 'Nested sublist markers must be styled');
    assert.ok(css.includes('ol.yt-ai-ordered-list > li.yt-ai-point-item'), 'Ordered lists must render decimal markers');
    assert.ok(css.includes('list-style: decimal !important'), 'Ordered list decimal style must not be stripped');
    assert.equal(css.includes('--yt-ai-text-primary'), false, 'All CSS tokens must resolve to defined --yt-ai-text');
  });

  it('guarantees rich structured formatting across all 8 languages, all 3 summary modes, channel audit, Q&A, and CJK/Cyrillic Markdown', () => {
    const allLangs = ['fr', 'en', 'es', 'it', 'de', 'ru', 'ja', 'zh'];
    const modes = ['quick', 'standard', 'detailed'];
    const langScriptHints = {
      fr: 'En Bref', en: 'Quick Summary', es: 'En Breve', it: 'In Breve',
      de: 'Kurz', ru: 'Краткий', ja: '要点', zh: '核心概要'
    };

    for (const lang of allLangs) {
      assert.ok(getFormatInstructions('quick', lang).includes(langScriptHints[lang]), `${lang} must resolve native template rather than silent English fallback`);
      for (const mode of modes) {
        const tmpl = getFormatInstructions(mode, lang);
        assert.ok(tmpl.includes('### '), `${lang}/${mode} must enforce heading sections`);
        assert.ok(tmpl.includes('- **'), `${lang}/${mode} must enforce bold bullet points`);
        if (mode === 'detailed') {
          assert.ok(tmpl.includes('> **') && tmpl.includes('1. '), `${lang}/detailed must include callout blockquote and numbered action steps`);
        }
      }

      // Video Audit & Channel Audit & Video Q&A across all languages
      const vaSys = AuditPromptBuilder.buildSystemPrompt(lang);
      const caSys = ChannelAuditPromptBuilder.buildSystemPrompt(lang);
      const qaSys = PromptService.buildChatSystemPrompt({ title: 'Test', author: 'Creator' }, '[00:10] Hello', lang, 'standard');
      assert.ok(vaSys.includes('[SCORE: XX/100]') && (vaSys.includes('MISE EN FORME') || vaSys.includes('SCANNABLE')));
      assert.ok(caSys.includes('> **Verdict') && (caSys.includes('FORME SOIGNÉE') || caSys.includes('STRICT LANGUAGE & FORMATTING')));
      assert.ok(qaSys.includes('SCANNABLE & STRUCTURED MARKDOWN'));
    }

    // Channel audit adapts formatting to kids, fiction, tech, science, music, news categories seamlessly
    const kidsUser = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: '[00:05] Cartoon adventure.',
      videoMeta: { title: 'Cartoon', author: 'KidsTV' },
      lang: 'fr'
    });
    assert.ok(kidsUser.includes('purement récréative, musicale ou jeunesse sans données chiffrées'));

    // Unicode Cyrillic + CJK colons & bold-italic emphasis render crisply
    const intlMd = [
      '### 🌐 Multilingue',
      '**Ключевой вывод** : Строгая методика доказана [01:12].',
      '**核心观点**：结合 ***关键证据*** 的完整分析。'
    ].join('\n');
    const intlHtml = MarkdownRenderer.renderMarkdown(intlMd, null, { sectionCards: true });
    assert.ok(intlHtml.includes('<section class="yt-ai-md-section">'));
    assert.ok(intlHtml.includes('<ul class="yt-ai-points-list">'));
    assert.ok(intlHtml.includes('<strong><em>关键证据</em></strong>'));
  });
});
