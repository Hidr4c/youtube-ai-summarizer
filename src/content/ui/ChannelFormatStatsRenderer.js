import { escapeHtml, renderMarkdown } from './MarkdownRenderer.js';
import { ChannelFormatAnalyzer } from '../../domain/services/ChannelFormatAnalyzer.js';
import { ScoreTierScale } from '../../domain/services/ScoreTierScale.js';
import { SensationalismScale } from '../../domain/services/SensationalismScale.js';

/**
 * UI helper rendering Long-form Videos vs Shorts identification badges,
 * format share stacked bar graph, and comparative quality gauges.
 */
export class ChannelFormatStatsRenderer {
  /**
   * Builds inline format breakdown suffix for the sample badge header.
   * @param {Object} breakdown
   * @param {Object} [t]
   * @returns {string}
   */
  static formatSampleCountsSuffix(breakdown = {}, t = {}) {
    const vCount = breakdown?.videos?.count || 0;
    const sCount = breakdown?.shorts?.count || 0;
    if (vCount === 0 && sCount === 0) return '';
    const vLabel = t.channelFormatVideosLabel || 'Videos';
    const sLabel = t.channelFormatShortsLabel || 'Shorts';
    if (sCount > 0 && vCount > 0) return ` (${vCount} ${vLabel} • ${sCount} ${sLabel})`;
    if (sCount > 0) return ` (${sCount} ${sLabel})`;
    return '';
  }

  /**
   * Renders crisp format badge ([Video] vs [Short]) for each evaluated item row.
   * @param {Object} item
   * @param {Object} [t]
   * @returns {string}
   */
  static renderItemTypeBadge(item = {}, t = {}) {
    const isShort = ChannelFormatAnalyzer.isShortItem(item);
    const label = isShort
      ? `⚡ ${t.channelShortsBadge || 'Short'}`
      : `🎬 ${t.channelVideosLongBadge || 'Video'}`;
    const cls = isShort ? 'yt-ai-format-badge-short' : 'yt-ai-format-badge-video';
    return `<span class="yt-ai-format-badge ${cls}">${escapeHtml(label)}</span>`;
  }

