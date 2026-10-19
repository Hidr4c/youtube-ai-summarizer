import { I18N } from '../../locales/index.js';
import { CONTEXT_LIMITS } from '../../config/AIProviderPresets.js';
import { renderMarkdown, escapeHtml, safeSetInnerHTML } from './MarkdownRenderer.js';
import { getVideoId } from './NavigationObserver.js';

/**
 * Controller for Video AI Summarization tab, reasoning stream, and empty state
 */
export class SummaryViewController {
  constructor(dependencies = {}) {
    this.transcriptController = dependencies.transcriptController;
    this.promptService = dependencies.promptService;
    this.audioController = dependencies.audioController;
    this.isGenerating = false;
    this.activePort = null;
    this.fullSummaryMarkdown = '';
    this.fullReasoningText = '';
  }

  renderSummaryEmptyState(isNewVideo = false, currentLang = 'en', onTriggerSummarize = null) {
    const summaryBody = document.getElementById('ytAiSummaryBody');
    if (!summaryBody) return;
    const t = I18N[currentLang] || I18N.en;
    const title = isNewVideo ? (t.newVideoTitle || t.emptyTitle) : t.emptyTitle;
    const subtitle = isNewVideo ? (t.newVideoPlaceholder || t.emptySubtitle) : (t.emptySubtitle || t.summaryPlaceholder);

    safeSetInnerHTML(summaryBody, `
      <div class="yt-ai-empty-state">
        <div class="yt-ai-empty-icon">✨</div>
        <div class="yt-ai-empty-title">${escapeHtml(title)}</div>
        <div class="yt-ai-empty-subtitle">${escapeHtml(subtitle)}</div>
        <button id="ytAiSummaryHeroBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-hero-btn">
          ${escapeHtml(t.summarizeBtn || '✨ Summarize video')}
        </button>
      </div>
    `);

    const heroBtn = document.getElementById('ytAiSummaryHeroBtn');
    heroBtn?.addEventListener('click', () => {
      if (typeof onTriggerSummarize === 'function') onTriggerSummarize();
    });
  }

  resetSummaryOutput(currentLang = 'en') {
    this.fullSummaryMarkdown = '';
    this.fullReasoningText = '';
    this.renderSummaryEmptyState(false, currentLang);
    const reasoningBox = document.getElementById('ytAiReasoningBox');
    if (reasoningBox) reasoningBox.classList.add('yt-ai-hidden');
  }

