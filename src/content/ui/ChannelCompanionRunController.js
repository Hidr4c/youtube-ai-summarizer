import { escapeHtml } from './MarkdownRenderer.js';
import { AuditProgressBar } from './AuditProgressBar.js';
import { ChannelAuditJobTracker } from '../services/ChannelAuditJobTracker.js';
import { parseChannelAuditLimit, resolveEffectiveChannelLimit, syncChannelMaxSelectElement } from '../../config/ExtensionConstants.js';
import { I18N } from '../../locales/index.js';

/**
 * Coordinates Channel Companion audit execution, live SPA navigation recovery,
 * Stop controls, and cached report restoration.
 */
export class ChannelCompanionRunController {
  constructor(card) {
    this.card = card;
    this._serviceUnsub = null;
  }

  get service() {
    return this.card.service;
  }

  get viewController() {
    return this.card.viewController;
  }

  get state() {
    return this.card.state;
  }

  bindSubscription() {
    if (this._serviceUnsub || typeof this.service?.subscribe !== 'function') return;
    this._serviceUnsub = this.service.subscribe((evt) => {
      if (!evt) return;
      const evtKey = ChannelAuditJobTracker.normalizeKey(evt.job?.channelQuery);
      const curKey = ChannelAuditJobTracker.normalizeKey(this.card.currentChannel);
      if (evtKey && curKey && evtKey !== curKey) return;

      const lang = evt.job?.lang || document.getElementById?.('ytAiLangSelect')?.value || document.getElementById?.('ytAiCompLangSelect')?.value || this.state.currentLang || 'fr';
      const isFr = lang.startsWith('fr');
      const progBox = document.getElementById('ytAiChannelProgress');
      const resultBox = document.getElementById('ytAiChannelResultContainer');

      if (evt.type === 'started' || evt.type === 'progress') {
        this.setRunButtonRunning(true, lang);
        this.renderOrUpdateProgress(evt.progress, lang);
      } else if (evt.type === 'completed') {
        this.setRunButtonRunning(false, lang);
        progBox?.classList?.add('yt-ai-hidden');
        if (evt.report?.channelTotalVideos > 0) {
          this.card.knownTotalVideos = evt.report.channelTotalVideos;
          syncChannelMaxSelectElement(document.getElementById('ytAiCompanionMaxVideos'), evt.job?.maxVideos || 30, isFr, evt.report.channelTotalVideos);
        }
        this.renderReport(evt.report, resultBox, lang);
      } else if (evt.type === 'aborted') {
        this.setRunButtonRunning(false, lang);
        progBox?.classList?.add('yt-ai-hidden');
        this.showStatus((I18N[lang] || I18N.en).auditStoppedNote || '⏹ Processing stopped by user.');
      } else if (evt.type === 'error') {
        this.setRunButtonRunning(false, lang);
        progBox?.classList?.add('yt-ai-hidden');
        if (resultBox) {
          const errT = I18N[lang] || I18N.en;
          resultBox.classList.remove('yt-ai-hidden');
          resultBox.innerHTML = `<div class="yt-ai-reasoning offline" style="margin:0;padding:10px 14px;">[!] ${escapeHtml(errT.auditErrorPrefix || I18N.en.auditErrorPrefix)} ${escapeHtml(evt.error?.message || errT.connectionError || I18N.en.connectionError)}</div>`;
        }
      }
    });
  }

  syncActiveJobUI(channelId, lang = 'fr') {
    const job = this.service?.getActiveJob?.(channelId);
    if (!job) return false;
    const cardEl = document.getElementById('yt-ai-channel-companion');
    if (cardEl) {
      cardEl.querySelectorAll('.yt-ai-period-pill').forEach((p) => {
        p.classList?.toggle?.('active', p.dataset?.period === job.period);
      });
      const sel = cardEl.querySelector('#ytAiCompanionMaxVideos');
      if (sel && job.maxVideos) sel.value = String(resolveEffectiveChannelLimit(job.maxVideos, this.card.knownTotalVideos));
    }
    this.setRunButtonRunning(true, lang);
    this.renderOrUpdateProgress(job.progress, lang);
    return true;
  }

  setRunButtonRunning(isRunning, lang = 'fr') {
    const runBtn = document.getElementById('ytAiRunChannelAuditBtn');
    if (!runBtn) return;
    const t = I18N[lang] || I18N.en;
    runBtn.disabled = false;
    if (typeof runBtn.classList?.toggle === 'function') runBtn.classList.toggle('yt-ai-btn-stop', isRunning);
    else if (isRunning) runBtn.classList?.add?.('yt-ai-btn-stop');
    else runBtn.classList?.remove?.('yt-ai-btn-stop');
    runBtn.textContent = isRunning
      ? (t.stopAuditBtn || '⏹ Stop Audit')
      : (t.runChannelAuditBtn || '⚡ Run Channel Audit');
  }

