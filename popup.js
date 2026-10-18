/**
 * popup.js - YouTube AI Summarizer
 * Gestion de l'URL LM Studio (ex: 192.168.56.1:1234 / localhost),
 * listing des modèles Qwen, extraction YouTube et streaming IA.
 */

// Éléments du DOM
const serverStatusBadge = document.getElementById('serverStatusBadge');
const serverStatusText = document.getElementById('serverStatusText');
const modelsCountBadge = document.getElementById('modelsCountBadge');

const serverUrlSelect = document.getElementById('serverUrlSelect');
const customUrlWrapper = document.getElementById('customUrlWrapper');
const serverUrlCustomInput = document.getElementById('serverUrlCustomInput');
const applyCustomUrlBtn = document.getElementById('applyCustomUrlBtn');
const urlPills = document.querySelectorAll('.url-pill');

const modelSelect = document.getElementById('modelSelect');
const refreshModelsBtn = document.getElementById('refreshModelsBtn');
const testModelBtn = document.getElementById('testModelBtn');
const modelTestFeedback = document.getElementById('modelTestFeedback');

const notYoutubeCard = document.getElementById('notYoutubeCard');
const videoInfoCard = document.getElementById('videoInfoCard');
const videoTitleEl = document.getElementById('videoTitle');
const videoAuthorEl = document.getElementById('videoAuthor');
const controlsSection = document.getElementById('controlsSection');
const langSelect = document.getElementById('langSelect');
const modeSelect = document.getElementById('modeSelect');
const summarizeBtn = document.getElementById('summarizeBtn');
const summarizeBtnText = document.getElementById('summarizeBtnText');

const statusAlert = document.getElementById('statusAlert');
const statusMessage = document.getElementById('statusMessage');
const resultsSection = document.getElementById('resultsSection');
const reasoningDetails = document.getElementById('reasoningDetails');
const reasoningStatus = document.getElementById('reasoningStatus');
const reasoningOutput = document.getElementById('reasoningOutput');
const tabSummaryBtn = document.getElementById('tabSummaryBtn');
const tabTranscriptBtn = document.getElementById('tabTranscriptBtn');
const tabSummaryContent = document.getElementById('tabSummaryContent');
const tabTranscriptContent = document.getElementById('tabTranscriptContent');
const summaryOutput = document.getElementById('summaryOutput');
const transcriptOutput = document.getElementById('transcriptOutput');
const transcriptWordCount = document.getElementById('transcriptWordCount');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// État de l'application
let currentServerUrl = 'http://192.168.56.1:1234';
let currentTab = null;
let currentVideoData = null;
let currentSummaryMarkdown = '';
let currentReasoningText = '';
let currentTranscriptText = '';
let isSummarizing = false;

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedSettings();
  setupEventListeners();
  // Vérification simultanée
  await Promise.all([
    checkActiveTab(),
    checkLMStudioConnection()
  ]);
});

/**
 * Charge les réglages persistés
 */
async function loadSavedSettings() {
  if (chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get(['serverUrl', 'targetLang', 'summaryMode', 'selectedModel']);
    
    // Déterminer l'URL serveur
    if (data.serverUrl) {
      currentServerUrl = normalizeUrl(data.serverUrl);
    } else {
      currentServerUrl = 'http://192.168.56.1:1234';
    }
    syncServerUrlUI(currentServerUrl);

    if (data.targetLang) {
      langSelect.value = data.targetLang;
      applyPopupLanguage(data.targetLang);
    } else {
      langSelect.value = 'en';
      applyPopupLanguage('en');
    }
    if (data.summaryMode) modeSelect.value = data.summaryMode;
    if (data.selectedModel) {
      modelSelect.dataset.savedModel = data.selectedModel;
    }
  }
}

