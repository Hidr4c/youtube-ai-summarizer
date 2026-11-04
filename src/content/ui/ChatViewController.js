import { I18N } from '../../locales/index.js';
import { CONTEXT_LIMITS } from '../../config/AIProviderPresets.js';
import { renderMarkdown, escapeHtml } from './MarkdownRenderer.js';
import { getVideoId } from './NavigationObserver.js';
import { ExternalVideoManager } from '../services/ExternalVideoManager.js';
import { CHAT_USER_DIRECTIVES } from '../services/PromptService.js';

/**
 * Controller for Interactive Video Q&A Chat Tab
 */
export class ChatViewController {
  constructor(dependencies = {}) {
    this.transcriptController = dependencies.transcriptController;
    this.promptService = dependencies.promptService;
    this.audioController = dependencies.audioController;
    this.summaryViewController = dependencies.summaryViewController;
    this.externalVideoManager = dependencies.externalVideoManager || new ExternalVideoManager();
    this.chatHistory = [];
    this.chatPort = null;
  }

  static scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  appendChatBubble(role, contentHtml) {
    const container = document.getElementById('ytAiChatMessages');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `yt-ai-chat-bubble ${role}`;
    bubble.innerHTML = contentHtml;
    container.appendChild(bubble);
    ChatViewController.scrollToBottom(container);
    return bubble;
  }

  attachAudioButtonToBubble(bubble, answerText, currentLang = 'en') {
    if (!bubble) return;
    const existingToolbar = bubble.querySelector('.yt-ai-bubble-toolbar');
    if (existingToolbar) return;

    const t = I18N[currentLang] || I18N.en;
    const toolbar = document.createElement('div');
    toolbar.className = 'yt-ai-bubble-toolbar';

    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'yt-ai-tts-btn';
    ttsBtn.title = t.listenBubbleTitle || 'Listen to this answer';
    ttsBtn.textContent = t.listenBtn || '🔊 Listen';

    ttsBtn.addEventListener('click', () => {
      if (this.audioController) {
        this.audioController.speakText(answerText, ttsBtn);
      }
    });

    toolbar.appendChild(ttsBtn);
    bubble.appendChild(toolbar);
  }

  handleClearChat(currentLang = 'en') {
    this.chatHistory = [];
    if (this.audioController) {
      this.audioController.stopSpeech();
      this.audioController.stopDictation();
    }
    const container = document.getElementById('ytAiChatMessages');
    const chatCountBadge = document.getElementById('ytAiChatCount');
    const t = I18N[currentLang] || I18N.en;

    if (container) {
      container.innerHTML = `
        <div class="yt-ai-chat-bubble ai">
          ${t.chatResetNotice || 'Conversation reset. Ask any question about the video content!'}
        </div>
      `;
    }
    if (chatCountBadge) chatCountBadge.textContent = '0';
  }

  resetChatOutput(currentLang = 'en') {
    this.handleClearChat(currentLang);
  }

  toggleDictation(options) {
    if (this.audioController) {
      return this.audioController.toggleDictation(options);
    }
  }

