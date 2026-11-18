import { I18N } from '../../locales/index.js';
import { renderMarkdown, escapeHtml, safeSetInnerHTML, stripScoreTags } from './MarkdownRenderer.js';
import { AuditVisualDashboard } from './AuditVisualDashboard.js';
import { QuickOnboardingHelper } from '../services/QuickOnboardingHelper.js';
import { AuditProgressBar } from './AuditProgressBar.js';
import { ChannelAuditJobTracker } from '../services/ChannelAuditJobTracker.js';
import { WatchChannelAuditHelper } from './WatchChannelAuditHelper.js';

/**
 * Controller for In-Page Critical Audit & Logic Verification Tab
 */
export class AuditViewController {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.auditService
   * @param {Object} dependencies.chatViewController
   * @param {Object} [dependencies.bannerView]
   * @param {Object} [dependencies.channelAuditService]
   * @param {Object} [dependencies.channelAuditViewController]
   */
  constructor(dependencies = {}) {
    this.auditService = dependencies.auditService;
    this.chatViewController = dependencies.chatViewController;
    this.bannerView = dependencies.bannerView;
    this.channelAuditService = dependencies.channelAuditService;
    this.channelAuditViewController = dependencies.channelAuditViewController;
    this.lastReport = null;
  }

  /**
   * Builds the interactive visual Hero Score Card
   * @param {Object} report
   * @param {string} [lang='fr']
   * @returns {string} HTML
   */
  renderAuditHeroCard(report, lang = 'fr', metrics = null) {
    if (!report) return '';
    const score = typeof report.reliabilityScore === 'number' ? report.reliabilityScore : 80;
    const badge = report.getReliabilityBadge(lang);
    const tier = typeof report.getGranularTier === 'function' ? report.getGranularTier(lang) : null;
    const resolvedMetrics = metrics || AuditVisualDashboard.parseVisualMetrics(report.rawMarkdown, lang);
    const isLow = score < 50;
    const isMed = score >= 50 && score < 75;
    const levelClass = isLow ? 'yt-ai-score-low' : isMed ? 'yt-ai-score-med' : 'yt-ai-score-high';
    const verdictDesc = tier?.desc || (isLow
      ? (lang === 'fr' ? 'Biais cognitifs, spéculation ou affirmations trompeuses' : 'High bias or deceptive claims')
      : isMed
        ? (lang === 'fr' ? 'Analyse nuancée, affirmations à vérifier avec recul' : 'Mixed rigor, claims require caution')
        : (lang === 'fr' ? 'Rigueur et cohérence logique élevées' : 'High logical rigor & consistency'));
    const tierPill = tier ? `<span class="yt-ai-tier-pill" style="border-color:${tier.hexColor}66;color:${tier.hexColor};">${escapeHtml(tier.rangeLabel)} · ${escapeHtml(tier.shortLabel)}</span>` : '';
    const genrePill = resolvedMetrics?.genre ? `<span class="yt-ai-genre-pill">🏷️ ${escapeHtml(resolvedMetrics.genre)}</span>` : '';

    return `
      <div class="yt-ai-audit-hero-card ${levelClass}">
        <div class="yt-ai-audit-hero-main">
          <div class="yt-ai-audit-gauge-circle" ${tier ? `style="border-color:${tier.hexColor};color:${tier.hexColor};"` : ''}><span class="yt-ai-audit-gauge-val">${score}</span><span class="yt-ai-audit-gauge-max">/100</span></div>
          <div class="yt-ai-audit-hero-meta">
            <div class="yt-ai-audit-status-badge">${escapeHtml(badge.label)} ${tierPill} ${genrePill}</div>
            <div class="yt-ai-audit-hero-desc">${escapeHtml(verdictDesc)}</div>
          </div>
        </div>
        <div class="yt-ai-audit-meter yt-ai-audit-meter-spectrum"><div class="yt-ai-audit-meter-fill" style="width:${Math.max(6, Math.min(100, score))}%;${tier?.gradient ? `background:${tier.gradient};` : tier ? `background:${tier.hexColor};` : ''}"></div></div>
      </div>
    `;
  }

