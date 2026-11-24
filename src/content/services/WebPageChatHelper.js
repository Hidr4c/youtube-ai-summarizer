import { I18N } from '../../locales/index.js';
import { AuditReport } from '../../domain/models/AuditReport.js';
import { WebPagePromptBuilder } from '../../services/implementations/WebPagePromptBuilder.js';
import { WebAuditVisualRenderer } from '../ui/WebAuditVisualRenderer.js';
import { escapeHtml, renderMarkdown } from '../ui/MarkdownRenderer.js';
import { ModelCapabilities } from '../../config/ModelCapabilities.js';
import { ChatBubbleView } from '../ui/ChatBubbleView.js';
import { ChatAttachmentHelper } from '../ui/ChatAttachmentHelper.js';
import { StreamRenderScheduler } from '../ui/StreamRenderScheduler.js';
import { extractAllVideoIdsFromText } from '../ui/NavigationObserver.js';
import { ChatToolProtocol } from './ChatToolProtocol.js';
import { PageImageToolHandler } from './PageImageToolHandler.js';
import { ChatQueueHelper } from '../ui/ChatQueueHelper.js';
import { AccessiblePageDescriber } from '../ui/AccessiblePageDescriber.js';
import { PageVisionCollector } from './PageVisionCollector.js';

/**
 * Enriches web-page Q&A chat turns with sanitized page images and
 * LLM-driven diagnostic tool execution (AUDIT_PAGE / AUDIT_SITE).
 */
export class WebPageChatHelper {
  static getAvailableTools(controller, pageData = null, canSeeImages = false) {
    const tools = [];
    const inv = pageData?.imageInventory || controller?.cachedPageData?.imageInventory || [];
    if (canSeeImages && inv.length > 0) {
      tools.push({ name: 'INSPECT_PAGE_IMAGES', description: 'Load lazy images, crop oversized vertical/wide images into crisp readable slices, and inspect additional page images (syntax: [TOOL_CALL:INSPECT_PAGE_IMAGES|next], [TOOL_CALL:INSPECT_PAGE_IMAGES|images=2-6], or [TOOL_CALL:INSPECT_PAGE_IMAGES|image=1,slices=9-16]).' });
    }
    if (!controller?.auditReport) {
      tools.push({ name: 'AUDIT_PAGE', description: 'Run a full security, anti-phishing, DOM-trap & credibility audit of the current page.' });
    }
    if (!controller?.domainAuditMarkdown) {
      tools.push({ name: 'AUDIT_SITE', description: 'Crawl the current website homepage, legal/about/contact pages, robots.txt & sitemap to verify publisher identity and site legitimacy.' });
    }
    tools.push({ name: 'AUDIT_EXTERNAL_SITE', description: 'Inspect external website URL(s) mentioned by the user (syntax: [TOOL_CALL:AUDIT_EXTERNAL_SITE|https://example.com] — one tag per URL) to read their homepage, legal/about/contact pages, and check links/ownership.' });
    tools.push({ name: 'AUDIT_YOUTUBE_VIDEO', description: 'Fetch the full transcript of a YouTube video referenced on the page or by the user (syntax: [TOOL_CALL:AUDIT_YOUTUBE_VIDEO|<videoId_or_url>] — one tag per video) to summarize it, verify claims, or answer questions about the video.' });
    return tools;
  }

  static buildToolDirective(controller, pageData = null, canSeeImages = false) {
    return ChatToolProtocol.buildToolDirective(WebPageChatHelper.getAvailableTools(controller, pageData, canSeeImages));
  }

  /**
   * Attaches sanitized canvas page images to the outgoing user message
   * when the active model supports vision and no manual images are attached yet.
   */
  static attachPageImagesIfNeeded(userMsg, pageData, canSeeImages, hasHistory = false) {
    if (!canSeeImages || hasHistory) return userMsg;
    const pageImgs = Array.isArray(pageData?.safeImages) ? pageData.safeImages : [];
    if (pageImgs.length === 0) return userMsg;
    if (Array.isArray(userMsg?.images) && userMsg.images.length > 0) return userMsg;
    return { ...userMsg, images: pageImgs };
  }

