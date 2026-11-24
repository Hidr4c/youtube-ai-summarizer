import { I18N } from '../../locales/index.js';
import { ModelCapabilities } from '../../config/ModelCapabilities.js';
import { AuditReport } from '../../domain/models/AuditReport.js';
import { WebPagePromptBuilder } from '../../services/implementations/WebPagePromptBuilder.js';
import { WebAuditVisualRenderer } from '../ui/WebAuditVisualRenderer.js';
import { StreamRenderScheduler } from '../ui/StreamRenderScheduler.js';
import { renderMarkdown, escapeHtml, safeSetInnerHTML, stripScoreTags } from '../ui/MarkdownRenderer.js';
import { WebPageChatHelper } from './WebPageChatHelper.js';
import { PageVisionCollector } from './PageVisionCollector.js';

/**
 * Manages busy-state buttons, re-entry locks, and resilient streaming
 * across Web Page Summary, Page Audit, and Site Audit actions.
 */
export class WebPageActionRunner {
  static setBusyButton(btnId, busy, lang = 'en', idleFallback = '') {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById?.(btnId);
    if (!btn) return;
    const t = I18N[lang] || I18N.en;
    btn.disabled = false;
    if (typeof btn.classList?.toggle === 'function') btn.classList.toggle('yt-ai-btn-stop', Boolean(busy));
    else if (busy) btn.classList?.add?.('yt-ai-btn-stop');
    else btn.classList?.remove?.('yt-ai-btn-stop');
    if (busy) {
      if (btn.dataset && !btn.dataset.ytAiIdleLabel) btn.dataset.ytAiIdleLabel = btn.textContent || idleFallback;
      btn.textContent = t.webCancelBtn || t.stopListenBtn || '⏹️ Stop';
    } else {
      btn.textContent = idleFallback || btn.dataset?.ytAiIdleLabel || btn.textContent;
      if (btn.dataset) delete btn.dataset.ytAiIdleLabel;
    }
  }

  static cancelAction(ctrl, { channel = 'default', flagKey, btnId, bodyId, idleText } = {}) {
    ctrl._actionAborters?.[channel]?.abort?.('stopped');
    if (ctrl._actionAborters) delete ctrl._actionAborters[channel];
    ctrl._actionTokens = ctrl._actionTokens || {};
    ctrl._actionTokens[channel] = (ctrl._actionTokens[channel] || 0) + 1;
    const client = typeof ctrl.getStreamClient === 'function' ? ctrl.getStreamClient(channel) : ctrl.streamClient;
    client?.disconnect?.();
    if (flagKey) ctrl[flagKey] = false;
    const lang = ctrl.state?.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    if (btnId) WebPageActionRunner.setBusyButton(btnId, false, lang, idleText);
    const body = bodyId && typeof document !== 'undefined' ? document.getElementById?.(bodyId) : null;
    if (body) {
      const hasRichOutput = Boolean(body.querySelector?.('.yt-ai-audit-hero, .yt-ai-markdown, .yt-ai-section-card'));
      if (!hasRichOutput) {
        safeSetInnerHTML(body, `<p class="yt-ai-stopped-note">${escapeHtml(t.auditStoppedNote || '⏹ Processing stopped by user.')}</p>`);
      }
    }
  }

