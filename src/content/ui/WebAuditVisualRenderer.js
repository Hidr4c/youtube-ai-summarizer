import { escapeHtml, renderMarkdown, safeSetInnerHTML, stripScoreTags } from './MarkdownRenderer.js';
import { AuditVisualDashboard } from './AuditVisualDashboard.js';
import { AuditReport } from '../../domain/models/AuditReport.js';
import { buildTierCssVars } from '../../domain/services/ColorContrastHelper.js';
import { I18N } from '../../locales/index.js';

const FR_WARNING_MAP = [
  [/^Unencrypted HTTP connection \(no HTTPS\)$/i, 'Connexion HTTP non chiffrée (absence de HTTPS)'],
  [/^Punycode \/ IDN domain detected/i, 'Domaine Punycode / IDN détecté (risque d’homographe)'],
  [/^URL contains embedded credentials/i, 'L’URL contient des identifiants intégrés (piège @)'],
  [/^Raw IP address used instead of registered domain name$/i, 'Adresse IP brute utilisée au lieu d’un nom de domaine'],
  [/^Non-standard port \((\d+)\) in public URL$/i, 'Port non standard ($1) dans l’URL'],
  [/^Deep subdomain nesting \((\d+) labels\)$/i, 'Imbrication suspecte de sous-domaines ($1 niveaux)'],
  [/^Lookalike domain "([^"]+)" mimics brand "([^"]+)"$/i, 'Domaine sosie « $1 » imitant la marque « $2 »'],
  [/^Visual typosquatting suspected: "([^"]+)" mimics "([^"]+)"$/i, 'Typosquattage visuel suspecté : « $1 » imite « $2 »'],
  [/^Page claims brand "([^"]+)" but domain is "([^"]+)"$/i, 'La page prétend être « $1 » sur le domaine « $2 »'],
  [/^Page requests payment \/ bank card details/i, 'Formulaire demandant une carte bancaire / IBAN'],
  [/^Page requests crypto wallet seed phrase/i, 'Demande de phrase secrète / clé privée crypto (risque extrême)'],
  [/^Sensitive password\/payment form served over unencrypted HTTP$/i, 'Formulaire sensible (mot de passe/carte) en HTTP non chiffré'],
  [/^Form submits data to external domain "([^"]+)"$/i, 'Le formulaire envoie les données vers le domaine externe « $1 »'],
  [/^Form uses dangerous action scheme/i, 'Action de formulaire dangereuse (javascript:/data:)'],
  [/^Link points to executable\/installer download \(([^)]+)\)$/i, 'Lien vers un téléchargement exécutable/installateur ($1)'],
  [/^Deceptive link: displays "([^"]+)" but links to "([^"]+)"$/i, 'Lien trompeur : affiche « $1 » mais pointe vers « $2 »'],
  [/^Hidden (?:or zero-size |third-party )?iframe detected/i, 'Iframe tiers caché détecté (clickjacking/pistage)'],
  [/^Possible ClickFix \/ clipboard hijacking/i, 'Tentative possible de ClickFix / détournement du presse-papier'],
  [/^Hidden prompt-injection text detected/i, 'Texte caché d’injection de prompt détecté']
];

/**
 * Renders structured visual dashboards (hero gauge, traffic-light security tiles,
 * site transparency summary, and sectioned cards) for Web Page & Site audits.
 */
export class WebAuditVisualRenderer {
  static _tile(icon, title, value, tone = 'ok') {
    return `
      <div class="yt-ai-web-tile yt-ai-web-tone-${tone}">
        <div class="yt-ai-web-tile-head"><span>${icon}</span> <span>${escapeHtml(title)}</span></div>
        <div class="yt-ai-web-tile-val">${escapeHtml(value)}</div>
      </div>
    `;
  }

  static localizeWarning(warning, lang = 'en') {
    const raw = String(warning || '');
    if (lang !== 'fr') return raw;
    for (const [re, tpl] of FR_WARNING_MAP) {
      if (re.test(raw)) return raw.replace(re, tpl);
    }
    return raw;
  }

