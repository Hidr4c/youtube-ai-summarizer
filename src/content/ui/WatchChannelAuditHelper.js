import { escapeHtml } from './MarkdownRenderer.js';
import { YouTubeDOMContext } from '../services/YouTubeDOMContext.js';
import { ChannelAuditJobTracker } from '../services/ChannelAuditJobTracker.js';
import { AuditProgressBar } from './AuditProgressBar.js';
import { parseChannelAuditLimit, syncChannelMaxSelectElement } from '../../config/ExtensionConstants.js';
import { I18N } from '../../locales/index.js';

/**
 * Coordinates Watch-page Channel Audit execution, Stop controls, and live SPA job sync.
 */
export class WatchChannelAuditHelper {
  static getCurrentQuery() {
    try {
      const meta = YouTubeDOMContext.getVideoMetadata();
      return meta?.channelUrl || meta?.author || '';
    } catch {
      return '';
    }
  }

  static setButtonRunning(isRunning, lang = 'fr') {
    const btn = document.getElementById('ytAiRunWatchChannelAuditBtn') || document.getElementById('ytAiAuditChannelBtn');
    if (!btn) return;
    const t = I18N[lang] || I18N.en;
    btn.disabled = false;
    if (typeof btn.classList?.toggle === 'function') btn.classList.toggle('yt-ai-btn-stop', isRunning);
    else if (isRunning) btn.classList?.add?.('yt-ai-btn-stop');
    else btn.classList?.remove?.('yt-ai-btn-stop');
    if (btn.id === 'ytAiRunWatchChannelAuditBtn') {
      btn.textContent = isRunning
        ? (t.stopAuditBtn || '⏹ Stop Audit')
        : (t.runChannelAuditBtn || '⚡ Run Channel Audit');
    }
  }

  static renderProgress(progBox, status = {}, lang = 'fr', onStop = null) {
    if (!progBox) return;
    const t = I18N[lang] || I18N.en;
    const isFr = lang.startsWith('fr');
    progBox.classList?.remove('yt-ai-hidden');
    if (!progBox.querySelector?.('.yt-ai-progress-widget')) {
      progBox.innerHTML = AuditProgressBar.renderWidget({
        percent: status.percent ?? 10,
        title: status.message || status.title || (isFr ? 'Collecte des vidéos et descriptions...' : 'Fetching videos and descriptions...'),
        detail: status.detail || '',
        showStop: true,
        stopLabel: t.stopShortBtn || 'Stop'
      });
    } else {
      AuditProgressBar.updateWidget(progBox, {
        percent: status.percent,
        title: status.message || status.title,
        detail: status.detail || ''
      });
    }
    if (typeof onStop === 'function') {
      AuditProgressBar.bindStopAction(progBox, onStop);
    }
  }

