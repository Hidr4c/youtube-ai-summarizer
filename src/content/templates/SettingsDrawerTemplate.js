/**
 * Settings Drawer HTML Template
 * Renders the 3 modern subtabs: Model & Server, Parameters & Prompt, Voice & Audio
 */
export class SettingsDrawerTemplate {
  /**
   * Generates Settings Drawer HTML string
   * @param {Object} t - Localization dictionary
   * @param {Object} [options]
   * @returns {string}
   */
  static render(t, options = {}) {
    const initialOptionHtml = options.initialOptionHtml || '<option value="">Loading...</option>';
    const initialModelLabel = options.initialModelLabel || 'Model: Loading...';

    return `
      <div id="ytAiSettingsDrawer" class="yt-ai-settings-drawer yt-ai-hidden">
        <div class="yt-ai-settings-card">
          <div class="yt-ai-settings-header">
            <div class="yt-ai-settings-tabs-nav">
              <button class="yt-ai-settings-tab-btn active" data-subtab="model" id="ytAiTabSettingsModelBtn">
                ${t.tabSettingsModel || '🤖 AI Model & Server'}
              </button>
              <button class="yt-ai-settings-tab-btn" data-subtab="params" id="ytAiTabSettingsParamsBtn">
                ${t.tabSettingsParams || '⚙️ Parameters & Prompt'}
              </button>
              <button class="yt-ai-settings-tab-btn" data-subtab="audio" id="ytAiTabSettingsAudioBtn">
                ${t.tabSettingsAudio || '🎙️ Voice & Audio'}
              </button>
            </div>
            <button id="ytAiSettingsCloseBtn" class="yt-ai-btn-icon-close" title="${t.settingsHideBtn || 'Close Settings'}">✕</button>
          </div>

          <div class="yt-ai-settings-body">
            <!-- SOUS-ONGLET 1 : MODÈLE ET SERVEUR -->
            <div id="ytAiSettingsSubpaneModel" class="yt-ai-settings-subpane active">
              <div class="yt-ai-settings-status-row">
                <div id="ytAiBadge" class="yt-ai-badge" title="AI Status">
                  <span class="yt-ai-badge-dot"></span>
                  <span id="ytAiBadgeText">${t.checking || 'Checking...'}</span>
                </div>
                <div class="yt-ai-model-pill" id="ytAiHeaderModelPill" style="cursor: default;" title="Active model">
                  <span class="yt-ai-model-icon">🤖</span>
                  <span id="ytAiHeaderModelText">${initialModelLabel}</span>
                </div>
              </div>

              <div class="yt-ai-settings-grid">
                <div class="yt-ai-setting-item">
                  <label id="ytAiProviderLabel">${t.providerLabel || 'AI Provider:'}</label>
                  <select id="ytAiProviderSelect" class="yt-ai-select" style="font-weight: 600;">
                    <optgroup label="${t.groupLocal || '🏠 Local Models (Free & Private)'}">
                      <option value="lmstudio">🏠 LM Studio</option>
                      <option value="ollama">🦙 Ollama (Local / Cloud)</option>
                    </optgroup>
                    <optgroup label="${t.groupFast || '⚡ Fast / Free Cloud Inference'}">
                      <option value="gemini">🔵 Google Gemini (1M ctx, free)</option>
                      <option value="groq">⚡ Groq (Llama 3.3, ultra-fast)</option>
                    </optgroup>
                    <optgroup label="${t.groupCloud || '☁️ Major Cloud Providers'}">
                      <option value="openai">🟢 OpenAI (ChatGPT / GPT-4o)</option>
                      <option value="claude">🟣 Anthropic (Claude 3.5)</option>
                      <option value="deepseek">🐋 DeepSeek (V3 & R1)</option>
                      <option value="grok">⚫ xAI (Grok 2)</option>
                      <option value="qwen">🔴 Qwen (Alibaba DashScope)</option>
                      <option value="mistral">🟠 Mistral AI</option>
                      <option value="openrouter">🌐 OpenRouter (All models)</option>
                      <option value="perplexity">🔍 Perplexity AI (Sonar)</option>
                      <option value="together">🤝 Together AI</option>
                    </optgroup>
                  </select>
                </div>

                <!-- Zone Local (LM Studio / Ollama) -->
                <div id="ytAiLmStudioSettings" class="yt-ai-setting-item">
                  <label id="ytAiServerLabel">${t.serverLabel || 'Server:'}</label>
                  <div class="yt-ai-input-with-btn">
                    <select id="ytAiServerSelect" class="yt-ai-select" style="flex: 1;">
                      <option value="http://192.168.56.1:1234">192.168.56.1:1234</option>
                      <option value="http://localhost:1234">localhost:1234</option>
                      <option value="http://127.0.0.1:1234">127.0.0.1:1234</option>
                      <option value="custom">${t.customServer || 'Custom IP...'}</option>
                    </select>
                    <button id="ytAiRefreshModelsBtn" class="yt-ai-btn yt-ai-btn-secondary" title="${t.refreshTooltip || 'Refresh local models'}">🔄</button>
                  </div>
                </div>

                <!-- Zone Cloud (Clé API) -->
                <div id="ytAiCloudSettings" class="yt-ai-setting-item yt-ai-hidden">
                  <label id="ytAiApiKeyLabel">${t.apiKeyLabel || 'API Key:'}</label>
                  <div class="yt-ai-input-with-btn">
                    <input type="password" id="ytAiApiKeyInput" class="yt-ai-input yt-ai-api-key-input" placeholder="${t.apiKeyPlaceholder || 'Paste your API key...'}" style="flex: 1;">
                    <a id="ytAiGetApiKeyLink" class="yt-ai-link-pill" href="#" target="_blank" rel="noopener">${t.getApiKeyLink || '🔑 Get Key'}</a>
                  </div>
                </div>

                <!-- Modèle & Test -->
                <div class="yt-ai-setting-item">
                  <label id="ytAiModelLabel">${t.modelLabel || 'Model:'}</label>
                  <div class="yt-ai-input-with-btn">
                    <select id="ytAiModelSelect" class="yt-ai-select" style="flex: 1;">
                      ${initialOptionHtml}
                    </select>
                    <button id="ytAiTestModelBtn" class="yt-ai-btn yt-ai-btn-secondary" title="${t.testModelTooltip || 'Test connection and model'}">${t.testModelBtn || '⚡ Test'}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- SOUS-ONGLET 2 : PARAMÈTRES IA & PROMPT -->
            <div id="ytAiSettingsSubpaneParams" class="yt-ai-settings-subpane">
              <div class="yt-ai-settings-grid">
                <div class="yt-ai-setting-item">
                  <label id="ytAiModeLabel">${t.formatLabel || 'Format:'}</label>
                  <select id="ytAiModeSelect" class="yt-ai-select">
                    <option value="quick">${t.formatQuick || '⚡ Quick'}</option>
                    <option value="standard" selected>${t.formatStandard || '📌 Standard'}</option>
                    <option value="detailed">${t.formatDetailed || '📝 Deep'}</option>
                  </select>
                </div>

                <div class="yt-ai-setting-item">
                  <label id="ytAiTempLabel">${t.tempLabel || 'AI Creativity (Temperature):'}</label>
                  <select id="ytAiTemperatureSelect" class="yt-ai-select">
                    <option value="0.0">${t.tempStrict || '0.0 - Strict & Precise'}</option>
                    <option value="0.3" selected>${t.tempBalanced || '0.3 - Balanced (Default)'}</option>
                    <option value="0.7">${t.tempCreative || '0.7 - Creative & Detailed'}</option>
                    <option value="1.0">${t.tempWild || '1.0 - Highly Inventive'}</option>
                  </select>
                </div>

                <div class="yt-ai-setting-item">
                  <label id="ytAiMaxTokensLabel">${t.maxTokensLabel || 'Max Length (Tokens):'}</label>
                  <select id="ytAiMaxTokensSelect" class="yt-ai-select">
                    <option value="auto" selected>${t.tokensAuto || 'Automatic (Default)'}</option>
                    <option value="1024">${t.tokensShort || 'Short (1,024)'}</option>
                    <option value="2048">${t.tokensStandard || 'Standard (2,048)'}</option>
                    <option value="4096">${t.tokensDetailed || 'Detailed (4,096)'}</option>
                    <option value="8192">${t.tokensMax || 'Maximum (8,192)'}</option>
                  </select>
                </div>

                <div class="yt-ai-setting-item yt-ai-checkbox-field" style="grid-column: span 2;">
                  <label>
                    <input type="checkbox" id="ytAiAutoSummarizeCheck">
                    <span id="ytAiAutoSummarizeLabel">${t.autoSummarizeLabel || '⚡ Auto-summarize when opening a video'}</span>
                  </label>
                </div>

                <div class="yt-ai-setting-item" style="grid-column: span 2;">
                  <label id="ytAiCustomPromptLabel">${t.customPromptLabel || 'Custom AI Instructions (optional):'}</label>
                  <input type="text" id="ytAiCustomPromptInput" class="yt-ai-input" placeholder="${t.customPromptPlaceholder || 'e.g. Focus on technical details, explain with analogies...'}" style="width: 100%;">
                </div>
              </div>
            </div>

            <!-- SOUS-ONGLET 3 : VOIX & AUDIO -->
            <div id="ytAiSettingsSubpaneAudio" class="yt-ai-settings-subpane">
              <div class="yt-ai-settings-grid">
                <div class="yt-ai-setting-item">
                  <label id="ytAiVoiceLabel">${t.voiceLabel || 'Voice (TTS):'}</label>
                  <select id="ytAiVoiceSelect" class="yt-ai-select" title="Voice for speech audio">
                    <option value="">${t.voiceDefault || 'System voice...'}</option>
                  </select>
                </div>

                <div class="yt-ai-setting-item">
                  <label id="ytAiTtsSpeedLabel">${t.ttsSpeedLabel || 'Voice Speed:'}</label>
                  <select id="ytAiTtsSpeedSelect" class="yt-ai-select">
                    <option value="0.75">${t.speedSlow || '0.75x (Calm)'}</option>
                    <option value="1.0" selected>${t.speedNormal || '1.0x (Normal)'}</option>
                    <option value="1.25">${t.speedFast || '1.25x (Fast)'}</option>
                    <option value="1.5">${t.speedVeryFast || '1.5x (Speedy)'}</option>
                    <option value="2.0">${t.speedDouble || '2.0x (Double)'}</option>
                  </select>
                </div>

                <div class="yt-ai-setting-item">
                  <label id="ytAiMicLabel">${t.micLabel || 'Microphone (Speech-to-Text):'}</label>
                  <select id="ytAiMicSelect" class="yt-ai-select" title="Select your microphone for dictation">
                    <option value="">${t.micDefault || 'Default mic...'}</option>
                  </select>
                </div>

                <div class="yt-ai-setting-item">
                  <label id="ytAiWhisperUrlLabel">${t.whisperUrlLabel || 'Local Whisper Server (Audio STT):'}</label>
                  <div class="yt-ai-input-with-btn">
                    <input type="text" id="ytAiWhisperUrlInput" class="yt-ai-input" placeholder="${t.whisperUrlPlaceholder || 'e.g. http://localhost:8000/v1/audio/transcriptions'}" style="flex: 1;">
                    <button id="ytAiTestWhisperBtn" class="yt-ai-btn yt-ai-btn-secondary">${t.testSttBtn || '⚡ Test STT'}</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

export default SettingsDrawerTemplate;