const POPUP_I18N = {
  fr: {
    summarizeBtn: 'Résumer cette vidéo',
    langLabel: 'Langue de sortie :',
    formatLabel: 'Format du résumé :',
    formatStandard: '📌 Naturelle & équilibrée',
    formatQuick: '⚡ Courte & concise',
    formatDetailed: '📝 Détaillée & approfondie',
    tabSummary: '📝 Résumé IA',
    tabTranscript: '📜 Transcription',
    words: 'mots',
    copy: '📋 Copier',
    download: '💾 Sauvegarder .md',
    openBanner: 'Ouvrir le panneau sous la vidéo'
  },
  en: {
    summarizeBtn: 'Summarize video',
    langLabel: 'Output Language:',
    formatLabel: 'Summary Format:',
    formatStandard: '📌 Natural & balanced',
    formatQuick: '⚡ Short & concise',
    formatDetailed: '📝 Detailed & in-depth',
    tabSummary: '📝 AI Summary',
    tabTranscript: '📜 Transcript',
    words: 'words',
    copy: '📋 Copy',
    download: '💾 Save .md',
    openBanner: 'Open in-page banner'
  },
  es: {
    summarizeBtn: 'Resumir este vídeo',
    langLabel: 'Idioma de salida:',
    formatLabel: 'Formato del resumen:',
    formatStandard: '📌 Natural y equilibrado',
    formatQuick: '⚡ Corto y conciso',
    formatDetailed: '📝 Detallado y profundo',
    tabSummary: '📝 Resumen IA',
    tabTranscript: '📜 Transcripción',
    words: 'palabras',
    copy: '📋 Copiar',
    download: '💾 Guardar .md',
    openBanner: 'Abrir panel en la página'
  },
  de: {
    summarizeBtn: 'Video zusammenfassen',
    langLabel: 'Ausgabesprache:',
    formatLabel: 'Zusammenfassungsformat:',
    formatStandard: '📌 Natürlich & ausgewogen',
    formatQuick: '⚡ Kurz & prägnant',
    formatDetailed: '📝 Détailliert & gründlich',
    tabSummary: '📝 KI-Zusammenfassung',
    tabTranscript: '📜 Transkript',
    words: 'Wörter',
    copy: '📋 Kopieren',
    download: '💾 Als .md speichern',
    openBanner: 'Unter dem Video öffnen'
  },
  it: {
    summarizeBtn: 'Riassumi questo video',
    langLabel: 'Lingua di output:',
    formatLabel: 'Formato del riassunto:',
    formatStandard: '📌 Naturale & bilanciato',
    formatQuick: '⚡ Breve & conciso',
    formatDetailed: '📝 Dettagliato & approfondito',
    tabSummary: '📝 Riassunto IA',
    tabTranscript: '📜 Trascrizione',
    words: 'parole',
    copy: '📋 Copia',
    download: '💾 Salva .md',
    openBanner: 'Apri pannello sotto il video'
  },
  ru: {
    summarizeBtn: 'Создать сводку',
    langLabel: 'Язык вывода:',
    formatLabel: 'Формат сводки:',
    formatStandard: '📌 Естественный & сбалансированный',
    formatQuick: '⚡ Краткий & емкий',
    formatDetailed: '📝 Подробный & углубленный',
    tabSummary: '📝 ИИ-Сводка',
    tabTranscript: '📜 Транскрипция',
    words: 'слов',
    copy: '📋 Скопировать',
    download: '💾 Сохранить .md',
    openBanner: 'Открыть панель под видео'
  },
  ja: {
    summarizeBtn: 'この動画を要約する',
    langLabel: '出力言語:',
    formatLabel: '要約フォーマット:',
    formatStandard: '📌 自然でバランスの良い構成',
    formatQuick: '⚡ 簡潔・要点重視',
    formatDetailed: '📝 詳細・徹底解説',
    tabSummary: '📝 AI要約',
    tabTranscript: '📜 文字起こし',
    words: '語',
    copy: '📋 コピー',
    download: '💾 .md 保存',
    openBanner: '動画の下にパネルを開く'
  },
  zh: {
    summarizeBtn: '总结此视频',
    langLabel: '输出语言:',
    formatLabel: '摘要格式:',
    formatStandard: '📌 自然均衡',
    formatQuick: '⚡ 短小精炼',
    formatDetailed: '📝 详细深入',
    tabSummary: '📝 AI 摘要',
    tabTranscript: '📜 逐字稿',
    words: '字',
    copy: '📋 复制',
    download: '💾 保存 .md',
    openBanner: '在视频下方打开面板'
  }
};

function applyPopupLanguage(lang) {
  const t = POPUP_I18N[lang] || POPUP_I18N.en;
  if (summarizeBtnText && !isSummarizing) summarizeBtnText.textContent = t.summarizeBtn;
  const langLabelEl = document.querySelector('label[for="langSelect"]');
  if (langLabelEl) langLabelEl.textContent = t.langLabel;
  const formatLabelEl = document.querySelector('label[for="modeSelect"]');
  if (formatLabelEl) formatLabelEl.textContent = t.formatLabel;

  if (modeSelect) {
    const optStd = modeSelect.querySelector('option[value="standard"]');
    const optQuick = modeSelect.querySelector('option[value="quick"]');
    const optDetailed = modeSelect.querySelector('option[value="detailed"]');
    if (optStd) optStd.textContent = t.formatStandard;
    if (optQuick) optQuick.textContent = t.formatQuick;
    if (optDetailed) optDetailed.textContent = t.formatDetailed;
  }

  if (tabSummaryBtn) tabSummaryBtn.textContent = t.tabSummary;
  if (tabTranscriptBtn) {
    const count = transcriptWordCount ? transcriptWordCount.textContent : '0';
    tabTranscriptBtn.innerHTML = `${t.tabTranscript} (<span id="transcriptWordCount">${count}</span> ${t.words})`;
  }
  if (copyBtn) copyBtn.textContent = t.copy;
  if (downloadBtn) downloadBtn.textContent = t.download;

  const openBannerBtn = document.getElementById('openInPageBannerBtn');
  if (openBannerBtn) openBannerBtn.textContent = t.openBanner;
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Sélection d'URL via dropdown
  serverUrlSelect.addEventListener('change', () => {
    if (serverUrlSelect.value === 'custom') {
      customUrlWrapper.classList.remove('hidden');
      serverUrlCustomInput.value = currentServerUrl;
      serverUrlCustomInput.focus();
    } else {
      customUrlWrapper.classList.add('hidden');
      setServerUrl(serverUrlSelect.value);
    }
  });

  // Validation d'URL personnalisée
  applyCustomUrlBtn.addEventListener('click', () => {
    const custom = serverUrlCustomInput.value.trim();
    if (custom) {
      setServerUrl(custom);
    }
  });

  serverUrlCustomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyCustomUrlBtn.click();
  });

  // Clic sur les raccourcis pills d'URL
  urlPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const url = pill.getAttribute('data-url');
      if (url) {
        setServerUrl(url);
      }
    });
  });

  // LM Studio & Modèles
  serverStatusBadge.addEventListener('click', () => checkLMStudioConnection(true));
  refreshModelsBtn.addEventListener('click', () => checkLMStudioConnection(true));
  testModelBtn.addEventListener('click', handleTestModel);

  modelSelect.addEventListener('change', () => {
    saveSetting('selectedModel', modelSelect.value);
    showTestFeedback(`Modèle actif : ${modelSelect.value}`, false);
  });

  // Options de résumé
  langSelect.addEventListener('change', () => {
    saveSetting('targetLang', langSelect.value);
    applyPopupLanguage(langSelect.value);
  });
  modeSelect.addEventListener('change', () => saveSetting('summaryMode', modeSelect.value));

  // Bouton de résumé
  summarizeBtn.addEventListener('click', handleSummarizeClick);

  // Onglets
  tabSummaryBtn.addEventListener('click', () => switchTab('summary'));
  tabTranscriptBtn.addEventListener('click', () => switchTab('transcript'));

  // Actions
  copyBtn.addEventListener('click', handleCopySummary);
  downloadBtn.addEventListener('click', handleDownloadSummary);

  const openInPageBannerBtn = document.getElementById('openInPageBannerBtn');
  openInPageBannerBtn?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_INPAGE_BANNER' }, () => {
        window.close();
      });
    }
  });
}

