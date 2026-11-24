import { I18N } from '../../locales/index.js';
import { resolveContextCharLimit } from '../../config/AIProviderPresets.js';
import { WebPageExtractor } from './WebPageExtractor.js';
import { WebPagePromptBuilder } from '../../services/implementations/WebPagePromptBuilder.js';
import { ChatStreamClient } from './ChatStreamClient.js';
import { escapeHtml, safeSetInnerHTML } from '../ui/MarkdownRenderer.js';
import { WebPageChatHelper } from './WebPageChatHelper.js';
import { WebPageActionRunner } from './WebPageActionRunner.js';
import { ChatQueueHelper } from '../ui/ChatQueueHelper.js';

/**
 * Orchestrates Summary, Anti-Scam/URL/Logic Audit, Domain Audit, and Q&A
 * when the extension is activated on any non-YouTube web page.
 */
export class WebPageController {
  constructor(deps = {}) {
    this.state = deps.state;
    this.bannerView = deps.bannerView;
    this._defaultStreamClient = new ChatStreamClient();
    this.streamClient = this._defaultStreamClient;
    this._streamClients = new Map();
    this.cachedPageData = null;
    this.summaryMarkdown = '';
    this.auditReport = null;
    this.domainAuditMarkdown = '';
    this.domainAuditScore = null;
    this.externalSiteAudits = [];
    this.externalVideoTranscripts = [];
    this.externalVideoIds = new Set();
    this.chatHistory = [];
    this.isSummarizing = false;
    this.isAuditing = false;
    this.isDomainAuditing = false;
  }

  getStreamClient(channel = 'default') {
    if (this.streamClient !== this._defaultStreamClient) return this.streamClient;
    if (!this._streamClients.has(channel)) {
      this._streamClients.set(channel, new ChatStreamClient());
    }
    return this._streamClients.get(channel);
  }

  abortAll() {
    for (const c of Object.values(this._actionAborters || {})) c?.abort?.('stopped');
    this._actionAborters = {};
    ChatQueueHelper.clearAll(this, { queueContainerId: 'ytAiChatQueue' });
    this._defaultStreamClient?.disconnect?.();
    if (this.streamClient !== this._defaultStreamClient) this.streamClient?.disconnect?.();
    for (const c of this._streamClients.values()) c?.disconnect?.();
    this.isSummarizing = false;
    this.isAuditing = false;
    this.isDomainAuditing = false;
  }

  getPageData(forceRefresh = false) {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (!forceRefresh && this.cachedPageData && this.cachedPageData.url === currentUrl) {
      return this.cachedPageData;
    }
    this.cachedPageData = WebPageExtractor.extractPageContent(document, currentUrl);
    this._renderExtractedContentTab(this.cachedPageData);
    return this.cachedPageData;
  }

