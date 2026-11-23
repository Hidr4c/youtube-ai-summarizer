/**
 * Maintains Chromium MV3 Service Worker & Port liveness during slow model loading and streaming.
 */
export class StreamKeepalive {
  /**
   * Starts periodic Service Worker wakeups + port keepalive heartbeats.
   * @param {Object} options
   * @param {Function} options.postMessageSafe
   * @param {Function} options.isAborted
   * @param {number} [options.intervalMs=10000]
   * @returns {{ emit: (msg: Object) => void, stop: () => void }}
   */
  static start({ postMessageSafe, isAborted, intervalMs = 10000 }) {
    let hasStreamData = false;
    const startMs = Date.now();

    const timer = setInterval(() => {
      if (isAborted()) return;
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getPlatformInfo) {
          chrome.runtime.getPlatformInfo(() => {});
        }
      } catch (_) {}
      postMessageSafe({
        type: 'KEEPALIVE',
        elapsedSec: Math.max(1, Math.round((Date.now() - startMs) / 1000)),
        waitingForModel: !hasStreamData
      });
    }, intervalMs);

    if (typeof timer?.unref === 'function') timer.unref();

    return {
      emit(msg) {
        if (msg?.type === 'CHUNK') hasStreamData = true;
        postMessageSafe(msg);
      },
      stop() {
        clearInterval(timer);
      }
    };
  }
}

export default StreamKeepalive;