function normalizeUrl(rawUrl) {
  let url = rawUrl.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url;
}

function setServerUrl(newUrl) {
  currentServerUrl = normalizeUrl(newUrl);
  syncServerUrlUI(currentServerUrl);
  saveSetting('serverUrl', currentServerUrl);
  checkLMStudioConnection(true);
}

function syncServerUrlUI(url) {
  // Ajuster le dropdown
  let found = false;
  for (let opt of serverUrlSelect.options) {
    if (opt.value === url) {
      serverUrlSelect.value = url;
      found = true;
      break;
    }
  }

  if (!found) {
    serverUrlSelect.value = 'custom';
    customUrlWrapper.classList.remove('hidden');
    serverUrlCustomInput.value = url;
  } else {
    customUrlWrapper.classList.add('hidden');
  }

  // Mettre à jour l'état visuel des pills
  urlPills.forEach(pill => {
    if (pill.getAttribute('data-url') === url) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function saveSetting(key, value) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [key]: value });
  }
}

/**
 * Vérification de la connexion et listing des modèles
 * Tente d'abord l'URL actuelle, puis essaye automatiquement les adresses locales courantes si échec
 */
async function checkLMStudioConnection(showVisualFeedback = false) {
  updateServerBadge('checking', 'Connexion...');
  modelsCountBadge.textContent = 'Connexion...';
  refreshModelsBtn.style.transform = 'rotate(180deg)';

  const candidateUrls = [
    currentServerUrl,
    'http://192.168.56.1:1234',
    'http://localhost:1234',
    'http://127.0.0.1:1234'
  ];
  // Dédupliquer les URLs
  const uniqueUrls = [...new Set(candidateUrls)];

  let connectedUrl = null;
  let models = [];
  let latencyMs = 0;

  for (const url of uniqueUrls) {
    try {
      const startTime = performance.now();
      const res = await fetch(`${url}/v1/models`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        models = Array.isArray(data.data) ? data.data : [];
        latencyMs = Math.round(performance.now() - startTime);
        connectedUrl = url;
        break; // Succès !
      }
    } catch (e) {
      // Échec sur cette URL, tenter la suivante
    }
  }

  refreshModelsBtn.style.transform = 'none';

  if (connectedUrl) {
    if (connectedUrl !== currentServerUrl) {
      currentServerUrl = connectedUrl;
      syncServerUrlUI(connectedUrl);
      saveSetting('serverUrl', connectedUrl);
    }

    updateServerBadge('online', `En ligne (${latencyMs}ms)`);
    modelsCountBadge.textContent = `${models.length} modèles`;
    populateModelSelect(models);

    if (showVisualFeedback) {
      showTestFeedback(`Connecté à ${connectedUrl} (${models.length} modèles détectés)`, false);
    }
  } else {
    updateServerBadge('offline', 'Hors-ligne (port 1234)');
    modelsCountBadge.textContent = 'Inaccessible';
    populateModelSelect([]);

    if (showVisualFeedback) {
      showTestFeedback(`Impossible de joindre LM Studio sur ${currentServerUrl}. Vérifiez que le serveur est démarré.`, true);
    }
  }
}

function updateServerBadge(state, text) {
  serverStatusBadge.className = `status-badge ${state}`;
  if (serverStatusText) serverStatusText.textContent = text;
}

/**
 * Remplit le sélecteur avec les modèles disponibles et met en avant Qwen
 */
function populateModelSelect(models) {
  modelSelect.innerHTML = '';

  if (models.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Aucun modèle détecté (démarrer LM Studio)';
    modelSelect.appendChild(opt);
    return;
  }

  const qwenModels = [];
  const otherModels = [];

  models.forEach(m => {
    if (m.id.includes('embedding') || m.id.includes('embed')) return;
    
    if (m.id.toLowerCase().includes('qwen')) {
      qwenModels.push(m);
    } else {
      otherModels.push(m);
    }
  });

  const savedModel = modelSelect.dataset.savedModel;
  let selected = false;

  // Groupe Qwen
  if (qwenModels.length > 0) {
    const optGroupQwen = document.createElement('optgroup');
    optGroupQwen.label = '⭐ Modèles Qwen recommandés';
    qwenModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `⭐ ${m.id}`;
      if (savedModel && m.id === savedModel) {
        opt.selected = true;
        selected = true;
      }
      optGroupQwen.appendChild(opt);
    });
    modelSelect.appendChild(optGroupQwen);
  }

  // Autres modèles
  if (otherModels.length > 0) {
    const optGroupOther = document.createElement('optgroup');
    optGroupOther.label = 'Autres modèles disponibles';
    otherModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.id;
      if (savedModel && m.id === savedModel) {
        opt.selected = true;
        selected = true;
      }
      optGroupOther.appendChild(opt);
    });
    modelSelect.appendChild(optGroupOther);
  }

  // Sélection par défaut
  if (!selected && modelSelect.options.length > 0) {
    modelSelect.selectedIndex = 0;
    saveSetting('selectedModel', modelSelect.value);
  }
}

/**
 * Test rapide du modèle sélectionné
 */
