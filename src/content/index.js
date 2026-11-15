import { BannerView } from './ui/BannerView.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { NavigationObserver, getVideoId, isWatchPage, isChannelPage } from './ui/NavigationObserver.js';
import { SettingsDrawerController } from './ui/SettingsDrawerController.js';
import { SummaryViewController } from './ui/SummaryViewController.js';
import { ChatViewController } from './ui/ChatViewController.js';
import { AuditViewController } from './ui/AuditViewController.js';
import { AuditService } from './services/AuditService.js';
import { ChannelAuditService } from './services/ChannelAuditService.js';
import { ChannelAuditViewController } from './ui/ChannelAuditViewController.js';
import { ChannelCompanionCard } from './ui/ChannelCompanionCard.js';
import { BannerEventHandler } from './ui/BannerEventHandler.js';
import { InPageTranscriptController } from './services/InPageTranscriptController.js';
import { NativeTranscriptPanel } from './services/NativeTranscriptPanel.js';
import { InPageAudioController } from './services/InPageAudioController.js';
import { PromptService } from './services/PromptService.js';
import { createInPageState, loadPreferences } from './services/InPageState.js';

// Application State Container
const state = createInPageState();

// Clean Architecture Service Collaborators
const transcriptController = new InPageTranscriptController();
const audioController = new InPageAudioController();
const promptService = new PromptService();
const bannerView = new BannerView(state);
const settingsDrawer = new SettingsDrawerController(state, { bannerView });

const summaryViewController = new SummaryViewController({ transcriptController, promptService, audioController });
const chatViewController = new ChatViewController({
  transcriptController, promptService, audioController, summaryViewController
});

const auditService = new AuditService({
  transcriptController,
  videoCommentsManager: chatViewController.commentsManager,
  channelManager: chatViewController.channelManager
});

const channelAuditService = new ChannelAuditService({
  channelManager: chatViewController.channelManager
});

const channelAuditViewController = new ChannelAuditViewController({
  channelAuditService,
  bannerView
});

const auditViewController = new AuditViewController({
  auditService,
  chatViewController,
  bannerView,
  channelAuditService,
  channelAuditViewController
});
chatViewController.auditViewController = auditViewController;

const channelCompanionCard = new ChannelCompanionCard({
  channelAuditService,
  channelAuditViewController,
  settingsDrawer,
  audioController,
  transcriptController,
  channelManager: chatViewController.channelManager,
  state
});

const triggerSummarize = () => {
  bannerView.setExpanded(true);
  bannerView.switchTab('summary');
  summaryViewController.startSummarization({
    state, currentLang: state.currentLang, currentProvider: state.currentProvider,
    serverUrls: state.serverUrls, apiKeys: state.apiKeys,
    getActiveModel: () => state.getActiveModel(),
    showStatusBanner: (msg, isErr) => bannerView.showStatusBanner(msg, isErr)
  });
};

const triggerAudit = () => {
  bannerView.setExpanded(true);
  bannerView.switchTab('audit');
  auditViewController.startAudit({
    state, currentLang: state.currentLang,
    getActiveModel: () => state.getActiveModel()
  });
};

const triggerChannelAudit = () => {
  bannerView.setExpanded(true);
  bannerView.switchTab('channelAudit');
  auditViewController.handleTriggerChannelAudit({
    state, currentLang: state.currentLang
  });
};

function bindEvents(banner) {
  BannerEventHandler.bind(banner, {
    state, bannerView, settingsDrawer, summaryViewController,
    chatViewController, auditViewController, audioController,
    transcriptController, triggerSummarize, triggerAudit, triggerChannelAudit
  });
}

function handlePageInjection() {
  if (isWatchPage()) {
    document.getElementById('yt-ai-channel-companion')?.remove();
    bannerView.tryInjectBanner(bindEvents);
  } else if (isChannelPage()) {
    document.getElementById('yt-ai-summarizer-container')?.remove();
    channelCompanionCard.tryInjectCompanion();
  } else {
    document.getElementById('yt-ai-channel-companion')?.remove();
    document.getElementById('yt-ai-summarizer-container')?.remove();
  }
}