  static hasRenderableOutput(rawText = '') {
    const clean = stripScoreTags(rawText || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return Boolean(clean || /\[SCORE:\s*\d{1,3}\s*\/\s*100\]/i.test(rawText || ''));
  }

  static streamIntoTarget({
    controller, channel = 'default', targetEl, streamElId, prefixHtml = '', lang = 'en',
    systemPrompt, messages, onComplete, onFinally
  }) {
    const cfg = controller._resolveInferenceConfig();
    const t = I18N[lang] || I18N.en;
    let settled = false;
    const finish = () => { if (!settled) { settled = true; onFinally?.(); } };

    if (!cfg.model) {
      if (targetEl) safeSetInnerHTML(targetEl, `${prefixHtml}<p style="color:#ff7b72;">${escapeHtml(t.selectModelAlert || 'Please select an AI model in settings.')}</p>`);
      finish();
      return;
    }

    const waitTxt = escapeHtml(t.auditAnalyzing || 'Analyzing...');
    if (targetEl) {
      safeSetInnerHTML(targetEl, `${prefixHtml}<div id="${streamElId}"><span class="yt-ai-spinner"></span> <span class="yt-ai-web-wait" style="color:var(--yt-ai-text-muted);font-size:12px;">${waitTxt}</span></div>`);
    }

    const getStreamBox = () => (typeof document !== 'undefined' ? document.getElementById?.(streamElId) : null) || targetEl;
    let fullText = '';
    const scheduler = StreamRenderScheduler.create((md) => {
      const box = getStreamBox();
      const visible = stripScoreTags(md);
      if (box && visible.trim()) renderMarkdown(visible, box, { sectionCards: true });
    }, 75);

    const client = typeof controller.getStreamClient === 'function' ? controller.getStreamClient(channel) : controller.streamClient;
    client.startStream({
      ...cfg,
      systemPrompt,
      messages,
      onReasoning: () => {
        if (fullText) return;
        const waitEl = getStreamBox()?.querySelector?.('.yt-ai-web-wait');
        if (waitEl) waitEl.textContent = t.webReasoningWait || '💭 Model is reasoning...';
      },
      onChunk: (chunk) => { fullText += chunk; scheduler.schedule(fullText); },
      onCancel: () => { scheduler.cancel(); finish(); },
      onDone: () => {
        scheduler.flush();
        if (!WebPageActionRunner.hasRenderableOutput(fullText)) {
          if (targetEl) {
            const msg = t.webEmptyAiResponse || 'The AI model returned no analysis text.';
            safeSetInnerHTML(targetEl, `${prefixHtml}<p class="yt-ai-web-empty-warn" style="margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid #d2992266;color:#d29922;">⚠️ ${escapeHtml(msg)}</p>`);
          }
          finish();
          return;
        }
        try { onComplete?.(fullText); } finally { finish(); }
      },
      onError: (err) => {
        scheduler.cancel();
        if (targetEl) safeSetInnerHTML(targetEl, `${prefixHtml}<p style="color:#ff7b72;">[x] ${escapeHtml(err)}</p>`);
        finish();
      }
    });
  }

  static async _runGuarded(ctrl, { channel = 'default', tab, flagKey, btnId, bodyId, idleText }, fn) {
    if (ctrl[flagKey]) {
      WebPageActionRunner.cancelAction(ctrl, { channel, flagKey, btnId, bodyId, idleText });
      return;
    }
    ctrl.bannerView?.setExpanded?.(true);
    ctrl.bannerView?.switchTab?.(tab);
    const lang = ctrl.state?.currentLang || 'en';
    const body = typeof document !== 'undefined' ? document.getElementById?.(bodyId) : null;
    ctrl[flagKey] = true;
    ctrl._actionAborters = ctrl._actionAborters || {};
    ctrl._actionTokens = ctrl._actionTokens || {};
    const abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    ctrl._actionAborters[channel] = abortCtrl;
    const token = (ctrl._actionTokens[channel] || 0) + 1;
    ctrl._actionTokens[channel] = token;
    const isCanceled = () => Boolean(abortCtrl?.signal?.aborted) || ctrl._actionTokens?.[channel] !== token;

    WebPageActionRunner.setBusyButton(btnId, true, lang);
    if (body) body.innerHTML = '<span class="yt-ai-spinner"></span>';
    const release = () => {
      if (ctrl._actionAborters?.[channel] === abortCtrl) delete ctrl._actionAborters[channel];
      if (ctrl._actionTokens?.[channel] !== token) return;
      ctrl[flagKey] = false;
      WebPageActionRunner.setBusyButton(btnId, false, lang, idleText);
    };
    try {
      await fn(lang, body, release, { signal: abortCtrl?.signal || null, isCanceled });
    } catch (err) {
      if (isCanceled()) return;
      if (body) safeSetInnerHTML(body, `<p style="color:#ff7b72;">[x] ${escapeHtml(err?.message || String(err))}</p>`);
      release();
    }
  }

  static runSummary(ctrl) {
    const lang = ctrl.state?.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    return WebPageActionRunner._runGuarded(
      ctrl,
      { channel: 'summary', tab: 'summary', flagKey: 'isSummarizing', btnId: 'ytAiSummarizeBtn', bodyId: 'ytAiSummaryBody', idleText: t.webSummarizeBtn || '✨ Summarize Page' },
      async (l, body, release, { signal, isCanceled }) => {
        const mode = document.getElementById?.('ytAiModeSelect')?.value || 'standard';
        const baseData = await ctrl._prepareOversizedPageData(ctrl.getPageData(true), 'web page', l, signal);
        if (isCanceled()) return;
        const pageData = await ctrl._attachEmbeddedVideoTranscripts(baseData, l);
        if (isCanceled()) return;
        const { systemPrompt, userPrompt } = WebPagePromptBuilder.buildSummaryPrompts(pageData, l, mode);
        const vis = await PageVisionCollector.attachWebVisualFrames(ctrl, pageData, { role: 'user', content: userPrompt }, { maxFrames: 6, maxVideoFrames: 4 });
        if (isCanceled()) return;
        ctrl._streamIntoTarget({
          channel: 'summary', targetEl: body, streamElId: 'ytAiWebSummaryStream', lang: l,
          systemPrompt, messages: [vis.message],
          onComplete: (md) => { ctrl.summaryMarkdown = md; },
          onFinally: release
        });
      }
    );
  }

  static runPageAudit(ctrl) {
    const lang = ctrl.state?.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    return WebPageActionRunner._runGuarded(
      ctrl,
      { channel: 'audit', tab: 'audit', flagKey: 'isAuditing', btnId: 'ytAiRunAuditBtn', bodyId: 'ytAiAuditBody', idleText: t.webRunAuditBtn || '⚡ Audit Page' },
      async (l, body, release, { signal, isCanceled }) => {
        const auditMode = (typeof document !== 'undefined' ? document.getElementById?.('ytAiAuditModeSelect')?.value : null) || ctrl.state?.auditMode || 'standard';
        const baseData = await ctrl._prepareOversizedPageData(ctrl.getPageData(true), 'web page audit', l, signal);
        if (isCanceled()) return;
        const pageData = await ctrl._attachEmbeddedVideoTranscripts(baseData, l);
        if (isCanceled()) return;
        const secCard = WebAuditVisualRenderer.renderPageSecurityCard(pageData, l);
        const { systemPrompt, userPrompt } = WebPagePromptBuilder.buildAuditPrompts(pageData, l, auditMode);
        const vis = await PageVisionCollector.attachWebVisualFrames(ctrl, pageData, { role: 'user', content: userPrompt }, { maxFrames: 5, maxCanvasImages: 2, maxVideoFrames: 3 });
        if (isCanceled()) return;
        ctrl._streamIntoTarget({
          channel: 'audit', targetEl: body, streamElId: 'ytAiWebAuditStream', prefixHtml: secCard, lang: l,
          systemPrompt, messages: [vis.message],
          onComplete: (md) => {
            const parsed = WebAuditVisualRenderer.renderFinalAudit(body, md, secCard, l);
            ctrl.auditReport = new AuditReport({ videoId: pageData.url, reliabilityScore: parsed ?? 50, rawMarkdown: md, lang: l });
            if (parsed !== null) ctrl._setTabScoreBadge('ytAiTabAuditBtn', (I18N[l] || I18N.en).webTabAudit || '🛡️ Page Reliability', parsed);
          },
          onFinally: release
        });
      }
    );
  }

  static runDomainAudit(ctrl, splitBatchesFn) {
    const lang = ctrl.state?.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    return WebPageActionRunner._runGuarded(
      ctrl,
      { channel: 'domain', tab: 'channelAudit', flagKey: 'isDomainAuditing', btnId: 'ytAiRunWatchChannelAuditBtn', bodyId: 'ytAiWatchChannelResultContainer', idleText: t.webRunDomainAuditBtn || '⚡ Audit Site' },
      async (l, box, release, { signal, isCanceled }) => {
        const pageData = ctrl.getPageData(true);
        const handleEl = document.getElementById?.('ytAiWatchChannelHandle');
        if (handleEl) handleEl.textContent = pageData.hostname || '';
        const maxDepth = Math.max(1, Math.min(4, parseInt(document.getElementById?.('ytAiWatchChannelMaxVideos')?.value, 10) || 2));
        const res = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'FETCH_DOMAIN_AUDIT',
            origin: pageData.origin,
            hostname: pageData.hostname,
            currentUrl: pageData.url,
            knownLegalLinks: pageData.legalLinks,
            maxDepth
          }, (r) => resolve(r || { success: false }));
        });
        if (isCanceled()) return;
        const dossier = res?.dossier || { origin: pageData.origin, hostname: pageData.hostname, hasRobotsTxt: false, legalPages: [] };
        const domCard = WebAuditVisualRenderer.renderDomainSignalsCard(dossier, l);
        if (box) safeSetInnerHTML(box, `${domCard}<span class="yt-ai-spinner"></span>`);
        const budget = ctrl._getSafeContextBudget();
        const domainMode = (typeof document !== 'undefined' ? document.getElementById?.('ytAiChannelAuditModeSelect')?.value : null) || ctrl.state?.channelAuditMode || 'standard';
        const singlePass = WebPagePromptBuilder.buildDomainAuditPrompts(pageData, dossier, l, domainMode);
        const renderDomDone = (md) => {
          ctrl.domainAuditMarkdown = md;
          const parsed = WebAuditVisualRenderer.renderFinalAudit(box, md, domCard, l);
          if (parsed !== null) {
            ctrl.domainAuditScore = parsed;
            ctrl._setTabScoreBadge('ytAiTabChannelAuditBtn', (I18N[l] || I18N.en).webTabDomain || '🌐 Site Audit', parsed);
          }
        };

