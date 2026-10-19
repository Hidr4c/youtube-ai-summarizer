import { ChromeStorageService } from '../services/implementations/ChromeStorageService.js';
import { I18nService } from '../services/implementations/I18nService.js';
import { PromptBuilder } from '../services/implementations/PromptBuilder.js';
import { YouTubeTranscriptService } from '../services/implementations/YouTubeTranscriptService.js';
import { ExportService } from '../services/implementations/ExportService.js';
import { WebSpeechTTSService } from '../services/implementations/WebSpeechTTSService.js';
import { WhisperSTTService } from '../services/implementations/WhisperSTTService.js';
import { ExtensionLayoutTemplate } from '../presentation/templates/ExtensionLayoutTemplate.js';
import { HeaderBarComponent } from '../presentation/components/HeaderBarComponent.js';
import { SettingsDrawerComponent } from '../presentation/components/SettingsDrawerComponent.js';
import { SummaryViewComponent } from '../presentation/components/SummaryViewComponent.js';
import { ChatViewComponent } from '../presentation/components/ChatViewComponent.js';
import { TranscriptViewComponent } from '../presentation/components/TranscriptViewComponent.js';
import { VideoMetadata } from '../domain/models/VideoMetadata.js';
import { CONTEXT_LIMITS, PROVIDER_NAMES } from '../config/AIProviderPresets.js';

/**
 * Master Controller orchestrating the YouTube in-page AI companion
 */
export class ContentController {
  constructor() {
    this.storage = new ChromeStorageService();
    this.i18n = new I18nService('en');
    this.promptBuilder = new PromptBuilder();
    this.transcriptService = new YouTubeTranscriptService();
    this.exportService = new ExportService();
    this.ttsService = new WebSpeechTTSService();
    this.sttService = new WhisperSTTService();

    this.currentVideoId = '';
    this.cachedTranscript = null;
    this.currentSummary = '';
    this.chatHistory = [];
    this.currentMode = 'standard';
    this.isExpanded = false;
    this.activePort = null;
  }

  async init() {
    await this.loadSettings();
    this.observeNavigation();
    this.tryInjectBanner();
  }

  async loadSettings() {
    const settings = await this.storage.getMultiple([
      'aiProvider',
      'selectedModel',
      'targetLang',
      'summaryMode',
      'temperature',
      'maxTokens',
      'ttsSpeed',
      'autoSummarize',
      'customPrompt'
    ]);

    this.provider = settings.aiProvider || 'lmstudio';
    this.model = settings.selectedModel || '';
    this.targetLang = settings.targetLang || 'en';
    this.currentMode = settings.summaryMode || 'standard';
    this.temperature = settings.temperature || '0.3';
    this.maxTokens = settings.maxTokens || 'auto';
    this.ttsSpeed = settings.ttsSpeed || '1.0';
    this.autoSummarize = Boolean(settings.autoSummarize);
    this.customPrompt = settings.customPrompt || '';

    this.i18n.setLanguage(this.targetLang);
  }

