import { I18N } from '../../locales/index.js';
import { escapeHtml } from './MarkdownRenderer.js';
import { SettingsDrawerI18n } from './SettingsDrawerI18n.js';
import { syncChannelMaxSelectElement } from '../../config/ExtensionConstants.js';
import { applyFooterLanguage, EXTENSION_BRAND_TITLE } from '../templates/BannerHeaderParts.js';
import { PaneExportHelper } from './PaneExportHelper.js';

/**
 * In-Place Internationalization Coordinator for the Channel Companion Card.
 * Updates all chrome labels, tabs, filters, chat controls, settings drawer, and footer
 * instantly without destroying active progress widgets or AI-generated content.
 */
export class ChannelCompanionI18n {
  /**
   * Synchronizes every UI string inside the Channel Companion DOM node.
   * @param {string} lang
   * @param {Object} card ChannelCompanionCard instance
   */
  static applyLanguage(lang, card) {
    const resolvedLang = lang || card?.state?.currentLang || 'en';
    if (card?.state) card.state.currentLang = resolvedLang;
    const t = I18N[resolvedLang] || I18N.en;
    const isFr = resolvedLang.startsWith('fr');

    const root = document.getElementById('yt-ai-channel-companion');
    if (!root) return;

    // Header brand, language selector & primary audit CTA
    const brandTitle = root.querySelector('#ytAiCompBrandTitle') || document.getElementById('ytAiCompBrandTitle');
    if (brandTitle) brandTitle.textContent = t.brandName || EXTENSION_BRAND_TITLE;
    const brandWrap = root.querySelector('#ytAiBrandToggle') || document.getElementById('ytAiBrandToggle');
    if (brandWrap) brandWrap.title = t.brandName || EXTENSION_BRAND_TITLE;

    const langSelect = root.querySelector('#ytAiLangSelect') || root.querySelector('#ytAiCompLangSelect') || document.getElementById('ytAiLangSelect');
    if (langSelect) {
      langSelect.title = t.langLabel || 'Language:';
      if (langSelect.value !== resolvedLang) langSelect.value = resolvedLang;
    }

    const modeSelect = root.querySelector('#ytAiChannelAuditModeSelect') || document.getElementById('ytAiChannelAuditModeSelect');
    if (modeSelect) {
      modeSelect.title = t.formatLabel || 'Format:';
      const optQuick = modeSelect.querySelector('option[value="quick"]');
      if (optQuick) optQuick.textContent = t.formatQuick || '⚡ Quick';
      const optStandard = modeSelect.querySelector('option[value="standard"]');
      if (optStandard) optStandard.textContent = t.formatStandard || '📌 Standard';
      const optDetailed = modeSelect.querySelector('option[value="detailed"]');
      if (optDetailed) optDetailed.textContent = t.formatDetailed || '📝 Deep';
    }
    PaneExportHelper.localizeControls(root, t);

    const isRunning = !!(card?.currentChannel && card?.service?.isAuditRunning?.(card.currentChannel));
    const runBtn = root.querySelector('#ytAiRunChannelAuditBtn') || document.getElementById('ytAiRunChannelAuditBtn');
    if (runBtn) {
      runBtn.textContent = isRunning
        ? (t.stopAuditBtn || '⏹ Stop Audit')
        : (t.runChannelAuditBtn || '⚡ Run Channel Audit');
    }

    // Settings & Expand/Collapse controls
    const settingsBtn = root.querySelector('#ytAiCompanionSettingsBtn') || document.getElementById('ytAiCompanionSettingsBtn');
    if (settingsBtn) settingsBtn.title = t.settingsBtn || 'Settings';
    const settingsText = root.querySelector('#ytAiCompSettingsBtnText') || document.getElementById('ytAiCompSettingsBtnText');
    if (settingsText) settingsText.textContent = t.settingsBtn || 'Settings';

    const toggleBtn = root.querySelector('#ytAiCompanionToggleBtn') || document.getElementById('ytAiCompanionToggleBtn');
    const toggleText = root.querySelector('#ytAiCompToggleText') || document.getElementById('ytAiCompToggleText');
    const toggleIcon = root.querySelector('#ytAiCompToggleIcon') || document.getElementById('ytAiCompToggleIcon');
    const expanded = card ? !!card.isExpanded : true;
    const toggleLabel = expanded ? (t.collapse || 'Collapse') : (t.expand || 'Expand');
    if (toggleBtn) toggleBtn.title = toggleLabel;
    if (toggleText) toggleText.textContent = toggleLabel;
    if (toggleIcon) toggleIcon.textContent = expanded ? '▲' : '▾';

    // Settings drawer chrome
    SettingsDrawerI18n.applyLanguage(resolvedLang);

    // Channel tabs (preserve Q&A badge count)
    const tabAuditBtn = root.querySelector('#ytAiChanTabAuditBtn') || document.getElementById('ytAiChanTabAuditBtn');
    if (tabAuditBtn) tabAuditBtn.textContent = t.tabChannelAudit || '📊 Channel Audit';

    const tabChatBtn = root.querySelector('#ytAiChanTabChatBtn') || document.getElementById('ytAiChanTabChatBtn');
    if (tabChatBtn) {
      const count = (root.querySelector('#ytAiChannelChatCount') || document.getElementById('ytAiChannelChatCount'))?.textContent || '0';
      tabChatBtn.innerHTML = `${escapeHtml(t.tabChat || '💬 Ask questions')} <span id="ytAiChannelChatCount" class="yt-ai-tab-count-badge">${escapeHtml(count)}</span>`;
    }

    // Channel Audit pane controls
    const descEl = root.querySelector('#ytAiCompDesc') || document.getElementById('ytAiCompDesc');
    if (descEl) descEl.textContent = t.channelCompanionDesc || '';

    const periodLabel = root.querySelector('.yt-ai-period-label');
    if (periodLabel) periodLabel.textContent = t.periodFilterLabel || 'Analyzed period:';

    const periodMap = {
      all: `🌐 ${t.periodAll || 'All history'}`,
      year: `📅 ${t.periodYear || 'Current year'}`,
      '6months': `🎯 ${t.period6Months || 'Last 6 months'}`,
      month: `⚡ ${t.periodMonth || 'Last month'}`
    };
    root.querySelectorAll('.yt-ai-period-pill').forEach((pill) => {
      const key = pill.getAttribute?.('data-period');
      if (key && periodMap[key]) pill.textContent = periodMap[key];
    });

    const maxLabel = root.querySelector('.yt-ai-max-label');
    if (maxLabel) maxLabel.textContent = t.maxVideosLabel || 'Max Limit:';

    const maxSelect = root.querySelector('#ytAiCompanionMaxVideos') || document.getElementById('ytAiCompanionMaxVideos');
    if (maxSelect) {
      syncChannelMaxSelectElement(maxSelect, maxSelect.value || card?.state?.channelAuditMaxVideos || 30, isFr, card?.knownTotalVideos || null);
    }

    const progStop = root.querySelector('#ytAiChannelProgress .yt-ai-progress-stop');
    if (progStop) progStop.textContent = t.stopShortBtn || 'Stop';

    // Re-localize rendered channel audit report UI chrome while keeping AI bullets verbatim
    const resultBox = root.querySelector('#ytAiChannelResultContainer') || document.getElementById('ytAiChannelResultContainer');
    if (resultBox && !isRunning && card?.viewController?.lastReport && !resultBox.classList?.contains('yt-ai-hidden')) {
      const hasReportDom = !!resultBox.querySelector?.('.yt-ai-channel-audit-wrapper');
      if (hasReportDom) {
        card.viewController.renderReport(card.viewController.lastReport, resultBox, resolvedLang);
      }
    }

    // Channel Q&A pane controls (keep conversation history intact)
    ChannelCompanionI18n.applyChatLanguage(t, root, card?.channelChat);

    // Attribution & GitHub footer
    applyFooterLanguage(t, 'ytAiCompFooter');
  }

