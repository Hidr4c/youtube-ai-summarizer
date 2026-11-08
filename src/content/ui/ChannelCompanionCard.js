import { isChannelPage, getChannelIdentifier } from './NavigationObserver.js';
import { safeSetInnerHTML, escapeHtml } from './MarkdownRenderer.js';
import { ThemeManager } from './ThemeManager.js';
import { AuditProgressBar } from './AuditProgressBar.js';

/**
 * In-Page Companion Card for YouTube Channel Pages (@handle, /channel/, /c/)
 * Injects a statistical channel auditor card with temporal sampling and distribution stats
 */
export class ChannelCompanionCard {
  /**
   * @param {Object} options
   * @param {Object} options.channelAuditService
   * @param {Object} options.channelAuditViewController
   * @param {Object} options.state
   */
  constructor(options = {}) {
    this.service = options.channelAuditService;
    this.viewController = options.channelAuditViewController;
    this.state = options.state || {};
    this.currentChannel = '';
    this.isExpanded = true;
  }

  /**
   * Attempts injection on channel pages
   */
  tryInjectCompanion() {
    if (!this.state.extensionEnabled) {
      document.getElementById('yt-ai-channel-companion')?.remove();
      return;
    }

    if (!isChannelPage()) {
      document.getElementById('yt-ai-channel-companion')?.remove();
      return;
    }

    const channelIdentifier = getChannelIdentifier();
    if (!channelIdentifier) return;

    const existing = document.getElementById('yt-ai-channel-companion');
    if (existing && this.currentChannel === channelIdentifier) return;
    if (existing) existing.remove();

    this.currentChannel = channelIdentifier;

    // Anchor: beneath channel header or tabs
    const targetParent = document.querySelector('ytd-browse[page-subtype="channels"] #content, ytd-browse #content, ytd-tabbed-page-header') ||
      document.querySelector('ytd-browse') ||
      document.getElementById('content');

    if (!targetParent) {
      setTimeout(() => this.tryInjectCompanion(), 400);
      return;
    }

    const card = document.createElement('div');
    card.id = 'yt-ai-channel-companion';
    card.className = 'yt-ai-channel-card';
    ThemeManager.syncThemeWithYouTube(card);

    const lang = this.state.currentLang || 'fr';
    const isFr = lang.startsWith('fr');

    const html = `
      <div class="yt-ai-card-inner">
        <div class="yt-ai-card-header">
          <div class="yt-ai-card-brand">
            <span class="yt-ai-brand-badge">IA</span>
            <span class="yt-ai-card-title">${isFr ? 'Audit Global & Rigueur de la Chaîne' : 'Global Channel Audit & Rigor'}</span>
            <span class="yt-ai-card-handle">${escapeHtml(channelIdentifier)}</span>
          </div>
          <div class="yt-ai-card-controls">
            <button id="ytAiCompanionToggleBtn" class="yt-ai-btn-icon" title="Réduire/Agrandir">▾</button>
          </div>
        </div>

        <div id="ytAiCompanionBody" class="yt-ai-card-body">
          <div class="yt-ai-onboarding-box">
            <p class="yt-ai-onboarding-desc">
              ${isFr
                ? 'Évaluez l’intégrité éditoriale, la transparence commerciale (partenariats, liens affiliés) et l’évolution d’année en année grâce à un échantillonnage statistique groupé.'
                : 'Evaluate editorial integrity, commercial transparency (sponsorships, affiliate links), and Year-over-Year evolution using stratified statistical sampling.'}
            </p>
            <div class="yt-ai-period-selector" style="display: flex; gap: 6px; margin: 8px 0 10px 0; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 11px; color: var(--yt-ai-text-secondary);">${isFr ? 'Période analysée :' : 'Period:'}</span>
              <button class="yt-ai-period-pill yt-ai-format-pill active" data-period="all">🌐 ${isFr ? 'Tout' : 'All'}</button>
              <button class="yt-ai-period-pill yt-ai-format-pill" data-period="month">⚡ ${isFr ? 'Dernier mois' : 'Last month'}</button>
              <button class="yt-ai-period-pill yt-ai-format-pill" data-period="year">📅 ${isFr ? 'Année en cours' : 'Current year'}</button>
              <button class="yt-ai-period-pill yt-ai-format-pill" data-period="6months">🎯 ${isFr ? '6 derniers mois' : '6 months'}</button>
            </div>
            <div class="yt-ai-cta-row">
              <button id="ytAiRunChannelAuditBtn" class="yt-ai-btn yt-ai-btn-primary">
                ⚡ ${isFr ? 'Lancer l’Audit Global de la Chaîne' : 'Run Global Channel Audit'}
              </button>
            </div>
            <div id="ytAiChannelProgress" class="yt-ai-progress-box yt-ai-hidden">
              <div class="yt-ai-spinner"></div>
              <span id="ytAiChannelProgressText" class="yt-ai-progress-msg">Initialisation de l’audit...</span>
            </div>
          </div>

          <div id="ytAiChannelResultContainer" class="yt-ai-result-box yt-ai-hidden"></div>
        </div>
      </div>
    `;

    safeSetInnerHTML(card, html);
    targetParent.insertBefore(card, targetParent.firstChild);

    this._bindEvents(card, channelIdentifier);

    // If report is already cached in memory, display immediately
    const cached = this.service?.getCachedReport(channelIdentifier);
    if (cached) {
      this._displayReport(cached);
    }
  }

