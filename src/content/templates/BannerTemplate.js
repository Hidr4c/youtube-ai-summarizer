import { SettingsDrawerTemplate } from './SettingsDrawerTemplate.js';

/**
 * Main In-Page Summarizer Banner HTML Template
 */
export class BannerTemplate {
  /**
   * Generates the entire in-page banner HTML string
   * @param {Object} t - Localization dictionary
   * @param {Object} [options]
   * @returns {string}
   */
  static render(t, options = {}) {
    const drawerHtml = SettingsDrawerTemplate.render(t, options);
    const version = options.version || 'v1.3.2';

    return `
      <!-- BARRE SUPÉRIEURE ULTRA-MINIMALISTE -->
      <div class="yt-ai-header-bar">
        <div class="yt-ai-header-left">
          <div class="yt-ai-brand" id="ytAiBrandToggle" title="Click to toggle panel">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" fill="#FF0000"/>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#FFFFFF"/>
            </svg>
            <span id="ytAiBrandTitle">${t.brandName || 'YT Summarizer AI'}</span>
          </div>
        </div>

        <div class="yt-ai-header-center">
          <div class="yt-ai-action-cluster">
            <div class="yt-ai-header-lang-wrapper">
              <select id="ytAiLangSelect" class="yt-ai-select yt-ai-header-lang-select" title="${t.langLabel || 'Language:'}">
                <option value="fr" selected>🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="it">🇮🇹 Italiano</option>
                <option value="ru">🇷🇺 Русский</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>

            <!-- BOUTON D'ACTION PRINCIPAL -->
            <button id="ytAiSummarizeBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-summarize-cta">
              ${t.summarizeBtn || '✨ Summarize video'}
            </button>
          </div>
        </div>

        <div class="yt-ai-header-right">
          <button id="ytAiSettingsToggleBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-settings-toggle-btn" title="${t.settingsBtn || 'Settings'}">
            <span class="yt-ai-settings-icon">⚙️</span>
            <span id="ytAiSettingsBtnText">${t.settingsBtn || 'Settings'}</span>
          </button>

          <button id="ytAiToggleBtn" class="yt-ai-toggle-btn" title="${t.expand || 'Expand'}">
            <span id="ytAiToggleText">${t.expand || 'Expand'}</span>
            <span id="ytAiToggleIcon">▾</span>
          </button>
        </div>
      </div>

      <!-- CONTENU DÉPLIABLE -->
      <div class="yt-ai-expanded-content">
        ${drawerHtml}

        <!-- BANNIÈRE DE STATUT / MESSAGES INFORMATIFS -->
        <div id="ytAiStatusBanner" class="yt-ai-reasoning yt-ai-hidden"></div>

        <!-- NAVIGATION PAR ONGLETS (SYNTHÈSE / CHAT / TRANSCRIPTION) -->
        <div class="yt-ai-tabs-nav">
          <button id="ytAiTabSummaryBtn" class="yt-ai-tab-btn active" data-tab="summary">
            ${t.tabSummary || '📝 AI Summary'}
          </button>
          <button id="ytAiTabChatBtn" class="yt-ai-tab-btn" data-tab="chat">
            ${t.tabChat || '💬 Ask a question'} <span id="ytAiChatCount" class="yt-ai-tab-count-badge">0</span>
          </button>
          <button id="ytAiTabTranscriptBtn" class="yt-ai-tab-btn" data-tab="transcript">
            ${t.tabTranscript || '📜 Transcript'} <span id="ytAiWordCountTab" class="yt-ai-tab-count-badge">0 ${t.wordsBadge || 'words'}</span>
          </button>
        </div>

        <!-- ONGLET 1 : SYNTHÈSE IA -->
        <div id="ytAiPaneSummary" class="yt-ai-tab-pane active">
          <div class="yt-ai-summary-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span id="ytAiSummaryHeaderTitle">${t.summaryTitle || '📝 AI Summary'}</span>
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap;">
                <button id="ytAiSpeakSummaryBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.listenBtn || '🔊 Listen'}</button>
                <button id="ytAiCopyBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.copyBtn || '📋 Copy'}</button>
                <button id="ytAiDownloadBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.saveMdBtn || '💾 .md'}</button>
                <button id="ytAiSaveTxtBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.saveTxtBtn || '📄 .txt'}</button>
                <button id="ytAiSaveJsonBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.saveJsonBtn || '📦 .json'}</button>
              </div>
            </div>

            <!-- Réflexion Thinking (DeepSeek R1 / o3-mini / Qwen Thinking) -->
            <details id="ytAiReasoningBox" class="yt-ai-reasoning yt-ai-hidden">
              <summary>${t.reasoningModel || '💭 Model Reasoning'} (<span id="ytAiReasoningStatus">${t.reasoningInProgress || 'in progress...'}</span>)</summary>
              <div id="ytAiReasoningText" class="yt-ai-reasoning-body"></div>
            </details>

            <div id="ytAiSummaryBody" class="yt-ai-markdown">
              <p style="color: #8b949e; font-style: italic;">${t.summaryPlaceholder || 'Click "✨ Summarize video" to generate the summary.'}</p>
            </div>
          </div>
        </div>

        <!-- ONGLET 2 : CHAT BOX INTERACTIVE -->
        <div id="ytAiPaneChat" class="yt-ai-tab-pane">
          <div class="yt-ai-chat-pane">
            <div class="yt-ai-pane-title">
              <span>${t.chatTitle || '💬 Video Q&A'}</span>
              <button id="ytAiClearChatBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.clearChatBtn || '🗑️ Clear conversation'}</button>
            </div>

            <div class="yt-ai-chat-container">
              <!-- Suggestions rapides -->
              <div class="yt-ai-chat-suggestions">
                <span class="yt-ai-suggestion-chip" data-question="What are the core key takeaways from this video?">💡 Key takeaways</span>
                <span class="yt-ai-suggestion-chip" data-question="At what point in the video is the main topic discussed?">⏱️ Timestamps</span>
                <span class="yt-ai-suggestion-chip" data-question="What specific figures, examples, or arguments are presented?">📊 Data & Figures</span>
                <span class="yt-ai-suggestion-chip" data-question="What is the author's final conclusion or actionable advice?">🎯 Conclusion & Advice</span>
              </div>

              <!-- Messages échangés -->
              <div id="ytAiChatMessages" class="yt-ai-chat-messages">
                <div class="yt-ai-chat-bubble ai">
                  ${t.chatWelcome || 'Hello! Ask me any question about the content of this video.'}
                </div>
              </div>

              <!-- Ligne de saisie avec bouton micro -->
              <div class="yt-ai-chat-input-row">
                <input type="text" id="ytAiChatInput" class="yt-ai-chat-input" placeholder="${t.chatPlaceholder || 'Ask a question or dictate with mic...'}">
                <button id="ytAiMicBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-mic-btn" title="${t.micTitle || 'Dictate your question with microphone'}">
                  <span class="yt-ai-mic-icon">🎤</span>
                </button>
                <button id="ytAiSendChatBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 7px 16px;">
                  ${t.sendBtn || 'Send ➤'}
                </button>
              </div>
              <div id="ytAiMicNotice" class="yt-ai-mic-notice yt-ai-hidden"></div>
            </div>
          </div>
        </div>

        <!-- ONGLET 3 : TRANSCRIPTION BRUTE -->
        <div id="ytAiPaneTranscript" class="yt-ai-tab-pane">
          <div class="yt-ai-transcript-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span>${t.transcriptTitle || '📜 Full Transcript'} (<span id="ytAiWordCount">0</span> ${t.wordsBadge || 'words'})</span>
              <button id="ytAiCopyTranscriptBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.copyRawBtn || '📋 Copy raw'}</button>
            </div>
            <div id="ytAiTranscriptBody" class="yt-ai-transcript-text">
              ${t.transcriptWaiting || 'Waiting for transcript...'}
            </div>
          </div>
        </div>

        <!-- PIED DE PAGE AVEC LIENS GITHUB ET AIDE -->
        <div class="yt-ai-footer-info">
          <span id="ytAiFooterAuthor">YouTube Summarizer AI <strong>${version}</strong> ${t.footerBy || 'by'} <a href="https://github.com/Hidr4c" target="_blank" rel="noopener">@Hidr4c</a></span>
          <span>•</span>
          <a href="https://github.com/Hidr4c/youtube-ai-summarizer" target="_blank" rel="noopener">⭐ GitHub</a>
          <span>•</span>
          <a id="ytAiFooterBugLink" href="https://github.com/Hidr4c/youtube-ai-summarizer/issues" target="_blank" rel="noopener">🐛 ${t.footerReportBug || 'Report a bug'}</a>
          <span>•</span>
          <a id="ytAiFooterDocsLink" href="https://github.com/Hidr4c/youtube-ai-summarizer#readme" target="_blank" rel="noopener">📖 ${t.footerDocs || 'Documentation'}</a>
        </div>

      </div>
    `;
  }
}

export default BannerTemplate;
