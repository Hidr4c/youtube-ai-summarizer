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
    const t = I18N[lang] || I18N.en;

    const tabModel = document.getElementById('ytAiTabSettingsModelBtn');
    if (tabModel) tabModel.textContent = t.tabSettingsModel || '🤖 AI Model & Server';
    const tabParams = document.getElementById('ytAiTabSettingsParamsBtn');
    if (tabParams) tabParams.textContent = t.tabSettingsParams || '⚙️ Parameters & Prompt';
    const tabAudio = document.getElementById('ytAiTabSettingsAudioBtn');
    if (tabAudio) tabAudio.textContent = t.tabSettingsAudio || '🎙️ Voice & Audio';
    const closeBtn = document.getElementById('ytAiSettingsCloseBtn');
    if (closeBtn) closeBtn.title = t.settingsHideBtn || 'Close Settings';

    // Provider & Cloud / Local Settings
    const providerLabel = document.getElementById('ytAiProviderLabel');
    if (providerLabel) providerLabel.textContent = t.providerLabel || 'AI Provider:';
    const serverLabel = document.getElementById('ytAiServerLabel');
    if (serverLabel) serverLabel.textContent = t.serverLabel || 'Server:';
    const apiKeyLabel = document.getElementById('ytAiApiKeyLabel');
    if (apiKeyLabel) apiKeyLabel.textContent = t.apiKeyLabel || 'API Key:';
    const apiKeyInput = document.getElementById('ytAiApiKeyInput');
    if (apiKeyInput) apiKeyInput.placeholder = t.apiKeyPlaceholder || 'Paste your API key...';
    const modelLabel = document.getElementById('ytAiModelLabel');
    if (modelLabel) modelLabel.textContent = t.modelLabel || 'Model:';
    const testModelBtn = document.getElementById('ytAiTestModelBtn');
    if (testModelBtn) testModelBtn.textContent = t.testModelBtn || '⚡ Test';

    // Parameters Subpane
    const tempLabel = document.getElementById('ytAiTempLabel');
    if (tempLabel) tempLabel.textContent = t.tempLabel || 'AI Creativity (Temperature):';
    const tempSelect = document.getElementById('ytAiTemperatureSelect');
    if (tempSelect) {
      const opt0 = tempSelect.querySelector('option[value="0.0"]');
      if (opt0) opt0.textContent = t.tempStrict || '0.0 - Strict & Precise';
      const opt3 = tempSelect.querySelector('option[value="0.3"]');
      if (opt3) opt3.textContent = t.tempBalanced || '0.3 - Balanced (Default)';
      const opt7 = tempSelect.querySelector('option[value="0.7"]');
      if (opt7) opt7.textContent = t.tempCreative || '0.7 - Creative & Detailed';
      const opt1 = tempSelect.querySelector('option[value="1.0"]');
      if (opt1) opt1.textContent = t.tempWild || '1.0 - Highly Inventive';
    }

    const maxTokensLabel = document.getElementById('ytAiMaxTokensLabel');
    if (maxTokensLabel) maxTokensLabel.textContent = t.maxTokensLabel || 'Max Length (Tokens):';
    const tokensSelect = document.getElementById('ytAiMaxTokensSelect');
    if (tokensSelect) {
      const optAuto = tokensSelect.querySelector('option[value="auto"]');
      if (optAuto) optAuto.textContent = t.tokensAuto || 'Automatic (Default)';
      const opt1k = tokensSelect.querySelector('option[value="1024"]');
      if (opt1k) opt1k.textContent = t.tokensShort || 'Short (1,024)';
      const opt2k = tokensSelect.querySelector('option[value="2048"]');
      if (opt2k) opt2k.textContent = t.tokensStandard || 'Standard (2,048)';
      const opt4k = tokensSelect.querySelector('option[value="4096"]');
      if (opt4k) opt4k.textContent = t.tokensDetailed || 'Detailed (4,096)';
      const opt8k = tokensSelect.querySelector('option[value="8192"]');
      if (opt8k) opt8k.textContent = t.tokensMax || 'Maximum (8,192)';
    }

    const autoSummarizeLabel = document.getElementById('ytAiAutoSummarizeLabel');
    if (autoSummarizeLabel) autoSummarizeLabel.textContent = t.autoSummarizeLabel || 'Auto-summarize';
    const customPromptLabel = document.getElementById('ytAiCustomPromptLabel');
    if (customPromptLabel) customPromptLabel.textContent = t.customPromptLabel || 'Custom AI Instructions:';
    const customPromptInput = document.getElementById('ytAiCustomPromptInput');
    if (customPromptInput) customPromptInput.placeholder = t.customPromptPlaceholder || 'e.g. Focus on technical details...';

    // Voice & Audio Subpane
    const voiceLabel = document.getElementById('ytAiVoiceLabel');
    if (voiceLabel) voiceLabel.textContent = t.voiceSelectLabel || 'Voice:';
    const ttsSpeedLabel = document.getElementById('ytAiTtsSpeedLabel');
    if (ttsSpeedLabel) ttsSpeedLabel.textContent = t.ttsSpeedLabel || 'Voice Speed:';
    const testSpeechBtn = document.getElementById('ytAiTestSpeechBtn');
    if (testSpeechBtn) testSpeechBtn.textContent = t.testTtsBtn || '🔊 Test Voice';
    const whisperUrlLabel = document.getElementById('ytAiWhisperUrlLabel');
    if (whisperUrlLabel) whisperUrlLabel.textContent = t.whisperUrlLabel || 'Local Whisper Server:';
    const whisperUrlInput = document.getElementById('ytAiWhisperUrlInput');
    if (whisperUrlInput) whisperUrlInput.placeholder = t.whisperUrlPlaceholder || 'e.g. http://localhost:8000/...';
    const testWhisperBtn = document.getElementById('ytAiTestWhisperBtn');
    if (testWhisperBtn) testWhisperBtn.textContent = t.testSttBtn || '⚡ Test STT';
  }
}

export default SettingsDrawerI18n;
