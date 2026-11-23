import { escapeHtml } from './MarkdownRenderer.js';
import { ScoreTierScale } from '../../domain/services/ScoreTierScale.js';

const AXIS_LABELS = {
  fr: { logic: 'Rigueur logique', sources: 'Sources & preuves', transparency: 'Transparence', facts: 'Fiabilité factuelle', radarTitle: 'PROFIL DE FIABILITÉ (4 AXES)', breakdownTitle: 'DÉTAIL PAR CRITÈRE', detailsHint: 'Détails' },
  en: { logic: 'Logical rigor', sources: 'Evidence & sources', transparency: 'Transparency', facts: 'Factual accuracy', radarTitle: 'CREDIBILITY PROFILE (4 AXES)', breakdownTitle: 'CRITERIA BREAKDOWN', detailsHint: 'Details' },
  es: { logic: 'Rigor lógico', sources: 'Fuentes y pruebas', transparency: 'Transparencia', facts: 'Fiabilidad factual', radarTitle: 'PERFIL DE FIABILIDAD', breakdownTitle: 'DESGLOSE POR CRITERIO', detailsHint: 'Detalles' },
  it: { logic: 'Rigore logico', sources: 'Fonti e prove', transparency: 'Trasparenza', facts: 'Affidabilità fattuale', radarTitle: 'PROFILO DI AFFIDABILITÀ', breakdownTitle: 'DETTAGLIO CRITERI', detailsHint: 'Dettagli' },
  de: { logic: 'Logische Strenge', sources: 'Quellen & Belege', transparency: 'Transparenz', facts: 'Faktentreue', radarTitle: 'GLAUBWÜRDIGKEITSPROFIL', breakdownTitle: 'DETAILBEWERTUNG', detailsHint: 'Details' },
  ru: { logic: 'Логика', sources: 'Источники', transparency: 'Прозрачность', facts: 'Факты', radarTitle: 'ПРОФИЛЬ НАДЁЖНОСТИ', breakdownTitle: 'РАЗБИВКА ПО ОСЯМ', detailsHint: 'Детали' },
  ja: { logic: '論理性', sources: '根拠・情報源', transparency: '透明性', facts: '事実正確性', radarTitle: '信頼性プロフィール', breakdownTitle: '評価軸の内訳', detailsHint: '詳細' },
  zh: { logic: '逻辑严谨度', sources: '证据与来源', transparency: '透明度', facts: '事实准确性', radarTitle: '可信度雷达图', breakdownTitle: '分项指标评估', detailsHint: '详情' }
};

const CORE_OPEN_RE = /(?:🎯|🔍|📌|Verdict|Reliability|Fiabilité|Recoupement|Cross-Check|Conseils|Takeaways)/i;

/**
 * Pure parser and graphical dashboard renderer for Video Fact-Check Audits.
 * Generates 4-axis SVG radar plots, metric bars, colored verdict pills,
 * and collapsible deep-dive accordions for effortless at-a-glance reading.
 */
export class AuditVisualDashboard {
  /**
   * Parses [AXES: ...] and [GENRE: ...] metadata from raw audit Markdown.
   * @param {string} rawMarkdown
   * @param {string} [lang='fr']
   * @returns {{ genre: string, axes: Array<Object>|null }}
   */
  static parseVisualMetrics(rawMarkdown = '', lang = 'fr') {
    const raw = String(rawMarkdown || '');
    const code = String(lang || 'en').toLowerCase().slice(0, 2);
    const labels = AXIS_LABELS[code] || AXIS_LABELS.en;

    const genreTagMatch = raw.match(/\[GENRE\s*:\s*([^\]]+)\]/i);
    let genre = genreTagMatch ? genreTagMatch[1].trim() : '';
    if (!genre) {
      const lineMatch = raw.match(/\*\*Genre(?:\s*&\s*Typologie|\s*&\s*Format)?\s*:\*\*\s*([^\n(]+)/i);
      if (lineMatch) genre = lineMatch[1].trim().replace(/[.;]$/, '');
    }
    if (genre.length > 44) genre = genre.slice(0, 41).trimEnd() + '…';

    const axesMatch = raw.match(/\[AXES\s*:\s*([^\]]+)\]/i);
    if (!axesMatch) return { genre, axes: null };

    const block = axesMatch[1];
    const readAxis = (patterns) => {
      const m = block.match(new RegExp(`(?:${patterns})\\s*[:=]\\s*(\\d{1,3})`, 'i'));
      if (!m) return null;
      return Math.max(0, Math.min(100, parseInt(m[1], 10)));
    };

