import { getVideoId } from './NavigationObserver.js';
import { SettingsDrawerController } from './SettingsDrawerController.js';
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
                transcriptController.cachedTranscript.videoId !== currentVideoId) {
              transcriptController.extractYouTubeTranscript(state.currentLang, true);
            }
          }
        }
      });
    });

    // 2. Expand / Collapse
    document.getElementById('ytAiBrandToggle')?.addEventListener('click', () => bannerView.toggleExpand());
    document.getElementById('ytAiToggleBtn')?.addEventListener('click', () => bannerView.toggleExpand());

    // 3. CTA actions & Subtabs
    document.getElementById('ytAiSummarizeBtn')?.addEventListener('click', triggerSummarize);
    document.getElementById('ytAiRunAuditBtn')?.addEventListener('click', triggerAudit);
    document.getElementById('ytAiAuditChannelBtn')?.addEventListener('click', triggerChannelAudit);
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

    // 4. Settings Drawer Toggle & Subtabs
    document.getElementById('ytAiSettingsToggleBtn')?.addEventListener('click', () => {
      SettingsDrawerController.toggleSettingsDrawer(exp => bannerView.setExpanded(exp));
    });
    document.getElementById('ytAiSettingsCloseBtn')?.addEventListener('click', () => {
      SettingsDrawerController.setSettingsDrawerOpen(false);
    });
    banner.querySelectorAll('.yt-ai-settings-tab-btn').forEach(btn => btn.addEventListener('click', () => {
      const sub = btn.getAttribute('data-subtab');
      if (sub) SettingsDrawerController.switchSettingsSubtab(sub);
    }));

    // 5. Format & Language
    banner.querySelectorAll('.yt-ai-format-pill').forEach(pill => pill.addEventListener('click', () => {
      const mode = pill.getAttribute('data-mode');
      if (mode) bannerView.setSummaryMode(mode);
    }));
    document.getElementById('ytAiModeSelect')?.addEventListener('change', (e) => bannerView.setSummaryMode(e.target.value));
    document.getElementById('ytAiLangSelect')?.addEventListener('change', (e) => {
      state.currentLang = e.target.value;
      state.savePreference('targetLang', state.currentLang);
      bannerView.applyLanguage(state.currentLang, summaryViewController, chatViewController, auditViewController);
      audioController.populateVoiceDropdown(state.currentLang);
    });

    // 6. Provider, API Key & Server
    document.getElementById('ytAiProviderSelect')?.addEventListener('change', (e) => {
      state.currentProvider = e.target.value;
      state.savePreference('aiProvider', state.currentProvider);
      settingsDrawer.syncProviderUI();
    });
    document.getElementById('ytAiApiKeyInput')?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.apiKeys[state.currentProvider] = val;
      state.savePreference(`apiKey_${state.currentProvider}`, val);
      if (state.keyVerified) delete state.keyVerified[state.currentProvider];
      bannerView.updateHeaderBadge();
    });
    document.getElementById('ytAiServerSelect')?.addEventListener('change', (e) => {
      const isOllama = state.currentProvider === 'ollama';
      const def = isOllama ? 'http://localhost:11434' : 'http://127.0.0.1:1234';
      if (e.target.value === 'custom') {
        const custom = prompt(`Address for ${isOllama ? 'Ollama' : 'LM Studio'}:`, state.serverUrls[state.currentProvider] || def);
        if (custom) {
          const clean = custom.trim().replace(/\/+$/, '');
          state.serverUrls[state.currentProvider] = clean;
          state.savePreference(`serverUrl_${state.currentProvider}`, clean);
          settingsDrawer.updateServerUrlUI();
          settingsDrawer.refreshModelsList();
        }
      } else {
        state.serverUrls[state.currentProvider] = e.target.value;
        state.savePreference(`serverUrl_${state.currentProvider}`, e.target.value);
        settingsDrawer.updateServerUrlUI();
        settingsDrawer.refreshModelsList();
      }
    });

    // 7. Models
    document.getElementById('ytAiRefreshModelsBtn')?.addEventListener('click', () => settingsDrawer.refreshModelsList(true));
    document.getElementById('ytAiTestModelBtn')?.addEventListener('click', () => settingsDrawer.handleTestConnection());
    document.getElementById('ytAiTestWhisperBtn')?.addEventListener('click', () => settingsDrawer.handleTestWhisper());
    document.getElementById('ytAiModelSelect')?.addEventListener('change', (e) => {
      state.setActiveModel(e.target.value);
      state.savePreference(`selectedModel_${state.currentProvider}`, e.target.value);
      state.savePreference('selectedModel', e.target.value);
      bannerView.updateHeaderModelText();
    });

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

    // Suggestion chips
    banner.querySelectorAll('.yt-ai-suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-question') || chip.textContent.trim();
        sendChat(q);
      });
    });

    // 10. Exports & Copy
    document.getElementById('ytAiCopyBtn')?.addEventListener('click', () => summaryViewController.handleCopySummary(state.currentLang));
    document.getElementById('ytAiDownloadBtn')?.addEventListener('click', () => summaryViewController.handleExport('md', state.currentLang));
    document.getElementById('ytAiSaveTxtBtn')?.addEventListener('click', () => summaryViewController.handleExport('txt', state.currentLang));
    document.getElementById('ytAiSaveJsonBtn')?.addEventListener('click', () => summaryViewController.handleExport('json', state.currentLang));
    document.getElementById('ytAiCopyTranscriptBtn')?.addEventListener('click', () => transcriptController.handleCopyTranscript(state.currentLang));
  }
}

export default BannerEventHandler;