function proxyBrowseContinuationToMainWorld(req) {
  return new Promise((resolve) => {
    const requestId = `browse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let settled = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(res);
    };
    const onMsg = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'YT_AI_BROWSE_CONTINUATION_RESULT' && event.data.requestId === requestId) {
        finish({ ok: !!event.data.ok, status: event.data.status || 0, items: event.data.items || [] });
      }
    };
    const timer = setTimeout(() => finish({ ok: false, status: 408, items: [] }), 12000);
    window.addEventListener('message', onMsg);
    window.postMessage({
      type: 'YT_AI_REQ_BROWSE_CONTINUATION',
      requestId,
      apiKey: req.apiKey,
      clientVersion: req.clientVersion,
      continuation: req.continuation,
      visitorData: req.visitorData
    }, '*');
  });
}

function initContentScript() {
  ThemeManager.initThemeSync();
  NavigationObserver.observeFullscreen();

  loadPreferences(state, () => {
    handlePageInjection();
    if (settingsDrawer && typeof settingsDrawer.syncProviderUI === 'function') {
      settingsDrawer.syncProviderUI();
    }

    NavigationObserver.observeNavigation(({ isNewVideo, isChannel }) => {
      if (isNewVideo) {
        audioController.stopAll();
        NativeTranscriptPanel.closeNativeTranscriptPanel();
        transcriptController.resetAllState(state.currentLang);
        summaryViewController.resetSummaryOutput(state.currentLang, triggerSummarize);
        chatViewController.resetChatOutput?.(state.currentLang);
        auditService.abortAudit?.('navigation');
        auditService.clearCache();
        auditViewController.lastReport = null;
        state.cachedAuditReport = null;
        state.currentChannelTotalVideos = null;

        if (!state.autoSummarize) {
          bannerView.setExpanded(false);
        }
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 100);
          setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 300);
        }
      }

      handlePageInjection();

      if (isNewVideo && state.autoSummarize) {
        triggerSummarize();
      }
    });

    chrome.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
      const act = req.type || req.action;
      if (act === 'GET_IN_PAGE_STATUS') {
        sendResponse({ success: true, enabled: state.extensionEnabled, isWatchPage: isWatchPage(), isChannelPage: isChannelPage() });
      } else if (act === 'SET_EXTENSION_ENABLED') {
        state.extensionEnabled = !!req.enabled;
        handlePageInjection();
        sendResponse({ success: true });
      } else if (act === 'TOGGLE_IN_PAGE_BANNER') {
        bannerView.toggleExpand();
        sendResponse({ success: true, isExpanded: bannerView.isExpanded });
      } else if (act === 'TRIGGER_SUMMARIZE') {
        triggerSummarize();
        sendResponse({ success: true });
      } else if (act === 'TRIGGER_AUDIT') {
        triggerAudit();
        sendResponse({ success: true });
      } else if (act === 'TRIGGER_CHANNEL_AUDIT') {
        triggerChannelAudit();
        sendResponse({ success: true });
      } else if (act === 'CLEAR_CACHE') {
        transcriptController.resetAllState(state.currentLang);
        summaryViewController.resetSummaryOutput(state.currentLang, triggerSummarize);
        chatViewController.resetChatOutput?.(state.currentLang);
        chatViewController.commentsManager?.reset?.();
        chatViewController.channelManager?.reset?.();
        auditService.clearCache();
        channelAuditService.clearCache();
        auditViewController.lastReport = null;
        state.cachedAuditReport = null;
        channelCompanionCard.reset?.(state.currentLang);
        bannerView.showStatusBanner('✓ Cache cleared', false);
        sendResponse({ success: true });
      } else if (act === 'PROXY_INNERTUBE_BROWSE') {
        proxyBrowseContinuationToMainWorld(req).then((result) => sendResponse(result));
      } else if (act === 'SET_LANGUAGE') {
        if (req.lang) {
          state.currentLang = req.lang;
          bannerView.applyLanguage(state.currentLang, summaryViewController, chatViewController, auditViewController);
          channelCompanionCard.refreshLanguage?.(state.currentLang);
          audioController.populateVoiceDropdown(state.currentLang);
        }
        sendResponse({ success: true });
      }
      return true;
    });
  });
}

// Bootstrap in page
initContentScript();