  stopAudit(lang = 'fr') {
    this.auditService?.abortAudit?.('stopped');
    const t = I18N[lang] || I18N.en;
    const progBox = document.getElementById('ytAiAuditProgressContainer');
    const runBtn = document.getElementById('ytAiRunAuditBtn');
    if (progBox) {
      progBox.classList.add('yt-ai-hidden');
      progBox.innerHTML = '';
    }
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.classList?.remove('yt-ai-btn-stop');
      runBtn.textContent = this.lastReport ? (t.relaunchAuditBtn || '⚡ Relancer l\'audit') : (t.runAuditBtn || '⚡ Lancer l\'audit');
    }
  }

  /**
   * Starts or stops critical logic & fact-checking audit
   * @param {Object} ctx
   */
  async startAudit(ctx = {}) {
    const stateObj = ctx.state || ctx;
    const lang = document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || stateObj.currentLang || 'fr';
    if (this.auditService?.isAuditing) {
      this.stopAudit(lang);
      return;
    }
    const t = I18N[lang] || I18N.en;
    const isFr = lang.startsWith('fr');

    const runBtn = document.getElementById('ytAiRunAuditBtn');
    const copyBtn = document.getElementById('ytAiCopyAuditBtn');
    const statusBox = document.getElementById('ytAiAuditStatus');
    const bodyBox = document.getElementById('ytAiAuditBody');
    const progBox = document.getElementById('ytAiAuditProgressContainer');

    const activeModel = (typeof ctx.getActiveModel === 'function' ? ctx.getActiveModel() : null) ||
      (typeof stateObj.getActiveModel === 'function' ? stateObj.getActiveModel() : null) ||
      stateObj.selectedModel || '';

    if (!activeModel) {
      const msg = t.selectModelAlert || 'Veuillez sélectionner un modèle IA dans les réglages ci-dessus.';
      if (bodyBox) bodyBox.innerHTML = `<p style="color: #f85149;">[!] ${escapeHtml(msg)}</p>`;
      return;
    }

    const currentProvider = stateObj.currentProvider || 'lmstudio';
    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const apiKeys = stateObj.apiKeys || {};
    const key = apiKeys[currentProvider] || '';

    if (!isLocal && !key) {
      if (bodyBox) bodyBox.innerHTML = QuickOnboardingHelper.formatMissingKeyNotice(currentProvider, lang);
      return;
    }

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.classList?.add('yt-ai-btn-stop');
      runBtn.textContent = t.stopListenBtn || (isFr ? '⏹ Arrêter' : '⏹ Stop');
    }
    if (copyBtn) copyBtn.classList.add('yt-ai-hidden');
    if (statusBox) statusBox.classList.add('yt-ai-hidden');

    if (progBox) {
      progBox.classList.remove('yt-ai-hidden');
      progBox.innerHTML = AuditProgressBar.renderWidget({
        percent: 10,
        title: t.auditStarting || 'Preparing audit dossier...',
        detail: isFr ? 'Transcription intégrale et descriptions (0 coupure)' : 'Full transcript & video metadata',
        showStop: true,
        stopLabel: t.stopShortBtn || 'Stop'
      });
      AuditProgressBar.bindStopAction(progBox, () => this.stopAudit(lang));
    }
    if (bodyBox) {
      bodyBox.innerHTML = `<p style="color: var(--yt-ai-text-muted); font-style: italic;">${t.auditAnalyzing || 'Examen de la cohérence logique et des faits en cours...'}</p>`;
    }

    let hasStreamedChunks = false;
    try {
      const report = await this.auditService.executeAudit({
        lang,
        state: stateObj,
        onProgress: (prog) => {
          if (progBox) {
            AuditProgressBar.updateWidget(progBox, {
              percent: prog.percent,
              title: prog.message || t.auditAnalyzing,
              detail: prog.detail || ''
            });
          }
        },
        onChunk: (chunk, acc) => {
          hasStreamedChunks = true;
          if (bodyBox) {
            renderMarkdown(stripScoreTags(acc), bodyBox, { sectionCards: true });
            this.bindTimestampLinks(bodyBox);
          }
        }
      });

      this.lastReport = report;
      stateObj.cachedAuditReport = report;

      if (progBox) {
        progBox.classList.add('yt-ai-hidden');
        progBox.innerHTML = '';
      }

      if (bodyBox) {
        const metrics = AuditVisualDashboard.parseVisualMetrics(report.rawMarkdown, lang);
        const heroHtml = this.renderAuditHeroCard(report, lang, metrics);
        const visualGridHtml = AuditVisualDashboard.renderVisualDashboard(metrics, report.reliabilityScore, lang);
        const rawBodyHtml = renderMarkdown(stripScoreTags(report.rawMarkdown), null, { sectionCards: true });
        const bodyHtml = AuditVisualDashboard.formatInteractiveSections(rawBodyHtml, lang);
        safeSetInnerHTML(bodyBox, heroHtml + visualGridHtml + bodyHtml);
        this.bindTimestampLinks(bodyBox);
      }

      const auditTabBadge = document.getElementById('ytAiTabAuditBtn');
      if (auditTabBadge) {
        const badgeColor = report.reliabilityScore >= 75 ? 'yt-ai-badge-success' : report.reliabilityScore >= 50 ? 'yt-ai-badge-warning' : 'yt-ai-badge-danger';
        safeSetInnerHTML(auditTabBadge, `${t.tabAudit || '🛡️ Audit'} <span class="yt-ai-tab-count-badge ${badgeColor}">${report.reliabilityScore}/100</span>`);
      }

      if (copyBtn) copyBtn.classList.remove('yt-ai-hidden');
    } catch (err) {
      if (progBox) {
        progBox.classList.add('yt-ai-hidden');
        progBox.innerHTML = '';
      }
      if (ChannelAuditJobTracker.isAbortError(err)) {
        const stoppedText = t.auditStoppedNote || '⏹ Processing stopped by user.';
        if (statusBox && hasStreamedChunks) {
          statusBox.classList.remove('yt-ai-hidden');
          statusBox.textContent = stoppedText;
        } else if (bodyBox && !hasStreamedChunks) {
          bodyBox.innerHTML = `<p class="yt-ai-stopped-note">${escapeHtml(stoppedText)}</p>`;
        }
      } else if (bodyBox) {
        bodyBox.innerHTML = `<p style="color: #f85149;">[!] ${escapeHtml(err.message || t.connectionError || I18N.en.connectionError)}</p>`;
      }
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.classList?.remove('yt-ai-btn-stop');
        runBtn.textContent = this.lastReport ? (t.relaunchAuditBtn || '⚡ Relancer l\'audit') : (t.runAuditBtn || '⚡ Lancer l\'audit');
      }
    }
  }

  /**
   * Switches between Video Audit view and Channel Audit view
   * @param {'video'|'channel'} subtab
   */
  switchAuditSubtab(subtab = 'video') {
    const isChan = subtab === 'channel';
    document.getElementById('ytAiAuditVideoView')?.classList.toggle('yt-ai-hidden', isChan);
    document.getElementById('ytAiChannelAuditContainer')?.classList.toggle('yt-ai-hidden', !isChan);
    document.getElementById('ytAiAuditSubtabVideoBtn')?.classList.toggle('active', !isChan);
    document.getElementById('ytAiAuditSubtabChannelBtn')?.classList.toggle('active', isChan);
  }

  stopChannelAudit(lang = 'fr') {
    this.channelAuditService?.abortAudit?.('stopped');
    WatchChannelAuditHelper.setButtonRunning(false, lang);
    const progBox = document.getElementById('ytAiWatchChannelProgress') || document.getElementById('ytAiChannelAuditProgressContainer');
    if (progBox) { progBox.classList.add('yt-ai-hidden'); progBox.innerHTML = ''; }
  }

  async syncChannelAuditUI(stateObj = {}) {
    return WatchChannelAuditHelper.syncUI(this, stateObj);
  }

  async handleTriggerChannelAudit(ctx = {}) {
    return WatchChannelAuditHelper.execute(this, ctx);
  }

  /**
   * Binds clickable seeking behavior to all timestamps [MM:SS] in rendered markdown
   * @param {HTMLElement} container
   */
  bindTimestampLinks(container) {
    if (!container) return;
    container.querySelectorAll('a[data-seek], a[href^="#t="], .yt-ai-timestamp-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = parseFloat(link.getAttribute('data-time') || link.getAttribute('data-seek') || link.getAttribute('href')?.replace('#t=', '') || 0);
        const video = document.querySelector('video');
        if (video && !isNaN(sec)) { video.currentTime = sec; video.play().catch(() => {}); }
      });
    });
  }

  /**
   * Handles copying audit markdown to clipboard
   */
  handleCopyAudit(lang = 'en') {
    const text = this.lastReport?.rawMarkdown || '';
    if (!text) return;
    const activeLang = document.getElementById('ytAiLangSelect')?.value || lang;
    const copiedLabel = (I18N[activeLang] || I18N.en).copiedBtn || '✅ Copied!';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('ytAiCopyAuditBtn');
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = copiedLabel;
        setTimeout(() => { btn.textContent = prev; }, 2000);
      }
    }).catch(() => {});
  }

  /**
   * Updates localized strings on language switch
   * @param {string} lang
   * @param {Object|null} [state=null]
   */
  applyLanguage(lang, state = null) {
    WatchChannelAuditHelper.applyAuditViewLanguage(this, lang, state);
  }
}

export default AuditViewController;
