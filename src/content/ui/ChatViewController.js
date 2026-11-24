import { I18N } from '../../locales/index.js';
import { resolveContextCharLimit } from '../../config/AIProviderPresets.js';
import { renderMarkdown, escapeHtml } from './MarkdownRenderer.js';
import { getVideoId, extractAllVideoIdsFromText, getActiveVideoElement } from './NavigationObserver.js';
import { ChatTranscriptManager } from '../services/ChatTranscriptManager.js';
import { ChannelIntelligenceManager } from '../services/ChannelIntelligenceManager.js';
import { VideoCommentsManager } from '../services/VideoCommentsManager.js';
import { ChatStreamClient } from '../services/ChatStreamClient.js';
import { ChatBubbleView } from './ChatBubbleView.js';
import { ChatAttachmentHelper } from './ChatAttachmentHelper.js';
import { QuickOnboardingHelper } from '../services/QuickOnboardingHelper.js';
import { ChatToolProtocol } from '../services/ChatToolProtocol.js';
import { WebPageChatHelper } from '../services/WebPageChatHelper.js';
import { StreamRenderScheduler } from './StreamRenderScheduler.js';
import { ChatQueueHelper } from './ChatQueueHelper.js';
import { AccessiblePageDescriber } from './AccessiblePageDescriber.js';

/**
 * Controller for Interactive Video Q&A Chat Tab
 */
export class ChatViewController {
  constructor(dependencies = {}) {
    this.transcriptController = dependencies.transcriptController;
    this.promptService = dependencies.promptService;
    this.audioController = dependencies.audioController;
    this.summaryViewController = dependencies.summaryViewController;
    this.auditViewController = dependencies.auditViewController;
    this.transcriptManager = new ChatTranscriptManager();
    this.channelManager = new ChannelIntelligenceManager();
    this.commentsManager = new VideoCommentsManager();
    this.streamClient = new ChatStreamClient();
    this.attachmentHelper = new ChatAttachmentHelper({
      getLang: () => this.lastLang || document.getElementById('ytAiLangSelect')?.value || 'en',
      onNotice: (msg) => this.appendChatBubble('ai', `<span style="color: #ff7b72;">[!] ${escapeHtml(msg)}</span>`)
    });
    this.chatHistory = [];
    this.externalSiteAudits = [];
    this.externalSiteOrigins = new Set();
    this.lastLang = null;
  }

  get chatPort() { return this.streamClient.port; }
  set chatPort(val) { this.streamClient.port = val; }
  get cachedExternalTranscripts() { return this.transcriptManager.cachedExternalTranscripts; }
  static scrollToBottom(el) { ChatBubbleView.scrollToBottom(el); }
  appendChatBubble(role, contentHtml) { return ChatBubbleView.appendChatBubble(role, contentHtml); }
  attachAudioButtonToBubble(bubble, answerText, currentLang = 'en') { return ChatBubbleView.attachAudioButton(bubble, answerText, this.audioController, currentLang); }

  handleClearChat(currentLang = 'en') {
    ChatQueueHelper.clearAll(this, this._getQueueConfig({ currentLang }));
    this.chatHistory = [];
    this.externalSiteAudits = [];
    this.externalSiteOrigins = new Set();
    this.attachmentHelper.clear();
    this.transcriptManager.reset();
    this.channelManager.reset();
    this.commentsManager.reset();
    this.streamClient.disconnect();
    if (this.audioController) { this.audioController.stopSpeech(); this.audioController.stopDictation(); }
    const container = document.getElementById('ytAiChatMessages');
    const chatCountBadge = document.getElementById('ytAiChatCount');
    const t = I18N[currentLang] || I18N.en;
    if (container) container.innerHTML = `<div class="yt-ai-chat-bubble ai yt-ai-markdown">${t.chatResetNotice || 'Conversation reset. Ask any question about the video content!'}</div>`;
    if (chatCountBadge) chatCountBadge.textContent = '0';
    const inputEl = document.getElementById('ytAiChatInput');
    if (inputEl?.style) inputEl.style.height = 'auto';
  }

  resetChatOutput(currentLang = 'en') { this.handleClearChat(currentLang); }
  resetChatForNewVideo(currentLang = 'en') { this.handleClearChat(currentLang); }

  applyLanguage(lang) {
    const t = I18N[lang] || I18N.en;
    if (this.chatHistory.length === 0) {
      const container = document.getElementById("ytAiChatMessages");
      if (container) container.innerHTML = `<div class="yt-ai-chat-bubble ai yt-ai-markdown">${escapeHtml(t.chatWelcome || "Hello! Ask me any question about the content of this video.")}</div>`;
    } else {
      this.handleClearChat(lang);
    }
    this.lastLang = lang;
  }

  toggleDictation(options) {
    return this.audioController?.toggleDictation(options);
  }

