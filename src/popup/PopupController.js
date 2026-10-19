import { ChromeStorageService } from '../services/implementations/ChromeStorageService.js';
import { I18nService } from '../services/implementations/I18nService.js';
import { AIProviderFactory } from '../services/ai/providers/AIProviderFactory.js';
import { ExportService } from '../services/implementations/ExportService.js';
import { VideoMetadata } from '../domain/models/VideoMetadata.js';

/**
 * Controller for Extension Popup Window
 */
export class PopupController {
  constructor() {
    this.storage = new ChromeStorageService();
    this.i18n = new I18nService('en');
    this.exportService = new ExportService();
    this.currentVideoData = null;
    this.isSummarizing = false;
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.checkCurrentTab();
  }

  async loadSettings() {
    const settings = await this.storage.getMultiple([
      'serverUrl',
      'targetLang',
      'summaryMode',
      'selectedModel',
      'aiProvider'
    ]);

    const lang = settings.targetLang || 'en';
    this.i18n.setLanguage(lang);

    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = lang;

    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect && settings.summaryMode) {
      modeSelect.value = settings.summaryMode;
    }
  }

  setupEventListeners() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) {
      summarizeBtn.addEventListener('click', () => this.handleSummarize());
    }

    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.addEventListener('change', async (e) => {
        const newLang = e.target.value;
        this.i18n.setLanguage(newLang);
        await this.storage.set('targetLang', newLang);
      });
    }

    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
      modeSelect.addEventListener('change', async (e) => {
        await this.storage.set('summaryMode', e.target.value);
      });
    }

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = document.getElementById('summaryOutput')?.textContent || '';
        if (text) {
          navigator.clipboard.writeText(text);
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
        }
      });
    }

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const summary = document.getElementById('summaryOutput')?.textContent || '';
        const md = this.exportService.exportMarkdown({
          title: this.currentVideoData?.title || 'YouTube Summary',
          author: this.currentVideoData?.author || '',
          url: this.currentVideoData?.url || '',
          summary
        });
        this.exportService.downloadFile('summary.md', md, 'text/markdown;charset=utf-8');
      });
    }
  }

  async checkCurrentTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.url) return;

    const videoId = VideoMetadata.extractVideoId(tab.url);
    const notYoutubeCard = document.getElementById('notYoutubeCard');
    const videoInfoCard = document.getElementById('videoInfoCard');
    const controlsSection = document.getElementById('controlsSection');

    if (!videoId) {
      if (notYoutubeCard) notYoutubeCard.classList.remove('yt-ai-hidden');
      if (videoInfoCard) videoInfoCard.classList.add('yt-ai-hidden');
      if (controlsSection) controlsSection.classList.add('yt-ai-hidden');
      return;
    }

    if (notYoutubeCard) notYoutubeCard.classList.add('yt-ai-hidden');
    if (videoInfoCard) videoInfoCard.classList.remove('yt-ai-hidden');
    if (controlsSection) controlsSection.classList.remove('yt-ai-hidden');

    this.currentVideoData = {
      videoId,
      title: tab.title ? tab.title.replace(/ - YouTube$/, '') : 'YouTube Video',
      url: tab.url
    };

    const videoTitleEl = document.getElementById('videoTitle');
    if (videoTitleEl) videoTitleEl.textContent = this.currentVideoData.title;
  }

  async handleSummarize() {
    if (!this.currentVideoData?.videoId) return;

    // Send message to active tab to trigger inline summary
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_SUMMARIZE' });
      window.close(); // Close popup so user views summary in-page
    }
  }
}

export default PopupController;
