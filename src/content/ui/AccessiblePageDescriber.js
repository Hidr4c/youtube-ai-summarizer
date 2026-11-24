import { I18N } from '../../locales/index.js';
import { TARGET_LANG_NAMES } from '../../services/implementations/PromptTemplates.js';
import { ModelCapabilities } from '../../config/ModelCapabilities.js';
import { PageImageToolHandler } from '../services/PageImageToolHandler.js';
import { VideoFrameExtractor } from '../services/VideoFrameExtractor.js';
import { PageVisionCollector } from '../services/PageVisionCollector.js';
import { WebPagePromptBuilder } from '../../services/implementations/WebPagePromptBuilder.js';

/**
 * Generates vivid, screen-reader-friendly audio descriptions of web pages and videos
 * (Instagram posts/Reels, general websites, YouTube Watch/Shorts) and triggers auto-speech.
 */
export class AccessiblePageDescriber {
  static buildWebPrompt(pageData, lang = 'fr', attachedFrames = [], inspectedSummary = '') {
    const targetLang = TARGET_LANG_NAMES[lang] || 'ENGLISH';
    const isInstagram = /instagram\.com/i.test(String(pageData?.hostname || pageData?.url || ''));
    const hasVideoFrames = Array.isArray(attachedFrames) && attachedFrames.some((f) => /video_frame|video_poster/i.test(String(f?.name || f?.label || '')));
    const base = WebPagePromptBuilder.buildChatSystemPrompt(
      pageData, lang, 'standard', '', '', '', '', '', attachedFrames, inspectedSummary
    );
    return [
      base,
      '\n=== ACCESSIBILITY AUDIO-DESCRIPTION MODE (FOR BLIND & LOW-VISION USERS) ===',
      `Write the ENTIRE description naturally in ${targetLang} so it can be read aloud comfortably by text-to-speech.`,
      'STRICT ORAL ACCESSIBILITY RULES:',
      '- Use natural, flowing spoken sentences with zero emojis, zero ASCII art, and zero Markdown tables.',
      '- Start immediately by stating what page, profile, post, video, or site this is and its main purpose.',
      isInstagram
        ? '- INSTAGRAM / REELS FOCUS: Describe the creator/profile, type of post (photo, carousel, Reel/video), describe every visible scene vividly: people (poses, expressions, outfits), objects, settings, colors, readable on-screen text, actions unfolding chronologically across video frames, and the caption.'
        : '- Describe the main visual elements, photos, illustrations, layout, key content, and primary actions clearly.',
      hasVideoFrames
        ? '- VIDEO SEQUENCE ANALYSIS: Multiple chronological frames captured from the active video are attached (Video Frame #1..#N with timestamps). Describe what visually happens step by step across the video!'
        : '',
      '- Mention clearly if visual scenes could not be seen because the selected AI model is text-only.'
    ].filter(Boolean).join('\n');
  }

  static buildYouTubePromptSuffix(hasVideoFrames = false) {
    return [
      '\n\n=== ACCESSIBILITY AUDIO-DESCRIPTION MODE (FOR BLIND & LOW-VISION USERS) ===',
      'Write clear, vivid spoken prose with zero emojis or Markdown tables so it reads aloud naturally.',
      hasVideoFrames
        ? 'Combine what is spoken in the transcript with the chronological Video Frames attached to describe BOTH what is said AND what is visually happening on screen step by step.'
        : 'Summarize clearly what happens in the video based on the transcript and metadata; note if visual frames were unavailable or require a vision model.'
    ].join('\n');
  }

  static buildQuestionLabel(lang = 'en') {
    const t = I18N[lang] || I18N.en;
    return t.describeAccessibleQuestion || '👁️ Describe this page in detail for a blind or low-vision person (spoken audio description).';
  }