  _getQueueConfig(ctx = {}) {
    return {
      inputId: 'ytAiChatInput', messagesId: 'ytAiChatMessages', queueContainerId: 'ytAiChatQueue', countBadgeId: 'ytAiChatCount',
      attachmentHelper: this.attachmentHelper,
      getLang: () => document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || ctx.state?.currentLang || this.lastLang || 'en',
      getStreamClient: (c) => c.streamClient,
      onExecuteTurn: (entry, turnObj) => this._executeChatTurn(entry.text, entry.attachments, entry.ctx, turnObj)
    };
  }

  handleSendChatMessage(customText = null, ctx = {}) {
    this.audioController?.stopDictation();
    const inputEl = document.getElementById('ytAiChatInput');
    const text = (customText || inputEl?.value || '').trim();
    const attachments = customText ? [] : this.attachmentHelper.consume();
    if (!text && attachments.length === 0) return;
    if (typeof ctx.setExpanded === 'function') ctx.setExpanded(true);
    if (typeof ctx.switchTab === 'function') ctx.switchTab('chat');
    return ChatQueueHelper.enqueueOrRun(this, { text, attachments, ctx, clearInput: true }, this._getQueueConfig(ctx));
  }

  async _executeChatTurn(text, attachments = [], ctx = {}, turnObj = null) {
    const qCfg = this._getQueueConfig(ctx);
    const stateObj = (ctx && typeof ctx === 'object') ? (ctx.state || ctx) : {};
    const messagesContainer = document.getElementById('ytAiChatMessages');
    const chatCountBadge = document.getElementById('ytAiChatCount');
    const lang = document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || stateObj.currentLang || 'en';
    const t = I18N[lang] || I18N.en;

    const userBubble = this.appendChatBubble('user', ChatAttachmentHelper.buildUserBubbleHtml(text, attachments));
    ChatQueueHelper.bindTurnBubbles(this, turnObj, userBubble, null, qCfg);
    const userMsg = ChatAttachmentHelper.buildMessagePayload(text, attachments);

    const activeModel = (typeof ctx.getActiveModel === 'function' ? ctx.getActiveModel() : null) ||
      (typeof stateObj.getActiveModel === 'function' ? stateObj.getActiveModel() : null) ||
      ctx.selectedModel || stateObj.selectedModels?.[stateObj.currentProvider] || stateObj.selectedModel || '';
    if (!activeModel) { this.appendChatBubble('ai', t.selectModelAlert || 'Please select an AI model in the settings toolbar above.'); ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg); return; }
    const currentProvider = ctx.currentProvider || stateObj.currentProvider || 'lmstudio';
    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const key = (ctx.apiKeys || stateObj.apiKeys || {})[currentProvider] || '';
    if (!isLocal && !key) { this.appendChatBubble('ai', QuickOnboardingHelper.formatMissingKeyNotice(currentProvider, lang)); ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg); return; }

    const currentVideoId = getVideoId();
    const newExternalIds = extractAllVideoIdsFromText(text).filter(id => id && id !== currentVideoId);
    if (newExternalIds.length > 0) this.transcriptManager.registerExternalIds(newExternalIds);
    const activeExternalIds = this.transcriptManager.getActiveExternalIds();
    const isMultiVideo = activeExternalIds.length > 0;

    const isCurrentValid = this.transcriptController.cachedTranscript?.segments?.length > 0 &&
      (!currentVideoId || this.transcriptController.cachedTranscript.videoId === currentVideoId);
    if (!isCurrentValid) {
      const waitNotice = t.extractingTranscriptNotice || 'Extracting video transcript...';
      const waitBubble = this.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(waitNotice)}`);
      waitBubble?.classList?.add('yt-ai-status-bubble');
      const segments = await this.transcriptController.extractYouTubeTranscript(lang, true);
      waitBubble?.remove?.();
      if (turnObj?.aborted) return;
      if ((!segments || segments.length === 0) && !isMultiVideo) {
        const errBubble = this.appendChatBubble('ai', `<span style="color: #ff7b72;">[x] ${escapeHtml(t.noTranscriptError || 'Unable to extract video transcript.')}</span>`);
        ChatQueueHelper.bindTurnBubbles(this, turnObj, userBubble, errBubble, qCfg);
        ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
        return;
      }
    }

    if (isMultiVideo) {
      let waitBubble = null;
      const { loaded, failed } = await this.transcriptManager.ensureTranscriptsLoaded(
        activeExternalIds, this.transcriptController, lang,
        (vid, isStart) => {
          if (isStart) {
            const notice = (t.fetchingExternalTranscriptNotice || 'Fetching subtitles for external video ({videoId})...').replace('{videoId}', vid);
            waitBubble = this.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(notice)}`);
            waitBubble?.classList?.add('yt-ai-status-bubble');
          } else { waitBubble?.remove?.(); }
        }
      );
      if (turnObj?.aborted) return;
      if (loaded.length === 0 && failed.length > 0) {
        const errorMsg = (t.externalTranscriptError || 'Unable to retrieve subtitles for external video ({videoId}).').replace('{videoId}', failed.join(', '));
        const errBubble = this.appendChatBubble('ai', `<span style="color: #ff7b72;">[x] ${escapeHtml(errorMsg)}</span>`);
        ChatQueueHelper.bindTurnBubbles(this, turnObj, userBubble, errBubble, qCfg);
        ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
        return;
      }
    }

    if (typeof this.transcriptController?.requestPlayerDataFromMainWorld === 'function' &&
        (!this.transcriptController.cachedVideoMetadata?.description || this.transcriptController.cachedVideoMetadata?.videoId !== currentVideoId)) {
      await this.transcriptController.requestPlayerDataFromMainWorld(currentVideoId, lang).catch(() => {});
      if (turnObj?.aborted) return;
    }

    const currentMeta = ctx.getVideoMetadata ? ctx.getVideoMetadata() : this.transcriptController.cachedVideoMetadata;
    const currentFullText = this.transcriptController.cachedTranscript?.fullText || '';
    const localCtx = ctx.localContextLength || stateObj.localContextLength || 'auto';
    const maxChars = resolveContextCharLimit(currentProvider, localCtx);
    const condenseFn = this.promptService.constructor.condenseTranscriptForContext;
    const { safeTranscript, meta } = this.transcriptManager.buildMultiVideoContext(currentVideoId, currentMeta, currentFullText, maxChars, condenseFn);

    let channelDossierBlock = '';
    const channelIntent = this.channelManager.detectChannelIntent(text, meta?.author, meta?.channelUrl);
    if (channelIntent.isChannelIntent && channelIntent.query) {
      const notice = (t.analyzingChannelNotice || 'Recherche du dossier officiel de la chaîne ({query})...').replace('{query}', channelIntent.targetCreator);
      const waitBubble = this.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(notice)}`);
      waitBubble?.classList?.add('yt-ai-status-bubble');
      const dossierRes = await this.channelManager.getOrFetchChannelDossier(channelIntent.query);
      waitBubble?.remove?.();
      if (turnObj?.aborted) return;
      if (dossierRes.success && dossierRes.channel) channelDossierBlock = this.channelManager.formatContextBlock(dossierRes.channel, lang);
    }

    let commentsBlock = '';
    if (this.commentsManager.detectCommentsIntent(text) && currentVideoId) {
      const notice = t.fetchingCommentsNotice || 'Récupération des commentaires et avis du public...';
      const waitBubble = this.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(notice)}`);
      waitBubble?.classList?.add('yt-ai-status-bubble');
      const commentsRes = await this.commentsManager.getOrFetchComments(currentVideoId);
      waitBubble?.remove?.();
      if (turnObj?.aborted) return;
      if (commentsRes.success && commentsRes.markdownDossier) commentsBlock = commentsRes.markdownDossier;
    } else if (currentVideoId) {
      commentsBlock = this.commentsManager?.cache?.get?.(currentVideoId)?.markdownDossier || '';
    }

    const summaryText = isMultiVideo ? '' : (this.summaryViewController?.fullSummaryMarkdown || ctx.summaryText || '');
    let auditReport = stateObj.cachedAuditReport || this.auditViewController?.lastReport || null;
    const aiBubble = this.appendChatBubble('ai', '');
    aiBubble.classList.add('yt-ai-typing');
    ChatQueueHelper.bindTurnBubbles(this, turnObj, userBubble, aiBubble, qCfg);

    const selectedChatMode = document.getElementById('ytAiModeSelect')?.value || 'standard';
    const ytTools = [];
    if (!isMultiVideo && !auditReport && typeof this.auditViewController?.startAudit === 'function') ytTools.push({ name: 'AUDIT_VIDEO', description: 'Run a full critical logic, fact-checking & reliability audit of this video.' });
    if (!isMultiVideo && !channelDossierBlock && (meta?.channelUrl || meta?.author)) ytTools.push({ name: 'AUDIT_CHANNEL', description: 'Fetch the creator channel dossier & recent videos to evaluate track record & independence.' });
    ytTools.push({ name: 'AUDIT_EXTERNAL_SITE', description: 'Inspect external website URL(s) mentioned by the user or in the video (syntax: [TOOL_CALL:AUDIT_EXTERNAL_SITE|https://example.com] — one tag per URL if multiple sites are listed) to verify publisher identity and legitimacy.' });
    const outgoingMsg = AccessiblePageDescriber.shouldPrepareYouTubeMessage(ctx, userMsg, this.chatHistory.length === 0, text)
      ? await AccessiblePageDescriber.prepareYouTubeMessage(ctx, userMsg, getActiveVideoElement(), this.chatHistory.length === 0, text, currentVideoId)
      : userMsg;
    if (turnObj?.aborted) return;
    const buildYtPrompt = (withTools) => {
      const extBlock = this.externalSiteAudits?.length ? `\n\n=== EXTERNAL SITES INSPECTED ===\n${this.externalSiteAudits.join('\n\n')}` : '';
      const a11y = ctx.accessibleDescribe ? AccessiblePageDescriber.buildYouTubePromptSuffix(Boolean(outgoingMsg.images?.length)) : '';
      const base = `${this.promptService.constructor.buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode, summaryText, channelDossierBlock, commentsBlock, auditReport?.toChatContextBlock?.() || '')}${extBlock}${a11y}`;
      return withTools && ytTools.length > 0 ? `${base}${ChatToolProtocol.buildToolDirective(ytTools)}` : base;
    };
    const historyPayload = [...this.chatHistory.slice(-8), outgoingMsg];
    const serverUrls = ctx.serverUrls || stateObj.serverUrls || {};
    const currentUrl = serverUrls[currentProvider] || '';
    const chatRenderScheduler = StreamRenderScheduler.create((md) => {
      if (turnObj?.aborted) return;
      renderMarkdown(md, aiBubble);
      ChatViewController.scrollToBottom(messagesContainer);
    }, 75);
    if (turnObj) turnObj.abortFn = () => chatRenderScheduler.cancel();

    ChatToolProtocol.runStream({
      streamClient: this.streamClient,
      streamConfig: {
        provider: currentProvider, serverUrl: currentUrl, apiKey: key, model: activeModel,
        systemPrompt: buildYtPrompt(true), messages: historyPayload,
        temperature: ctx.temperature || stateObj.temperature || '0.3',
        maxTokens: ctx.maxTokens || stateObj.maxTokens || 'auto', localContextLength: localCtx
      },
      allowedTools: ytTools.map((tool) => tool.name),
      onToolStatus: () => {
        if (turnObj?.aborted) return;
        chatRenderScheduler.cancel();
        aiBubble.textContent = lang === 'fr' ? '⏳ Exécution des vérifications demandées par l\'IA...' : '⏳ Running AI-requested verification tools...';
      },
      onExecuteTools: async (requested, invocations) => {
        if (requested.includes('AUDIT_VIDEO') && !auditReport && typeof this.auditViewController?.startAudit === 'function') {
          await this.auditViewController.startAudit({ ...ctx, state: stateObj, setExpanded: null, switchTab: null }).catch(() => {});
          auditReport = stateObj.cachedAuditReport || this.auditViewController?.lastReport || null;
        }
        if (requested.includes('AUDIT_CHANNEL') && !channelDossierBlock) {
          const q = meta?.channelUrl || meta?.author || '';
          const dRes = q ? await this.channelManager.getOrFetchChannelDossier(q).catch(() => ({ success: false })) : { success: false };
          if (dRes.success && dRes.channel) channelDossierBlock = this.channelManager.formatContextBlock(dRes.channel, lang);
        }
        if (requested.includes('AUDIT_EXTERNAL_SITE')) await WebPageChatHelper.executeTools(this, requested, {}, lang, false, invocations);
      },
      rebuildSystemPrompt: () => buildYtPrompt(false),
      onStreamChunk: (md) => { if (!turnObj?.aborted) chatRenderScheduler.schedule(md); },
      onComplete: (fullAnswer) => {
        if (turnObj?.aborted) return;
        chatRenderScheduler.flush();
        aiBubble.classList.remove('yt-ai-typing');
        if (!fullAnswer.trim()) {
          aiBubble.innerHTML = `<span style="color: #ff7b72;">[!] ${escapeHtml(t.connectionError || 'No response received from AI model.')}</span>`;
          ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
        } else {
          this.chatHistory.push({ role: 'user', content: userMsg.content, ...(userMsg.files ? { files: userMsg.files } : {}) });
          this.chatHistory.push({ role: 'assistant', content: fullAnswer });
          if (chatCountBadge) chatCountBadge.textContent = String(Math.floor(this.chatHistory.length / 2));
          this.attachAudioButtonToBubble(aiBubble, fullAnswer, lang);
          if (ctx.autoRead) this.audioController?.speakText?.(fullAnswer, aiBubble?.querySelector?.('.yt-ai-tts-btn') || null, { lang });
          ChatQueueHelper.completeTurn(this, turnObj, qCfg);
        }
      },
      onError: (errorMsg) => {
        chatRenderScheduler.cancel();
        if (turnObj?.aborted) return;
        aiBubble.classList.remove('yt-ai-typing');
        aiBubble.innerHTML = `<span style="color: #ff7b72;">[x] ${escapeHtml(errorMsg)}</span>`;
        ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
      }
    });
  }
}

export default ChatViewController;