  /**
   * Translates Channel Q&A chrome without wiping active conversation bubbles.
   */
  static applyChatLanguage(t, root, channelChat = null) {
    const sugBox = root.querySelector('.yt-ai-chat-suggestions');
    const suggestions = Array.isArray(t.channelChatSuggestions) ? t.channelChatSuggestions : [];
    if (sugBox && suggestions.length > 0) {
      sugBox.innerHTML = suggestions.map((s) => (
        `<button type="button" class="yt-ai-suggestion-chip yt-ai-channel-suggestion-chip" data-question="${escapeHtml(s.question)}">${escapeHtml(s.label)}</button>`
      )).join('');
    }

    const historyLen = channelChat?.chatHistory?.length || 0;
    if (historyLen === 0) {
      const welcome = root.querySelector('.yt-ai-welcome-bubble');
      if (welcome) welcome.textContent = t.channelChatWelcome || '';
    }

    const input = root.querySelector('#ytAiChannelChatInput') || document.getElementById('ytAiChannelChatInput');
    if (input) input.placeholder = t.channelChatPlaceholder || '';
    const micBtn = root.querySelector('#ytAiChannelMicBtn') || document.getElementById('ytAiChannelMicBtn');
    if (micBtn) micBtn.title = t.micTitle || 'Microphone';
    const sendBtn = root.querySelector('#ytAiChannelSendChatBtn') || document.getElementById('ytAiChannelSendChatBtn');
    if (sendBtn) sendBtn.textContent = t.sendBtn || 'Send ➤';
    const clearBtn = root.querySelector('#ytAiChannelClearChatBtn') || document.getElementById('ytAiChannelClearChatBtn');
    if (clearBtn) clearBtn.title = t.clearChatBtn || 'Clear';
  }
}

export default ChannelCompanionI18n;
