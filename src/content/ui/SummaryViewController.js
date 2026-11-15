import { I18N } from '../../locales/index.js';
import { CONTEXT_LIMITS } from '../../config/AIProviderPresets.js';
import { renderMarkdown, escapeHtml, safeSetInnerHTML } from './MarkdownRenderer.js';
import { getVideoId } from './NavigationObserver.js';
import { ChannelAuditJobTracker } from '../services/ChannelAuditJobTracker.js';

/**
 * Controller for Video AI Summarization tab, reasoning stream, and empty state
 */
export class SummaryViewController {
  constructor(dependencies = {}) {
    this.transcriptController = dependencies.transcriptController;
    this.promptService = dependencies.promptService;
    this.audioController = dependencies.audioController;
    this.isGenerating = false;
    this.isStoppedByUser = false;
    this.activePort = null;
    this.activeAbortController = null;
    this.fullSummaryMarkdown = '';
    this.fullReasoningText = '';
    this.onTriggerSummarize = null;
  }

  renderSummaryEmptyState(isNewVideo = false, currentLang = 'en', onTriggerSummarize = null) {
    if (typeof onTriggerSummarize === 'function') this.onTriggerSummarize = onTriggerSummarize;
    const summaryBody = document.getElementById('ytAiSummaryBody');
    if (!summaryBody) return;
    const t = I18N[currentLang] || I18N.en;
    const placeholder = t.summaryPlaceholder || 'Click "✨ Summarize video" to generate the summary.';
    safeSetInnerHTML(summaryBody, `<p class="yt-ai-placeholder-text" style="color: var(--yt-ai-text-muted); font-style: italic; margin: 8px 0;">${escapeHtml(placeholder)}</p>`);
  }

  resetSummaryOutput(currentLang = 'en', onTriggerSummarize = null) {
    if (typeof onTriggerSummarize === 'function') this.onTriggerSummarize = onTriggerSummarize;
    this.isStoppedByUser = true;
    try { this.activeAbortController?.abort('navigation'); } catch (_) {}
    this.activeAbortController = null;
    this.fullSummaryMarkdown = '';
    this.fullReasoningText = '';
    this.finishGeneration(currentLang);
    this.renderSummaryEmptyState(true, currentLang, this.onTriggerSummarize);
    document.getElementById('ytAiReasoningBox')?.classList.add('yt-ai-hidden');
  }

  stopGeneration(currentLang = 'en') {
    this.isStoppedByUser = true;
    try { this.activeAbortController?.abort('stopped'); } catch (_) {}
    this.finishGeneration(currentLang);
    if (!this.fullSummaryMarkdown.trim()) {
      const summaryBody = document.getElementById('ytAiSummaryBody');
      if (summaryBody) {
        const stoppedMsg = I18N[currentLang]?.auditStoppedNote || '⏹ Processing stopped by user.';
        summaryBody.innerHTML = `<p class="yt-ai-stopped-note">${escapeHtml(stoppedMsg)}</p>`;
      }
    }
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

    const stateObj = ctx.state || ctx;
    const currentProvider = ctx.currentProvider || stateObj.currentProvider || 'lmstudio';
    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const key = ctx.apiKeys ? ctx.apiKeys[currentProvider] : (stateObj.apiKeys ? stateObj.apiKeys[currentProvider] : '');

    if (!isLocal && !key) {
      if (typeof ctx.showStatusBanner === 'function') {
        const hint = t.missingKeyAlert || `Clé API requise pour ${currentProvider.toUpperCase()}.`;
        ctx.showStatusBanner(`[!] ${hint}`, true);
      }
      document.getElementById('ytAiSettingsDrawer')?.classList.remove('yt-ai-hidden');
      document.getElementById('ytAiSettingsToggleBtn')?.classList.add('active');
      document.getElementById('ytAiApiKeyInput')?.focus();
      return;
    }

    const mode = document.getElementById('ytAiModeSelect')?.value || 'standard';
    const summaryBody = document.getElementById('ytAiSummaryBody');
    const reasoningBox = document.getElementById('ytAiReasoningBox');
    const reasoningText = document.getElementById('ytAiReasoningText');
    const reasoningStatus = document.getElementById('ytAiReasoningStatus');
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const stopBtn = document.getElementById('ytAiStopSummaryBtn');

    this.isGenerating = true;
    this.isStoppedByUser = false;
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.activeAbortController = abortController;
    const signal = abortController?.signal || null;

    if (summarizeBtn) {
      summarizeBtn.disabled = true;
      summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Extracting transcript...'}`;
    }
    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.classList?.remove('yt-ai-hidden');
    }
    if (summaryBody) {
      summaryBody.innerHTML = `<div class="yt-ai-loading"><span class="yt-ai-spinner"></span> ${escapeHtml(t.generatingSummary || 'Extracting transcript...')}</div>`;
      summaryBody.classList.remove('yt-ai-typing');
    }