  applyWebPageUiLabels(lang) {
    const t = I18N[lang] || I18N.en;
    const pageData = this.getPageData();
    const cancelLabel = t.webCancelBtn || t.stopListenBtn || '⏹️ Stop';
    const pairs = [
      ['#ytAiTabSummaryBtn', t.webTabSummary || '📄 Page Summary'],
      ['#ytAiTabAuditBtn', t.webTabAudit || '🛡️ Page Reliability'],
      ['#ytAiRunAuditBtn', this.isAuditing ? cancelLabel : (t.webRunAuditBtn || '⚡ Audit Page')],
      ['#ytAiTabChannelAuditBtn', t.webTabDomain || '🌐 Site Audit'],
      ['#ytAiWatchChannelTitle', t.webDomainAuditTitle || '🌐 Website & Trust Audit'],
      ['#ytAiWatchChannelHandle', pageData.hostname || ''],
      ['#ytAiRunWatchChannelAuditBtn', this.isDomainAuditing ? cancelLabel : (t.webRunDomainAuditBtn || '⚡ Audit Site')],
      ['#ytAiTranscriptHeaderTitle', t.webExtractedTitle || '📜 Extracted Page & URL Signals'],
      ['#ytAiSummarizeBtn', this.isSummarizing ? cancelLabel : (t.webSummarizeBtn || '✨ Summarize Page')],
      ['#ytAiPaneChat .yt-ai-pane-title span', t.tabChat || '💬 Ask questions'],
      ['#ytAiAuditBody .yt-ai-placeholder-text', t.webRunAuditBtn || '⚡ Audit Page'],
      ['#ytAiWatchChannelResultContainer .yt-ai-placeholder-text', t.webRunDomainAuditBtn || '⚡ Audit Site'],
      ['#ytAiPaneChannelAudit .yt-ai-max-label', t.webDepthLabel || 'Scan depth:']
    ];
    pairs.forEach(([sel, txt]) => { const el = document.querySelector(sel); if (el && txt) el.textContent = txt; });
    if (typeof this.auditReport?.reliabilityScore === 'number') {
      this._setTabScoreBadge('ytAiTabAuditBtn', t.webTabAudit || '🛡️ Page Reliability', this.auditReport.reliabilityScore);
    }
    if (typeof this.domainAuditScore === 'number') {
      this._setTabScoreBadge('ytAiTabChannelAuditBtn', t.webTabDomain || '🌐 Site Audit', this.domainAuditScore);
    }
    document.querySelectorAll('#ytAiPaneChannelAudit .yt-ai-period-pill, #ytAiPaneChannelAudit .yt-ai-period-label')
      .forEach((el) => el.classList?.add('yt-ai-hidden'));
    document.getElementById('ytAiTabTranscriptBtn')?.classList?.add('yt-ai-hidden');
    document.getElementById('ytAiPaneTranscript')?.classList?.add('yt-ai-hidden');
    const depthSelect = document.getElementById('ytAiWatchChannelMaxVideos');
    if (depthSelect) {
      const unit = t.webDepthLevelUnit || 'level(s)';
      const prev = depthSelect.value;
      safeSetInnerHTML(depthSelect, [1, 2, 3, 4].map((n) => `<option value="${n}">${n} ${escapeHtml(unit)}</option>`).join(''));
      depthSelect.value = ['1', '2', '3', '4'].includes(prev) ? prev : '2';
    }
  }

  _setTabScoreBadge(tabId, label, score) {
    const tabBtn = document.getElementById(tabId);
    if (!tabBtn || typeof score !== 'number') return;
    const badgeColor = score >= 75 ? 'yt-ai-badge-success' : score >= 50 ? 'yt-ai-badge-warning' : 'yt-ai-badge-danger';
    safeSetInnerHTML(tabBtn, `${escapeHtml(label)} <span class="yt-ai-tab-count-badge ${badgeColor}">${score}/100</span>`);
  }

  _renderExtractedContentTab(pageData) {
    const body = document.getElementById('ytAiTranscriptBody');
    const countEl = document.getElementById('ytAiWordCount');
    const tabBadge = document.getElementById('ytAiWordCountTab');
    const lang = this.state?.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    if (countEl) countEl.textContent = String(pageData.wordCount || 0);
    if (tabBadge) tabBadge.textContent = `${pageData.wordCount || 0} ${t.wordsBadge || 'words'}`;
    if (!body) return;
    const warningsHtml = (pageData.warnings || []).length > 0
      ? pageData.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')
      : '<li>OK</li>';
    safeSetInnerHTML(body, `<div class="yt-ai-markdown"><p><strong>URL:</strong> ${escapeHtml(pageData.url)}<br><strong>Risk:</strong> ${escapeHtml(pageData.riskLevel)}</p><ul>${warningsHtml}</ul><hr><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(pageData.text || '')}</pre></div>`);
  }

  _resolveInferenceConfig() {
    const provider = this.state?.currentProvider || 'lmstudio';
    const model = typeof this.state?.getActiveModel === 'function' ? this.state.getActiveModel() : (this.state?.selectedModel || '');
    return {
      provider, model,
      apiKey: this.state?.apiKeys?.[provider] || '',
      serverUrl: this.state?.serverUrls?.[provider] || '',
      temperature: this.state?.temperature || '0.3',
      maxTokens: this.state?.maxTokens || 'auto',
      localContextLength: this.state?.localContextLength || 'auto'
    };
  }
  _streamIntoTarget(opts) {
    WebPageActionRunner.streamIntoTarget({ controller: this, ...opts });
  }
  static splitTextChunks(text = '', budget = 10000) {
    const clean = String(text || '');
    if (clean.length <= budget) return [clean];
    const chunks = [];
    for (let i = 0; i < clean.length; i += budget) chunks.push(clean.slice(i, i + budget));
    return chunks;
  }