  static async executeTools(controller, requestedTools, pageData, lang, canSeeImages, invocations = [], modelNotes = '') {
    const list = Array.isArray(invocations) && invocations.length > 0
      ? invocations
      : (requestedTools || []).map((name) => ({ name, arg: '' }));

    const externalUrls = [];
    const youtubeTokens = [];
    for (const inv of list) {
      if (inv.name === 'AUDIT_PAGE' && !controller.auditReport) {
        await WebPageChatHelper._runBufferedPageAudit(controller, pageData, lang, canSeeImages);
      } else if (inv.name === 'AUDIT_SITE' && !controller.domainAuditMarkdown) {
        await WebPageChatHelper._runBufferedSiteAudit(controller, pageData, lang);
      } else if (inv.name === 'INSPECT_PAGE_IMAGES' && canSeeImages) {
        if (modelNotes) {
          controller.inspectedNotes = controller.inspectedNotes || [];
          controller.inspectedNotes.push(modelNotes.slice(0, 1200));
        }
        await PageImageToolHandler.execute(controller, inv.arg, pageData);
      } else if (inv.name === 'AUDIT_EXTERNAL_SITE' && inv.arg) {
        for (const token of String(inv.arg).split(/[\s,;]+/).filter(Boolean)) {
          externalUrls.push(token);
        }
      } else if (inv.name === 'AUDIT_YOUTUBE_VIDEO' && inv.arg) {
        youtubeTokens.push(String(inv.arg));
      }
    }

    if (youtubeTokens.length > 0) {
      const seenVid = controller.externalVideoIds || (controller.externalVideoIds = new Set());
      const ids = [];
      for (const tok of youtubeTokens) {
        const directId = /^[a-zA-Z0-9_-]{11}$/.test(tok.trim()) ? [tok.trim()] : extractAllVideoIdsFromText(tok);
        for (const id of directId) {
          if (id && !seenVid.has(id)) { seenVid.add(id); ids.push(id); }
          if (ids.length >= 5) break;
        }
        if (ids.length >= 5) break;
      }
      if (ids.length > 0) {
        const totalBudget = typeof controller._getSafeContextBudget === 'function' ? controller._getSafeContextBudget() : 9000;
        const perVidCap = Math.max(1200, Math.min(4500, Math.floor(totalBudget / ids.length)));
        const blocks = await WebPageChatHelper.fetchYoutubeTranscripts(ids, lang, perVidCap);
        controller.externalVideoTranscripts = [...(controller.externalVideoTranscripts || []), ...blocks];
      }
    }

    if (externalUrls.length > 0) {
      const uniqueTargets = [];
      const seenOrigins = controller.externalSiteOrigins || (controller.externalSiteOrigins = new Set());
      for (const raw of externalUrls) {
        try {
          const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
          if (!/^https?:$/i.test(u.protocol) || seenOrigins.has(u.origin)) continue;
          seenOrigins.add(u.origin);
          uniqueTargets.push(u);
          if (uniqueTargets.length >= 5) break;
        } catch (_) {}
      }
      if (uniqueTargets.length > 0) {
        const totalBudget = typeof controller._getSafeContextBudget === 'function' ? controller._getSafeContextBudget() : 9000;
        const perSiteCap = Math.max(1200, Math.min(4500, Math.floor(totalBudget / uniqueTargets.length)));
        await Promise.all(uniqueTargets.map((u) => WebPageChatHelper._runExternalSiteAudit(controller, u, perSiteCap)));
      }
    }
  }