  /**
   * Renders stacked 100% horizontal bar chart showing exact Video vs Short proportion.
   * @param {Object} fb
   * @param {Object} t
   * @param {boolean} isFr
   * @returns {string}
   */
  static renderProportionBar(fb = {}, t = {}, isFr = true) {
    const v = fb.videos || { count: 0, sharePct: 0 };
    const s = fb.shorts || { count: 0, sharePct: 0 };
    if (v.count === 0 && s.count === 0) return '';

    const vLabel = t.channelFormatVideosLabel || (isFr ? 'Vidéos longues' : 'Long-form Videos');
    const sLabel = t.channelFormatShortsLabel || 'Shorts';
    const vPct = typeof v.sharePct === 'number' ? v.sharePct : Math.round((v.count / Math.max(1, v.count + s.count)) * 100);
    const sPct = typeof s.sharePct === 'number' ? s.sharePct : Math.max(0, 100 - vPct);

    return `
      <div class="yt-ai-format-share-box">
        <div class="yt-ai-format-share-legend">
          <span class="yt-ai-share-leg-item"><span class="yt-ai-share-dot yt-ai-share-dot-video"></span>🎬 ${escapeHtml(vLabel)} : <strong>${vPct}%</strong> (${v.count})</span>
          <span class="yt-ai-share-leg-item"><span class="yt-ai-share-dot yt-ai-share-dot-short"></span>⚡ ${escapeHtml(sLabel)} : <strong>${sPct}%</strong> (${s.count})</span>
        </div>
        <div class="yt-ai-format-share-track" role="img" aria-label="${escapeHtml(`${vLabel} ${vPct}% / ${sLabel} ${sPct}%`)}">
          ${vPct > 0 ? `<div class="yt-ai-format-share-seg yt-ai-format-share-seg-video" style="width:${vPct}%;">${vPct >= 14 ? `${vPct}%` : ''}</div>` : ''}
          ${sPct > 0 ? `<div class="yt-ai-format-share-seg yt-ai-format-share-seg-short" style="width:${sPct}%;">${sPct >= 14 ? `${sPct}%` : ''}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Renders visual comparison card (proportion chart + quality gauges + LLM analysis).
   * @param {Object} report
   * @param {Object} [t]
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static renderFormatComparisonCard(report = {}, t = {}, lang = 'fr') {
    const fb = report.formatBreakdown || ChannelFormatAnalyzer.computeFormatBreakdown(report.evaluatedVideos || []);
    const hasItems = ((fb?.videos?.count || 0) + (fb?.shorts?.count || 0)) > 0;
    const hasComparisonText = Boolean(report.formatComparison && report.formatComparison.trim().length > 0);
    if (!hasItems && !hasComparisonText) return '';

    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const title = t.channelFormatMixTitle || (isFr ? '⚡ Comparatif Vidéos longues vs Shorts' : '⚡ Long-form Videos vs Shorts Comparison');
    const scoreLabel = t.channelFormatAvgScore || (isFr ? 'Qualité moy.' : 'Avg quality');
    const cbLabel = t.channelFormatAvgClickbait || (isFr ? 'Sensationnalisme' : 'Sensationalism');
    const gapText = fb.hasMixedFormats
      ? (fb.scoreGap === 0
        ? (isFr ? 'Qualité identique' : 'Equal quality')
        : (isFr
          ? `Écart qualité : ${fb.scoreGap > 0 ? `+${fb.scoreGap}` : fb.scoreGap} pts`
          : `Quality gap: ${fb.scoreGap > 0 ? `+${fb.scoreGap}` : fb.scoreGap} pts`))
      : '';

    const renderCol = (label, icon, stats, emptyText) => {
      if (!stats || stats.count === 0) {
        return `<div class="yt-ai-format-col is-empty"><div class="yt-ai-format-col-head">${icon} ${escapeHtml(label)}</div><div class="yt-ai-format-empty">${escapeHtml(emptyText)}</div></div>`;
      }
      const st = ScoreTierScale.getTier(stats.avgScore, lang);
      const sens = SensationalismScale.getProfile(stats.avgClickbait, [], lang);
      const relPct = stats.reliablePct ?? 0;
      const cauPct = stats.cautionPct ?? 0;
      const riskPct = stats.riskPct ?? Math.max(0, 100 - relPct - cauPct);

      return `
        <div class="yt-ai-format-col">
          <div class="yt-ai-format-col-head"><span>${icon} ${escapeHtml(label)}</span><span class="yt-ai-format-count">${stats.count} (${stats.sharePct ?? 0}%)</span></div>
          <div class="yt-ai-format-bar-row">
            <div class="yt-ai-format-bar-label"><span>${escapeHtml(scoreLabel)}</span><strong style="${st.cssVars || ''}color:var(--yt-ai-tier-ink, ${st.hexColor});">${stats.avgScore}/100</strong></div>
            <div class="yt-ai-format-bar-track"><div class="yt-ai-format-bar-fill" style="width:${Math.max(4, stats.avgScore)}%;background:${st.hexColor};"></div></div>
          </div>
          <div class="yt-ai-format-bar-row">
            <div class="yt-ai-format-bar-label"><span>${escapeHtml(cbLabel)}</span><strong style="${sens.cssVars || ''}color:var(--yt-ai-tier-ink, ${sens.hexColor});">${stats.avgClickbait}%</strong></div>
            <div class="yt-ai-format-bar-track"><div class="yt-ai-format-bar-fill" style="width:${Math.max(3, stats.avgClickbait)}%;background:${sens.hexColor};"></div></div>
          </div>
          <div class="yt-ai-format-tier-strip" title="${escapeHtml(`${relPct}% / ${cauPct}% / ${riskPct}%`)}">
            ${relPct > 0 ? `<span class="yt-ai-tier-seg-good" style="width:${relPct}%;"></span>` : ''}
            ${cauPct > 0 ? `<span class="yt-ai-tier-seg-warn" style="width:${cauPct}%;"></span>` : ''}
            ${riskPct > 0 ? `<span class="yt-ai-tier-seg-bad" style="width:${riskPct}%;"></span>` : ''}
          </div>
          <div class="yt-ai-format-tier-legend">
            <span>✓ ${relPct}%</span><span>! ${cauPct}%</span><span>✕ ${riskPct}%</span>
          </div>
        </div>
      `;
    };

    return `
      <div class="yt-ai-stat-card yt-ai-format-compare-card">
        <div class="yt-ai-stat-header">
          <span><strong>${escapeHtml(title)}</strong></span>
          ${gapText ? `<span class="yt-ai-metric-chip">${escapeHtml(gapText)}</span>` : ''}
        </div>
        ${this.renderProportionBar(fb, t, isFr)}
        <div class="yt-ai-format-compare-grid">
          ${renderCol(t.channelFormatVideosLabel || (isFr ? 'Vidéos longues' : 'Long-form Videos'), '🎬', fb.videos, isFr ? 'Aucune vidéo longue' : 'No long videos')}
          ${renderCol(t.channelFormatShortsLabel || 'Shorts', '⚡', fb.shorts, isFr ? 'Aucun Short' : 'No Shorts')}
        </div>
        ${hasComparisonText ? `<div class="yt-ai-traj-desc yt-ai-markdown" style="margin-top:8px;">${renderMarkdown(report.formatComparison)}</div>` : ''}
      </div>
    `;
  }
}

export default ChannelFormatStatsRenderer;