  async startSummarization(ctx = {}) {
    if (this.isGenerating) return;

    const lang = document.getElementById('ytAiLangSelect')?.value || ctx.currentLang || 'en';
    const t = I18N[lang] || I18N.en;
    const activeModel = ctx.getActiveModel ? ctx.getActiveModel() : (ctx.selectedModel || '');

    if (!activeModel) {
      if (typeof ctx.showStatusBanner === 'function') {
        ctx.showStatusBanner(t.selectModelAlert || 'Please select a valid AI model.', true);
      }
      return;
    }

    const currentProvider = ctx.currentProvider || 'lmstudio';
    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const key = ctx.apiKeys ? ctx.apiKeys[currentProvider] : '';

    if (!isLocal && !key) {
      if (typeof ctx.showStatusBanner === 'function') {
        ctx.showStatusBanner(t.missingKeyAlert || `API key missing for ${currentProvider.toUpperCase()}. Please enter your key.`, true);
      }
      return;
    }

    const mode = document.getElementById('ytAiModeSelect')?.value || 'standard';
    const summaryBody = document.getElementById('ytAiSummaryBody');
    const reasoningBox = document.getElementById('ytAiReasoningBox');
    const reasoningText = document.getElementById('ytAiReasoningText');
    const reasoningStatus = document.getElementById('ytAiReasoningStatus');
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const heroBtn = document.getElementById('ytAiSummaryHeroBtn');

    this.isGenerating = true;
    if (summarizeBtn) {
      summarizeBtn.disabled = true;
      summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Extracting transcript...'}`;
    }
    if (heroBtn) {
      heroBtn.disabled = true;
      heroBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Extracting transcript...'}`;
    }

    try {
      const segments = await this.transcriptController.extractYouTubeTranscript(lang);
      if (!segments || segments.length === 0) {
        throw new Error(t.noTranscriptError || 'Unable to extract transcript.');
      }

      const fullText = this.transcriptController.cachedTranscript.fullText;
      const wordsCount = fullText.trim().split(/\s+/).length;
      const modelDisplayName = activeModel.split('/').pop();
      const shortModel = modelDisplayName.length > 14 ? modelDisplayName.slice(0, 14) + '…' : modelDisplayName;

      if (summarizeBtn) {
        summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${shortModel} (${wordsCount.toLocaleString()} ${t.wordsBadge || 'words'})...`;
        summarizeBtn.title = `${modelDisplayName} (${wordsCount.toLocaleString()} words)`;
      }
      if (summaryBody) {
        summaryBody.innerHTML = '';
        summaryBody.classList.add('yt-ai-typing');
      }
      if (reasoningBox) reasoningBox.classList.add('yt-ai-hidden');
      if (reasoningText) reasoningText.textContent = '';
      this.fullSummaryMarkdown = '';
      this.fullReasoningText = '';

      const currentVideoId = getVideoId();
      if (!this.transcriptController.cachedVideoMetadata.description || this.transcriptController.cachedVideoMetadata.videoId !== currentVideoId) {
        await this.transcriptController.requestPlayerDataFromMainWorld(currentVideoId, lang).catch(() => {});
      }

      const meta = ctx.getVideoMetadata ? ctx.getVideoMetadata() : this.transcriptController.cachedVideoMetadata;
      const maxAllowedChars = CONTEXT_LIMITS[currentProvider] || 25000;
      const safeTranscript = this.promptService.constructor.condenseTranscriptForContext(fullText, maxAllowedChars);
      const { systemPrompt, userPrompt } = this.promptService.constructor.buildPrompts(meta.title, meta.author, safeTranscript, lang, mode, meta);

      const serverUrl = ctx.serverUrls ? (ctx.serverUrls[currentProvider] || '') : '';
      this.activePort = chrome.runtime.connect({ name: 'ai-stream' });

      this.activePort.postMessage({
        action: 'START_STREAM',
        provider: currentProvider,
        serverUrl,
        apiKey: key,
        model: activeModel,
        systemPrompt,
        userPrompt,
        temperature: ctx.temperature || '0.3',
        maxTokens: ctx.maxTokens || 'auto'
      });

      this.activePort.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          if (msg.reasoning) {
            this.fullReasoningText += msg.reasoning;
            if (reasoningBox) {
              reasoningBox.classList.remove('yt-ai-hidden');
              reasoningBox.open = true;
            }
            if (reasoningText) reasoningText.textContent = this.fullReasoningText;
            if (reasoningStatus) reasoningStatus.textContent = t.reasoningInProgress || 'thinking...';
          }

          if (msg.content) {
            if (this.fullReasoningText && reasoningStatus && reasoningStatus.textContent !== (t.reasoningDone || 'completed')) {
              reasoningStatus.textContent = t.reasoningDone || 'completed';
              if (reasoningBox) reasoningBox.open = false;
            }
            this.fullSummaryMarkdown += msg.content;
            if (summaryBody) renderMarkdown(this.fullSummaryMarkdown, summaryBody);
          }
        } else if (msg.type === 'DONE') {
          this.finishGeneration(lang);
        } else if (msg.type === 'ERROR') {
          if (typeof ctx.showStatusBanner === 'function') ctx.showStatusBanner(msg.error, true);
          if (summaryBody) {
            summaryBody.innerHTML = `<div style="color: #ff7b72; padding: 12px; background: rgba(248,81,73,0.1); border-radius: 6px;"><strong>${escapeHtml(t.errorLabel || 'Error: ')}</strong>${escapeHtml(msg.error)}</div>`;
          }
          this.finishGeneration(lang);
        }
      });

      this.activePort.onDisconnect.addListener(() => {
        this.finishGeneration(lang);
      });
    } catch (err) {
      const cleanErr = (err.message || '').replace(/^❌\s*/, '');
      if (typeof ctx.showStatusBanner === 'function') ctx.showStatusBanner(cleanErr, true);
      if (summaryBody) {
        summaryBody.innerHTML = `<div style="color: #ff7b72; padding: 12px; background: rgba(248,81,73,0.1); border-radius: 6px;"><strong>${escapeHtml(t.errorLabel || 'Error: ')}</strong>${escapeHtml(cleanErr)}</div>`;
      }
      this.finishGeneration(lang);
    }
  }

  finishGeneration(currentLang = 'en') {
    this.isGenerating = false;
    const summaryBody = document.getElementById('ytAiSummaryBody');
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const heroBtn = document.getElementById('ytAiSummaryHeroBtn');
    const t = I18N[currentLang] || I18N.en;

    if (summaryBody) summaryBody.classList.remove('yt-ai-typing');
    if (summarizeBtn) {
      summarizeBtn.disabled = false;
      summarizeBtn.innerHTML = t.summarizeBtn || '✨ Summarize video';
    }
    if (heroBtn) {
      heroBtn.disabled = false;
      heroBtn.innerHTML = t.summarizeBtn || '✨ Summarize video';
    }
    if (this.activePort) {
      this.activePort.disconnect();
      this.activePort = null;
    }
  }
}

export default SummaryViewController;