  static packDomainBatches(pages = [], budget = 10000) {
    const batches = [];
    let current = [], currentLen = 0;
    for (const p of pages) {
      const entry = `- ${p.url} (${p.title || 'No title'}):\n  ${p.excerpt || ''}`;
      if (current.length > 0 && currentLen + entry.length > budget) {
        batches.push(current.join('\n\n'));
        current = [entry];
        currentLen = entry.length;
      } else { current.push(entry); currentLen += entry.length; }
    }
    if (current.length > 0) batches.push(current.join('\n\n'));
    return batches;
  }

  _getSafeContextBudget() {
    const cfg = this._resolveInferenceConfig();
    return Math.max(4000, resolveContextCharLimit(cfg.provider, cfg.localContextLength) - 2500);
  }

  _runBufferedRequest({ systemPrompt, messages, signal = null }) {
    const cfg = this._resolveInferenceConfig();
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new Error('Aborted')); return; }
      let out = '';
      const client = new ChatStreamClient();
      const onAbort = () => { client.disconnect(); reject(new Error('Aborted')); };
      signal?.addEventListener?.('abort', onAbort, { once: true });
      client.startStream({
        ...cfg, systemPrompt, messages,
        onChunk: (c) => { out += c; },
        onCancel: () => { signal?.removeEventListener?.('abort', onAbort); reject(new Error('Aborted')); },
        onDone: () => { signal?.removeEventListener?.('abort', onAbort); resolve(out); },
        onError: (err) => { signal?.removeEventListener?.('abort', onAbort); reject(new Error(err || 'Stream failed')); }
      });
    });
  }

  async _prepareOversizedPageData(pageData, kindLabel, lang, signal = null) {
    const budget = this._getSafeContextBudget();
    if (!pageData?.text || pageData.text.length <= budget) return pageData;
    const chunks = WebPageController.splitTextChunks(pageData.text, budget);
    const digests = [];
    for (let i = 0; i < chunks.length; i += 1) {
      if (signal?.aborted) throw new Error('Aborted');
      const { systemPrompt, userPrompt } = WebPagePromptBuilder.buildChunkDigestPrompts(chunks[i], `${kindLabel} (${i + 1}/${chunks.length})`, lang);
      const d = await this._runBufferedRequest({ systemPrompt, messages: [{ role: 'user', content: userPrompt }], signal }).catch(() => chunks[i].slice(0, Math.floor(budget / chunks.length)));
      digests.push(d);
    }
    return { ...pageData, text: digests.join('\n\n') };
  }

  async _attachEmbeddedVideoTranscripts(pageData, lang) {
    const vids = Array.isArray(pageData?.youtubeVideos) ? pageData.youtubeVideos.slice(0, 2) : [];
    if (vids.length === 0) return pageData;
    const blocks = await WebPageChatHelper.fetchYoutubeTranscripts(vids.map((v) => v.videoId), lang, 3500).catch(() => []);
    if (!blocks || blocks.length === 0) return pageData;
    return { ...pageData, embeddedVideoTranscripts: blocks.join('\n\n') };
  }

  triggerSummary() {
    return WebPageActionRunner.runSummary(this);
  }

  triggerPageAudit() {
    return WebPageActionRunner.runPageAudit(this);
  }

  triggerDomainAudit() {
    return WebPageActionRunner.runDomainAudit(this, WebPageController.packDomainBatches);
  }

  sendChatMessage(text, attachments = [], opts = {}) {
    const cleanText = String(text || '').trim();
    if (!cleanText && attachments.length === 0) return;
    this.bannerView?.setExpanded?.(true);
    this.bannerView?.switchTab?.('chat');
    return WebPageChatHelper.sendChat(this, cleanText, attachments, opts);
  }

  clearChat() {
    ChatQueueHelper.clearAll(this, { queueContainerId: 'ytAiChatQueue' });
    this.chatHistory = [];
    this.getStreamClient('chat')?.disconnect?.();
  }
}

export default WebPageController;