  renderOrUpdateProgress(p = {}, lang = 'fr') {
    const progBox = document.getElementById('ytAiChannelProgress');
    if (!progBox) return;
    const t = I18N[lang] || I18N.en;
    progBox.classList.remove('yt-ai-hidden');
    if (!progBox.querySelector?.('.yt-ai-progress-widget')) {
      progBox.innerHTML = AuditProgressBar.renderWidget({
        percent: p.percent ?? 5,
        title: p.message || t.auditInProgress || 'Audit in progress...',
        detail: p.detail || '',
        showStop: true,
        stopLabel: t.stopShortBtn || 'Stop'
      });
    } else {
      AuditProgressBar.updateWidget(progBox, {
        percent: p.percent,
        title: p.message || t.auditInProgress || 'Audit in progress...',
        detail: p.detail || ''
      });
    }
    AuditProgressBar.bindStopAction(progBox, () => this.stop());
  }

  showStatus(msg) {
    const statusBox = document.getElementById('ytAiCompanionStatusBanner');
    if (!statusBox || !msg) return;
    statusBox.classList.remove('yt-ai-hidden');
    statusBox.textContent = msg;
    setTimeout(() => statusBox.classList?.add('yt-ai-hidden'), 4000);
  }

  stop() {
    this.service?.abortAudit?.('stopped');
    const lang = this.state.currentLang || 'fr';
    this.setRunButtonRunning(false, lang);
    document.getElementById('ytAiChannelProgress')?.classList?.add('yt-ai-hidden');
  }

  async run() {
    if (!this.service || !this.viewController) return;
    this.bindSubscription();
    const hasSub = typeof this.service.subscribe === 'function';
    const lang = document.getElementById?.('ytAiCompLangSelect')?.value || this.state.currentLang || 'fr';
    const t = I18N[lang] || I18N.en;
    const activePill = document.querySelector?.('#yt-ai-channel-companion .yt-ai-period-pill.active');
    const period = activePill?.getAttribute?.('data-period') || this.state.channelAuditPeriod || 'all';
    const domSelect = document.getElementById?.('ytAiCompanionMaxVideos');
    const maxVideos = parseChannelAuditLimit(domSelect?.value ?? this.state.channelAuditMaxVideos ?? 30).key;
    this.state.channelAuditMaxVideos = maxVideos;

    this.setRunButtonRunning(true, lang);
    this.renderOrUpdateProgress({ percent: 5, message: t.auditStarting || 'Preparing audit dossier...', detail: t.channelSampleInfo || 'Weighted temporal sampling' }, lang);

    try {
      const report = await this.service.executeChannelAudit({
        channelQuery: this.card.currentChannel,
        period,
        maxVideos,
        lang,
        state: this.state,
        onProgress: (p) => { if (!hasSub) this.renderOrUpdateProgress(p, lang); }
      });
      if (!hasSub) {
        this.setRunButtonRunning(false, lang);
        document.getElementById('ytAiChannelProgress')?.classList?.add('yt-ai-hidden');
        this.renderReport(report, document.getElementById('ytAiChannelResultContainer'), lang);
      }
    } catch (err) {
      if (!hasSub) {
        this.setRunButtonRunning(false, lang);
        document.getElementById('ytAiChannelProgress')?.classList?.add('yt-ai-hidden');
        if (!ChannelAuditJobTracker.isAbortError(err)) {
          const resultBox = document.getElementById('ytAiChannelResultContainer');
          if (resultBox) {
            const errT = I18N[lang] || I18N.en;
            resultBox.classList.remove('yt-ai-hidden');
            resultBox.innerHTML = `<div class="yt-ai-reasoning offline" style="margin:0;padding:10px 14px;">[!] ${escapeHtml(errT.auditErrorPrefix || I18N.en.auditErrorPrefix)} ${escapeHtml(err.message || errT.connectionError || I18N.en.connectionError)}</div>`;
          }
        }
      }
    }
  }

  renderReport(report, resultBox, lang) {
    if (!resultBox || !report) return;
    resultBox.classList.remove('yt-ai-hidden');
    const renderFn = this.viewController.renderChannelReport || this.viewController.renderReport;
    if (typeof renderFn === 'function') renderFn.call(this.viewController, report, resultBox, lang);
  }

  async restoreCachedReport(channelId) {
    if (!this.service) return;
    try {
      await this.service.ensureHydrated?.();
      if (this.card.currentChannel !== channelId || this.service.isAuditRunning?.(channelId)) return;
      const period = this.state.channelAuditPeriod || 'all';
      const maxVideos = parseChannelAuditLimit(this.state.channelAuditMaxVideos || 30).key;
      const cached = this.service.getCachedReport?.(channelId, period, maxVideos)
        || this.service.getCachedReport?.(channelId)
        || this.service.cache?.getCachedChannelReport?.(channelId, period);
      if (cached) this.renderReport(cached, document.getElementById('ytAiChannelResultContainer'), this.state.currentLang || 'fr');
    } catch (_) {}
  }
}

export default ChannelCompanionRunController;
