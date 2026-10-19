/**
 * Component managing the TTS Audio Playback Banner
 */
export class AudioBannerComponent {
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
    const stopBtn = this.rootEl.querySelector('#ytAiStopAudioBannerBtn');
    if (stopBtn && this.callbacks.onStop) {
      stopBtn.addEventListener('click', () => this.callbacks.onStop());
    }
  }

  /**
   * Shows or hides the audio banner
   * @param {boolean} isVisible
   * @param {string} [titleText]
   */
  setVisible(isVisible, titleText = '') {
    const banner = this.rootEl.querySelector('#ytAiAudioBanner');
    const titleEl = this.rootEl.querySelector('#ytAiAudioBannerTitle');
    if (!banner) return;

    banner.classList.toggle('yt-ai-hidden', !isVisible);
    if (titleEl && titleText) {
      titleEl.textContent = titleText;
    }
  }
}

export default AudioBannerComponent;
