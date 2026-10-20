import { I18N } from '../locales/index.js';
import { BannerView } from './ui/BannerView.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { NavigationObserver, getVideoId, isWatchPage } from './ui/NavigationObserver.js';
import { SettingsDrawerController } from './ui/SettingsDrawerController.js';
import { SummaryViewController } from './ui/SummaryViewController.js';
import { ChatViewController } from './ui/ChatViewController.js';
import { InPageTranscriptController } from './services/InPageTranscriptController.js';
import { NativeTranscriptPanel } from './services/NativeTranscriptPanel.js';
import { InPageAudioController } from './services/InPageAudioController.js';
import { ExportHandler } from './services/ExportHandler.js';
import { PromptService } from './services/PromptService.js';

// Application State Container
const state = {
  extensionEnabled: true,
  currentProvider: 'lmstudio',
  serverUrls: { lmstudio: 'http://192.168.56.1:1234', ollama: 'http://localhost:11434' },
  apiKeys: { openai: '', gemini: '', claude: '', groq: '', deepseek: '' },
  selectedModels: {},
  availableLocalModels: {},
  currentLang: 'fr',
  temperature: '0.3',
  maxTokens: 'auto',
  ttsSpeed: '1.0',
  localWhisperUrl: 'http://127.0.0.1:8000',
  autoSummarize: false,
  customPrompt: '',
  selectedVoiceURI: '',
  selectedMicDeviceId: '',
  getActiveModel() { return this.selectedModels[this.currentProvider] || ''; },
  setActiveModel(m) { this.selectedModels[this.currentProvider] = m; },
  savePreference(key, val) {
    if (chrome?.storage?.local) chrome.storage.local.set({ [key]: val });
  }
};

// Clean Architecture Service Collaborators
const transcriptController = new InPageTranscriptController();
const audioController = new InPageAudioController();
const promptService = new PromptService();
const bannerView = new BannerView(state);
const settingsDrawer = new SettingsDrawerController(state, { bannerView });
const summaryViewController = new SummaryViewController({
  transcriptController,
  promptService,
  audioController
});
const chatViewController = new ChatViewController({
  transcriptController,
  promptService,
  audioController
});

const triggerSummarize = () => {
  bannerView.setExpanded(true);
  bannerView.switchTab('summary');
  summaryViewController.startSummarization({
    state,
    currentLang: state.currentLang,
    getActiveModel: () => state.getActiveModel(),
    showStatusBanner: (msg, isErr) => bannerView.showStatusBanner(msg, isErr)
  });
};

