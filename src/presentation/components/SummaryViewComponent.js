/**
 * Component managing the AI Summary View Pane
 */
export class SummaryViewComponent {
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
    const copyBtn = this.rootEl.querySelector('#ytAiCopyBtn');
    if (copyBtn && this.callbacks.onCopy) {
      copyBtn.addEventListener('click', () => this.callbacks.onCopy());
    }

    const downloadMdBtn = this.rootEl.querySelector('#ytAiDownloadBtn');
    if (downloadMdBtn && this.callbacks.onDownloadMd) {
      downloadMdBtn.addEventListener('click', () => this.callbacks.onDownloadMd());
    }

    const saveTxtBtn = this.rootEl.querySelector('#ytAiSaveTxtBtn');
    if (saveTxtBtn && this.callbacks.onDownloadTxt) {
      saveTxtBtn.addEventListener('click', () => this.callbacks.onDownloadTxt());
    }

    const saveJsonBtn = this.rootEl.querySelector('#ytAiSaveJsonBtn');
    if (saveJsonBtn && this.callbacks.onDownloadJson) {
      saveJsonBtn.addEventListener('click', () => this.callbacks.onDownloadJson());
    }

    const speakBtn = this.rootEl.querySelector('#ytAiSpeakSummaryBtn');
    if (speakBtn && this.callbacks.onToggleSpeak) {
      speakBtn.addEventListener('click', () => this.callbacks.onToggleSpeak());
    }
  }

  /**
   * Updates summary HTML and attaches click listeners to timestamp links
   * @param {string} htmlContent
   * @param {Function} onTimestampClick
   */
  setSummaryContent(htmlContent, onTimestampClick = null) {
    const body = this.rootEl.querySelector('#ytAiSummaryBody');
    if (!body) return;
    body.innerHTML = htmlContent;

    if (onTimestampClick) {
      body.querySelectorAll('.yt-ai-timestamp-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const seconds = Number(link.getAttribute('data-seconds'));
          if (!isNaN(seconds)) onTimestampClick(seconds);
        });
      });
    }
  }

  /**
   * Updates reasoning text box
   * @param {string} text
   * @param {string} statusText
   */
  setReasoning(text, statusText = '') {
    const box = this.rootEl.querySelector('#ytAiReasoningBox');
    const textEl = this.rootEl.querySelector('#ytAiReasoningText');
    const statusEl = this.rootEl.querySelector('#ytAiReasoningStatus');

    if (!box || !textEl) return;
    if (text && text.trim()) {
      box.classList.remove('yt-ai-hidden');
      textEl.textContent = text;
      if (statusEl && statusText) statusEl.textContent = statusText;
    } else {
      box.classList.add('yt-ai-hidden');
    }
  }
}

export default SummaryViewComponent;
