/**
 * Component managing the Top Header Bar
 */
export class HeaderBarComponent {
  /**
   * @param {HTMLElement} rootEl
   * @param {Object} callbacks
   */
  constructor(rootEl, callbacks = {}) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  bindEvents() {
    const summarizeBtn = this.rootEl.querySelector('#ytAiSummarizeBtn');
    if (summarizeBtn && this.callbacks.onSummarize) {
      summarizeBtn.addEventListener('click', () => this.callbacks.onSummarize());
    }

    const toggleBtn = this.rootEl.querySelector('#ytAiToggleBtn');
    if (toggleBtn && this.callbacks.onToggleExpand) {
      toggleBtn.addEventListener('click', () => this.callbacks.onToggleExpand());
    }

    const settingsBtn = this.rootEl.querySelector('#ytAiSettingsToggleBtn');
    if (settingsBtn && this.callbacks.onToggleSettings) {
      settingsBtn.addEventListener('click', () => this.callbacks.onToggleSettings());
    }

    const modelPill = this.rootEl.querySelector('#ytAiModelPill');
    if (modelPill && this.callbacks.onToggleSettings) {
      modelPill.addEventListener('click', () => this.callbacks.onToggleSettings('model'));
    }

    const langSelect = this.rootEl.querySelector('#ytAiLangSelect');
    if (langSelect && this.callbacks.onLanguageChange) {
      langSelect.addEventListener('change', (e) => this.callbacks.onLanguageChange(e.target.value));
    }

    const formatPills = this.rootEl.querySelectorAll('.yt-ai-format-pill');
    formatPills.forEach(pill => {
      pill.addEventListener('click', () => {
        formatPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const mode = pill.getAttribute('data-mode');
        if (mode && this.callbacks.onFormatChange) {
          this.callbacks.onFormatChange(mode);
        }
      });
    });
  }

  /**
   * Updates status badge
   * @param {string} text
   * @param {boolean} isConnected
   */
  setStatus(text, isConnected = true) {
    const badge = this.rootEl.querySelector('#ytAiStatusBadge');
    const textEl = this.rootEl.querySelector('#ytAiStatusText');
    if (badge && textEl) {
      badge.className = `yt-ai-badge ${isConnected ? 'connected' : 'offline'}`;
      textEl.textContent = text;
    }
  }

  /**
   * Updates model text in pill
   * @param {string} modelName
   */
  setModelText(modelName) {
    const textEl = this.rootEl.querySelector('#ytAiHeaderModelText');
    if (textEl) {
      textEl.textContent = `Model: ${modelName || 'None'}`;
    }
  }

  /**
   * Sets active format pill
   * @param {string} mode
   */
  setActiveFormat(mode) {
    const formatPills = this.rootEl.querySelectorAll('.yt-ai-format-pill');
    formatPills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-mode') === mode);
    });
  }
}

export default HeaderBarComponent;
