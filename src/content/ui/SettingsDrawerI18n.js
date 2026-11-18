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
}

export default SettingsDrawerI18n;
