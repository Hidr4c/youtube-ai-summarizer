import { SettingsDrawerI18n } from './SettingsDrawerI18n.js';
import { I18N } from '../../locales/index.js';
import { escapeHtml } from './MarkdownRenderer.js';

/**
 * Centralized Internationalization Coordinator for In-Page Banner DOM
 * Synchronizes all text nodes, buttons, dropdowns, empty states, and footers.
 */
export class BannerI18n {
  /**
   * Applies localized strings to all banner elements
   * @param {string} lang
   * @param {Object} state
   * @param {Object} [summaryViewController]
   * @param {Object} [chatViewController]
   * @param {boolean} [isExpanded=false]
   */
  static applyLanguage(lang, state, summaryViewController = null, chatViewController = null, isExpanded = false) {
    if (state) state.currentLang = lang;
    const t = I18N[lang] || I18N.en;

    // Header Language Select
    const langSelect = document.getElementById('ytAiLangSelect');
    if (langSelect) {
      langSelect.title = t.langLabel || 'Language:';
      if (langSelect.value !== lang) langSelect.value = lang;
    }

    // Header Format Select
    const modeSelect = document.getElementById('ytAiModeSelect');
    if (modeSelect) {
      modeSelect.title = t.formatLabel || 'Format:';
      const optQuick = modeSelect.querySelector('option[value="quick"]');
      if (optQuick) optQuick.textContent = t.formatQuick || '⚡ Quick';
      const optStandard = modeSelect.querySelector('option[value="standard"]');
      if (optStandard) optStandard.textContent = t.formatStandard || '📌 Standard';
      const optDetailed = modeSelect.querySelector('option[value="detailed"]');
      if (optDetailed) optDetailed.textContent = t.formatDetailed || '📝 Deep';
    }

    // Header Brand & Action Controls
    const brandTitle = document.getElementById('ytAiBrandTitle');
    if (brandTitle) brandTitle.textContent = t.brandName || 'YT Summarizer AI';

    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    if (summarizeBtn) {
      if (summaryViewController?.isGenerating) {
        summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Generating summary...'}`;
      } else {
        summarizeBtn.textContent = t.summarizeBtn || '✨ Summarize video';
      }
    }

    const toggleText = document.getElementById('ytAiToggleText');
    if (toggleText) toggleText.textContent = isExpanded ? t.collapse : t.expand;
    const toggleIcon = document.getElementById('ytAiToggleIcon');
    if (toggleIcon) toggleIcon.textContent = isExpanded ? '▲' : '▾';

    const settingsBtnText = document.getElementById('ytAiSettingsBtnText');
    if (settingsBtnText) settingsBtnText.textContent = t.settingsBtn || 'Settings';

    // Tabs Navigation
    const tabSummaryBtn = document.getElementById('ytAiTabSummaryBtn');
    if (tabSummaryBtn) tabSummaryBtn.textContent = t.tabSummary || '📝 AI Summary';

    const tabChatBtn = document.getElementById('ytAiTabChatBtn');
    if (tabChatBtn) {
      const count = document.getElementById('ytAiChatCount')?.textContent || '0';
      tabChatBtn.innerHTML = `${escapeHtml(t.tabChat || '💬 Ask a question')} <span id="ytAiChatCount" class="yt-ai-tab-count-badge">${escapeHtml(count)}</span>`;
    }

    const tabTranscriptBtn = document.getElementById('ytAiTabTranscriptBtn');
    if (tabTranscriptBtn) {
      const rawCount = (document.getElementById('ytAiWordCount')?.textContent || '0').trim();
      tabTranscriptBtn.innerHTML = `${escapeHtml(t.tabTranscript || '📜 Transcript')} <span id="ytAiWordCountTab" class="yt-ai-tab-count-badge">${escapeHtml(rawCount)} ${escapeHtml(t.wordsBadge || 'words')}</span>`;
    }

    // Settings Drawer Localization
    SettingsDrawerI18n.applyLanguage(lang);

    // Tab Panes & Footer
    BannerI18n.applySummaryLanguage(t, state, summaryViewController);
    BannerI18n.applyChatLanguage(t, state, chatViewController);
    BannerI18n.applyTranscriptAndFooter(t);
  }

