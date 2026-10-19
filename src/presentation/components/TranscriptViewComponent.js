/**
 * Component managing the Full Transcript View Pane
 */
export class TranscriptViewComponent {
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
    const copyBtn = this.rootEl.querySelector('#ytAiCopyTranscriptBtn');
    if (copyBtn && this.callbacks.onCopyRaw) {
      copyBtn.addEventListener('click', () => this.callbacks.onCopyRaw());
    }
  }

  /**
   * Sets transcript segments list and word count
   * @param {Array<Object>} segments
   * @param {Function} [onTimestampClick]
   */
  setTranscript(segments = [], onTimestampClick = null) {
    const body = this.rootEl.querySelector('#ytAiTranscriptBody');
    const wordCountEl = this.rootEl.querySelector('#ytAiWordCount');
    if (!body) return;

    if (!segments || segments.length === 0) {
      body.textContent = 'No transcript available.';
      if (wordCountEl) wordCountEl.textContent = '0';
      return;
    }

    let totalWords = 0;
    const html = segments.map(s => {
      const time = s.timestamp || (s.formatTime ? s.formatTime() : '');
      const text = s.text || '';
      totalWords += text.split(/\s+/).filter(Boolean).length;
      return `
        <div class="yt-ai-transcript-line">
          <span class="yt-ai-timestamp-pill" data-time="${time}">${time}</span>
          <span class="yt-ai-transcript-snippet">${text}</span>
        </div>
      `;
    }).join('');

    body.innerHTML = html;
    if (wordCountEl) wordCountEl.textContent = String(totalWords);

    if (onTimestampClick) {
      body.querySelectorAll('.yt-ai-timestamp-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const timeStr = pill.getAttribute('data-time');
          const seconds = this.parseTimeStringToSeconds(timeStr);
          onTimestampClick(seconds);
        });
      });
    }
  }

  /**
   * Parses time string (e.g. "02:15" or "1:05:12") into seconds
   * @param {string} timeStr
   * @returns {number}
   */
  parseTimeStringToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.length === 3) {
      return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    }
    return 0;
  }
}

export default TranscriptViewComponent;