  static async _runExternalSiteAudit(controller, urlObj, perSiteCap = 4500) {
    try {
      const u = typeof urlObj === 'string' ? new URL(/^https?:\/\//i.test(urlObj) ? urlObj : `https://${urlObj}`) : urlObj;
      if (!/^https?:$/i.test(u.protocol)) return;
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'FETCH_DOMAIN_AUDIT',
          origin: u.origin,
          hostname: u.hostname,
          currentUrl: u.href,
          knownLegalLinks: [],
          maxDepth: 2
        }, (r) => resolve(r || { success: false }));
      });
      const d = res?.dossier;
      if (!d) return;
      const legalText = (d.legalPages || []).map((p) => `- ${p.url} (${p.title || ''}): ${p.excerpt || ''}`).join('\n');
      const block = [
        `External Site: ${d.origin} (${d.hostname})`,
        `robots.txt: ${d.hasRobotsTxt ? 'Yes' : 'No'} | sitemap URLs: ${d.sitemapUrlCount ?? 0}`,
        `Direct Contacts: ${(d.contacts || []).join(', ') || 'None'}`,
        `Homepage (${d.home?.title || ''}): ${d.home?.excerpt || ''}`,
        legalText ? `Sub-pages:\n${legalText}` : ''
      ].filter(Boolean).join('\n');

      controller.externalSiteAudits = controller.externalSiteAudits || [];
      controller.externalSiteAudits.push(block.slice(0, perSiteCap));
    } catch (_) {}
  }

  static async fetchYoutubeTranscripts(videoIds = [], lang = 'fr', perVideoCap = 3500) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) return [];
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return [];
    const results = await Promise.all(videoIds.map((videoId) => new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'FETCH_WATCH_PAGE_TRANSCRIPT', videoId, lang }, (res) => {
        if (!res?.success || !Array.isArray(res.segments) || res.segments.length === 0) return resolve('');
        const text = res.segments.map((s) => s.text || '').join(' ').replace(/\s+/g, ' ').trim();
        if (!text) return resolve('');
        resolve(`YouTube Video: https://www.youtube.com/watch?v=${videoId}\nTranscript:\n${text.slice(0, perVideoCap)}`);
      });
    })));
    return results.filter(Boolean);
  }

  static async _runBufferedPageAudit(controller, pageData, lang, canSeeImages) {
    try {
      const prepared = await controller._prepareOversizedPageData(pageData, 'web page audit', lang);
      const { systemPrompt, userPrompt } = WebPagePromptBuilder.buildAuditPrompts(prepared, lang);
      const msg = WebPageChatHelper.attachPageImagesIfNeeded({ role: 'user', content: userPrompt }, prepared, canSeeImages, false);
      const md = await controller._runBufferedRequest({ systemPrompt, messages: [msg] });
      const body = document.getElementById('ytAiAuditBody');
      const secCard = WebAuditVisualRenderer.renderPageSecurityCard(prepared, lang);
      const parsed = body
        ? WebAuditVisualRenderer.renderFinalAudit(body, md, secCard, lang)
        : (() => { const m = /\[SCORE:\s*(\d{1,3})\s*\/\s*100\]/i.exec(md || ''); return m ? parseInt(m[1], 10) : 50; })();
      controller.auditReport = new AuditReport({ videoId: prepared.url, reliabilityScore: parsed ?? 50, rawMarkdown: md, lang });
      const t = I18N[lang] || I18N.en;
      if (parsed !== null) controller._setTabScoreBadge?.('ytAiTabAuditBtn', t.webTabAudit || '🛡️ Page Reliability', parsed);
    } catch (_) {}
  }

  static async _runBufferedSiteAudit(controller, pageData, lang) {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'FETCH_DOMAIN_AUDIT', origin: pageData.origin, hostname: pageData.hostname,
          currentUrl: pageData.url, knownLegalLinks: pageData.legalLinks, maxDepth: 2
        }, (r) => resolve(r || { success: false }));
      });
      const dossier = res?.dossier || { origin: pageData.origin, hostname: pageData.hostname, hasRobotsTxt: false, legalPages: [] };
      const { systemPrompt, userPrompt } = WebPagePromptBuilder.buildDomainAuditPrompts(pageData, dossier, lang);
      const md = await controller._runBufferedRequest({ systemPrompt, messages: [{ role: 'user', content: userPrompt.slice(0, controller._getSafeContextBudget()) }] });
      controller.domainAuditMarkdown = md;
      const box = document.getElementById('ytAiWatchChannelResultContainer');
      const domCard = WebAuditVisualRenderer.renderDomainSignalsCard(dossier, lang);
      const parsed = box
        ? WebAuditVisualRenderer.renderFinalAudit(box, md, domCard, lang)
        : (() => { const m = /\[SCORE:\s*(\d{1,3})\s*\/\s*100\]/i.exec(md || ''); return m ? parseInt(m[1], 10) : null; })();
      if (parsed !== null) {
        controller.domainAuditScore = parsed;
        const t = I18N[lang] || I18N.en;
        controller._setTabScoreBadge?.('ytAiTabChannelAuditBtn', t.webTabDomain || '🌐 Site Audit', parsed);
      }
    } catch (_) {}
  }

  static _getQueueConfig(controller, opts = {}) {
    return {
      inputId: 'ytAiChatInput', messagesId: 'ytAiChatMessages', queueContainerId: 'ytAiChatQueue', countBadgeId: 'ytAiChatCount',
      attachmentHelper: opts.attachmentHelper || controller.attachmentHelper || null,
      getLang: () => document.getElementById?.('ytAiLangSelect')?.value || controller.state?.currentLang || 'en',
      getStreamClient: (c) => c.getStreamClient?.('chat') || c.streamClient,
      onExecuteTurn: (entry, turnObj) => WebPageChatHelper._executeChatTurn(controller, entry.text, entry.attachments, turnObj, entry.ctx)
    };
  }
  static sendChat(controller, cleanText, attachments = [], opts = {}) {
    return ChatQueueHelper.enqueueOrRun(controller, { text: cleanText, attachments, ctx: opts, clearInput: true }, WebPageChatHelper._getQueueConfig(controller, opts));
  }
  static _executeChatTurn(controller, cleanText, attachments = [], turnObj = null, opts = {}) {
    const qCfg = WebPageChatHelper._getQueueConfig(controller, opts);
    const lang = qCfg.getLang();
    const mode = document.getElementById?.('ytAiModeSelect')?.value || 'standard';
    const pageData = controller.getPageData(true);
    const userBubble = ChatBubbleView.appendChatBubble('user', ChatAttachmentHelper.buildUserBubbleHtml(cleanText, attachments));
    const aiBubble = ChatBubbleView.appendChatBubble('ai', '');
    aiBubble?.classList?.add('yt-ai-typing');
    ChatQueueHelper.bindTurnBubbles(controller, turnObj, userBubble, aiBubble, qCfg);

    const cfg = controller._resolveInferenceConfig();
    if (!cfg.model) {
      if (aiBubble) aiBubble.innerHTML = `<p style="color:#ff7b72;">${escapeHtml((I18N[lang] || I18N.en).selectModelAlert || 'Please select an AI model in settings.')}</p>`;
      ChatQueueHelper.failOrEmptyTurn(controller, turnObj, qCfg); return;
    }
    const canSeeImages = ModelCapabilities.supportsImages(cfg.provider, cfg.model, controller.state?.modelCapabilities?.[cfg.model] || null);
    const launchStream = (preloaded = null) => {
      if (turnObj?.aborted) return;
      const rawMsg = ChatAttachmentHelper.buildMessagePayload(cleanText, attachments);
      const userMsg = WebPageChatHelper.attachPageImagesIfNeeded(rawMsg, pageData, canSeeImages, controller.chatHistory.length > 0 && !opts.accessibleDescribe);
      controller.inspectedImages = preloaded?.frames?.length ? preloaded : null;
      controller.inspectedNotes = [];
      if (Array.isArray(userMsg.images) && userMsg.images.length > 0) controller.deliveredImageSlices = new Set(userMsg.images.map((f, idx) => `${f.imageIndex || idx + 1}:${f.sliceIndex || 1}`));
      else if (controller.chatHistory.length === 0) controller.deliveredImageSlices = new Set();

      const buildPrompt = (withTools) => {
        const frames = controller.inspectedImages?.frames || userMsg.images || [];
        const notes = controller.inspectedNotes?.length > 0 ? `\nPrior batch notes: ${controller.inspectedNotes.join(' | ')}` : '';
        const summaryStr = `${controller.inspectedImages?.summary || ''}${notes}`.trim();
        const base = opts.accessibleDescribe
          ? AccessiblePageDescriber.buildWebPrompt(pageData, lang, frames, summaryStr)
          : WebPagePromptBuilder.buildChatSystemPrompt(pageData, lang, mode, controller.summaryMarkdown, controller.auditReport?.toChatContextBlock?.() || '', controller.domainAuditMarkdown, (controller.externalSiteAudits || []).join('\n\n'), (controller.externalVideoTranscripts || []).join('\n\n'), frames, summaryStr);
        return withTools ? `${base}${WebPageChatHelper.buildToolDirective(controller, pageData, canSeeImages)}` : base;
      };
      const tools = WebPageChatHelper.getAvailableTools(controller, pageData, canSeeImages);
      const scheduler = StreamRenderScheduler.create((md) => { if (!turnObj?.aborted && aiBubble) renderMarkdown(md, aiBubble); }, 75);
      if (turnObj) turnObj.abortFn = () => scheduler.cancel();
      const initMsg = controller.inspectedImages?.frames?.length > 0 ? { ...userMsg, images: controller.inspectedImages.frames } : userMsg;

      ChatToolProtocol.runStream({
        streamClient: controller.getStreamClient?.('chat') || controller.streamClient,
        streamConfig: { ...cfg, systemPrompt: buildPrompt(true), messages: [...controller.chatHistory.slice(-8), initMsg] },
        allowedTools: tools.map((t) => t.name), maxToolRounds: canSeeImages ? 4 : 1,
        onToolStatus: () => { if (!turnObj?.aborted) { scheduler.cancel(); if (aiBubble) aiBubble.textContent = lang === 'fr' ? '⏳ Exécution des vérifications demandées par l\'IA...' : '⏳ Running AI-requested verification tools...'; } },
        onExecuteTools: (requested, invocations, notes) => WebPageChatHelper.executeTools(controller, requested, pageData, lang, canSeeImages, invocations, notes),
        rebuildSystemPrompt: (allowTools) => buildPrompt(allowTools),
        rebuildMessages: () => [...controller.chatHistory.slice(-8), (controller.inspectedImages?.frames?.length > 0) ? { ...userMsg, images: controller.inspectedImages.frames } : userMsg],
        onStreamChunk: (md) => { if (!turnObj?.aborted) scheduler.schedule(md); },
        onComplete: (answer) => {
          if (turnObj?.aborted) return;
          scheduler.flush(); aiBubble?.classList?.remove('yt-ai-typing');
          if (answer.trim()) {
            controller.chatHistory.push({ role: 'user', content: userMsg.content, ...(userMsg.files ? { files: userMsg.files } : {}) }, { role: 'assistant', content: answer });
            const badge = document.getElementById('ytAiChatCount'); if (badge) badge.textContent = String(Math.floor(controller.chatHistory.length / 2));
            if (opts.audioController) ChatBubbleView.attachAudioButton(aiBubble, answer, opts.audioController, lang);
            if (opts.autoRead) (opts.audioController || controller.audioController)?.speakText?.(answer, aiBubble?.querySelector?.('.yt-ai-tts-btn') || null, { lang });
            ChatQueueHelper.completeTurn(controller, turnObj, qCfg);
          } else ChatQueueHelper.failOrEmptyTurn(controller, turnObj, qCfg);
        },
        onError: (err) => { scheduler.cancel(); if (!turnObj?.aborted) { if (aiBubble) aiBubble.innerHTML = `<p style="color:#ff7b72;">[x] ${escapeHtml(err)}</p>`; ChatQueueHelper.failOrEmptyTurn(controller, turnObj, qCfg); } }
      });
    };
    if (opts.accessibleDescribe) return AccessiblePageDescriber.prepareVisionContext(controller, pageData).then((pre) => launchStream(pre));
    if (canSeeImages && controller.chatHistory.length === 0 && PageVisionCollector.hasUnloadedVisuals(pageData)) {
      return PageVisionCollector.attachWebVisualFrames(controller, pageData, { role: 'user', content: cleanText }, { maxFrames: 6, maxVideoFrames: 4 })
        .then((pre) => launchStream(pre.frames?.length ? pre : null));
    }
    return launchStream(null);
  }
}

export default WebPageChatHelper;
