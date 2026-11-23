/**
 * Leading+trailing throttle scheduler that coalesces high-frequency SSE token chunks
 * into periodic UI Markdown/DOM renders while keeping the initial token instant.
 */
export class StreamRenderScheduler {
  /**
   * Creates a coalesced render scheduler for a streaming UI target.
   * @param {Function} renderFn - Callback invoked with the latest scheduled payload
   * @param {number} [intervalMs=75] - Minimum interval between consecutive renders
   * @returns {{ schedule: (payload?: any) => void, flush: () => void, cancel: () => void }}
   */
  static create(renderFn, intervalMs = 75) {
    let lastRenderAt = 0;
    let timer = null;
    let hasPending = false;
    let latestPayload;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const runRender = () => {
      hasPending = false;
      lastRenderAt = Date.now();
      renderFn(latestPayload);
    };

    return {
      schedule(payload) {
        latestPayload = payload;
        const elapsed = Date.now() - lastRenderAt;
        if (elapsed >= intervalMs && timer === null) {
          runRender();
          return;
        }
        hasPending = true;
        if (timer === null) {
          const delay = Math.max(10, intervalMs - elapsed);
          timer = setTimeout(() => {
            timer = null;
            if (hasPending) runRender();
          }, delay);
          if (typeof timer?.unref === 'function') timer.unref();
        }
      },

      flush() {
        clearTimer();
        if (hasPending) runRender();
      },

      cancel() {
        clearTimer();
        hasPending = false;
      }
    };
  }
}

export default StreamRenderScheduler;
