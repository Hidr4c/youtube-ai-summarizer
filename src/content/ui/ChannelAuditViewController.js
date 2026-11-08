import { escapeHtml, safeSetInnerHTML, renderMarkdown } from './MarkdownRenderer.js';
import { I18N } from '../../locales/index.js';

/**
 * View Controller for Rendering YouTube Channel Global Audit
 * Renders statistical gauges, proportion bar, trajectory, and qualitative pillars
 */
export class ChannelAuditViewController {
  /**
   * @param {Object} [dependencies]
   * @param {Object} [dependencies.channelAuditService]
   * @param {Object} [dependencies.bannerView]
   */
  constructor(dependencies = {}) {
    this.service = dependencies.channelAuditService;
    this.bannerView = dependencies.bannerView;
    this.lastReport = null;
  }

  /**
   * Renders the complete channel audit view inside a target container
   * @param {ChannelAuditReport} report
   * @param {HTMLElement} container
   * @param {string} [lang='fr']
   */
  renderReport(report, container, lang = 'fr') {
    if (!report || !container) return;
    this.lastReport = report;

    const t = I18N[lang] || I18N.fr;
    const scoreClass = report.globalScore >= 75 ? 'yt-ai-score-high' : report.globalScore >= 50 ? 'yt-ai-score-med' : 'yt-ai-score-low';
    const trajIcon = report.trajectory === 'improving' ? '↗' : report.trajectory === 'declining' ? '↘' : '→';
    const trajClass = report.trajectory === 'improving' ? 'yt-ai-traj-up' : report.trajectory === 'declining' ? 'yt-ai-traj-down' : 'yt-ai-traj-stable';

    const p = report.proportions || { reliablePct: 60, cautionPct: 30, clickbaitPct: 10 };

    const html = `
      <div class="yt-ai-channel-audit-wrapper">
        <!-- Hero Header & Score Gauge -->
        <div class="yt-ai-audit-hero-card">
          <div class="yt-ai-gauge-wrapper">
            <div class="yt-ai-gauge-circle ${scoreClass}">
              <span class="yt-ai-gauge-num">${report.globalScore}</span>
              <span class="yt-ai-gauge-unit">/100</span>
            </div>
          </div>
          <div class="yt-ai-audit-meta">
            <div class="yt-ai-audit-status-badge ${scoreClass}">
              <span class="yt-ai-badge-icon">${escapeHtml(report.badge?.symbol || '✓')}</span>
              <span>${escapeHtml(report.badge?.label || 'Score Global')}</span>
            </div>
            <div class="yt-ai-channel-title-row">
              <strong>${escapeHtml(report.channelTitle)}</strong>
              <span class="yt-ai-channel-handle">${escapeHtml(report.channelHandle)}</span>
              ${report.subscribers ? `<span class="yt-ai-sub-pill">${escapeHtml(report.subscribers)}</span>` : ''}
            </div>
            <div class="yt-ai-sample-info-pill">
              <span>Échantillon : <strong>${report.sampleSize} vidéos</strong> (Pondération récente ~65% & historique ~35%)</span>
            </div>
          </div>
        </div>

        <!-- Proportion Distribution Bar & Clickbait Index -->
        <div class="yt-ai-stat-card">
          <div class="yt-ai-stat-header">
            <span><strong>Proportion d'intégrité éditoriale</strong> (${report.sampleSize} vidéos analysées)</span>
            <span class="yt-ai-clickbait-tag">Indice Sensationnalisme : <strong>${report.clickbaitIndex}%</strong></span>
          </div>
          <div class="yt-ai-proportion-bar">
            <div class="yt-ai-prop-segment yt-ai-prop-reliable" style="width: ${p.reliablePct}%" title="Fiable: ${p.reliablePct}%">
              ${p.reliablePct >= 12 ? `${p.reliablePct}%` : ''}
            </div>
            <div class="yt-ai-prop-segment yt-ai-prop-caution" style="width: ${p.cautionPct}%" title="Vigilance: ${p.cautionPct}%">
              ${p.cautionPct >= 12 ? `${p.cautionPct}%` : ''}
            </div>
            <div class="yt-ai-prop-segment yt-ai-prop-clickbait" style="width: ${p.clickbaitPct}%" title="Sensationnalisme: ${p.clickbaitPct}%">
              ${p.clickbaitPct >= 12 ? `${p.clickbaitPct}%` : ''}
            </div>
          </div>
          <div class="yt-ai-proportion-legend">
            <span><span class="yt-ai-dot yt-ai-dot-green"></span> ${p.reliablePct}% Fiable (≥75)</span>
            <span><span class="yt-ai-dot yt-ai-dot-amber"></span> ${p.cautionPct}% Modéré (50-74)</span>
            <span><span class="yt-ai-dot yt-ai-dot-red"></span> ${p.clickbaitPct}% Risque (&lt;50)</span>
          </div>
        </div>

        <!-- Trajectory & Year-over-Year Evolution -->
        <div class="yt-ai-stat-card yt-ai-trajectory-card">
          <div class="yt-ai-stat-header">
            <span><strong>Évolution & Trajectoire temporelle</strong></span>
            <span class="yt-ai-traj-badge ${trajClass}">[${trajIcon}] ${escapeHtml(report.trajectoryLabel)}</span>
          </div>
          ${report.temporalEvolution ? `<div class="yt-ai-traj-desc">${escapeHtml(report.temporalEvolution)}</div>` : ''}
        </div>

        <!-- The 3 Pillars: Good / Less good / Bad -->
        <div class="yt-ai-pillars-grid">
          <div class="yt-ai-pillar-col yt-ai-pillar-good">
            <div class="yt-ai-pillar-title"><span class="yt-ai-pillar-icon">✓</span> Ce qu'elle fait de bien (Forces)</div>
            <ul class="yt-ai-pillar-list">
              ${(report.strengths.length > 0 ? report.strengths : ['Rigueur générale appréciable']).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
          <div class="yt-ai-pillar-col yt-ai-pillar-warn">
            <div class="yt-ai-pillar-title"><span class="yt-ai-pillar-icon">!</span> Ce qu'elle fait de moins bien (Vigilance)</div>
            <ul class="yt-ai-pillar-list">
              ${(report.weaknesses.length > 0 ? report.weaknesses : ['Simplifications ponctuelles']).map(w => `<li>${escapeHtml(w)}</li>`).join('')}
            </ul>
          </div>
          <div class="yt-ai-pillar-col yt-ai-pillar-bad">
            <div class="yt-ai-pillar-title"><span class="yt-ai-pillar-icon">✕</span> Écueils & Pièges (À éviter)</div>
            <ul class="yt-ai-pillar-list">
              ${(report.drawbacks.length > 0 ? report.drawbacks : ['Titres parfois sensationnalistes']).map(d => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Sampled Video Breakdown Accordion -->
        <details class="yt-ai-video-sample-accordion">
          <summary class="yt-ai-sample-summary">
            <span>🎬 Détail des vidéos échantillonnées (${report.evaluatedVideos.length})</span>
            <span class="yt-ai-accordion-arrow">▾</span>
          </summary>
          <div class="yt-ai-sample-list">
            ${report.evaluatedVideos.map((v, i) => `
              <div class="yt-ai-sample-item">
                <div class="yt-ai-sample-item-top">
                  <span class="yt-ai-sample-num">#${i + 1}</span>
                  <span class="yt-ai-era-badge yt-ai-era-${v.era}">${escapeHtml(v.eraLabel || v.era)}</span>
                  <a href="${escapeHtml(v.url || `https://youtu.be/${v.id}`)}" target="_blank" class="yt-ai-sample-title">${escapeHtml(v.title)}</a>
                  <span class="yt-ai-sample-score ${v.score >= 75 ? 'yt-ai-score-high' : v.score >= 50 ? 'yt-ai-score-med' : 'yt-ai-score-low'}">${v.score}/100</span>
                </div>
                ${v.comment ? `<div class="yt-ai-sample-comment">${escapeHtml(v.comment)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </details>

        <!-- Executive Summary -->
        ${report.executiveSummary ? `
          <div class="yt-ai-exec-summary-box">
            <h4>Synthèse & Recommandation Globale</h4>
            <div class="yt-ai-exec-text">${escapeHtml(report.executiveSummary)}</div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="yt-ai-audit-actions-row">
          <button id="ytAiCopyChannelAuditBtn" class="yt-ai-btn yt-ai-btn-secondary">📋 Copier l'audit</button>
        </div>
      </div>
    `;

    safeSetInnerHTML(container, html);

    container.querySelector('#ytAiCopyChannelAuditBtn')?.addEventListener('click', () => {
      this.handleCopyReport(report);
    });
  }

  handleCopyReport(report) {
    if (!report) return;
    const text = [
      `### 📊 AUDIT GLOBAL DE CHAÎNE : ${report.channelTitle} (${report.channelHandle})`,
      `- Note globale pondérée : ${report.globalScore}/100 (${report.badge?.label || ''})`,
      `- Indice de sensationnalisme : ${report.clickbaitIndex}%`,
      `- Répartition : ${report.proportions?.reliablePct}% Fiable, ${report.proportions?.cautionPct}% Modéré, ${report.proportions?.clickbaitPct}% Risque`,
      `- Trajectoire temporelle : ${report.trajectoryLabel}`,
      `\n#### Ce que la chaîne fait de bien :`,
      ...report.strengths.map(s => `  * ${s}`),
      `\n#### Ce qu'elle fait de moins bien :`,
      ...report.weaknesses.map(w => `  * ${w}`),
      `\n#### Écueils et dérives constatés :`,
      ...report.drawbacks.map(d => `  * ${d}`),
      `\n#### Synthèse :`,
      report.executiveSummary || ''
    ].join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('ytAiCopyChannelAuditBtn');
        if (btn) {
          const original = btn.textContent;
          btn.textContent = '✓ Copié !';
          setTimeout(() => { btn.textContent = original; }, 2000);
        }
      });
    }
  }
}

export default ChannelAuditViewController;
