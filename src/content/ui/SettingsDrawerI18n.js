import { I18N } from '../../locales/index.js';

/**
 * Utility for localizing Settings Drawer elements dynamically on language switch
 */
export class SettingsDrawerI18n {
  /**
   * Applies localized labels, placeholders, and tooltips to Settings Drawer DOM
   * @param {string} lang
   */
  static applyLanguage(lang) {
    if (typeof document === 'undefined') return;
    const fb = I18N.en;
    const t = I18N[lang] || fb;

    const tabModel = document.getElementById('ytAiTabSettingsModelBtn');
    if (tabModel) tabModel.textContent = t.tabSettingsModel || fb.tabSettingsModel;
    const tabParams = document.getElementById('ytAiTabSettingsParamsBtn');
    if (tabParams) tabParams.textContent = t.tabSettingsParams || fb.tabSettingsParams;
    const tabAudio = document.getElementById('ytAiTabSettingsAudioBtn');
    if (tabAudio) tabAudio.textContent = t.tabSettingsAudio || fb.tabSettingsAudio;
    const closeBtn = document.getElementById('ytAiSettingsCloseBtn');
    if (closeBtn) closeBtn.title = t.settingsHideBtn || fb.settingsHideBtn;

    // Provider & Cloud / Local Settings
    const providerLabel = document.getElementById('ytAiProviderLabel');
    if (providerLabel) providerLabel.textContent = t.providerLabel || fb.providerLabel;
    const ogLocal = document.getElementById('ytAiOptGroupLocal');
    if (ogLocal) {
      const val = t.groupLocal || fb.groupLocal;
      ogLocal.label = val;
      ogLocal.setAttribute?.('label', val);
    }
    const ogFast = document.getElementById('ytAiOptGroupFast');
    if (ogFast) {
      const val = t.groupFast || fb.groupFast;
      ogFast.label = val;
      ogFast.setAttribute?.('label', val);
    }
    const ogCloud = document.getElementById('ytAiOptGroupCloud');
    if (ogCloud) {
      const val = t.groupCloud || fb.groupCloud;
      ogCloud.label = val;
      ogCloud.setAttribute?.('label', val);
    }

    const serverLabel = document.getElementById('ytAiServerLabel');
    if (serverLabel) serverLabel.textContent = t.serverLabel || fb.serverLabel;
    const customServerOpt = document.querySelector('#ytAiServerSelect option[value="custom"]');
    if (customServerOpt) customServerOpt.textContent = t.customServer || fb.customServer;
    const refreshBtn = document.getElementById('ytAiRefreshModelsBtn');
    if (refreshBtn) refreshBtn.title = t.refreshTooltip || fb.refreshTooltip;
    const refreshCloudBtn = document.getElementById('ytAiRefreshCloudModelsBtn');
    if (refreshCloudBtn) refreshCloudBtn.title = t.refreshTooltip || fb.refreshTooltip;
    const toggleKeyBtn = document.getElementById('ytAiToggleKeyVisBtn');
    if (toggleKeyBtn) toggleKeyBtn.title = t.toggleKeyVisTooltip || fb.toggleKeyVisTooltip;

    const apiKeyLabel = document.getElementById('ytAiApiKeyLabel');
    if (apiKeyLabel) apiKeyLabel.textContent = t.apiKeyLabel || fb.apiKeyLabel;
    const apiKeyInput = document.getElementById('ytAiApiKeyInput');
    if (apiKeyInput) apiKeyInput.placeholder = t.apiKeyPlaceholder || fb.apiKeyPlaceholder;
    const pasteBtn = document.getElementById('ytAiPasteApiKeyBtn');
    if (pasteBtn) {
      pasteBtn.textContent = `📋 ${t.pasteBtn || fb.pasteBtn}`;
      pasteBtn.title = t.pasteTooltip || fb.pasteTooltip;
    }
    const getKeyLink = document.getElementById('ytAiGetApiKeyLink');
    if (getKeyLink) getKeyLink.textContent = t.getApiKeyLink || fb.getApiKeyLink;

    const modelLabel = document.getElementById('ytAiModelLabel');
    if (modelLabel) modelLabel.textContent = t.modelLabel || fb.modelLabel;
    const emptyModelOpt = document.querySelector('#ytAiModelSelect option[value=""]');
    if (emptyModelOpt) emptyModelOpt.textContent = t.modelLoading || fb.modelLoading;
    const testModelBtn = document.getElementById('ytAiTestModelBtn');
    if (testModelBtn) {
      testModelBtn.textContent = t.testModelBtn || fb.testModelBtn;
      testModelBtn.title = t.testModelTooltip || fb.testModelTooltip;
    }

    // Parameters Subpane
    const langLabel = document.getElementById('ytAiLangLabel');
    if (langLabel) langLabel.textContent = t.langLabel || fb.langLabel;

    const tempLabel = document.getElementById('ytAiTempLabel');
    if (tempLabel) tempLabel.textContent = t.tempLabel || fb.tempLabel;
    const tempSelect = document.getElementById('ytAiTemperatureSelect');
    if (tempSelect) {
      const tempOpts = [
        ['0.0', t.tempStrict || fb.tempStrict],
        ['0.3', t.tempBalanced || fb.tempBalanced],
        ['0.7', t.tempCreative || fb.tempCreative],
        ['1.0', t.tempWild || fb.tempWild]
      ];
      tempOpts.forEach(([val, label]) => {
        const opt = tempSelect.querySelector(`option[value="${val}"]`);
        if (opt) opt.textContent = label;
      });
    }

    const maxTokensLabel = document.getElementById('ytAiMaxTokensLabel');
    if (maxTokensLabel) maxTokensLabel.textContent = t.maxTokensLabel || fb.maxTokensLabel;
    const tokensSelect = document.getElementById('ytAiMaxTokensSelect');
    if (tokensSelect) {
      const tokenOpts = [
        ['auto', t.tokensAuto || fb.tokensAuto],
        ['1024', t.tokensShort || fb.tokensShort],
        ['2048', t.tokensStandard || fb.tokensStandard],
        ['4096', t.tokensDetailed || fb.tokensDetailed],
        ['8192', t.tokensMax || fb.tokensMax]
      ];
      tokenOpts.forEach(([val, label]) => {
        const opt = tokensSelect.querySelector(`option[value="${val}"]`);
        if (opt) opt.textContent = label;
      });
    }

    const ctxLabel = document.getElementById('ytAiLocalContextLabel');
    if (ctxLabel) ctxLabel.textContent = t.localContextLabel || fb.localContextLabel;
    const ctxValEl = document.getElementById('ytAiLocalContextValue');
    const ctxSliderEl = document.getElementById('ytAiLocalContextSlider');
    const ctxNumEl = document.getElementById('ytAiLocalContextInput');
    if (ctxValEl) {
      const roReason = ctxContainerReason();
      if (roReason) {
        ctxValEl.textContent = SettingsDrawerI18n.formatReadOnlyContextLabel(roReason, lang);
      } else {
        const currentRaw = ctxSliderEl?.value ?? ctxNumEl?.value ?? '0';
        const defaultProv = ctxSliderEl?.getAttribute?.('data-server-default') || '';
        ctxValEl.textContent = SettingsDrawerI18n.formatLocalContextValue(currentRaw, lang, defaultProv, Boolean(defaultProv));
      }
    }
    function ctxContainerReason() {
      return document.getElementById('ytAiLocalContextContainer')?.getAttribute?.('data-readonly-reason') || '';
    }
    const applyCtxBtn = document.getElementById('ytAiApplyContextBtn');
    if (applyCtxBtn) {
      applyCtxBtn.textContent = t.applyContextBtn || fb.applyContextBtn;
      applyCtxBtn.title = t.applyContextTooltip || fb.applyContextTooltip;
    }

    const autoSummarizeLabel = document.getElementById('ytAiAutoSummarizeLabel');
    if (autoSummarizeLabel) autoSummarizeLabel.textContent = t.autoSummarizeLabel || fb.autoSummarizeLabel;
    const customPromptLabel = document.getElementById('ytAiCustomPromptLabel');
    if (customPromptLabel) customPromptLabel.textContent = t.customPromptLabel || fb.customPromptLabel;
    const customPromptInput = document.getElementById('ytAiCustomPromptInput');
    if (customPromptInput) customPromptInput.placeholder = t.customPromptPlaceholder || fb.customPromptPlaceholder;

    // Voice & Audio Subpane
    const voiceLabel = document.getElementById('ytAiVoiceLabel');
    if (voiceLabel) voiceLabel.textContent = t.voiceLabel || fb.voiceLabel;
    const defaultVoiceOpt = document.querySelector('#ytAiVoiceSelect option[value=""]');
    if (defaultVoiceOpt) defaultVoiceOpt.textContent = t.voiceDefault || fb.voiceDefault;

    const ttsSpeedLabel = document.getElementById('ytAiTtsSpeedLabel');
    if (ttsSpeedLabel) ttsSpeedLabel.textContent = t.ttsSpeedLabel || fb.ttsSpeedLabel;
    const speedSelect = document.getElementById('ytAiTtsSpeedSelect');
    if (speedSelect) {
      const speedOpts = [
        ['0.75', t.speedSlow || fb.speedSlow],
        ['1.0', t.speedNormal || fb.speedNormal],
        ['1.25', t.speedFast || fb.speedFast],
        ['1.5', t.speedVeryFast || fb.speedVeryFast],
        ['2.0', t.speedDouble || fb.speedDouble]
      ];
      speedOpts.forEach(([val, label]) => {
        const opt = speedSelect.querySelector(`option[value="${val}"]`);
        if (opt) opt.textContent = label;
      });
    }

    const micLabel = document.getElementById('ytAiMicLabel');
    if (micLabel) micLabel.textContent = t.micLabel || fb.micLabel;
    const defaultMicOpt = document.querySelector('#ytAiMicSelect option[value=""]');
    if (defaultMicOpt) defaultMicOpt.textContent = t.micDefault || fb.micDefault;

    const whisperUrlLabel = document.getElementById('ytAiWhisperUrlLabel');
    if (whisperUrlLabel) whisperUrlLabel.textContent = t.whisperUrlLabel || fb.whisperUrlLabel;
    const whisperUrlInput = document.getElementById('ytAiWhisperUrlInput');
    if (whisperUrlInput) whisperUrlInput.placeholder = t.whisperUrlPlaceholder || fb.whisperUrlPlaceholder;
    const testWhisperBtn = document.getElementById('ytAiTestWhisperBtn');
    if (testWhisperBtn) testWhisperBtn.textContent = t.testSttBtn || fb.testSttBtn;
  }