async function handleTestModel() {
  const modelId = modelSelect.value;
  if (!modelId) {
    showTestFeedback('Aucun modèle sélectionné.', true);
    return;
  }

  testModelBtn.disabled = true;
  testModelBtn.textContent = '⏳ ...';
  showTestFeedback(`Test ping vers ${currentServerUrl} (${modelId})...`, false);

  try {
    const startTime = performance.now();
    const res = await fetch(`${currentServerUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Reponds: OK' }],
        max_tokens: 5
      })
    });

    const elapsed = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }

    showTestFeedback(`✅ Modèle "${modelId}" opérationnel (${elapsed}ms) !`, false);
  } catch (err) {
    showTestFeedback(`❌ Échec du test : ${err.message}`, true);
  } finally {
    testModelBtn.disabled = false;
    testModelBtn.textContent = '⚡ Tester';
  }
}

function showTestFeedback(message, isError) {
  modelTestFeedback.textContent = message;
  modelTestFeedback.className = `test-feedback ${isError ? 'error' : ''}`;
  modelTestFeedback.classList.remove('hidden');

  setTimeout(() => {
    if (modelTestFeedback.textContent === message) {
      modelTestFeedback.classList.add('hidden');
    }
  }, 5000);
}

/**
 * Vérifie l'onglet actif et configure la vue YouTube
 */
async function checkActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url || !isYouTubeWatchUrl(tab.url)) {
    notYoutubeCard.classList.remove('hidden');
    videoInfoCard.classList.add('hidden');
    summarizeBtn.disabled = true;
    summarizeBtnText.textContent = 'Ouvrez une vidéo YouTube';
    return;
  }

  // C'est une vidéo YouTube valide
  notYoutubeCard.classList.add('hidden');
  videoInfoCard.classList.remove('hidden');
  summarizeBtn.disabled = false;
  summarizeBtnText.textContent = 'Résumer cette vidéo';

  const rawTitle = tab.title ? tab.title.replace(' - YouTube', '').trim() : 'Vidéo YouTube';
  videoTitleEl.textContent = rawTitle;
  videoAuthorEl.textContent = 'Détection de la chaîne...';

  try {
    const meta = await executeInMainWorld(tab.id, () => {
      const player = document.getElementById('movie_player');
      const response = (typeof player?.getPlayerResponse === 'function')
        ? player.getPlayerResponse()
        : window.ytInitialPlayerResponse;

      return {
        title: response?.videoDetails?.title || document.title.replace(' - YouTube', '').trim(),
        author: response?.videoDetails?.author || ''
      };
    });

    if (meta && meta.title) {
      videoTitleEl.textContent = meta.title;
      videoAuthorEl.textContent = meta.author ? `Par ${meta.author}` : 'Chaîne YouTube';
    }
  } catch (e) {
    console.warn('Métadonnées directes non disponibles:', e);
  }
}

function isYouTubeWatchUrl(urlString) {
  try {
    const url = new URL(urlString);
    return (
      (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) &&
      url.pathname === '/watch' &&
      url.searchParams.has('v')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Lance l'extraction et le résumé
 */
async function handleSummarizeClick() {
  if (isSummarizing || !currentTab || !currentTab.id) return;

  const modelId = modelSelect.value;
  if (!modelId) {
    showTestFeedback('Veuillez sélectionner un modèle LM Studio valide.', true);
    return;
  }

  const targetLang = langSelect.value;
  const summaryMode = modeSelect.value;

  isSummarizing = true;
  setLoadingState(true, '🔍 Extraction de la transcription YouTube...');

  try {
    const transcriptData = await extractTranscriptWithFallbacks(currentTab.id, targetLang);

    if (!transcriptData || !transcriptData.success || !transcriptData.fullText) {
      throw new Error(transcriptData?.error || "Impossible de récupérer la transcription de cette vidéo.");
    }

    currentVideoData = transcriptData;
    currentTranscriptText = transcriptData.fullText;
    const wordsCount = transcriptData.fullText.trim().split(/\s+/).length;
    transcriptWordCount.textContent = wordsCount.toLocaleString('fr-FR');
    transcriptOutput.textContent = formatTranscriptOutput(transcriptData.segments || transcriptData.fullText);

    setLoadingState(true, `⚡ Génération avec ${modelId} (${wordsCount} mots)...`);

    resultsSection.classList.remove('hidden');
    switchTab('summary');
    summaryOutput.innerHTML = '';
    summaryOutput.classList.add('typing-cursor');
    reasoningDetails.classList.add('hidden');
    reasoningOutput.textContent = '';
    currentSummaryMarkdown = '';
    currentReasoningText = '';

    await streamSummaryFromLMStudio(currentServerUrl, modelId, transcriptData, targetLang, summaryMode);

  } catch (error) {
    console.error('Erreur:', error);
    showStatusMessage(`❌ ${error.message}`, false);
    summaryOutput.innerHTML = `
      <div style="color: #ff7b72; padding: 12px; background: rgba(255,123,114,0.1); border-radius: 6px; font-size: 12px;">
        <strong>Erreur :</strong> ${escapeHtml(error.message)}
        <div style="font-size: 11px; margin-top: 6px; color: #8b949e;">
          - Serveur cible : <code>${escapeHtml(currentServerUrl)}</code><br>
          - Modèle : <code>${escapeHtml(modelId)}</code><br>
          - Assurez-vous que la vidéo possède des sous-titres/transcription sur YouTube.
        </div>
      </div>
    `;
    resultsSection.classList.remove('hidden');
  } finally {
    isSummarizing = false;
    setLoadingState(false);
    summaryOutput.classList.remove('typing-cursor');
  }
}

/**
 * Extraction robuste de la transcription
 */
async function extractTranscriptWithFallbacks(tabId, preferredLang) {
  // Méthode 1 : MAIN World API Player
  try {
    const mainWorldResult = await executeInMainWorld(tabId, async (lang) => {
      try {
        const player = document.getElementById('movie_player');
        const playerResponse = (typeof player?.getPlayerResponse === 'function')
          ? player.getPlayerResponse()
          : window.ytInitialPlayerResponse;

        const title = playerResponse?.videoDetails?.title || document.title.replace(' - YouTube', '').trim();
        const author = playerResponse?.videoDetails?.author || '';
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (captionTracks && captionTracks.length > 0) {
          let track = captionTracks.find(t => t.languageCode === lang);
          if (!track) track = captionTracks.find(t => t.languageCode?.startsWith(lang));
          if (!track) track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
          if (!track) track = captionTracks[0];

          if (track && track.baseUrl) {
            const resp = await fetch(track.baseUrl);
            const xml = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            const items = Array.from(doc.querySelectorAll('text'));

            if (items.length > 0) {
              const segments = items.map(node => {
                const startSec = parseFloat(node.getAttribute('start') || '0');
                const m = Math.floor(startSec / 60);
                const s = Math.floor(startSec % 60).toString().padStart(2, '0');
                let txt = node.textContent || '';
                txt = txt
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/\n/g, ' ')
                  .trim();
                return { timestamp: `${m}:${s}`, text: txt };
              }).filter(s => s.text.length > 0);

              return {
                success: true,
                title,
                author,
                source: 'PLAYER_API',
                trackName: track.name?.simpleText || track.languageCode,
                segments,
                fullText: segments.map(s => s.text).join(' ')
              };
            }
          }
        }
        return { success: false, title, author };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, preferredLang);

    if (mainWorldResult && mainWorldResult.success && mainWorldResult.fullText) {
      return mainWorldResult;
    }
  } catch (err) {
    console.warn('Fallback DOM suite à erreur MAIN world:', err);
  }

  // Méthode 2 : Content Script DOM fallback
  try {
    const domResult = await chrome.tabs.sendMessage(tabId, {
      action: 'EXTRACT_TRANSCRIPT',
      lang: preferredLang
    });

    if (domResult && domResult.success) {
      return domResult;
    }
  } catch (err) {
    console.warn('Content script non joignable:', err);
  }

  return {
    success: false,
    error: "Aucune transcription trouvée pour cette vidéo. Assurez-vous que les sous-titres sont activés par YouTube."
  };
}

async function executeInMainWorld(tabId, func, ...args) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func,
    args
  });
  return results?.[0]?.result;
}

/**
 * Streaming avec gestion de reasoning_content (Qwen 3.5 / DeepSeek)
 */
async function streamSummaryFromLMStudio(serverUrl, modelId, videoData, targetLang, mode) {
  const { systemPrompt, userPrompt } = buildPrompts(videoData, targetLang, mode);

  const response = await fetch(`${serverUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur LM Studio (${response.status}) : ${errText || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta || {};

          // Réflexion (Thinking)
          if (delta.reasoning_content) {
            currentReasoningText += delta.reasoning_content;
            reasoningDetails.classList.remove('hidden');
            reasoningOutput.textContent = currentReasoningText;
            reasoningStatus.textContent = 'réflexion...';
            reasoningDetails.open = true;
          }

          // Contenu du résumé
          if (delta.content) {
            if (currentReasoningText && reasoningStatus.textContent === 'réflexion...') {
              reasoningStatus.textContent = 'terminée';
              reasoningDetails.open = false;
            }
            currentSummaryMarkdown += delta.content;
            renderMarkdown(currentSummaryMarkdown, summaryOutput);
            tabSummaryContent.scrollTop = tabSummaryContent.scrollHeight;
          }
        } catch (e) {
          // Fragment ignoré
        }
      }
    }
  }
}

