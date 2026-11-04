import { I18N } from '../../locales/index.js';
import { PROVIDER_NAMES } from '../../config/AIProviderPresets.js';
import { BannerTemplate } from '../templates/BannerTemplate.js';
import { ThemeManager } from './ThemeManager.js';
import { safeSetInnerHTML, escapeHtml } from './MarkdownRenderer.js';
import { isWatchPage } from './NavigationObserver.js';

/**
 * Controller & DOM View for In-Page Summarizer Banner (Header, Tabs, State)
 */
export class BannerView {
  constructor(state = {}) {
    this.state = state;
    this.isExpanded = false;
    this.currentMode = 'standard';
  }

  tryInjectBanner(onInit = null) {
    if (!this.state.extensionEnabled) {
      const existing = document.getElementById('yt-ai-summarizer-container');
      if (existing) existing.remove();
      return;
    }
    if (!isWatchPage()) return;
    const existing = document.getElementById('yt-ai-summarizer-container');
    if (existing && existing.isConnected) return;
    if (existing) existing.remove();

    const watchContainer = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
    let parent = null;
    let refChild = null;

    if (watchContainer && watchContainer.isConnected) {
      parent = watchContainer;
      refChild = watchContainer.querySelector('#player-theater-container') ||
                 watchContainer.querySelector('#columns') ||
                 watchContainer.firstChild;
    } else {
      const columns = document.getElementById('columns') || document.querySelector('ytd-watch-flexy #columns, ytd-watch-grid #columns');
      if (columns && columns.parentNode) {
        parent = columns.parentNode;
        refChild = columns;
      } else {
        const primary = document.getElementById('primary') || document.getElementById('below');
        if (primary && primary.parentNode) {
          parent = primary.parentNode;
          refChild = primary;
        }
      }
    }

    if (!parent) {
      setTimeout(() => this.tryInjectBanner(onInit), 250);
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'yt-ai-summarizer-container';
    banner.className = 'is-collapsed';
    ThemeManager.syncThemeWithYouTube(banner);

    const lang = this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    safeSetInnerHTML(banner, BannerTemplate.render(t, { version: 'v1.3.3' }));

    parent.insertBefore(banner, refChild);
    if (typeof onInit === 'function') onInit(banner);
  }

  setExpanded(expand) {
    this.isExpanded = expand;
    const container = document.getElementById('yt-ai-summarizer-container');
    const toggleText = document.getElementById('ytAiToggleText');
    const toggleIcon = document.getElementById('ytAiToggleIcon');
    const lang = document.getElementById('ytAiLangSelect')?.value || this.state.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    if (!container) return;

    if (this.isExpanded) {
      container.classList.remove('is-collapsed');
      if (toggleText) toggleText.textContent = t.collapse || 'Collapse';
      if (toggleIcon) toggleIcon.textContent = '▲';
    } else {
      container.classList.add('is-collapsed');
      if (toggleText) toggleText.textContent = t.expand || 'Expand';
      if (toggleIcon) toggleIcon.textContent = '▾';
      const drawer = document.getElementById('ytAiSettingsDrawer');
      drawer?.classList.add('yt-ai-hidden');
      document.getElementById('ytAiSettingsToggleBtn')?.classList.remove('active');
    }
  }

  toggleExpand() {
    this.setExpanded(!this.isExpanded);
  }

  switchTab(tabName) {
    document.querySelectorAll('.yt-ai-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.yt-ai-tab-pane').forEach(p => p.classList.remove('active'));

    const tabMap = {
      summary: { btn: 'ytAiTabSummaryBtn', pane: 'ytAiPaneSummary' },
      chat: { btn: 'ytAiTabChatBtn', pane: 'ytAiPaneChat' },
      transcript: { btn: 'ytAiTabTranscriptBtn', pane: 'ytAiPaneTranscript' }
    };

    const target = tabMap[tabName];
    if (target) {
      document.getElementById(target.btn)?.classList.add('active');
      document.getElementById(target.pane)?.classList.add('active');
    }

    if (tabName === 'chat') {
      setTimeout(() => document.getElementById('ytAiChatInput')?.focus(), 100);
    }
  }

  setSummaryMode(mode) {
    this.currentMode = mode;
    const modeSelect = document.getElementById('ytAiModeSelect');
    if (modeSelect) {
      modeSelect.value = mode;
      this.state.savePreference('summaryMode', mode);
    }
    document.querySelectorAll('.yt-ai-format-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-mode') === mode);
    });
  }

  showStatusBanner(text, isError = false) {
    const banner = document.getElementById('ytAiStatusBanner');
    if (!banner) return;
    let cleanText = (text || '').trim();
    if (isError) {
      cleanText = cleanText.replace(/^❌\s*/, '');
      cleanText = `❌ ${cleanText}`;
    }
    banner.textContent = cleanText;
    banner.className = `yt-ai-reasoning ${isError ? 'offline' : ''}`;
    banner.classList.remove('yt-ai-hidden');
    setTimeout(() => {
      if (banner.textContent === cleanText) banner.classList.add('yt-ai-hidden');
    }, 7000);
  }

  updateHeaderBadge() {
    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[this.state.currentLang] || I18N.en;
    if (!badge || !badgeText) return;

    if (this.state.currentProvider === 'lmstudio' || this.state.currentProvider === 'ollama') {
      const name = this.state.currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
      const models = this.state.availableLocalModels[this.state.currentProvider] || [];
      const currentUrl = this.state.serverUrls[this.state.currentProvider] || (this.state.currentProvider === 'ollama' ? 'http://localhost:11434' : 'http://192.168.56.1:1234');
      const cleanHost = currentUrl.replace(/https?:\/\//, '');

      if (models.length > 0) {
        badge.className = 'yt-ai-badge online';
        badgeText.textContent = `${name} (${cleanHost})`;
      } else {
        badge.className = 'yt-ai-badge';
        badgeText.textContent = `${name} (${t.checking || 'Connecting...'})`;
      }
      return;
    }

    const hasKey = !!this.state.apiKeys[this.state.currentProvider];
    const name = PROVIDER_NAMES[this.state.currentProvider] || this.state.currentProvider;
    if (hasKey) {
      badge.className = 'yt-ai-badge online';
      badgeText.textContent = `${name} (${t.keyOk || 'Key OK'})`;
    } else {
      badge.className = 'yt-ai-badge offline';
      badgeText.textContent = `${name} (${t.keyRequired || 'Key required'})`;
    }
  }

  updateHeaderModelText() {
    const el = document.getElementById('ytAiHeaderModelText');
    const t = I18N[this.state.currentLang] || I18N.en;
    const activeM = this.state.getActiveModel();
    if (el) {
      el.textContent = activeM ? `${t.modelPrefix || 'Model: '}${activeM}` : (t.noModelSelected || 'No model');
    }
  }

  applyLanguage(lang, summaryViewController = null, settingsDrawer = null) {
    this.state.currentLang = lang;
    const t = I18N[lang] || I18N.en;

    const setText = (id, txt) => {
      const el = document.getElementById(id);
      if (el && txt) el.textContent = txt;
    };

    const langSelect = document.getElementById('ytAiLangSelect');
    if (langSelect && langSelect.value !== lang) langSelect.value = lang;

    setText('ytAiBrandTitle', t.brandName || 'YT Summarizer AI');
    if (!summaryViewController?.isGenerating) setText('ytAiSummarizeBtn', t.summarizeBtn || '✨ Summarize video');
    setText('ytAiToggleText', this.isExpanded ? t.collapse : t.expand);
    setText('ytAiSettingsBtnText', t.settingsBtn || 'Settings');
    setText('ytAiTabSummaryBtn', t.tabSummary || '📝 AI Summary');

    const tabChatBtn = document.getElementById('ytAiTabChatBtn');
    if (tabChatBtn) {
      const count = document.getElementById('ytAiChatCount')?.textContent || '0';
      safeSetInnerHTML(tabChatBtn, `${escapeHtml(t.tabChat || '💬 Ask a question')} <span id="ytAiChatCount" class="yt-ai-tab-count-badge">${escapeHtml(count)}</span>`);
    }
    const tabTranscriptBtn = document.getElementById('ytAiTabTranscriptBtn');
    if (tabTranscriptBtn) {
      const rawCount = (document.getElementById('ytAiWordCountTab')?.textContent || '0').replace(/[^0-9]/g, '') || '0';
      const formattedCount = Number(rawCount) > 0 ? Number(rawCount).toLocaleString() : '0';
      safeSetInnerHTML(tabTranscriptBtn, `${escapeHtml(t.tabTranscript || '📜 Transcript')} <span id="ytAiWordCountTab" class="yt-ai-tab-count-badge">${escapeHtml(formattedCount)} ${escapeHtml(t.wordsBadge || 'words')}</span>`);
    }

    const providerName = PROVIDER_NAMES[this.state.currentProvider] || (this.state.currentProvider === 'ollama' ? 'Ollama' : (this.state.currentProvider === 'lmstudio' ? 'LM Studio' : (this.state.currentProvider || 'AI')));
    setText('ytAiSummaryHeaderTitle', `${t.summaryTitle || '📝 AI Summary'} (${providerName.toUpperCase()})`);

    setText('ytAiSpeakSummaryBtn', t.listenBtn);
    setText('ytAiCopyBtn', t.copyBtn);
    setText('ytAiDownloadBtn', t.saveMdBtn);
    setText('ytAiSaveTxtBtn', t.saveTxtBtn);
    setText('ytAiSaveJsonBtn', t.saveJsonBtn);

    const reasoningSummary = document.querySelector('#ytAiReasoningBox summary');
    if (reasoningSummary) {
      const statusSpan = document.getElementById('ytAiReasoningStatus');
      const curStatus = statusSpan?.textContent || t.reasoningInProgress || 'in progress...';
      safeSetInnerHTML(reasoningSummary, `${escapeHtml(t.reasoningModel || '💭 Model Reasoning')} (<span id="ytAiReasoningStatus">${escapeHtml(curStatus)}</span>)`);
    }

    if (!summaryViewController?.fullSummaryMarkdown) {
      setText(document.querySelector('#ytAiSummaryBody .yt-ai-empty-title'), t.emptyTitle || 'No summary generated');
      setText(document.querySelector('#ytAiSummaryBody .yt-ai-empty-subtitle'), t.emptySubtitle || t.summaryPlaceholder || 'Click below to generate the summary.');
      if (!summaryViewController?.isGenerating) setText('ytAiSummaryHeroBtn', t.summarizeBtn || '✨ Summarize video');
    }

    const chatPaneTitle = document.querySelector('#ytAiPaneChat .yt-ai-pane-title span');
    if (chatPaneTitle) chatPaneTitle.textContent = t.chatTitle || '💬 Video Q&A';
    setText('ytAiClearChatBtn', t.clearChatBtn);
    const chatInput = document.getElementById('ytAiChatInput');
    if (chatInput && t.chatPlaceholder) chatInput.placeholder = t.chatPlaceholder;
    const micBtn = document.getElementById('ytAiMicBtn');
    if (micBtn && t.micTitle) micBtn.title = t.micTitle;
    setText('ytAiSendChatBtn', t.sendBtn);

    // Dynamic Suggestion Chips
    const suggestionsContainer = document.querySelector('.yt-ai-chat-suggestions');
    if (suggestionsContainer && Array.isArray(t.suggestions) && t.suggestions.length > 0) {
      const suggestionsHtml = t.suggestions.map(s => `<span class="yt-ai-suggestion-chip" data-question="${escapeHtml(s.question || '')}">${escapeHtml(s.label)}</span>`).join('');
      safeSetInnerHTML(suggestionsContainer, suggestionsHtml);
    }

    // Dynamic Welcome Greeting (if chat is not active)
    const chatMessages = document.getElementById('ytAiChatMessages');
    const userBubbles = chatMessages?.querySelectorAll('.yt-ai-chat-user, .yt-ai-chat-bubble.user');
    if (chatMessages && (!userBubbles || userBubbles.length === 0)) {
      const firstAiBubble = chatMessages.querySelector('.yt-ai-chat-bubble.ai, .yt-ai-chat-bubble');
      if (firstAiBubble && t.chatWelcome) firstAiBubble.textContent = t.chatWelcome;
    }

    const transcriptTitle = document.querySelector('#ytAiPaneTranscript .yt-ai-pane-title span');
    const rawWordCount = (document.getElementById('ytAiWordCount')?.textContent || '0').replace(/[^0-9]/g, '') || '0';
    const formattedWordCount = Number(rawWordCount) > 0 ? Number(rawWordCount).toLocaleString() : '0';
    if (transcriptTitle) {
      safeSetInnerHTML(transcriptTitle, `${escapeHtml(t.transcriptTitle || '📜 Full Transcript')} (<span id="ytAiWordCount">${escapeHtml(formattedWordCount)}</span> ${escapeHtml(t.wordsBadge || 'words')})`);
    }
    setText('ytAiCopyTranscriptBtn', t.copyRawBtn);

    const bugLink = document.getElementById('ytAiFooterBugLink');
    if (bugLink) bugLink.textContent = `🐛 ${t.footerReportBug || 'Report a bug'}`;
    const docsLink = document.getElementById('ytAiFooterDocsLink');
    if (docsLink) docsLink.textContent = `📖 ${t.footerDocs || 'Documentation'}`;

    if (typeof settingsDrawer?.applyLanguage === 'function') {
      settingsDrawer.applyLanguage(lang);
    }

    this.updateHeaderBadge();
    this.updateHeaderModelText();
  }
}

export default BannerView;
