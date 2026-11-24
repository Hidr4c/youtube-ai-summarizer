const MAX_VIDEO_EDGE = 960;
const SEEK_TIMEOUT_MS = 450;

/**
 * Extracts chronological visual keyframes from HTML5 <video> players
 * (Instagram Reels, YouTube Watch/Shorts, web videos) with cross-origin tab-crop fallback.
 */
export class VideoFrameExtractor {
  static formatTimestamp(sec = 0) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(rem)}` : `${pad(m)}:${pad(rem)}`;
  }

  static findPrimaryVideo(doc, preferred = null) {
    if (preferred && (preferred.videoWidth >= 80 || preferred.readyState >= 2)) return preferred;
    if (!doc?.querySelectorAll) return null;
    const videos = Array.from(doc.querySelectorAll('video') || []);
    let best = null;
    let bestScore = -1;
    for (const v of videos) {
      if (v?.closest?.('#yt-ai-summarizer-container, #yt-ai-channel-companion')) continue;
      const rect = typeof v.getBoundingClientRect === 'function' ? v.getBoundingClientRect() : { width: v.videoWidth || 0, height: v.videoHeight || 0 };
      const area = Math.max(0, (rect.width || v.videoWidth || 0) * (rect.height || v.videoHeight || 0));
      if (area < 6400 && (v.videoWidth || 0) < 80) continue;
      const playingBonus = v.paused === false ? 500000 : 0;
      const readyBonus = (v.readyState || 0) >= 2 ? 100000 : 0;
      const score = area + playingBonus + readyBonus;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  static drawElementToJpeg(doc, drawable, srcW, srcH, crop = null, maxEdge = MAX_VIDEO_EDGE) {
    if (!doc?.createElement || !srcW || !srcH) return null;
    const canvas = doc.createElement('canvas');
    const sx = Math.max(0, Math.round(crop?.sx || 0));
    const sy = Math.max(0, Math.round(crop?.sy || 0));
    const sw = Math.max(1, Math.round(crop?.sw || srcW));
    const sh = Math.max(1, Math.round(crop?.sh || srcH));
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return null;
    try {
      if (crop) ctx.drawImage(drawable, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      else ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.78);
      return url && url.startsWith('data:image/jpeg;base64,') ? url : null;
    } catch (_) {
      return null;
    }
  }

  static seekVideoSafely(video, targetSec, timeoutMs = SEEK_TIMEOUT_MS) {
    if (!video || !Number.isFinite(targetSec)) return Promise.resolve(false);
    if (Math.abs((video.currentTime || 0) - targetSec) < 0.15) return Promise.resolve(true);
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
      const timer = setTimeout(() => finish(false), timeoutMs);
      if (typeof video.addEventListener === 'function') {
        video.addEventListener('seeked', () => { clearTimeout(timer); finish(true); }, { once: true });
      }
      try {
        video.currentTime = targetSec;
        if (typeof video.addEventListener !== 'function') { clearTimeout(timer); finish(true); }
      } catch (_) {
        clearTimeout(timer);
        finish(false);
      }
    });
  }

  static async captureTabCropFallback(doc, video) {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage || typeof Image === 'undefined') return null;
    const res = await new Promise((resolve) => chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB' }, (r) => resolve(r || null)));
    if (!res?.success || !res?.dataUrl) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        const rect = typeof video?.getBoundingClientRect === 'function' ? video.getBoundingClientRect() : null;
        const crop = rect && rect.width >= 40 && rect.height >= 40
          ? {
            sx: Math.max(0, Math.min(img.width - 10, rect.left * dpr)),
            sy: Math.max(0, Math.min(img.height - 10, rect.top * dpr)),
            sw: Math.min(img.width, Math.max(40, rect.width * dpr)),
            sh: Math.min(img.height, Math.max(40, rect.height * dpr))
          }
          : null;
        const cropped = VideoFrameExtractor.drawElementToJpeg(doc, img, img.width, img.height, crop, MAX_VIDEO_EDGE);
        resolve(cropped || res.dataUrl);
      };
      img.onerror = () => resolve(null);
      img.src = res.dataUrl;
    });
  }

  static async captureVideoFrames(doc, options = {}) {
    const maxFrames = Math.max(1, Math.min(6, options.maxFrames || 5));
    const video = VideoFrameExtractor.findPrimaryVideo(doc, options.preferredVideo || null);
    if (!video || !doc) return { frames: [], hasVideo: false };

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    const frames = [];
    const curTime = Number(video.currentTime) || 0;
    const dur = Number(video.duration);
    const hasFiniteDur = Number.isFinite(dur) && dur >= 2.5;

    // 1. Probe canvas access at current playhead first
    const firstUrl = (video.readyState || 0) >= 2 ? VideoFrameExtractor.drawElementToJpeg(doc, video, vw, vh) : null;

    if (firstUrl && hasFiniteDur && maxFrames > 1) {
      const wasPaused = Boolean(video.paused);
      const origTime = curTime;
      const ratios = maxFrames >= 5 ? [0.05, 0.27, 0.50, 0.72, 0.90] : [0.10, 0.50, 0.88];
      const targets = [...new Set(ratios.slice(0, maxFrames).map((r) => Math.max(0.1, Math.min(dur - 0.15, Number((dur * r).toFixed(1))))))];
      try {
        try { if (!wasPaused) video.pause?.(); } catch (_) {}
        for (const tSec of targets) {
          await VideoFrameExtractor.seekVideoSafely(video, tSec);
          const url = VideoFrameExtractor.drawElementToJpeg(doc, video, vw, vh);
          if (url) {
            const idx = frames.length + 1;
            const ts = VideoFrameExtractor.formatTimestamp(tSec);
            frames.push({ name: `video_frame_${idx}.jpg`, mimeType: 'image/jpeg', dataUrl: url, label: `Video Frame #${idx}/${targets.length} (t=${ts})`, alt: `Video scene at ${ts}` });
          }
        }
      } finally {
        await VideoFrameExtractor.seekVideoSafely(video, origTime, 250).catch(() => {});
        try { if (!wasPaused) video.play?.().catch?.(() => {}); } catch (_) {}
      }
    } else if (firstUrl) {
      const ts = VideoFrameExtractor.formatTimestamp(curTime);
      frames.push({ name: 'video_frame_1.jpg', mimeType: 'image/jpeg', dataUrl: firstUrl, label: `Video Frame #1/1 (t=${ts})`, alt: `Current video frame at ${ts}` });
    }

    // 2. Fallback for CORS-tainted videos (e.g., Instagram CDN / protected embeds)
    if (frames.length === 0) {
      const tabCrop = await VideoFrameExtractor.captureTabCropFallback(doc, video);
      if (tabCrop) {
        const ts = VideoFrameExtractor.formatTimestamp(curTime);
        frames.push({ name: 'video_frame_visible.jpg', mimeType: 'image/jpeg', dataUrl: tabCrop, label: `Video Frame (Visible Player Capture at t=${ts})`, alt: 'Captured video player frame' });
      } else if (video.poster && /^https?:/i.test(video.poster) && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const pRes = await new Promise((resolve) => chrome.runtime.sendMessage({ action: 'FETCH_SAFE_IMAGE', url: video.poster }, (r) => resolve(r || null)));
        if (pRes?.success && pRes?.dataUrl) {
          frames.push({ name: 'video_poster.jpg', mimeType: 'image/jpeg', dataUrl: pRes.dataUrl, label: 'Video Poster Thumbnail', alt: 'Video preview poster' });
        }
      }
    }

    return { frames, hasVideo: true, duration: hasFiniteDur ? dur : null };
  }
}

export default VideoFrameExtractor;