  static renderHeroCard(score, lang = 'fr', rawMarkdown = '') {
    const report = new AuditReport({ reliabilityScore: score, rawMarkdown, lang });
    const badge = report.getReliabilityBadge(lang);
    const tier = typeof report.getGranularTier === 'function' ? report.getGranularTier(lang) : null;
    const isLow = score < 50;
    const isMed = score >= 50 && score < 75;
    const levelClass = isLow ? 'yt-ai-score-low' : isMed ? 'yt-ai-score-med' : 'yt-ai-score-high';
    const tierPill = tier ? `<span class="yt-ai-tier-pill">${escapeHtml(tier.rangeLabel)} · ${escapeHtml(tier.shortLabel)}</span>` : '';
    const t = I18N[lang] || I18N.en;
    const scoreTitle = t.webReliabilityLabel || 'Reliability Score';
    const desc = tier?.desc || badge.label;

    return `
      <div class="yt-ai-audit-hero-card ${levelClass}" ${tier?.cssVars ? `style="${tier.cssVars}"` : ''}>
        <div class="yt-ai-audit-hero-main">
          <div class="yt-ai-audit-gauge-circle">
            <span class="yt-ai-audit-gauge-val">${score}</span><span class="yt-ai-audit-gauge-max">/100</span>
          </div>
          <div class="yt-ai-audit-hero-meta">
            <div class="yt-ai-audit-status-badge">${escapeHtml(scoreTitle)} · ${escapeHtml(badge.label)} ${tierPill}</div>
            <div class="yt-ai-audit-hero-desc">${escapeHtml(desc)}</div>
          </div>
        </div>
        <div class="yt-ai-audit-meter yt-ai-audit-meter-spectrum">
          <div class="yt-ai-audit-meter-fill" style="width:${Math.max(6, Math.min(100, score))}%;${tier?.gradient ? `background:${tier.gradient};` : tier ? `background:${tier.hexColor};` : ''}"></div>
        </div>
      </div>
    `;
  }

  static renderPageSecurityCard(pageData, lang = 'fr') {
    const t = I18N[lang] || I18N.en;
    const warnings = Array.isArray(pageData?.warnings) ? pageData.warnings : [];
    const isHttps = pageData?.protocol === 'https:';
    const hasFormWarn = warnings.some((w) => /card|password|seed|form/i.test(w));
    const hasCriticalForm = warnings.some((w) => /unencrypted HTTP|external domain|seed|recovery|dangerous action/i.test(w));
    const hasDomWarn = warnings.some((w) => /iframe|clickfix|deceptive|data:text\/html|open-redirect|prompt-injection|executable|meta-refresh/i.test(w));
    const hasBrandWarn = warnings.some((w) => /brand|typosquatting|lookalike|punycode|subdomain|raw ip/i.test(w));

    const tiles = [
      WebAuditVisualRenderer._tile(isHttps ? '🔒' : '🔓', t.webTileConn || 'Connection & URL', isHttps ? `HTTPS · ${pageData?.registrableDomain || pageData?.hostname || ''}` : (t.webValHttp || 'Unencrypted HTTP'), isHttps && !hasBrandWarn ? 'ok' : 'danger'),
      WebAuditVisualRenderer._tile(hasBrandWarn ? '⚠️' : '🏷️', t.webTileBrand || 'Claimed Identity', pageData?.claimedBrand?.split('|')?.[0]?.trim() || pageData?.hostname || '-', hasBrandWarn || (!isHttps && hasFormWarn) ? 'danger' : 'ok'),
      WebAuditVisualRenderer._tile(hasFormWarn ? '💳' : '🛡️', t.webTileForms || 'Forms & Inputs', hasFormWarn ? (t.webValFormsWarn || 'Sensitive inputs found') : (t.webValFormsOk || 'No traps detected'), hasCriticalForm ? 'danger' : (hasFormWarn ? 'warn' : 'ok')),
      WebAuditVisualRenderer._tile(hasDomWarn ? '🚨' : '🧩', t.webTileDom || 'DOM Integrity', hasDomWarn ? (t.webValDomWarn || 'Suspicious signals') : (t.webValDomOk || 'Clean DOM'), hasDomWarn ? 'danger' : 'ok')
    ].join('');

    const alertsHtml = warnings.length > 0
      ? `<ul class="yt-ai-web-alerts">${warnings.map((w) => `<li>⚠️ ${escapeHtml(WebAuditVisualRenderer.localizeWarning(w, lang))}</li>`).join('')}</ul>`
      : '';

    return `<div class="yt-ai-web-grid">${tiles}</div>${alertsHtml}`;
  }

