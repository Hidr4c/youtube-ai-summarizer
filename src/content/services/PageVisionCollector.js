import { ModelCapabilities } from '../../config/ModelCapabilities.js';
import { PageImageToolHandler } from './PageImageToolHandler.js';
import { VideoFrameExtractor } from './VideoFrameExtractor.js';
import { YouTubeThumbnailCollector } from './YouTubeThumbnailCollector.js';
import { getVideoId } from '../ui/NavigationObserver.js';

/**
 * Collects chronological <video> keyframes and CORS-safe <img> visuals
 * for any Vision-capable model across Summaries, Audits, and Q&A.
 */
export class PageVisionCollector {
  static supportsVision(controllerOrCtx = {}) {
    if (typeof controllerOrCtx._resolveInferenceConfig === 'function') {
      const cfg = controllerOrCtx._resolveInferenceConfig() || {};
      return ModelCapabilities.supportsImages(cfg.provider, cfg.model, controllerOrCtx.state?.modelCapabilities?.[cfg.model] || null);
    }
    const stateObj = controllerOrCtx.state || controllerOrCtx;
    const provider = controllerOrCtx.currentProvider || stateObj.currentProvider || 'lmstudio';
    const model = (typeof controllerOrCtx.getActiveModel === 'function' ? controllerOrCtx.getActiveModel() : null)
      || stateObj.getActiveModel?.() || stateObj.selectedModel || controllerOrCtx.selectedModel || '';
    return ModelCapabilities.supportsImages(provider, model, stateObj.modelCapabilities?.[model] || null);
  }

  static hasUnloadedVisuals(pageData, doc = typeof document !== 'undefined' ? document : null) {
    const hasVideo = Boolean(doc?.querySelectorAll && VideoFrameExtractor.findPrimaryVideo(doc));
    const hasCorsOrLazyImgs = Array.isArray(pageData?.imageInventory) && pageData.imageInventory.length > 0
      && (!Array.isArray(pageData?.safeImages) || pageData.safeImages.length === 0);
    return hasVideo || hasCorsOrLazyImgs;
  }

  static async attachWebVisualFrames(controller, pageData, userMsg, options = {}) {
    if (!PageVisionCollector.supportsVision(controller) || !pageData) {
      return { message: userMsg, frames: [], summary: '' };
    }
    const doc = options.doc || (typeof document !== 'undefined' ? document : null);
    const maxFrames = Math.max(1, options.maxFrames || 6);
    const maxVideoFrames = Math.max(0, options.maxVideoFrames ?? 4);
    const maxCanvasImages = Math.max(0, options.maxCanvasImages ?? maxFrames);
    const frames = [];
    const notes = [];

    if (maxVideoFrames > 0 && doc) {
      const vidRes = await VideoFrameExtractor.captureVideoFrames(doc, { maxFrames: maxVideoFrames }).catch(() => ({ frames: [] }));
      if (vidRes?.frames?.length > 0) {
        frames.push(...vidRes.frames);
        notes.push(`Captured ${vidRes.frames.length} video frame(s)`);
      }
    }

    const safeImgs = Array.isArray(pageData.safeImages) ? pageData.safeImages : [];
    const inv = Array.isArray(pageData.imageInventory) ? pageData.imageInventory : [];
    if (safeImgs.length > 0) {
      const limit = Math.min(maxCanvasImages, Math.max(0, maxFrames - frames.length));
      frames.push(...safeImgs.slice(0, limit));
    } else if (inv.length > 0 && maxCanvasImages > 0) {
      const imgRes = await PageImageToolHandler.execute(controller, 'images=1-8', pageData, doc).catch(() => null);
      if (imgRes?.frames?.length > 0) {
        const limit = Math.min(maxCanvasImages, Math.max(0, maxFrames - frames.length));
        frames.push(...imgRes.frames.slice(0, limit));
        if (imgRes.summary) notes.push(imgRes.summary);
      }
    }

    const finalFrames = frames.slice(0, maxFrames);
    if (finalFrames.length === 0) return { message: userMsg, frames: [], summary: '' };
    return {
      message: { ...userMsg, images: finalFrames },
      frames: finalFrames,
      summary: notes.join(' | ')
    };
  }

  static async collectYouTubeFrames(ctxOrState = {}, videoEl = null, maxFrames = 4, videoId = null) {
    if (!PageVisionCollector.supportsVision(ctxOrState)) return [];
    const targetId = videoId || (typeof window !== 'undefined' ? getVideoId() : '') || '';
    const collected = [];
    if (targetId) {
      const thumb = await YouTubeThumbnailCollector.fetchThumbnail(targetId).catch(() => null);
      if (thumb?.dataUrl) collected.push(thumb);
    }
    const remaining = Math.max(0, maxFrames - collected.length);
    if (remaining > 0 && typeof document !== 'undefined') {
      const res = await VideoFrameExtractor.captureVideoFrames(document, { maxFrames: remaining, preferredVideo: videoEl }).catch(() => ({ frames: [] }));
      if (Array.isArray(res?.frames)) collected.push(...res.frames);
    }
    return collected.slice(0, maxFrames);
  }
}

export default PageVisionCollector;