    try {
      const segments = await ChannelAuditJobTracker.raceWithAbort(this.transcriptController.extractYouTubeTranscript(lang, true), signal, lang);
      ChannelAuditJobTracker.throwIfAborted(signal, lang);
      if (!segments || segments.length === 0) throw new Error(t.noTranscriptError || 'Unable to extract transcript.');

      const fullText = this.transcriptController.cachedTranscript.fullText;
      const wordsCount = fullText.trim().split(/\s+/).length;
      const modelDisplayName = activeModel.split('/').pop();
      const shortModel = modelDisplayName.length > 14 ? modelDisplayName.slice(0, 14) + '…' : modelDisplayName;

      if (summarizeBtn) {
        summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${shortModel} (${wordsCount.toLocaleString()} ${t.wordsBadge || 'words'})...`;
        summarizeBtn.title = `${modelDisplayName} (${wordsCount.toLocaleString()} words)`;
      }
      if (summaryBody) { summaryBody.innerHTML = ''; summaryBody.classList.add('yt-ai-typing'); }
      if (reasoningBox) reasoningBox.classList.add('yt-ai-hidden');
      if (reasoningText) reasoningText.textContent = '';
      this.fullSummaryMarkdown = '';
      this.fullReasoningText = '';

      const currentVideoId = getVideoId();
      if (!this.transcriptController.cachedVideoMetadata.description || this.transcriptController.cachedVideoMetadata.videoId !== currentVideoId) {
        await ChannelAuditJobTracker.raceWithAbort(this.transcriptController.requestPlayerDataFromMainWorld(currentVideoId, lang).catch(() => {}), signal, lang);
      }
      ChannelAuditJobTracker.throwIfAborted(signal, lang);

      const meta = ctx.getVideoMetadata ? ctx.getVideoMetadata() : this.transcriptController.cachedVideoMetadata;
      const maxAllowedChars = CONTEXT_LIMITS[currentProvider] || 25000;
      const safeTranscript = this.promptService.constructor.condenseTranscriptForContext(fullText, maxAllowedChars);
      const { systemPrompt, userPrompt } = this.promptService.constructor.buildPrompts(meta.title, meta.author, safeTranscript, lang, mode, meta);

      const serverUrls = ctx.serverUrls || stateObj.serverUrls || {};
      const serverUrl = serverUrls[currentProvider] || (stateObj.serverUrl || '');
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
        if (!this.isGenerating || this.isStoppedByUser) return;
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
          this.renderErrorState(msg.error, lang, ctx);
          this.finishGeneration(lang);
        }
      });

      this.activePort.onDisconnect.addListener(() => {
        this.finishGeneration(lang);
      });
    } catch (err) {
      if (this.isStoppedByUser || ChannelAuditJobTracker.isAbortError(err)) {
        if (!this.fullSummaryMarkdown.trim() && summaryBody) {
          const isFr = (lang || 'en').startsWith('fr');
          summaryBody.innerHTML = `<p class="yt-ai-stopped-note">⏹ ${isFr ? 'Traitement arrêté par l’utilisateur.' : 'Generation stopped by user.'}</p>`;
        }
        this.finishGeneration(lang);
      } else {
        const cleanErr = (err.message || '').replace(/^❌\s*/, '');
        if (typeof ctx.showStatusBanner === 'function') ctx.showStatusBanner(cleanErr, true);
        this.renderErrorState(cleanErr, lang, ctx);
        this.finishGeneration(lang);
      }
    }
  }

  renderErrorState(errorMessage, currentLang = "en", ctx = {}) {
    const summaryBody = document.getElementById("ytAiSummaryBody");
    if (!summaryBody) return;
    const t = I18N[currentLang] || I18N.en;
    const cleanErr = (errorMessage || "").replace(/^❌\s*/, "");
    summaryBody.innerHTML = `
      <div class="yt-ai-error-box">
        <div class="yt-ai-error-title"><strong>${escapeHtml(t.errorLabel || "Error: ")}</strong>${escapeHtml(cleanErr)}</div>
        <button id="ytAiRetrySummarizeBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-retry-btn">
          ${escapeHtml(t.retryBtn || "🔄 Retry")}
        </button>
      </div>
    `;
    document.getElementById("ytAiRetrySummarizeBtn")?.addEventListener("click", () => {
      this.startSummarization(ctx);
    });
  }

  finishGeneration(currentLang = 'en') {
    this.isGenerating = false;
    this.activeAbortController = null;
    const summaryBody = document.getElementById('ytAiSummaryBody');
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const stopBtn = document.getElementById('ytAiStopSummaryBtn');
    const t = I18N[currentLang] || I18N.en;

    if (summaryBody) summaryBody.classList.remove('yt-ai-typing');
    if (summarizeBtn) {
      summarizeBtn.disabled = false;
      summarizeBtn.innerHTML = t.summarizeBtn || '✨ Summarize video';
    }
    if (stopBtn) stopBtn.classList?.add('yt-ai-hidden');
    if (this.activePort) {
      try { this.activePort.disconnect(); } catch (_) {}
      this.activePort = null;
    }
  }

  applyLanguage(currentLang = 'en') {
    const t = I18N[currentLang] || I18N.en;
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const stopBtn = document.getElementById('ytAiStopSummaryBtn');
    if (stopBtn) {
      stopBtn.textContent = t.stopListenBtn || '⏹️ Stop';
      stopBtn.title = t.stopListenBtn || '⏹️ Stop';
    }

    if (this.isGenerating) {
      if (summarizeBtn) {
        summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Generating summary...'}`;
      }
      const loadingEl = document.querySelector('#ytAiSummaryBody .yt-ai-loading');
      if (loadingEl) {
        loadingEl.innerHTML = `<span class="yt-ai-spinner"></span> ${escapeHtml(t.generatingSummary || 'Generating summary...')}`;
      }
    } else {
      if (summarizeBtn) summarizeBtn.textContent = t.summarizeBtn || '✨ Summarize video';

      const retryBtn = document.getElementById('ytAiRetrySummarizeBtn');
      if (retryBtn) retryBtn.textContent = t.retryBtn || '🔄 Retry';

      const errTitle = document.querySelector('#ytAiSummaryBody .yt-ai-error-title strong');
      if (errTitle) errTitle.textContent = t.errorLabel || 'Error: ';

      const stoppedNote = document.querySelector('#ytAiSummaryBody .yt-ai-stopped-note');
      if (stoppedNote) {
        stoppedNote.textContent = t.auditStoppedNote || '⏹ Processing stopped by user.';
      } else if (!this.fullSummaryMarkdown?.trim()) {
        const placeholderP = document.querySelector('#ytAiSummaryBody .yt-ai-placeholder-text');
        if (placeholderP) {
          placeholderP.textContent = t.summaryPlaceholder || 'Click "✨ Summarize video" to generate the summary.';
        }
      }
    }
  }
}

export default SummaryViewController;
