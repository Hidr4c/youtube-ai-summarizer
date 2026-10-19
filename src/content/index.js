import { I18N } from '../locales/index.js';
/**
 * content.js - YouTube AI Summarizer
 * Multi-Fournisseurs IA :
 *  - Locaux : LM Studio, Ollama (Local / Cloud)
 *  - Cloud : Google Gemini, Groq (LPU Ultra-rapide), OpenAI (ChatGPT), Anthropic Claude,
 *            DeepSeek, xAI (Grok), Qwen (Alibaba DashScope), Mistral AI, OpenRouter,
 *            Perplexity AI, Together AI.
 * Navigation par onglets : Synthèse IA, Chat Q&A interactif, Transcription intégrale.
 * Dictée vocale (Microphone Web Speech API) & Lecture audio (Text-to-Speech).
 * Synchronisation réactive sans rechargement lors des changements de vidéo.
 */

(function () {
  if (window.__ytAiSummarizerInjected) return;
  window.__ytAiSummarizerInjected = true;

  // Configuration des modèles Cloud recommandés par fournisseur
  const CLOUD_MODELS = {
    gemini: [
      { id: 'gemini-1.5-flash', name: '⭐ gemini-1.5-flash (Gratuit, 1M ctx)' },
      { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Nouveau & Rapide)' },
      { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (Analyse approfondie)' }
    ],
    groq: [
      { id: 'llama-3.3-70b-versatile', name: '⭐ llama-3.3-70b-versatile (Ultra-rapide)' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'deepseek-r1-distill-llama-70b (R1 Thinking)' },
      { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant (Éclair)' },
      { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768 (Mixtral)' }
    ],
    openai: [
      { id: 'gpt-4o-mini', name: '⭐ gpt-4o-mini (Économique & Rapide)' },
      { id: 'gpt-4o', name: 'gpt-4o (Modèle phare)' },
      { id: 'o3-mini', name: 'o3-mini (Raisonnement)' }
    ],
    claude: [
      { id: 'claude-3-5-haiku-20241022', name: '⭐ claude-3-5-haiku (Rapide)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet (Excellence)' }
    ],
    deepseek: [
      { id: 'deepseek-chat', name: '⭐ deepseek-chat (V3)' },
      { id: 'deepseek-reasoner', name: 'deepseek-reasoner (R1 Thinking)' }
    ],
    grok: [
      { id: 'grok-2-latest', name: '⭐ grok-2-latest' },
      { id: 'grok-2-vision-1212', name: 'grok-2-vision' },
      { id: 'grok-beta', name: 'grok-beta' }
    ],
    qwen: [
      { id: 'qwen-plus', name: '⭐ qwen-plus (Équilibré & Efficace)' },
      { id: 'qwen-max', name: 'qwen-max (Maximum de puissance)' },
      { id: 'qwen-turbo', name: 'qwen-turbo (Ultra rapide)' },
      { id: 'qwen2.5-72b-instruct', name: 'qwen2.5-72b-instruct' }
    ],
    mistral: [
      { id: 'mistral-small-latest', name: '⭐ mistral-small-latest (Rapide)' },
      { id: 'mistral-large-latest', name: 'mistral-large-latest (Modèle phare)' },
      { id: 'codestral-latest', name: 'codestral-latest' }
    ],
    openrouter: [
      { id: 'deepseek/deepseek-r1', name: '⭐ deepseek/deepseek-r1' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'qwen/qwen-2.5-72b-instruct' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'meta-llama/llama-3.3-70b-instruct' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'anthropic/claude-3.5-sonnet' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'google/gemini-2.0-flash-exp (Gratuit)' }
    ],
    perplexity: [
      { id: 'sonar', name: '⭐ sonar (Rapide)' },
      { id: 'sonar-pro', name: 'sonar-pro' },
      { id: 'sonar-reasoning', name: 'sonar-reasoning' }
    ],
    together: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: '⭐ Llama-3.3-70B-Instruct-Turbo' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen2.5-72B-Instruct-Turbo' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'deepseek-ai/DeepSeek-R1' }
    ]
  };

  const API_KEY_PORTALS = {
    gemini: { url: 'https://aistudio.google.com/app/apikey', label: '🔑 Obtenir clé Gemini (100% Gratuite)' },
    groq: { url: 'https://console.groq.com/keys', label: '🔑 Obtenir clé Groq (Gratuite & Ultra-rapide)' },
    openai: { url: 'https://platform.openai.com/api-keys', label: '🔑 Obtenir clé OpenAI' },
    claude: { url: 'https://console.anthropic.com/settings/keys', label: '🔑 Obtenir clé Claude' },
    deepseek: { url: 'https://platform.deepseek.com/api_keys', label: '🔑 Obtenir clé DeepSeek' },
    grok: { url: 'https://console.x.ai/', label: '🔑 Obtenir clé Grok (xAI)' },
    qwen: { url: 'https://dashscope.console.aliyun.com/', label: '🔑 Obtenir clé Qwen (DashScope)' },
    mistral: { url: 'https://console.mistral.ai/api-keys/', label: '🔑 Obtenir clé Mistral' },
    openrouter: { url: 'https://openrouter.ai/keys', label: '🔑 Obtenir clé OpenRouter' },
    perplexity: { url: 'https://www.perplexity.ai/settings/api', label: '🔑 Obtenir clé Perplexity' },
    together: { url: 'https://api.together.xyz/settings/api-keys', label: '🔑 Obtenir clé Together AI' }
  };

  // Limites de caractères adaptatives pour chaque modèle
  const CONTEXT_LIMITS = {
    lmstudio: 16000,
    ollama: 16000,
    gemini: 120000,
    groq: 50000,
    openai: 80000,
    claude: 90000,
    deepseek: 50000,
    grok: 70000,
    qwen: 60000,
    mistral: 60000,
    openrouter: 80000,
    perplexity: 50000,
    together: 60000
  };

  const PROVIDER_NAMES = {
    lmstudio: 'LM Studio',
    ollama: 'Ollama',
    gemini: 'Google Gemini',
    groq: 'Groq',
    openai: 'OpenAI (ChatGPT)',
    claude: 'Anthropic Claude',
    deepseek: 'DeepSeek',
    grok: 'xAI (Grok)',
    qwen: 'Qwen (DashScope)',
    mistral: 'Mistral AI',
    openrouter: 'OpenRouter',
    perplexity: 'Perplexity AI',
    together: 'Together AI'
  };

  const SPEECH_LANG_MAP = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE',
    it: 'it-IT',
    ru: 'ru-RU',
    ja: 'ja-JP',
    zh: 'zh-CN'
  };
  let currentLang = 'fr';
  let currentProvider = 'lmstudio';
  let serverUrls = {
    lmstudio: 'http://192.168.56.1:1234',
    ollama: 'http://localhost:11434'
  };
  let availableLocalModels = {
    lmstudio: [],
    ollama: []
  };
  let selectedModels = {
    lmstudio: '',
    ollama: '',
    gemini: 'gemini-1.5-flash',
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    claude: 'claude-3-5-haiku-20241022',
    deepseek: 'deepseek-chat',
    grok: 'grok-2-latest',
    qwen: 'qwen-plus',
    mistral: 'mistral-small-latest',
    openrouter: 'deepseek/deepseek-r1',
    perplexity: 'sonar',
    together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  };
  let selectedModel = '';

  function getActiveModel() {
    return selectedModels[currentProvider] || selectedModel || '';
  }

  function setActiveModel(model) {
    selectedModels[currentProvider] = model || '';
    selectedModel = model || '';
  }

  let apiKeys = {
    gemini: '',
    groq: '',
    openai: '',
    claude: '',
    deepseek: '',
    grok: '',
    qwen: '',
    mistral: '',
    openrouter: '',
    perplexity: '',
    together: '',
    ollama: ''
  };
  let isExpanded = false; // Rétracté par défaut
  let isGenerating = false;
  let activePort = null;
  let chatPort = null;
  let fullSummaryMarkdown = '';
  let fullReasoningText = '';
  let lastVideoId = '';
  let lastObservedUrl = window.location.href;

  // État Synthèse vocale (Text-to-Speech)
  let availableVoices = [];
  let selectedVoiceURI = '';
  let activeSpeakingButton = null;

  // État Reconnaissance vocale (Speech-to-Text / Dictée micro)
  let speechRecognition = null;
  let isDictating = false;
  let isWhisperRecording = false;
  let activeMediaRecorder = null;
  let recordedAudioChunks = [];
  let selectedMicDeviceId = '';
  let availableMicrophones = [];
  let isBraveBrowser = false;
  try {
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      navigator.brave.isBrave().then(val => { isBraveBrowser = !!val; }).catch(() => {});
    }
  } catch (e) {}

  // Cache mémoire de la transcription de la vidéo courante
  let cachedTranscript = {
    videoId: '',
    segments: [],
    fullText: ''
  };

  // Options Avancées
  let localWhisperUrl = '';
  let temperature = '0.3';
  let maxTokens = 'auto';
  let ttsSpeed = '1.0';
  let autoSummarize = false;
  let customPrompt = '';
  let currentMode = 'standard';
  let lastProcessedVideoId = '';

  // Historique de conversation pour le Chat Q&A
  let chatHistory = [];

  function safeSetInnerHTML(element, html) {
    if (!element) return;
    try {
      if (window.trustedTypes && window.trustedTypes.defaultPolicy) {
        element.innerHTML = window.trustedTypes.defaultPolicy.createHTML(html);
        return;
      }
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        if (!window.__ytAiPolicy) {
          try {
            window.__ytAiPolicy = window.trustedTypes.createPolicy('yt-ai-policy', {
              createHTML: s => s
            });
          } catch (e) {}
        }
        if (window.__ytAiPolicy) {
          element.innerHTML = window.__ytAiPolicy.createHTML(html);
          return;
        }
      }
      element.innerHTML = html;
    } catch (e) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        element.replaceChildren(...doc.body.childNodes);
      } catch (err) {
        element.textContent = (html || '').replace(/<[^>]*>/g, '');
      }
    }
  }

  init();

  function init() {
    loadPreferences();
    initSpeechSynthesis();
    initMicrophoneDevices();
    observeNavigation();
    tryInjectBanner();
  }

  function loadPreferences() {
    if (chrome.storage && chrome.storage.local) {
      const keysToLoad = [
        'aiProvider',
        'serverUrl_lmstudio',
        'serverUrl_ollama',
        'serverUrl',
        'selectedModel',
        'targetLang',
        'summaryMode',
        'selectedVoiceURI',
        'selectedMicDeviceId',
        'localWhisperUrl',
        'temperature',
        'maxTokens',
        'ttsSpeed',
        'autoSummarize',
        'customPrompt',
        'apiKey_gemini',
        'apiKey_groq',
        'apiKey_openai',
        'apiKey_claude',
        'apiKey_deepseek',
        'apiKey_grok',
        'apiKey_qwen',
        'apiKey_mistral',
        'apiKey_openrouter',
        'apiKey_perplexity',
        'apiKey_together',
        'apiKey_ollama'
      ];
      Object.keys(PROVIDER_NAMES).forEach(p => {
        keysToLoad.push(`selectedModel_${p}`);
      });

      chrome.storage.local.get(keysToLoad, (data) => {
        if (data.aiProvider) currentProvider = data.aiProvider;
        if (data.serverUrl_lmstudio) serverUrls.lmstudio = data.serverUrl_lmstudio;
        else if (data.serverUrl) serverUrls.lmstudio = data.serverUrl;
        if (!serverUrls.lmstudio) serverUrls.lmstudio = 'http://192.168.56.1:1234';
        if (data.serverUrl_ollama) serverUrls.ollama = data.serverUrl_ollama;

        Object.keys(PROVIDER_NAMES).forEach(p => {
          if (data[`selectedModel_${p}`]) {
            selectedModels[p] = data[`selectedModel_${p}`];
          }
        });

        // Migration de l'ancien selectedModel global s'il existe
        if (data.selectedModel) {
          const hasSlash = data.selectedModel.includes('/');
          const isCloud = !hasSlash && ['claude', 'gpt', 'gemini', 'deepseek-chat', 'deepseek-coder', 'grok', 'qwen-plus', 'qwen-max', 'qwen-turbo', 'mistral', 'sonar'].some(p => data.selectedModel.startsWith(p));
          if (currentProvider === 'lmstudio' || currentProvider === 'ollama') {
            if (!isCloud && !selectedModels[currentProvider]) {
              selectedModels[currentProvider] = data.selectedModel;
            }
          } else if (!selectedModels[currentProvider]) {
            selectedModels[currentProvider] = data.selectedModel;
          }
        }
        selectedModel = getActiveModel();

        if (data.selectedVoiceURI) selectedVoiceURI = data.selectedVoiceURI;
        if (data.selectedMicDeviceId) selectedMicDeviceId = data.selectedMicDeviceId;
        if (data.localWhisperUrl) localWhisperUrl = data.localWhisperUrl;
        if (data.temperature) temperature = data.temperature;
        if (data.maxTokens) maxTokens = data.maxTokens;
        if (data.ttsSpeed) ttsSpeed = data.ttsSpeed;
        if (data.autoSummarize !== undefined) autoSummarize = !!data.autoSummarize;
        if (data.customPrompt) customPrompt = data.customPrompt;

        if (data.summaryMode) currentMode = data.summaryMode;
        syncSettingsUI();

        if (data.targetLang) {
          currentLang = data.targetLang;
        } else {
          currentLang = 'fr';
        }
        const langSelect = document.getElementById('ytAiLangSelect');
        if (langSelect) langSelect.value = currentLang;
        applyLanguage(currentLang);

        Object.keys(apiKeys).forEach(k => {
          if (data[`apiKey_${k}`]) apiKeys[k] = data[`apiKey_${k}`];
        });

        syncProviderUI();
        if (currentProvider === 'lmstudio' || currentProvider === 'ollama') {
          refreshModelsList();
        } else {
          updateHeaderBadge();
        }
      });
    } else {
      syncProviderUI();
      syncSettingsUI();
      refreshModelsList();
    }
  }

  function syncSettingsUI() {
    const whisperInput = document.getElementById('ytAiWhisperUrlInput');
    if (whisperInput) whisperInput.value = localWhisperUrl;
    const tempSelect = document.getElementById('ytAiTemperatureSelect');
    if (tempSelect) tempSelect.value = temperature;
    const maxTokensSelect = document.getElementById('ytAiMaxTokensSelect');
    if (maxTokensSelect) maxTokensSelect.value = maxTokens;
    const ttsSpeedSelect = document.getElementById('ytAiTtsSpeedSelect');
    if (ttsSpeedSelect) ttsSpeedSelect.value = ttsSpeed;
    const autoSumCheck = document.getElementById('ytAiAutoSummarizeCheck');
    if (autoSumCheck) autoSumCheck.checked = autoSummarize;
    const customPromptInput = document.getElementById('ytAiCustomPromptInput');
    if (customPromptInput) customPromptInput.value = customPrompt;
    setSummaryMode(currentMode);
  }

  function savePreference(key, val) {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: val });
    }
  }

  /**
   * =========================================================================
   * GESTION DE LA NAVIGATION YOUTUBE (SPA) ET DÉTECTION ROBUSTE DES CHANGEMENTS
   * =========================================================================
   */
  function observeNavigation() {
    window.addEventListener('yt-navigate-finish', handleUrlChange);
    window.addEventListener('yt-page-data-updated', handleUrlChange);
    window.addEventListener('spfdone', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    setInterval(() => {
      if (window.location.href !== lastObservedUrl) {
        lastObservedUrl = window.location.href;
        handleUrlChange();
      }
    }, 350);

    const observer = new MutationObserver(() => {
      const banner = document.getElementById('yt-ai-summarizer-container');
      if ((!banner || !banner.isConnected) && isWatchPage()) {
        tryInjectBanner();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function isWatchPage() {
    return window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v');
  }

  function getVideoId() {
    return new URLSearchParams(window.location.search).get('v') || '';
  }

  function handleUrlChange() {
    const banner = document.getElementById('yt-ai-summarizer-container');
    const currentId = getVideoId();

    if (!isWatchPage()) {
      if (banner) banner.classList.add('yt-ai-hidden');
      stopSpeech();
      stopDictation();
      return;
    }

    if (banner && banner.isConnected) {
      banner.classList.remove('yt-ai-hidden');
      if (currentId && currentId !== lastVideoId) {
        lastVideoId = currentId;
        resetAllStateForNewVideo();
        if (autoSummarize) {
          setTimeout(() => {
            if (getVideoId() === currentId && !isGenerating && !fullSummaryMarkdown) {
              setExpanded(true);
              switchTab('summary');
              startSummarization();
            }
          }, 1500);
        }
      }
    } else {
      tryInjectBanner();
    }
  }

  function resetAllStateForNewVideo() {
    stopSpeech();
    stopDictation();
    if (activePort) {
      try { activePort.disconnect(); } catch (e) {}
      activePort = null;
    }
    if (chatPort) {
      try { chatPort.disconnect(); } catch (e) {}
      chatPort = null;
    }
    isGenerating = false;

    cachedTranscript = { videoId: '', segments: [], fullText: '' };
    chatHistory = [];
    resetSummaryOutput();
    resetChatOutput();
    resetTranscriptOutput();
    updateHeaderModelText();
  }

  /**
   * =========================================================================
   * SYNTHÈSE VOCALE (TEXT-TO-SPEECH - WEB SPEECH API)
   * =========================================================================
   */
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) return;

    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      if (all && all.length > 0) {
        availableVoices = all;
        populateVoiceDropdown();
      }
    }

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  function populateVoiceDropdown() {
    const select = document.getElementById('ytAiVoiceSelect');
    if (!select) return;

    const currentLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    select.replaceChildren();

    const matching = availableVoices.filter(v => v.lang.toLowerCase().startsWith(currentLang));
    const listToDisplay = matching.length > 0 ? matching : availableVoices;

    listToDisplay.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (selectedVoiceURI && v.voiceURI === selectedVoiceURI) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    if (!select.value && select.options.length > 0) {
      const preferred = Array.from(select.options).find(o => o.textContent.includes('Google') || o.textContent.includes('Natural'));
      if (preferred) {
        select.value = preferred.value;
      } else {
        select.selectedIndex = 0;
      }
      selectedVoiceURI = select.value;
    }
  }

  /**
   * Applique dynamiquement la langue choisie à toute l'interface de l'extension
   */
  function applyLanguage(lang) {
    currentLang = lang;
    const t = I18N[lang] || I18N.en;

    // 0. Synchronisation du sélecteur de langue dans l'entête
    const langSelect = document.getElementById('ytAiLangSelect');
    if (langSelect && langSelect.value !== lang) {
      langSelect.value = lang;
    }

    // 1. Header & Brand
    const brandTitle = document.getElementById('ytAiBrandTitle');
    if (brandTitle) brandTitle.textContent = t.brandName || 'YT Summarizer AI';

    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    if (summarizeBtn && !isGenerating) {
      summarizeBtn.textContent = t.summarizeBtn;
    }
    const heroBtn = document.getElementById('ytAiSummaryHeroBtn');
    if (heroBtn && !isGenerating) {
      heroBtn.textContent = t.summarizeBtn || '✨ Summarize video';
    }
    const toggleText = document.getElementById('ytAiToggleText');
    if (toggleText) {
      toggleText.textContent = isExpanded ? t.collapse : t.expand;
    }
    const toggleIcon = document.getElementById('ytAiToggleIcon');
    if (toggleIcon) {
      toggleIcon.textContent = isExpanded ? '▲' : '▾';
    }

    const settingsBtnText = document.getElementById('ytAiSettingsBtnText');
    if (settingsBtnText) {
      settingsBtnText.textContent = t.settingsBtn || 'Settings';
    }

    // 2. Format pills & select
    const pillQuick = document.getElementById('ytAiFormatPillQuick');
    if (pillQuick) pillQuick.textContent = t.formatQuick;
    const pillStd = document.getElementById('ytAiFormatPillStandard');
    if (pillStd) pillStd.textContent = t.formatStandard;
    const pillDeep = document.getElementById('ytAiFormatPillDetailed');
    if (pillDeep) pillDeep.textContent = t.formatDetailed;

    const modeSelect = document.getElementById('ytAiModeSelect');
    if (modeSelect) {
      const optStd = modeSelect.querySelector('option[value="standard"]');
      const optQuick = modeSelect.querySelector('option[value="quick"]');
      const optDetailed = modeSelect.querySelector('option[value="detailed"]');
      if (optStd) optStd.textContent = t.formatStandard;
      if (optQuick) optQuick.textContent = t.formatQuick;
      if (optDetailed) optDetailed.textContent = t.formatDetailed;
    }

    // 3. Settings Sub-Tabs Titles
    const tabSettingsModelBtn = document.getElementById('ytAiTabSettingsModelBtn');
    if (tabSettingsModelBtn) tabSettingsModelBtn.textContent = t.tabSettingsModel;
    const tabSettingsAudioBtn = document.getElementById('ytAiTabSettingsAudioBtn');
    if (tabSettingsAudioBtn) tabSettingsAudioBtn.textContent = t.tabSettingsAudio;
    const tabSettingsParamsBtn = document.getElementById('ytAiTabSettingsParamsBtn');
    if (tabSettingsParamsBtn) tabSettingsParamsBtn.textContent = t.tabSettingsParams;

    // 4. Model & Server settings
    const providerLabel = document.getElementById('ytAiProviderLabel');
    if (providerLabel) providerLabel.textContent = t.providerLabel;

    const serverLabel = document.getElementById('ytAiServerLabel');
    if (serverLabel) {
      serverLabel.textContent = currentProvider === 'ollama' ? t.serverLabelOllama : t.serverLabelLm;
    }

    const apiKeyLabel = document.getElementById('ytAiApiKeyLabel');
    if (apiKeyLabel) apiKeyLabel.textContent = t.apiKeyLabel;

    const apiKeyInput = document.getElementById('ytAiApiKeyInput');
    if (apiKeyInput) apiKeyInput.placeholder = t.apiKeyPlaceholder;

    const getApiKeyLink = document.getElementById('ytAiGetApiKeyLink');
    if (getApiKeyLink && currentProvider && API_KEY_PORTALS[currentProvider]) {
      getApiKeyLink.textContent = API_KEY_PORTALS[currentProvider].label;
    }

    const modelLabel = document.getElementById('ytAiModelLabel');
    if (modelLabel) modelLabel.textContent = t.modelLabel;

    const testBtn = document.getElementById('ytAiTestModelBtn');
    if (testBtn) {
      testBtn.textContent = t.testModelBtn;
      testBtn.title = t.testModelTooltip;
    }

    const refreshBtn = document.getElementById('ytAiRefreshModelsBtn');
    if (refreshBtn) refreshBtn.title = t.refreshTooltip;

    // 5. Provider select optgroups
    const providerSelect = document.getElementById('ytAiProviderSelect');
    if (providerSelect) {
      const groups = providerSelect.querySelectorAll('optgroup');
      if (groups[0]) groups[0].label = t.groupLocal;
      if (groups[1]) groups[1].label = t.groupFast;
      if (groups[2]) groups[2].label = t.groupCloud;
    }

    // 6. Voice & Audio settings
    const voiceLabel = document.getElementById('ytAiVoiceLabel');
    if (voiceLabel) voiceLabel.textContent = t.voiceLabel;

    const micLabel = document.getElementById('ytAiMicLabel');
    if (micLabel) micLabel.textContent = t.micLabel;

    const micSelect = document.getElementById('ytAiMicSelect');
    if (micSelect && micSelect.firstElementChild && !micSelect.firstElementChild.value) {
      micSelect.firstElementChild.textContent = t.micDefault;
    }

    const ttsSpeedLabel = document.getElementById('ytAiTtsSpeedLabel');
    if (ttsSpeedLabel) ttsSpeedLabel.textContent = t.ttsSpeedLabel;

    const ttsSpeedSelect = document.getElementById('ytAiTtsSpeedSelect');
    if (ttsSpeedSelect) {
      const s075 = ttsSpeedSelect.querySelector('option[value="0.75"]');
      if (s075) s075.textContent = t.speedSlow;
      const s10 = ttsSpeedSelect.querySelector('option[value="1.0"]');
      if (s10) s10.textContent = t.speedNormal;
      const s125 = ttsSpeedSelect.querySelector('option[value="1.25"]');
      if (s125) s125.textContent = t.speedFast;
      const s15 = ttsSpeedSelect.querySelector('option[value="1.5"]');
      if (s15) s15.textContent = t.speedVeryFast;
      const s20 = ttsSpeedSelect.querySelector('option[value="2.0"]');
      if (s20) s20.textContent = t.speedDouble;
    }

    const whisperUrlLabel = document.getElementById('ytAiWhisperUrlLabel');
    if (whisperUrlLabel) whisperUrlLabel.textContent = t.whisperUrlLabel;

    const whisperUrlInput = document.getElementById('ytAiWhisperUrlInput');
    if (whisperUrlInput) whisperUrlInput.placeholder = t.whisperUrlPlaceholder;

    const testWhisperBtn = document.getElementById('ytAiTestWhisperBtn');
    if (testWhisperBtn) testWhisperBtn.textContent = t.testSttBtn;

    // 7. Parameters & Prompt
    const modeLabel = document.getElementById('ytAiModeLabel');
    if (modeLabel) modeLabel.textContent = t.formatLabel || 'Format:';

    const tempLabel = document.getElementById('ytAiTempLabel');
    if (tempLabel) tempLabel.textContent = t.tempLabel;

    const tempSelect = document.getElementById('ytAiTemperatureSelect');
    if (tempSelect) {
      const t00 = tempSelect.querySelector('option[value="0.0"]');
      if (t00) t00.textContent = t.tempStrict;
      const t03 = tempSelect.querySelector('option[value="0.3"]');
      if (t03) t03.textContent = t.tempBalanced;
      const t07 = tempSelect.querySelector('option[value="0.7"]');
      if (t07) t07.textContent = t.tempCreative;
      const t10 = tempSelect.querySelector('option[value="1.0"]');
      if (t10) t10.textContent = t.tempWild;
    }

    const maxTokensLabel = document.getElementById('ytAiMaxTokensLabel');
    if (maxTokensLabel) maxTokensLabel.textContent = t.maxTokensLabel;

    const maxTokensSelect = document.getElementById('ytAiMaxTokensSelect');
    if (maxTokensSelect) {
      const tokAuto = maxTokensSelect.querySelector('option[value="auto"]');
      if (tokAuto) tokAuto.textContent = t.tokensAuto;
      const tok1024 = maxTokensSelect.querySelector('option[value="1024"]');
      if (tok1024) tok1024.textContent = t.tokensShort;
      const tok2048 = maxTokensSelect.querySelector('option[value="2048"]');
      if (tok2048) tok2048.textContent = t.tokensStandard;
      const tok4096 = maxTokensSelect.querySelector('option[value="4096"]');
      if (tok4096) tok4096.textContent = t.tokensDetailed;
      const tok8192 = maxTokensSelect.querySelector('option[value="8192"]');
      if (tok8192) tok8192.textContent = t.tokensMax;
    }

    const autoSummarizeLabel = document.getElementById('ytAiAutoSummarizeLabel');
    if (autoSummarizeLabel) autoSummarizeLabel.textContent = t.autoSummarizeLabel;

    const customPromptLabel = document.getElementById('ytAiCustomPromptLabel');
    if (customPromptLabel) customPromptLabel.textContent = t.customPromptLabel;

    const customPromptInput = document.getElementById('ytAiCustomPromptInput');
    if (customPromptInput) customPromptInput.placeholder = t.customPromptPlaceholder;

    // 8. Main Tabs Navigation
    const tabSummaryBtn = document.getElementById('ytAiTabSummaryBtn');
    if (tabSummaryBtn) tabSummaryBtn.textContent = t.tabSummary;

    const tabChatBtn = document.getElementById('ytAiTabChatBtn');
    if (tabChatBtn) {
      const chatCount = document.getElementById('ytAiChatCount')?.textContent || '0';
      tabChatBtn.textContent = `${t.tabChat} `;
      const badge = document.createElement('span');
      badge.id = 'ytAiChatCount';
      badge.className = 'yt-ai-tab-count-badge';
      badge.textContent = chatCount;
      tabChatBtn.appendChild(badge);
    }

    const tabTranscriptBtn = document.getElementById('ytAiTabTranscriptBtn');
    if (tabTranscriptBtn) {
      const numWords = cachedTranscript.segments && cachedTranscript.segments.length > 0 
        ? cachedTranscript.fullText.split(/\s+/).filter(Boolean).length 
        : 0;
      tabTranscriptBtn.textContent = `${t.tabTranscript} `;
      const badge = document.createElement('span');
      badge.id = 'ytAiWordCountTab';
      badge.className = 'yt-ai-tab-count-badge';
      badge.textContent = `${numWords.toLocaleString()} ${t.wordsBadge}`;
      tabTranscriptBtn.appendChild(badge);
    }

    // 9. Barre d'outils Synthèse
    const summaryHeaderTitle = document.getElementById('ytAiSummaryHeaderTitle');
    if (summaryHeaderTitle) {
      const provName = currentProvider === 'ollama' ? 'Ollama' : (currentProvider === 'lmstudio' ? 'LM Studio' : (PROVIDER_NAMES[currentProvider] || currentProvider));
      summaryHeaderTitle.textContent = `${t.summaryTitle} (${provName})`;
    }

    const speakSummaryBtn = document.getElementById('ytAiSpeakSummaryBtn');
    if (speakSummaryBtn && !activeSpeakingButton) speakSummaryBtn.textContent = t.listenBtn;

    const copyBtn = document.getElementById('ytAiCopyBtn');
    if (copyBtn) copyBtn.textContent = t.copyBtn;

    const downloadBtn = document.getElementById('ytAiDownloadBtn');
    if (downloadBtn) downloadBtn.textContent = t.saveMdBtn;

    const saveTxtBtn = document.getElementById('ytAiSaveTxtBtn');
    if (saveTxtBtn) saveTxtBtn.textContent = t.saveTxtBtn;

    const saveJsonBtn = document.getElementById('ytAiSaveJsonBtn');
    if (saveJsonBtn) saveJsonBtn.textContent = t.saveJsonBtn;

    // Placeholder de synthèse si vide
    const summaryBody = document.getElementById('ytAiSummaryBody');
    if (summaryBody && (!fullSummaryMarkdown || summaryBody.querySelector('.yt-ai-empty-state') || summaryBody.querySelector('p[style*="italic"]'))) {
      renderSummaryEmptyState(false);
    }

    // 10. Chat Box
    const chatPaneTitle = document.querySelector('#ytAiPaneChat .yt-ai-pane-title span');
    if (chatPaneTitle) chatPaneTitle.textContent = t.chatTitle;

    const clearChatBtn = document.getElementById('ytAiClearChatBtn');
    if (clearChatBtn) clearChatBtn.textContent = t.clearChatBtn;

    // Régénération des 4 suggestions rapides dans la langue cible
    const suggestionsContainer = document.querySelector('.yt-ai-chat-suggestions');
    if (suggestionsContainer && t.suggestions) {
      suggestionsContainer.textContent = '';
      t.suggestions.forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'yt-ai-suggestion-chip';
        chip.setAttribute('data-question', s.question);
        chip.textContent = s.label;
        chip.addEventListener('click', () => {
          handleSendChatMessage(s.question);
        });
        suggestionsContainer.appendChild(chip);
      });
    }

    // Message d'accueil du chat si vide
    if (chatHistory.length === 0) {
      const chatMessages = document.getElementById('ytAiChatMessages');
      if (chatMessages) {
        chatMessages.textContent = '';
        const welcomeBubble = document.createElement('div');
        welcomeBubble.className = 'yt-ai-chat-bubble ai';
        welcomeBubble.textContent = t.chatWelcome;
        chatMessages.appendChild(welcomeBubble);
      }
    }

    const chatInput = document.getElementById('ytAiChatInput');
    if (chatInput && !isDictating) {
      chatInput.placeholder = t.chatPlaceholder;
    }

    const micBtn = document.getElementById('ytAiMicBtn');
    if (micBtn && !isDictating) {
      micBtn.title = t.micTitle;
    }

    const sendChatBtn = document.getElementById('ytAiSendChatBtn');
    if (sendChatBtn) sendChatBtn.textContent = t.sendBtn;

    // 11. Onglet Transcription
    const transcriptPaneTitle = document.querySelector('#ytAiPaneTranscript .yt-ai-pane-title span');
    if (transcriptPaneTitle) {
      const count = document.getElementById('ytAiWordCount')?.textContent || '0';
      transcriptPaneTitle.textContent = `${t.transcriptTitle} (`;
      const countSpan = document.createElement('span');
      countSpan.id = 'ytAiWordCount';
      countSpan.textContent = count;
      transcriptPaneTitle.appendChild(countSpan);
      transcriptPaneTitle.appendChild(document.createTextNode(` ${t.wordsBadge})`));
    }

    const copyTranscriptBtn = document.getElementById('ytAiCopyTranscriptBtn');
    if (copyTranscriptBtn) copyTranscriptBtn.textContent = t.copyRawBtn;

    const transcriptBody = document.getElementById('ytAiTranscriptBody');
    if (transcriptBody && (!cachedTranscript.fullText || transcriptBody.textContent.includes('...'))) {
      transcriptBody.textContent = t.transcriptWaiting;
    }

    // 12. Footer
    const footerAuthor = document.getElementById('ytAiFooterAuthor');
    if (footerAuthor) {
      safeSetInnerHTML(footerAuthor, `YouTube Summarizer AI <strong>v1.3.0</strong> ${t.footerBy} <a href="https://github.com/Hidr4c" target="_blank" rel="noopener">@Hidr4c</a>`);
    }
    const bugLink = document.getElementById('ytAiFooterBugLink');
    if (bugLink) bugLink.textContent = `🐛 ${t.footerReportBug}`;
    const docsLink = document.getElementById('ytAiFooterDocsLink');
    if (docsLink) docsLink.textContent = `📖 ${t.footerDocs}`;

    // 13. Mettre à jour les voix et badges pour la langue choisie
    populateVoiceDropdown();
    updateHeaderBadge();
    updateHeaderModelText();
  }


  function cleanMarkdownForSpeech(md) {
    if (!md) return '';
    return md
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/###+\s+/g, '. ')
      .replace(/##+\s+/g, '. ')
      .replace(/#+\s+/g, '. ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[-*•]\s+/gm, '')
      .replace(/\[\d{1,2}:\d{2}\]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\.\s*\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speakText(text, buttonEl) {
    if (!('speechSynthesis' in window)) {
      showStatusBanner("La synthèse vocale n'est pas supportée par ce navigateur.", true);
      return;
    }

    if (window.speechSynthesis.speaking && activeSpeakingButton === buttonEl) {
      stopSpeech();
      return;
    }

    stopSpeech();

    const clean = cleanMarkdownForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    utterance.lang = LANG_LOCALES[targetLang] || 'en-US';
    utterance.rate = parseFloat(ttsSpeed) || 1.0;
    utterance.pitch = 1.0;

    if (selectedVoiceURI) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }

    activeSpeakingButton = buttonEl;
    if (buttonEl) {
      buttonEl.classList.add('is-speaking');
      buttonEl.dataset.originalText = buttonEl.textContent;
      const t = I18N[targetLang] || I18N.en;
      buttonEl.textContent = t.stopListenBtn || '⏹️ Arrêter';
    }

    utterance.onend = () => {
      resetSpeakingButton(buttonEl);
      activeSpeakingButton = null;
    };

    utterance.onerror = () => {
      resetSpeakingButton(buttonEl);
      activeSpeakingButton = null;
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeSpeakingButton) {
      resetSpeakingButton(activeSpeakingButton);
      activeSpeakingButton = null;
    }
  }

  function resetSpeakingButton(btn) {
    if (!btn) return;
    btn.classList.remove('is-speaking');
    btn.textContent = btn.dataset.originalText || '🔊 Écouter';
  }

  /**
   * =========================================================================
   * GESTION DU MICROPHONE ET RECONNAISSANCE VOCALE (SPEECH-TO-TEXT)
   * =========================================================================
   */
  async function initMicrophoneDevices() {
    await refreshMicrophonesList();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshMicrophonesList);
    }
  }

  async function refreshMicrophonesList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableMicrophones = devices.filter(d => d.kind === 'audioinput');
      const micSelect = document.getElementById('ytAiMicSelect');
      if (!micSelect) return;

      micSelect.innerHTML = '<option value="">🎙️ Micro par défaut</option>';
      availableMicrophones.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = `🎙️ ${dev.label || `Microphone ${idx + 1}`}`;
        if (dev.deviceId && dev.deviceId === selectedMicDeviceId) {
          opt.selected = true;
        }
        micSelect.appendChild(opt);
      });
    } catch (err) {
      console.warn('Erreur enumeration micros:', err);
    }
  }

  let dictationBaseText = '';

  async function toggleDictation() {
    if (isDictating) {
      stopDictation();
      return;
    }

    // Priorité 0 : Serveur Whisper Local si configuré (100% Hors-ligne / Privé)
    if (localWhisperUrl) {
      startWhisperRecording('', 'local', localWhisperUrl);
      return;
    }

    const groqKey = apiKeys.groq || '';
    const openaiKey = apiKeys.openai || '';

    // Priorité 1 : Si une clé Groq (gratuite) ou OpenAI est configurée, Whisper offre une transcription universelle parfaite
    if (groqKey) {
      startWhisperRecording(groqKey, 'groq');
      return;
    }
    if (openaiKey) {
      startWhisperRecording(openaiKey, 'openai');
      return;
    }

    // Priorité 2 : Détection de Brave (Brave a supprimé les serveurs vocaux de Google de son binaire)
    let isBrave = isBraveBrowser;
    if (!isBrave && navigator.brave && typeof navigator.brave.isBrave === 'function') {
      try { isBrave = await navigator.brave.isBrave(); } catch (e) {}
    }

    if (isBrave) {
      const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
      const t = I18N[targetLang] || I18N.en;
      showMicNotice("Brave blocks Google speech services. Enter a 'Local Whisper Server' in Advanced Options or add a free Groq key!", true);
      return;
    }

    // Priorité 3 : Sous Chrome standard / Edge, utilisation du service Web Speech natif
    startDictation();
  }

  async function startWhisperRecording(apiKey, provider, customUrl = '') {
    stopSpeech();
    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[targetLang] || I18N.en;

    try {
      const constraints = selectedMicDeviceId
        ? { audio: { deviceId: { exact: selectedMicDeviceId } } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await refreshMicrophonesList();

      recordedAudioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

      activeMediaRecorder = new MediaRecorder(stream, { mimeType });

      activeMediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedAudioChunks.push(e.data);
        }
      };

      activeMediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(recordedAudioChunks, { type: mimeType });
        if (audioBlob.size > 1500) {
          await transcribeWithWhisperApi(audioBlob, apiKey, provider, targetLang, customUrl);
        } else {
          showMicNotice("Enregistrement trop court.", false);
        }
      };

      activeMediaRecorder.start();
      isDictating = true;
      isWhisperRecording = true;

      const micBtn = document.getElementById('ytAiMicBtn');
      const chatInput = document.getElementById('ytAiChatInput');
      if (micBtn) {
        micBtn.classList.add('is-recording');
        micBtn.title = t.micStopTitle || "Arrêter la dictée";
        micBtn.innerHTML = '<span class="yt-ai-mic-icon">🔴</span>';
      }
      const labelDesc = provider === 'local' ? 'Whisper Local' : (provider === 'groq' ? 'Whisper Groq' : 'Whisper');
      if (chatInput) {
        chatInput.placeholder = `🎙️ Enregistrement ${labelDesc} actif... Parlez, puis recliquez sur le micro pour transcrire.`;
      }
      showMicNotice(`🎙️ Enregistrement ${labelDesc} actif... Parlez, puis recliquez sur le micro pour transcrire.`, false);

    } catch (err) {
      console.warn('Whisper recording error:', err);
      showMicNotice(`${t.micErrorNotice} ${err.message || err.name}`, true);
      stopDictation();
    }
  }

  async function transcribeWithWhisperApi(audioBlob, apiKey, provider, targetLang, customUrl = '') {
    const micBtn = document.getElementById('ytAiMicBtn');
    const chatInput = document.getElementById('ytAiChatInput');

    if (micBtn) micBtn.innerHTML = '<span class="yt-ai-spinner"></span>';
    const isLocal = provider === 'local';
    showMicNotice(isLocal ? "⚡ Transcription via Serveur Whisper Local..." : "⚡ Transcription Whisper en cours...", false);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'speech.webm');
      formData.append('model', isLocal ? 'whisper-1' : (provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1'));
      if (targetLang) formData.append('language', targetLang);

      const endpoint = isLocal
        ? (customUrl || localWhisperUrl || 'http://localhost:8000/v1/audio/transcriptions')
        : (provider === 'groq'
            ? 'https://api.groq.com/openai/v1/audio/transcriptions'
            : 'https://api.openai.com/v1/audio/transcriptions');

      const headers = {};
      if (!isLocal && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const text = json.text?.trim() || '';

      if (text && chatInput) {
        chatInput.value = (chatInput.value ? chatInput.value.trim() + ' ' : '') + text;
        showMicNotice("✅ Dictée Whisper transcrite !", false);
      }
    } catch (err) {
      console.error('Whisper transcription error:', err);
      showMicNotice(`Erreur Whisper : ${err.message}`, true);
    } finally {
      if (micBtn) {
        micBtn.classList.remove('is-recording');
        micBtn.innerHTML = '<span class="yt-ai-mic-icon">🎤</span>';
      }
      const t = I18N[targetLang] || I18N.en;
      if (chatInput) {
        chatInput.placeholder = t.chatPlaceholder || "Ask a question or dictate with mic... (Press Enter to send)";
      }
    }
  }

  async function startDictation() {
    stopSpeech();

    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[targetLang] || I18N.en;

    // 1. Demande d'accès et vérification de la permission micro via getUserMedia
    try {
      const constraints = selectedMicDeviceId
        ? { audio: { deviceId: { exact: selectedMicDeviceId } } }
        : { audio: true };
      const testStream = await navigator.mediaDevices.getUserMedia(constraints);
      // TRÈS IMPORTANT : Libérer immédiatement le flux audio pour ne pas verrouiller le micro sur Windows
      testStream.getTracks().forEach(track => track.stop());
      await refreshMicrophonesList();
    } catch (err) {
      console.warn('getUserMedia permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showMicNotice(t.micBlockedNotice, true);
      } else {
        showMicNotice(`${t.micErrorNotice} ${err.message || err.name}`, true);
      }
      stopDictation();
      return;
    }

    // 2. Mise à jour de l'interface en mode enregistrement
    isDictating = true;
    const micBtn = document.getElementById('ytAiMicBtn');
    const chatInput = document.getElementById('ytAiChatInput');
    dictationBaseText = chatInput ? chatInput.value : '';

    if (micBtn) {
      micBtn.classList.add('is-recording');
      micBtn.title = t.micStopTitle || "Stop dictation";
      micBtn.innerHTML = '<span class="yt-ai-mic-icon">🔴</span>';
    }
    if (chatInput) {
      chatInput.placeholder = t.chatInputListening || "🎙️ Dictating... Speak into your microphone.";
    }
    showMicNotice(t.micActiveNotice || "🎙️ Voice dictation active... Speak now.", false);

    // 3. Lancement de la reconnaissance vocale via le Main World de YouTube (contourne les restrictions d'Isolated World)
    window.postMessage({
      type: 'YT_AI_START_SPEECH',
      lang: LANG_LOCALES[targetLang] || 'en-US'
    }, '*');
  }

  function stopDictation() {
    isDictating = false;

    if (isWhisperRecording && activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
      isWhisperRecording = false;
      try { activeMediaRecorder.stop(); } catch (e) {}
      activeMediaRecorder = null;
      return;
    }

    window.postMessage({ type: 'YT_AI_STOP_SPEECH' }, '*');

    const micBtn = document.getElementById('ytAiMicBtn');
    const chatInput = document.getElementById('ytAiChatInput');
    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[targetLang] || I18N.en;

    if (micBtn) {
      micBtn.classList.remove('is-recording');
      micBtn.title = t.micTitle || "Dictate your question with microphone";
      micBtn.innerHTML = '<span class="yt-ai-mic-icon">🎤</span>';
    }
    if (chatInput) {
      chatInput.placeholder = t.chatPlaceholder || "Ask a question or dictate with mic... (Press Enter to send)";
    }
  }

  // Écouteur des retours de dictée vocale depuis le Main World
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'YT_AI_SPEECH_STARTED') {
      isDictating = true;
      const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
      const t = I18N[targetLang] || I18N.en;
      showMicNotice(t.micActiveNotice || "🎙️ Voice dictation active... Speak now.", false);
    } else if (event.data.type === 'YT_AI_SPEECH_RESULT') {
      const chatInput = document.getElementById('ytAiChatInput');
      if (chatInput && isDictating) {
        const prefix = dictationBaseText ? dictationBaseText.trim() + ' ' : '';
        const full = (prefix + (event.data.finalText || '') + (event.data.interimText || '')).trimStart();
        chatInput.value = full;
      }
    } else if (event.data.type === 'YT_AI_SPEECH_ERROR') {
      const err = event.data.error;
      console.warn('SpeechRecognition error from Main World:', err);
      const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
      const t = I18N[targetLang] || I18N.en;

      if (err === 'not-allowed') {
        showMicNotice(t.micBlockedNotice, true);
      } else if (err === 'audio-capture') {
        showMicNotice(t.micNoDeviceNotice, true);
      } else if (err === 'network') {
        showMicNotice(t.micNetworkNotice, true);
      } else if (err === 'not-supported') {
        showMicNotice(t.micNotSupportedNotice, true);
      } else if (err !== 'no-speech') {
        showMicNotice(`${t.micErrorNotice} ${err}`, true);
      }
      stopDictation();
    } else if (event.data.type === 'YT_AI_SPEECH_ENDED') {
      if (isDictating) {
        stopDictation();
      }
    }
  });

  function showMicNotice(text, isError) {
    const notice = document.getElementById('ytAiMicNotice');
    if (!notice) return;
    notice.textContent = text;
    notice.className = `yt-ai-mic-notice ${isError ? 'is-error' : 'is-info'}`;
    notice.classList.remove('yt-ai-hidden');
    setTimeout(() => {
      if (notice.textContent === text) notice.classList.add('yt-ai-hidden');
    }, isError ? 9000 : 4000);
  }

  /**
   * =========================================================================
   * INJECTION DE LA BANNIÈRE DANS LE FLUX DE LA PAGE (#columns)
   * =========================================================================
   */
  function tryInjectBanner() {
    if (!isWatchPage()) return;
    const existing = document.getElementById('yt-ai-summarizer-container');
    if (existing && existing.isConnected) return;
    if (existing) existing.remove();

    // Positionnement pleine largeur tout en haut de la page de lecture YouTube
    const watchFlexy = document.querySelector('ytd-watch-flexy');
    let parent = null;
    let refChild = null;

    if (watchFlexy && watchFlexy.isConnected) {
      parent = watchFlexy;
      refChild = watchFlexy.querySelector('#player-theater-container') ||
                 watchFlexy.querySelector('#columns') ||
                 watchFlexy.firstChild;
    } else {
      const columns = document.getElementById('columns') || document.querySelector('ytd-watch-flexy #columns');
      if (columns && columns.parentNode) {
        parent = columns.parentNode;
        refChild = columns;
      } else {
        const primary = document.getElementById('primary');
        if (primary && primary.parentNode) {
          parent = primary.parentNode;
          refChild = primary;
        }
      }
    }

    if (!parent) {
      setTimeout(tryInjectBanner, 250);
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'yt-ai-summarizer-container';
    banner.className = 'is-collapsed'; // Rétracté par défaut

    const currentSavedModel = getActiveModel();
    const initialModelLabel = currentSavedModel ? `Model: ${currentSavedModel}` : 'Model: Loading...';
    const initialOptionHtml = currentSavedModel
      ? `<option value="${escapeHtml(currentSavedModel)}" selected>${escapeHtml(currentSavedModel)}</option>`
      : '<option value="">Loading...</option>';

    safeSetInnerHTML(banner, `
      <!-- BARRE SUPÉRIEURE ULTRA-MINIMALISTE -->
      <div class="yt-ai-header-bar">
        <div class="yt-ai-header-left">
          <div class="yt-ai-brand" id="ytAiBrandToggle" title="Click to toggle panel">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" fill="#FF0000"/>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#FFFFFF"/>
            </svg>
            <span id="ytAiBrandTitle">YT Summarizer AI</span>
          </div>
        </div>

        <div class="yt-ai-header-center">
          <div class="yt-ai-action-cluster">
            <div class="yt-ai-header-lang-wrapper">
              <select id="ytAiLangSelect" class="yt-ai-select yt-ai-header-lang-select" title="Interface & Summary Language">
                <option value="fr" selected>🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="it">🇮🇹 Italiano</option>
                <option value="ru">🇷🇺 Русский</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>

            <!-- BOUTON D'ACTION PRINCIPAL -->
            <button id="ytAiSummarizeBtn" class="yt-ai-btn yt-ai-btn-primary yt-ai-summarize-cta">
              ✨ Summarize video
            </button>
          </div>
        </div>

        <div class="yt-ai-header-right">
          <button id="ytAiSettingsToggleBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-settings-toggle-btn" title="Settings & Models">
            <span class="yt-ai-settings-icon">⚙️</span>
            <span id="ytAiSettingsBtnText">Settings</span>
          </button>

          <button id="ytAiToggleBtn" class="yt-ai-toggle-btn" title="Expand / Collapse">
            <span id="ytAiToggleText">Expand</span>
            <span id="ytAiToggleIcon">▾</span>
          </button>
        </div>
      </div>

      <!-- CONTENU DÉPLIABLE -->
      <div class="yt-ai-expanded-content">

        <!-- TIROIR PARAMÈTRES / CONFIGURATION (3 SOUS-ONGLETS MODERNES) -->
        <div id="ytAiSettingsDrawer" class="yt-ai-settings-drawer yt-ai-hidden">
          <div class="yt-ai-settings-card">
            <div class="yt-ai-settings-header">
              <div class="yt-ai-settings-tabs-nav">
                <button class="yt-ai-settings-tab-btn active" data-subtab="model" id="ytAiTabSettingsModelBtn">
                  🤖 AI Model & Server
                </button>
                <button class="yt-ai-settings-tab-btn" data-subtab="params" id="ytAiTabSettingsParamsBtn">
                  ⚙️ Parameters & Prompt
                </button>
                <button class="yt-ai-settings-tab-btn" data-subtab="audio" id="ytAiTabSettingsAudioBtn">
                  🎙️ Voice & Audio
                </button>
              </div>
              <button id="ytAiSettingsCloseBtn" class="yt-ai-btn-icon-close" title="Close Settings">✕</button>
            </div>

            <div class="yt-ai-settings-body">
              <!-- SOUS-ONGLET 1 : MODÈLE ET SERVEUR -->
              <div id="ytAiSettingsSubpaneModel" class="yt-ai-settings-subpane active">
                <div class="yt-ai-settings-status-row">
                  <div id="ytAiBadge" class="yt-ai-badge" title="AI Status">
                    <span class="yt-ai-badge-dot"></span>
                    <span id="ytAiBadgeText">Checking...</span>
                  </div>
                  <div class="yt-ai-model-pill" id="ytAiHeaderModelPill" style="cursor: default;" title="Active model">
                    <span class="yt-ai-model-icon">🤖</span>
                    <span id="ytAiHeaderModelText">${initialModelLabel}</span>
                  </div>
                </div>

                <div class="yt-ai-settings-grid">
                  <div class="yt-ai-setting-item">
                    <label id="ytAiProviderLabel">AI Provider:</label>
                    <select id="ytAiProviderSelect" class="yt-ai-select" style="font-weight: 600;">
                      <optgroup label="🏠 Local Models (Free & Private)">
                        <option value="lmstudio">🏠 LM Studio</option>
                        <option value="ollama">🦙 Ollama (Local / Cloud)</option>
                      </optgroup>
                      <optgroup label="⚡ Fast / Free Cloud Inference">
                        <option value="gemini">🔵 Google Gemini (1M ctx, free)</option>
                        <option value="groq">⚡ Groq (Llama 3.3, ultra-fast)</option>
                      </optgroup>
                      <optgroup label="☁️ Major Cloud Providers">
                        <option value="openai">🟢 OpenAI (ChatGPT / GPT-4o)</option>
                        <option value="claude">🟣 Anthropic (Claude 3.5)</option>
                        <option value="deepseek">🐋 DeepSeek (V3 & R1)</option>
                        <option value="grok">⚫ xAI (Grok 2)</option>
                        <option value="qwen">🔴 Qwen (Alibaba DashScope)</option>
                        <option value="mistral">🟠 Mistral AI</option>
                        <option value="openrouter">🌐 OpenRouter (All models)</option>
                        <option value="perplexity">🔍 Perplexity AI (Sonar)</option>
                        <option value="together">🤝 Together AI</option>
                      </optgroup>
                    </select>
                  </div>

                  <!-- Zone Local (LM Studio / Ollama) -->
                  <div id="ytAiLmStudioSettings" class="yt-ai-setting-item">
                    <label id="ytAiServerLabel">Server:</label>
                    <div class="yt-ai-input-with-btn">
                      <select id="ytAiServerSelect" class="yt-ai-select" style="flex: 1;">
                        <option value="http://192.168.56.1:1234">192.168.56.1:1234</option>
                        <option value="http://localhost:1234">localhost:1234</option>
                        <option value="http://127.0.0.1:1234">127.0.0.1:1234</option>
                        <option value="custom">Custom IP...</option>
                      </select>
                      <button id="ytAiRefreshModelsBtn" class="yt-ai-btn yt-ai-btn-secondary" title="Refresh local models">🔄</button>
                    </div>
                  </div>

                  <!-- Zone Cloud (Clé API) -->
                  <div id="ytAiCloudSettings" class="yt-ai-setting-item yt-ai-hidden">
                    <label id="ytAiApiKeyLabel">API Key:</label>
                    <div class="yt-ai-input-with-btn">
                      <input type="password" id="ytAiApiKeyInput" class="yt-ai-input yt-ai-api-key-input" placeholder="Paste your API key..." style="flex: 1;">
                      <a id="ytAiGetApiKeyLink" class="yt-ai-link-pill" href="#" target="_blank" rel="noopener">🔑 Get Key</a>
                    </div>
                  </div>

                  <!-- Modèle & Test -->
                  <div class="yt-ai-setting-item">
                    <label id="ytAiModelLabel">Model:</label>
                    <div class="yt-ai-input-with-btn">
                      <select id="ytAiModelSelect" class="yt-ai-select" style="flex: 1;">
                        ${initialOptionHtml}
                      </select>
                      <button id="ytAiTestModelBtn" class="yt-ai-btn yt-ai-btn-secondary" title="Test connection and model">⚡ Test</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SOUS-ONGLET 2 : PARAMÈTRES IA & PROMPT -->
              <div id="ytAiSettingsSubpaneParams" class="yt-ai-settings-subpane">
                <div class="yt-ai-settings-grid">
                  <div class="yt-ai-setting-item">
                    <label id="ytAiModeLabel">Format de synthèse :</label>
                    <select id="ytAiModeSelect" class="yt-ai-select">
                      <option value="quick">⚡ Quick (Short & concise)</option>
                      <option value="standard" selected>📌 Standard (Natural & balanced)</option>
                      <option value="detailed">📝 Deep (Detailed & in-depth)</option>
                    </select>
                  </div>

                  <div class="yt-ai-setting-item">
                    <label id="ytAiTempLabel">AI Creativity (Temperature):</label>
                    <select id="ytAiTemperatureSelect" class="yt-ai-select">
                      <option value="0.0">0.0 - Strict & Precise</option>
                      <option value="0.3" selected>0.3 - Balanced (Default)</option>
                      <option value="0.7">0.7 - Creative & Detailed</option>
                      <option value="1.0">1.0 - Highly Inventive</option>
                    </select>
                  </div>

                  <div class="yt-ai-setting-item">
                    <label id="ytAiMaxTokensLabel">Max Length (Tokens):</label>
                    <select id="ytAiMaxTokensSelect" class="yt-ai-select">
                      <option value="auto" selected>Automatic (Default)</option>
                      <option value="1024">Short (1,024)</option>
                      <option value="2048">Standard (2,048)</option>
                      <option value="4096">Detailed (4,096)</option>
                      <option value="8192">Maximum (8,192)</option>
                    </select>
                  </div>

                  <div class="yt-ai-setting-item yt-ai-checkbox-field" style="grid-column: span 2;">
                    <label>
                      <input type="checkbox" id="ytAiAutoSummarizeCheck">
                      <span id="ytAiAutoSummarizeLabel">⚡ Auto-summarize when opening a video</span>
                    </label>
                  </div>

                  <div class="yt-ai-setting-item" style="grid-column: span 2;">
                    <label id="ytAiCustomPromptLabel">Custom AI Instructions (optional):</label>
                    <input type="text" id="ytAiCustomPromptInput" class="yt-ai-input" placeholder="e.g. Focus on technical details, explain with analogies..." style="width: 100%;">
                  </div>
                </div>
              </div>

              <!-- SOUS-ONGLET 3 : VOIX & AUDIO -->
              <div id="ytAiSettingsSubpaneAudio" class="yt-ai-settings-subpane">
                <div class="yt-ai-settings-grid">
                  <div class="yt-ai-setting-item">
                    <label id="ytAiVoiceLabel">Voice (TTS):</label>
                    <select id="ytAiVoiceSelect" class="yt-ai-select" title="Voice for speech audio">
                      <option value="">System voice...</option>
                    </select>
                  </div>

                  <div class="yt-ai-setting-item">
                    <label id="ytAiTtsSpeedLabel">Voice Speed:</label>
                    <select id="ytAiTtsSpeedSelect" class="yt-ai-select">
                      <option value="0.75">0.75x (Calm)</option>
                      <option value="1.0" selected>1.0x (Normal)</option>
                      <option value="1.25">1.25x (Fast)</option>
                      <option value="1.5">1.5x (Speedy)</option>
                      <option value="2.0">2.0x (Double)</option>
                    </select>
                  </div>

                  <div class="yt-ai-setting-item">
                    <label id="ytAiMicLabel">Microphone (Speech-to-Text):</label>
                    <select id="ytAiMicSelect" class="yt-ai-select" title="Select your microphone for dictation">
                      <option value="">Default mic...</option>
                    </select>
                  </div>

                  <div class="yt-ai-setting-item">
                    <label id="ytAiWhisperUrlLabel">Local Whisper Server (Audio STT):</label>
                    <div class="yt-ai-input-with-btn">
                      <input type="text" id="ytAiWhisperUrlInput" class="yt-ai-input" placeholder="e.g. http://localhost:8000/v1/audio/transcriptions" style="flex: 1;">
                      <button id="ytAiTestWhisperBtn" class="yt-ai-btn yt-ai-btn-secondary">⚡ Test STT</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- BANNIÈRE DE STATUT / MESSAGES INFORMATIFS -->
        <div id="ytAiStatusBanner" class="yt-ai-reasoning yt-ai-hidden"></div>

        <!-- NAVIGATION PAR ONGLETS (SYNTHÈSE / CHAT / TRANSCRIPTION) -->
        <div class="yt-ai-tabs-nav">
          <button id="ytAiTabSummaryBtn" class="yt-ai-tab-btn active" data-tab="summary">
            📝 AI Summary
          </button>
          <button id="ytAiTabChatBtn" class="yt-ai-tab-btn" data-tab="chat">
            💬 Ask a question <span id="ytAiChatCount" class="yt-ai-tab-count-badge">0</span>
          </button>
          <button id="ytAiTabTranscriptBtn" class="yt-ai-tab-btn" data-tab="transcript">
            📜 Transcript <span id="ytAiWordCountTab" class="yt-ai-tab-count-badge">0 words</span>
          </button>
        </div>

        <!-- ONGLET 1 : SYNTHÈSE IA -->
        <div id="ytAiPaneSummary" class="yt-ai-tab-pane active">
          <div class="yt-ai-summary-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span id="ytAiSummaryHeaderTitle">📝 AI Summary</span>
              <div class="yt-ai-bottom-actions" style="margin: 0; display: flex; gap: 6px; flex-wrap: wrap;">
                <button id="ytAiSpeakSummaryBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">🔊 Listen</button>
                <button id="ytAiCopyBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">📋 Copy</button>
                <button id="ytAiDownloadBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">💾 .md</button>
                <button id="ytAiSaveTxtBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">📄 .txt</button>
                <button id="ytAiSaveJsonBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">📦 .json</button>
              </div>
            </div>

            <!-- Réflexion Thinking (DeepSeek R1 / o3-mini / Qwen Thinking) -->
            <details id="ytAiReasoningBox" class="yt-ai-reasoning yt-ai-hidden">
              <summary>💭 Model Reasoning (<span id="ytAiReasoningStatus">in progress...</span>)</summary>
              <div id="ytAiReasoningText" class="yt-ai-reasoning-body"></div>
            </details>

            <div id="ytAiSummaryBody" class="yt-ai-markdown">
              <p style="color: #8b949e; font-style: italic;">Click "✨ Summarize video" to generate the summary.</p>
            </div>
          </div>
        </div>

        <!-- ONGLET 2 : CHAT BOX INTERACTIVE -->
        <div id="ytAiPaneChat" class="yt-ai-tab-pane">
          <div class="yt-ai-chat-pane">
            <div class="yt-ai-pane-title">
              <span>💬 Video Q&A</span>
              <button id="ytAiClearChatBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">🗑️ Clear conversation</button>
            </div>

            <div class="yt-ai-chat-container">
              <!-- Suggestions rapides -->
              <div class="yt-ai-chat-suggestions">
                <span class="yt-ai-suggestion-chip" data-question="What are the core key takeaways from this video?">💡 Key takeaways</span>
                <span class="yt-ai-suggestion-chip" data-question="At what point in the video is the main topic discussed?">⏱️ Timestamps</span>
                <span class="yt-ai-suggestion-chip" data-question="What specific figures, examples, or arguments are presented?">📊 Data & Figures</span>
                <span class="yt-ai-suggestion-chip" data-question="What is the author's final conclusion or actionable advice?">🎯 Conclusion & Advice</span>
              </div>

              <!-- Messages échangés -->
              <div id="ytAiChatMessages" class="yt-ai-chat-messages">
                <div class="yt-ai-chat-bubble ai">
                  Hello! Ask me any question about the content of this video. I base my answers directly on its full transcript.
                </div>
              </div>

              <!-- Ligne de saisie avec bouton micro -->
              <div class="yt-ai-chat-input-row">
                <input type="text" id="ytAiChatInput" class="yt-ai-chat-input" placeholder="Ask a question or dictate with mic... (Press Enter to send)">
                <button id="ytAiMicBtn" class="yt-ai-btn yt-ai-btn-secondary yt-ai-mic-btn" title="Dictate your question with microphone">
                  <span class="yt-ai-mic-icon">🎤</span>
                </button>
                <button id="ytAiSendChatBtn" class="yt-ai-btn yt-ai-btn-primary" style="padding: 7px 16px;">
                  Send ➤
                </button>
              </div>
              <div id="ytAiMicNotice" class="yt-ai-mic-notice yt-ai-hidden"></div>
            </div>
          </div>
        </div>

        <!-- ONGLET 3 : TRANSCRIPTION BRUTE -->
        <div id="ytAiPaneTranscript" class="yt-ai-tab-pane">
          <div class="yt-ai-transcript-pane" style="max-height: 480px;">
            <div class="yt-ai-pane-title">
              <span>📜 Full Transcript (<span id="ytAiWordCount">0</span> words)</span>
              <button id="ytAiCopyTranscriptBtn" class="yt-ai-btn yt-ai-btn-secondary" style="padding: 3px 8px; font-size: 11px;">📋 Copy raw</button>
            </div>
            <div id="ytAiTranscriptBody" class="yt-ai-transcript-text">
              Waiting for transcript... (Will be extracted when generating a summary or asking a question)
            </div>
          </div>
        </div>

        <!-- PIED DE PAGE AVEC LIENS GITHUB ET AIDE -->
        <div class="yt-ai-footer-info">
          <span id="ytAiFooterAuthor">YouTube Summarizer AI <strong>v1.3.0</strong> by <a href="https://github.com/Hidr4c" target="_blank" rel="noopener">@Hidr4c</a></span>
          <span>•</span>
          <a href="https://github.com/Hidr4c/youtube-ai-summarizer" target="_blank" rel="noopener">⭐ GitHub</a>
          <span>•</span>
          <a id="ytAiFooterBugLink" href="https://github.com/Hidr4c/youtube-ai-summarizer/issues" target="_blank" rel="noopener">🐛 Report a bug</a>
          <span>•</span>
          <a id="ytAiFooterDocsLink" href="https://github.com/Hidr4c/youtube-ai-summarizer#readme" target="_blank" rel="noopener">📖 Documentation</a>
        </div>

      </div>
    `);

    if (refChild) {
      parent.insertBefore(banner, refChild);
    } else {
      parent.appendChild(banner);
    }

    lastVideoId = getVideoId();
    lastObservedUrl = window.location.href;
    try {
      bindBannerEvents(banner);
    } catch (e) {
      console.error('[YT AI] Error binding banner events:', e);
    }
    try {
      syncProviderUI();
      syncSettingsUI();
      populateVoiceDropdown();
      applyLanguage(currentLang);
    } catch (e) {
      console.error('[YT AI] Error syncing UI state:', e);
    }
  }

  function bindBannerEvents(bannerEl) {
    const banner = bannerEl || document.getElementById('yt-ai-summarizer-container');
    if (!banner) return;
    const brandToggle = document.getElementById('ytAiBrandToggle');
    const toggleBtn = document.getElementById('ytAiToggleBtn');
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const providerSelect = document.getElementById('ytAiProviderSelect');
    const serverSelect = document.getElementById('ytAiServerSelect');
    const apiKeyInput = document.getElementById('ytAiApiKeyInput');
    const modelSelect = document.getElementById('ytAiModelSelect');
    const refreshBtn = document.getElementById('ytAiRefreshModelsBtn');
    const testBtn = document.getElementById('ytAiTestModelBtn');
    const langSelect = document.getElementById('ytAiLangSelect');
    const modeSelect = document.getElementById('ytAiModeSelect');
    const voiceSelect = document.getElementById('ytAiVoiceSelect');
    const micSelect = document.getElementById('ytAiMicSelect');
    const copyBtn = document.getElementById('ytAiCopyBtn');
    const copyTranscriptBtn = document.getElementById('ytAiCopyTranscriptBtn');
    const downloadBtn = document.getElementById('ytAiDownloadBtn');
    const speakSummaryBtn = document.getElementById('ytAiSpeakSummaryBtn');

    // Navigation des onglets principaux (Synthèse / Chat / Transcription)
    document.querySelectorAll('.yt-ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // Pilule Modèle de l'entête : ouvre directement les paramètres du modèle
    const headerModelPill = document.getElementById('ytAiHeaderModelPill');
    headerModelPill?.addEventListener('click', () => {
      setExpanded(true);
      setSettingsDrawerOpen(true);
      switchSettingsSubtab('model');
    });

    // Boutons segmented format (Quick / Standard / Deep)
    document.querySelectorAll('.yt-ai-format-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const mode = pill.getAttribute('data-mode');
        if (mode) setSummaryMode(mode);
      });
    });

    // Tiroir Paramètres (Toggle & Close)
    const settingsToggleBtn = document.getElementById('ytAiSettingsToggleBtn');
    settingsToggleBtn?.addEventListener('click', toggleSettingsDrawer);

    const settingsCloseBtn = document.getElementById('ytAiSettingsCloseBtn');
    settingsCloseBtn?.addEventListener('click', () => setSettingsDrawerOpen(false));

    // Sous-onglets des paramètres (Modèle / Audio / Paramètres)
    document.querySelectorAll('.yt-ai-settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.getAttribute('data-subtab');
        if (subtab) switchSettingsSubtab(subtab);
      });
    });

    // Chat Box
    const chatInput = document.getElementById('ytAiChatInput');
    const sendChatBtn = document.getElementById('ytAiSendChatBtn');
    const micBtn = document.getElementById('ytAiMicBtn');
    const clearChatBtn = document.getElementById('ytAiClearChatBtn');

    sendChatBtn?.addEventListener('click', () => {
      stopDictation();
      handleSendChatMessage();
    });
    micBtn?.addEventListener('click', toggleDictation);
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        stopDictation();
        handleSendChatMessage();
      }
    });

    clearChatBtn?.addEventListener('click', handleClearChat);

    // Suggestions rapides
    document.querySelectorAll('.yt-ai-suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-question');
        if (q) handleSendChatMessage(q);
      });
    });

    // Déplier / Replier
    brandToggle?.addEventListener('click', toggleExpand);
    toggleBtn?.addEventListener('click', toggleExpand);

    // Bouton unique de résumé
    summarizeBtn?.addEventListener('click', () => {
      setExpanded(true);
      switchTab('summary');
      startSummarization();
    });

    // Changement de fournisseur
    providerSelect?.addEventListener('change', () => {
      currentProvider = providerSelect.value;
      savePreference('aiProvider', currentProvider);
      syncProviderUI();
      if (currentProvider === 'lmstudio' || currentProvider === 'ollama') {
        refreshModelsList();
      } else {
        updateHeaderBadge();
      }
    });

    // Saisie de clé API
    apiKeyInput?.addEventListener('input', () => {
      const keyVal = apiKeyInput.value.trim();
      apiKeys[currentProvider] = keyVal;
      savePreference(`apiKey_${currentProvider}`, keyVal);
      updateHeaderBadge();
    });

    // Serveur Local (LM Studio / Ollama)
    serverSelect?.addEventListener('change', () => {
      const isOllama = currentProvider === 'ollama';
      const defaultHost = isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234';

      if (serverSelect.value === 'custom') {
        const custom = prompt(`Address for ${isOllama ? 'Ollama' : 'LM Studio'}:`, serverUrls[currentProvider] || defaultHost);
        if (custom) {
          const clean = custom.trim().replace(/\/+$/, '');
          serverUrls[currentProvider] = clean;
          savePreference(`serverUrl_${currentProvider}`, clean);
          updateServerUrlUI();
          refreshModelsList();
        }
      } else {
        serverUrls[currentProvider] = serverSelect.value;
        savePreference(`serverUrl_${currentProvider}`, serverSelect.value);
        updateServerUrlUI();
        refreshModelsList();
      }
    });

    refreshBtn?.addEventListener('click', () => refreshModelsList(true));
    testBtn?.addEventListener('click', handleTestConnection);

    modelSelect?.addEventListener('change', () => {
      setActiveModel(modelSelect.value);
      savePreference(`selectedModel_${currentProvider}`, modelSelect.value);
      savePreference('selectedModel', modelSelect.value);
      updateHeaderModelText();
    });

    langSelect?.addEventListener('change', () => {
      currentLang = langSelect.value;
      savePreference('targetLang', currentLang);
      applyLanguage(currentLang);
    });
    modeSelect?.addEventListener('change', () => setSummaryMode(modeSelect.value));

    voiceSelect?.addEventListener('change', () => {
      selectedVoiceURI = voiceSelect.value;
      savePreference('selectedVoiceURI', selectedVoiceURI);
    });

    micSelect?.addEventListener('change', async () => {
      selectedMicDeviceId = micSelect.value;
      savePreference('selectedMicDeviceId', selectedMicDeviceId);
      if (selectedMicDeviceId && (!availableMicrophones[0] || !availableMicrophones[0].label)) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: selectedMicDeviceId } } });
          s.getTracks().forEach(t => t.stop());
          await refreshMicrophonesList();
        } catch (e) {}
      }
    });

    speakSummaryBtn?.addEventListener('click', () => {
      const t = I18N[currentLang] || I18N.en;
      if (fullSummaryMarkdown) {
        speakText(fullSummaryMarkdown, speakSummaryBtn);
      } else {
        showStatusBanner(t.noSummaryToRead || "No summary to read aloud yet.", true);
      }
    });

    copyBtn?.addEventListener('click', () => copyToClipboard(fullSummaryMarkdown, copyBtn));
    copyTranscriptBtn?.addEventListener('click', () => {
      const text = document.getElementById('ytAiTranscriptBody')?.textContent || '';
      copyToClipboard(text, copyTranscriptBtn);
    });
    downloadBtn?.addEventListener('click', handleDownload);

    // Boutons d'exportation
    const saveTxtBtn = document.getElementById('ytAiSaveTxtBtn');
    saveTxtBtn?.addEventListener('click', handleDownloadTxt);

    const saveJsonBtn = document.getElementById('ytAiSaveJsonBtn');
    saveJsonBtn?.addEventListener('click', handleDownloadJson);

    // Écouteurs pour les Options
    const tempSelect = document.getElementById('ytAiTemperatureSelect');
    tempSelect?.addEventListener('change', () => {
      temperature = tempSelect.value;
      savePreference('temperature', temperature);
    });

    const maxTokensSelect = document.getElementById('ytAiMaxTokensSelect');
    maxTokensSelect?.addEventListener('change', () => {
      maxTokens = maxTokensSelect.value;
      savePreference('maxTokens', maxTokens);
    });

    const ttsSpeedSelect = document.getElementById('ytAiTtsSpeedSelect');
    ttsSpeedSelect?.addEventListener('change', () => {
      ttsSpeed = ttsSpeedSelect.value;
      savePreference('ttsSpeed', ttsSpeed);
    });

    const whisperUrlInput = document.getElementById('ytAiWhisperUrlInput');
    whisperUrlInput?.addEventListener('input', () => {
      localWhisperUrl = whisperUrlInput.value.trim();
      savePreference('localWhisperUrl', localWhisperUrl);
    });

    const testWhisperBtn = document.getElementById('ytAiTestWhisperBtn');
    testWhisperBtn?.addEventListener('click', handleTestWhisper);

    const autoSumCheck = document.getElementById('ytAiAutoSummarizeCheck');
    autoSumCheck?.addEventListener('change', () => {
      autoSummarize = autoSumCheck.checked;
      savePreference('autoSummarize', autoSummarize);
    });

    const customPromptInput = document.getElementById('ytAiCustomPromptInput');
    customPromptInput?.addEventListener('input', () => {
      customPrompt = customPromptInput.value.trim();
      savePreference('customPrompt', customPrompt);
    });

    // Délégation d'événement pour tous les timestamps interactifs cliquables
    banner.addEventListener('click', (e) => {
      const link = e.target.closest('.yt-ai-timestamp-link');
      if (link && link.dataset.time !== undefined) {
        e.preventDefault();
        const sec = parseFloat(link.dataset.time);
        const video = document.querySelector('video');
        if (video && !isNaN(sec)) {
          video.currentTime = sec;
          video.play().catch(() => {});
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60).toString().padStart(2, '0');
          showStatusBanner(`⏱️ Playing at ${m}:${s}`, false);
        }
      }
    });

    // Synchroniser immédiatement la langue, les paramètres, le fournisseur et les modèles
    applyLanguage(currentLang);
    syncSettingsUI();
    syncProviderUI();
    if (currentProvider === 'lmstudio' || currentProvider === 'ollama') {
      refreshModelsList();
    }
  }

  function setSummaryMode(mode) {
    currentMode = mode;
    const modeSelect = document.getElementById('ytAiModeSelect');
    if (modeSelect) {
      modeSelect.value = mode;
      savePreference('summaryMode', mode);
    }
    document.querySelectorAll('.yt-ai-format-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-mode') === mode);
    });
  }

  function toggleSettingsDrawer() {
    const drawer = document.getElementById('ytAiSettingsDrawer');
    const isOpen = drawer && !drawer.classList.contains('yt-ai-hidden');
    setSettingsDrawerOpen(!isOpen);
  }

  function setSettingsDrawerOpen(open) {
    const drawer = document.getElementById('ytAiSettingsDrawer');
    const btn = document.getElementById('ytAiSettingsToggleBtn');
    if (!drawer) return;
    if (open) {
      setExpanded(true);
      drawer.classList.remove('yt-ai-hidden');
      btn?.classList.add('active');
    } else {
      drawer.classList.add('yt-ai-hidden');
      btn?.classList.remove('active');
    }
  }

  function switchSettingsSubtab(subtab) {
    document.querySelectorAll('.yt-ai-settings-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-subtab') === subtab);
    });
    document.querySelectorAll('.yt-ai-settings-subpane').forEach(p => p.classList.remove('active'));
    const paneMap = {
      model: 'ytAiSettingsSubpaneModel',
      audio: 'ytAiSettingsSubpaneAudio',
      params: 'ytAiSettingsSubpaneParams'
    };
    const targetId = paneMap[subtab];
    if (targetId) {
      document.getElementById(targetId)?.classList.add('active');
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll('.yt-ai-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.yt-ai-tab-pane').forEach(p => p.classList.remove('active'));

    const tabMap = {
      summary: { btn: 'ytAiTabSummaryBtn', pane: 'ytAiPaneSummary' },
      chat: { btn: 'ytAiTabChatBtn', pane: 'ytAiPaneChat' },
      transcript: { btn: 'ytAiTabTranscriptBtn', pane: 'ytAiPaneTranscript' }
    };

    const target = tabMap[tabName];
    if (target) {
      document.getElementById(target.btn)?.classList.add('active');
      document.getElementById(target.pane)?.classList.add('active');
    }

    if (tabName === 'chat') {
      setTimeout(() => document.getElementById('ytAiChatInput')?.focus(), 100);
    }
  }

  function toggleExpand() {
    setExpanded(!isExpanded);
  }

  function setExpanded(expand) {
    isExpanded = expand;
    const container = document.getElementById('yt-ai-summarizer-container');
    const toggleText = document.getElementById('ytAiToggleText');
    const toggleIcon = document.getElementById('ytAiToggleIcon');
    const activeLang = document.getElementById('ytAiLangSelect')?.value || currentLang || 'en';
    const t = I18N[activeLang] || I18N.en;
    if (!container) return;

    if (isExpanded) {
      container.classList.remove('is-collapsed');
      if (toggleText) toggleText.textContent = t.collapse;
      if (toggleIcon) toggleIcon.textContent = '▲';
    } else {
      container.classList.add('is-collapsed');
      if (toggleText) toggleText.textContent = t.expand;
      if (toggleIcon) toggleIcon.textContent = '▾';
      setSettingsDrawerOpen(false);
    }
  }

  /**
   * Affiche l'écran d'accueil élégant du résumé lorsque rien n'a encore été généré
   */
  function renderSummaryEmptyState(isNewVideo = false) {
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
      setExpanded(true);
      switchTab('summary');
      startSummarization();
    });
  }

  /**
   * Synchronise l'interface selon le fournisseur choisi (Local vs Cloud)
   */
  function syncProviderUI() {
    const providerSelect = document.getElementById('ytAiProviderSelect');
    const lmSettings = document.getElementById('ytAiLmStudioSettings');
    const cloudSettings = document.getElementById('ytAiCloudSettings');
    const apiKeyInput = document.getElementById('ytAiApiKeyInput');
    const getApiKeyLink = document.getElementById('ytAiGetApiKeyLink');
    const summaryTitle = document.getElementById('ytAiSummaryHeaderTitle');
    const serverLabel = document.getElementById('ytAiServerLabel');

    if (providerSelect) providerSelect.value = currentProvider;

    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');

    if (isLocal) {
      lmSettings?.classList.remove('yt-ai-hidden');
      cloudSettings?.classList.add('yt-ai-hidden');

      const name = currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
      const t = I18N[currentLang] || I18N.en;
      if (serverLabel) serverLabel.textContent = currentProvider === 'ollama' ? t.serverLabelOllama : t.serverLabelLm;
      if (summaryTitle) summaryTitle.textContent = `${t.summaryTitle} (${name})`;

      updateServerUrlUI();
      if (availableLocalModels[currentProvider] && availableLocalModels[currentProvider].length > 0) {
        populateModelDropdown(availableLocalModels[currentProvider]);
      } else {
        populateModelDropdown([]);
        refreshModelsList();
      }
    } else {
      lmSettings?.classList.add('yt-ai-hidden');
      cloudSettings?.classList.remove('yt-ai-hidden');

      const portal = API_KEY_PORTALS[currentProvider];
      if (getApiKeyLink && portal) {
        getApiKeyLink.href = portal.url;
        getApiKeyLink.textContent = portal.label;
      }

      const t = I18N[currentLang] || I18N.en;
      if (apiKeyInput) {
        apiKeyInput.value = apiKeys[currentProvider] || '';
        apiKeyInput.placeholder = `${t.apiKeyLabel} ${currentProvider.toUpperCase()}...`;
      }

      const name = PROVIDER_NAMES[currentProvider] || currentProvider;
      if (summaryTitle) {
        summaryTitle.textContent = `${t.summaryTitle} (${name})`;
      }

      populateCloudModels(currentProvider);
    }

    updateHeaderBadge();
    updateHeaderModelText();
  }

  function populateCloudModels(provider) {
    const select = document.getElementById('ytAiModelSelect');
    if (!select) return;
    select.innerHTML = '';

    const list = CLOUD_MODELS[provider] || [];
    list.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });

    const activeM = getActiveModel();
    if (select.options.length > 0) {
      let found = false;
      for (let opt of select.options) {
        if (opt.value === activeM) {
          select.value = activeM;
          found = true;
          break;
        }
      }
      if (!found) {
        select.selectedIndex = 0;
      }
      setActiveModel(select.value);
      savePreference(`selectedModel_${provider}`, select.value);
      savePreference('selectedModel', select.value);
    }
  }

  function updateServerUrlUI() {
    const serverSelect = document.getElementById('ytAiServerSelect');
    if (!serverSelect) return;

    const isOllama = currentProvider === 'ollama';
    const currentUrl = serverUrls[currentProvider] || (isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234');

    serverSelect.innerHTML = '';
    const presets = isOllama
      ? ['http://localhost:11434', 'http://127.0.0.1:11434', 'http://192.168.56.1:11434']
      : ['http://192.168.56.1:1234', 'http://localhost:1234', 'http://127.0.0.1:1234'];

    presets.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u.replace(/https?:\/\//, '');
      if (u === currentUrl) opt.selected = true;
      serverSelect.appendChild(opt);
    });

    const t = I18N[currentLang] || I18N.en;
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = t.customServer || 'Custom IP...';
    if (!presets.includes(currentUrl)) {
      customOpt.selected = true;
      customOpt.textContent = `Custom (${currentUrl.replace(/https?:\/\//, '')})`;
    }
    serverSelect.appendChild(customOpt);
  }

  function updateHeaderBadge() {
    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[currentLang] || I18N.en;
    if (!badge || !badgeText) return;

    if (currentProvider === 'lmstudio' || currentProvider === 'ollama') {
      const name = currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
      const models = availableLocalModels[currentProvider] || [];
      const currentUrl = serverUrls[currentProvider] || (currentProvider === 'ollama' ? 'http://localhost:11434' : 'http://192.168.56.1:1234');
      const cleanHost = currentUrl.replace(/https?:\/\//, '');

      if (models.length > 0) {
        badge.className = 'yt-ai-badge online';
        badgeText.textContent = `${name} (${cleanHost})`;
      } else {
        badge.className = 'yt-ai-badge';
        badgeText.textContent = `${name} (${t.checking || 'Connecting...'})`;
      }
      return;
    }

    const hasKey = !!apiKeys[currentProvider];
    const name = PROVIDER_NAMES[currentProvider] || currentProvider;

    if (hasKey) {
      badge.className = 'yt-ai-badge online';
      badgeText.textContent = `${name} (${t.keyOk})`;
    } else {
      badge.className = 'yt-ai-badge offline';
      badgeText.textContent = `${name} (${t.keyRequired})`;
    }
  }

  function updateHeaderModelText() {
    const el = document.getElementById('ytAiHeaderModelText');
    const t = I18N[currentLang] || I18N.en;
    const activeM = getActiveModel();
    if (el) {
      el.textContent = activeM ? `${t.modelPrefix || 'Model: '}${activeM}` : (t.noModelSelected || 'No model');
    }
  }

  function refreshModelsList(showFeedback = false) {
    if (currentProvider !== 'lmstudio' && currentProvider !== 'ollama') return;

    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[currentLang] || I18N.en;
    if (badgeText) badgeText.textContent = t.checking || 'Connecting...';

    const isOllama = currentProvider === 'ollama';
    const defaultHost = isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234';
    const currentUrl = serverUrls[currentProvider] || defaultHost;

    chrome.runtime.sendMessage({
      action: 'FETCH_MODELS',
      provider: currentProvider,
      serverUrl: currentUrl
    }, (response) => {
      if (chrome.runtime.lastError || !response || (!response.success && !response.ok)) {
        tryFallbackUrls();
        return;
      }

      const data = response.data;
      const models = Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.models)
          ? data.models
          : (Array.isArray(data)
            ? data
            : (Array.isArray(response.models) ? response.models : [])));
      availableLocalModels[currentProvider] = models;

      const providerLabel = isOllama ? 'Ollama' : 'LM Studio';
      if (badge) badge.className = 'yt-ai-badge online';
      if (badgeText) badgeText.textContent = `${providerLabel} (${currentUrl.replace(/https?:\/\//, '')})`;

      populateModelDropdown(models);
      if (showFeedback) {
        showStatusBanner(`✅ Connected to ${providerLabel} (${models.length} models ready)`, false);
      }
    });
  }

  function tryFallbackUrls(testedUrls = []) {
    const isOllama = currentProvider === 'ollama';
    const defaults = isOllama
      ? ['http://localhost:11434', 'http://127.0.0.1:11434', 'http://192.168.56.1:11434']
      : ['http://192.168.56.1:1234', 'http://localhost:1234', 'http://127.0.0.1:1234'];

    const currentUrl = serverUrls[currentProvider] || (isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234');
    if (!testedUrls.includes(currentUrl)) testedUrls.push(currentUrl);

    const candidate = defaults.find(u => !testedUrls.includes(u));
    const providerLabel = isOllama ? 'Ollama' : 'LM Studio';
    const badge = document.getElementById('ytAiBadge');
    const badgeText = document.getElementById('ytAiBadgeText');
    const t = I18N[currentLang] || I18N.en;

    if (!candidate) {
      if (badge) badge.className = 'yt-ai-badge offline';
      if (badgeText) badgeText.textContent = `${providerLabel} (${t.offlineBadge || 'Offline'})`;
      populateModelDropdown([]);
      return;
    }

    testedUrls.push(candidate);
    chrome.runtime.sendMessage({
      action: 'FETCH_MODELS',
      provider: currentProvider,
      serverUrl: candidate
    }, (res) => {
      if (res && (res.success || res.ok)) {
        serverUrls[currentProvider] = candidate;
        savePreference(`serverUrl_${currentProvider}`, candidate);
        updateServerUrlUI();
        const data = res.data;
        const models = Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data?.models)
            ? data.models
            : (Array.isArray(data)
              ? data
              : (Array.isArray(res.models) ? res.models : [])));
        availableLocalModels[currentProvider] = models;
        if (badge) badge.className = 'yt-ai-badge online';
        if (badgeText) badgeText.textContent = `${providerLabel} (${candidate.replace(/https?:\/\//, '')})`;
        populateModelDropdown(models);
        showStatusBanner(`✅ Connected to ${providerLabel} (${models.length} models ready)`, false);
      } else {
        tryFallbackUrls(testedUrls);
      }
    });
  }

  function populateModelDropdown(models) {
    const select = document.getElementById('ytAiModelSelect');
    if (!select) return;

    select.innerHTML = '';
    const toolName = currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
    const t = I18N[currentLang] || I18N.en;
    const currentSavedModel = getActiveModel();

    if (!models || models.length === 0) {
      const opt = document.createElement('option');
      if (currentSavedModel) {
        opt.value = currentSavedModel;
        opt.textContent = currentSavedModel;
        opt.selected = true;
      } else {
        opt.value = '';
        opt.textContent = `${t.noModelSelected || 'No model'} (${toolName})`;
      }
      select.appendChild(opt);
      updateHeaderModelText();
      return;
    }

    let hasSelected = false;

    models.forEach(m => {
      const modelId = m.id || m.name || m.model || '';
      if (!modelId || modelId.includes('embed')) return;
      const opt = document.createElement('option');
      opt.value = modelId;
      opt.textContent = modelId;
      if (currentSavedModel && modelId === currentSavedModel) {
        opt.selected = true;
        hasSelected = true;
      }
      select.appendChild(opt);
    });

    if (currentSavedModel && !hasSelected) {
      const opt = document.createElement('option');
      opt.value = currentSavedModel;
      opt.textContent = currentSavedModel;
      opt.selected = true;
      select.insertBefore(opt, select.firstChild);
      hasSelected = true;
    }

    if (!hasSelected && select.options.length > 0) {
      select.selectedIndex = 0;
    }
    setActiveModel(select.value);
    savePreference(`selectedModel_${currentProvider}`, select.value);
    savePreference('selectedModel', select.value);
    updateHeaderModelText();
  }

  function handleTestConnection() {
    const t = I18N[currentLang] || I18N.en;
    if (!selectedModel) {
      showStatusBanner(t.selectModelAlert || 'Please select an AI model.', true);
      return;
    }

    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const key = apiKeys[currentProvider];
    if (!isLocal && !key) {
      showStatusBanner(t.missingKeyAlert || `Please enter an API key for ${currentProvider.toUpperCase()}.`, true);
      return;
    }

    const currentUrl = serverUrls[currentProvider] || '';
    showStatusBanner(`Testing connection to ${selectedModel}...`, false);

    chrome.runtime.sendMessage({
      action: 'TEST_PROVIDER',
      provider: currentProvider,
      serverUrl: currentUrl,
      apiKey: key,
      model: selectedModel
    }, (res) => {
      if (res && (res.success || res.ok)) {
        showStatusBanner(`✅ Model "${selectedModel}" ready (${res.latency || res.latencyMs || 0}ms)!`, false);
      } else {
        showStatusBanner(`❌ Failed: ${res?.error || 'Connection error'}`, true);
      }
    });
  }

  function showStatusBanner(text, isError) {
    const banner = document.getElementById('ytAiStatusBanner');
    if (!banner) return;
    let cleanText = (text || '').trim();
    if (isError) {
      cleanText = cleanText.replace(/^❌\s*/, '');
      cleanText = `❌ ${cleanText}`;
    }
    banner.textContent = cleanText;
    banner.className = `yt-ai-reasoning ${isError ? 'offline' : ''}`;
    banner.classList.remove('yt-ai-hidden');
    setTimeout(() => {
      if (banner.textContent === cleanText) banner.classList.add('yt-ai-hidden');
    }, 7000);
  }

  /**
   * =========================================================================
   * EXTRACTION INFAILLIBLE DE LA TRANSCRIPTION (AVEC SYNCHRONISATION ANTI-RACE)
   * =========================================================================
   */
  function cleanTranscriptText(text) {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseTimedtextContent(bodyText) {
    if (!bodyText || typeof bodyText !== 'string' || bodyText.trim().length === 0) return null;
    const trimmed = bodyText.trim();

    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        if (json && Array.isArray(json.events)) {
          const segs = [];
          for (const ev of json.events) {
            if (!ev.segs) continue;
            const startMs = ev.tStartMs || 0;
            const sec = Math.floor(startMs / 1000);
            const m = Math.floor(sec / 60);
            const s = (sec % 60).toString().padStart(2, '0');
            const txt = cleanTranscriptText(ev.segs.map(s => s.utf8 || '').join(''));
            if (txt && txt !== '\n') {
              segs.push({ timestamp: `${m}:${s}`, text: txt });
            }
          }
          if (segs.length > 5) return segs;
        }
      } catch (_) {}
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/xml');
      const textNodes = Array.from(doc.querySelectorAll('text'));
      if (textNodes.length > 5) {
        const segs = textNodes.map(n => {
          const sec = parseFloat(n.getAttribute('start') || '0');
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60).toString().padStart(2, '0');
          return { timestamp: `${m}:${s}`, text: cleanTranscriptText(n.textContent || '') };
        }).filter(s => s.text.length > 0);
        if (segs.length > 5) return segs;
      }

      const pNodes = Array.from(doc.querySelectorAll('p'));
      if (pNodes.length > 5) {
        const segs = pNodes.map(p => {
          const tAttr = p.getAttribute('t');
          let sec = 0;
          if (tAttr) {
            sec = Math.floor(parseInt(tAttr, 10) / 1000);
          } else {
            sec = Math.floor(parseFloat(p.getAttribute('begin') || '0'));
          }
          const m = Math.floor(sec / 60);
          const s = (sec % 60).toString().padStart(2, '0');
          return { timestamp: `${m}:${s}`, text: cleanTranscriptText(p.textContent || '') };
        }).filter(s => s.text.length > 0);
        if (segs.length > 5) return segs;
      }
    } catch (_) {}

    return null;
  }

  async function fetchTimedtextSegments(baseUrl) {
    if (!baseUrl) return null;

    // Tentative 1 : Demande au format JSON3 (&fmt=json3)
    try {
      const jsonUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const resp = await fetch(jsonUrl, { credentials: 'include' });
      if (resp.ok) {
        const text = await resp.text();
        const segs = parseTimedtextContent(text);
        if (segs) return segs;
      }
    } catch (e) {
      console.warn('[YT AI] Timedtext JSON3 fetch error:', e);
    }

    // Tentative 2 : Format standard (supporte JSON, XML classique <text> et format 3 TTML <p>)
    try {
      const resp = await fetch(baseUrl, { credentials: 'include' });
      if (resp.ok) {
        const bodyText = await resp.text();
        const segs = parseTimedtextContent(bodyText);
        if (segs) return segs;
      }
    } catch (e) {
      console.warn('[YT AI] Timedtext XML fetch error:', e);
    }

    // Tentative 3 : Relais via background service worker pour contourner d'éventuels blocages réseau
    try {
      const jsonUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const bgResp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'FETCH_TIMEDTEXT', url: jsonUrl }, resolve);
      });
      if (bgResp && bgResp.success && bgResp.text) {
        const segs = parseTimedtextContent(bgResp.text);
        if (segs) return segs;
      }
    } catch (_) {}

    return null;
  }

  function isNativeTranscriptPanelVisible() {
    const segs = document.querySelectorAll(
      'transcript-segment-view-model, ytd-transcript-segment-renderer, [class*="ytTranscriptSegmentViewModelHost"]'
    );
    if (segs && segs.length > 3) return true;

    const panels = document.querySelectorAll(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"]'
    );
    for (const panel of panels) {
      const vis = panel.getAttribute('visibility');
      if (vis === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED') return true;
      if (vis !== 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN' && !panel.hasAttribute('hidden') && panel.offsetParent !== null && panel.offsetHeight > 100) {
        return true;
      }
    }
    return false;
  }

  function closeNativeTranscriptPanel() {
    const panels = document.querySelectorAll(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"]'
    );
    for (const panel of panels) {
      const closeBtn = panel.querySelector(
        '#visibility-button button, button[aria-label*="Fermer" i], button[aria-label*="Close" i], yt-button-shape button'
      );
      if (closeBtn) closeBtn.click();
      panel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
    }
  }

  function collapseDescription() {
    const collapseBtn = document.querySelector(
      'tp-yt-paper-button#collapse, #collapse.ytd-text-inline-expander, #description-inline-expander #collapse'
    );
    if (collapseBtn && collapseBtn.offsetParent !== null) {
      collapseBtn.click();
    }
  }

  async function ensureTranscriptTabActive(targetPanel) {
    const panel = targetPanel || document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"]'
    );
    if (!panel) return false;

    if (panel.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer').length > 3) {
      return true;
    }

    const candidates = panel.querySelectorAll(
      'button, [role="tab"], [role="button"], yt-chip-cloud-chip-renderer, yt-formatted-string'
    );
    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (text === 'transcription' || text === 'transcript' || aria === 'transcription' || aria === 'transcript') {
        const clickable = el.closest('button, [role="tab"], [role="button"], yt-chip-cloud-chip-renderer') || el;
        clickable.click();
        return true;
      }
    }
    return false;
  }

  function extractChaptersFromDescription() {
    const results = [];
    const entries = document.querySelectorAll(
      'ytd-macro-markers-entry-renderer, #structured-description ytd-macro-markers-entry-renderer, ytd-chapter-renderer'
    );
    if (entries && entries.length > 1) {
      entries.forEach(el => {
        const timeEl = el.querySelector('#time, [class*="time"], a[href*="t="]');
        const titleEl = el.querySelector('#title, #details, [class*="title"], h4');
        const timestamp = timeEl ? timeEl.textContent.trim() : '';
        const text = titleEl ? titleEl.textContent.trim() : '';
        if (timestamp && text) {
          results.push({ timestamp, text });
        }
      });
      if (results.length > 1) return results;
    }
    return null;
  }

  async function triggerStealthNativeTranscript() {
    const wasPanelOpen = isNativeTranscriptPanelVisible();
    let wasDescExpanded = false;
    const expandDesc = document.querySelector(
      'tp-yt-paper-button#expand, #expand.ytd-text-inline-expander, #description-inline-expander #expand'
    );
    wasDescExpanded = !expandDesc || expandDesc.offsetParent === null;

    if (wasPanelOpen) {
      await ensureTranscriptTabActive();
      return extractTranscriptFromActiveDOM();
    }

    let stealthStyle = document.getElementById('yt-ai-stealth-style');
    if (!stealthStyle) {
      stealthStyle = document.createElement('style');
      stealthStyle.id = 'yt-ai-stealth-style';
      stealthStyle.textContent = `
        ytd-engagement-panel-section-list-renderer[target-id*="transcript"],
        ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"] {
          opacity: 0 !important;
          pointer-events: none !important;
          position: fixed !important;
          left: -9999px !important;
          top: -9999px !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
          z-index: -9999 !important;
        }
      `;
      document.head.appendChild(stealthStyle);
    }

    try {
      let directBtn = document.querySelector(
        'ytd-video-description-transcript-section-renderer button, ' +
        'button[aria-label*="transcription" i], button[aria-label*="transcript" i]'
      );

      if (!directBtn && expandDesc && expandDesc.offsetParent !== null) {
        expandDesc.click();
        await new Promise(r => setTimeout(r, 150));
        directBtn = document.querySelector(
          'ytd-video-description-transcript-section-renderer button, ' +
          'button[aria-label*="transcription" i], button[aria-label*="transcript" i]'
        );
      }

      if (directBtn) {
        directBtn.click();
      } else {
        const markersBtn = document.querySelector(
          'ytd-macro-markers-list-renderer button, ' +
          '#structured-description ytd-macro-markers-list-renderer [role="button"], ' +
          'button[aria-label*="chapitre" i], button[aria-label*="chapter" i]'
        );
        if (markersBtn) {
          markersBtn.click();
          await new Promise(r => setTimeout(r, 150));
          await ensureTranscriptTabActive();
        } else {
          const hiddenPanel = document.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
            'ytd-engagement-panel-section-list-renderer[target-id*="transcript"]'
          );
          if (hiddenPanel) {
            hiddenPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');
            if (typeof hiddenPanel.show === 'function') hiddenPanel.show();
          } else {
            return null;
          }
        }
      }

      let segments = null;
      for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 100));
        await ensureTranscriptTabActive();
        segments = extractTranscriptFromActiveDOM();
        if (segments && segments.length > 3) break;
      }

      return segments;
    } catch (_) {
      return null;
    } finally {
      if (stealthStyle && stealthStyle.parentNode) {
        stealthStyle.parentNode.removeChild(stealthStyle);
      }
      if (!wasPanelOpen) {
        closeNativeTranscriptPanel();
        if (!wasDescExpanded) {
          collapseDescription();
        }
      }
    }
  }

  async function extractYouTubeTranscript(preferredLang = 'en') {
    const currentVideoId = getVideoId();

    if (cachedTranscript.videoId === currentVideoId && cachedTranscript.segments.length > 0) {
      return cachedTranscript.segments;
    }

    // MODÈLE 1 : Segments déjà présents dans le DOM actif ou panneau "Transcription" ouvert
    // Règle d'or : ne JAMAIS fermer le panneau de l'utilisateur s'il est déjà ouvert !
    let domSegments = extractTranscriptFromActiveDOM();
    if (domSegments && domSegments.length > 3) {
      saveCachedTranscript(currentVideoId, domSegments);
      return domSegments;
    }

    // MODÈLE 2 : Extraction in-memory via main_world (Player Captions, Timedtext & InnerTube)
    const playerData = await requestPlayerDataFromMainWorld(currentVideoId, preferredLang);
    if (playerData && Array.isArray(playerData.segments) && playerData.segments.length > 3) {
      saveCachedTranscript(currentVideoId, playerData.segments);
      return playerData.segments;
    }

    // MODÈLE 3 : Téléchargement du flux sous-titres si captionTracks détecté
    if (playerData && playerData.captions && playerData.captions.length > 0) {
      let track = playerData.captions.find(t => t.languageCode === preferredLang);
      if (!track) track = playerData.captions.find(t => t.languageCode?.startsWith(preferredLang));
      if (!track) track = playerData.captions.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
      if (!track) track = playerData.captions[0];

      if (track && track.baseUrl) {
        const segments = await fetchTimedtextSegments(track.baseUrl);
        if (segments && segments.length > 3) {
          saveCachedTranscript(currentVideoId, segments);
          return segments;
        }
      }
    }

    // MODÈLE 4 : Déclenchement furtif du chargeur natif YouTube ("Transcription" / "Dans cette vidéo")
    // Préserve strictement l'état : ne laisse pas ouvert si c'était fermé, ne ferme pas si c'était ouvert
    const stealthSegments = await triggerStealthNativeTranscript();
    if (stealthSegments && stealthSegments.length > 3) {
      saveCachedTranscript(currentVideoId, stealthSegments);
      return stealthSegments;
    }

    // MODÈLE 5 : Extraction des chapitres et marqueurs structurés ("Dans cette vidéo")
    const chapterSegments = extractChaptersFromDescription();
    if (chapterSegments && chapterSegments.length > 1) {
      saveCachedTranscript(currentVideoId, chapterSegments);
      return chapterSegments;
    }

    return null;
  }

  function saveCachedTranscript(videoId, segments) {
    cachedTranscript = {
      videoId,
      segments,
      fullText: segments.map(s => s.text).join(' ')
    };

    const wordsCount = cachedTranscript.fullText.trim().split(/\s+/).length;
    const wordCountEl = document.getElementById('ytAiWordCount');
    const wordCountTab = document.getElementById('ytAiWordCountTab');
    const transcriptBody = document.getElementById('ytAiTranscriptBody');

    if (wordCountEl) wordCountEl.textContent = wordsCount.toLocaleString('fr-FR');
    if (wordCountTab) wordCountTab.textContent = `${wordsCount.toLocaleString('fr-FR')} mots`;

    if (transcriptBody) {
      transcriptBody.innerHTML = segments.map(s => {
        let sec = 0;
        if (s.timestamp) {
          const parts = s.timestamp.split(':').map(Number);
          if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
        }
        return `<div class="yt-ai-transcript-line"><a href="javascript:void(0)" class="yt-ai-timestamp-link" data-time="${sec}">[${s.timestamp || '--:--'}]</a> <span>${escapeHtml(s.text)}</span></div>`;
      }).join('');
    }
  }

  function extractTranscriptFromActiveDOM() {
    const results = [];
    const seen = new Set();

    // 1. Recherche ciblée sur les composants modernes (transcript-segment-view-model, etc.)
    const modernNodes = document.querySelectorAll(
      'transcript-segment-view-model, ytd-transcript-segment-renderer, [class*="ytTranscriptSegmentViewModelHost"]:not(transcript-segment-view-model *)'
    );

    if (modernNodes && modernNodes.length > 3) {
      modernNodes.forEach(node => {
        const timeEl = node.querySelector(
          '.ytTranscriptSegmentViewModelTimestamp, .segment-timestamp, [class*="Timestamp"], [class*="timestamp"]'
        );
        const textEl = node.querySelector(
          'span[role="text"], .ytAttributedStringInlineHost, span.ytAttributedStringHost, .yt-core-attributed-string, .segment-text, yt-formatted-string'
        );

        let timestamp = timeEl ? timeEl.textContent.trim() : '';
        let text = textEl ? textEl.textContent.trim() : '';

        // Si non trouvé via sélecteurs spécifiques, tenter une extraction intelligente du texte
        if (!timestamp) {
          const m = (node.textContent || '').match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
          if (m) timestamp = m[1];
        }

        if (!text && timestamp) {
          text = (node.textContent || '').replace(timestamp, '').trim();
        }

        // Nettoyage
        text = text
          .replace(/^(afficher plus|show more|moins|show less)\b/i, '')
          .replace(/[\n\r]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (text && timestamp) {
          const key = `${timestamp}|${text.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ timestamp, text });
          }
        }
      });

      if (results.length > 3) return results;
    }

    // 2. Fallback textuel sur le panneau actif (tous types de panneaux de transcription YouTube)
    const panel = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="transcript"], ' +
      'ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"], ' +
      '#panels ytd-engagement-panel-section-list-renderer'
    );

    if (panel) {
      const panelText = panel.innerText || '';
      const lines = panelText.split('\n').map(l => l.trim()).filter(Boolean);
      const parsed = [];
      let curTime = '';
      let curText = '';

      const ignoredHeaders = [
        'transcription', 'transcript', 'rechercher dans', 'search transcript',
        'synchroniser avec', 'sync with video', 'tout', 'all', 'source :', 'podcast'
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (ignoredHeaders.some(h => lower.includes(h))) continue;

        const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)$/);
        if (match) {
          if (curTime && curText) {
            parsed.push({ timestamp: curTime, text: curText.trim() });
            curText = '';
          }
          curTime = match[1];
        } else if (curTime) {
          curText += (curText ? ' ' : '') + line;
        }
      }

      if (curTime && curText) {
        parsed.push({ timestamp: curTime, text: curText.trim() });
      }

      if (parsed.length > 3) return parsed;
    }

    return null;
  }

  function requestPlayerDataFromMainWorld(videoId, preferredLang = 'fr') {
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.source !== window || !e.data || e.data.type !== 'YT_AI_RES_PLAYER_DATA') return;
        window.removeEventListener('message', handler);
        resolve(e.data || {});
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'YT_AI_REQ_PLAYER_DATA', videoId, preferredLang }, '*');

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({});
      }, 8000);
    });
  }

  function getVideoMetadata() {
    const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title');
    const authorEl = document.querySelector('ytd-channel-name a, #channel-name a, #owner-name a');

    return {
      title: titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '').trim(),
      author: authorEl?.textContent?.trim() || 'Chaîne YouTube'
    };
  }

  /**
   * =========================================================================
   * GESTION DE LA FENÊTRE DE CONTEXTE ET ÉCHANTILLONNAGE INTELLIGENT
   * =========================================================================
   */
  function condenseTranscriptForContext(transcript, maxChars) {
    if (transcript.length <= maxChars) {
      return transcript;
    }

    const introSize = Math.floor(maxChars * 0.40);
    const middleSize = Math.floor(maxChars * 0.25);
    const endSize = Math.floor(maxChars * 0.35);

    const intro = transcript.slice(0, introSize);
    const middleStart = Math.floor((transcript.length - middleSize) / 2);
    const middle = transcript.slice(middleStart, middleStart + middleSize);
    const end = transcript.slice(-endSize);

    return `${intro}

\n[... Progression de la vidéo condensée pour respecter la mémoire du modèle ...]

${middle}

\n[... Progression vers la conclusion ...]

${end}`;
  }

  /**
   * =========================================================================
   * SYNTHÈSE IA MULTI-FOURNISSEUR AVEC STREAMING
   * =========================================================================
   */
  async function startSummarization() {
    if (isGenerating) return;

    const lang = document.getElementById('ytAiLangSelect')?.value || currentLang || 'en';
    currentLang = lang;
    const t = I18N[currentLang] || I18N.en;

    const activeModel = getActiveModel();
    if (!activeModel) {
      showStatusBanner(t.selectModelAlert || 'Please select a valid AI model.', true);
      return;
    }

    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const key = apiKeys[currentProvider];
    if (!isLocal && !key) {
      showStatusBanner(t.missingKeyAlert || `API key missing for ${currentProvider.toUpperCase()}. Please enter your key.`, true);
      return;
    }

    const mode = document.getElementById('ytAiModeSelect')?.value || 'standard';
    const summaryBody = document.getElementById('ytAiSummaryBody');
    const reasoningBox = document.getElementById('ytAiReasoningBox');
    const reasoningText = document.getElementById('ytAiReasoningText');
    const reasoningStatus = document.getElementById('ytAiReasoningStatus');
    const summarizeBtn = document.getElementById('ytAiSummarizeBtn');
    const heroBtn = document.getElementById('ytAiSummaryHeroBtn');

    isGenerating = true;
    if (summarizeBtn) {
      summarizeBtn.disabled = true;
      summarizeBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Extracting transcript...'}`;
    }
    if (heroBtn) {
      heroBtn.disabled = true;
      heroBtn.innerHTML = `<span class="yt-ai-spinner"></span> ${t.generatingSummary || 'Extracting transcript...'}`;
    }

    try {
      const segments = await extractYouTubeTranscript(lang);

      if (!segments || segments.length === 0) {
        throw new Error(t.noTranscriptError || "Unable to extract transcript. Ensure video captions are available.");
      }

      const fullText = cachedTranscript.fullText;
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
      fullSummaryMarkdown = '';
      fullReasoningText = '';

      const meta = getVideoMetadata();
      const maxAllowedChars = CONTEXT_LIMITS[currentProvider] || 25000;
      const safeTranscript = condenseTranscriptForContext(fullText, maxAllowedChars);

      const { systemPrompt, userPrompt } = buildPrompts(meta.title, meta.author, safeTranscript, lang, mode);

      const currentUrl = serverUrls[currentProvider] || '';

      activePort = chrome.runtime.connect({ name: 'ai-stream' });

      activePort.postMessage({
        action: 'START_STREAM',
        provider: currentProvider,
        serverUrl: currentUrl,
        apiKey: key,
        model: activeModel,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens
      });

      activePort.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          if (msg.reasoning) {
            fullReasoningText += msg.reasoning;
            if (reasoningBox) {
              reasoningBox.classList.remove('yt-ai-hidden');
              reasoningBox.open = true;
            }
            if (reasoningText) reasoningText.textContent = fullReasoningText;
            if (reasoningStatus) reasoningStatus.textContent = t.reasoningInProgress || 'thinking...';
          }

          if (msg.content) {
            if (fullReasoningText && reasoningStatus && reasoningStatus.textContent !== (t.reasoningDone || 'completed')) {
              reasoningStatus.textContent = t.reasoningDone || 'completed';
              if (reasoningBox) reasoningBox.open = false;
            }

            fullSummaryMarkdown += msg.content;
            if (summaryBody) renderMarkdown(fullSummaryMarkdown, summaryBody);
          }
        } else if (msg.type === 'DONE') {
          finishGeneration();
        } else if (msg.type === 'ERROR') {
          showStatusBanner(msg.error, true);
          if (summaryBody) {
            summaryBody.innerHTML = `<div style="color: #ff7b72; padding: 12px; background: rgba(248,81,73,0.1); border-radius: 6px;"><strong>${escapeHtml(t.errorLabel || 'Error: ')}</strong>${escapeHtml(msg.error)}</div>`;
          }
          finishGeneration();
        }
      });

      activePort.onDisconnect.addListener(() => {
        finishGeneration();
      });

    } catch (err) {
      console.error('Erreur synthèse:', err);
      const cleanErr = (err.message || '').replace(/^❌\s*/, '');
      showStatusBanner(cleanErr, true);
      if (summaryBody) {
        summaryBody.innerHTML = `<div style="color: #ff7b72; padding: 12px; background: rgba(248,81,73,0.1); border-radius: 6px;"><strong>${escapeHtml(t.errorLabel || 'Error: ')}</strong>${escapeHtml(cleanErr)}</div>`;
      }
      finishGeneration();
    }
  }

  function finishGeneration() {
    isGenerating = false;
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
    if (activePort) {
      activePort.disconnect();
      activePort = null;
    }

  }

  /**
   * =========================================================================
   * SECTION CHAT INTERACTIF (PROSE NATURELLE, SANS PUCES NI EMOJIS, TRÈS CLAIRE)
   * =========================================================================
   */
  async function handleSendChatMessage(customText = null) {
    stopDictation();
    const inputEl = document.getElementById('ytAiChatInput');
    const text = (customText || inputEl?.value || '').trim();
    if (!text) return;

    if (inputEl && !customText) inputEl.value = '';

    setExpanded(true);
    switchTab('chat');

    const messagesContainer = document.getElementById('ytAiChatMessages');
    const chatCountBadge = document.getElementById('ytAiChatCount');
    const lang = document.getElementById('ytAiLangSelect')?.value || currentLang || 'en';
    currentLang = lang;
    const t = I18N[currentLang] || I18N.en;

    // 1. Bulle utilisateur
    appendChatBubble('user', escapeHtml(text));

    // 2. Vérification / Extraction de la transcription
    if (!cachedTranscript.segments || cachedTranscript.segments.length === 0) {
      const waitBubble = appendChatBubble('ai', `<span class="yt-ai-spinner"></span> ${lang === 'fr' ? 'Extraction de la transcription de la vidéo en cours...' : 'Extracting video transcript...'}`);
      const segments = await extractYouTubeTranscript(lang);
      if (!segments || segments.length === 0) {
        waitBubble.innerHTML = `<span style="color: #ff7b72;">❌ ${escapeHtml(t.noTranscriptError || "Unable to extract video transcript.")}</span>`;
        return;
      }
      waitBubble.remove();
    }

    const activeModel = getActiveModel();
    if (!activeModel) {
      appendChatBubble('ai', t.selectModelAlert || 'Veuillez sélectionner un modèle IA dans la barre de réglages ci-dessus.');
      return;
    }

    const isLocal = (currentProvider === 'lmstudio' || currentProvider === 'ollama');
    const key = apiKeys[currentProvider];
    if (!isLocal && !key) {
      appendChatBubble('ai', t.missingKeyAlert || `Veuillez renseigner votre clé API ${currentProvider.toUpperCase()} pour discuter.`);
      return;
    }

    // 3. Bulle IA avec curseur d'écriture
    const aiBubble = appendChatBubble('ai', '');
    aiBubble.classList.add('yt-ai-typing');

    // 4. Construction du contexte avec échantillonnage adapté au modèle
    const meta = getVideoMetadata();
    const maxChars = CONTEXT_LIMITS[currentProvider] || 20000;
    const safeTranscript = condenseTranscriptForContext(cachedTranscript.fullText, maxChars);

    const selectedChatMode = document.getElementById('ytAiModeSelect')?.value || 'standard';
    const systemPrompt = buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode);

    const historyPayload = chatHistory.slice(-8);
    historyPayload.push({ role: 'user', content: text });

    let fullAnswer = '';

    if (chatPort) {
      try { chatPort.disconnect(); } catch (e) {}
    }

    const currentUrl = serverUrls[currentProvider] || '';

    chatPort = chrome.runtime.connect({ name: 'ai-stream' });
    chatPort.postMessage({
      action: 'CHAT_STREAM',
      provider: currentProvider,
      serverUrl: currentUrl,
      apiKey: key,
      model: activeModel,
      systemPrompt,
      messages: historyPayload,
      temperature,
      maxTokens
    });

    chatPort.onMessage.addListener((msg) => {
      if (msg.type === 'CHUNK' && msg.content) {
        fullAnswer += msg.content;
        renderMarkdown(fullAnswer, aiBubble);
        scrollToBottom(messagesContainer);
      } else if (msg.type === 'DONE') {
        aiBubble.classList.remove('yt-ai-typing');
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: fullAnswer });
        if (chatCountBadge) chatCountBadge.textContent = Math.floor(chatHistory.length / 2);

        attachAudioButtonToBubble(aiBubble, fullAnswer);

        if (chatPort) { chatPort.disconnect(); chatPort = null; }
      } else if (msg.type === 'ERROR') {
        aiBubble.classList.remove('yt-ai-typing');
        aiBubble.innerHTML = `<span style="color: #ff7b72;">❌ ${escapeHtml(msg.error)}</span>`;
        if (chatPort) { chatPort.disconnect(); chatPort = null; }
      }
    });

    chatPort.onDisconnect.addListener(() => {
      aiBubble.classList.remove('yt-ai-typing');
    });
  }

  function appendChatBubble(role, contentHtml) {
    const container = document.getElementById('ytAiChatMessages');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `yt-ai-chat-bubble ${role}`;
    bubble.innerHTML = contentHtml;
    container.appendChild(bubble);
    scrollToBottom(container);
    return bubble;
  }

  function attachAudioButtonToBubble(bubble, answerText) {
    if (!bubble) return;
    const existingToolbar = bubble.querySelector('.yt-ai-bubble-toolbar');
    if (existingToolbar) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'yt-ai-bubble-toolbar';

    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'yt-ai-tts-btn';
    ttsBtn.title = 'Écouter cette réponse';
    ttsBtn.textContent = '🔊 Écouter';

    ttsBtn.addEventListener('click', () => {
      speakText(answerText, ttsBtn);
    });

    toolbar.appendChild(ttsBtn);
    bubble.appendChild(toolbar);
  }

  function handleClearChat() {
    chatHistory = [];
    stopSpeech();
    stopDictation();
    const container = document.getElementById('ytAiChatMessages');
    const chatCountBadge = document.getElementById('ytAiChatCount');
    const t = I18N[currentLang] || I18N.en;

    if (container) {
      container.innerHTML = `
        <div class="yt-ai-chat-bubble ai">
          ${t.chatResetNotice}
        </div>
      `;
    }
    if (chatCountBadge) chatCountBadge.textContent = '0';
  }

  function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  function resetSummaryOutput() {
    const summaryBody = document.getElementById('ytAiSummaryBody');
    const reasoningBox = document.getElementById('ytAiReasoningBox');
    const speakSummaryBtn = document.getElementById('ytAiSpeakSummaryBtn');

    if (summaryBody) {
      renderSummaryEmptyState(true);
    }
    if (reasoningBox) reasoningBox.classList.add('yt-ai-hidden');
    if (speakSummaryBtn) resetSpeakingButton(speakSummaryBtn);
    fullSummaryMarkdown = '';
    fullReasoningText = '';
  }

  function resetChatOutput() {
    handleClearChat();
  }

  function resetTranscriptOutput() {
    const transcriptBody = document.getElementById('ytAiTranscriptBody');
    const wordCountEl = document.getElementById('ytAiWordCount');
    const wordCountTab = document.getElementById('ytAiWordCountTab');
    const t = I18N[currentLang] || I18N.en;

    if (transcriptBody) transcriptBody.textContent = t.waitingExtraction;
    if (wordCountEl) wordCountEl.textContent = '0';
    if (wordCountTab) wordCountTab.textContent = `0 ${t.wordsBadge}`;
  }



  function buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode) {
    if (lang === 'en') {
      let lenDir = "Desired length: balanced, natural response, not too long, straight to the point.";
      if (selectedChatMode === 'quick') lenDir = "Desired length: short and concise answer (1-2 short paragraphs), straight to the point.";
      else if (selectedChatMode === 'detailed') lenDir = "Desired length: detailed and comprehensive explanation.";

      return `You are an expert AI assistant specializing in clear, natural, and direct oral and written explanations.
You answer the user's questions about this YouTube video, strictly based on its transcript:
Title: "${meta.title}"
Channel: "${meta.author}"

Transcript:
"""
${safeTranscript}
"""

WRITING GUIDELINES (FOR READING AND AUDIO LISTENING):
1. NATURAL AND DIRECT TONE:
   - Answer in clear, fluent, natural English.
   - Go straight to the point without filler phrases.
   - Avoid overly long or tangled sentences.
   - ${lenDir}

2. CONTINUOUS PROSE (NO THEMATIC BULLETS OR EMOJIS):
   - Write in flowing prose paragraphs.
   - Do not use thematic bullet points or emoji lists so that text-to-speech (TTS) playback remains smooth.

3. AIRY STRUCTURE:
   - Break your response into short, readable paragraphs.
   - Leave a blank line between paragraphs.
   - Highlight key terms in **bold** for readability.
   - 100% faithful to the transcript, no hallucinations.`;
    }

    if (lang === 'es') {
      let lenDir = "Longitud deseada: respuesta equilibrada y natural, sin rodeos.";
      if (selectedChatMode === 'quick') lenDir = "Longitud deseada: respuesta corta y concisa (1 o 2 párrafos cortos).";
      else if (selectedChatMode === 'detailed') lenDir = "Longitud deseada: respuesta detallada y completa.";

      return `Eres un asistente de IA experto en explicaciones orales y escritas: directas, claras, naturales y agradables de escuchar.
Respondes a las preguntas del usuario sobre este vídeo de YouTube basándote estrictamente en su transcripción en ESPAÑOL:
Título: "${meta.title}"
Canal: "${meta.author}"

Transcripción:
"""
${safeTranscript}
"""

DIRECTRICES DE REDACCIÓN (LECTURA VISUAL Y AUDIO):
1. TONO NATURAL Y DIRECTO:
   - Responde de forma fluida, natural y directa.
   - Ve al grano sin rodeos innecesarios.
   - ${lenDir}

2. FORMATO EN PROSA (SIN VIÑETAS TEMÁTICAS NI EMOJIS):
   - Redacta en párrafos de prosa continua para que la síntesis de voz (TTS) sea fluida.

3. ESTRUCTURA AIREADA:
   - Divide tu texto en párrafos cortos y fáciles de leer.
   - Deja una línea en blanco entre párrafos.
   - Resalta términos clave en **negrita**.
   - 100% fiel a la transcripción, sin inventar nada.`;
    }

    if (lang === 'de') {
      let lenDir = "Gewünschte Länge: ausgewogene, natürliche Antwort, direkt auf den Punkt.";
      if (selectedChatMode === 'quick') lenDir = "Gewünschte Länge: kurze und prägnante Antwort (1-2 kurze Absätze).";
      else if (selectedChatMode === 'detailed') lenDir = "Gewünschte Länge: ausführliche und detaillierte Erklärung.";

      return `Du bist ein KI-Experte für klare, direkte und natürliche Erklärungen auf DEUTSCH.
Beantworte die Fragen des Nutzers zu diesem YouTube-Video basierend auf dem Transkript:
Titel: "${meta.title}"
Kanal: "${meta.author}"

Transkript:
"""
${safeTranscript}
"""

RICHTLINIEN (LESEN UND AUDIO-WIEDERGABE):
1. NATÜRLICHER UND DIREKTER TON:
   - Antworte flüssig, präzise und verständlich.
   - ${lenDir}

2. FLIESSTEXT (KEINE THEMATISCHEN AUFZÄHLUNGEN ODER EMOJIS):
   - Schreibe in zusammenhängendem Fließtext für eine angenehme Audio-Sprachausgabe (TTS).

3. LUFTIGE STRUKTUR:
   - Kurze Absätze mit Zeilenumbruch.
   - Wichtige Begriffe in **fett**.
   - 100% getreu dem Transkript.`;
    }

    if (lang === 'it') {
      let lenDir = "Lunghezza desiderata: risposta equilibrata e naturale, senza frasi superflue, che va dritta al punto.";
      if (selectedChatMode === 'quick') lenDir = "Lunghezza desiderata: risposta breve e concisa (1 o 2 brevi paragrafi), dritta al punto.";
      else if (selectedChatMode === 'detailed') lenDir = "Lunghezza desiderata: spiegazione dettagliata e approfondita.";

      return `Sei un assistente IA esperto in spiegazioni orali e scritte: chiare, naturali, dirette e piacevoli da ascoltare.
Rispondi alle domande dell'utente su questo video di YouTube basandoti rigorosamente sulla sua trascrizione in ITALIANO:
Titolo: "${meta.title}"
Canale: "${meta.author}"

Trascrizione:
"""
${safeTranscript}
"""

LINEE GUIDA DI REDAZIONE (LETTURA E ASCOLTO AUDIO):
1. TONO NATURALE E DIRETTO:
   - Rispondi in modo fluido, naturale e diretto.
   - Vai dritto al punto senza frasi riempitive.
   - ${lenDir}

2. FORMATO IN PROSA (NESSUN ELENCO PUNTATO TEMATICO NÉ EMOJI):
   - Scrivi in paragrafi di prosa continua per rendere fluida la sintesi vocale (TTS).

3. STRUTTURA ARIOSA:
   - Dividi la risposta in brevi paragrafi facili da leggere.
   - Lascia una riga vuota tra i paragrafi.
   - Evidenzia i termini chiave in **grassetto**.
   - Fedele al 100% alla trascrizione, senza alcuna allucinazione.`;
    }

    if (lang === 'ru') {
      let lenDir = "Желаемая длина: сбалансированный и естественный ответ, без лишней 'воды', прямо к сути.";
      if (selectedChatMode === 'quick') lenDir = "Желаемая длина: краткий и емкий ответ (1-2 коротких абзаца), строго по делу.";
      else if (selectedChatMode === 'detailed') lenDir = "Желаемая длина: подробное, глубокое и развернутое объяснение.";

      return `Ты — экспертный ИИ-ассистент, специализирующийся на ясных, естественных и прямых ответах на РУССКОМ языке.
Отвечай на вопросы пользователя по этому видео YouTube строго на основе его транскрипции:
Название: "${meta.title}"
Канал: "${meta.author}"

Транскрипция:
"""
${safeTranscript}
"""

ПРАВИЛА ОФОРМЛЕНИЯ (ДЛЯ ЧТЕНИЯ И ГОЛОСОВОГО ВОСПРОИЗВЕДЕНИЯ):
1. ЕСТЕСТВЕННЫЙ И ПРЯМОЙ ТОН:
   - Отвечай живым, грамотным и понятным языком.
   - Избегай витиеватых и громоздких предложений.
   - ${lenDir}

2. СВЯЗНЫЙ ТЕКСТ (БЕЗ ТЕМАТИЧЕСКИХ СПИСКОВ И ЭМОДЗИ):
   - Пиши связными абзацами прозы. Не используй списки с маркерами или эмодзи, чтобы озвучивание (TTS) звучало гладко.

3. ЧИТАЕМАЯ СТРУКТУРА:
   - Разделяй текст на короткие абзацы с пустой строкой между ними.
   - Выделяй ключевые слова **жирным шрифтом**.
   - На 100% точно по транскрипции, ничего не выдумывая.`;
    }

    if (lang === 'ja') {
      let lenDir = "希望の長さ: 自然でバランスの取れた、要点を押さえた回答。";
      if (selectedChatMode === 'quick') lenDir = "希望の長さ: 簡潔で短い回答（1〜2段落程度）、要点のみを直接伝える。";
      else if (selectedChatMode === 'detailed') lenDir = "希望の長さ: 詳細で深い丁寧な解説。";

      return `あなたは、明瞭で自然、かつ要点を捉えた日本語の解説を得意とするAIアシスタントです。
YouTube動画の文字起こしに基づいて、ユーザーの質問に日本語で正確に回答してください：
タイトル: "${meta.title}"
チャンネル: "${meta.author}"

文字起こし:
"""
${safeTranscript}
"""

作成ガイドライン（画面での閲覧および音声読み上げ用）:
1. 自然で直接的な表現:
   - 自然で分かりやすい日本語で回答してください。
   - 前置きや余計な挨拶は省き、要点から伝えてください。
   - ${lenDir}

2. 流暢な文章構成（絵文字や箇条書き記号の多用を避ける）:
   - 音声読み上げ（TTS）がスムーズに行えるよう、箇条書き記号や絵文字の乱用を避け、読みやすい文章段落で構成してください。

3. 読みやすい段落分け:
   - 短い段落に分け、段落間に空行を入れてください。
   - 重要なキーワードは **太字** で強調してください。
   - 文字起こしに100%忠実であり、推測やハルシネーションは含めないでください。`;
    }

    if (lang === 'zh') {
      let lenDir = "期望长度：自然平衡、直奔主题、详略得当。";
      if (selectedChatMode === 'quick') lenDir = "期望长度：简明扼要、短小精炼（1至2个简短段落），直击重点。";
      else if (selectedChatMode === 'detailed') lenDir = "期望长度：详细深入、全面透彻的展开分析。";

      return `你是一名专业的 AI 助理，擅长生成清晰自然、直击要点的中文口语与书面解答。
请严格基于该 YouTube 视频的字幕逐字稿，回答用户的问题：
标题: "${meta.title}"
频道: "${meta.author}"

视频逐字稿:
"""
${safeTranscript}
"""

写作准则（兼顾视觉阅读与语音朗读）：
1. 自然直接的语调：
   - 使用流畅、自然的中文回答，直奔核心，避免客套与废话。
   - 避免冗长缠绕的句子。
   - ${lenDir}

2. 连贯段落（不使用列表符号与表情符号）：
   - 以连贯的段落叙述，不要使用列表项目符号或表情图标，以确保语音朗读（TTS）平稳顺畅。

3. 清爽结构：
   - 切分成短小易读的段落，段落之间空一行。
   - 核心关键词用 **加粗** 突出显示。
   - 100% 忠实于逐字稿，严禁虚构与幻觉。`;
    }

    // Français par défaut
    let lengthDirective = "Longueur souhaitée : réponse équilibrée et naturelle, pas trop longue, allant droit à l'essentiel.";
    if (selectedChatMode === 'quick') {
      lengthDirective = "Longueur souhaitée : réponse courte, concise et directe (1 ou 2 courts paragraphes suffisent).";
    } else if (selectedChatMode === 'detailed') {
      lengthDirective = "Longueur souhaitée : réponse détaillée et approfondie, développant les explications et arguments.";
    }

    return `Tu es un assistant IA expert en explications orales et écrites : directes, claires, naturelles et agréables à écouter.
Tu réponds aux questions de l'utilisateur sur la vidéo YouTube en t'appuyant rigoureusement sur sa transcription :
Titre : "${meta.title}"
Chaîne : "${meta.author}"

Transcription de la vidéo :
"""
${safeTranscript}
"""

DIRECTIVES DE RÉDACTION (CONFORT VISUEL ET ÉCOUTE AUDIO) :
1. TON NATUREL ET DIRECT :
   - Réponds de façon vivante, fluide et naturelle.
   - Va droit au but sans bavardage superflu.
   - Évite les phrases excessivement longues ou alambiquées : privilégie des phrases simples, claires et bien rythmées.
   - ${lengthDirective}

2. FORMAT EN PROSE (PAS DE PUCES THÉMATIQUES NI D'ÉMOJIS) :
   - Rédige sous forme de paragraphes en prose continue.
   - N'utilise pas de puces thématiques, de tirets de liste ni d'émojis afin que la lecture vocale (TTS) reste fluide et sans interruptions saccadées.

3. STRUCTURE AÉRÉE :
   - Découpe ton texte en courts paragraphes faciles à lire.
   - Saute une ligne entre chaque paragraphe.
   - Mets en **gras** les quelques termes clés importants pour faciliter la lecture rapide.
   - 100% fidèle à la transcription, sans rien inventer.`;
  }


  function buildPrompts(title, author, safeTranscript, lang, mode) {
    let systemPrompt = '';
    let userPrompt = '';

    if (lang === 'en') {
      systemPrompt = `You are an expert AI assistant specializing in video summarization and insights.
Your goal is to produce a clear, natural, well-structured, and faithful summary in ENGLISH, regardless of the original video language.
STYLE RULES:
- Natural, direct, and engaging style: go straight to the point without filler phrases.
- Avoid overly long and complex sentences, focus on clarity and flow.
- Use airy Markdown formatting with bullet points and **bold** keywords at the start of each point.
- 100% faithful to the transcript, with zero hallucinations or extrapolation.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Produce a short, concise, and direct summary in this format:
### ⚡ Quick Takeaway
(1 to 2 direct sentences summarizing the core topic and main message)

### 📌 Top Key Points
- **Point 1** : Core information simply summarized
- **Point 2** : Core information simply summarized
- **Point 3** : Core information simply summarized
- **Point 4** : Core information simply summarized
- **Point 5** : Core information simply summarized

### 💡 Core Takeaway
(The main takeaway in one clear sentence)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Produce a comprehensive analysis in this format:
### 🎯 Overview & Context
(In-depth explanation of the background and key issues)

### 🔍 In-depth Analysis
(Structure by themes, arguments, key examples, or steps with clear bullet points)

### 💡 Actionable Advice & Conclusion
(Core lessons, practical takeaways, and concluding remarks)`;
      } else {
        formatInstructions = `Produce a structured, natural summary in this format:
### 🎯 In Brief
(2 to 3 sentences summarizing the main topic and purpose of the video)

### 🔑 Key Takeaways & Highlights
- **Topic / Point 1** :
  First clear sentence explaining the main idea.
  Second sentence providing details or a concrete example.
- **Topic / Point 2** :
  First clear sentence explaining the main idea.
  Second sentence providing details or a concrete example.
- ... (4 to 7 key takeaways)

### 💡 Conclusion & Key Takeaway
(The author's main conclusion or actionable advice)`;
      }

      userPrompt = `Title: "${title}"
Channel: ${author}

${formatInstructions}

Transcript:
"""
${safeTranscript}
"""`;
    } else if (lang === 'es') {
      systemPrompt = `Eres un asistente de IA experto en síntesis y divulgación de contenidos de vídeo.
Tu objetivo es redactar un resumen claro, natural, bien estructurado y fiel en ESPAÑOL, independientemente del idioma original del vídeo.
REGLAS DE ESTILO:
- Estilo natural, directo y contundente: ve directo al grano sin palabrería superflua.
- Evita frases excesivamente largas y complejas, favorece la claridad.
- Usa un formato Markdown aireado con listas de viñetas y palabras clave en **Negrita** al inicio de cada punto.
- 100% fiel a la transcripción, sin alucinaciones ni extrapolaciones.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Produce una síntesis corta, concisa y directa en el siguiente formato:
### ⚡ Síntesis Rápida
(1 o 2 frases directas resumiendo el tema y el mensaje clave)

### 📌 Puntos esenciales
- **Punto 1** : Información clave resumida de forma sencilla
- **Punto 2** : Información clave resumida de forma sencilla
- **Punto 3** : Información clave resumida de forma sencilla
- **Punto 4** : Información clave resumida de forma sencilla
- **Punto 5** : Información clave resumida de forma sencilla

### 💡 Lo esencial a recordar
(El mensaje principal en una frase clara)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Produce un análisis detallado en el siguiente formato:
### 🎯 Visión general y contexto
(Explicación detallada de los temas)

### 🔍 Análisis en profundidad
(Desarrolla los diferentes temas, argumentos y ejemplos abordados de forma estructurada)

### 💡 Conclusiones y aprendizajes prácticos
(Lo que hay que recordar, consejos aplicables y reflexiones finales)`;
      } else {
        formatInstructions = `Produce un resumen estructurado en el siguiente formato:
### 🎯 En breve
(2 o 3 frases resumiendo el tema principal y el objetivo del vídeo)

### 🔑 Puntos clave y aprendizajes
- **Tema / Punto 1** :
  Primera frase clara explicando la idea principal.
  Segunda frase aportando precisión o un ejemplo concreto.
- **Tema / Punto 2** :
  Primera frase clara explicando la idea principal.
  Segunda frase aportando precisión o un ejemplo concreto.
- ... (4 a 7 puntos principales)

### 💡 Conclusión y a recordar
(La conclusión principal o el consejo práctico dado por el autor)`;
      }

      userPrompt = `Título: "${title}"
Canal: ${author}

${formatInstructions}

Transcripción:
"""
${safeTranscript}
"""`;
    } else if (lang === 'de') {
      systemPrompt = `Du bist ein KI-Experte für Zusammenfassung und Analyse von Videoinhalten.
Dein Ziel ist es, eine klare, natürliche, gut strukturierte und getreue Zusammenfassung auf DEUTSCH zu verfassen.
STILRICHTLINIEN:
- Natürlicher, direkter und ansprechender Stil: direkt auf den Punkt ohne überflüssige Füllwörter.
- Vermeide übermäßig lange Schachtelsätze, sorge für Klarheit.
- Verwende eine luftige Markdown-Formatierung mit Aufzählungspunkten und **fettgedruckten** Schlüsselwörtern.
- 100% getreu dem Transkript.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Erstelle eine kurze, prägnante Zusammenfassung im folgenden Format:
### ⚡ Kurzübersicht
(1 bis 2 Sätze, die das Thema und die Kernbotschaft zusammenfassen)

### 📌 Die wichtigsten Punkte
- **Punkt 1** : Wichtigste Information einfach zusammengefasst
- **Punkt 2** : Wichtigste Information einfach zusammengefasst
- **Punkt 3** : Wichtigste Information einfach zusammengefasst
- **Punkt 4** : Wichtigste Information einfach zusammengefasst
- **Punkt 5** : Wichtigste Information einfach zusammengefasst

### 💡 Das Wichtigste auf den Punkt
(Die Hauptaussage in einem klaren Satz)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Erstelle eine ausführliche Analyse im folgenden Format:
### 🎯 Überblick & Kontext
(Detaillierte Erläuterung der Hintergründe)

### 🔍 Tiefgehende Analyse
(Entwickle die verschiedenen Themen, Argumente und Beispiele strukturiert)

### 💡 Fazit & Praktische Ratschläge
(Was man sich merken sollte und abschließende Empfehlungen)`;
      } else {
        formatInstructions = `Erstelle eine strukturierte Zusammenfassung im folgenden Format:
### 🎯 In Kürze
(2 bis 3 Sätze, die das Hauptthema und den Zweck des Videos zusammenfassen)

### 🔑 Kernaussagen & Erkenntnisse
- **Thema / Punkt 1** :
  Erster klarer Satz zur Hauptidee.
  Zweiter Satz mit Details oder einem konkreten Beispiel.
- **Thema / Punkt 2** :
  Erster klarer Satz zur Hauptidee.
  Zweiter Satz mit Details oder einem konkreten Beispiel.
- ... (4 bis 7 Hauptpunkte)

### 💡 Fazit & Wichtigste Erkenntnis
(Das Fazit oder der praktische Rat des Autors)`;
      }

      userPrompt = `Titel: "${title}"
Kanal: ${author}

${formatInstructions}

Transkript:
"""
${safeTranscript}
"""`;
    } else if (lang === 'it') {
      systemPrompt = `Sei un assistente IA esperto nella sintesi e divulgazione di contenuti video.
Il tuo obiettivo è redigere un riassunto chiaro, naturale, ben strutturato e fedele in ITALIANO, indipendentemente dalla lingua originale del video.
REGOLE DI STILE:
- Stile naturale, diretto e incisivo: vai dritto al punto senza preamboli inutili.
- Evita frasi eccessivamente lunghe e complesse, prediligi la chiarezza e la scorrevolezza.
- Usa una formattazione Markdown ariosa con elenchi puntati e parole chiave in **Grassetto** all'inizio di ogni punto.
- Fedele al 100% alla trascrizione, senza alcuna allucinazione né estrapolazione.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Produci una sintesi breve, concisa e diretta nel formato seguente:
### ⚡ Sintesi Rapida
(1 o 2 frasi dirette che riassumono l'argomento e il messaggio principale)

### 📌 Punti Chiave Essenziali
- **Punto 1** : Informazione chiave riassunta in modo semplice
- **Punto 2** : Informazione chiave riassunta in modo semplice
- **Punto 3** : Informazione chiave riassunta in modo semplice
- **Punto 4** : Informazione chiave riassunta in modo semplice
- **Punto 5** : Informazione chiave riassunta in modo semplice

### 💡 L'essenziale da Ricordare
(Il messaggio principale in una frase chiara)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Produci un'analisi dettagliata nel formato seguente:
### 🎯 Panoramica & Contesto
(Spiegazione approfondita del contesto e delle problematiche)

### 🔍 Analisi Dettagliata
(Sviluppa i diversi temi, argomenti ed esempi trattati in modo strutturato)

### 💡 Conclusioni & Consigli Pratici
(Cosa ricordare, consigli applicabili e considerazioni finali)`;
      } else {
        formatInstructions = `Produci un riassunto strutturato nel formato seguente:
### 🎯 In Breve
(2 o 3 frasi che riassumono l'argomento principale e l'obiettivo del video)

### 🔑 Punti Chiave & Insegnamenti
- **Tema / Punto 1** :
  Prima frase chiara che spiega l'idea principale.
  Seconda frase che fornisce dettagli o un esempio concreto.
- **Tema / Punto 2** :
  Prima frase chiara che spiega l'idea principale.
  Seconda frase che fornisce dettagli o un esempio concreto.
- ... (da 4 a 7 punti chiave)

### 💡 Conclusione & Da Ricordare
(La conclusione principale o il consiglio pratico dato dall'autore)`;
      }

      userPrompt = `Titolo: "${title}"
Canale: ${author}

${formatInstructions}

Trascrizione:
"""
${safeTranscript}
"""`;
    } else if (lang === 'ru') {
      systemPrompt = `Ты — экспертный ИИ-ассистент по структурированию и краткому изложению видеоконтента.
Твоя цель — подготовить ясную, естественную, хорошо структурированную и точную сводку на РУССКОМ языке, независимо от исходного языка видео.
ПРАВИЛА СТИЛЯ:
- Живой, прямой и емкий стиль: прямо к сути без лишних вступительных слов.
- Избегай излишне длинных и запутанных предложений, обеспечивай ясность.
- Используй удобное форматирование Markdown со списками и **жирным шрифтом** в начале каждого пункта.
- На 100% точно по транскрипции, без выдумок и домыслов.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Подготовь краткую и емкую сводку в следующем формате:
### ⚡ Экспресс-сводка
(1-2 предложения, обобщающие главную тему и ключевую идею)

### 📌 Главные тезисы
- **Тезис 1** : Ключевая информация в простом изложении
- **Тезис 2** : Ключевая информация в простом изложении
- **Тезис 3** : Ключевая информация в простом изложении
- **Тезис 4** : Ключевая информация в простом изложении
- **Тезис 5** : Ключевая информация в простом изложении

### 💡 Главный вывод
(Основная идея в одном четком предложении)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Подготовь подробный разбор в следующем формате:
### 🎯 Обзор и контекст
(Глубокое объяснение предпосылок и проблематики)

### 🔍 Подробный анализ
(Последовательно раскрой ключевые темы, аргументы и примеры с понятными пунктами)

### 💡 Практические выводы и советы
(Главные уроки, применимые советы и заключительные мысли)`;
      } else {
        formatInstructions = `Подготовь структурированную сводку в следующем формате:
### 🎯 Коротко о главном
(2-3 предложения с описанием темы и цели видео)

### 🔑 Ключевые выводы и идеи
- **Тема / Пункт 1** :
  Первое ясное предложение, объясняющее основную идею.
  Второе предложение с деталями или конкретным примером.
- **Тема / Пункт 2** :
  Первое ясное предложение, объясняющее основную идею.
  Второе предложение с деталями или конкретным примером.
- ... (от 4 до 7 ключевых пунктов)

### 💡 Итог и главное напутствие
(Главный вывод или практический совет от автора)`;
      }

      userPrompt = `Название: "${title}"
Канал: ${author}

${formatInstructions}

Транскрипция:
"""
${safeTranscript}
"""`;
    } else if (lang === 'ja') {
      systemPrompt = `あなたは動画コンテンツの要約と解説を専門とする高度なAIアシスタントです。
元の動画の言語にかかわらず、明確で自然、よく構造化された忠実な日本語の要約を作成することがあなたの目的です。
スタイル規則:
- 自然で的確、かつ魅力的な文体: 冗長な挨拶や前置きを排し、要点から簡潔に記述する。
- 複雑で長すぎる文を避け、読みやすさと論理の流れを重視する。
- 箇条書きと各項目の先頭にある **太字** のキーワードを活用した、視認性の高いMarkdown形式にする。
- 文字起こしに100%忠実であり、推測やハルシネーション（幻覚）は含めない。`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `以下の形式で短く簡潔な要約を作成してください:
### ⚡ クイック要約
(動画の核心テーマとメインメッセージを要約した1〜2文)

### 📌 最重要ポイント
- **ポイント 1** : 核心情報をシンプルに要約
- **ポイント 2** : 核心情報をシンプルに要約
- **ポイント 3** : 核心情報をシンプルに要約
- **ポイント 4** : 核心情報をシンプルに要約
- **ポイント 5** : 核心情報をシンプルに要約

### 💡 最も重要なポイント
(明確な一文でのメインメッセージ)`;
      } else if (mode === 'detailed') {
        formatInstructions = `以下の形式で詳細な解説・分析を作成してください:
### 🎯 概要と背景
(背景、提起された課題やテーマの詳細な説明)

### 🔍 詳細分析
(主要なテーマ、議論、具体例、論拠を論理的な箇条書きで解説)

### 💡 実践的なアドバイスと結論
(学べる教訓、実践的なヒント、総括)`;
      } else {
        formatInstructions = `以下の形式で構造化された要約を作成してください:
### 🎯 要約（概要）
(動画の主要テーマと目的を説明する2〜3文)

### 🔑 主要ポイントと学び
- **テーマ / 項目 1** :
  メインアイデアを説明する明確な一文。
  詳細や具体例を補足する二文目。
- **テーマ / 項目 2** :
  メインアイデアを説明する明確な一文。
  詳細や具体例を補足する二文目。
- ... (4〜7つの主要ポイント)

### 💡 結論とまとめ
(著者の主な結論、または提示された実践的アドバイス)`;
      }

      userPrompt = `タイトル: "${title}"
チャンネル: ${author}

${formatInstructions}

文字起こし:
"""
${safeTranscript}
"""`;
    } else if (lang === 'zh') {
      systemPrompt = `你是一名精通视频内容提炼与深度总结的专业 AI 助理。
你的目标是用中文撰写一份清晰、自然、结构严谨且忠实于原意的优质总结，无论原始视频是什么语言。
风格规范：
- 自然、直击要点：摒弃客套废话与冗余铺垫，直奔核心主题。
- 避免冗长缠绕的复合长句，保证阅读节奏流畅明晰。
- 采用空行分明、排版清爽的 Markdown 格式，列表项开头使用 **加粗** 关键词。
- 100% 忠实于视频逐字稿，严禁虚构、臆测或无中生有。`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `请按照以下格式生成简明精炼的速览总结：
### ⚡ 核心速览
(用 1 到 2 句话直接概括核心议题与主旨信息)

### 📌 关键要点
- **要点 1** : 简明提炼核心信息
- **要点 2** : 简明提炼核心信息
- **要点 3** : 简明提炼核心信息
- **要点 4** : 简明提炼核心信息
- **要点 5** : 简明提炼核心信息

### 💡 一句话精髓
(用一句清晰有力的话总结最核心启示)`;
      } else if (mode === 'detailed') {
        formatInstructions = `请按照以下格式生成深度详尽的分析：
### 🎯 背景与全局概览
(深入解析背景、核心议题与动机)

### 🔍 深度主题剖析
(按逻辑拆解核心论点、具体案例、关键数据或发展步骤)

### 💡 实用建议与最终结论
(核心心得、可落地的实践建议与结语总结)`;
      } else {
        formatInstructions = `请按照以下格式生成结构化摘要：
### 🎯 简要概述
(用 2 到 3 句话概括视频的核心主题与目标)

### 🔑 核心要点与深度启示
- **主题 / 要点 1** :
  第一句清晰解释核心观点。
  第二句补充细节或具体案例。
- **主题 / 要点 2** :
  第一句清晰解释核心观点。
  第二句补充细节或具体案例。
- ... (列出 4 至 7 个核心要点)

### 💡 结论与实用心得
(作者的核心结论或给出的实用建议)`;
      }

      userPrompt = `标题: "${title}"
频道: ${author}

${formatInstructions}

视频逐字稿:
"""
${safeTranscript}
"""`;
    } else {
      // Français par défaut
      systemPrompt = `Tu es un assistant IA expert en synthèse et vulgarisation de contenus vidéo.
Ton objectif est de rédiger un résumé clair, naturel, bien structuré et fidèle en FRANÇAIS, même si la transcription originale est dans une autre langue.
RÈGLES DE STYLE :
- Style naturel, direct et percutant : va droit à l'essentiel sans verbiage superflu.
- Évite les phrases excessivement longues et complexes, favorise la clarté et la fluidité.
- Utilise une mise en page Markdown très aérée avec des listes à puces et des mots-clés en **Gras** au début de chaque point.
- 100% fidèle à la transcription, sans hallucination ni extrapolation.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Produis une synthèse courte, concise et directe au format suivant :
### ⚡ Synthèse Express
(1 ou 2 phrases résumant le sujet et l'idée maîtresse)

### 📌 Les points essentiels
- **Point 1** : L'information clé résumée simplement
- **Point 2** : L'information clé résumée simplement
- **Point 3** : L'information clé résumée simplement
- **Point 4** : L'information clé résumée simplement
- **Point 5** : L'information clé résumée simplement

### 💡 L'essentiel à retenir
(Le message principal en une phrase claire)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Produis une analyse détaillée au format suivant :
### 🎯 Vue d'ensemble & Contexte
(Explication détaillée des enjeux)

### 🔍 Analyse approfondie
(Développe les différents thèmes, concepts, exemples ou arguments abordés de façon structurée)

### 💡 Conclusions & Enseignements pratiques
(Ce qu'il faut retenir, conseils applicables et réflexions finales)`;
      } else {
        formatInstructions = `Produis un résumé structuré au format suivant :
### 🎯 En bref
(2 à 3 phrases résumant le sujet principal et l'objectif de la vidéo)

### 🔑 Points clés & Enseignements
- **Thème / Sujet 1** :
  Première phrase claire expliquant l'idée principale.
  Deuxième phrase apportant une précision ou un exemple concret.
- **Thème / Sujet 2** :
  Première phrase claire expliquant l'idée principale.
  Deuxième phrase apportant une précision ou un exemple concret.
- ... (4 à 7 points majeurs)

### 💡 Conclusion & À retenir
(La conclusion principale ou le conseil pratique donné par l'auteur)`;
      }

      userPrompt = `Titre : "${title}"
Chaîne : ${author}

${formatInstructions}

Transcription :
"""
${safeTranscript}
"""`;
    }

    if (customPrompt && customPrompt.trim()) {
      systemPrompt += `\n\nDIRECTIVES ADDITIONNELLES DE L'UTILISATEUR :\n${customPrompt.trim()}`;
    }

    return { systemPrompt, userPrompt };
  }

  function parsePoint(rawText) {
    // Détecter un titre/label au début : soit **Titre** :, soit Titre :
    const colonMatch = rawText.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\s'\-_–—]{2,60})\s*:\s*(.*)$/);
    if (colonMatch) {
      const rawTitle = colonMatch[1].trim();
      const cleanTitle = rawTitle.replace(/^\*\*|\*\*$/g, '').trim();
      const body = colonMatch[2].trim();
      const sentences = splitSentences(body);
      return {
        hasTitle: true,
        title: cleanTitle + ' :',
        sentences: sentences.length > 0 ? sentences : [body]
      };
    }
    return {
      hasTitle: false,
      title: '',
      sentences: splitSentences(rawText)
    };
  }

  function splitSentences(text) {
    if (!text) return [];
    // Découpe après un point, point d'exclamation ou point d'interrogation suivi d'un espace et d'une majuscule ou guillemet
    const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ß«"'])/u);
    return parts.map(s => s.trim()).filter(Boolean);
  }

  function renderListItem(rawText) {
    const parsed = parsePoint(rawText);
    if (parsed.hasTitle) {
      const sentenceDivs = parsed.sentences
        .map(s => `<div class="yt-ai-point-sentence">${formatInline(s)}</div>`)
        .join('');
      return `
        <li class="yt-ai-point-item">
          <div class="yt-ai-point-title"><strong>${formatInline(parsed.title)}</strong></div>
          <div class="yt-ai-point-body">${sentenceDivs}</div>
        </li>
      `;
    } else {
      const sentenceDivs = parsed.sentences
        .map(s => `<div class="yt-ai-point-sentence">${formatInline(s)}</div>`)
        .join('');
      return `
        <li class="yt-ai-point-item">
          <div class="yt-ai-point-body" style="padding-left: 14px;">${sentenceDivs}</div>
        </li>
      `;
    }
  }

  function renderMarkdown(mdText, container) {
    if (!mdText) {
      container.innerHTML = '';
      return;
    }

    const lines = mdText.split('\n');
    let html = '';
    let inUl = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (line.startsWith('### ')) {
        if (inUl) { html += '</ul>'; inUl = false; }
        html += `<h3>${formatInline(line.slice(4))}</h3>`;
        continue;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        if (inUl) { html += '</ul>'; inUl = false; }
        html += `<h2>${formatInline(line.replace(/^#+\s*/, ''))}</h2>`;
        continue;
      }

      const ulMatch = line.match(/^[-*•]\s+(.*)$/);
      if (ulMatch) {
        if (!inUl) { html += '<ul class="yt-ai-points-list">'; inUl = true; }
        html += renderListItem(ulMatch[1]);
        continue;
      }

      if (inUl) { html += '</ul>'; inUl = false; }

      const trimmed = line.trim();
      if (trimmed.length > 0) {
        const pointMatch = trimmed.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\s'\-_–—]{2,60})\s*:\s+(.*[.!?].*)$/);
        if (pointMatch) {
          html += `<ul class="yt-ai-points-list">${renderListItem(trimmed)}</ul>`;
        } else {
          html += `<p>${formatInline(trimmed)}</p>`;
        }
      }
    }

    if (inUl) html += '</ul>';
    container.innerHTML = html;
  }

  function formatInline(text) {
    let escaped = escapeHtml(text);
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Rendre les timestamps (ex: 01:23, 12:45, 1:05:30) cliquables pour sauter dans la vidéo
    escaped = escaped.replace(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g, (match, h, m, s) => {
      const hours = h ? parseInt(h, 10) : 0;
      const minutes = parseInt(m, 10);
      const seconds = parseInt(s, 10);
      const totalSec = hours * 3600 + minutes * 60 + seconds;
      return `<a href="javascript:void(0)" class="yt-ai-timestamp-link" data-time="${totalSec}" title="Aller à ${match}">⏱️ ${match}</a>`;
    });
    return escaped;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function copyToClipboard(text, btn) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✅ Copié !';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  }

  function handleDownload() {
    if (!fullSummaryMarkdown) return;
    const meta = getVideoMetadata();
    const cleanTitle = (meta.title || 'resume_youtube').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
    const blob = new Blob([fullSummaryMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_resume.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadTxt() {
    if (!fullSummaryMarkdown) return;
    const meta = getVideoMetadata();
    const cleanTitle = (meta.title || 'resume_youtube').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
    const plainText = fullSummaryMarkdown.replace(/[#*`_~]/g, '');
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_resume.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadJson() {
    if (!fullSummaryMarkdown) return;
    const meta = getVideoMetadata();
    const cleanTitle = (meta.title || 'resume_youtube').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
    const exportData = {
      title: meta.title || '',
      author: meta.author || '',
      url: window.location.href,
      exportedAt: new Date().toISOString(),
      provider: currentProvider,
      model: selectedModel,
      language: currentLang,
      summary: fullSummaryMarkdown,
      transcriptWordsCount: cachedTranscript.segments ? cachedTranscript.fullText.split(/\s+/).filter(Boolean).length : 0
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleTestWhisper() {
    const url = localWhisperUrl || document.getElementById('ytAiWhisperUrlInput')?.value.trim();
    const t = I18N[currentLang] || I18N.en;
    if (!url) {
      showStatusBanner(t.whisperUrlPlaceholder ? `Please specify Whisper URL (${t.whisperUrlPlaceholder})` : "Please enter Whisper server URL", true);
      return;
    }
    showStatusBanner(`Testing connection to ${url}...`, false);
    try {
      const res = await fetch(url, { method: 'POST' }).catch(e => e);
      if (res && (res.status === 400 || res.status === 422 || res.status === 200 || res.ok)) {
        showStatusBanner(`✅ Whisper STT server online & ready (HTTP ${res.status})!`, false);
      } else if (res && res.status === 404) {
        showStatusBanner(`❌ Error 404: Whisper endpoint not found at this URL.`, true);
      } else {
        showStatusBanner(`⚠️ Whisper server replied: ${res.status || 'Connection refused'}`, true);
      }
    } catch (e) {
      showStatusBanner(`❌ Connection failed: ${e.message}`, true);
    }
  }

  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'TOGGLE_INPAGE_BANNER') {
      setExpanded(true);
      sendResponse({ status: 'OK' });
    }
  });

})();
