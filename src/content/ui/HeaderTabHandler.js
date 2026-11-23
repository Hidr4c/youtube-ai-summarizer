import { getVideoId, isWebPageMode } from './NavigationObserver.js';
import { ChannelPageParser } from '../../parsers/ChannelPageParser.js';
import { YouTubeDOMContext } from '../services/YouTubeDOMContext.js';
import { syncChannelMaxSelectElement } from '../../config/ExtensionConstants.js';

/**
 * Handles unified header tab clicks: expand, switch pane, and launch analysis on first click when uncached.
 */
export class HeaderTabHandler {
  /**
   * Synchronizes Watch Channel Audit metadata and limit options from YouTube DOM / player data.
   * @param {Object} ctx
   */
  static syncWatchChannelMetadata(ctx) {
    const { state, chatViewController, transcriptController } = ctx;
    const syncChannelTab = (resolvedMeta) => {
      const rawQuery = resolvedMeta?.channelUrl || resolvedMeta?.author || '';
      const query = ChannelPageParser.sanitizeChannelPath(rawQuery) || rawQuery;
      const handleEl = document.getElementById('ytAiWatchChannelHandle');
      if (handleEl && query) handleEl.textContent = query.startsWith('/') ? query.replace(/^\//, '') : query;
      if (query && chatViewController?.channelManager?.getOrFetchChannelDossier) {
        chatViewController.channelManager.getOrFetchChannelDossier(query, 30).then((res) => {
          const total = res?.channel?.totalChannelVideos || (res?.channel?.hasMore === false ? res.channel.recentVideos?.length : null);
          if (total && total > 0) {
            state.currentChannelTotalVideos = total;
            const sel = document.getElementById('ytAiWatchChannelMaxVideos');
            syncChannelMaxSelectElement(sel, sel?.value || state.channelAuditMaxVideos || 30, (state.currentLang || 'en').startsWith('fr'), total);
          }
        }).catch(() => {});
      }
    };

    const meta = YouTubeDOMContext.getVideoMetadata(transcriptController?.cachedVideoMetadata);
    syncChannelTab(meta);
    if (!meta?.channelUrl && transcriptController?.requestPlayerDataFromMainWorld) {
      const vid = getVideoId();
      if (vid) {
        transcriptController.requestPlayerDataFromMainWorld(vid, state.currentLang).then(() => {
          syncChannelTab(YouTubeDOMContext.getVideoMetadata(transcriptController.cachedVideoMetadata));
        }).catch(() => {});
      }
    }
  }

  /**
   * Handles a click on any `.yt-ai-tab-btn` inside the unified header.
   * Expands banner, selects pane, and triggers generation once if no cached result exists yet.
   * @param {HTMLElement} btn
   * @param {Object} ctx
   */
  static handleTabSelection(btn, ctx) {
    const tab = btn?.getAttribute?.('data-tab');
    if (!tab) return;
    const {
      state, bannerView, summaryViewController, auditViewController,
      transcriptController, webPageController,
      triggerSummarize, triggerAudit, triggerChannelAudit
    } = ctx;

    bannerView.setExpanded(true);
    bannerView.switchTab(tab);

    const webMode = isWebPageMode() && Boolean(webPageController);
    if (tab === 'summary') {
      const isBusy = Boolean((webMode ? webPageController.isSummarizing : summaryViewController?.isGenerating) || document.querySelector?.('#ytAiSummaryBody .yt-ai-spinner'));
      const hasResult = webMode ? Boolean((webPageController.summaryMarkdown || '').trim()) : Boolean((summaryViewController?.fullSummaryMarkdown || '').trim());
      if (!isBusy && !hasResult) triggerSummarize?.();
      return;
    }

    if (tab === 'audit') {
      const isBusy = Boolean((webMode ? webPageController.isAuditing : auditViewController?.auditService?.isAuditing) || document.querySelector?.('#ytAiAuditBody .yt-ai-spinner'));
      const hasResult = webMode ? Boolean(webPageController.auditReport) : Boolean(auditViewController?.lastReport);
      if (!isBusy && !hasResult) triggerAudit?.();
      return;
    }

    if (tab === 'transcript') {
      if (webMode) return;
      const vid = getVideoId();
      const cached = transcriptController?.cachedTranscript;
      if (!cached?.segments?.length || cached.videoId !== vid || cached.isChapterOnly) {
        transcriptController?.extractYouTubeTranscript?.(state.currentLang, true);
      }
      return;
    }

    if (tab === 'channelAudit') {
      if (webMode) {
        const isBusy = Boolean(webPageController.isDomainAuditing || document.querySelector?.('#ytAiWatchChannelResultContainer .yt-ai-spinner'));
        if (!isBusy && !(webPageController.domainAuditMarkdown || '').trim()) triggerChannelAudit?.();
        return;
      }
      HeaderTabHandler.syncWatchChannelMetadata(ctx);
      Promise.resolve(auditViewController?.syncChannelAuditUI?.(state)).then(() => {
        const container = document.getElementById?.('ytAiWatchChannelResultContainer');
        const hasPlaceholder = !container || Boolean(container.querySelector?.('.yt-ai-placeholder-text'));
        const isBusy = Boolean(document.getElementById?.('ytAiRunWatchChannelAuditBtn')?.disabled);
        if (hasPlaceholder && !isBusy) triggerChannelAudit?.();
      }).catch(() => {});
    }
  }
}

export default HeaderTabHandler;
