import { I18N } from '../../locales/index.js';
import { resolveContextCharLimit } from '../../config/AIProviderPresets.js';
import { parseChannelAuditLimit } from '../../config/ExtensionConstants.js';
import { renderMarkdown, escapeHtml, safeSetInnerHTML } from './MarkdownRenderer.js';
import { extractAllVideoIdsFromText } from './NavigationObserver.js';
import { ChatTranscriptManager } from '../services/ChatTranscriptManager.js';
import { ChannelIntelligenceManager } from '../services/ChannelIntelligenceManager.js';
import { ChatStreamClient } from '../services/ChatStreamClient.js';
import { ChatBubbleView } from './ChatBubbleView.js';
import { QuickOnboardingHelper } from '../services/QuickOnboardingHelper.js';
import { PromptService } from '../services/PromptService.js';
import { StreamRenderScheduler } from './StreamRenderScheduler.js';
import { ChatQueueHelper } from './ChatQueueHelper.js';
import { YouTubeThumbnailCollector } from '../services/YouTubeThumbnailCollector.js';
import { AccessiblePageDescriber } from './AccessiblePageDescriber.js';

/**
 * Controller for Interactive Channel Q&A Tab on YouTube Channel pages.
 * Answers questions using official channel catalog metadata, cached audit reports,
 * and optional external YouTube video transcripts mentioned in questions.
 */
export class ChannelChatController {
  constructor(dependencies = {}) {
    this.channelManager = dependencies.channelManager || new ChannelIntelligenceManager();
    this.channelAuditService = dependencies.channelAuditService || null;
    this.audioController = dependencies.audioController || null;
    this.transcriptController = dependencies.transcriptController || null;
    this.transcriptManager = new ChatTranscriptManager();
    this.streamClient = new ChatStreamClient();
    this.chatHistory = [];
    this.currentChannel = '';
  }

  _getQueueConfig(ctx = {}) {
    return {
      inputId: 'ytAiChannelChatInput',
      messagesId: 'ytAiChannelChatMessages',
      queueContainerId: 'ytAiChannelChatQueue',
      countBadgeId: 'ytAiChannelChatCount',
      getLang: () => document.getElementById?.('ytAiCompLangSelect')?.value || ctx.state?.currentLang || 'fr',
      getStreamClient: (c) => c.streamClient,
      onExecuteTurn: (entry, turnObj) => this._executeMessage(entry.text, entry.ctx, turnObj)
    };
  }

  /**
   * Resets conversation state when clearing or switching channels.
   */
  resetChat(lang = 'fr', showNotice = false) {
    ChatQueueHelper.clearAll(this, this._getQueueConfig());
    this.chatHistory = [];
    this.transcriptManager.reset();
    this.streamClient.disconnect();
    if (this.audioController) {
      this.audioController.stopSpeech();
      this.audioController.stopDictation();
    }
    const badge = document.getElementById('ytAiChannelChatCount');
    if (badge) badge.textContent = '0';

    const container = document.getElementById('ytAiChannelChatMessages');
    if (!container) return;
    const t = I18N[lang] || I18N.fr;
    const msg = showNotice
      ? (t.channelChatResetNotice || 'Nouvelle discussion lancée sur cette chaîne.')
      : (t.channelChatWelcome || 'Posez vos questions sur cette chaîne, sa ligne éditoriale, ses vidéos ou ses partenaires.');
    safeSetInnerHTML(container, `<div class="yt-ai-chat-bubble ai yt-ai-welcome-bubble">${escapeHtml(msg)}</div>`);
  }