  /**
   * Formats numeric, server-default, or 'auto' context window size cleanly for slider readout.
   * @param {string|number|null} rawValue
   * @param {string} [lang='en']
   * @param {string} [provider='lmstudio']
   * @param {boolean} [isServerDefault=false]
   * @returns {string}
   */
  static formatLocalContextValue(rawValue, lang = 'en', provider = 'lmstudio', isServerDefault = false) {
    const t = I18N[lang] || I18N.en;
    const num = parseInt(String(rawValue ?? '0'), 10);
    if (!Number.isFinite(num) || num <= 0 || rawValue === 'auto') {
      return t.ctxAuto || I18N.en.ctxAuto;
    }
    const clamped = Math.min(Math.max(num, 0), 1048576);
    const formatted = clamped.toLocaleString(lang?.startsWith('fr') ? 'fr-FR' : 'en-US').replace(/[\u00a0\u202f]/g, ' ');
    const baseText = clamped >= 1048576 ? `${formatted} tokens (1M)` : `${formatted} tokens`;
    if (!isServerDefault) return baseText;
    const provLabel = provider === 'ollama' ? 'Ollama' : 'LM Studio';
    return (t.ctxServerDefault || '{ctx} tokens ({provider} Default)')
      .replace('{ctx}', formatted)
      .replace('{provider}', provLabel);
  }