  static renderDomainSignalsCard(dossier, lang = 'fr') {
    const t = I18N[lang] || I18N.en;
    const pagesCount = Array.isArray(dossier?.legalPages) ? dossier.legalPages.length : 0;
    const contacts = Array.isArray(dossier?.contacts) ? dossier.contacts : [];
    const hasSitemap = (dossier?.sitemapUrlCount ?? 0) > 0;
    const hasNavOrChrome = Boolean(dossier?.siteChrome?.header || dossier?.siteChrome?.footer || hasSitemap);

    const legalVal = pagesCount > 0
      ? (t.webPagesFound || '{n} page(s) found').replace('{n}', String(pagesCount))
      : (t.webNoLegalPages || 'None detected');
    const [structVal, structTone] = hasSitemap && pagesCount > 0
      ? [t.webValStructComplete || 'Well structured', 'ok']
      : (pagesCount > 0 || (dossier?.hasRobotsTxt && hasNavOrChrome) || hasSitemap)
        ? [t.webValStructPartial || 'Partial structure', 'warn']
        : [t.webValStructMinimal || 'Minimal / single page', 'warn'];

    const firstContact = contacts[0] ? contacts[0].replace(/^(mailto:|tel:)/i, '').trim() : '';
    const contactVal = firstContact
      ? (contacts.length > 1 ? `${firstContact} (+${contacts.length - 1})` : firstContact)
      : (t.webValNoneFound || 'No visible contact');
    const siteTone = dossier?.origin && !dossier.origin.startsWith('https://') ? 'warn' : 'ok';

    const tiles = [
      WebAuditVisualRenderer._tile('🌐', t.webTileSite || 'Target Website', dossier?.hostname || '-', siteTone),
      WebAuditVisualRenderer._tile('📜', t.webTileLegal || 'Legal & Info Pages', legalVal, pagesCount > 0 ? 'ok' : 'warn'),
      WebAuditVisualRenderer._tile('🧭', t.webTileStructure || 'Site Structure', structVal, structTone),
      WebAuditVisualRenderer._tile('✉️', t.webTileContacts || 'Official Contacts', contactVal, contacts.length > 0 ? 'ok' : 'warn')
    ].join('');

    const structScore = Math.min(100, (hasSitemap ? 50 : 0) + (dossier?.hasRobotsTxt ? 20 : 0) + (hasNavOrChrome ? 30 : 0)) || 10;
    const homeTitleLen = (dossier?.home?.title || '').trim().length;
    const homeExcerptLen = (dossier?.home?.excerpt || '').trim().length;
    const homeScore = Math.min(100, (homeTitleLen > 0 ? 50 : 0) + (homeExcerptLen > 60 ? 50 : homeExcerptLen > 0 ? 25 : 0)) || 10;
    const coverageItems = [
      { label: t.webBarLegal || 'Legal & info pages', pct: Math.min(100, pagesCount * 25), hex: pagesCount > 0 ? '#2ea043' : '#d29922' },
      { label: t.webBarContacts || 'Contact channels', pct: Math.min(100, contacts.length * 50), hex: contacts.length > 0 ? '#2ea043' : '#d29922' },
      { label: t.webBarStructure || 'Navigation & menus', pct: structScore, hex: structScore >= 70 ? '#2ea043' : '#d29922' },
      { label: t.webBarHomeInfo || 'Homepage clarity', pct: homeScore, hex: homeScore >= 75 ? '#2ea043' : '#d29922' }
    ];
    const barsHtml = coverageItems.map((c) => `
      <div class="yt-ai-axis-row">
        <div class="yt-ai-axis-header">
          <span class="yt-ai-axis-name">${escapeHtml(c.label)}</span>
          <span class="yt-ai-axis-val" style="${buildTierCssVars(c.hex).cssVars}">${c.pct}%</span>
        </div>
        <div class="yt-ai-axis-track">
          <div class="yt-ai-axis-fill" style="width:${Math.max(4, c.pct)}%;background:${c.hex};"></div>
        </div>
      </div>
    `).join('');

    return `<div class="yt-ai-web-grid">${tiles}</div><div class="yt-ai-audit-axes-card" style="margin-bottom:12px;"><div class="yt-ai-axis-list">${barsHtml}</div></div>`;
  }

  static renderFinalAudit(targetEl, rawMarkdown, headerHtml, lang = 'fr') {
    if (!targetEl) return null;
    const scoreMatch = /\[SCORE:\s*(\d{1,3})\s*\/\s*100\]/i.exec(rawMarkdown || '');
    const score = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))) : null;
    const heroHtml = score !== null ? WebAuditVisualRenderer.renderHeroCard(score, lang, rawMarkdown) : '';
    let metrics = AuditVisualDashboard.parseVisualMetrics(rawMarkdown || '', lang);
    if (!metrics.axes && score !== null) {
      metrics = AuditVisualDashboard.parseVisualMetrics(`[AXES: Logic=${score}, Sources=${score}, Transparency=${score}, Facts=${score}]`, lang);
    }
    const visualDashboardHtml = metrics.axes ? AuditVisualDashboard.renderVisualDashboard(metrics, score ?? 75, lang) : '';
    const renderedMd = renderMarkdown(stripScoreTags(rawMarkdown || ''), null, { sectionCards: true });
    const bodyHtml = AuditVisualDashboard.enhanceStatusBadges(renderedMd);
    const t = I18N[lang] || I18N.en;
    const emptyNotice = (!heroHtml && !String(bodyHtml || '').replace(/<[^>]+>/g, '').trim())
      ? `<p class="yt-ai-web-empty-warn" style="margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--yt-ai-status-warn, #d29922);color:var(--yt-ai-status-warn, #d29922);">⚠️ ${escapeHtml(t.webEmptyAiResponse || 'The AI model returned no analysis text.')}</p>`
      : '';
    safeSetInnerHTML(targetEl, `${heroHtml}${visualDashboardHtml}${headerHtml || ''}${bodyHtml}${emptyNotice}`);
    return score;
  }
}

export default WebAuditVisualRenderer;
