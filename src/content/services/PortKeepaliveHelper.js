/**
 * Keeps Chrome MV3 runtime Ports alive during slow local LLM model loading or long prompt prefill.
 */
export class PortKeepaliveHelper {
  /**
   * Starts periodic bidirectional keepalive pings and returns a cleanup handle.
   * @param {chrome.runtime.Port} port
   * @param {number} [intervalMs=15000]
   * @returns {{ stop: () => void }}
   */
  static attach(port, intervalMs = 15000) {
    if (!port || typeof port.postMessage !== 'function') {
      return { stop: () => {} };
    }
    const timer = setInterval(() => {
      try {
        port.postMessage({ action: 'KEEPALIVE' });
      } catch (_) {
        clearInterval(timer);
      }
    }, intervalMs);
    if (typeof timer?.unref === 'function') timer.unref();
    return {
      stop: () => clearInterval(timer)
    };
  }

  /**
   * Formats lightweight HTML spinner feedback while awaiting the first streamed token.
   * @param {string} label
   * @param {Function} escapeFn
   * @returns {string}
   */
  static renderWaitingHtml(label, escapeFn) {
    return `<div class="yt-ai-loading"><span class="yt-ai-spinner"></span> ${escapeFn(label)}</div>`;
  }
}

export default PortKeepaliveHelper;