        if (singlePass.userPrompt.length <= budget || (dossier.legalPages || []).length <= 1) {
          const domVis = await PageVisionCollector.attachWebVisualFrames(ctrl, pageData, { role: 'user', content: singlePass.userPrompt }, { maxFrames: 4, maxCanvasImages: 2, maxVideoFrames: 2 });
          if (isCanceled()) return;
          ctrl._streamIntoTarget({ channel: 'domain', targetEl: box, streamElId: 'ytAiWebDomainStream', prefixHtml: domCard, lang: l, systemPrompt: singlePass.systemPrompt, messages: [domVis.message], onComplete: renderDomDone, onFinally: release });
          return;
        }
        const batches = splitBatchesFn(dossier.legalPages, Math.max(2500, budget - 1000));
        const digests = [];
        for (let i = 0; i < batches.length; i += 1) {
          if (isCanceled()) return;
          const { systemPrompt, userPrompt } = WebPagePromptBuilder.buildChunkDigestPrompts(batches[i], `domain pages batch ${i + 1}/${batches.length}`, l);
          const d = await ctrl._runBufferedRequest({ systemPrompt, messages: [{ role: 'user', content: userPrompt }], signal }).catch(() => batches[i].slice(0, Math.floor(budget / batches.length)));
          digests.push(d);
        }
        if (isCanceled()) return;
        const consolidated = WebPagePromptBuilder.buildConsolidatedDomainPrompts(pageData, dossier, digests, l, domainMode);
        const domVis = await PageVisionCollector.attachWebVisualFrames(ctrl, pageData, { role: 'user', content: consolidated.userPrompt }, { maxFrames: 4, maxCanvasImages: 2, maxVideoFrames: 2 });
        if (isCanceled()) return;
        ctrl._streamIntoTarget({ channel: 'domain', targetEl: box, streamElId: 'ytAiWebDomainStream', prefixHtml: domCard, lang: l, systemPrompt: consolidated.systemPrompt, messages: [domVis.message], onComplete: renderDomDone, onFinally: release });
      }
    );
  }
}

export default WebPageActionRunner;
