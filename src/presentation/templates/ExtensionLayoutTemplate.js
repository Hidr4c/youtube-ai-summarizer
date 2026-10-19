/**
 * Reusable HTML template for YouTube AI Summarizer DOM structure
 */
export class ExtensionLayoutTemplate {
  /**
   * Generates the root container HTML markup
   * @param {Object} options
   * @returns {string}
   */
  static render({ isExpanded = false, version = 'v1.3.0', initialModelText = 'Gemini 1.5 Flash' } = {}) {
    return `
      <div class="yt-ai-header-bar">
        <div class="yt-ai-header-left">
          <div class="yt-ai-brand">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" class="yt-ai-logo-red"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" class="yt-ai-logo-white"/></svg>
            <span id="ytAiBrandText">YT Summarizer AI</span>
          </div>
          <div id="ytAiStatusBadge" class="yt-ai-badge connected">
            <span class="yt-ai-badge-dot"></span>
            <span id="ytAiStatusText">Checking...</span>
          </div>
          <div id="ytAiModelPill" class="yt-ai-model-pill" title="Click to change model">
            🤖 <span id="ytAiHeaderModelText">Model: ${initialModelText}</span> ▾
          </div>
        </div>

        <div class="yt-ai-header-center">
          <div class="yt-ai-format-pills">
            <button class="yt-ai-format-pill" data-mode="quick" title="Short & concise">⚡ Quick</button>
            <button class="yt-ai-format-pill active" data-mode="standard" title="Natural & balanced">📌 Standard</button>
            <button class="yt-ai-format-pill" data-mode="detailed" title="Detailed & in-depth">📝 Deep</button>
          </div>
          <button id="ytAiSummarizeBtn" class="yt-ai-btn-cta">
            ✨ Summarize video
          </button>
        </div>

        <div class="yt-ai-header-right">
          <select id="ytAiLangSelect" class="yt-ai-select yt-ai-header-select" title="Change interface & summary language">
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="it">🇮🇹 Italiano</option>
            <option value="ru">🇷🇺 Русский</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
          <button id="ytAiSettingsToggleBtn" class="yt-ai-btn-ghost" title="Settings">⚙️ Settings</button>
          <button id="ytAiToggleBtn" class="yt-ai-btn-ghost" title="Collapse / Expand">Collapse ▲</button>
          <span class="yt-ai-version-tag">${version}</span>
        </div>
      </div>

      <div id="yt-ai-body" class="${isExpanded ? '' : 'yt-ai-hidden'}">
        <!-- Settings Drawer, Navigation Tabs, and Panes are inserted here -->
      </div>
    `;
  }
}

export default ExtensionLayoutTemplate;
