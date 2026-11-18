import { getVideoId } from './NavigationObserver.js';
import { SettingsDrawerController } from './SettingsDrawerController.js';
import { SettingsDrawerEventHandler } from './SettingsDrawerEventHandler.js';
import { YouTubeDOMContext } from '../services/YouTubeDOMContext.js';
import { parseChannelAuditLimit, resolveEffectiveChannelLimit, syncChannelMaxSelectElement } from '../../config/ExtensionConstants.js';
import { I18N } from '../../locales/index.js';

/**
 * Event Binder for In-Page Summarizer Banner UI Elements
 */
export class BannerEventHandler {
  /**
   * Binds all UI interactions for the banner
   * @param {HTMLElement} banner
   * @param {Object} ctx
   */
  static bind(banner, ctx) {
    if (!banner || !ctx) return;
    const {
      state, bannerView, settingsDrawer, summaryViewController,
      chatViewController, auditViewController, audioController,
      transcriptController, triggerSummarize, triggerAudit, triggerChannelAudit
    } = ctx;

    // 1. Tab navigation
    banner.querySelectorAll('.yt-ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          bannerView.switchTab(tab);
          if (tab === 'transcript') {
            const currentVideoId = getVideoId();
            if (!transcriptController.cachedTranscript.segments ||
                transcriptController.cachedTranscript.segments.length === 0 ||
                transcriptController.cachedTranscript.videoId !== currentVideoId ||
                transcriptController.cachedTranscript.isChapterOnly) {
              transcriptController.extractYouTubeTranscript(state.currentLang, true);
            }
          } else if (tab === 'channelAudit') {
            const meta = YouTubeDOMContext.getVideoMetadata();
            const query = meta.channelUrl || meta.author || '';
            const handleEl = document.getElementById('ytAiWatchChannelHandle');
            if (handleEl && query) {
              handleEl.textContent = query.startsWith('/') ? query.replace(/^\//, '') : query;
            }
            if (query && chatViewController?.channelManager?.getOrFetchChannelDossier) {
              chatViewController.channelManager.getOrFetchChannelDossier(query, 30).then((res) => {
                const total = res?.channel?.totalChannelVideos || (res?.channel?.hasMore === false ? res.channel.recentVideos?.length : null);
                if (total && total > 0) {
                  state.currentChannelTotalVideos = total;
                  const sel = document.getElementById('ytAiWatchChannelMaxVideos');
                  const activeVal = sel?.value || state.channelAuditMaxVideos || 30;
                  syncChannelMaxSelectElement(sel, activeVal, (state.currentLang || 'fr').startsWith('fr'), total);
                }
              }).catch(() => {});
            }
            auditViewController?.syncChannelAuditUI?.(state);
          }
        }
      });
    });

    // 2. Expand / Collapse
    document.getElementById('ytAiBrandToggle')?.addEventListener('click', () => bannerView.toggleExpand());
    document.getElementById('ytAiToggleBtn')?.addEventListener('click', () => bannerView.toggleExpand());

    // 2b. Instant In-Page Language Switching
    document.getElementById('ytAiLangSelect')?.addEventListener('change', (e) => {
      const newLang = e.target.value;
      if (!newLang) return;
      state.currentLang = newLang;
      state.savePreference?.('targetLang', newLang);
      bannerView.applyLanguage(newLang, summaryViewController, chatViewController, auditViewController);
      audioController?.populateVoiceDropdown?.(newLang);
    });

    // 3. CTA actions & Subtabs
    document.getElementById('ytAiSummarizeBtn')?.addEventListener('click', triggerSummarize);
    document.getElementById('ytAiStopSummaryBtn')?.addEventListener('click', () => summaryViewController?.stopGeneration?.(state.currentLang));
    document.getElementById('ytAiRunAuditBtn')?.addEventListener('click', triggerAudit);
    document.getElementById('ytAiAuditChannelBtn')?.addEventListener('click', triggerChannelAudit);
    document.getElementById('ytAiRunWatchChannelAuditBtn')?.addEventListener('click', triggerChannelAudit);
    document.getElementById('ytAiCopyAuditBtn')?.addEventListener('click', () => auditViewController?.handleCopyAudit?.());
    document.getElementById('ytAiAuditSubtabVideoBtn')?.addEventListener('click', () => {
      auditViewController?.switchAuditSubtab('video');
    });
    document.getElementById('ytAiAuditSubtabChannelBtn')?.addEventListener('click', () => {
      auditViewController?.switchAuditSubtab('channel');
    });

    // Period Filter Pills for Channel Audit
    banner.querySelectorAll('.yt-ai-period-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        banner.querySelectorAll('.yt-ai-period-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.channelAuditPeriod = pill.getAttribute('data-period') || 'all';
      });
    });

    // Max Videos Limit Selector
    const watchMaxSelect = document.getElementById('ytAiWatchChannelMaxVideos');
    if (watchMaxSelect) {
      watchMaxSelect.value = resolveEffectiveChannelLimit(state.channelAuditMaxVideos || 30, state.currentChannelTotalVideos || null);
      watchMaxSelect.addEventListener('change', (e) => {
        const parsed = parseChannelAuditLimit(e.target.value);
        state.channelAuditMaxVideos = parsed.isAll ? 'all' : parsed.numericLimit;
        state.savePreference('channelAuditMaxVideos', state.channelAuditMaxVideos);
      });
    }

    // 4. Settings Drawer Toggle
    document.getElementById('ytAiSettingsToggleBtn')?.addEventListener('click', () => {
      SettingsDrawerController.toggleSettingsDrawer(exp => bannerView.setExpanded(exp));
    });

    // Delegate Settings Drawer interactions to dedicated handler
    SettingsDrawerEventHandler.bind(banner, settingsDrawer, state, bannerView);

    // 8. Audio
    audioController.init();
    document.getElementById('ytAiSpeakSummaryBtn')?.addEventListener('click', (e) => {
      const text = summaryViewController.fullSummaryMarkdown || document.getElementById('ytAiSummaryBody')?.innerText || '';
      if (text.trim()) {
        audioController.speakText(text, e.currentTarget, { lang: state.currentLang });
      } else {
        bannerView.showStatusBanner(I18N[state.currentLang]?.noSummaryToRead || 'No summary to read', true);
      }
    });

    // 9. Chat
    const sendChat = (customText = null) => {
      chatViewController.handleSendChatMessage(customText, {
        state, currentLang: state.currentLang, currentProvider: state.currentProvider,
        apiKeys: state.apiKeys, serverUrls: state.serverUrls, temperature: state.temperature,
        maxTokens: state.maxTokens, getActiveModel: () => state.getActiveModel(),
        setExpanded: exp => bannerView.setExpanded(exp), switchTab: tab => bannerView.switchTab(tab)
      });
    };

    document.getElementById('ytAiSendChatBtn')?.addEventListener('click', () => sendChat());
    const chatInput = document.getElementById('ytAiChatInput');
    chatInput?.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
    });
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
    document.getElementById('ytAiMicBtn')?.addEventListener('click', () => {
      audioController.toggleDictation({
        localWhisperUrl: state.localWhisperUrl,
        groqKey: state.apiKeys.groq,
        openaiKey: state.apiKeys.openai
      });
    });
    document.getElementById('ytAiClearChatBtn')?.addEventListener('click', () => {
      chatViewController.handleClearChat(state.currentLang);
    });

    // Delegated suggestion chips (preserved across in-place language swaps)
    const sugBox = banner.querySelector?.('.yt-ai-chat-suggestions');
    if (sugBox) {
      sugBox.addEventListener('click', (e) => {
        const chip = e.target?.closest ? e.target.closest('.yt-ai-suggestion-chip') : (e.target?.classList?.contains?.('yt-ai-suggestion-chip') ? e.target : null);
        if (!chip) return;
        const q = chip.getAttribute('data-question') || chip.textContent.trim();
        sendChat(q);
      });
    } else {
      banner.querySelectorAll?.('.yt-ai-suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const q = chip.getAttribute('data-question') || chip.textContent.trim();
          sendChat(q);
        });
      });
    }

    // 10. Exports & Copy
    document.getElementById('ytAiCopyBtn')?.addEventListener('click', () => summaryViewController.handleCopySummary(state.currentLang));
    document.getElementById('ytAiDownloadBtn')?.addEventListener('click', () => summaryViewController.handleExport('md', state.currentLang));
    document.getElementById('ytAiSaveTxtBtn')?.addEventListener('click', () => summaryViewController.handleExport('txt', state.currentLang));
    document.getElementById('ytAiSaveJsonBtn')?.addEventListener('click', () => summaryViewController.handleExport('json', state.currentLang));
    document.getElementById('ytAiCopyTranscriptBtn')?.addEventListener('click', () => transcriptController.handleCopyTranscript(state.currentLang));

    // 10b. Delegated clickable timestamp seek across Summary, Audit, Q&A Chat & Transcript
    banner.addEventListener?.('click', (e) => {
      const link = e.target?.closest ? e.target.closest('.yt-ai-timestamp-link, a[data-seek], a[href^="#t="]') : null;
      if (!link) return;
      e.preventDefault();
      const rawSec = link.getAttribute('data-time') || link.getAttribute('data-seek') || link.getAttribute('href')?.replace('#t=', '') || '';
      const sec = parseFloat(rawSec);
      const video = document.querySelector?.('video');
      if (video && !isNaN(sec)) {
        video.currentTime = sec;
        video.play?.().catch?.(() => {});
      }
    });

    // 11. Initial synchronization of Provider, Models & Active Channel Audits
    settingsDrawer?.syncProviderUI();
    auditViewController?.syncChannelAuditUI?.(state);
  }
}

export default BannerEventHandler;