/**
 * Construit les invites selon la langue et le format
 */
function buildPrompts(videoData, lang, mode) {
  let transcript = videoData.fullText;
  const MAX_CHARS = 35000;
  if (transcript.length > MAX_CHARS) {
    transcript = transcript.slice(0, MAX_CHARS) + "\n\n[... Transcription tronquée pour respecter la fenêtre de contexte ...]";
  }

  let systemPrompt = '';
  let userPrompt = '';

  if (lang === 'en') {
    systemPrompt = `You are an elite AI assistant specializing in video content summarization.
Your goal is to produce a punchy, structured, and faithful summary in ENGLISH, regardless of the original video language.
Rules :
- Write EXCLUSIVELY in English.
- Stay accurate to the transcript, with zero hallucinations.
- Use neat Markdown formatting with bullet points and bold keywords.`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `Produce a quick recap in this format:
### ⚡ Quick Takeaway
(2 sentences summarizing the core idea)

### 📌 Top 5 Highlights
- **Highlight 1**: Core information simply summarized
- **Highlight 2**: Core information simply summarized
- **Highlight 3**: Core information simply summarized
- **Highlight 4**: Core information simply summarized
- **Highlight 5**: Core information simply summarized`;
    } else if (mode === 'detailed') {
      formatInstructions = `Produce a comprehensive breakdown in this format:
### 🎯 Overview & Context
(In-depth explanation of the topic)

### 🔍 Detailed Analysis
(Structure by themes, arguments, key examples, or steps)

### 💡 Conclusion & Actionable Advice
(Core lessons and takeaways)`;
    } else {
      formatInstructions = `Produce a structured summary in this format:
### 🎯 Overview
(2 to 3 sentences summarizing the topic and goal)

### 🔑 Key Takeaways & Highlights
- **Topic 1**: Concise explanation...
- **Topic 2**: Concise explanation...
- ... (4 to 7 key takeaways)

### 💡 Core Conclusion & Takeaway
(Main conclusion or actionable advice)`;
    }

    userPrompt = `Video Title: "${videoData.title}"
Creator: ${videoData.author || 'Unknown'}

${formatInstructions}

Transcript:
"""
${transcript}
"""`;

  } else if (lang === 'es') {
    systemPrompt = `Eres un asistente de IA de élite experto en síntesis de contenidos de vídeo.
Tu objetivo es producir un análisis y resumen claro, estructurado y fiel en ESPAÑOL, independientemente del idioma original.
Reglas:
- Redacta EXCLUSIVAMENTE en español.
- Sé fiel a la transcripción, sin inventar ni extrapolar.
- Usa un formato Markdown cuidado con listas de viñetas y palabras clave en negrita.`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `Produce una síntesis rápida en el siguiente formato:
### ⚡ Síntesis Rápida
(2 frases resumiendo la idea central)

### 📌 Los 5 puntos esenciales
- **Punto 1** : ...
- **Punto 2** : ...
- **Punto 3** : ...
- **Punto 4** : ...
- **Punto 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `Produce un análisis detallado en el siguiente formato:
### 🎯 Visión general & Contexto
(Explicación detallada de los temas)

### 🔍 Análisis en profundidad
(Estructurado por temas, argumentos y ejemplos clave)

### 💡 Conclusiones & Consejos Prácticos
(Lecciones principales y recomendaciones)`;
    } else {
      formatInstructions = `Produce un resumen estructurado en el siguiente formato:
### 🎯 En breve
(2 a 3 frases resumiendo el tema principal)

### 🔑 Puntos clave & Aprendizajes
- **Punto 1** : Explicación concisa...
- **Punto 2** : Explicación concisa...
- ... (4 a 7 puntos clave)

### 💡 Conclusión & A recordar
(Conclusión principal o consejo práctico)`;
    }

    userPrompt = `Título del vídeo: "${videoData.title}"
Autor: ${videoData.author || 'Desconocido'}

${formatInstructions}

Transcripción:
"""
${transcript}
"""`;

  } else if (lang === 'de') {
    systemPrompt = `Du bist ein Elite-KI-Assistent für die Zusammenfassung von Videoinhalten.
Dein Ziel ist es, eine prägnante, strukturierte und getreue Zusammenfassung auf DEUTSCH zu erstellen.
Regeln:
- Schreibe AUSSCHLIESSLICH auf Deutsch.
- Sei 100% getreu dem Transkript.
- Verwende sauberes Markdown mit Aufzählungspunkten und fetten Schlüsselwörtern.`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `Erstelle eine kurze Zusammenfassung im folgenden Format:
### ⚡ Kurzübersicht
(2 Sätze zur Kernaussage)

### 📌 Die 5 wichtigsten Punkte
- **Punkt 1** : ...
- **Punkt 2** : ...
- **Punkt 3** : ...
- **Punkt 4** : ...
- **Punkt 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `Erstelle eine ausführliche Analyse im folgenden Format:
### 🎯 Überblick & Kontext
(Detaillierte Erläuterung der Hintergründe)

### 🔍 Tiefgehende Analyse
(Strukturiert nach Themen, Argumenten und Beispielen)

### 💡 Fazit & Praktische Ratschläge
(Wichtigste Erkenntnisse und Empfehlungen)`;
    } else {
      formatInstructions = `Erstelle eine strukturierte Zusammenfassung im folgenden Format:
### 🎯 In Kürze
(2 bis 3 Sätze zum Thema und Ziel)

### 🔑 Kernaussagen & Erkenntnisse
- **Punkt 1** : Präzise Erklärung...
- **Punkt 2** : Präzise Erklärung...
- ... (4 bis 7 Hauptpunkte)

### 💡 Fazit & Wichtigste Erkenntnis
(Fazit oder praktischer Rat des Autors)`;
    }

    userPrompt = `Videotitel: "${videoData.title}"
Kanal: ${videoData.author || 'Unbekannt'}

${formatInstructions}

Transkript:
"""
${transcript}
"""`;

  } else if (lang === 'it') {
    systemPrompt = `Sei un assistente IA esperto nella sintesi di contenuti video.
Il tuo obiettivo è produrre un'analisi e un riassunto chiaro, strutturato e fedele in ITALIANO.
Regole:
- Scrivi ESCLUSIVAMENTE in italiano.
- Rimani fedele alla trascrizione, senza alcuna allucinazione.
- Usa una formattazione Markdown ariosa con elenchi puntati e parole chiave in grassetto.`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `Produci una sintesi rapida nel formato seguente:
### ⚡ Sintesi Rapida
(2 frasi che riassumono l'idea principale)

### 📌 I 5 punti essenziali
- **Punto 1** : ...
- **Punto 2** : ...
- **Punto 3** : ...
- **Punto 4** : ...
- **Punto 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `Produci un'analisi dettagliata nel formato seguente:
### 🎯 Panoramica & Contesto
(Spiegazione approfondita del contesto e delle problematiche)

### 🔍 Analisi Dettagliata
(Sviluppo strutturato di temi, argomenti ed esempi)

### 💡 Conclusioni & Consigli Pratici
(Lezioni principali e considerazioni finali)`;
    } else {
      formatInstructions = `Produci un riassunto strutturato nel formato seguente:
### 🎯 In Breve
(2 o 3 frasi che riassumono il tema principale)

### 🔑 Punti Chiave & Insegnamenti
- **Punto 1** : Spiegazione concisa...
- **Punto 2** : Spiegazione concisa...
- ... (da 4 a 7 punti chiave)

### 💡 Conclusione & Da Ricordare
(Conclusione principale o consiglio pratico)`;
    }

    userPrompt = `Titolo del video: "${videoData.title}"
Canale: ${videoData.author || 'Sconosciuto'}

${formatInstructions}

Trascrizione:
"""
${transcript}
"""`;

  } else if (lang === 'ru') {
    systemPrompt = `Ты — экспертный ИИ-ассистент по структурированию и краткому изложению видеоконтента.
Твоя цель — подготовить ясную, емкую и точную сводку на РУССКОМ языке.
Правила:
- Пиши ИСКЛЮЧИТЕЛЬНО на русском языке.
- Строго соблюдай факты транскрипции, без выдумок.
- Используй удобное форматирование Markdown с маркированными списками и жирным шрифтом.`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `Подготовь экспресс-сводку в следующем формате:
### ⚡ Экспресс-сводка
(2 предложения, обобщающие главную идею)

### 📌 5 главных тезисов
- **Тезис 1** : ...
- **Тезис 2** : ...
- **Тезис 3** : ...
- **Тезис 4** : ...
- **Тезис 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `Подготовь подробный разбор в следующем формате:
### 🎯 Обзор и контекст
(Глубокое объяснение предпосылок и проблематики)

### 🔍 Подробный анализ
(Структурированный разбор ключевых тем, аргументов и примеров)

### 💡 Практические выводы и советы
(Главные выводы и полезные рекомендации)`;
    } else {
      formatInstructions = `Подготовь структурированную сводку в следующем формате:
### 🎯 Коротко о главном
(2-3 предложения о теме и цели видео)

### 🔑 Ключевые выводы и идеи
- **Тезис 1** : Краткое объяснение...
- **Тезис 2** : Краткое объяснение...
- ... (от 4 до 7 ключевых тезисов)

### 💡 Итог и главное напутствие
(Главный вывод или совет от автора)`;
    }

    userPrompt = `Название видео: "${videoData.title}"
Автор: ${videoData.author || 'Неизвестно'}

${formatInstructions}

Транскрипция:
"""
${transcript}
"""`;

  } else if (lang === 'ja') {
    systemPrompt = `あなたは動画コンテンツの要約と分析を専門とする高度なAIアシスタントです。
明確で自然、よく構造化された忠実な日本語の要約を作成してください。
規則:
- 必ず日本語のみで作成してください。
- 文字起こしに100%忠実であり、推測は含めないでください。
- 箇条書きと太字キーワードを活用したMarkdown形式で整理してください。`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `以下の形式で簡潔な要約を作成してください:
### ⚡ クイック要約
(核心テーマを要約した2文)

### 📌 最重要5大ポイント
- **ポイント 1** : ...
- **ポイント 2** : ...
- **ポイント 3** : ...
- **ポイント 4** : ...
- **ポイント 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `以下の形式で詳細な分析を作成してください:
### 🎯 概要と背景
(背景と提起された課題の詳細な解説)

### 🔍 詳細分析
(主要テーマ、論拠、具体例を体系的に解説)

### 💡 実践的なアドバイスと結論
(学べる教訓と総括)`;
    } else {
      formatInstructions = `以下の形式で構造化された要約を作成してください:
### 🎯 要約（概要）
(主要テーマと目的を説明する2〜3文)

### 🔑 主要ポイントと学び
- **ポイント 1** : 簡潔な解説...
- **ポイント 2** : 簡潔な解説...
- ... (4〜7つの主要ポイント)

### 💡 結論とまとめ
(著者の主な結論、または提示された実践的アドバイス)`;
    }

    userPrompt = `動画タイトル: "${videoData.title}"
チャンネル: ${videoData.author || '不明'}

${formatInstructions}

文字起こし:
"""
${transcript}
"""`;

  } else if (lang === 'zh') {
    systemPrompt = `你是一名精通视频内容提炼与深度总结的专业 AI 助理。
请用中文撰写一份清晰、严谨且忠实于原意的优质总结。
规则：
- 仅使用中文书写。
- 100% 忠实于视频逐字稿，严禁虚构。
- 采用排版清爽的 Markdown 格式，列表项开头使用加粗关键词。`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `请按照以下格式生成核心速览：
### ⚡ 核心速览
(用 2 句话概括核心主旨)

### 📌 5 大核心要点
- **要点 1** : ...
- **要点 2** : ...
- **要点 3** : ...
- **要点 4** : ...
- **要点 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `请按照以下格式生成深度详尽的分析：
### 🎯 背景与全局概览
(深入解析背景、核心议题与动机)

### 🔍 深度主题剖析
(按逻辑拆解核心论点、具体案例与数据)

### 💡 实用建议与最终结论
(核心心得与可落地的实用建议)`;
    } else {
      formatInstructions = `请按照以下格式生成结构化摘要：
### 🎯 简要概述
(用 2 到 3 句话概括视频的核心主题与目标)

### 🔑 核心要点与深度启示
- **要点 1** : 简明解释...
- **要点 2** : 简明解释...
- ... (4 至 7 个核心要点)

### 💡 结论与实用心得
(作者的核心结论或给出的实用建议)`;
    }

    userPrompt = `视频标题: "${videoData.title}"
频道: ${videoData.author || '未知'}

${formatInstructions}

视频逐字稿:
"""
${transcript}
"""`;

  } else {
    // Français par défaut
    systemPrompt = `Tu es un assistant IA d'élite expert en synthèse de contenus vidéo.
Ton objectif est de produire une analyse et un résumé percutant, structuré et fidèle en FRANÇAIS, même si la transcription originale est en anglais ou une autre langue.
Règles :
- Rédige UNIQUEMENT en français.
- Sois fidèle à la transcription, sans inventer ni extrapoler.
- Utilise une mise en page Markdown soignée avec des emojis pour la lisibilité.`;

    let formatInstructions = '';
    if (mode === 'quick') {
      formatInstructions = `Produis une synthèse éclair au format suivant :
### ⚡ Synthèse Express
(2 phrases résumant le sujet et le message clé)

### 📌 Les 5 points essentiels
- **Point 1** : ...
- **Point 2** : ...
- **Point 3** : ...
- **Point 4** : ...
- **Point 5** : ...`;
    } else if (mode === 'detailed') {
      formatInstructions = `Produis une analyse détaillée au format suivant :
### 🎯 Vue d'ensemble & Contexte
(Explication détaillée des enjeux de la vidéo)

### 🔍 Analyse approfondie
(Développe les différents thèmes, concepts, exemples ou arguments abordés de façon structurée)

### 💡 Conclusions & Enseignements pratiques
(Ce qu'il faut retenir, conseils applicables et réflexions finales)`;
    } else {
      formatInstructions = `Produis un résumé structuré au format suivant :
### 🎯 En bref
(2 à 3 phrases résumant le sujet principal et l'objectif de la vidéo)

### 🔑 Points clés & Enseignements
- **Point clé 1** : Explication concise...
- **Point clé 2** : Explication concise...
- ... (4 à 7 points majeurs)

### 💡 Conclusion & À retenir
(La conclusion principale ou le conseil pratique donné par l'auteur)`;
    }

    userPrompt = `Titre de la vidéo : "${videoData.title}"
Auteur : ${videoData.author || 'Inconnu'}

${formatInstructions}

Transcription de la vidéo :
"""
${transcript}
"""`;
  }

  return { systemPrompt, userPrompt };
}