  /**
   * Binds send, clear, enter-key, suggestion chips, and mic events inside the channel card.
   */
  bindEvents(banner, state) {
    const getCtx = () => ({ state, channelIdentifier: this.currentChannel });
    banner.querySelector('#ytAiChannelSendChatBtn')?.addEventListener('click', () => this.sendMessage(null, getCtx()));

    const input = banner.querySelector('#ytAiChannelChatInput');
    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(null, getCtx());
      }
    });

    banner.querySelector('#ytAiChannelClearChatBtn')?.addEventListener('click', () => {
      this.resetChat(state.currentLang || 'fr', true);
    });

    banner.querySelector('#ytAiChannelMicBtn')?.addEventListener('click', () => {
      this.audioController?.toggleDictation({
        localWhisperUrl: state.localWhisperUrl,
        groqKey: state.apiKeys?.groq,
        openaiKey: state.apiKeys?.openai,
        targetInputId: 'ytAiChannelChatInput'
      });
    });

    const sugBox = banner.querySelector?.('.yt-ai-chat-suggestions');
    if (sugBox) {
      sugBox.addEventListener('click', (e) => {
        const chip = e.target?.closest ? e.target.closest('.yt-ai-channel-suggestion-chip') : (e.target?.classList?.contains?.('yt-ai-channel-suggestion-chip') ? e.target : null);
        if (!chip) return;
        const q = chip.getAttribute('data-question') || chip.textContent.trim();
        this.sendMessage(q, getCtx());
      });
    } else {
      banner.querySelectorAll('.yt-ai-channel-suggestion-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const q = chip.getAttribute('data-question') || chip.textContent.trim();
          this.sendMessage(q, getCtx());
        });
      });
    }
  }

  /**
   * Sends a user question about the active YouTube channel and streams AI reply.
   */
  sendMessage(customText = null, ctx = {}) {
    const inputEl = document.getElementById('ytAiChannelChatInput');
    const text = (customText !== null ? customText : inputEl?.value || '').trim();
    if (!text) return;
    return ChatQueueHelper.enqueueOrRun(this, { text, attachments: [], ctx, clearInput: customText === null }, this._getQueueConfig(ctx));
  }

  async _executeMessage(text, ctx = {}, turnObj = null) {
    const qCfg = this._getQueueConfig(ctx);
    const stateObj = ctx.state || {};
    const channelQuery = ctx.channelIdentifier || this.currentChannel;
    const lang = document.getElementById?.('ytAiCompLangSelect')?.value || stateObj.currentLang || 'fr';
    const t = I18N[lang] || I18N.fr;
    const currentProvider = stateObj.currentProvider || 'lmstudio';
    const isLocal = currentProvider === 'lmstudio' || currentProvider === 'ollama';
    const key = stateObj.apiKeys?.[currentProvider] || '';
    const activeModel = typeof stateObj.getActiveModel === 'function' ? stateObj.getActiveModel() : (stateObj.selectedModel || '');

    if (!activeModel) {
      ChatBubbleView.appendChatBubble('ai', `<span style="color:#ff7b72;">[!] ${escapeHtml(t.selectModelAlert || 'Please select an AI model.')}</span>`, 'ytAiChannelChatMessages');
      ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
      return;
    }
    if (!isLocal && !key) {
      ChatBubbleView.appendChatBubble('ai', QuickOnboardingHelper.formatMissingKeyNotice(currentProvider, lang), 'ytAiChannelChatMessages');
      ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
      return;
    }

    const msgContainer = document.getElementById('ytAiChannelChatMessages');
    const userBubble = ChatBubbleView.appendChatBubble('user', escapeHtml(text).replace(/\n/g, '<br>'), 'ytAiChannelChatMessages');
    ChatQueueHelper.bindTurnBubbles(this, turnObj, userBubble, null, qCfg);

    let channelDossierBlock = '';
    let channelVideos = [];
    let channelMeta = { title: channelQuery, author: channelQuery, channelUrl: channelQuery };
    if (channelQuery) {
      const waitNotice = (t.analyzingChannelNotice || 'Analyse du dossier de la chaîne ({query})...').replace('{query}', channelQuery);
      const waitBubble = ChatBubbleView.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(waitNotice)}`, 'ytAiChannelChatMessages');
      waitBubble?.classList?.add('yt-ai-status-bubble');
      const limit = Math.max(30, parseChannelAuditLimit(stateObj.channelAuditMaxVideos || 30).fetchCap);
      const res = await this.channelManager.getOrFetchChannelDossier(channelQuery, Math.min(limit, 100));
      waitBubble?.remove?.();
      if (turnObj?.aborted) return;
      if (res?.success && res.channel) {
        channelVideos = res.channel.recentVideos || [];
        channelMeta = {
          title: res.channel.title || channelQuery,
          author: res.channel.title || channelQuery,
          subscribers: res.channel.subscribers || '',
          channelUrl: channelQuery
        };
        channelDossierBlock = this.channelManager.formatContextBlock(res.channel, lang);
      }
    }

    const externalIds = extractAllVideoIdsFromText(text);
    let safeContextTranscript = lang.startsWith('fr')
      ? `Contexte : Page officielle de la chaîne ${channelMeta.author} (${channelQuery}). Utilise fidèlement le dossier officiel de la chaîne et l'éventuel rapport d'audit fournis ci-dessus pour répondre à l'utilisateur.`
      : `Context: Official YouTube channel page for ${channelMeta.author} (${channelQuery}). Base answers faithfully on the official channel dossier and cached audit findings above.`;

    if (externalIds.length > 0 && this.transcriptController) {
      const { loaded } = await this.transcriptManager.ensureTranscriptsLoaded(externalIds, this.transcriptController, lang);
      if (turnObj?.aborted) return;
      if (loaded.length > 0) {
        const maxChars = resolveContextCharLimit(currentProvider, stateObj.localContextLength);
        const { safeTranscript } = this.transcriptManager.buildMultiVideoContext('', channelMeta, '', maxChars, PromptService.condenseTranscriptForContext);
        safeContextTranscript = safeTranscript;
      }
    }

    const cachedAudit = this.channelAuditService?.getCachedReport?.(channelQuery) || null;
    const auditBlock = this._formatChannelAuditBlock(cachedAudit, lang);
    const systemPrompt = PromptService.buildChatSystemPrompt(
      channelMeta, safeContextTranscript, lang, 'standard', '', channelDossierBlock, '', auditBlock
    );

    const aiBubble = ChatBubbleView.appendChatBubble('ai', '', 'ytAiChannelChatMessages');
    aiBubble?.classList?.add('yt-ai-typing');
    ChatQueueHelper.bindTurnBubbles(this, turnObj, userBubble, aiBubble, qCfg);

    const wantsThumbSheets = channelVideos.length > 0 && (this.chatHistory.length === 0 || AccessiblePageDescriber.wantsYouTubeVisuals(text));
    const channelSheets = wantsThumbSheets
      ? await YouTubeThumbnailCollector.collectForChannelAudit(stateObj, channelVideos, 6).catch(() => [])
      : [];
    if (turnObj?.aborted) return;

    const userMsg = { role: 'user', content: text, ...(channelSheets.length > 0 ? { images: channelSheets } : {}) };
    const historyPayload = [...this.chatHistory.slice(-8), userMsg];
    let fullAnswer = '';
    const localCtx = stateObj.localContextLength || 'auto';
    const chatRenderScheduler = StreamRenderScheduler.create((md) => {
      if (turnObj?.aborted) return;
      if (aiBubble) renderMarkdown(md, aiBubble);
      ChatBubbleView.scrollToBottom(msgContainer);
    }, 75);
    if (turnObj) turnObj.abortFn = () => chatRenderScheduler.cancel();

    this.streamClient.startStream({
      provider: currentProvider,
      serverUrl: stateObj.serverUrls?.[currentProvider] || '',
      apiKey: key,
      model: activeModel,
      systemPrompt,
      messages: historyPayload,
      temperature: stateObj.temperature || '0.3',
      maxTokens: stateObj.maxTokens || 'auto',
      localContextLength: localCtx,
      onChunk: (chunk) => {
        if (turnObj?.aborted) return;
        fullAnswer += chunk;
        chatRenderScheduler.schedule(fullAnswer);
      },
      onDone: () => {
        if (turnObj?.aborted) return;
        chatRenderScheduler.flush();
        aiBubble?.classList?.remove('yt-ai-typing');
        if (!fullAnswer.trim()) {
          if (aiBubble) aiBubble.innerHTML = `<span style="color:#ff7b72;">[!] ${escapeHtml(t.connectionError || 'No response received from AI model.')}</span>`;
          ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
          return;
        }
        this.chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: fullAnswer });
        const badge = document.getElementById('ytAiChannelChatCount');
        if (badge) badge.textContent = String(Math.floor(this.chatHistory.length / 2));
        ChatBubbleView.attachAudioButton(aiBubble, fullAnswer, this.audioController, lang);
        ChatQueueHelper.completeTurn(this, turnObj, qCfg);
      },
      onError: (errMsg) => {
        chatRenderScheduler.cancel();
        if (turnObj?.aborted) return;
        aiBubble?.classList?.remove('yt-ai-typing');
        if (aiBubble) aiBubble.innerHTML = `<span style="color:#ff7b72;">[x] ${escapeHtml(errMsg)}</span>`;
        ChatQueueHelper.failOrEmptyTurn(this, turnObj, qCfg);
      }
    });
  }

  _formatChannelAuditBlock(report, lang) {
    if (!report) return '';
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const header = isFr ? '### 📊 AUDIT STATISTIQUE DE LA CHAÎNE EN MÉMOIRE' : '### 📊 CACHED CHANNEL STATISTICAL AUDIT';
    return [
      header,
      `- Score : ${report.globalScore}/100 (${report.tier?.label || report.badge?.label || ''})`,
      `- Sensationnalisme : ${report.clickbaitIndex}% | Trajectoire : ${report.trajectoryLabel}`,
      report.strengths?.length ? `- Forces : ${report.strengths.slice(0, 4).join(' ; ')}` : '',
      report.weaknesses?.length ? `- Vigilance : ${report.weaknesses.slice(0, 4).join(' ; ')}` : '',
      report.executiveSummary ? `- Synthèse : ${report.executiveSummary}` : ''
    ].filter(Boolean).join('\n');
  }
}

export default ChannelChatController;
