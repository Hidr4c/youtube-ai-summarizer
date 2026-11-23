import { escapeHtml, safeSetInnerHTML, renderMarkdown, formatInline } from './MarkdownRenderer.js';
import { I18N } from '../../locales/index.js';
import { ScoreTierScale } from '../../domain/services/ScoreTierScale.js';
import { SensationalismScale } from '../../domain/services/SensationalismScale.js';
import { ChannelFormatStatsRenderer } from './ChannelFormatStatsRenderer.js';
import { ChannelFormatAnalyzer } from '../../domain/services/ChannelFormatAnalyzer.js';

/**
 * View Controller for Rendering YouTube Channel Global Audit
 * Renders statistical gauges, 5%-step distribution histogram, sensationalism analytics, trajectory, and pillars
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
   * Alias for renderReport to guarantee compatibility across controllers
   * @param {ChannelAuditReport} report
   * @param {HTMLElement} container
   * @param {string} [lang='fr']
   */
  renderChannelReport(report, container, lang = 'fr') {
    return this.renderReport(report, container, lang);
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

    const t = I18N[lang] || I18N.en;
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const tier = typeof report.globalScore === 'number'
      ? ScoreTierScale.getTier(report.globalScore, lang)
      : report.tier;
    const fine = (Array.isArray(report.evaluatedVideos) && report.evaluatedVideos.length > 0)
      ? ScoreTierScale.computeDistributionMetrics(report.evaluatedVideos, lang)
      : (report.fineDistribution || ScoreTierScale.computeDistributionMetrics([], lang));
    const sens = SensationalismScale.getProfile(report.clickbaitIndex, report.evaluatedVideos, lang);
    const tierBadgeLabel = (isFr && report.badge?.label) ? report.badge.label : (tier.label || report.badge?.label);
    const scoreClass = tier.scoreClass || (report.globalScore >= 75 ? 'yt-ai-score-high' : report.globalScore >= 50 ? 'yt-ai-score-med' : 'yt-ai-score-low');
    const trajIcon = report.trajectory === 'improving' ? '↗' : report.trajectory === 'declining' ? '↘' : '→';
    const trajClass = report.trajectory === 'improving' ? 'yt-ai-traj-up' : report.trajectory === 'declining' ? 'yt-ai-traj-down' : 'yt-ai-traj-stable';
    const scoreGradient = tier.gradient || ScoreTierScale.buildScoreGradient(report.globalScore, tier.hexColor);
    const availSuffix = report.totalAvailable > report.sampleSize
      ? (isFr ? ` sur ${report.totalAvailable} disponibles` : ` of ${report.totalAvailable} available`)
      : '';

    const fb = report.formatBreakdown || ChannelFormatAnalyzer.computeFormatBreakdown(report.evaluatedVideos || []);
    const formatMixSuffix = ChannelFormatStatsRenderer.formatSampleCountsSuffix(fb, t);
    const formatCompareCardHtml = ChannelFormatStatsRenderer.renderFormatComparisonCard(report, t, lang);

    const html = `
      <div class="yt-ai-channel-audit-wrapper">
        <!-- Hero Header & Graded Score Gauge -->
        <div class="yt-ai-audit-hero-card ${scoreClass}" style="${tier.cssVars || ''}background: linear-gradient(135deg, ${tier.hexColor}1f 0%, var(--yt-ai-bg-card) 75%); border-color: color-mix(in srgb, var(--yt-ai-tier-ink, ${tier.hexColor}) 45%, transparent);">
          <div class="yt-ai-audit-hero-main">
            <div class="yt-ai-gauge-wrapper">
              <div class="yt-ai-gauge-circle ${scoreClass}" style="border-color: var(--yt-ai-tier-ink, ${tier.hexColor}); color: var(--yt-ai-tier-ink, ${tier.hexColor}); background: radial-gradient(circle, ${tier.hexColor}22 0%, var(--yt-ai-bg-secondary) 72%); box-shadow: 0 0 14px ${tier.hexColor}33;">
                <span class="yt-ai-gauge-num">${report.globalScore}</span>
                <span class="yt-ai-gauge-unit">/100</span>
              </div>
            </div>
            <div class="yt-ai-audit-meta">
              <div class="yt-ai-audit-status-badge ${scoreClass}" style="background: color-mix(in srgb, var(--yt-ai-tier, ${tier.hexColor}) 16%, var(--yt-ai-bg)); border: 1px solid color-mix(in srgb, var(--yt-ai-tier-ink, ${tier.hexColor}) 45%, transparent); color: var(--yt-ai-tier-ink, ${tier.hexColor});">
                <span class="yt-ai-badge-icon">${escapeHtml(report.badge?.symbol || '✓')}</span>
                <span>${escapeHtml(tierBadgeLabel)}</span>
              </div>
              <div class="yt-ai-channel-title-row">
                <strong>${escapeHtml(report.channelTitle)}</strong>
                <span class="yt-ai-channel-handle">${escapeHtml(report.channelHandle)}</span>
                ${report.subscribers ? `<span class="yt-ai-sub-pill">${escapeHtml(report.subscribers)}</span>` : ''}
              </div>
              <div class="yt-ai-sample-info-pill">
                <span>${escapeHtml(t.channelSampleBadge || 'Sample:')} <strong>${report.sampleSize} ${escapeHtml(t.channelVideosUnit || 'videos')}${escapeHtml(formatMixSuffix)}${escapeHtml(availSuffix)}</strong> · ${escapeHtml(t.channelRecentHistoricMix || '')}</span>
              </div>
            </div>
          </div>
          <div class="yt-ai-audit-meter yt-ai-audit-meter-spectrum" title="${report.globalScore}/100">
            <div class="yt-ai-audit-meter-fill" style="width:${Math.max(4, Math.min(100, report.globalScore))}%;background:${scoreGradient};box-shadow:0 0 8px ${tier.hexColor}66;"></div>
          </div>
        </div>

        <!-- Dual Analytics Grid: 5%-Step Integrity Histogram & Dedicated Sensationalism Graph -->
        ${this._renderAnalyticsGrid(report, tier, fine, sens, t)}

        <!-- Trajectory & Year-over-Year Evolution -->
        <div class="yt-ai-stat-card yt-ai-trajectory-card">
          <div class="yt-ai-stat-header">
            <span><strong>${escapeHtml(t.channelEvolutionTitle || '📈 Editorial & Quality Evolution')}</strong></span>
            <span class="yt-ai-traj-badge ${trajClass}">[${trajIcon}] ${escapeHtml(report.trajectoryLabel)}</span>
          </div>
          ${report.temporalEvolution ? `<div class="yt-ai-traj-desc yt-ai-markdown">${renderMarkdown(report.temporalEvolution)}</div>` : ''}
        </div>

        <!-- Long-form Videos vs Shorts Comparison Card -->
        ${formatCompareCardHtml}

        <!-- The 3 Pillars: Good / Less good / Bad -->
        <div class="yt-ai-pillars-grid">
          <div class="yt-ai-pillar-col yt-ai-pillar-good">
            <div class="yt-ai-pillar-title">${escapeHtml(t.channelStrengthsTitle || '✓ What It Does Well (Strengths)')}</div>
            <ul class="yt-ai-pillar-list">
              ${(report.strengths.length > 0 ? report.strengths : [t.channelNoStrengths || 'No major strengths reported.']).map(s => `<li>${formatInline(s)}</li>`).join('')}
            </ul>
          </div>
          <div class="yt-ai-pillar-col yt-ai-pillar-warn">
            <div class="yt-ai-pillar-title">${escapeHtml(t.channelWeaknessesTitle || '! Areas for Vigilance (Weaknesses)')}</div>
            <ul class="yt-ai-pillar-list">
              ${(report.weaknesses.length > 0 ? report.weaknesses : [t.channelNoWeaknesses || 'No major weaknesses reported.']).map(w => `<li>${formatInline(w)}</li>`).join('')}
            </ul>
          </div>
          <div class="yt-ai-pillar-col yt-ai-pillar-bad">
            <div class="yt-ai-pillar-title">${escapeHtml(t.channelDrawbacksTitle || '✕ Pitfalls & Red Flags (Drawbacks)')}</div>
            <ul class="yt-ai-pillar-list">
              ${(report.drawbacks.length > 0 ? report.drawbacks : [t.channelNoDrawbacks || 'No major red flags reported.']).map(d => `<li>${formatInline(d)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Sampled Video Breakdown Accordion -->
        <details class="yt-ai-video-sample-accordion">
          <summary class="yt-ai-sample-summary">
            <span>${escapeHtml(t.channelSampleVideosTitle || '🎬 Analyzed Videos Breakdown')} (${report.evaluatedVideos.length})</span>
            <span class="yt-ai-accordion-arrow">▾</span>
          </summary>
          <div class="yt-ai-sample-list">
            ${report.evaluatedVideos.map((v, i) => {
              const vt = ScoreTierScale.getTier(v.score, lang);
              return `
              <div class="yt-ai-sample-item">
                <div class="yt-ai-sample-item-top">
                  <span class="yt-ai-sample-num">#${i + 1}</span>
                  ${ChannelFormatStatsRenderer.renderItemTypeBadge(v, t)}
                  <span class="yt-ai-era-badge yt-ai-era-${v.era}">${escapeHtml(v.eraLabel || v.era)}</span>
                  <a href="${escapeHtml(v.url || `https://youtu.be/${v.id}`)}" target="_blank" class="yt-ai-sample-title">${escapeHtml(v.title)}</a>
                  <span class="yt-ai-sample-score ${vt.scoreClass}" style="${vt.cssVars || ''}color:var(--yt-ai-tier-ink, ${vt.hexColor});border-color:color-mix(in srgb, var(--yt-ai-tier-ink, ${vt.hexColor}) 45%, transparent);">${v.score}/100</span>
                </div>
                ${v.comment ? `<div class="yt-ai-sample-comment">${formatInline(v.comment)}</div>` : ''}
              </div>
            `;
            }).join('')}
          </div>
        </details>

        <!-- Executive Summary -->
        ${report.executiveSummary ? `
          <div class="yt-ai-exec-summary-box">
            <h4>${escapeHtml(t.channelSynthesisTitle || '📋 Executive Synthesis')}</h4>
            <div class="yt-ai-exec-text yt-ai-markdown">${renderMarkdown(report.executiveSummary)}</div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="yt-ai-audit-actions-row">
          <button id="ytAiCopyChannelAuditBtn" class="yt-ai-btn yt-ai-btn-secondary">${escapeHtml(t.copyAuditBtn || '📋 Copy full channel report')}</button>
        </div>
      </div>
    `;

    safeSetInnerHTML(container, html);

    container.querySelector('#ytAiCopyChannelAuditBtn')?.addEventListener('click', () => {
      this.handleCopyReport(report, lang);
    });
  }

  _renderAnalyticsGrid(report, tier, fine, sens, t = {}) {
    const bins = fine.bins || [];
    const maxBinCount = Math.max(1, ...bins.map((b) => b.count || 0));
    const barsHtml = bins.map((b) => {
      const h = b.count > 0 ? Math.max(16, Math.round((b.count / maxBinCount) * 80)) : 3;
      const cls = `${b.count === 0 ? 'is-empty' : ''} ${b.index === tier.stepIndex ? 'is-active-tier' : ''}`.trim();
      const barBg = b.count > 0 ? `linear-gradient(180deg, ${b.hexColor}, ${b.hexColor}99)` : 'var(--yt-ai-border-subtle)';
      const countBadge = b.count > 0 ? `<span class="yt-ai-hist-count">${b.count}</span>` : '';
      return `<div class="yt-ai-hist-col" title="${escapeHtml(b.label)} : ${b.count} (${b.pct}%)">${countBadge}<div class="yt-ai-hist-bar ${cls}" style="background:${barBg};height:${h}%;"></div></div>`;
    }).join('');

    const breakdownHtml = sens.hasVideoBreakdown
      ? `<div class="yt-ai-sensation-breakdown">
          ${sens.buckets.map((b) => `
            <div class="yt-ai-sens-row" title="${escapeHtml(b.label)} (${escapeHtml(b.range)}) : ${b.count} (${b.pct}%)">
              <span class="yt-ai-sens-row-label">${escapeHtml(b.label)} <span class="yt-ai-sens-row-range">${escapeHtml(b.range)}</span></span>
              <div class="yt-ai-sens-row-track"><div class="yt-ai-sens-row-fill" style="width:${b.pct}%;background:linear-gradient(90deg, ${b.hex}bb, ${b.hex});"></div></div>
              <span class="yt-ai-sens-row-val">${b.pct}% <span class="yt-ai-sens-row-cnt">(${b.count})</span></span>
            </div>
          `).join('')}
        </div>`
      : '';

    return `
      <div class="yt-ai-stat-analytics-grid">
        <div class="yt-ai-stat-card yt-ai-dist-card">
          <div class="yt-ai-stat-header">
            <span><strong>${escapeHtml(t.channelIntegrityProportion || 'Editorial Integrity Distribution')}</strong> <span class="yt-ai-stat-sub">(${report.sampleSize} ${escapeHtml(t.channelVideosUnit || 'videos')})</span></span>
            <div class="yt-ai-histogram-metrics">
              <span class="yt-ai-metric-chip">${escapeHtml(t.channelMedianLabel || 'Median:')} ${fine.median}/100</span>
              <span class="yt-ai-metric-chip">${escapeHtml(fine.consistencyLabel || '')}</span>
            </div>
          </div>
          <div class="yt-ai-histogram-box yt-ai-histogram-primary">
            <div class="yt-ai-hist-bars">${barsHtml}</div>
            <div class="yt-ai-hist-axis"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
            <div class="yt-ai-hist-footnote">${escapeHtml(t.channelDistributionLabel || '5% tier distribution')}</div>
          </div>
        </div>

        <div class="yt-ai-stat-card yt-ai-sensation-card" style="${sens.cssVars || ''}border-color:color-mix(in srgb, var(--yt-ai-tier-ink, ${sens.hexColor}) 35%, transparent);">
          <div class="yt-ai-stat-header">
            <span><strong>${escapeHtml(t.channelSensationalismLabel || 'Sensationalism Index')}</strong></span>
            <span class="yt-ai-sensation-badge" style="color:var(--yt-ai-tier-ink, ${sens.hexColor});background:color-mix(in srgb, var(--yt-ai-tier, ${sens.hexColor}) 16%, var(--yt-ai-bg));border-color:color-mix(in srgb, var(--yt-ai-tier-ink, ${sens.hexColor}) 45%, transparent);">${escapeHtml(sens.label)}</span>
          </div>
          <div class="yt-ai-sensation-hero">
            <div class="yt-ai-sensation-donut" style="background:${sens.ringBackground};box-shadow:0 0 12px ${sens.hexColor}2a;">
              <div class="yt-ai-sensation-donut-inner">
                <span class="yt-ai-sensation-val" style="color:var(--yt-ai-tier-ink, ${sens.hexColor});">${sens.index}%</span>
              </div>
            </div>
            <div class="yt-ai-sensation-context">
              <div class="yt-ai-sensation-desc">${escapeHtml(sens.description)}</div>
              <div class="yt-ai-sensation-spectrum-wrap" title="${escapeHtml(t.channelSensationalismLabel || 'Sensationalism Index')}: ${sens.index}%">
                <div class="yt-ai-sensation-spectrum" style="background:${sens.spectrumGradient};">
                  <span class="yt-ai-sensation-marker" style="left:${sens.markerPct}%;border-color:${sens.hexColor};"></span>
                </div>
                <div class="yt-ai-sensation-scale"><span>0% ${escapeHtml(t.channelClickbaitLow || 'Sober')}</span><span>50%</span><span>100% Clickbait</span></div>
              </div>
            </div>
          </div>
          ${breakdownHtml}
        </div>
      </div>
    `;
  }

  handleCopyReport(report, lang = 'en') {
    if (!report) return;
    const t = I18N[lang] || I18N.en;
    const fb = report.formatBreakdown || ChannelFormatAnalyzer.computeFormatBreakdown(report.evaluatedVideos || []);
    const formatLine = fb.hasMixedFormats
      ? `- ${t.channelFormatMixTitle || 'Videos vs Shorts'}: ${fb.videos.count} ${t.channelFormatVideosLabel || 'Videos'} (${fb.videos.avgScore}/100) • ${fb.shorts.count} ${t.channelFormatShortsLabel || 'Shorts'} (${fb.shorts.avgScore}/100)`
      : '';
    const text = [
      `### ${t.channelAuditTitle || '📊 Global Channel Audit'} : ${report.channelTitle} (${report.channelHandle})`,
      `- Score: ${report.globalScore}/100 (${report.badge?.label || ''})`,
      `- ${t.channelSensationalismLabel || 'Sensationalism Index'}: ${report.clickbaitIndex}%`,
      `- ${t.channelIntegrityProportion || 'Distribution'}: ${report.proportions?.reliablePct}% ${t.channelBucketReliable || 'Reliable'}, ${report.proportions?.cautionPct}% ${t.channelBucketModerate || 'Moderate'}, ${report.proportions?.clickbaitPct}% ${t.channelBucketRisk || 'Risk'}`,
      formatLine,
      `- ${t.channelEvolutionTitle || 'Evolution'}: ${report.trajectoryLabel}`,
      report.formatComparison ? `\n#### ${t.channelFormatMixTitle || 'Videos vs Shorts'}:\n${report.formatComparison}` : '',
      `\n#### ${t.channelStrengthsTitle || 'Strengths'}:`,
      ...report.strengths.map(s => `  * ${s}`),
      `\n#### ${t.channelWeaknessesTitle || 'Weaknesses'}:`,
      ...report.weaknesses.map(w => `  * ${w}`),
      `\n#### ${t.channelDrawbacksTitle || 'Drawbacks'}:`,
      ...report.drawbacks.map(d => `  * ${d}`),
      `\n#### ${t.channelSynthesisTitle || 'Synthesis'}:`,
      report.executiveSummary || ''
    ].filter(Boolean).join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('ytAiCopyChannelAuditBtn');
        if (btn) {
          const original = btn.textContent;
          btn.textContent = t.copiedBtn || '✅ Copied!';
          setTimeout(() => { btn.textContent = original; }, 2000);
        }
      });
    }
  }
}

export default ChannelAuditViewController;