  static async prepareVisionContext(controller, pageData, doc = typeof document !== 'undefined' ? document : null) {
    if (!controller || !pageData) return null;
    const cfg = controller._resolveInferenceConfig?.() || {};
    const canSee = ModelCapabilities.supportsImages(cfg.provider, cfg.model, controller.state?.modelCapabilities?.[cfg.model] || null);
    if (!canSee) return null;

    const frames = [];
    const summaryNotes = [];
    const videoRes = await VideoFrameExtractor.captureVideoFrames(doc, { maxFrames: 5 }).catch(() => ({ frames: [] }));
    if (videoRes?.frames?.length > 0) {
      frames.push(...videoRes.frames);
      summaryNotes.push(`Captured ${videoRes.frames.length} video frame(s)`);
    }

    const inv = Array.isArray(pageData.imageInventory) ? pageData.imageInventory : [];
    const safe = Array.isArray(pageData.safeImages) ? pageData.safeImages : [];
    if (inv.length > 0 && (safe.length < Math.min(4, inv.length) || frames.length > 0)) {
      const imgRes = await PageImageToolHandler.execute(controller, 'images=1-8', pageData).catch(() => null);
      if (imgRes?.frames?.length > 0) {
        const room = Math.max(0, 8 - frames.length);
        frames.push(...imgRes.frames.slice(0, room));
        if (imgRes.summary) summaryNotes.push(imgRes.summary);
      }
    } else if (safe.length > 0 && frames.length > 0) {
      frames.push(...safe.slice(0, Math.max(0, 8 - frames.length)));
    }
    return frames.length > 0 ? { frames: frames.slice(0, 8), summary: summaryNotes.join(' | ') } : null;
  }

  static wantsYouTubeVisuals(text = '') {
    return /vignette|thumbnail|miniature|image|photo|visuel|[eé]cran|montre|affiche|clickbait|putaclic|regarde|vois|sc[eè]ne|describe|d[eé]cri|titre/i.test(String(text || ''));
  }

  static shouldPrepareYouTubeMessage(ctx = {}, userMsg = {}, alwaysOnFirstTurn = false, queryText = '') {
    if (Array.isArray(userMsg.images) && userMsg.images.length > 0) return false;
    if (!PageVisionCollector.supportsVision(ctx)) return false;
    return Boolean(ctx.accessibleDescribe || alwaysOnFirstTurn || AccessiblePageDescriber.wantsYouTubeVisuals(queryText));
  }

  static async prepareYouTubeMessage(ctx = {}, userMsg = {}, preferredVideo = null, alwaysOnFirstTurn = false, queryText = '', videoId = null) {
    if (!AccessiblePageDescriber.shouldPrepareYouTubeMessage(ctx, userMsg, alwaysOnFirstTurn, queryText)) return userMsg;
    const frames = await PageVisionCollector.collectYouTubeFrames(ctx, preferredVideo, ctx.accessibleDescribe ? 5 : 4, videoId).catch(() => []);
    if (!frames.length) return userMsg;
    return { ...userMsg, images: frames };
  }

  static trigger({ isWebMode, webPageController, chatViewController, bannerView, audioController, state }) {
    const lang = (typeof document !== 'undefined' ? document.getElementById?.('ytAiLangSelect')?.value : null)
      || state?.currentLang || 'en';
    const question = AccessiblePageDescriber.buildQuestionLabel(lang);
    bannerView?.setExpanded?.(true);
    bannerView?.switchTab?.('chat');

    if (isWebMode && webPageController) {
      return webPageController.sendChatMessage(question, [], {
        attachmentHelper: chatViewController?.attachmentHelper,
        audioController,
        accessibleDescribe: true,
        autoRead: true
      });
    }
    if (chatViewController) {
      return chatViewController.handleSendChatMessage(question, {
        state,
        currentLang: state?.currentLang || lang,
        currentProvider: state?.currentProvider,
        apiKeys: state?.apiKeys,
        serverUrls: state?.serverUrls,
        temperature: state?.temperature,
        maxTokens: state?.maxTokens,
        getActiveModel: () => state?.getActiveModel?.(),
        setExpanded: (exp) => bannerView?.setExpanded?.(exp),
        switchTab: (tab) => bannerView?.switchTab?.(tab),
        audioController,
        accessibleDescribe: true,
        autoRead: true
      });
    }
    return null;
  }
}

export default AccessiblePageDescriber;