  static bindSubscription(controller) {
    const service = controller.channelAuditService;
    if (controller._watchChannelUnsub || typeof service?.subscribe !== 'function') return;
    controller._watchChannelUnsub = service.subscribe((evt) => {
      if (!evt) return;
      const curQuery = WatchChannelAuditHelper.getCurrentQuery();
      const curKey = ChannelAuditJobTracker.normalizeKey(curQuery);
      const evtKey = ChannelAuditJobTracker.normalizeKey(evt.job?.channelQuery);
      if (curKey && evtKey && curKey !== evtKey) return;

      const lang = evt.job?.lang || document.getElementById?.('ytAiLangSelect')?.value || 'fr';
      const isFr = lang.startsWith('fr');
      const progBox = document.getElementById('ytAiWatchChannelProgress') || document.getElementById('ytAiChannelAuditProgressContainer');
      const container = document.getElementById('ytAiWatchChannelResultContainer') || document.getElementById('ytAiChannelAuditBody') || document.getElementById('ytAiChannelAuditContainer');
      const onStop = () => controller.stopChannelAudit(lang);

      if (evt.type === 'started' || evt.type === 'progress') {
        WatchChannelAuditHelper.setButtonRunning(true, lang);
        WatchChannelAuditHelper.renderProgress(progBox, evt.progress, lang, onStop);
      } else if (evt.type === 'completed') {
        WatchChannelAuditHelper.setButtonRunning(false, lang);
        progBox?.classList?.add('yt-ai-hidden');
        if (progBox) progBox.innerHTML = '';
        if (evt.report?.channelTotalVideos > 0) {
          syncChannelMaxSelectElement(document.getElementById('ytAiWatchChannelMaxVideos'), evt.job?.maxVideos || 30, isFr, evt.report.channelTotalVideos);
        }
        if (container && evt.report) controller.channelAuditViewController?.renderReport(evt.report, container, lang);
      } else if (evt.type === 'aborted') {
        WatchChannelAuditHelper.setButtonRunning(false, lang);
        progBox?.classList?.add('yt-ai-hidden');
        if (progBox) progBox.innerHTML = '';
        const stoppedText = (I18N[lang] || I18N.en).auditStoppedNote || '⏹ Processing stopped by user.';
        if (container) container.innerHTML = `<p class="yt-ai-stopped-note">${escapeHtml(stoppedText)}</p>`;
      } else if (evt.type === 'error' && container) {
        WatchChannelAuditHelper.setButtonRunning(false, lang);
        progBox?.classList?.add('yt-ai-hidden');
        container.innerHTML = `<p style="color: #ff7b72; font-size: 12px;">[!] Erreur lors de l'audit de chaîne : ${escapeHtml(evt.error?.message || 'Erreur')}</p>`;
      }
    });
  }

  static async syncUI(controller, stateObj = {}) {
    const service = controller.channelAuditService;
    if (!service || !controller.channelAuditViewController) return;
    WatchChannelAuditHelper.bindSubscription(controller);
    const query = WatchChannelAuditHelper.getCurrentQuery();
    if (!query) return;
    const lang = document.getElementById?.('ytAiLangSelect')?.value || stateObj.currentLang || 'fr';
    const progBox = document.getElementById('ytAiWatchChannelProgress') || document.getElementById('ytAiChannelAuditProgressContainer');
    const container = document.getElementById('ytAiWatchChannelResultContainer') || document.getElementById('ytAiChannelAuditBody') || document.getElementById('ytAiChannelAuditContainer');

    const active = service.getActiveJob?.(query);
    if (active) {
      WatchChannelAuditHelper.setButtonRunning(true, lang);
      WatchChannelAuditHelper.renderProgress(progBox, active.progress, lang, () => controller.stopChannelAudit(lang));
      return;
    }

    await service.ensureHydrated?.();
    const period = stateObj.channelAuditPeriod || 'all';
    const maxVideos = parseChannelAuditLimit(stateObj.channelAuditMaxVideos ?? 30).key;
    const cached = service.getCachedReport?.(query, period, maxVideos) || service.getCachedReport?.(query);
    if (cached && container) {
      controller.channelAuditViewController.renderReport(cached, container, lang);
    }
  }

