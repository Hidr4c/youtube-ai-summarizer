import { I18N } from '../../locales/index.js';
import { renderMarkdown, escapeHtml } from './MarkdownRenderer.js';
import { QuickOnboardingHelper } from '../services/QuickOnboardingHelper.js';
import { YouTubeDOMContext } from '../services/YouTubeDOMContext.js';
import { AuditProgressBar } from './AuditProgressBar.js';

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
  renderAuditHeroCard(report, lang = 'fr') {
    if (!report) return '';
    const score = typeof report.reliabilityScore === 'number' ? report.reliabilityScore : 80;
    const badge = report.getReliabilityBadge(lang);
    const isLow = score < 50;
    const isMed = score >= 50 && score < 75;
    const levelClass = isLow ? 'yt-ai-score-low' : isMed ? 'yt-ai-score-med' : 'yt-ai-score-high';
    const verdictDesc = isLow
      ? (lang === 'fr' ? 'Biais cognitifs, spéculation ou affirmations trompeuses' : 'High bias or deceptive claims')
      : isMed
        ? (lang === 'fr' ? 'Analyse nuancée, affirmations à vérifier avec recul' : 'Mixed rigor, claims require caution')
        : (lang === 'fr' ? 'Rigueur et cohérence logique élevées' : 'High logical rigor & consistency');

    return `
      <div class="yt-ai-audit-hero-card ${levelClass}">
        <div class="yt-ai-audit-hero-main">
          <div class="yt-ai-audit-gauge-circle"><span class="yt-ai-audit-gauge-val">${score}</span><span class="yt-ai-audit-gauge-max">/100</span></div>
          <div class="yt-ai-audit-hero-meta">
            <div class="yt-ai-audit-status-badge">${escapeHtml(badge.label)}</div>
            <div class="yt-ai-audit-hero-desc">${escapeHtml(verdictDesc)}</div>
          </div>
        </div>
        <div class="yt-ai-audit-meter"><div class="yt-ai-audit-meter-fill" style="width: ${Math.max(6, Math.min(100, score))}%;"></div></div>
      </div>
    `;
  }

  /**
   * Starts critical logic & fact-checking audit
   * @param {Object} ctx
   */
  async startAudit(ctx = {}) {
    const stateObj = ctx.state || ctx;
    const period = ctx.period || stateObj.channelAuditPeriod || 'all';
    const lang = document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || stateObj.currentLang || 'fr';
    const t = I18N[lang] || I18N.en;

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
      runBtn.disabled = true;
      runBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.auditInProgress || 'Audit en cours...'}`;
    }
    if (copyBtn) copyBtn.classList.add('yt-ai-hidden');
    if (statusBox) statusBox.classList.add('yt-ai-hidden');

    if (progBox) {
      progBox.classList.remove('yt-ai-hidden');
      progBox.innerHTML = AuditProgressBar.renderWidget({
        percent: 10,
        title: 'Collecte des informations et sources...',
        detail: 'Transcription intégrale et descriptions (0 coupure)'
      });
    }
    if (bodyBox) {
      bodyBox.innerHTML = `<p style="color: #8b949e; font-style: italic;">${t.auditAnalyzing || 'Examen de la cohérence logique et des faits en cours...'}</p>`;
    }

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
          if (bodyBox) {
            renderMarkdown(acc, bodyBox);
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
        const heroHtml = this.renderAuditHeroCard(report, lang);
        bodyBox.innerHTML = heroHtml + renderMarkdown(report.rawMarkdown);
        this.bindTimestampLinks(bodyBox);
      }

      const auditTabBadge = document.getElementById('ytAiTabAuditBtn');
      if (auditTabBadge) {
        const badgeColor = report.reliabilityScore >= 75 ? 'yt-ai-badge-success' : report.reliabilityScore >= 50 ? 'yt-ai-badge-warning' : 'yt-ai-badge-danger';
        auditTabBadge.innerHTML = `${t.tabAudit || '🛡️ Audit'} <span class="yt-ai-tab-count-badge ${badgeColor}">${report.reliabilityScore}/100</span>`;
      }

      if (copyBtn) copyBtn.classList.remove('yt-ai-hidden');
    } catch (err) {
      if (bodyBox) bodyBox.innerHTML = `<p style="color: #f85149;">[!] ${escapeHtml(err.message || 'Erreur lors de l’audit')}</p>`;
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = t.runAuditBtn || '⚡ Lancer l\'audit';
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

  /**
   * Triggers consolidated channel audit from the banner
   * @param {Object} ctx
   */
  async handleTriggerChannelAudit(ctx = {}) {
    if (!this.channelAuditService || !this.channelAuditViewController) return;
    this.switchAuditSubtab('channel');
    const stateObj = ctx.state || ctx;
    const period = ctx.period || stateObj.channelAuditPeriod || 'all';
    const lang = document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || stateObj.currentLang || 'fr';

    const btn = document.getElementById('ytAiAuditChannelBtn');
    const container = document.getElementById('ytAiChannelAuditBody') || document.getElementById('ytAiChannelAuditContainer');
    const progBox = document.getElementById('ytAiChannelAuditProgressContainer');
    if (!container) return;

    const meta = YouTubeDOMContext.getVideoMetadata();
    const query = meta.channelUrl || meta.author || '';
    if (!query) {
      container.innerHTML = `<p style="color: #ff7b72;">[!] Impossible d'identifier la chaîne du créateur.</p>`;
      return;
    }

    if (btn) btn.disabled = true;
    if (progBox) {
      progBox.classList.remove('yt-ai-hidden');
      progBox.innerHTML = AuditProgressBar.renderWidget({
        percent: 10,
        title: 'Collecte des vidéos et descriptions...',
        detail: `${meta.author || ''} (0 coupure)`
      });
    }
    container.innerHTML = `<p style="color: #8b949e; font-style: italic;">Examen de la chaîne en cours...</p>`;

    try {
      const report = await this.channelAuditService.executeChannelAudit({
        channelQuery: query,
        period,
        lang,
        state: stateObj,
        onProgress: (status) => {
          if (progBox) {
            AuditProgressBar.updateWidget(progBox, {
              percent: status.percent,
              title: status.message || status.title,
              detail: status.detail || ''
            });
          }
        }
      });

      if (progBox) {
        progBox.classList.add('yt-ai-hidden');
        progBox.innerHTML = '';
      }

      this.channelAuditViewController.renderReport(report, container, lang);
    } catch (err) {
      container.innerHTML = `<p style="color: #ff7b72; font-size: 12px;">[!] Erreur lors de l'audit de chaîne : ${escapeHtml(err.message || String(err))}</p>`;
    } finally {
      if (btn) btn.disabled = false;
    }
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
  handleCopyAudit() {
    const text = this.lastReport?.rawMarkdown || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('ytAiCopyAuditBtn');
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = '✓ Copié !';
        setTimeout(() => { btn.textContent = prev; }, 2000);
      }
    }).catch(() => {});
  }

  /**
   * Updates localized strings on language switch
   * @param {string} lang
   */
  applyLanguage(lang) {
    const t = I18N[lang] || I18N.en;
    const el = (id) => document.getElementById(id);
    if (el('ytAiAuditHeaderTitle')) el('ytAiAuditHeaderTitle').textContent = t.auditTitle || '🛡️ Audit Critique, Logique & Véracité';
    if (el('ytAiAuditChannelBtn')) el('ytAiAuditChannelBtn').textContent = t.auditChannelBtn || '🔍 Auditer la chaîne';
    if (el('ytAiRunAuditBtn') && !this.auditService?.isAuditing) {
      el('ytAiRunAuditBtn').textContent = this.lastReport ? (t.relaunchAuditBtn || '⚡ Relancer l\'audit') : (t.runAuditBtn || '⚡ Lancer l\'audit');
    }
    if (el('ytAiCopyAuditBtn')) el('ytAiCopyAuditBtn').textContent = t.copyBtn || '📋 Copier';
  }
}

export default AuditViewController;