function parsePoint(rawText) {
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
  const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ß«"'])/u);
  return parts.map(s => s.trim()).filter(Boolean);
}

function renderListItem(rawText) {
  const parsed = parsePoint(rawText);
  if (parsed.hasTitle) {
    const sentenceDivs = parsed.sentences
      .map(s => `<div class="yt-ai-point-sentence" style="margin-bottom: 3px; line-height: 1.5;">${formatInline(s)}</div>`)
      .join('');
    return `
      <li class="yt-ai-point-item" style="list-style: none; margin-bottom: 12px;">
        <div class="yt-ai-point-title" style="font-weight: 700; color: #58a6ff; margin-bottom: 4px;"><strong>${formatInline(parsed.title)}</strong></div>
        <div class="yt-ai-point-body" style="padding-left: 18px; border-left: 2px solid rgba(88, 166, 255, 0.25); margin-left: 3px;">${sentenceDivs}</div>
      </li>
    `;
  } else {
    const sentenceDivs = parsed.sentences
      .map(s => `<div class="yt-ai-point-sentence" style="margin-bottom: 3px; line-height: 1.5;">${formatInline(s)}</div>`)
      .join('');
    return `
      <li class="yt-ai-point-item" style="list-style: none; margin-bottom: 12px;">
        <div class="yt-ai-point-body" style="padding-left: 14px;">${sentenceDivs}</div>
      </li>
    `;
  }
}