    const logic = readAxis('Logic|Logique|Logik|Lógica|Logica|Логика|論理性?|逻辑');
    const sources = readAxis('Sources|Evidence|Preuves|Quellen|Fuentes|Fonti|Источники|根拠|来源|证据');
    const transparency = readAxis('Transparency|Transparence|Transparenz|Transparencia|Trasparenza|Прозрачность|透明性|透明度');
    const facts = readAxis('Facts|Factual|Faits|Véracité|Fakten|Hechos|Fatti|Факты|事実|事实');

    if (logic === null && sources === null && transparency === null && facts === null) {
      return { genre, axes: null };
    }

    const specs = [
      { key: 'logic', icon: '🧠', label: labels.logic, value: logic ?? 75 },
      { key: 'sources', icon: '🔬', label: labels.sources, value: sources ?? 75 },
      { key: 'transparency', icon: '💼', label: labels.transparency, value: transparency ?? 75 },
      { key: 'facts', icon: '🔍', label: labels.facts, value: facts ?? 75 }
    ].map(item => {
      const tier = ScoreTierScale.getTier(item.value, lang);
      return { ...item, hexColor: tier.hexColor, cssVars: tier.cssVars };
    });

    return { genre, axes: specs };
  }

  /**
   * Renders the 4-axis SVG radar polygon chart.
   * @param {Array<Object>} axes
   * @param {number} overallScore
   * @returns {string}
   */
  static renderRadarSvg(axes, overallScore = 80) {
    if (!Array.isArray(axes) || axes.length < 4) return '';
    const cx = 110;
    const cy = 82;
    const maxR = 46;
    const tier = ScoreTierScale.getTier(overallScore);
    const tierColor = tier.hexColor;

    const dirs = [
      { dx: 0, dy: -1, anchor: 'middle', tx: 0, ty: -10 },
      { dx: 1, dy: 0, anchor: 'start', tx: 8, ty: 4 },
      { dx: 0, dy: 1, anchor: 'middle', tx: 0, ty: 15 },
      { dx: -1, dy: 0, anchor: 'end', tx: -8, ty: 4 }
    ];

    const ringPolys = [0.25, 0.5, 0.75, 1].map(ratio => {
      const pts = dirs.map(d => `${(cx + d.dx * maxR * ratio).toFixed(1)},${(cy + d.dy * maxR * ratio).toFixed(1)}`).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="var(--yt-ai-border)" stroke-width="1" stroke-dasharray="${ratio < 1 ? '2,2' : ''}" />`;
    }).join('');

    const dataPoints = axes.map((a, idx) => {
      const r = maxR * (Math.max(8, Math.min(100, a.value)) / 100);
      return `${(cx + dirs[idx].dx * r).toFixed(1)},${(cy + dirs[idx].dy * r).toFixed(1)}`;
    }).join(' ');

    const dotsAndLabels = axes.map((a, idx) => {
      const d = dirs[idx];
      const r = maxR * (Math.max(8, Math.min(100, a.value)) / 100);
      const px = (cx + d.dx * r).toFixed(1);
      const py = (cy + d.dy * r).toFixed(1);
      const lx = (cx + d.dx * maxR + d.tx).toFixed(1);
      const ly = (cy + d.dy * maxR + d.ty).toFixed(1);
      return `
        <circle cx="${px}" cy="${py}" r="3.5" style="${a.cssVars || ''}" fill="var(--yt-ai-tier-ink, ${a.hexColor})" stroke="var(--yt-ai-bg)" stroke-width="1.2" />
        <text x="${lx}" y="${ly}" text-anchor="${d.anchor}" class="yt-ai-radar-svg-label">${a.icon} ${a.value}%</text>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 220 164" class="yt-ai-audit-radar-svg" style="${tier.cssVars}" aria-hidden="true">
        ${ringPolys}
        <line x1="${cx}" y1="${cy - maxR}" x2="${cx}" y2="${cy + maxR}" stroke="var(--yt-ai-border-subtle)" stroke-width="1" />
        <line x1="${cx - maxR}" y1="${cy}" x2="${cx + maxR}" y2="${cy}" stroke="var(--yt-ai-border-subtle)" stroke-width="1" />
        <polygon points="${dataPoints}" fill="color-mix(in srgb, var(--yt-ai-tier-ink, ${tierColor}) 22%, transparent)" stroke="var(--yt-ai-tier-ink, ${tierColor})" stroke-width="2" stroke-linejoin="round" />
        ${dotsAndLabels}
      </svg>
    `;
  }

  /**
   * Renders the side-by-side 4-axis graphical scorecard (SVG radar + metric progress bars).
   * @param {Object} metrics
   * @param {number} overallScore
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static renderVisualDashboard(metrics, overallScore = 80, lang = 'fr') {
    if (!metrics?.axes || metrics.axes.length === 0) return '';
    const code = String(lang || 'en').toLowerCase().slice(0, 2);
    const ui = AXIS_LABELS[code] || AXIS_LABELS.en;

    const barsHtml = metrics.axes.map(a => `
      <div class="yt-ai-axis-row">
        <div class="yt-ai-axis-header">
          <span class="yt-ai-axis-name">${a.icon} ${escapeHtml(a.label)}</span>
          <span class="yt-ai-axis-val" style="${a.cssVars || ''}">${a.value}/100</span>
        </div>
        <div class="yt-ai-axis-track">
          <div class="yt-ai-axis-fill" style="width:${Math.max(4, a.value)}%;background:linear-gradient(90deg, ${a.hexColor}aa, ${a.hexColor});"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="yt-ai-audit-visual-grid">
        <div class="yt-ai-audit-radar-card">
          <div class="yt-ai-audit-card-kicker">${escapeHtml(ui.radarTitle)}</div>
          ${AuditVisualDashboard.renderRadarSvg(metrics.axes, overallScore)}
        </div>
        <div class="yt-ai-audit-axes-card">
          <div class="yt-ai-audit-card-kicker">${escapeHtml(ui.breakdownTitle)}</div>
          <div class="yt-ai-axis-list">${barsHtml}</div>
        </div>
      </div>
    `;
  }

  /**
   * Highlights concise verdict table cells with color-coded status chips.
   * @param {string} html
   * @returns {string}
   */
  static enhanceStatusBadges(html) {
    if (!html || !html.includes('<td>')) return html;
    return html.replace(/<td>([\s\S]*?)<\/td>/g, (full, inner) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      if (!text || text.length > 36) return full;
      if (/^(?:vérifi[ée]|verified|fiable|valid[ée]|solide|exact|confirmed)$/i.test(text)) {
        return `<td><span class="yt-ai-status-pill yt-ai-pill-pass">✓ ${escapeHtml(text)}</span></td>`;
      }
      if (/^(?:[àa] nuancer|caution|vigilance|partiel|partial|mod[ée]r[ée]|nuanc[ée]|mixed)$/i.test(text)) {
        return `<td><span class="yt-ai-status-pill yt-ai-pill-warn">! ${escapeHtml(text)}</span></td>`;
      }
      if (/^(?:fautif|faux|refuted|trompeur|manipulateur|erreur|false|unverified|non v[ée]rifi[ée])$/i.test(text)) {
        return `<td><span class="yt-ai-status-pill yt-ai-pill-fail">✕ ${escapeHtml(text)}</span></td>`;
      }
      return full;
    });
  }

  /**
   * Formats rendered audit sections so Verdict, Fact-Check Table & Tips stay open
   * while deep analytical breakdowns collapse cleanly into 1-line-preview accordions.
   * @param {string} html
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static formatInteractiveSections(html, lang = 'fr') {
    if (!html) return '';
    const enhanced = AuditVisualDashboard.enhanceStatusBadges(html);
    const sections = enhanced.match(/<section class="yt-ai-md-section">[\s\S]*?<\/section>/g);
    if (!sections || sections.length < 4) return enhanced;

    const code = String(lang || 'en').toLowerCase().slice(0, 2);
    const hintLabel = (AXIS_LABELS[code] || AXIS_LABELS.en).detailsHint;

    return enhanced.replace(/<section class="yt-ai-md-section">(<h[23]>([\s\S]*?)<\/h[23]>)([\s\S]*?)<\/section>/g, (match, headingTag, headingText, bodyHtml) => {
      const plainTitle = headingText.replace(/<[^>]+>/g, '').trim();
      if (CORE_OPEN_RE.test(plainTitle)) {
        return `<section class="yt-ai-md-section yt-ai-audit-core-card">${headingTag}${bodyHtml}</section>`;
      }
      const rawPreview = bodyHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      const preview = rawPreview.length > 96 ? rawPreview.slice(0, 93).trimEnd() + '…' : rawPreview;
      return `
        <details class="yt-ai-md-section yt-ai-audit-accordion">
          <summary class="yt-ai-audit-accordion-summary">
            <div class="yt-ai-audit-accordion-top">
              <span class="yt-ai-audit-accordion-title">${headingText}</span>
              <span class="yt-ai-audit-accordion-toggle">${escapeHtml(hintLabel)} ▾</span>
            </div>
            ${preview ? `<div class="yt-ai-audit-accordion-preview">${escapeHtml(preview)}</div>` : ''}
          </summary>
          <div class="yt-ai-audit-accordion-body">${bodyHtml}</div>
        </details>
      `;
    });
  }
}

export default AuditVisualDashboard;