  static applySummaryLanguage(t, state, summaryViewController) {
    const title = document.getElementById('ytAiSummaryHeaderTitle');
    if (title) title.textContent = t.summaryTitle || '📝 AI Summary';
    const speakBtn = document.getElementById('ytAiSpeakSummaryBtn');
    if (speakBtn) speakBtn.textContent = t.listenBtn || '🔊 Listen';
    const copyBtn = document.getElementById('ytAiCopyBtn');
    if (copyBtn) copyBtn.textContent = t.copyBtn || '📋 Copy';
    const dlBtn = document.getElementById('ytAiDownloadBtn');
    if (dlBtn) dlBtn.textContent = t.saveMdBtn || '💾 .md';
    const saveTxtBtn = document.getElementById('ytAiSaveTxtBtn');
    if (saveTxtBtn) saveTxtBtn.textContent = t.saveTxtBtn || '📄 .txt';
    const saveJsonBtn = document.getElementById('ytAiSaveJsonBtn');
    if (saveJsonBtn) saveJsonBtn.textContent = t.saveJsonBtn || '📦 .json';

    // Live state and empty/loading/error translation
    if (typeof summaryViewController?.applyLanguage === 'function') {
      summaryViewController.applyLanguage(state?.currentLang || 'en');
    } else {
      const emptyTitle = document.querySelector('#ytAiSummaryBody .yt-ai-empty-title');
      const emptySubtitle = document.querySelector('#ytAiSummaryBody .yt-ai-empty-subtitle');
      const heroBtn = document.getElementById('ytAiSummaryHeroBtn');
      if (emptyTitle) emptyTitle.textContent = t.newVideoTitle || t.emptyTitle || 'Nouvelle vidéo détectée';
      if (emptySubtitle) emptySubtitle.textContent = t.newVideoPlaceholder || t.emptySubtitle || '';
      if (heroBtn) heroBtn.textContent = t.summarizeBtn || '✨ Summarize video';
    }

    const placeholderP = document.querySelector('#ytAiSummaryBody > p');
    if (placeholderP && !document.querySelector('#ytAiSummaryBody .yt-ai-empty-title')) {
      placeholderP.textContent = t.summaryPlaceholder || 'Click "✨ Summarize video" to generate the summary.';
    }

    const hasError = !!document.getElementById('ytAiRetrySummarizeBtn');
    if (!hasError && summaryViewController && !summaryViewController.fullSummaryMarkdown && !summaryViewController.isGenerating) {
      summaryViewController.renderSummaryEmptyState(true, state?.currentLang || 'en');
    }
  }

  static applyChatLanguage(t, state, chatViewController) {
    const sugBox = document.querySelector?.('.yt-ai-chat-suggestions');
    if (sugBox && Array.isArray(t.suggestions) && t.suggestions.length > 0) {
      sugBox.innerHTML = t.suggestions.map(s =>
        `<span class="yt-ai-suggestion-chip" data-question="${(s.question || '').replace(/"/g, '&quot;')}">${escapeHtml(s.label)}</span>`
      ).join('');
    }
    const input = document.getElementById('ytAiChatInput');
    if (input) input.placeholder = t.chatPlaceholder || 'Ask a question...';
    const sendBtn = document.getElementById('ytAiSendChatBtn');
    if (sendBtn) sendBtn.textContent = t.sendBtn || 'Send ➤';
    const clearBtn = document.getElementById('ytAiClearChatBtn');
    if (clearBtn) clearBtn.textContent = t.clearChatBtn || '🗑️ Clear';
    const chatTitle = document.querySelector?.('#ytAiPaneChat .yt-ai-pane-title span');
    if (chatTitle) chatTitle.textContent = t.chatTitle || '💬 Video Q&A';
    const micBtn = document.getElementById('ytAiMicBtn');
    if (micBtn) micBtn.title = t.micTitle || 'Dictate question';
    if (typeof chatViewController?.applyLanguage === 'function') chatViewController.applyLanguage(state?.currentLang || 'en');
  }

  static applyTranscriptAndFooter(t) {
    const copyRawBtn = document.getElementById('ytAiCopyTranscriptBtn');
    if (copyRawBtn) copyRawBtn.textContent = t.copyRawBtn || '📋 Copy raw';
    const body = document.getElementById('ytAiTranscriptBody');
    if (body && (body.querySelector('.yt-ai-loading') || body.textContent.includes('...'))) {
      body.innerHTML = `<div class="yt-ai-loading">${escapeHtml(t.transcriptWaiting || 'Waiting...')}</div>`;
    }

    // Dynamic Footer Author & Links translation
    const footerAuthor = document.getElementById('ytAiFooterAuthor');
    if (footerAuthor) {
      const extVer = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) ? `v${chrome.runtime.getManifest().version}` : 'v1.4.0';
      footerAuthor.innerHTML = `YouTube Summarizer AI <strong>${extVer}</strong> ${escapeHtml(t.footerBy || 'by')} <a href="https://github.com/Hidr4c" target="_blank" rel="noopener">@Hidr4c</a>`;
    }
    const bugLink = document.getElementById('ytAiFooterBugLink');
    if (bugLink) bugLink.textContent = `🐛 ${t.footerReportBug || 'Report a bug'}`;
    const docsLink = document.getElementById('ytAiFooterDocsLink');
    if (docsLink) docsLink.textContent = `📖 ${t.footerDocs || 'Documentation'}`;
  }
}

export default BannerI18n;
