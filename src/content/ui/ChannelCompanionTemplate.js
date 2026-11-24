import { escapeHtml } from './MarkdownRenderer.js';
import { I18N } from '../../locales/index.js';
import { renderChannelMaxOptionsHtml } from '../../config/ExtensionConstants.js';
import {
  renderBrandLogoSvg,
  renderModeOptionsHtml,
  renderExportDropdownHtml,
  renderExtensionFooterHtml,
  getExtensionVersionTag,
  EXTENSION_BRAND_TITLE
} from '../templates/BannerHeaderParts.js';

/**
 * HTML Template Renderer for Channel Companion Card (@handle, /channel/, /c/).
 * Exposes ONLY channel-scoped tabs (Channel Audit + Channel Q&A).
 */
export class ChannelCompanionTemplate {
  /**
   * Generates the inner HTML of the Channel Companion Card
   * @param {Object} options
   * @param {string} options.channelIdentifier
   * @param {boolean} options.isFr
   * @param {string} [options.lang]
   * @param {number|string} [options.maxVideos=30]
   * @param {number|null} [options.totalVideos=null]
   * @param {boolean} [options.isExpanded=true]
   * @param {string} [options.drawerHtml='']
   * @param {string} [options.version]
   * @returns {string}
   */
  static render({ channelIdentifier, isFr, lang = null, maxVideos = 30, totalVideos = null, isExpanded = false, channelAuditMode = 'standard', drawerHtml = '', version = '' }) {
    const resolvedLang = lang || (isFr ? 'fr' : 'en');
    const t = I18N[resolvedLang] || (isFr ? I18N.fr : I18N.en) || I18N.en;
    const extVer = getExtensionVersionTag(version);
    const handleSafe = escapeHtml(channelIdentifier);
    const maxOptsHtml = renderChannelMaxOptionsHtml(maxVideos, resolvedLang.startsWith('fr'), totalVideos);
    const suggestions = Array.isArray(t.channelChatSuggestions) ? t.channelChatSuggestions : [];
    const suggestionChipsHtml = suggestions.map((s) => (
      `<button type="button" class="yt-ai-suggestion-chip yt-ai-channel-suggestion-chip" data-question="${escapeHtml(s.question)}">${escapeHtml(s.label)}</button>`
    )).join('');
    const toggleLabel = isExpanded ? (t.collapse || 'Collapse') : (t.expand || 'Expand');
    const toggleIcon = isExpanded ? '▲' : '▾';

    return `
      <div class="yt-ai-card-inner">
        <div class="yt-ai-header-bar">
          <div class="yt-ai-header-left">
            <div class="yt-ai-brand" id="ytAiBrandToggle" title="${t.brandName || EXTENSION_BRAND_TITLE}">
              ${renderBrandLogoSvg()}
              <span id="ytAiCompBrandTitle">${t.brandName || EXTENSION_BRAND_TITLE}</span>
            </div>
            <span class="yt-ai-card-handle">${handleSafe}</span>
          </div>

          <div class="yt-ai-header-center">
            <div class="yt-ai-header-tabs" role="tablist">
              <button type="button" id="ytAiChanTabAuditBtn" class="yt-ai-tab-btn active" data-tab="channelAudit" role="tab">
                ${t.tabChannelAudit || '📊 Channel Audit'}
              </button>
              <button type="button" id="ytAiChanTabChatBtn" class="yt-ai-tab-btn" data-tab="channelChat" role="tab">
                ${t.tabChat || '💬 Ask questions'} <span id="ytAiChannelChatCount" class="yt-ai-tab-count-badge">0</span>
              </button>
            </div>
          </div>

          <div class="yt-ai-header-right">
            <button id="ytAiCompanionSettingsBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-settings-toggle-btn" title="${t.settingsBtn || 'Settings'}">
              <span class="yt-ai-settings-icon">⚙️</span>
              <span id="ytAiCompSettingsBtnText">${t.settingsBtn || 'Settings'}</span>
            </button>
            <button id="ytAiCompanionToggleBtn" class="yt-ai-toggle-btn" title="${toggleLabel}">
              <span id="ytAiCompToggleText">${toggleLabel}</span>
              <span id="ytAiCompToggleIcon">${toggleIcon}</span>
            </button>
          </div>
        </div>

        ${drawerHtml}

        <div id="ytAiCompanionStatusBanner" class="yt-ai-reasoning yt-ai-hidden" style="margin: 0 16px;"></div>

        <div id="ytAiCompanionBody" class="yt-ai-card-body" style="padding: 12px 20px 14px 20px; background: var(--yt-ai-bg-expanded); border-bottom: 1px solid var(--yt-ai-border-subtle);">
          <div id="ytAiChanPaneAudit" class="yt-ai-tab-pane active">
            <div class="yt-ai-summary-pane" style="max-height: 520px; overflow-y: auto;">
              <div class="yt-ai-pane-title">
                <span style="font-weight: 700;">${t.channelAuditTitle || '📊 Global Channel Audit'}</span>
                <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                  <select id="ytAiChannelAuditModeSelect" class="yt-ai-select yt-ai-pane-mode-select" title="${t.formatLabel || 'Format:'}">
                    ${renderModeOptionsHtml(t, channelAuditMode)}
                  </select>
                  <button id="ytAiRunChannelAuditBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-summarize-cta" style="padding: 4px 12px; font-size: 11px;">
                    ${t.runChannelAuditBtn || '⚡ Run Channel Audit'}
                  </button>
                  <button id="ytAiCopyCompanionAuditBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-copy-btn" style="padding: 3px 8px; font-size: 11px;">${t.copyBtn || '📋 Copy'}</button>
                  ${renderExportDropdownHtml(t, 'ytAiCompanionAudit')}
                </div>
              </div>
              <div class="yt-ai-onboarding-box" style="padding: 0; text-align: left;">
                <p id="ytAiCompDesc" class="yt-ai-onboarding-desc" style="font-size: 12.5px; color: var(--yt-ai-text-secondary); margin: 0 0 10px 0; line-height: 1.5; max-width: 750px;">
                  ${t.channelCompanionDesc || ''}
                </p>

              <div class="yt-ai-period-selector" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span class="yt-ai-period-label" style="font-size: 11px; color: var(--yt-ai-text-muted); font-weight: 600;">
                  ${t.periodFilterLabel || 'Analyzed period:'}
                </span>
                <button class="yt-ai-period-pill yt-ai-format-pill active" data-period="all">🌐 ${t.periodAll || 'All history'}</button>
                <button class="yt-ai-period-pill yt-ai-format-pill" data-period="year">📅 ${t.periodYear || 'Current year'}</button>
                <button class="yt-ai-period-pill yt-ai-format-pill" data-period="6months">🎯 ${t.period6Months || 'Last 6 months'}</button>
                <button class="yt-ai-period-pill yt-ai-format-pill" data-period="month">⚡ ${t.periodMonth || 'Last month'}</button>

                <span class="yt-ai-max-label" style="margin-left: 10px; font-size: 11px; color: var(--yt-ai-text-muted); font-weight: 600;">${t.maxVideosLabel || 'Max Limit:'}</span>
                <select id="ytAiCompanionMaxVideos" class="yt-ai-select" style="padding: 2px 6px; font-size: 11px; height: 26px;">
                  ${maxOptsHtml}
                </select>
              </div>

              <div id="ytAiChannelProgress" class="yt-ai-progress-box yt-ai-hidden" style="margin-top: 14px;"></div>
              </div>

              <div id="ytAiChannelResultContainer" class="yt-ai-result-box yt-ai-hidden" style="margin-top: 14px;"></div>
            </div>
          </div>

          <div id="ytAiChanPaneChat" class="yt-ai-tab-pane">
            <div class="yt-ai-chat-pane">
              <div class="yt-ai-chat-container">
                ${suggestionChipsHtml ? `<div class="yt-ai-chat-suggestions">${suggestionChipsHtml}</div>` : ''}
                <div id="ytAiChannelChatMessages" class="yt-ai-chat-messages">
                  <div class="yt-ai-chat-bubble ai yt-ai-markdown yt-ai-welcome-bubble">${t.channelChatWelcome || ''}</div>
                </div>
                <div id="ytAiChannelChatQueue" class="yt-ai-chat-queue yt-ai-hidden"></div>
                <div class="yt-ai-chat-input-row">
                  <textarea id="ytAiChannelChatInput" class="yt-ai-chat-input" rows="1" placeholder="${escapeHtml(t.channelChatPlaceholder || '')}"></textarea>
                  <button type="button" id="ytAiChannelMicBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-mic-btn" title="${escapeHtml(t.micTitle || 'Microphone')}"><span class="yt-ai-mic-icon">🎤</span></button>
                  <button type="button" id="ytAiChannelSendChatBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 7px 16px;">${t.sendBtn || 'Send ➤'}</button>
                  <button type="button" id="ytAiChannelClearChatBtn" class="yt-ai-btn yt-ai-btn-secondary" title="${escapeHtml(t.clearChatBtn || 'Clear')}">🗑️</button>
                </div>
              </div>
            </div>
          </div>

          ${renderExtensionFooterHtml(t, 'ytAiCompFooter', extVer)}
        </div>
      </div>
    `;
  }
}

export default ChannelCompanionTemplate;