  static async execute(controller, ctx = {}) {
    if (!controller.channelAuditService || !controller.channelAuditViewController) return;
    WatchChannelAuditHelper.bindSubscription(controller);
    const stateObj = ctx.state || ctx;
    const activePeriodPill = document.querySelector?.('#ytAiPaneChannelAudit .yt-ai-period-pill.active')?.getAttribute?.('data-period');
    const period = ctx.period || activePeriodPill || stateObj.channelAuditPeriod || 'all';
    const lang = document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || stateObj.currentLang || 'fr';
    const isFr = lang.startsWith('fr');
    const domLimit = document.getElementById('ytAiWatchChannelMaxVideos')?.value;
    const maxVideos = parseChannelAuditLimit(domLimit ?? ctx.maxVideos ?? stateObj.channelAuditMaxVideos ?? 30).key;
    stateObj.channelAuditMaxVideos = maxVideos;

    const container = document.getElementById('ytAiWatchChannelResultContainer') || document.getElementById('ytAiChannelAuditBody') || document.getElementById('ytAiChannelAuditContainer');
    const progBox = document.getElementById('ytAiWatchChannelProgress') || document.getElementById('ytAiChannelAuditProgressContainer');
    if (!container) return;
    if (document.getElementById('ytAiAuditVideoView')) controller.switchAuditSubtab('channel');

    const meta = YouTubeDOMContext.getVideoMetadata();
    const query = meta.channelUrl || meta.author || '';
    if (!query) {
      container.innerHTML = `<p style="color: #ff7b72;">[!] Impossible d'identifier la chaîne du créateur.</p>`;
      return;
    }
    if (controller.channelAuditService.isAuditRunning?.(query)) {
      controller.stopChannelAudit(lang);
      return;
    }

    const handleEl = document.getElementById('ytAiWatchChannelHandle');
    if (handleEl) handleEl.textContent = query.startsWith('/') ? query.replace(/^\//, '') : query;

    const hasSub = typeof controller.channelAuditService.subscribe === 'function';
    WatchChannelAuditHelper.setButtonRunning(true, lang);
    WatchChannelAuditHelper.renderProgress(progBox, {
      percent: 10,
      message: isFr ? 'Collecte des vidéos et descriptions...' : 'Fetching videos and descriptions...',
      detail: `${meta.author || ''} (0 coupure)`
    }, lang, () => controller.stopChannelAudit(lang));
    container.classList.remove('yt-ai-hidden');
    container.innerHTML = `<p style="color: var(--yt-ai-text-muted); font-style: italic;">${isFr ? 'Examen de la chaîne en cours...' : 'Running channel audit...'}</p>`;

    try {
      const report = await controller.channelAuditService.executeChannelAudit({
        channelQuery: query,
        period,
        maxVideos,
        lang,
        state: stateObj,
        onProgress: (status) => {
          if (!hasSub) WatchChannelAuditHelper.renderProgress(progBox, status, lang, () => controller.stopChannelAudit(lang));
        }
      });
      if (!hasSub) {
        if (report?.channelTotalVideos > 0) {
          stateObj.currentChannelTotalVideos = report.channelTotalVideos;
          syncChannelMaxSelectElement(document.getElementById('ytAiWatchChannelMaxVideos'), maxVideos, isFr, report.channelTotalVideos);
        }
        if (progBox) { progBox.classList.add('yt-ai-hidden'); progBox.innerHTML = ''; }
        controller.channelAuditViewController.renderReport(report, container, lang);
      }
    } catch (err) {
      if (!hasSub) {
        if (progBox) { progBox.classList.add('yt-ai-hidden'); progBox.innerHTML = ''; }
        if (ChannelAuditJobTracker.isAbortError(err)) {
          const stoppedText = (I18N[lang] || I18N.en).auditStoppedNote || '⏹ Processing stopped by user.';
          container.innerHTML = `<p class="yt-ai-stopped-note">${escapeHtml(stoppedText)}</p>`;
        } else {
          container.innerHTML = `<p style="color: #ff7b72; font-size: 12px;">[!] Erreur lors de l'audit de chaîne : ${escapeHtml(err.message || String(err))}</p>`;
        }
      }
    } finally {
      if (!hasSub) WatchChannelAuditHelper.setButtonRunning(false, lang);
    }
  }

  /**
   * Synchronizes Watch-page Channel Audit pane UI strings when switching language.
   * Preserves active running jobs and existing AI-generated report insights.
   */
  static applyLanguage(controller = null, lang = 'en', state = null) {
    const t = I18N[lang] || I18N.en;
    const isFr = (lang || 'en').startsWith('fr');

    const titleEl = document.getElementById('ytAiWatchChannelTitle');
    if (titleEl) titleEl.textContent = t.channelAuditTitle || '📊 Global Channel Audit';

    const query = WatchChannelAuditHelper.getCurrentQuery();
    const isRunning = !!(query && controller?.channelAuditService?.isAuditRunning?.(query));
    WatchChannelAuditHelper.setButtonRunning(isRunning, lang);

    const periodLabel = document.querySelector?.('#ytAiPaneChannelAudit .yt-ai-period-label');
    if (periodLabel) periodLabel.textContent = t.periodFilterLabel || 'Analyzed period:';

    const periodMap = {
      all: `🌐 ${t.periodAll || 'All history'}`,
      year: `📅 ${t.periodYear || 'Current year'}`,
      '6months': `🎯 ${t.period6Months || 'Last 6 months'}`,
      month: `⚡ ${t.periodMonth || 'Last month'}`
    };
    document.querySelectorAll?.('#ytAiPaneChannelAudit .yt-ai-period-pill').forEach((pill) => {
      const key = pill.getAttribute?.('data-period');
      if (key && periodMap[key]) pill.textContent = periodMap[key];
    });

    const maxLabel = document.querySelector?.('#ytAiPaneChannelAudit .yt-ai-max-label');
    if (maxLabel) maxLabel.textContent = t.maxVideosLabel || 'Max Limit:';

    const watchSel = document.getElementById('ytAiWatchChannelMaxVideos');
    if (watchSel) {
      syncChannelMaxSelectElement(watchSel, watchSel.value || state?.channelAuditMaxVideos || 30, isFr, state?.currentChannelTotalVideos || null);
    }

    const progStop = document.querySelector?.('#ytAiWatchChannelProgress .yt-ai-progress-stop');
    if (progStop) progStop.textContent = t.stopShortBtn || 'Stop';

    const resultBox = document.getElementById('ytAiWatchChannelResultContainer');
    if (resultBox && !isRunning) {
      const stopped = resultBox.querySelector?.('.yt-ai-stopped-note');
      const placeholder = resultBox.querySelector?.('.yt-ai-placeholder-text');
      const hasRenderedReport = !!resultBox.querySelector?.('.yt-ai-channel-metrics, .yt-ai-audit-hero-card, .yt-ai-channel-audit-card');
      if (stopped) {
        stopped.textContent = t.auditStoppedNote || '⏹ Processing stopped by user.';
      } else if (placeholder) {
        placeholder.textContent = t.channelAuditPlaceholder || '';
      } else if (hasRenderedReport && controller?.channelAuditViewController?.lastReport) {
        controller.channelAuditViewController.renderReport(controller.channelAuditViewController.lastReport, resultBox, lang);
      }
    }
  }

  /**
   * Synchronizes the Watch Video Audit pane controls and delegates to Channel Audit pane sync.
   */
  static applyAuditViewLanguage(controller, lang = 'en', state = null) {
    const t = I18N[lang] || I18N.en;
    const el = (id) => document.getElementById(id);
    if (el('ytAiAuditHeaderTitle')) el('ytAiAuditHeaderTitle').textContent = t.auditTitle || '🛡️ Critical Logic & Fact-Checking Audit';
    if (el('ytAiAuditChannelBtn')) el('ytAiAuditChannelBtn').textContent = t.auditChannelBtn || '🔍 Audit Channel';
    if (el('ytAiRunAuditBtn')) {
      el('ytAiRunAuditBtn').textContent = controller?.auditService?.isAuditing
        ? (t.stopListenBtn || '⏹️ Stop')
        : (controller?.lastReport ? (t.relaunchAuditBtn || '⚡ Re-run Audit') : (t.runAuditBtn || '⚡ Run Audit'));
    }
    if (el('ytAiCopyAuditBtn')) el('ytAiCopyAuditBtn').textContent = t.copyBtn || '📋 Copy';
    const progStop = el('ytAiAuditProgressContainer')?.querySelector?.('.yt-ai-progress-stop');
    if (progStop) progStop.textContent = t.stopShortBtn || 'Stop';
    const auditBody = el('ytAiAuditBody');
    if (auditBody && !controller?.lastReport && !controller?.auditService?.isAuditing) {
      const stopped = auditBody.querySelector('.yt-ai-stopped-note');
      const placeholder = auditBody.querySelector('.yt-ai-placeholder-text');
      if (stopped) stopped.textContent = t.auditStoppedNote || '⏹ Processing stopped by user.';
      else if (placeholder) placeholder.textContent = t.auditPlaceholder || '';
    }
    WatchChannelAuditHelper.applyLanguage(controller, lang, state);
  }
}

export default WatchChannelAuditHelper;