  async handleSendChatMessage(customText = null, ctx = {}) {
    if (this.audioController) {
      this.audioController.stopDictation();
    }
    const inputEl = document.getElementById('ytAiChatInput');
    const text = (customText || inputEl?.value || '').trim();
    if (!text) return;

    if (inputEl) inputEl.value = '';

    if (typeof ctx.setExpanded === 'function') ctx.setExpanded(true);
    if (typeof ctx.switchTab === 'function') ctx.switchTab('chat');

    const stateObj = (ctx && typeof ctx === 'object') ? (ctx.state || ctx) : {};
    const messagesContainer = document.getElementById('ytAiChatMessages');
    const chatCountBadge = document.getElementById('ytAiChatCount');
    const lang = ctx.currentLang || stateObj.currentLang || document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[lang] || I18N.en;

    this.appendChatBubble('user', escapeHtml(text));

    const currentVideoId = getVideoId();
    const isCachedValid = this.transcriptController.cachedTranscript.segments?.length > 0 &&
      (!currentVideoId || this.transcriptController.cachedTranscript.videoId === currentVideoId);

    if (!isCachedValid) {
      const waitBubble = this.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(t.extractingTranscriptNotice || 'Extracting video transcript...')}`);
      const segments = await this.transcriptController.extractYouTubeTranscript(lang, true);
      if (!segments || segments.length === 0) {
        waitBubble.innerHTML = `<span style="color: #ff7b72;">❌ ${escapeHtml(t.noTranscriptError || 'Unable to extract video transcript.')}</span>`;
        return;
      }
      waitBubble?.remove?.();
    }

    let externalContextBlock = '';
    const externalIds = this.externalVideoManager.extractYouTubeVideoIds(text, currentVideoId);
    if (externalIds.length > 0) {
      const waitLinkedBubble = this.appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${escapeHtml(t.fetchingExternalVideo || 'Analyzing linked YouTube video...')}`);
      try {
        const extVideos = await Promise.all(externalIds.map(id => this.externalVideoManager.fetchExternalVideo(id, lang)));
        const validVideos = extVideos.filter(v => v && v.fullText);
        if (validVideos.length > 0) {
          externalContextBlock = this.externalVideoManager.formatExternalContextBlock(validVideos);
          waitLinkedBubble.innerHTML = `<span style="color: #58a6ff; font-size: 12px;">${escapeHtml(t.externalVideoBadge || '📎 Linked video analyzed')}: <strong>${escapeHtml(validVideos.map(v => v.title).join(', '))}</strong></span>`;
        } else {
          waitLinkedBubble?.remove?.();
        }
      } catch (_) {
        waitLinkedBubble?.remove?.();
      }
    }

    const activeModel = (typeof ctx.getActiveModel === 'function' ? ctx.getActiveModel() : null) ||
                        (typeof stateObj.getActiveModel === 'function' ? stateObj.getActiveModel() : null) ||
                        ctx.selectedModel ||
                        stateObj.selectedModels?.[stateObj.currentProvider] ||
                        stateObj.selectedModel ||
                        '';
    if (!activeModel) {
      this.appendChatBubble('ai', t.selectModelAlert || 'Please select an AI model in the settings toolbar above.');
      return;
    }

    const currentProvider = ctx.currentProvider || stateObj.currentProvider || 'lmstudio';
    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const apiKeys = ctx.apiKeys || stateObj.apiKeys || {};
    const key = apiKeys[currentProvider] || '';
    if (!isLocal && !key) {
      this.appendChatBubble('ai', t.missingKeyAlert || `Please provide your API key for ${currentProvider.toUpperCase()} to chat.`);
      return;
    }

    const aiBubble = this.appendChatBubble('ai', '');
    aiBubble.classList.add('yt-ai-typing');

    if (typeof this.transcriptController?.requestPlayerDataFromMainWorld === 'function' &&
        (!this.transcriptController.cachedVideoMetadata?.description || this.transcriptController.cachedVideoMetadata?.videoId !== currentVideoId)) {
      await this.transcriptController.requestPlayerDataFromMainWorld(currentVideoId, lang).catch(() => {});
    }

    const meta = ctx.getVideoMetadata ? ctx.getVideoMetadata() : this.transcriptController.cachedVideoMetadata;
    const maxChars = CONTEXT_LIMITS[currentProvider] || 20000;
    const transcriptSource = this.transcriptController.cachedTranscript.timestampedText || this.transcriptController.cachedTranscript.fullText;
    const safeTranscript = this.promptService.constructor.condenseTranscriptForContext(transcriptSource, maxChars);

    const selectedChatMode = document.getElementById('ytAiModeSelect')?.value || 'standard';
    const summaryText = this.summaryViewController?.fullSummaryMarkdown || ctx.summaryText || '';
    const systemPrompt = this.promptService.constructor.buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode, summaryText, externalContextBlock);

    const relevantHistory = this.chatHistory
      .filter(m => !m.lang || m.lang === lang)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    const userPayloadContent = `${text}${CHAT_USER_DIRECTIVES[lang] || ''}`;
    relevantHistory.push({ role: 'user', content: userPayloadContent });

    let fullAnswer = '';
    if (this.chatPort) {
      try { this.chatPort.disconnect(); } catch (_) {}
    }

    const serverUrls = ctx.serverUrls || stateObj.serverUrls || {};
    const currentUrl = serverUrls[currentProvider] || '';
    this.chatPort = chrome.runtime.connect({ name: 'ai-stream' });
    this.chatPort.postMessage({
      action: 'CHAT_STREAM',
      provider: currentProvider,
      serverUrl: currentUrl,
      apiKey: key,
      model: activeModel,
      systemPrompt,
      messages: relevantHistory,
      temperature: ctx.temperature || stateObj.temperature || '0.3',
      maxTokens: ctx.maxTokens || stateObj.maxTokens || 'auto'
    });

    this.chatPort.onMessage.addListener((msg) => {
      if (msg.type === 'CHUNK' && msg.content) {
        fullAnswer += msg.content;
        renderMarkdown(fullAnswer, aiBubble);
        ChatViewController.scrollToBottom(messagesContainer);
      } else if (msg.type === 'DONE') {
        aiBubble.classList.remove('yt-ai-typing');
        if (!fullAnswer.trim()) {
          aiBubble.innerHTML = `<span style="color: #ff7b72;">⚠️ ${escapeHtml(t.connectionError || 'No response received from AI model.')}</span>`;
        } else {
          this.chatHistory.push({ role: 'user', content: text, lang });
          this.chatHistory.push({ role: 'assistant', content: fullAnswer, lang });
          if (chatCountBadge) chatCountBadge.textContent = String(Math.floor(this.chatHistory.length / 2));
          this.attachAudioButtonToBubble(aiBubble, fullAnswer, lang);
        }
        if (this.chatPort) { this.chatPort.disconnect(); this.chatPort = null; }
      } else if (msg.type === 'ERROR') {
        aiBubble.classList.remove('yt-ai-typing');
        aiBubble.innerHTML = `<span style="color: #ff7b72;">❌ ${escapeHtml(msg.error)}</span>`;
        if (this.chatPort) { this.chatPort.disconnect(); this.chatPort = null; }
      }
    });

    this.chatPort.onDisconnect.addListener(() => {
      aiBubble.classList.remove('yt-ai-typing');
    });
  }
}

export default ChatViewController;