function bindBannerEvents(banner) {
  if (!banner) return;

  // Tabs navigation
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
            transcriptController.extractYouTubeTranscript(state.currentLang, false);
          }
        }
      }
    });
  });

  // Expand / Collapse toggles
  document.getElementById('ytAiBrandToggle')?.addEventListener('click', () => bannerView.toggleExpand());
  document.getElementById('ytAiToggleBtn')?.addEventListener('click', () => bannerView.toggleExpand());

  // Summarize CTA action
  document.getElementById('ytAiSummarizeBtn')?.addEventListener('click', triggerSummarize);

  // Settings Drawer Toggle & Subtabs
  document.getElementById('ytAiSettingsToggleBtn')?.addEventListener('click', () => SettingsDrawerController.toggleSettingsDrawer(exp => bannerView.setExpanded(exp)));
  document.getElementById('ytAiSettingsCloseBtn')?.addEventListener('click', () => SettingsDrawerController.setSettingsDrawerOpen(false));
  banner.querySelectorAll('.yt-ai-settings-tab-btn').forEach(btn => btn.addEventListener('click', () => {
    const sub = btn.getAttribute('data-subtab');
    if (sub) SettingsDrawerController.switchSettingsSubtab(sub);
  }));

  // Format pills & select
  banner.querySelectorAll('.yt-ai-format-pill').forEach(pill => pill.addEventListener('click', () => {
    const mode = pill.getAttribute('data-mode');
    if (mode) bannerView.setSummaryMode(mode);
  }));
  document.getElementById('ytAiModeSelect')?.addEventListener('change', (e) => bannerView.setSummaryMode(e.target.value));

  // Language select
  document.getElementById('ytAiLangSelect')?.addEventListener('change', (e) => {
    state.currentLang = e.target.value;
    state.savePreference('targetLang', state.currentLang);
    bannerView.applyLanguage(state.currentLang, summaryViewController);
    audioController.populateVoiceDropdown(state.currentLang);
  });

  // Provider & Server controls
  document.getElementById('ytAiProviderSelect')?.addEventListener('change', (e) => {
    state.currentProvider = e.target.value;
    state.savePreference('aiProvider', state.currentProvider);
    settingsDrawer.syncProviderUI();
  });
  document.getElementById('ytAiApiKeyInput')?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    state.apiKeys[state.currentProvider] = val;
    state.savePreference(`apiKey_${state.currentProvider}`, val);
    bannerView.updateHeaderBadge();
  });
  document.getElementById('ytAiServerSelect')?.addEventListener('change', (e) => {
    const isOllama = state.currentProvider === 'ollama';
    const def = isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234';
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

  // Model refresh & test connection
  document.getElementById('ytAiRefreshModelsBtn')?.addEventListener('click', () => settingsDrawer.refreshModelsList(true));
  document.getElementById('ytAiTestModelBtn')?.addEventListener('click', () => settingsDrawer.handleTestConnection());
  document.getElementById('ytAiTestWhisperBtn')?.addEventListener('click', () => settingsDrawer.handleTestWhisper());
  document.getElementById('ytAiModelSelect')?.addEventListener('change', (e) => {
    state.setActiveModel(e.target.value);
    state.savePreference(`selectedModel_${state.currentProvider}`, e.target.value);
    state.savePreference('selectedModel', e.target.value);
    bannerView.updateHeaderModelText();
  });

  // Audio & Speech events
  audioController.init();
  document.getElementById('ytAiSpeakSummaryBtn')?.addEventListener('click', (e) => {
    const text = summaryViewController.fullSummaryMarkdown || document.getElementById('ytAiSummaryBody')?.innerText || '';
    if (text.trim()) {
      audioController.speakText(text, e.currentTarget);
    } else {
      bannerView.showStatusBanner(I18N[state.currentLang]?.noSummaryToRead || 'No summary to read', true);
    }
  });

  // Chat Q&A events
  const sendChat = (customText = null) => {
    chatViewController.handleSendChatMessage(customText, {
      state,
      currentLang: state.currentLang,
      currentProvider: state.currentProvider,
      apiKeys: state.apiKeys,
      serverUrls: state.serverUrls,
      temperature: state.temperature,
      maxTokens: state.maxTokens,
      getActiveModel: () => state.getActiveModel(),
      setExpanded: exp => bannerView.setExpanded(exp),
      switchTab: tab => bannerView.switchTab(tab)
    });
  };

  document.getElementById('ytAiSendChatBtn')?.addEventListener('click', () => sendChat());
  document.getElementById('ytAiChatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
  banner.querySelectorAll('.yt-ai-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => sendChat(chip.getAttribute('data-question') || chip.textContent.trim()));
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

  // Export handlers
  document.getElementById('ytAiCopyBtn')?.addEventListener('click', (e) => ExportHandler.copyToClipboard(summaryViewController.fullSummaryMarkdown, e.currentTarget));
  document.getElementById('ytAiDownloadBtn')?.addEventListener('click', () => ExportHandler.downloadMarkdown(summaryViewController.fullSummaryMarkdown, getVideoId()));
  document.getElementById('ytAiSaveTxtBtn')?.addEventListener('click', () => ExportHandler.downloadTxt(summaryViewController.fullSummaryMarkdown, getVideoId()));
  document.getElementById('ytAiSaveJsonBtn')?.addEventListener('click', () => ExportHandler.downloadJson(summaryViewController.fullSummaryMarkdown, getVideoId(), transcriptController.cachedTranscript));

  // Timestamp navigation delegation
  banner.addEventListener('click', (e) => {
    const link = e.target.closest('.yt-ai-timestamp-link');
    if (link && link.dataset.time !== undefined) {
      e.preventDefault();
      const sec = parseFloat(link.dataset.time);
      const video = document.querySelector('video');
      if (video && !isNaN(sec)) {
        video.currentTime = sec;
        video.play().catch(() => {});
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        bannerView.showStatusBanner(`⏱️ Playing at ${m}:${s}`, false);
      }
    }
  });

  // Initial UI state synchronization
  bannerView.applyLanguage(state.currentLang, summaryViewController);
  settingsDrawer.syncProviderUI();
  summaryViewController.renderSummaryEmptyState(false, state.currentLang, triggerSummarize);
}

function loadPreferences(callback) {
  if (!chrome?.storage?.local) return callback?.();
  chrome.storage.local.get(null, (items = {}) => {
    if (typeof items.extensionEnabled === 'boolean') state.extensionEnabled = items.extensionEnabled;
    if (items.aiProvider) state.currentProvider = items.aiProvider;
    if (items.targetLang) state.currentLang = items.targetLang;
    if (items.selectedModel) state.setActiveModel(items.selectedModel);
    ['openai', 'gemini', 'claude', 'groq', 'deepseek'].forEach(p => { if (items[`apiKey_${p}`]) state.apiKeys[p] = items[`apiKey_${p}`]; });
    ['lmstudio', 'ollama'].forEach(p => {
      if (items[`serverUrl_${p}`]) state.serverUrls[p] = items[`serverUrl_${p}`];
      if (items[`selectedModel_${p}`]) state.selectedModels[p] = items[`selectedModel_${p}`];
    });
    callback?.();
  });
}

function initContentScript() {
  ThemeManager.initThemeSync();

  loadPreferences(() => {
    bannerView.tryInjectBanner(bindBannerEvents);

    NavigationObserver.observeNavigation(({ isNewVideo }) => {
      if (isNewVideo) {
        audioController.stopAll();
        NativeTranscriptPanel.closeNativeTranscriptPanel();
        transcriptController.resetAllState(state.currentLang);
        summaryViewController.resetSummaryOutput(state.currentLang, triggerSummarize);
        chatViewController.resetChatOutput(state.currentLang);
      }
      bannerView.tryInjectBanner(bindBannerEvents);
      if (isNewVideo && state.autoSummarize) {
        triggerSummarize();
      }
    });

    chrome.runtime?.onMessage?.addListener((req, sender, sendResponse) => {
      if (req.type === 'GET_IN_PAGE_STATUS') {
        sendResponse({ success: true, enabled: state.extensionEnabled, isWatchPage: isWatchPage() });
      } else if (req.type === 'SET_EXTENSION_ENABLED') {
        state.extensionEnabled = !!req.enabled;
        bannerView.tryInjectBanner(bindBannerEvents);
        sendResponse({ success: true });
      }
      return true;
    });
  });
}

// Bootstrap in page
initContentScript();