  static formatReadOnlyContextLabel(reason = 'cloud', lang = 'en') {
    const t = I18N[lang] || I18N.en;
    if (reason === 'server') return t.ctxFixedServer || I18N.en.ctxFixedServer;
    return t.ctxFixedCloud || I18N.en.ctxFixedCloud;
  }

  /**
   * Keeps Context Window visible but disables/greys out controls for non-modifiable models.
   * @param {string} provider
   * @param {Object} [opts]
   */
  static syncLocalContextVisibility(provider, opts = {}) {
    if (typeof document === 'undefined') return;
    const isLocalProv = provider === 'lmstudio' || provider === 'ollama';
    const modelStr = String(opts.model || '').trim();
    const isCloudOllama = provider === 'ollama' && (/(?:^|[:\-])cloud$/i.test(modelStr) || /ollama\.com/i.test(String(opts.serverUrl || '')));
    const canModify = isLocalProv && !isCloudOllama && opts.canModifyContext !== false;
    const reason = canModify ? '' : ((!isLocalProv || isCloudOllama) ? 'cloud' : (opts.readOnlyReason || 'server'));
    const container = document.getElementById('ytAiLocalContextContainer');
    const slider = document.getElementById('ytAiLocalContextSlider');
    const input = document.getElementById('ytAiLocalContextInput');
    const applyBtn = document.getElementById('ytAiApplyContextBtn');
    const valEl = document.getElementById('ytAiLocalContextValue');

    container?.classList?.remove('yt-ai-hidden');
    container?.classList?.toggle('yt-ai-setting-disabled', !canModify);
    container?.setAttribute?.('data-readonly-reason', reason);
    if (slider) slider.disabled = !canModify;
    if (input) input.disabled = !canModify;
    if (applyBtn) applyBtn.disabled = !canModify;
    if (!canModify && valEl) {
      if (slider) slider.value = '0';
      if (input) input.value = '0';
      valEl.textContent = SettingsDrawerI18n.formatReadOnlyContextLabel(reason, opts.lang || 'en');
    }
  }
}

export default SettingsDrawerI18n;