  _bindEvents(card, channelIdentifier) {
    const runBtn = card.querySelector('#ytAiRunChannelAuditBtn');
    const toggleBtn = card.querySelector('#ytAiCompanionToggleBtn');
    const body = card.querySelector('#ytAiCompanionBody');
    let selectedPeriod = 'all';

    card.querySelectorAll('.yt-ai-period-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        card.querySelectorAll('.yt-ai-period-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedPeriod = pill.getAttribute('data-period') || 'all';
      });
    });

    toggleBtn?.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      body?.classList.toggle('yt-ai-hidden', !this.isExpanded);
      toggleBtn.textContent = this.isExpanded ? '▾' : '▲';
    });

    runBtn?.addEventListener('click', () => {
      this.triggerAudit(channelIdentifier, selectedPeriod);
    });
  }

  /**
   * Triggers the channel audit
   * @param {string} channelIdentifier
   * @param {string} [period='all']
   */
  async triggerAudit(channelIdentifier, period = 'all') {
    const card = document.getElementById('yt-ai-channel-companion');
    if (!card) return;

    const runBtn = card.querySelector('#ytAiRunChannelAuditBtn');
    const progressBox = card.querySelector('#ytAiChannelProgress');
    const resultContainer = card.querySelector('#ytAiChannelResultContainer');

    if (runBtn) runBtn.disabled = true;
    if (progressBox) {
      progressBox.classList.remove('yt-ai-hidden');
      progressBox.innerHTML = AuditProgressBar.renderWidget({
        percent: 10,
        title: 'Collecte des vidéos et descriptions complètes...',
        detail: `Chaîne : ${channelIdentifier} (0 coupure)`
      });
    }

    try {
      const report = await this.service.executeChannelAudit({
        channelQuery: channelIdentifier,
        period,
        lang: this.state.currentLang || 'fr',
        state: this.state,
        onProgress: (status) => {
          if (progressBox) {
            AuditProgressBar.updateWidget(progressBox, {
              percent: status.percent,
              title: status.message || status.title,
              detail: status.detail || ''
            });
          }
        }
      });

      this._displayReport(report);
    } catch (err) {
      if (progressBox) {
        progressBox.innerHTML = `<p style="color: #ff7b72; font-size: 12px; margin: 8px 0;">[!] Erreur : ${escapeHtml(err.message || String(err))}</p>`;
      }
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  }

  _displayReport(report) {
    const card = document.getElementById('yt-ai-channel-companion');
    if (!card) return;

    const onboardingBox = card.querySelector('.yt-ai-onboarding-box');
    const resultContainer = card.querySelector('#ytAiChannelResultContainer');

    if (onboardingBox) onboardingBox.classList.add('yt-ai-hidden');
    if (resultContainer) {
      resultContainer.classList.remove('yt-ai-hidden');
      this.viewController.renderReport(report, resultContainer, this.state.currentLang || 'fr');
    }
  }
}

export default ChannelCompanionCard;
