/**
 * Safely fetches cross-origin HTTP(S) images in the background worker and
 * re-encodes pixels to a stripped JPEG data URL via ImageBitmap + OffscreenCanvas.
 */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 6000;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export class BackgroundImageFetcher {
  static async fetchSafeJpeg(rawUrl) {
    let parsed;
    try {
      parsed = new URL(String(rawUrl || ''));
    } catch (_) {
      return { success: false, error: 'Invalid image URL' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { success: false, error: 'Unsupported protocol' };
    }

    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
    try {
      const resp = await fetch(parsed.href, { credentials: 'omit', signal: ctrl?.signal });
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
      const ctype = (resp.headers?.get?.('content-type') || '').toLowerCase();
      if (!ctype.startsWith('image/') || ctype.includes('svg')) {
        return { success: false, error: 'Unsupported image MIME type' };
      }
      const blob = await resp.blob();
      if (!blob || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) {
        return { success: false, error: 'Image size out of bounds' };
      }
      if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
        return { success: false, error: 'OffscreenCanvas unavailable' };
      }
      const bmp = await createImageBitmap(blob);
      try {
        const canvas = new OffscreenCanvas(Math.max(1, bmp.width), Math.max(1, bmp.height));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        const b64 = arrayBufferToBase64(await jpegBlob.arrayBuffer());
        return { success: true, dataUrl: `data:image/jpeg;base64,${b64}`, width: bmp.width, height: bmp.height };
      } finally {
        bmp.close?.();
      }
    } catch (err) {
      return { success: false, error: err?.message || 'Fetch failed' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  static captureVisibleTab(windowId = null) {
    if (typeof chrome === 'undefined' || !chrome.tabs?.captureVisibleTab) {
      return Promise.resolve({ success: false, error: 'captureVisibleTab unavailable' });
    }
    return new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(windowId ?? null, { format: 'jpeg', quality: 82 }, (dataUrl) => {
        const err = chrome.runtime?.lastError?.message;
        if (err || !dataUrl) resolve({ success: false, error: err || 'Empty tab capture' });
        else resolve({ success: true, dataUrl });
      });
    });
  }
}

export default BackgroundImageFetcher;
