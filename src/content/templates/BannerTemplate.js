import { SettingsDrawerTemplate } from './SettingsDrawerTemplate.js';
import { renderChannelMaxOptionsHtml } from '../../config/ExtensionConstants.js';
import { renderBrandLogoSvg, renderModeOptionsHtml, renderExportDropdownHtml, renderExtensionFooterHtml, getExtensionVersionTag, EXTENSION_BRAND_TITLE } from './BannerHeaderParts.js';

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
    const currentAuditMode = options.auditMode || 'standard';
    const currentChannelAuditMode = options.channelAuditMode || 'standard';
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
          <div class="yt-ai-header-tabs" role="tablist">
            <button id="ytAiTabSummaryBtn" class="yt-ai-tab-btn active" data-tab="summary" role="tab">
              ${t.tabSummary || '📄 Video Summary'}
            </button>
            <button id="ytAiTabAuditBtn" class="yt-ai-tab-btn" data-tab="audit" role="tab">
              ${t.tabAudit || '🛡️ Audit & Fact-Check'}
            </button>
            <button id="ytAiTabChannelAuditBtn" class="yt-ai-tab-btn" data-tab="channelAudit" role="tab">
              ${t.tabChannelAudit || t.subtabAuditChannel || '📊 Channel Audit'}
            </button>
            <button id="ytAiTabChatBtn" class="yt-ai-tab-btn" data-tab="chat" role="tab">
              ${t.tabChat || '💬 Ask questions'} <span id="ytAiChatCount" class="yt-ai-tab-count-badge">0</span>
            </button>
            <button id="ytAiTabTranscriptBtn" class="yt-ai-tab-btn" data-tab="transcript" role="tab">
              ${t.tabTranscript || '📜 Transcript'} <span id="ytAiWordCountTab" class="yt-ai-tab-count-badge">0 ${t.wordsBadge || 'words'}</span>
            </button>
          </div>
        </div>

        <div class="yt-ai-header-right">
          <button id="ytAiSettingsToggleBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-settings-toggle-btn" title="${t.settingsBtn || 'Settings'}">
            <span class="yt-ai-settings-icon">⚙️</span>
            <span id="ytAiSettingsBtnText">${t.settingsBtn || 'Settings'}</span>
          </button>

          <button id="ytAiToggleBtn" class="yt-ai-icon-square-btn yt-ai-toggle-btn yt-ai-square-toggle" title="${t.expand || 'Expand'}" aria-label="${t.expand || 'Expand'}">
            <span id="ytAiToggleIcon" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
          </button>
          <button id="ytAiCloseExtensionBtn" class="yt-ai-icon-square-btn yt-ai-close-ext-btn" title="${t.closeExtensionBtn || 'Disable extension (re-enable from popup)'}" aria-label="${t.closeExtensionBtn || 'Disable extension'}">
            <span aria-hidden="true"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
          </button>
        </div>
      </div>

      <!-- CONTENU DÉPLIABLE -->
      <div class="yt-ai-expanded-content">
        ${drawerHtml}

        <!-- BANNIÈRE DE STATUT / MESSAGES INFORMATIFS -->
        <div id="ytAiStatusBanner" class="yt-ai-reasoning yt-ai-hidden"></div>
        <!-- LECTEUR AUDIO ACCESSIBLE (PAUSE / REPRISE / CURSEUR / DÉBUT / STOP) -->
        <div id="ytAiSpeechPlayerBar" class="yt-ai-speech-bar yt-ai-hidden"></div>

        <!-- ONGLET 1 : SYNTHÈSE IA -->
        <div id="ytAiPaneSummary" class="yt-ai-tab-pane active">
          <div class="yt-ai-summary-pane" style="max-height: none; overflow: visible;">
            <div class="yt-ai-pane-title">
              <span id="ytAiSummaryHeaderTitle">${t.summaryTitle || '📄 Video Summary'}</span>
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                <select id="ytAiModeSelect" class="yt-ai-select yt-ai-pane-mode-select" title="${t.formatLabel || 'Format:'}">
                  ${renderModeOptionsHtml(t, currentMode)}
                </select>
                <button id="ytAiSummarizeBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-summarize-cta" style="padding: 4px 12px; font-size: 11px;">
                  ${t.summarizeBtn || '✨ Summarize video'}
                </button>
                <button id="ytAiStopSummaryBtn" type="button" class="yt-ai-btn yt-ai-btn-stop yt-ai-hidden" style="padding: 4px 10px; font-size: 11px;" title="${t.stopListenBtn || '⏹️ Stop'}">
                  ${t.stopListenBtn || '⏹️ Stop'}
                </button>
                <button id="ytAiSpeakSummaryBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.listenBtn || '🔊 Listen'}</button>
                <button id="ytAiCopyBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-copy-btn" style="padding: 3px 8px; font-size: 11px;">${t.copyBtn || '📋 Copy'}</button>
                ${renderExportDropdownHtml(t, 'ytAi')}
              </div>
            </div>

            <!-- Réflexion Thinking (DeepSeek R1 / o3-mini / Qwen Thinking) -->
            <details id="ytAiReasoningBox" class="yt-ai-reasoning yt-ai-hidden">
              <summary><span id="ytAiReasoningTitle">${t.reasoningModel || '💭 Model Reasoning'}</span> (<span id="ytAiReasoningStatus">${t.reasoningInProgress || 'in progress...'}</span>)</summary>
              <div id="ytAiReasoningText" class="yt-ai-reasoning-body"></div>
            </details>

            <div id="ytAiSummaryBody" class="yt-ai-markdown" style="max-height: 430px; overflow-y: auto; padding-right: 4px;">
              <p class="yt-ai-placeholder-text" style="color: var(--yt-ai-text-muted); font-style: italic;">${t.summaryPlaceholder || 'Click "✨ Summarize video" to generate the summary.'}</p>
            </div>
          </div>
        </div>

        <!-- ONGLET 2 : AUDIT & FACT-CHECKING DE LA VIDÉO -->
        <div id="ytAiPaneAudit" class="yt-ai-tab-pane">
          <div class="yt-ai-summary-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span id="ytAiAuditHeaderTitle">${t.auditTitle || '🛡️ Critical Logic & Fact-Checking Audit'}</span>
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                <select id="ytAiAuditModeSelect" class="yt-ai-select yt-ai-pane-mode-select" title="${t.formatLabel || 'Format:'}">
                  ${renderModeOptionsHtml(t, currentAuditMode)}
                </select>
                <button id="ytAiRunAuditBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 4px 12px; font-size: 11px;">${t.runAuditBtn || '⚡ Run Audit'}</button>
                <button id="ytAiCopyAuditBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-copy-btn" style="padding: 3px 8px; font-size: 11px;">${t.copyBtn || '📋 Copy'}</button>
                ${renderExportDropdownHtml(t, 'ytAiAudit')}
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
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                <select id="ytAiChannelAuditModeSelect" class="yt-ai-select yt-ai-pane-mode-select" title="${t.formatLabel || 'Format:'}">
                  ${renderModeOptionsHtml(t, currentChannelAuditMode)}
                </select>
                <button id="ytAiRunWatchChannelAuditBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 4px 12px; font-size: 11px;">${t.runChannelAuditBtn || '⚡ Run Channel Audit'}</button>
                <button id="ytAiCopyChannelAuditBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-copy-btn" style="padding: 3px 8px; font-size: 11px;">${t.copyBtn || '📋 Copy'}</button>
                ${renderExportDropdownHtml(t, 'ytAiChannelAudit')}
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
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <button id="ytAiDescribeAccessibleBtn" type="button" class="yt-ai-btn yt-ai-btn-secondary yt-ai-accessible-btn" style="padding: 3px 8px; font-size: 11px;" title="${t.describeAccessibleTitle || 'Describe this page aloud for blind or low-vision users'}" aria-label="${t.describeAccessibleTitle || 'Describe this page aloud for blind or low-vision users'}">${t.describeAccessibleBtn || '👁️ Describe (Low-Vision)'}</button>
                <button id="ytAiClearChatBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">${t.clearChatBtn || '🗑️ Clear conversation'}</button>
              </div>
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

              <!-- File d'attente des messages enchaînés -->
              <div id="ytAiChatQueue" class="yt-ai-chat-queue yt-ai-hidden"></div>

              <!-- Pièces jointes en attente -->
              <div id="ytAiChatAttachments" class="yt-ai-chat-attachments yt-ai-hidden"></div>

              <!-- Ligne de saisie avec pièces jointes et bouton micro -->
              <div class="yt-ai-chat-input-row">
                <input id="ytAiAttachInput" type="file" multiple accept="image/*,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.yaml,.yml,.log,.js,.ts,.tsx,.jsx,.py,.rs,.go,.java,.c,.cpp,.h,.html,.css,.sql,.srt,.vtt" class="yt-ai-hidden">
                <button id="ytAiAttachBtn" type="button" class="yt-ai-btn yt-ai-btn-secondary yt-ai-attach-btn" title="${t.attachTitle || 'Attach image or file (or paste Ctrl+V)'}">
                  <span>📎</span>
                </button>
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
