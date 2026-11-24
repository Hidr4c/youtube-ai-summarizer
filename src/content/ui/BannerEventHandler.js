import { getActiveVideoElement, isWebPageMode } from './NavigationObserver.js';
import { SettingsDrawerController } from './SettingsDrawerController.js';
import { SettingsDrawerEventHandler } from './SettingsDrawerEventHandler.js';
import { HeaderTabHandler } from './HeaderTabHandler.js';
import { PaneExportHelper } from './PaneExportHelper.js';
import { SpeechPlayerBar } from './SpeechPlayerBar.js';
import { AccessiblePageDescriber } from './AccessiblePageDescriber.js';
import { parseChannelAuditLimit, resolveEffectiveChannelLimit } from '../../config/ExtensionConstants.js';
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
      transcriptController, webPageController, triggerSummarize, triggerAudit, triggerChannelAudit
    } = ctx;

    // 1. Unified Header Tabs (1-click expand + switch + launch if empty)
    banner.querySelectorAll('.yt-ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => HeaderTabHandler.handleTabSelection(btn, ctx));
    });

    // 2. Expand / Collapse & Close/Disable Extension
    document.getElementById('ytAiBrandToggle')?.addEventListener('click', () => bannerView.toggleExpand());
    document.getElementById('ytAiToggleBtn')?.addEventListener('click', () => bannerView.toggleExpand());
    document.getElementById('ytAiCloseExtensionBtn')?.addEventListener('click', () => ctx.disableExtension?.());

    // 2b. Instant In-Page Language Switching
    document.getElementById('ytAiLangSelect')?.addEventListener('change', (e) => {
      const newLang = e.target.value;
      if (!newLang) return;
      state.currentLang = newLang;
      state.savePreference?.('targetLang', newLang);
      bannerView.applyLanguage(newLang, summaryViewController, chatViewController, auditViewController);
      if (isWebPageMode() && webPageController) webPageController.applyWebPageUiLabels?.(newLang);
      audioController?.populateVoiceDropdown?.(newLang);
    });

    // 3. CTA actions & Subtabs (format selectors for Summary, Audit, and Channel/Site Audit)
    const bindModeSelector = (id, stateKey, onChangeExtra = null) => {
      const sel = document.getElementById(id);
      if (sel && state[stateKey]) sel.value = state[stateKey];
      sel?.addEventListener('change', (e) => {
        state[stateKey] = e.target.value;
        state.savePreference?.(stateKey, e.target.value);
        onChangeExtra?.(e.target.value);
      });
    };
    bindModeSelector('ytAiModeSelect', 'summaryMode', (val) => { if (bannerView) bannerView.currentMode = val; });
    bindModeSelector('ytAiAuditModeSelect', 'auditMode');
    bindModeSelector('ytAiChannelAuditModeSelect', 'channelAuditMode');
    document.getElementById('ytAiSummarizeBtn')?.addEventListener('click', triggerSummarize);
    document.getElementById('ytAiStopSummaryBtn')?.addEventListener('click', () => summaryViewController?.stopGeneration?.(state.currentLang));
    document.getElementById('ytAiRunAuditBtn')?.addEventListener('click', triggerAudit);
    document.getElementById('ytAiAuditChannelBtn')?.addEventListener('click', triggerChannelAudit);
    document.getElementById('ytAiRunWatchChannelAuditBtn')?.addEventListener('click', triggerChannelAudit);
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
    SpeechPlayerBar.bind(audioController, () => state.currentLang);
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
      if (isWebPageMode() && webPageController) {
        const inputEl = document.getElementById('ytAiChatInput');
        const txt = (customText || inputEl?.value || '').trim();
        const atts = customText ? [] : (chatViewController?.attachmentHelper?.consume?.() || []);
        if (!txt && atts.length === 0) return;
        if (inputEl) { inputEl.value = ''; if (inputEl.style) inputEl.style.height = 'auto'; }
        webPageController.sendChatMessage(txt, atts, { attachmentHelper: chatViewController?.attachmentHelper, audioController });
        return;
      }
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
    const attachHelper = chatViewController?.attachmentHelper;
    if (attachHelper) {
      attachHelper.getModelInfo = () => {
        const model = typeof state?.getActiveModel === 'function' ? state.getActiveModel() : (state?.selectedModel || '');
        return { provider: state?.currentProvider || '', model, meta: state?.modelCapabilities?.[model] || null };
      };
      attachHelper.syncUiCapability();
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && !banner.dataset?.ytAiModelListener) {
        if (banner.dataset) banner.dataset.ytAiModelListener = 'true';
        window.addEventListener('yt-ai-model-changed', () => attachHelper.syncUiCapability());
      }
    }
    const attachInput = document.getElementById('ytAiAttachInput');
    document.getElementById('ytAiAttachBtn')?.addEventListener('click', () => attachInput?.click());
    attachInput?.addEventListener('change', async (e) => {
      await chatViewController.attachmentHelper?.handleFiles(e.target?.files);
      if (attachInput) attachInput.value = '';
    });
    chatInput?.addEventListener('paste', (e) => {
      chatViewController.attachmentHelper?.handlePaste(e);
    });
    const chatBox = banner.querySelector?.('.yt-ai-chat-container');
    chatBox?.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types?.includes?.('Files')) e.preventDefault();
    });
    chatBox?.addEventListener('drop', (e) => {
      if (e.dataTransfer?.files?.length > 0) {
        e.preventDefault();
        chatViewController.attachmentHelper?.handleFiles(e.dataTransfer.files);
      }
    });
    document.getElementById('ytAiDescribeAccessibleBtn')?.addEventListener('click', () => {
      AccessiblePageDescriber.trigger({
        isWebMode: isWebPageMode(), webPageController, chatViewController, bannerView, audioController, state
      });
    });
    document.getElementById('ytAiClearChatBtn')?.addEventListener('click', () => {
      if (isWebPageMode() && webPageController) webPageController.clearChat?.();
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
    const exportMenu = document.getElementById('ytAiExportMenu');
    document.getElementById('ytAiExportBtn')?.addEventListener('click', (e) => {
      e.stopPropagation?.();
      exportMenu?.classList?.toggle('yt-ai-hidden');
    });
    const runExport = (fmt) => {
      exportMenu?.classList?.add('yt-ai-hidden');
      summaryViewController.handleExport(fmt, state.currentLang);
    };
    document.getElementById('ytAiDownloadBtn')?.addEventListener('click', () => runExport('md'));
    document.getElementById('ytAiSaveTxtBtn')?.addEventListener('click', () => runExport('txt'));
    document.getElementById('ytAiSaveJsonBtn')?.addEventListener('click', () => runExport('json'));
    document.addEventListener?.('click', (e) => {
      if (exportMenu && !document.getElementById('ytAiExportDropdown')?.contains?.(e.target)) {
        exportMenu.classList?.add('yt-ai-hidden');
      }
    });
    document.getElementById('ytAiCopyTranscriptBtn')?.addEventListener('click', () => transcriptController.handleCopyTranscript(state.currentLang));
    PaneExportHelper.bind({
      prefix: 'ytAiAudit',
      copyBtnId: 'ytAiCopyAuditBtn',
      bannerView,
      getLang: () => state.currentLang,
      getPayload: () => {
        const webRep = isWebPageMode() ? webPageController?.auditReport : null;
        const vidRep = auditViewController?.lastReport;
        const rep = webRep || vidRep;
        const domTxt = document.getElementById('ytAiAuditBody')?.innerText || '';
        const cleanDom = /click "|cliquez sur/i.test(domTxt) ? '' : domTxt;
        return { markdown: rep?.rawMarkdown || cleanDom, score: rep?.reliabilityScore ?? null };
      }
    });
    PaneExportHelper.bind({
      prefix: 'ytAiChannelAudit',
      copyBtnId: 'ytAiCopyChannelAuditBtn',
      bannerView,
      getLang: () => state.currentLang,
      getPayload: () => {
        const md = (isWebPageMode() ? webPageController?.domainAuditMarkdown : '') || '';
        const domTxt = document.getElementById('ytAiWatchChannelResultContainer')?.innerText || '';
        const cleanDom = /click "|cliquez sur/i.test(domTxt) ? '' : domTxt;
        return {
          markdown: md || cleanDom,
          score: isWebPageMode() ? (webPageController?.domainAuditScore ?? null) : null
        };
      }
    });

    // 10b. Delegated clickable timestamp seek across Summary, Audit, Q&A Chat & Transcript
    banner.addEventListener?.('click', (e) => {
      const link = e.target?.closest ? e.target.closest('.yt-ai-timestamp-link, a[data-seek], a[href^="#t="]') : null;
      if (!link) return;
      e.preventDefault();
      const rawSec = link.getAttribute('data-time') || link.getAttribute('data-seek') || link.getAttribute('href')?.replace('#t=', '') || '';
      const sec = parseFloat(rawSec);
      const video = getActiveVideoElement();
      if (video && !isNaN(sec)) {
        video.currentTime = sec;
        video.play?.().catch?.(() => {});
        if (banner.classList?.contains('yt-ai-shorts-mode')) {
          video.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    // 10c. Isolate wheel scrolling inside expanded Shorts sheet so it never skips to next Short
    banner.addEventListener?.('wheel', (e) => {
      if (banner.classList?.contains('yt-ai-shorts-mode') && !banner.classList?.contains('is-collapsed')) {
        e.stopPropagation();
      }
    }, { passive: true });

    // 10d. Protect native text selection and copy inside ClarifAI from host anti-copy listeners
    ['selectstart', 'copy'].forEach((evtName) => {
      banner.addEventListener?.(evtName, (e) => {
        e.stopPropagation?.();
      });
    });

    // 11. Initial synchronization of Provider, Models & Active Channel Audits
    settingsDrawer?.syncProviderUI();
    auditViewController?.syncChannelAuditUI?.(state);
  }
}

export default BannerEventHandler;