  observeNavigation() {
    window.addEventListener('yt-navigate-finish', () => this.handleNavigationChange());
    window.addEventListener('popstate', () => this.handleNavigationChange());

    // Polling backup for dynamic SPA transitions
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.handleNavigationChange();
      }
    }, 1000);
  }

  handleNavigationChange() {
    const newVideoId = VideoMetadata.extractVideoId(window.location.href);
    if (newVideoId && newVideoId !== this.currentVideoId) {
      this.currentVideoId = newVideoId;
      this.cachedTranscript = null;
      this.currentSummary = '';
      this.chatHistory = [];
      this.tryInjectBanner();

      if (this.autoSummarize) {
        setTimeout(() => this.startSummarization(), 1500);
      }
    }
  }

  tryInjectBanner() {
    if (document.getElementById('yt-ai-summarizer-container')) return;

    const target = document.querySelector('#above-the-fold') || document.querySelector('#related');
    if (!target || !target.parentNode) {
      setTimeout(() => this.tryInjectBanner(), 500);
      return;
    }

    const container = document.createElement('div');
    container.id = 'yt-ai-summarizer-container';
    container.className = 'yt-ai-container';
    container.innerHTML = ExtensionLayoutTemplate.render({
      isExpanded: this.isExpanded,
      version: 'v1.3.0',
      initialModelText: this.model || 'Gemini 1.5 Flash'
    });

    target.parentNode.insertBefore(container, target);
    this.bindComponents(container);
  }

  bindComponents(container) {
    this.headerBar = new HeaderBarComponent(container, {
      onSummarize: () => this.startSummarization(),
      onToggleExpand: () => this.toggleExpand(),
      onToggleSettings: (subtab) => this.settingsDrawer?.toggle(true),
      onLanguageChange: (lang) => this.changeLanguage(lang),
      onFormatChange: (mode) => { this.currentMode = mode; }
    });

    this.settingsDrawer = new SettingsDrawerComponent(container, {
      onProviderChange: (p) => { this.provider = p; },
      onModelChange: (m) => { this.model = m; this.headerBar.setModelText(m); },
      onClose: () => this.settingsDrawer?.toggle(false)
    });

    this.summaryView = new SummaryViewComponent(container, {
      onCopy: () => {
        if (this.currentSummary) navigator.clipboard.writeText(this.currentSummary);
      },
      onDownloadMd: () => this.downloadSummary('md'),
      onDownloadTxt: () => this.downloadSummary('txt'),
      onDownloadJson: () => this.downloadSummary('json'),
      onToggleSpeak: () => this.toggleSpeech()
    });

    this.chatView = new ChatViewComponent(container, {
      onSendMessage: (msg) => this.sendChatMessage(msg),
      onToggleMic: () => this.toggleVoiceDictation(),
      onClear: () => { this.chatHistory = []; this.chatView.clear(this.i18n.t('chatWelcome')); }
    });

    this.transcriptView = new TranscriptViewComponent(container, {
      onCopyRaw: () => {
        if (this.cachedTranscript?.fullText) {
          navigator.clipboard.writeText(this.cachedTranscript.fullText);
        }
      }
    });

    this.headerBar.setStatus(this.i18n.t('connectedBadge'), true);
  }

  async startSummarization() {
    this.isExpanded = true;
    const body = document.getElementById('yt-ai-body');
    if (body) body.classList.remove('yt-ai-hidden');

    this.summaryView?.setSummaryContent(`<p style="color:#58a6ff;">${this.i18n.t('generatingSummary')}</p>`);

    try {
      if (!this.cachedTranscript) {
        this.cachedTranscript = await this.transcriptService.getTranscript(this.currentVideoId, this.targetLang);
        this.transcriptView?.setTranscript(this.cachedTranscript.segments, (sec) => this.seekVideo(sec));
      }

      const limit = CONTEXT_LIMITS[this.provider] || 50000;
      const safeText = this.promptBuilder.condenseTranscript(this.cachedTranscript.fullText, limit);

      const title = document.title.replace(/ - YouTube$/, '');
      const author = document.querySelector('#channel-name')?.textContent?.trim() || '';

      const { systemPrompt, userPrompt } = this.promptBuilder.buildSummaryPrompts(
        title, author, safeText, this.targetLang, this.currentMode, this.customPrompt
      );

      this.executeStreamingInference(systemPrompt, [{ role: 'user', content: userPrompt }], (chunk) => {
        this.currentSummary += chunk;
        this.summaryView?.setSummaryContent(this.formatMarkdownHtml(this.currentSummary), (sec) => this.seekVideo(sec));
      });
    } catch (err) {
      this.summaryView?.setSummaryContent(`<p style="color:#ff7b72;">${this.i18n.t('errorLabel')} ${err.message}</p>`);
    }
  }

  executeStreamingInference(systemPrompt, messages, onChunk) {
    if (this.activePort) {
      try { this.activePort.disconnect(); } catch {}
    }

    this.activePort = chrome.runtime.connect({ name: 'YT_AI_STREAM' });
    this.activePort.onMessage.addListener((msg) => {
      if (msg.type === 'CHUNK') {
        onChunk(msg.text);
      } else if (msg.type === 'REASONING_CHUNK') {
        this.summaryView?.setReasoning(msg.text, this.i18n.t('reasoningInProgress'));
      } else if (msg.type === 'DONE') {
        this.activePort.disconnect();
        this.activePort = null;
      } else if (msg.type === 'ERROR') {
        this.summaryView?.setSummaryContent(`<p style="color:#ff7b72;">${this.i18n.t('errorLabel')} ${msg.error}</p>`);
      }
    });

    const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    this.activePort.postMessage({
      action: 'STREAM_CHAT',
      provider: this.provider,
      model: this.model,
      messages: fullMessages,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    });
  }

  seekVideo(seconds) {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seconds;
      video.play().catch(() => {});
    }
  }

  formatMarkdownHtml(md) {
    return md
      .replace(/### (.*?)\n/g, '<h3 style="color:#ff7b72; margin:12px 0 6px;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/- (.*?)\n/g, '<li style="margin-left:20px;">$1</li>')
      .replace(/\n\n/g, '<br><br>');
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    const body = document.getElementById('yt-ai-body');
    if (body) body.classList.toggle('yt-ai-hidden', !this.isExpanded);
  }

  async changeLanguage(lang) {
    this.targetLang = lang;
    this.i18n.setLanguage(lang);
    await this.storage.set('targetLang', lang);
  }

  downloadSummary(format) {
    const title = document.title.replace(/ - YouTube$/, '');
    const data = {
      title,
      summary: this.currentSummary,
      segments: this.cachedTranscript?.segments || []
    };
    if (format === 'md') {
      this.exportService.downloadFile(`${title}.md`, this.exportService.exportMarkdown(data), 'text/markdown;charset=utf-8');
    } else if (format === 'txt') {
      this.exportService.downloadFile(`${title}.txt`, this.exportService.exportPlainText(data), 'text/plain;charset=utf-8');
    } else if (format === 'json') {
      this.exportService.downloadFile(`${title}.json`, this.exportService.exportJSON(data), 'application/json;charset=utf-8');
    }
  }

  toggleSpeech() {
    if (this.ttsService.isPlaying) {
      this.ttsService.stop();
    } else {
      this.ttsService.speak(this.currentSummary, { speed: this.ttsSpeed, lang: this.targetLang });
    }
  }
}

export default ContentController;
