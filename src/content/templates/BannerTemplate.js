import { SettingsDrawerTemplate } from './SettingsDrawerTemplate.js';
import { renderChannelMaxOptionsHtml } from '../../config/ExtensionConstants.js';
import { renderBrandLogoSvg, renderLangOptionsHtml, renderExtensionFooterHtml, getExtensionVersionTag, EXTENSION_BRAND_TITLE } from './BannerHeaderParts.js';

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
    const version = getExtensionVersionTag(options.version);
    const currentMode = options.currentMode || 'standard';
    const currentLang = options.currentLang || 'fr';
    const isFr = currentLang.startsWith('fr');
    const suggestionsHtml = (Array.isArray(t.suggestions) && t.suggestions.length > 0)
      ? t.suggestions.map(s => `<span class="yt-ai-suggestion-chip" data-question="${(s.question || '').replace(/"/g, '&quot;')}">${s.label}</span>`).join('')
      : `<span class="yt-ai-suggestion-chip" data-question="What are the core key takeaways from this video?">💡 Key takeaways</span><span class="yt-ai-suggestion-chip" data-question="At what point in the video is the main topic discussed?">⏱️ Timestamps</span><span class="yt-ai-suggestion-chip" data-question="What specific figures, examples, or arguments are presented?">📊 Data & Figures</span><span class="yt-ai-suggestion-chip" data-question="What is the author's final conclusion or actionable advice?">🎯 Conclusion & Advice</span>`;

    return `
      <!-- BARRE SUPÉRIEURE ULTRA-MINIMALISTE -->
      <div class="yt-ai-header-bar">
        <div class="yt-ai-header-left">
          <div class="yt-ai-brand" id="ytAiBrandToggle" title="Click to toggle panel">
            ${renderBrandLogoSvg()}
            <span id="ytAiBrandTitle">${t.brandName || EXTENSION_BRAND_TITLE}</span>
          </div>
        </div>

        <div class="yt-ai-header-center">
          <div class="yt-ai-action-cluster">
            <!-- SÉLECTEUR DE FORMAT DU RÉSUMÉ -->
            <div class="yt-ai-header-select-wrapper yt-ai-header-mode-wrapper">
              <select id="ytAiModeSelect" class="yt-ai-select yt-ai-header-mode-select" title="${t.formatLabel || 'Format:'}">
                <option value="quick" ${currentMode === 'quick' ? 'selected' : ''}>${t.formatQuick || '⚡ Quick'}</option>
                <option value="standard" ${currentMode === 'standard' || !currentMode ? 'selected' : ''}>${t.formatStandard || '📌 Standard'}</option>
                <option value="detailed" ${currentMode === 'detailed' ? 'selected' : ''}>${t.formatDetailed || '📝 Deep'}</option>
              </select>
            </div>

            <!-- SÉLECTEUR DE LANGUE -->
            <div class="yt-ai-header-select-wrapper yt-ai-header-lang-wrapper">
              <select id="ytAiLangSelect" class="yt-ai-select yt-ai-header-lang-select" title="${t.langLabel || 'Language:'}">
                ${renderLangOptionsHtml(currentLang)}
              </select>
            </div>

            <!-- BOUTON D'ACTION PRINCIPAL -->
            <button id="ytAiSummarizeBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-summarize-cta">
              ${t.summarizeBtn || '✨ Summarize video'}
            </button>
            <button id="ytAiStopSummaryBtn" type="button" class="yt-ai-btn yt-ai-btn-stop yt-ai-hidden" title="${t.stopListenBtn || '⏹️ Stop'}">
              ${t.stopListenBtn || '⏹️ Stop'}
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

        <!-- NAVIGATION PAR ONGLETS (SYNTHÈSE / AUDIT VIDÉO / AUDIT CHAÎNE / CHAT / TRANSCRIPTION) -->
        <div class="yt-ai-tabs-nav">
          <button id="ytAiTabSummaryBtn" class="yt-ai-tab-btn active" data-tab="summary">
            ${t.tabSummary || '📝 AI Summary'}
          </button>
          <button id="ytAiTabAuditBtn" class="yt-ai-tab-btn" data-tab="audit">
            ${t.tabAudit || '🛡️ Audit & Fact-Check'}
          </button>
          <button id="ytAiTabChannelAuditBtn" class="yt-ai-tab-btn" data-tab="channelAudit">
            ${t.tabChannelAudit || t.subtabAuditChannel || '📊 Channel Audit'}
          </button>
          <button id="ytAiTabChatBtn" class="yt-ai-tab-btn" data-tab="chat">
            ${t.tabChat || '💬 Ask questions'} <span id="ytAiChatCount" class="yt-ai-tab-count-badge">0</span>
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
              <summary><span id="ytAiReasoningTitle">${t.reasoningModel || '💭 Model Reasoning'}</span> (<span id="ytAiReasoningStatus">${t.reasoningInProgress || 'in progress...'}</span>)</summary>
              <div id="ytAiReasoningText" class="yt-ai-reasoning-body"></div>
            </details>

            <div id="ytAiSummaryBody" class="yt-ai-markdown">
              <p class="yt-ai-placeholder-text" style="color: var(--yt-ai-text-muted); font-style: italic;">${t.summaryPlaceholder || 'Click "✨ Summarize video" to generate the summary.'}</p>
            </div>
          </div>
        </div>

        <!-- ONGLET 2 : AUDIT & FACT-CHECKING DE LA VIDÉO -->
        <div id="ytAiPaneAudit" class="yt-ai-tab-pane">
          <div class="yt-ai-summary-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span id="ytAiAuditHeaderTitle">${t.auditTitle || '🛡️ Critical Logic & Fact-Checking Audit'}</span>
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap;">
                <button id="ytAiRunAuditBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 4px 12px; font-size: 11px;">${t.runAuditBtn || '⚡ Run Audit'}</button>
                <button id="ytAiCopyAuditBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-hidden" style="padding: 4px 10px; font-size: 11px;">${t.copyBtn || '📋 Copy'}</button>
              </div>
            </div>

            <div id="ytAiAuditStatus" class="yt-ai-reasoning yt-ai-hidden"></div>
            <div id="ytAiAuditProgressContainer" class="yt-ai-hidden"></div>

            <div id="ytAiAuditBody" class="yt-ai-markdown">
              <p class="yt-ai-placeholder-text" style="color: var(--yt-ai-text-muted); font-style: italic;">${t.auditPlaceholder || 'Click "⚡ Run Audit" to examine logical rigor, fallacies, and empirical sources.'}</p>
            </div>
          </div>
        </div>

        <!-- ONGLET 3 : AUDIT COMPLET DE LA CHAÎNE DU CRÉATEUR -->
        <div id="ytAiPaneChannelAudit" class="yt-ai-tab-pane">
          <div class="yt-ai-summary-pane" style="max-height: 520px; overflow-y: auto;">
            <div class="yt-ai-pane-title">
              <div>
                <span id="ytAiWatchChannelTitle" style="font-weight: 700;">${t.channelAuditTitle || '📊 Global Channel Audit'}</span>
                <span id="ytAiWatchChannelHandle" class="yt-ai-card-handle" style="margin-left: 8px; font-size: 12px; color: var(--yt-ai-text-secondary);"></span>
              </div>
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap;">
                <button id="ytAiRunWatchChannelAuditBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 4px 12px; font-size: 11px;">${t.runChannelAuditBtn || '⚡ Run Channel Audit'}</button>
              </div>
            </div>

            <div class="yt-ai-period-selector" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
              <span class="yt-ai-period-label" style="font-size: 11px; color: var(--yt-ai-text-muted); font-weight: 600;">
                ${t.periodFilterLabel || 'Analyzed period:'}
              </span>
              <button class="yt-ai-period-pill yt-ai-format-pill active" data-period="all">🌐 ${t.periodAll || 'All history'}</button>
              <button class="yt-ai-period-pill yt-ai-format-pill" data-period="year">📅 ${t.periodYear || 'Current year'}</button>
              <button class="yt-ai-period-pill yt-ai-format-pill" data-period="6months">🎯 ${t.period6Months || 'Last 6 months'}</button>
              <button class="yt-ai-period-pill yt-ai-format-pill" data-period="month">⚡ ${t.periodMonth || 'Last month'}</button>

              <span class="yt-ai-max-label" style="margin-left: 10px; font-size: 11px; color: var(--yt-ai-text-muted); font-weight: 600;">${t.maxVideosLabel || 'Max Limit:'}</span>
              <select id="ytAiWatchChannelMaxVideos" class="yt-ai-select" style="padding: 2px 6px; font-size: 11px; height: 26px;">
                ${renderChannelMaxOptionsHtml(options.maxVideos, isFr, options.channelTotalVideos)}
              </select>
            </div>

            <div id="ytAiWatchChannelProgress" class="yt-ai-progress-box yt-ai-hidden" style="margin-bottom: 12px;"></div>
            <div id="ytAiWatchChannelResultContainer" class="yt-ai-result-box">
              <p class="yt-ai-placeholder-text" style="color: var(--yt-ai-text-muted); font-style: italic;">${t.channelAuditPlaceholder || 'Click "⚡ Run Channel Audit" above to evaluate this channel.'}</p>
            </div>
          </div>
        </div>

        <!-- ONGLET 4 : CHAT BOX INTERACTIVE (POSER DES QUESTIONS) -->
        <div id="ytAiPaneChat" class="yt-ai-tab-pane">
          <div class="yt-ai-chat-pane">
            <div class="yt-ai-pane-title">
              <span>${t.chatTitle || '💬 Video Q&A'}</span>
              <button id="ytAiClearChatBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.clearChatBtn || '🗑️ Clear conversation'}</button>
            </div>

            <div class="yt-ai-chat-container">
              <!-- Suggestions rapides -->
              <div class="yt-ai-chat-suggestions">
                ${suggestionsHtml}
              </div>

              <!-- Messages échangés -->
              <div id="ytAiChatMessages" class="yt-ai-chat-messages">
                <div class="yt-ai-chat-bubble ai">
                  ${t.chatWelcome || 'Hello! Ask me any question about the content of this video.'}
                </div>
              </div>

              <!-- Ligne de saisie avec bouton micro -->
              <div class="yt-ai-chat-input-row">
                <textarea id="ytAiChatInput" class="yt-ai-chat-input" rows="1" placeholder="${t.chatPlaceholder || 'Ask a question or dictate with mic...'}"></textarea>
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

        <!-- ONGLET 5 : TRANSCRIPTION BRUTE -->
        <div id="ytAiPaneTranscript" class="yt-ai-tab-pane">
          <div class="yt-ai-transcript-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span><span id="ytAiTranscriptHeaderTitle">${t.transcriptTitle || '📜 Full Transcript'}</span> (<span id="ytAiWordCount">0</span> <span id="ytAiTranscriptWordsLabel">${t.wordsBadge || 'words'}</span>)</span>
              <button id="ytAiCopyTranscriptBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.copyRawBtn || '📋 Copy raw'}</button>
            </div>
            <div id="ytAiTranscriptBody" class="yt-ai-transcript-text">
              <span class="yt-ai-placeholder-text yt-ai-loading">${t.transcriptWaiting || 'Waiting for transcript...'}</span>
            </div>
          </div>
        </div>

        <!-- PIED DE PAGE AVEC LIENS GITHUB ET AIDE -->
        ${renderExtensionFooterHtml(t, 'ytAiFooter', version)}

      </div>
    `;
  }
}

export default BannerTemplate;