/**
 * Parser Markdown rapide et sécurisé
 */
function renderMarkdown(mdText, container) {
  if (!mdText) {
    container.innerHTML = '';
    return;
  }

  const lines = mdText.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.startsWith('### ')) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<h3>${formatInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<h2>${formatInline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<h2>${formatInline(line.slice(2))}</h2>`;
      continue;
    }

    const ulMatch = line.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul style="list-style: none; padding-left: 0;">'; inUl = true; }
      html += renderListItem(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += `<li>${formatInline(olMatch[1])}</li>`;
      continue;
    }

    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }

    const trimmed = line.trim();
    if (trimmed.length > 0) {
      html += `<p>${formatInline(trimmed)}</p>`;
    }
  }

  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';

  container.innerHTML = html;
}

function formatInline(text) {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
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

function formatTranscriptOutput(segments) {
  if (Array.isArray(segments)) {
    return segments.map(s => `[${s.timestamp || '--:--'}] ${s.text}`).join('\n\n');
  }
  return segments || 'Aucune transcription disponible.';
}

function switchTab(tabName) {
  if (tabName === 'summary') {
    tabSummaryBtn.classList.add('active');
    tabTranscriptBtn.classList.remove('active');
    tabSummaryContent.classList.remove('hidden');
    tabTranscriptContent.classList.add('hidden');
  } else {
    tabSummaryBtn.classList.remove('active');
    tabTranscriptBtn.classList.add('active');
    tabSummaryContent.classList.add('hidden');
    tabTranscriptContent.classList.remove('hidden');
  }
}

function setLoadingState(isLoading, message = '') {
  summarizeBtn.disabled = isLoading;
  if (isLoading) {
    statusAlert.classList.remove('hidden');
    statusMessage.textContent = message;
    summarizeBtnText.textContent = 'Génération...';
  } else {
    statusAlert.classList.add('hidden');
    summarizeBtnText.textContent = 'Résumer cette vidéo';
  }
}

function showStatusMessage(msg, isSuccess = true) {
  statusAlert.classList.remove('hidden');
  const spinner = statusAlert.querySelector('.spinner');
  if (spinner) spinner.style.display = isSuccess ? 'block' : 'none';
  statusMessage.textContent = msg;
}

async function handleCopySummary() {
  if (!currentSummaryMarkdown) return;
  try {
    await navigator.clipboard.writeText(currentSummaryMarkdown);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copié !';
    setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
  } catch (err) {
    alert('Impossible de copier dans le presse-papier');
  }
}

function handleDownloadSummary() {
  if (!currentSummaryMarkdown) return;

  const title = currentVideoData?.title || 'resume_youtube';
  const cleanTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
  const filename = `${cleanTitle}_resume.md`;

  const blob = new Blob([currentSummaryMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
