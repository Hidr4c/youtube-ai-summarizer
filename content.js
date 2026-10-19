(() => {
  // src/services/interfaces/IStorageService.js
  var IStorageService = class {
    /**
     * Retrieves value for a specific key
     * @param {string} key
     * @param {any} defaultValue
     * @returns {Promise<any>}
     */
    async get(key, defaultValue = null) {
      throw new Error("Not implemented");
    }
    /**
     * Stores value for a specific key
     * @param {string} key
     * @param {any} value
     * @returns {Promise<void>}
     */
    async set(key, value) {
      throw new Error("Not implemented");
    }
    /**
     * Retrieves multiple keys at once
     * @param {Array<string>} keys
     * @returns {Promise<Object>}
     */
    async getMultiple(keys) {
      throw new Error("Not implemented");
    }
    /**
     * Saves multiple key/value pairs
     * @param {Object} items
     * @returns {Promise<void>}
     */
    async setMultiple(items) {
      throw new Error("Not implemented");
    }
  };

  // src/services/implementations/ChromeStorageService.js
  var ChromeStorageService = class extends IStorageService {
    constructor() {
      super();
      this.isChromeStorageAvailable = typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
    }
    /**
     * @param {string} key
     * @param {any} defaultValue
     * @returns {Promise<any>}
     */
    async get(key, defaultValue = null) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError || result[key] === void 0) {
              resolve(defaultValue);
            } else {
              resolve(result[key]);
            }
          });
        });
      }
      try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    /**
     * @param {string} key
     * @param {any} value
     * @returns {Promise<void>}
     */
    async set(key, value) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => resolve());
        });
      }
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
      }
    }
    /**
     * @param {Array<string>} keys
     * @returns {Promise<Object>}
     */
    async getMultiple(keys) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        });
      }
      const result = {};
      for (const k of keys) {
        result[k] = await this.get(k, null);
      }
      return result;
    }
    /**
     * @param {Object} items
     * @returns {Promise<void>}
     */
    async setMultiple(items) {
      if (this.isChromeStorageAvailable) {
        return new Promise((resolve) => {
          chrome.storage.local.set(items, () => resolve());
        });
      }
      for (const [k, v] of Object.entries(items)) {
        await this.set(k, v);
      }
    }
  };

  // src/services/interfaces/II18nService.js
  var II18nService = class {
    /**
     * Sets current active language
     * @param {string} langCode (e.g. 'en', 'fr')
     */
    setLanguage(langCode) {
      throw new Error("Not implemented");
    }
    /**
     * Gets current active language code
     * @returns {string}
     */
    getLanguage() {
      throw new Error("Not implemented");
    }
    /**
     * Resolves translation string by key
     * @param {string} key
     * @param {Object} [params]
     * @returns {string|any}
     */
    t(key, params = {}) {
      throw new Error("Not implemented");
    }
    /**
     * Returns current language dictionary
     * @returns {Object}
     */
    getDictionary() {
      throw new Error("Not implemented");
    }
  };

  // src/locales/fr.js
  var fr = {
    "brandName": "YT Summarizer AI",
    "checking": "V\xE9rification...",
    "connectedBadge": "Connect\xE9",
    "offlineBadge": "Hors-ligne",
    "modelLoading": "Mod\xE8le : Chargement...",
    "modelPrefix": "Mod\xE8le : ",
    "summarizeBtn": "\u2728 R\xE9sumer cette vid\xE9o",
    "collapse": "R\xE9duire",
    "expand": "D\xE9plier",
    "providerLabel": "Fournisseur IA :",
    "groupLocal": "\u{1F3E0} Mod\xE8les Locaux (Gratuits & Priv\xE9s)",
    "groupFast": "\u26A1 Inf\xE9rence Cloud Rapide / Gratuite",
    "groupCloud": "\u2601\uFE0F Fournisseurs Cloud Majeurs",
    "serverLabel": "Serveur :",
    "serverLabelLm": "Serveur LM Studio :",
    "serverLabelOllama": "Serveur Ollama :",
    "noModelSelected": "Aucun mod\xE8le s\xE9lectionn\xE9",
    "keyOk": "Cl\xE9 OK",
    "keyRequired": "Cl\xE9 requise",
    "customServer": "Autre IP...",
    "refreshTooltip": "Actualiser les mod\xE8les locaux",
    "apiKeyLabel": "Cl\xE9 API :",
    "apiKeyPlaceholder": "Collez votre cl\xE9 API...",
    "getApiKeyLink": "\u{1F511} Obtenir une cl\xE9",
    "modelLabel": "Mod\xE8le :",
    "testModelBtn": "\u26A1 Tester",
    "testModelTooltip": "Tester la connexion et le mod\xE8le",
    "langLabel": "Langue :",
    "formatLabel": "Format :",
    "formatStandard": "\u{1F4CC} Naturelle & \xE9quilibr\xE9e",
    "formatQuick": "\u26A1 Courte & concise",
    "formatDetailed": "\u{1F4DD} D\xE9taill\xE9e & approfondie",
    "voiceLabel": "Voix :",
    "voiceDefault": "Voix syst\xE8me...",
    "micLabel": "Micro :",
    "micDefault": "\u{1F399}\uFE0F Micro par d\xE9faut",
    "tabSummary": "\u{1F4DD} Synth\xE8se IA",
    "tabChat": "\u{1F4AC} Poser une question",
    "tabTranscript": "\u{1F4DC} Transcription",
    "summaryTitle": "\u{1F4DD} Synth\xE8se IA",
    "listenBtn": "\u{1F50A} \xC9couter",
    "stopListenBtn": "\u23F9\uFE0F Arr\xEAter",
    "copyBtn": "\u{1F4CB} Copier",
    "copiedBtn": "\u2705 Copi\xE9 !",
    "saveMdBtn": "\u{1F4BE} Sauvegarder .md",
    "reasoningModel": "\u{1F4AD} R\xE9flexion du mod\xE8le",
    "reasoningInProgress": "en cours...",
    "reasoningDone": "termin\xE9e",
    "emptyTitle": "Pr\xEAt \xE0 r\xE9sumer cette vid\xE9o",
    "emptySubtitle": "Extrayez les points cl\xE9s, chapitres et conclusions en quelques secondes gr\xE2ce \xE0 l'IA.",
    "newVideoTitle": "Nouvelle vid\xE9o d\xE9tect\xE9e",
    "summaryPlaceholder": "Cliquez sur \xAB \u2728 R\xE9sumer cette vid\xE9o \xBB pour g\xE9n\xE9rer la synth\xE8se.",
    "newVideoPlaceholder": "Nouvelle vid\xE9o d\xE9tect\xE9e. Cliquez sur \xAB \u2728 R\xE9sumer cette vid\xE9o \xBB pour g\xE9n\xE9rer la synth\xE8se.",
    "generatingSummary": "G\xE9n\xE9ration de la synth\xE8se en cours...",
    "chatTitle": "\u{1F4AC} Questions & R\xE9ponses sur la vid\xE9o",
    "clearChatBtn": "\u{1F5D1}\uFE0F Effacer la discussion",
    "suggestions": [
      {
        "label": "\u{1F4A1} Points cl\xE9s",
        "question": "Quels sont les points cl\xE9s essentiels \xE0 retenir ?"
      },
      {
        "label": "\u23F1\uFE0F Quand parle-t-il du sujet ?",
        "question": "\xC0 quel moment de la vid\xE9o parle-t-il du sujet principal ?"
      },
      {
        "label": "\u{1F4CA} Chiffres & Exemples",
        "question": "Quels sont les exemples, chiffres ou arguments cit\xE9s ?"
      },
      {
        "label": "\u{1F3AF} Conclusion & Conseils",
        "question": "Que conseille ou conclut l'auteur \xE0 la fin ?"
      }
    ],
    "chatWelcome": "Bonjour ! Posez-moi n'importe quelle question sur le contenu de cette vid\xE9o. Je m'appuie directement sur sa transcription int\xE9grale.",
    "chatPlaceholder": "Posez une question ou dictez au micro... (Entr\xE9e pour envoyer)",
    "chatInputListening": "\u{1F399}\uFE0F Dict\xE9e en cours... Parlez dans votre microphone.",
    "chatResetNotice": "Discussion r\xE9initialis\xE9e. Posez une question sur le contenu de la vid\xE9o !",
    "micTitle": "Dicter votre question au micro",
    "micStopTitle": "Arr\xEAter la dict\xE9e",
    "sendBtn": "Envoyer \u27A4",
    "transcriptTitle": "\u{1F4DC} Transcription int\xE9grale",
    "wordsBadge": "mots",
    "copyRawBtn": "\u{1F4CB} Copier brut",
    "transcriptWaiting": "En attente d'extraction... (Sera extraite au lancement du r\xE9sum\xE9 ou d'une question)",
    "micActiveNotice": "\u{1F399}\uFE0F Dict\xE9e vocale active... Parlez maintenant.",
    "micBlockedNotice": "Microphone bloqu\xE9 : veuillez autoriser le micro dans Chrome (cliquez sur l'ic\xF4ne \u{1F512} \xE0 gauche de l'URL youtube.com).",
    "micNoDeviceNotice": "Aucun microphone d\xE9tect\xE9 ou p\xE9riph\xE9rique audio indisponible.",
    "micNetworkNotice": "Erreur r\xE9seau Google Speech. Si vous utilisez Brave, activez 'Services Google pour la reconnaissance vocale' dans brave://settings/privacy, ou v\xE9rifiez qu'aucun bloqueur ne filtre le service.",
    "micErrorNotice": "Erreur micro : ",
    "micNotSupportedNotice": "La reconnaissance vocale n'est pas support\xE9e sur ce navigateur.",
    "listenBubbleTitle": "\xC9couter cette r\xE9ponse",
    "noSummaryToRead": "Aucune synth\xE8se \xE0 lire pour le moment.",
    "noTranscriptError": "Cette vid\xE9o ne dispose d'aucun sous-titre sur YouTube (les sous-titres CC ne sont pas fournis ou pas encore g\xE9n\xE9r\xE9s par YouTube). Essayez une vid\xE9o avec sous-titres ou activez Whisper Local dans les R\xE9glages.",
    "selectModelAlert": "Veuillez s\xE9lectionner un mod\xE8le IA dans la barre de r\xE9glages ci-dessus.",
    "missingKeyAlert": "Veuillez renseigner votre cl\xE9 API pour discuter.",
    "advancedOptions": "\u2699\uFE0F Options Avanc\xE9es (IA, Audio & Automatisation)",
    "settingsBtn": "R\xE9glages",
    "errorLabel": "Erreur : ",
    "settingsHideBtn": "\u2715 Fermer r\xE9glages",
    "tabSettingsModel": "\u{1F916} Mod\xE8le & Fournisseur",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voix & Audio",
    "tabSettingsParams": "\u2699\uFE0F Param\xE8tres IA",
    "testSttBtn": "\u26A1 Tester STT",
    "customPromptPlaceholder": "ex: Insister sur les aspects techniques, expliquer avec des analogies...",
    "whisperUrlPlaceholder": "ex: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "par",
    "footerReportBug": "Signaler un bug",
    "footerDocs": "Documentation",
    "tempStrict": "0.0 - Strict & Pr\xE9cis",
    "tempBalanced": "0.3 - \xC9quilibr\xE9 (D\xE9faut)",
    "tempCreative": "0.7 - Cr\xE9atif & D\xE9taill\xE9",
    "tempWild": "1.0 - Tr\xE8s inventif",
    "tokensAuto": "Automatique (D\xE9faut)",
    "tokensShort": "Court (1 024)",
    "tokensStandard": "Standard (2 048)",
    "tokensDetailed": "D\xE9taill\xE9 (4 096)",
    "tokensMax": "Maximum (8 192)",
    "speedSlow": "0.75x (Pos\xE9)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (Rapide)",
    "speedVeryFast": "1.5x (Acc\xE9l\xE9r\xE9)",
    "speedDouble": "2.0x (Double)",
    "tempLabel": "Cr\xE9ativit\xE9 IA (Temp\xE9rature) :",
    "maxTokensLabel": "Longueur max (Tokens) :",
    "ttsSpeedLabel": "Vitesse lecture audio :",
    "whisperUrlLabel": "Serveur Whisper Local (Audio STT) :",
    "autoSummarizeLabel": "\u26A1 R\xE9sumer automatiquement \xE0 l'ouverture d'une vid\xE9o",
    "customPromptLabel": "Directives personnalis\xE9es pour l'IA (optionnel) :",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var fr_default = fr;

  // src/locales/en.js
  var en = {
    "brandName": "YT Summarizer AI",
    "checking": "Checking...",
    "connectedBadge": "Connected",
    "offlineBadge": "Offline",
    "modelLoading": "Model: Loading...",
    "modelPrefix": "Model: ",
    "summarizeBtn": "\u2728 Summarize video",
    "collapse": "Collapse",
    "expand": "Expand",
    "providerLabel": "AI Provider:",
    "groupLocal": "\u{1F3E0} Local Models (Free & Private)",
    "groupFast": "\u26A1 Fast / Free Cloud Inference",
    "groupCloud": "\u2601\uFE0F Major Cloud Providers",
    "serverLabel": "Server:",
    "serverLabelLm": "LM Studio Server:",
    "serverLabelOllama": "Ollama Server:",
    "noModelSelected": "No model selected",
    "keyOk": "Key OK",
    "keyRequired": "Key required",
    "customServer": "Custom IP...",
    "refreshTooltip": "Refresh local models",
    "apiKeyLabel": "API Key:",
    "apiKeyPlaceholder": "Paste your API key...",
    "getApiKeyLink": "\u{1F511} Get an API key",
    "modelLabel": "Model:",
    "testModelBtn": "\u26A1 Test",
    "testModelTooltip": "Test connection and model",
    "langLabel": "Language:",
    "formatLabel": "Format:",
    "formatStandard": "\u{1F4CC} Natural & balanced",
    "formatQuick": "\u26A1 Short & concise",
    "formatDetailed": "\u{1F4DD} Detailed & in-depth",
    "voiceLabel": "Voice:",
    "voiceDefault": "System voice...",
    "micLabel": "Mic:",
    "micDefault": "\u{1F399}\uFE0F Default mic",
    "tabSummary": "\u{1F4DD} AI Summary",
    "tabChat": "\u{1F4AC} Ask a question",
    "tabTranscript": "\u{1F4DC} Transcript",
    "summaryTitle": "\u{1F4DD} AI Summary",
    "listenBtn": "\u{1F50A} Listen",
    "stopListenBtn": "\u23F9\uFE0F Stop",
    "copyBtn": "\u{1F4CB} Copy",
    "copiedBtn": "\u2705 Copied!",
    "saveMdBtn": "\u{1F4BE} Save .md",
    "reasoningModel": "\u{1F4AD} Model Reasoning",
    "reasoningInProgress": "in progress...",
    "reasoningDone": "completed",
    "emptyTitle": "Ready to summarize this video",
    "emptySubtitle": "Extract key takeaways, chapters, and insights in seconds with AI.",
    "newVideoTitle": "New video detected",
    "summaryPlaceholder": "Click '\u2728 Summarize video' to generate the summary.",
    "newVideoPlaceholder": "New video detected. Click '\u2728 Summarize video' to generate the summary.",
    "generatingSummary": "Generating summary...",
    "chatTitle": "\u{1F4AC} Video Q&A",
    "clearChatBtn": "\u{1F5D1}\uFE0F Clear conversation",
    "suggestions": [
      {
        "label": "\u{1F4A1} Key takeaways",
        "question": "What are the core key takeaways from this video?"
      },
      {
        "label": "\u23F1\uFE0F Timestamps",
        "question": "At what point in the video is the main topic discussed?"
      },
      {
        "label": "\u{1F4CA} Data & Figures",
        "question": "What specific figures, examples, or arguments are presented?"
      },
      {
        "label": "\u{1F3AF} Conclusion & Advice",
        "question": "What is the author's final conclusion or actionable advice?"
      }
    ],
    "chatWelcome": "Hello! Ask me any question about the content of this video. I base my answers directly on its full transcript.",
    "chatPlaceholder": "Ask a question or dictate with mic... (Press Enter to send)",
    "chatInputListening": "\u{1F399}\uFE0F Dictating... Speak into your microphone.",
    "chatResetNotice": "Conversation reset. Ask any question about the video content!",
    "micTitle": "Dictate your question with microphone",
    "micStopTitle": "Stop dictation",
    "sendBtn": "Send \u27A4",
    "transcriptTitle": "\u{1F4DC} Full Transcript",
    "wordsBadge": "words",
    "copyRawBtn": "\u{1F4CB} Copy raw",
    "transcriptWaiting": "Waiting for transcript... (Will be extracted when generating a summary or asking a question)",
    "micActiveNotice": "\u{1F399}\uFE0F Voice dictation active... Speak now.",
    "micBlockedNotice": "Microphone blocked: please allow mic access in Chrome (click the \u{1F512} icon on the left of youtube.com).",
    "micNoDeviceNotice": "No microphone detected or audio device unavailable.",
    "micNetworkNotice": "Google Speech network error. If using Brave, enable 'Google services for voice recognition' in brave://settings/privacy, or check if an adblocker/VPN is blocking speech services.",
    "micErrorNotice": "Microphone error: ",
    "micNotSupportedNotice": "Speech recognition is not supported in this browser.",
    "listenBubbleTitle": "Listen to this answer",
    "noSummaryToRead": "No summary to read aloud yet.",
    "noTranscriptError": "This video does not have any subtitles or captions on YouTube (CC is not available for this video). Please try a video with captions enabled, or configure Local Whisper in Settings.",
    "selectModelAlert": "Please select an AI model in the settings toolbar above.",
    "missingKeyAlert": "Please provide your API key to chat.",
    "advancedOptions": "\u2699\uFE0F Advanced Options (AI, Audio & Automation)",
    "settingsBtn": "Settings",
    "errorLabel": "Error: ",
    "settingsHideBtn": "\u2715 Close Settings",
    "tabSettingsModel": "\u{1F916} AI Model & Server",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voice & Audio",
    "tabSettingsParams": "\u2699\uFE0F Parameters & Prompt",
    "testSttBtn": "\u26A1 Test STT",
    "customPromptPlaceholder": "e.g. Focus on technical details, explain with analogies...",
    "whisperUrlPlaceholder": "e.g. http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "by",
    "footerReportBug": "Report a bug",
    "footerDocs": "Documentation",
    "tempStrict": "0.0 - Strict & Precise",
    "tempBalanced": "0.3 - Balanced (Default)",
    "tempCreative": "0.7 - Creative & Detailed",
    "tempWild": "1.0 - Highly Inventive",
    "tokensAuto": "Automatic (Default)",
    "tokensShort": "Short (1,024)",
    "tokensStandard": "Standard (2,048)",
    "tokensDetailed": "Detailed (4,096)",
    "tokensMax": "Maximum (8,192)",
    "speedSlow": "0.75x (Calm)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (Fast)",
    "speedVeryFast": "1.5x (Speedy)",
    "speedDouble": "2.0x (Double)",
    "tempLabel": "AI Creativity (Temperature):",
    "maxTokensLabel": "Max Length (Tokens):",
    "ttsSpeedLabel": "Voice Speed:",
    "whisperUrlLabel": "Local Whisper Server (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Auto-summarize when opening a video",
    "customPromptLabel": "Custom AI Instructions (optional):",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var en_default = en;

  // src/locales/es.js
  var es = {
    "brandName": "YT Summarizer AI",
    "checking": "Comprobando...",
    "connectedBadge": "Conectado",
    "offlineBadge": "Desconectado",
    "modelLoading": "Modelo: Cargando...",
    "modelPrefix": "Modelo: ",
    "summarizeBtn": "\u2728 Resumir este v\xEDdeo",
    "collapse": "Plegar",
    "expand": "Desplegar",
    "providerLabel": "Proveedor IA:",
    "groupLocal": "\u{1F3E0} Modelos Locales (Gratis y Privados)",
    "groupFast": "\u26A1 Inferencia R\xE1pida / Gratis",
    "groupCloud": "\u2601\uFE0F Proveedores Cloud Principales",
    "serverLabel": "Servidor:",
    "serverLabelLm": "Servidor LM Studio:",
    "serverLabelOllama": "Servidor Ollama:",
    "noModelSelected": "Ning\xFAn modelo seleccionado",
    "keyOk": "Clave OK",
    "keyRequired": "Clave requerida",
    "customServer": "Otra IP...",
    "refreshTooltip": "Actualizar modelos locales",
    "apiKeyLabel": "Clave API:",
    "apiKeyPlaceholder": "Pega tu clave API...",
    "getApiKeyLink": "\u{1F511} Obtener una clave",
    "modelLabel": "Modelo:",
    "testModelBtn": "\u26A1 Probar",
    "testModelTooltip": "Probar conexi\xF3n y modelo",
    "langLabel": "Idioma:",
    "formatLabel": "Formato:",
    "formatStandard": "\u{1F4CC} Natural y equilibrado",
    "formatQuick": "\u26A1 Corto y conciso",
    "formatDetailed": "\u{1F4DD} Detallado y profundo",
    "voiceLabel": "Voz:",
    "voiceDefault": "Voz del sistema...",
    "micLabel": "Micro:",
    "micDefault": "\u{1F399}\uFE0F Micro por defecto",
    "tabSummary": "\u{1F4DD} Resumen IA",
    "tabChat": "\u{1F4AC} Hacer una pregunta",
    "tabTranscript": "\u{1F4DC} Transcripci\xF3n",
    "summaryTitle": "\u{1F4DD} Resumen IA",
    "listenBtn": "\u{1F50A} Escuchar",
    "stopListenBtn": "\u23F9\uFE0F Detener",
    "copyBtn": "\u{1F4CB} Copiar",
    "copiedBtn": "\u2705 \xA1Copiado!",
    "saveMdBtn": "\u{1F4BE} Guardar .md",
    "reasoningModel": "\u{1F4AD} Razonamiento del modelo",
    "reasoningInProgress": "en curso...",
    "reasoningDone": "completado",
    "emptyTitle": "Listo para resumir este video",
    "emptySubtitle": "Extraiga puntos clave, cap\xEDtulos y conclusiones en segundos con IA.",
    "newVideoTitle": "Nuevo v\xEDdeo detectado",
    "summaryPlaceholder": "Haz clic en \xAB \u2728 Resumir este v\xEDdeo \xBB para generar el resumen.",
    "newVideoPlaceholder": "Nuevo v\xEDdeo detectado. Haz clic en \xAB \u2728 Resumir este v\xEDdeo \xBB para generar el resumen.",
    "generatingSummary": "Generando resumen...",
    "chatTitle": "\u{1F4AC} Preguntas y Respuestas sobre el v\xEDdeo",
    "clearChatBtn": "\u{1F5D1}\uFE0F Borrar conversaci\xF3n",
    "suggestions": [
      {
        "label": "\u{1F4A1} Puntos clave",
        "question": "\xBFCu\xE1les son los puntos clave esenciales a recordar?"
      },
      {
        "label": "\u23F1\uFE0F Marcas de tiempo",
        "question": "\xBFEn qu\xE9 momento del v\xEDdeo se habla del tema principal?"
      },
      {
        "label": "\u{1F4CA} Cifras y Ejemplos",
        "question": "\xBFQu\xE9 ejemplos, cifras o argumentos se mencionan?"
      },
      {
        "label": "\u{1F3AF} Conclusi\xF3n y Consejos",
        "question": "\xBFQu\xE9 concluye o aconseja el autor al final?"
      }
    ],
    "chatWelcome": "\xA1Hola! Hazme cualquier pregunta sobre el contenido de este v\xEDdeo. Me baso directamente en la transcripci\xF3n completa.",
    "chatPlaceholder": "Haz una pregunta o dicta con el micro... (Intro para enviar)",
    "chatInputListening": "\u{1F399}\uFE0F Dictando... Habla por el micr\xF3fono.",
    "chatResetNotice": "Conversaci\xF3n reiniciada. \xA1Haz una pregunta sobre el contenido del v\xEDdeo!",
    "micTitle": "Dictar tu pregunta con el micro",
    "micStopTitle": "Detener la dictaci\xF3n",
    "sendBtn": "Enviar \u27A4",
    "transcriptTitle": "\u{1F4DC} Transcripci\xF3n completa",
    "wordsBadge": "palabras",
    "copyRawBtn": "\u{1F4CB} Copiar texto",
    "transcriptWaiting": "Esperando extracci\xF3n... (Se extraer\xE1 al iniciar el resumen o una pregunta)",
    "micActiveNotice": "\u{1F399}\uFE0F Dictaci\xF3n por voz activa... Habla ahora.",
    "micBlockedNotice": "Micr\xF3fono bloqueado: permite el acceso al micro en Chrome (icono \u{1F512} a la izquierda de youtube.com).",
    "micNoDeviceNotice": "No se detect\xF3 ning\xFAn micr\xF3fono o el dispositivo no est\xE1 disponible.",
    "micNetworkNotice": "Error de red de Google Speech. Si usas Brave, activa 'Servicios de Google para reconocimiento de voz' en brave://settings/privacy, o comprueba si un bloqueador/VPN lo impide.",
    "micErrorNotice": "Error de micro: ",
    "micNotSupportedNotice": "El reconocimiento de voz no es compatible con este navegador.",
    "listenBubbleTitle": "Escuchar esta respuesta",
    "noSummaryToRead": "No hay ning\xFAn resumen para leer todav\xEDa.",
    "noTranscriptError": "No se pudo extraer la transcripci\xF3n de este v\xEDdeo para responder. Aseg\xFArate de que los subt\xEDtulos est\xE9n disponibles en YouTube.",
    "selectModelAlert": "Por favor selecciona un modelo IA en la barra de configuraci\xF3n superior.",
    "missingKeyAlert": "Por favor proporciona tu clave API para chatear.",
    "advancedOptions": "\u2699\uFE0F Opciones avanzadas (IA, Audio y Automatizaci\xF3n)",
    "settingsBtn": "Ajustes",
    "errorLabel": "Error: ",
    "settingsHideBtn": "\u2715 Cerrar ajustes",
    "tabSettingsModel": "\u{1F916} Modelo y Servidor",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voz y Audio",
    "tabSettingsParams": "\u2699\uFE0F Par\xE1metros de IA",
    "testSttBtn": "\u26A1 Probar STT",
    "customPromptPlaceholder": "ej: Enfatizar aspectos t\xE9cnicos, explicar con analog\xEDas...",
    "whisperUrlPlaceholder": "ej: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "por",
    "footerReportBug": "Reportar un error",
    "footerDocs": "Documentaci\xF3n",
    "tempStrict": "0.0 - Estricto y Preciso",
    "tempBalanced": "0.3 - Equilibrado (Por defecto)",
    "tempCreative": "0.7 - Creativo y Detallado",
    "tempWild": "1.0 - Muy inventivo",
    "tokensAuto": "Autom\xE1tico (Por defecto)",
    "tokensShort": "Corto (1.024)",
    "tokensStandard": "Est\xE1ndar (2.048)",
    "tokensDetailed": "Detallado (4.096)",
    "tokensMax": "M\xE1ximo (8.192)",
    "speedSlow": "0.75x (Pausado)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (R\xE1pido)",
    "speedVeryFast": "1.5x (Acelerado)",
    "speedDouble": "2.0x (Doble)",
    "tempLabel": "Creatividad IA (Temperatura):",
    "maxTokensLabel": "Longitud m\xE1x (Tokens):",
    "ttsSpeedLabel": "Velocidad de voz:",
    "whisperUrlLabel": "Servidor Whisper Local (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Resumir autom\xE1ticamente al abrir un video",
    "customPromptLabel": "Instrucciones personalizadas para la IA:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var es_default = es;

  // src/locales/de.js
  var de = {
    "brandName": "YT Summarizer AI",
    "checking": "\xDCberpr\xFCfung...",
    "connectedBadge": "Verbunden",
    "offlineBadge": "Offline",
    "modelLoading": "Modell: Laden...",
    "modelPrefix": "Modell: ",
    "summarizeBtn": "\u2728 Video zusammenfassen",
    "collapse": "Einklappen",
    "expand": "Ausklappen",
    "providerLabel": "KI-Anbieter:",
    "groupLocal": "\u{1F3E0} Lokale Modelle (Kostenlos & Privat)",
    "groupFast": "\u26A1 Schnelle / Kostenlose Cloud-Inferenz",
    "groupCloud": "\u2601\uFE0F Gro\xDFe Cloud-Anbieter",
    "serverLabel": "Server:",
    "serverLabelLm": "LM Studio Server:",
    "serverLabelOllama": "Ollama Server:",
    "noModelSelected": "Kein Modell ausgew\xE4hlt",
    "keyOk": "Schl\xFCssel OK",
    "keyRequired": "Schl\xFCssel erforderlich",
    "customServer": "Andere IP...",
    "refreshTooltip": "Lokale Modelle aktualisieren",
    "apiKeyLabel": "API-Schl\xFCssel:",
    "apiKeyPlaceholder": "F\xFCgen Sie Ihren API-Schl\xFCssel ein...",
    "getApiKeyLink": "\u{1F511} Schl\xFCssel anfordern",
    "modelLabel": "Modell:",
    "testModelBtn": "\u26A1 Testen",
    "testModelTooltip": "Verbindung und Modell testen",
    "langLabel": "Sprache:",
    "formatLabel": "Format:",
    "formatStandard": "\u{1F4CC} Nat\xFCrlich & ausgewogen",
    "formatQuick": "\u26A1 Kurz & pr\xE4gnant",
    "formatDetailed": "\u{1F4DD} Detailliert & gr\xFCndlich",
    "voiceLabel": "Stimme:",
    "voiceDefault": "Systemstimme...",
    "micLabel": "Mikro:",
    "micDefault": "\u{1F399}\uFE0F Standard-Mikrofon",
    "tabSummary": "\u{1F4DD} KI-Zusammenfassung",
    "tabChat": "\u{1F4AC} Frage stellen",
    "tabTranscript": "\u{1F4DC} Transkript",
    "summaryTitle": "\u{1F4DD} KI-Zusammenfassung",
    "listenBtn": "\u{1F50A} Anh\xF6ren",
    "stopListenBtn": "\u23F9\uFE0F Stopp",
    "copyBtn": "\u{1F4CB} Kopieren",
    "copiedBtn": "\u2705 Kopiert!",
    "saveMdBtn": "\u{1F4BE} Als .md speichern",
    "reasoningModel": "\u{1F4AD} Denkprozess des Modells",
    "reasoningInProgress": "in Bearbeitung...",
    "reasoningDone": "abgeschlossen",
    "emptyTitle": "Bereit, dieses Video zusammenzufassen",
    "emptySubtitle": "Erhalten Sie Kernaussagen, Kapitel und wichtige Erkenntnisse in Sekundenschnelle mit KI.",
    "newVideoTitle": "Neues Video erkannt",
    "summaryPlaceholder": "Klicken Sie auf \xAB \u2728 Video zusammenfassen \xBB, um die Zusammenfassung zu erstellen.",
    "newVideoPlaceholder": "Neues Video erkannt. Klicken Sie auf \xAB \u2728 Video zusammenfassen \xBB, um die Zusammenfassung zu erstellen.",
    "generatingSummary": "Zusammenfassung wird erstellt...",
    "chatTitle": "\u{1F4AC} Fragen & Antworten zum Video",
    "clearChatBtn": "\u{1F5D1}\uFE0F Verlauf l\xF6schen",
    "suggestions": [
      {
        "label": "\u{1F4A1} Kernaussagen",
        "question": "Was sind die wichtigsten Kernaussagen dieses Videos?"
      },
      {
        "label": "\u23F1\uFE0F Zeitstempel",
        "question": "An welcher Stelle im Video wird das Hauptthema besprochen?"
      },
      {
        "label": "\u{1F4CA} Zahlen & Beispiele",
        "question": "Welche Beispiele, Zahlen oder Argumente werden genannt?"
      },
      {
        "label": "\u{1F3AF} Fazit & Ratschl\xE4ge",
        "question": "Welches Fazit oder welchen Rat gibt der Autor am Ende?"
      }
    ],
    "chatWelcome": "Hallo! Stellen Sie mir eine Frage zum Inhalt dieses Videos. Ich beziehe mich direkt auf das vollst\xE4ndige Transkript.",
    "chatPlaceholder": "Frage stellen oder ins Mikro sprechen... (Enter zum Senden)",
    "chatInputListening": "\u{1F399}\uFE0F Aufnahme l\xE4uft... Sprechen Sie jetzt.",
    "chatResetNotice": "Unterhaltung zur\xFCckgesetzt. Stellen Sie eine Frage zum Inhalt des Videos!",
    "micTitle": "Frage \xFCber Mikrofon diktieren",
    "micStopTitle": "Aufnahme beenden",
    "sendBtn": "Senden \u27A4",
    "transcriptTitle": "\u{1F4DC} Vollst\xE4ndiges Transkript",
    "wordsBadge": "W\xF6rter",
    "copyRawBtn": "\u{1F4CB} Rohtext kopieren",
    "transcriptWaiting": "Warten auf Extraktion... (Wird beim Starten der Zusammenfassung oder einer Frage geladen)",
    "micActiveNotice": "\u{1F399}\uFE0F Sprachaufnahme aktiv... Sprechen Sie jetzt.",
    "micBlockedNotice": "Mikrofon blockiert: Bitte erlauben Sie den Mikrofonzugriff in Chrome (\u{1F512}-Symbol links neben der URL).",
    "micNoDeviceNotice": "Kein Mikrofon erkannt oder Ger\xE4t nicht verf\xFCgbar.",
    "micNetworkNotice": "Google Speech Netzwerkfehler. Wenn Sie Brave nutzen, aktivieren Sie 'Google-Dienste f\xFCr Spracherkennung' in brave://settings/privacy, oder pr\xFCfen Sie Ihren Werbeblocker/VPN.",
    "micErrorNotice": "Mikrofonfehler: ",
    "micNotSupportedNotice": "Spracherkennung wird von diesem Browser nicht unterst\xFCtzt.",
    "listenBubbleTitle": "Diese Antwort anh\xF6ren",
    "noSummaryToRead": "Noch keine Zusammenfassung zum Vorlesen vorhanden.",
    "noTranscriptError": "Das Transkript dieses Videos konnte nicht geladen werden. Bitte stellen Sie sicher, dass Untertitel auf YouTube verf\xFCgbar sind.",
    "selectModelAlert": "Bitte w\xE4hlen Sie oben ein KI-Modell aus.",
    "missingKeyAlert": "Bitte geben Sie Ihren API-Schl\xFCssel ein, um zu chatten.",
    "advancedOptions": "\u2699\uFE0F Erweiterte Optionen (KI, Audio & Automation)",
    "settingsBtn": "Einstellungen",
    "errorLabel": "Fehler: ",
    "settingsHideBtn": "\u2715 Schlie\xDFen",
    "tabSettingsModel": "\u{1F916} Modell & Server",
    "tabSettingsAudio": "\u{1F399}\uFE0F Stimme & Audio",
    "tabSettingsParams": "\u2699\uFE0F KI-Parameter",
    "testSttBtn": "\u26A1 STT testen",
    "customPromptPlaceholder": "z.B. Technische Details betonen, mit Analogien erkl\xE4ren...",
    "whisperUrlPlaceholder": "z.B. http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "von",
    "footerReportBug": "Fehler melden",
    "footerDocs": "Dokumentation",
    "tempStrict": "0.0 - Streng & Pr\xE4zise",
    "tempBalanced": "0.3 - Ausgewogen (Standard)",
    "tempCreative": "0.7 - Kreativ & Detailliert",
    "tempWild": "1.0 - Sehr erfinderisch",
    "tokensAuto": "Automatisch (Standard)",
    "tokensShort": "Kurz (1.024)",
    "tokensStandard": "Standard (2.048)",
    "tokensDetailed": "Detailliert (4.096)",
    "tokensMax": "Maximum (8.192)",
    "speedSlow": "0.75x (Ruhig)",
    "speedNormal": "1.0x (Normal)",
    "speedFast": "1.25x (Schnell)",
    "speedVeryFast": "1.5x (Sehr schnell)",
    "speedDouble": "2.0x (Doppelt)",
    "tempLabel": "KI-Kreativit\xE4t (Temperatur):",
    "maxTokensLabel": "Maximale L\xE4nge (Tokens):",
    "ttsSpeedLabel": "Sprachgeschwindigkeit:",
    "whisperUrlLabel": "Lokaler Whisper-Server (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Automatisch zusammenfassen beim \xD6ffnen",
    "customPromptLabel": "Benutzerdefinierte KI-Anweisungen:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var de_default = de;

  // src/locales/it.js
  var it = {
    "brandName": "YT Summarizer AI",
    "checking": "Verifica...",
    "connectedBadge": "Connesso",
    "offlineBadge": "Non in linea",
    "modelLoading": "Modello: Caricamento...",
    "modelPrefix": "Modello: ",
    "summarizeBtn": "\u2728 Riassumi questo video",
    "collapse": "Comprimi",
    "expand": "Espandi",
    "providerLabel": "Fornitore IA:",
    "groupLocal": "\u{1F3E0} Modelli Locali (Gratuiti & Privati)",
    "groupFast": "\u26A1 Inferenza Cloud Veloce / Gratuita",
    "groupCloud": "\u2601\uFE0F Principali Fornitori Cloud",
    "serverLabel": "Server:",
    "serverLabelLm": "Server LM Studio:",
    "serverLabelOllama": "Server Ollama:",
    "noModelSelected": "Nessun modello selezionato",
    "keyOk": "Chiave OK",
    "keyRequired": "Chiave richiesta",
    "customServer": "Altro IP...",
    "refreshTooltip": "Aggiorna modelli locali",
    "apiKeyLabel": "Chiave API:",
    "apiKeyPlaceholder": "Incolla la tua chiave API...",
    "getApiKeyLink": "\u{1F511} Ottieni una chiave",
    "modelLabel": "Modello:",
    "testModelBtn": "\u26A1 Prova",
    "testModelTooltip": "Verifica connessione e modello",
    "langLabel": "Lingua:",
    "formatLabel": "Formato:",
    "formatStandard": "\u{1F4CC} Naturale & bilanciato",
    "formatQuick": "\u26A1 Breve & conciso",
    "formatDetailed": "\u{1F4DD} Dettagliato & approfondito",
    "voiceLabel": "Voce:",
    "voiceDefault": "Voce di sistema...",
    "micLabel": "Microfono:",
    "micDefault": "\u{1F399}\uFE0F Microfono predefinito",
    "tabSummary": "\u{1F4DD} Riassunto IA",
    "tabChat": "\u{1F4AC} Fai una domanda",
    "tabTranscript": "\u{1F4DC} Trascrizione",
    "summaryTitle": "\u{1F4DD} Riassunto IA",
    "listenBtn": "\u{1F50A} Ascolta",
    "stopListenBtn": "\u23F9\uFE0F Interrompi",
    "copyBtn": "\u{1F4CB} Copia",
    "copiedBtn": "\u2705 Copiato!",
    "saveMdBtn": "\u{1F4BE} Salva .md",
    "reasoningModel": "\u{1F4AD} Ragionamento del modello",
    "reasoningInProgress": "in corso...",
    "reasoningDone": "completato",
    "emptyTitle": "Pronto per riassumere questo video",
    "emptySubtitle": "Estrai punti chiave, capitoli e conclusioni in pochi secondi con l'IA.",
    "newVideoTitle": "Nuovo video rilevato",
    "summaryPlaceholder": "Fai clic su \xAB \u2728 Riassumi questo video \xBB per generare il riassunto.",
    "newVideoPlaceholder": "Nuovo video rilevato. Fai clic su \xAB \u2728 Riassumi questo video \xBB per generare il riassunto.",
    "generatingSummary": "Generazione del riassunto in corso...",
    "chatTitle": "\u{1F4AC} Domande & Risposte sul video",
    "clearChatBtn": "\u{1F5D1}\uFE0F Cancella conversazione",
    "suggestions": [
      {
        "label": "\u{1F4A1} Punti chiave",
        "question": "Quali sono i punti chiave essenziali da ricordare?"
      },
      {
        "label": "\u23F1\uFE0F Momenti salienti",
        "question": "In quale momento del video si parla dell'argomento principale?"
      },
      {
        "label": "\u{1F4CA} Dati ed Esempi",
        "question": "Quali esempi, dati o argomenti specifici vengono citati?"
      },
      {
        "label": "\u{1F3AF} Conclusione e Consigli",
        "question": "Cosa consiglia o conclude l'autore alla fine?"
      }
    ],
    "chatWelcome": "Ciao! Fammi qualsiasi domanda sui contenuti di questo video. Mi baso direttamente sulla sua trascrizione integrale.",
    "chatPlaceholder": "Fai una domanda o detta al microfono... (Invio per inviare)",
    "chatInputListening": "\u{1F399}\uFE0F Dettatura attiva... Parla al microfono.",
    "chatResetNotice": "Conversazione reimpostata. Fai una domanda sui contenuti del video!",
    "micTitle": "Detta la tua domanda con il microfono",
    "micStopTitle": "Interrompi dettatura",
    "sendBtn": "Invia \u27A4",
    "transcriptTitle": "\u{1F4DC} Trascrizione integrale",
    "wordsBadge": "parole",
    "copyRawBtn": "\u{1F4CB} Copia testo",
    "transcriptWaiting": "In attesa di estrazione... (Verr\xE0 estratta all'avvio del riassunto o di una domanda)",
    "micActiveNotice": "\u{1F399}\uFE0F Dettatura vocale attiva... Parla ora.",
    "micBlockedNotice": "Microfono bloccato: autorizza l'accesso al microfono in Chrome (icona \u{1F512} a sinistra dell'URL).",
    "micNoDeviceNotice": "Nessun microfono rilevato o dispositivo audio non disponibile.",
    "micNetworkNotice": "Errore di rete Google Speech. Se usi Brave, attiva 'Servizi Google per il riconoscimento vocale' in brave://settings/privacy, o controlla che un adblocker/VPN non blocchi il servizio.",
    "micErrorNotice": "Errore microfono: ",
    "micNotSupportedNotice": "Il riconoscimento vocale non \xE8 supportato in questo browser.",
    "listenBubbleTitle": "Ascolta questa risposta",
    "noSummaryToRead": "Nessun riassunto da leggere al momento.",
    "noTranscriptError": "Impossibile estrarre la trascrizione di questo video. Assicurati che i sottotitoli siano disponibili su YouTube.",
    "selectModelAlert": "Seleziona un modello IA nella barra delle impostazioni sopra.",
    "missingKeyAlert": "Inserisci la tua chiave API per chattare.",
    "advancedOptions": "\u2699\uFE0F Opzioni avanzate (IA, Audio & Automazione)",
    "settingsBtn": "Impostazioni",
    "errorLabel": "Errore: ",
    "settingsHideBtn": "\u2715 Chiudi impostazioni",
    "tabSettingsModel": "\u{1F916} Modello & Server",
    "tabSettingsAudio": "\u{1F399}\uFE0F Voce & Audio",
    "tabSettingsParams": "\u2699\uFE0F Parametri IA",
    "testSttBtn": "\u26A1 Prova STT",
    "customPromptPlaceholder": "es: Insistere sugli aspetti tecnici, spiegare con analogie...",
    "whisperUrlPlaceholder": "es: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "da",
    "footerReportBug": "Segnala un bug",
    "footerDocs": "Documentazione",
    "tempStrict": "0.0 - Rigido & Preciso",
    "tempBalanced": "0.3 - Bilanciato (Predefinito)",
    "tempCreative": "0.7 - Creativo & Dettagliato",
    "tempWild": "1.0 - Molto inventivo",
    "tokensAuto": "Automatico (Predefinito)",
    "tokensShort": "Breve (1.024)",
    "tokensStandard": "Standard (2.048)",
    "tokensDetailed": "Dettagliato (4.096)",
    "tokensMax": "Massimo (8.192)",
    "speedSlow": "0.75x (Calmo)",
    "speedNormal": "1.0x (Normale)",
    "speedFast": "1.25x (Veloce)",
    "speedVeryFast": "1.5x (Accelerato)",
    "speedDouble": "2.0x (Doppio)",
    "tempLabel": "Creativit\xE0 IA (Temperatura):",
    "maxTokensLabel": "Lunghezza max (Tokens):",
    "ttsSpeedLabel": "Velocit\xE0 voce:",
    "whisperUrlLabel": "Server Whisper Locale (Audio STT):",
    "autoSummarizeLabel": "\u26A1 Riassumi automaticamente all'apertura del video",
    "customPromptLabel": "Istruzioni personalizzate per l'IA:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var it_default = it;

  // src/locales/ru.js
  var ru = {
    "brandName": "YT Summarizer AI",
    "checking": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430...",
    "connectedBadge": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    "offlineBadge": "\u041E\u0444\u043B\u0430\u0439\u043D",
    "modelLoading": "\u041C\u043E\u0434\u0435\u043B\u044C: \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",
    "modelPrefix": "\u041C\u043E\u0434\u0435\u043B\u044C: ",
    "summarizeBtn": "\u2728 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443",
    "collapse": "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
    "expand": "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
    "providerLabel": "\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0418\u0418:",
    "groupLocal": "\u{1F3E0} \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 (\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E & \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u043E)",
    "groupFast": "\u26A1 \u0411\u044B\u0441\u0442\u0440\u044B\u0439 / \u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u043E\u0431\u043B\u0430\u0447\u043D\u044B\u0439 \u0438\u043D\u0444\u0435\u0440\u0435\u043D\u0441",
    "groupCloud": "\u2601\uFE0F \u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u043E\u0431\u043B\u0430\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B",
    "serverLabel": "\u0421\u0435\u0440\u0432\u0435\u0440:",
    "serverLabelLm": "\u0421\u0435\u0440\u0432\u0435\u0440 LM Studio:",
    "serverLabelOllama": "\u0421\u0435\u0440\u0432\u0435\u0440 Ollama:",
    "noModelSelected": "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430",
    "keyOk": "\u041A\u043B\u044E\u0447 OK",
    "keyRequired": "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043A\u043B\u044E\u0447",
    "customServer": "\u0414\u0440\u0443\u0433\u043E\u0439 IP...",
    "refreshTooltip": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438",
    "apiKeyLabel": "\u041A\u043B\u044E\u0447 API:",
    "apiKeyPlaceholder": "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0432\u0430\u0448 API-\u043A\u043B\u044E\u0447...",
    "getApiKeyLink": "\u{1F511} \u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043A\u043B\u044E\u0447",
    "modelLabel": "\u041C\u043E\u0434\u0435\u043B\u044C:",
    "testModelBtn": "\u26A1 \u0422\u0435\u0441\u0442",
    "testModelTooltip": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043C\u043E\u0434\u0435\u043B\u044C",
    "langLabel": "\u042F\u0437\u044B\u043A:",
    "formatLabel": "\u0424\u043E\u0440\u043C\u0430\u0442:",
    "formatStandard": "\u{1F4CC} \u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 & \u0441\u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439",
    "formatQuick": "\u26A1 \u041A\u0440\u0430\u0442\u043A\u0438\u0439 & \u0435\u043C\u043A\u0438\u0439",
    "formatDetailed": "\u{1F4DD} \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 & \u0443\u0433\u043B\u0443\u0431\u043B\u0435\u043D\u043D\u044B\u0439",
    "voiceLabel": "\u0413\u043E\u043B\u043E\u0441:",
    "voiceDefault": "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439 \u0433\u043E\u043B\u043E\u0441...",
    "micLabel": "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D:",
    "micDefault": "\u{1F399}\uFE0F \u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "tabSummary": "\u{1F4DD} \u0418\u0418-\u0421\u0432\u043E\u0434\u043A\u0430",
    "tabChat": "\u{1F4AC} \u0417\u0430\u0434\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441",
    "tabTranscript": "\u{1F4DC} \u0422\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044F",
    "summaryTitle": "\u{1F4DD} \u0418\u0418-\u0421\u0432\u043E\u0434\u043A\u0430",
    "listenBtn": "\u{1F50A} \u0421\u043B\u0443\u0448\u0430\u0442\u044C",
    "stopListenBtn": "\u23F9\uFE0F \u0421\u0442\u043E\u043F",
    "copyBtn": "\u{1F4CB} \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "copiedBtn": "\u2705 \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E!",
    "saveMdBtn": "\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C .md",
    "reasoningModel": "\u{1F4AD} \u0420\u0430\u0441\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u044F \u043C\u043E\u0434\u0435\u043B\u0438",
    "reasoningInProgress": "\u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435...",
    "reasoningDone": "\u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
    "emptyTitle": "\u0413\u043E\u0442\u043E\u0432\u044B \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E",
    "emptySubtitle": "\u0418\u0437\u0432\u043B\u0435\u043A\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0442\u0435\u0437\u0438\u0441\u044B, \u0433\u043B\u0430\u0432\u044B \u0438 \u0432\u044B\u0432\u043E\u0434\u044B \u0437\u0430 \u0441\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u0435 \u0441\u0435\u043A\u0443\u043D\u0434\u044B \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0418\u0418.",
    "newVideoTitle": "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E \u043D\u043E\u0432\u043E\u0435 \u0432\u0438\u0434\u0435\u043E",
    "summaryPlaceholder": "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB \u2728 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \xBB, \u0447\u0442\u043E\u0431\u044B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435.",
    "newVideoPlaceholder": "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E \u043D\u043E\u0432\u043E\u0435 \u0432\u0438\u0434\u0435\u043E. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB \u2728 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \xBB.",
    "generatingSummary": "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0441\u0432\u043E\u0434\u043A\u0438...",
    "chatTitle": "\u{1F4AC} \u0412\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0432\u0435\u0442\u044B \u043F\u043E \u0432\u0438\u0434\u0435\u043E",
    "clearChatBtn": "\u{1F5D1}\uFE0F \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433",
    "suggestions": [
      {
        "label": "\u{1F4A1} \u0413\u043B\u0430\u0432\u043D\u044B\u0435 \u043C\u044B\u0441\u043B\u0438",
        "question": "\u041A\u0430\u043A\u043E\u0432\u044B \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0438 \u0438\u0434\u0435\u0438 \u0438\u0437 \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E?"
      },
      {
        "label": "\u23F1\uFE0F \u0422\u0430\u0439\u043C\u043A\u043E\u0434\u044B",
        "question": "\u0412 \u043A\u0430\u043A\u043E\u0439 \u043C\u043E\u043C\u0435\u043D\u0442 \u0432\u0438\u0434\u0435\u043E \u0430\u0432\u0442\u043E\u0440 \u0433\u043E\u0432\u043E\u0440\u0438\u0442 \u043E \u0433\u043B\u0430\u0432\u043D\u043E\u0439 \u0442\u0435\u043C\u0435?"
      },
      {
        "label": "\u{1F4CA} \u0424\u0430\u043A\u0442\u044B \u0438 \u0446\u0438\u0444\u0440\u044B",
        "question": "\u041A\u0430\u043A\u0438\u0435 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u043F\u0440\u0438\u043C\u0435\u0440\u044B, \u0446\u0438\u0444\u0440\u044B \u0438\u043B\u0438 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u0440\u0438\u0432\u043E\u0434\u044F\u0442\u0441\u044F?"
      },
      {
        "label": "\u{1F3AF} \u0412\u044B\u0432\u043E\u0434 \u0438 \u0441\u043E\u0432\u0435\u0442\u044B",
        "question": "\u041A \u043A\u0430\u043A\u043E\u043C\u0443 \u0432\u044B\u0432\u043E\u0434\u0443 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u0430\u0432\u0442\u043E\u0440 \u0438 \u0447\u0442\u043E \u0441\u043E\u0432\u0435\u0442\u0443\u0435\u0442 \u0432 \u043A\u043E\u043D\u0446\u0435?"
      }
    ],
    "chatWelcome": "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u043C\u043D\u0435 \u043B\u044E\u0431\u043E\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0438 \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E. \u042F \u043E\u043F\u0438\u0440\u0430\u044E\u0441\u044C \u0438\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043D\u0430 \u0435\u0433\u043E \u043F\u043E\u043B\u043D\u0443\u044E \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044E.",
    "chatPlaceholder": "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u0438\u043B\u0438 \u043F\u0440\u043E\u0434\u0438\u043A\u0442\u0443\u0439\u0442\u0435 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D... (Enter \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438)",
    "chatInputListening": "\u{1F399}\uFE0F \u0418\u0434\u0435\u0442 \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0430... \u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D.",
    "chatResetNotice": "\u0414\u0438\u0430\u043B\u043E\u0433 \u0441\u0431\u0440\u043E\u0448\u0435\u043D. \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0438 \u0432\u0438\u0434\u0435\u043E!",
    "micTitle": "\u041F\u0440\u043E\u0434\u0438\u043A\u0442\u043E\u0432\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D",
    "micStopTitle": "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0443",
    "sendBtn": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u27A4",
    "transcriptTitle": "\u{1F4DC} \u041F\u043E\u043B\u043D\u0430\u044F \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0446\u0438\u044F",
    "wordsBadge": "\u0441\u043B\u043E\u0432",
    "copyRawBtn": "\u{1F4CB} \u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442",
    "transcriptWaiting": "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F... (\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0441\u044F \u043F\u0440\u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0438 \u0441\u0432\u043E\u0434\u043A\u0438 \u0438\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u0435)",
    "micActiveNotice": "\u{1F399}\uFE0F \u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u044F \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u0430... \u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435.",
    "micBlockedNotice": "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D: \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443 \u0432 Chrome (\u0437\u043D\u0430\u0447\u043E\u043A \u{1F512} \u0441\u043B\u0435\u0432\u0430 \u043E\u0442 URL).",
    "micNoDeviceNotice": "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D \u0438\u043B\u0438 \u0430\u0443\u0434\u0438\u043E\u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.",
    "micNetworkNotice": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438 Google Speech. \u0415\u0441\u043B\u0438 \u0432\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0435 Brave, \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 '\u0421\u043B\u0443\u0436\u0431\u044B Google \u0434\u043B\u044F \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438' \u0432 brave://settings/privacy, \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0449\u0438\u043A/VPN.",
    "micErrorNotice": "\u041E\u0448\u0438\u0431\u043A\u0430 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0430: ",
    "micNotSupportedNotice": "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
    "listenBubbleTitle": "\u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u043E\u0442\u0432\u0435\u0442",
    "noSummaryToRead": "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0441\u0432\u043E\u0434\u043A\u0438 \u0434\u043B\u044F \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u044F.",
    "noTranscriptError": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u043D\u0430 YouTube.",
    "selectModelAlert": "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044C \u0418\u0418 \u043D\u0430 \u043F\u0430\u043D\u0435\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u0432\u044B\u0448\u0435.",
    "missingKeyAlert": "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0430\u0448 API-\u043A\u043B\u044E\u0447 \u0434\u043B\u044F \u043E\u0431\u0449\u0435\u043D\u0438\u044F.",
    "advancedOptions": "\u2699\uFE0F \u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 (\u0418\u0418, \u0410\u0443\u0434\u0438\u043E & \u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F)",
    "settingsBtn": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "errorLabel": "\u041E\u0448\u0438\u0431\u043A\u0430: ",
    "settingsHideBtn": "\u2715 \u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "tabSettingsModel": "\u{1F916} \u041C\u043E\u0434\u0435\u043B\u044C \u0438 \u0421\u0435\u0440\u0432\u0435\u0440",
    "tabSettingsAudio": "\u{1F399}\uFE0F \u0413\u043E\u043B\u043E\u0441 \u0438 \u0410\u0443\u0434\u0438\u043E",
    "tabSettingsParams": "\u2699\uFE0F \u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0418\u0418",
    "testSttBtn": "\u26A1 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C STT",
    "customPromptPlaceholder": "\u043D\u0430\u043F\u0440.: \u0412\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0434\u0435\u0442\u0430\u043B\u0438, \u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u0442\u044B\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438...",
    "whisperUrlPlaceholder": "\u043D\u0430\u043F\u0440.: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "\u043E\u0442",
    "footerReportBug": "\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C \u043E\u0431 \u043E\u0448\u0438\u0431\u043A\u0435",
    "footerDocs": "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F",
    "tempStrict": "0.0 - \u0422\u043E\u0447\u043D\u044B\u0439 \u0438 \u0441\u0442\u0440\u043E\u0433\u0438\u0439",
    "tempBalanced": "0.3 - \u0421\u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 (\u041F\u043E \u0443\u043C\u043E\u043B\u0447.)",
    "tempCreative": "0.7 - \u0422\u0432\u043E\u0440\u0447\u0435\u0441\u043A\u0438\u0439 \u0438 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439",
    "tempWild": "1.0 - \u041E\u0447\u0435\u043D\u044C \u0438\u0437\u043E\u0431\u0440\u0435\u0442\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439",
    "tokensAuto": "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 (\u041F\u043E \u0443\u043C\u043E\u043B\u0447.)",
    "tokensShort": "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 (1 024)",
    "tokensStandard": "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 (2 048)",
    "tokensDetailed": "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 (4 096)",
    "tokensMax": "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C (8 192)",
    "speedSlow": "0.75x (\u0421\u043F\u043E\u043A\u043E\u0439\u043D\u043E)",
    "speedNormal": "1.0x (\u041E\u0431\u044B\u0447\u043D\u043E)",
    "speedFast": "1.25x (\u0411\u044B\u0441\u0442\u0440\u043E)",
    "speedVeryFast": "1.5x (\u0423\u0441\u043A\u043E\u0440\u0435\u043D\u043E)",
    "speedDouble": "2.0x (\u0414\u0432\u043E\u0439\u043D\u0430\u044F)",
    "tempLabel": "\u041A\u0440\u0435\u0430\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0418\u0418 (\u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430):",
    "maxTokensLabel": "\u041C\u0430\u043A\u0441. \u0434\u043B\u0438\u043D\u0430 (\u0422\u043E\u043A\u0435\u043D\u044B):",
    "ttsSpeedLabel": "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0440\u0435\u0447\u0438:",
    "whisperUrlLabel": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0435\u0440 Whisper (Audio STT):",
    "autoSummarizeLabel": "\u26A1 \u0410\u0432\u0442\u043E-\u0441\u0430\u043C\u043C\u0430\u0440\u0438 \u043F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u0432\u0438\u0434\u0435\u043E",
    "customPromptLabel": "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u0434\u043B\u044F \u0418\u0418:",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var ru_default = ru;

  // src/locales/ja.js
  var ja = {
    "brandName": "YT Summarizer AI",
    "checking": "\u78BA\u8A8D\u4E2D...",
    "connectedBadge": "\u63A5\u7D9A\u6E08\u307F",
    "offlineBadge": "\u30AA\u30D5\u30E9\u30A4\u30F3",
    "modelLoading": "\u30E2\u30C7\u30EB: \u8AAD\u307F\u8FBC\u307F\u4E2D...",
    "modelPrefix": "\u30E2\u30C7\u30EB: ",
    "summarizeBtn": "\u2728 \u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B",
    "collapse": "\u6298\u308A\u305F\u305F\u3080",
    "expand": "\u5C55\u958B\u3059\u308B",
    "providerLabel": "AI\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC:",
    "groupLocal": "\u{1F3E0} \u30ED\u30FC\u30AB\u30EB\u30E2\u30C7\u30EB (\u7121\u6599 & \u30D7\u30E9\u30A4\u30D9\u30FC\u30C8)",
    "groupFast": "\u26A1 \u9AD8\u901F / \u7121\u6599\u30AF\u30E9\u30A6\u30C9\u63A8\u8AD6",
    "groupCloud": "\u2601\uFE0F \u4E3B\u8981\u30AF\u30E9\u30A6\u30C9\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC",
    "serverLabel": "\u30B5\u30FC\u30D0\u30FC:",
    "serverLabelLm": "LM Studio \u30B5\u30FC\u30D0\u30FC:",
    "serverLabelOllama": "Ollama \u30B5\u30FC\u30D0\u30FC:",
    "noModelSelected": "\u30E2\u30C7\u30EB\u304C\u9078\u629E\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    "keyOk": "\u30AD\u30FC OK",
    "keyRequired": "\u30AD\u30FC\u304C\u5FC5\u8981",
    "customServer": "\u30AB\u30B9\u30BF\u30E0IP...",
    "refreshTooltip": "\u30ED\u30FC\u30AB\u30EB\u30E2\u30C7\u30EB\u3092\u518D\u8AAD\u307F\u8FBC\u307F",
    "apiKeyLabel": "API\u30AD\u30FC:",
    "apiKeyPlaceholder": "API\u30AD\u30FC\u3092\u8CBC\u308A\u4ED8\u3051...",
    "getApiKeyLink": "\u{1F511} API\u30AD\u30FC\u3092\u53D6\u5F97",
    "modelLabel": "\u30E2\u30C7\u30EB:",
    "testModelBtn": "\u26A1 \u30C6\u30B9\u30C8",
    "testModelTooltip": "\u63A5\u7D9A\u3068\u30E2\u30C7\u30EB\u3092\u30C6\u30B9\u30C8",
    "langLabel": "\u8A00\u8A9E:",
    "formatLabel": "\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8:",
    "formatStandard": "\u{1F4CC} \u81EA\u7136\u3067\u30D0\u30E9\u30F3\u30B9\u306E\u826F\u3044\u69CB\u6210",
    "formatQuick": "\u26A1 \u7C21\u6F54\u30FB\u8981\u70B9\u91CD\u8996",
    "formatDetailed": "\u{1F4DD} \u8A73\u7D30\u30FB\u5FB9\u5E95\u89E3\u8AAC",
    "voiceLabel": "\u97F3\u58F0:",
    "voiceDefault": "\u30B7\u30B9\u30C6\u30E0\u97F3\u58F0...",
    "micLabel": "\u30DE\u30A4\u30AF:",
    "micDefault": "\u{1F399}\uFE0F \u30C7\u30D5\u30A9\u30EB\u30C8\u30DE\u30A4\u30AF",
    "tabSummary": "\u{1F4DD} AI\u8981\u7D04",
    "tabChat": "\u{1F4AC} \u8CEA\u554F\u3059\u308B",
    "tabTranscript": "\u{1F4DC} \u6587\u5B57\u8D77\u3053\u3057",
    "summaryTitle": "\u{1F4DD} AI\u8981\u7D04",
    "listenBtn": "\u{1F50A} \u97F3\u58F0\u518D\u751F",
    "stopListenBtn": "\u23F9\uFE0F \u505C\u6B62",
    "copyBtn": "\u{1F4CB} \u30B3\u30D4\u30FC",
    "copiedBtn": "\u2705 \u30B3\u30D4\u30FC\u5B8C\u4E86\uFF01",
    "saveMdBtn": "\u{1F4BE} .md \u4FDD\u5B58",
    "reasoningModel": "\u{1F4AD} \u30E2\u30C7\u30EB\u306E\u601D\u8003\u30D7\u30ED\u30BB\u30B9",
    "reasoningInProgress": "\u601D\u8003\u4E2D...",
    "reasoningDone": "\u5B8C\u4E86",
    "emptyTitle": "\u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B\u6E96\u5099\u304C\u6574\u3044\u307E\u3057\u305F",
    "emptySubtitle": "AI\u3092\u4F7F\u3063\u3066\u91CD\u8981\u306A\u30DD\u30A4\u30F3\u30C8\u3001\u30C1\u30E3\u30D7\u30BF\u30FC\u3001\u8981\u70B9\u3092\u6570\u79D2\u3067\u62BD\u51FA\u3057\u307E\u3059\u3002",
    "newVideoTitle": "\u65B0\u3057\u3044\u52D5\u753B\u304C\u691C\u51FA\u3055\u308C\u307E\u3057\u305F",
    "summaryPlaceholder": "\u300C \u2728 \u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B \u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8981\u7D04\u3092\u751F\u6210\u3057\u307E\u3059\u3002",
    "newVideoPlaceholder": "\u65B0\u3057\u3044\u52D5\u753B\u304C\u691C\u51FA\u3055\u308C\u307E\u3057\u305F\u3002\u300C \u2728 \u3053\u306E\u52D5\u753B\u3092\u8981\u7D04\u3059\u308B \u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "generatingSummary": "\u8981\u7D04\u3092\u751F\u6210\u4E2D...",
    "chatTitle": "\u{1F4AC} \u52D5\u753B\u306B\u3064\u3044\u3066\u306EQ&A",
    "clearChatBtn": "\u{1F5D1}\uFE0F \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u3092\u6D88\u53BB",
    "suggestions": [
      {
        "label": "\u{1F4A1} \u8981\u70B9\u307E\u3068\u3081",
        "question": "\u3053\u306E\u52D5\u753B\u306E\u6700\u3082\u91CD\u8981\u306A\u30AD\u30FC\u30DD\u30A4\u30F3\u30C8\u306F\u4F55\u3067\u3059\u304B\uFF1F"
      },
      {
        "label": "\u23F1\uFE0F \u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7",
        "question": "\u52D5\u753B\u306E\u3069\u306E\u90E8\u5206\u3067\u30E1\u30A4\u30F3\u30C6\u30FC\u30DE\u306B\u3064\u3044\u3066\u8A71\u3057\u3066\u3044\u307E\u3059\u304B\uFF1F"
      },
      {
        "label": "\u{1F4CA} \u30C7\u30FC\u30BF\u3068\u5177\u4F53\u4F8B",
        "question": "\u5177\u4F53\u7684\u306B\u3069\u306E\u3088\u3046\u306A\u30C7\u30FC\u30BF\u3001\u4E8B\u4F8B\u3001\u8AD6\u62E0\u304C\u6319\u3052\u3089\u308C\u3066\u3044\u307E\u3059\u304B\uFF1F"
      },
      {
        "label": "\u{1F3AF} \u7D50\u8AD6\u3068\u30A2\u30C9\u30D0\u30A4\u30B9",
        "question": "\u52D5\u753B\u306E\u6700\u5F8C\u3067\u8457\u8005\u306F\u3069\u306E\u3088\u3046\u306A\u7D50\u8AD6\u3084\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u8FF0\u3079\u3066\u3044\u307E\u3059\u304B\uFF1F"
      }
    ],
    "chatWelcome": "\u3053\u3093\u306B\u3061\u306F\uFF01\u3053\u306E\u52D5\u753B\u306E\u5185\u5BB9\u306B\u3064\u3044\u3066\u4F55\u3067\u3082\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u52D5\u753B\u5168\u4F53\u306E\u6587\u5B57\u8D77\u3053\u3057\u306B\u57FA\u3065\u3044\u3066\u56DE\u7B54\u3057\u307E\u3059\u3002",
    "chatPlaceholder": "\u8CEA\u554F\u3092\u5165\u529B\u3059\u308B\u304B\u30DE\u30A4\u30AF\u3067\u97F3\u58F0\u5165\u529B... (Enter\u3067\u9001\u4FE1)",
    "chatInputListening": "\u{1F399}\uFE0F \u97F3\u58F0\u5165\u529B\u4E2D... \u30DE\u30A4\u30AF\u306B\u5411\u304B\u3063\u3066\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "chatResetNotice": "\u4F1A\u8A71\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002\u52D5\u753B\u306E\u5185\u5BB9\u306B\u3064\u3044\u3066\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\uFF01",
    "micTitle": "\u30DE\u30A4\u30AF\u3067\u8CEA\u554F\u3092\u97F3\u58F0\u5165\u529B",
    "micStopTitle": "\u97F3\u58F0\u5165\u529B\u3092\u505C\u6B62",
    "sendBtn": "\u9001\u4FE1 \u27A4",
    "transcriptTitle": "\u{1F4DC} \u5168\u6587\u5B57\u8D77\u3053\u3057",
    "wordsBadge": "\u8A9E",
    "copyRawBtn": "\u{1F4CB} \u30C6\u30AD\u30B9\u30C8\u3092\u30B3\u30D4\u30FC",
    "transcriptWaiting": "\u6587\u5B57\u8D77\u3053\u3057\u3092\u5F85\u6A5F\u4E2D... (\u8981\u7D04\u306E\u958B\u59CB\u307E\u305F\u306F\u8CEA\u554F\u6642\u306B\u53D6\u5F97\u3055\u308C\u307E\u3059)",
    "micActiveNotice": "\u{1F399}\uFE0F \u97F3\u58F0\u5165\u529B\u304C\u6709\u52B9\u3067\u3059... \u304A\u8A71\u3057\u304F\u3060\u3055\u3044\u3002",
    "micBlockedNotice": "\u30DE\u30A4\u30AF\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059: Chrome\u3067\u30DE\u30A4\u30AF\u306E\u4F7F\u7528\u3092\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\uFF08URL\u306E\u5DE6\u5074\u306B\u3042\u308B \u{1F512} \u30A2\u30A4\u30B3\u30F3\uFF09\u3002",
    "micNoDeviceNotice": "\u30DE\u30A4\u30AF\u304C\u691C\u51FA\u3055\u308C\u306A\u3044\u304B\u3001\u30AA\u30FC\u30C7\u30A3\u30AA\u30C7\u30D0\u30A4\u30B9\u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
    "micNetworkNotice": "Google\u97F3\u58F0\u8A8D\u8B58\u306E\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30A8\u30E9\u30FC\u3002Brave\u3092\u3054\u4F7F\u7528\u306E\u5834\u5408\u306F brave://settings/privacy \u3067\u300C\u97F3\u58F0\u8A8D\u8B58\u306BGoogle\u30B5\u30FC\u30D3\u30B9\u3092\u4F7F\u7528\u300D\u3092\u6709\u52B9\u306B\u3059\u308B\u304B\u3001\u5E83\u544A\u30D6\u30ED\u30C3\u30AB\u30FC\u306E\u8A2D\u5B9A\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002",
    "micErrorNotice": "\u30DE\u30A4\u30AF\u30A8\u30E9\u30FC: ",
    "micNotSupportedNotice": "\u304A\u4F7F\u3044\u306E\u30D6\u30E9\u30A6\u30B6\u306F\u97F3\u58F0\u8A8D\u8B58\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093\u3002",
    "listenBubbleTitle": "\u3053\u306E\u56DE\u7B54\u3092\u8AAD\u307F\u4E0A\u3052\u308B",
    "noSummaryToRead": "\u8AAD\u307F\u4E0A\u3052\u308B\u8981\u7D04\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",
    "noTranscriptError": "\u56DE\u7B54\u306B\u5FC5\u8981\u306A\u52D5\u753B\u306E\u6587\u5B57\u8D77\u3053\u3057\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002YouTube\u3067\u5B57\u5E55\u304C\u5229\u7528\u53EF\u80FD\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "selectModelAlert": "\u4E0A\u306E\u8A2D\u5B9A\u30D0\u30FC\u3067AI\u30E2\u30C7\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "missingKeyAlert": "\u30C1\u30E3\u30C3\u30C8\u3092\u5229\u7528\u3059\u308B\u306B\u306FAPI\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "advancedOptions": "\u2699\uFE0F \u8A73\u7D30\u8A2D\u5B9A (AI\u30FB\u97F3\u58F0\u30FB\u81EA\u52D5\u5316)",
    "settingsBtn": "\u8A2D\u5B9A",
    "errorLabel": "\u30A8\u30E9\u30FC: ",
    "settingsHideBtn": "\u2715 \u8A2D\u5B9A\u3092\u9589\u3058\u308B",
    "tabSettingsModel": "\u{1F916} AI\u30E2\u30C7\u30EB & \u30B5\u30FC\u30D0\u30FC",
    "tabSettingsAudio": "\u{1F399}\uFE0F \u97F3\u58F0 & \u30AA\u30FC\u30C7\u30A3\u30AA",
    "tabSettingsParams": "\u2699\uFE0F AI\u30D1\u30E9\u30E1\u30FC\u30BF & \u6307\u793A",
    "testSttBtn": "\u26A1 STT\u30C6\u30B9\u30C8",
    "customPromptPlaceholder": "\u4F8B: \u6280\u8853\u7684\u306A\u8A73\u7D30\u306B\u7126\u70B9\u3092\u5F53\u3066\u3001\u6BD4\u55A9\u3092\u4F7F\u3063\u3066\u8AAC\u660E\u3059\u308B...",
    "whisperUrlPlaceholder": "\u4F8B: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "\u4F5C\u6210\u8005:",
    "footerReportBug": "\u30D0\u30B0\u3092\u5831\u544A",
    "footerDocs": "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8",
    "tempStrict": "0.0 - \u53B3\u683C\u3067\u6B63\u78BA",
    "tempBalanced": "0.3 - \u30D0\u30E9\u30F3\u30B9\u91CD\u8996 (\u63A8\u5968)",
    "tempCreative": "0.7 - \u5275\u9020\u7684\u3067\u8A73\u7D30",
    "tempWild": "1.0 - \u72EC\u5275\u7684",
    "tokensAuto": "\u81EA\u52D5 (\u6A19\u6E96)",
    "tokensShort": "\u77ED\u3044 (1,024\u30C8\u30FC\u30AF\u30F3)",
    "tokensStandard": "\u6A19\u6E96 (2,048\u30C8\u30FC\u30AF\u30F3)",
    "tokensDetailed": "\u8A73\u7D30 (4,096\u30C8\u30FC\u30AF\u30F3)",
    "tokensMax": "\u6700\u5927 (8,192\u30C8\u30FC\u30AF\u30F3)",
    "speedSlow": "0.75x (\u3086\u3063\u304F\u308A)",
    "speedNormal": "1.0x (\u6A19\u6E96)",
    "speedFast": "1.25x (\u901F\u3044)",
    "speedVeryFast": "1.5x (\u500D\u901F)",
    "speedDouble": "2.0x (2\u500D\u901F)",
    "tempLabel": "AI\u5275\u9020\u6027 (\u6E29\u5EA6):",
    "maxTokensLabel": "\u6700\u5927\u30C8\u30FC\u30AF\u30F3\u6570:",
    "ttsSpeedLabel": "\u97F3\u58F0\u8AAD\u307F\u4E0A\u3052\u901F\u5EA6:",
    "whisperUrlLabel": "\u30ED\u30FC\u30AB\u30EBWhisper\u30B5\u30FC\u30D0\u30FC (\u97F3\u58F0STT):",
    "autoSummarizeLabel": "\u26A1 \u52D5\u753B\u3092\u958B\u3044\u305F\u6642\u306B\u81EA\u52D5\u8981\u7D04",
    "customPromptLabel": "AI\u3078\u306E\u30AB\u30B9\u30BF\u30E0\u6307\u793A (\u4EFB\u610F):",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var ja_default = ja;

  // src/locales/zh.js
  var zh = {
    "brandName": "YT Summarizer AI",
    "checking": "\u68C0\u67E5\u4E2D...",
    "connectedBadge": "\u5DF2\u8FDE\u63A5",
    "offlineBadge": "\u79BB\u7EBF",
    "modelLoading": "\u6A21\u578B: \u52A0\u8F7D\u4E2D...",
    "modelPrefix": "\u6A21\u578B: ",
    "summarizeBtn": "\u2728 \u603B\u7ED3\u6B64\u89C6\u9891",
    "collapse": "\u6298\u53E0",
    "expand": "\u5C55\u5F00",
    "providerLabel": "AI \u63D0\u4F9B\u5546:",
    "groupLocal": "\u{1F3E0} \u672C\u5730\u6A21\u578B (\u514D\u8D39 & \u9690\u79C1)",
    "groupFast": "\u26A1 \u5FEB\u901F / \u514D\u8D39\u4E91\u7AEF\u63A8\u7406",
    "groupCloud": "\u2601\uFE0F \u4E3B\u6D41\u4E91\u7AEF\u63D0\u4F9B\u5546",
    "serverLabel": "\u670D\u52A1\u5668:",
    "serverLabelLm": "LM Studio \u670D\u52A1\u5668:",
    "serverLabelOllama": "Ollama \u670D\u52A1\u5668:",
    "noModelSelected": "\u672A\u9009\u62E9\u6A21\u578B",
    "keyOk": "\u5BC6\u94A5\u6B63\u5E38",
    "keyRequired": "\u9700\u8981\u5BC6\u94A5",
    "customServer": "\u81EA\u5B9A\u4E49IP...",
    "refreshTooltip": "\u5237\u65B0\u672C\u5730\u6A21\u578B",
    "apiKeyLabel": "API \u5BC6\u94A5:",
    "apiKeyPlaceholder": "\u7C98\u8D34\u60A8\u7684 API \u5BC6\u94A5...",
    "getApiKeyLink": "\u{1F511} \u83B7\u53D6\u5BC6\u94A5",
    "modelLabel": "\u6A21\u578B:",
    "testModelBtn": "\u26A1 \u6D4B\u8BD5",
    "testModelTooltip": "\u6D4B\u8BD5\u8FDE\u63A5\u4E0E\u6A21\u578B",
    "langLabel": "\u8BED\u8A00:",
    "formatLabel": "\u683C\u5F0F:",
    "formatStandard": "\u{1F4CC} \u81EA\u7136\u5747\u8861",
    "formatQuick": "\u26A1 \u77ED\u5C0F\u7CBE\u70BC",
    "formatDetailed": "\u{1F4DD} \u8BE6\u7EC6\u6DF1\u5165",
    "voiceLabel": "\u8BED\u97F3:",
    "voiceDefault": "\u7CFB\u7EDF\u8BED\u97F3...",
    "micLabel": "\u9EA6\u514B\u98CE:",
    "micDefault": "\u{1F399}\uFE0F \u9ED8\u8BA4\u9EA6\u514B\u98CE",
    "tabSummary": "\u{1F4DD} AI \u6458\u8981",
    "tabChat": "\u{1F4AC} \u63D0\u95EE\u4E92\u52A8",
    "tabTranscript": "\u{1F4DC} \u9010\u5B57\u7A3F",
    "summaryTitle": "\u{1F4DD} AI \u6458\u8981",
    "listenBtn": "\u{1F50A} \u6717\u8BFB",
    "stopListenBtn": "\u23F9\uFE0F \u505C\u6B62",
    "copyBtn": "\u{1F4CB} \u590D\u5236",
    "copiedBtn": "\u2705 \u5DF2\u590D\u5236\uFF01",
    "saveMdBtn": "\u{1F4BE} \u4FDD\u5B58 .md",
    "reasoningModel": "\u{1F4AD} \u6A21\u578B\u601D\u8003\u8FC7\u7A0B",
    "reasoningInProgress": "\u601D\u8003\u4E2D...",
    "reasoningDone": "\u5DF2\u5B8C\u6210",
    "emptyTitle": "\u5DF2\u51C6\u5907\u597D\u603B\u7ED3\u6B64\u89C6\u9891",
    "emptySubtitle": "\u4F7F\u7528 AI \u5728\u51E0\u79D2\u5185\u63D0\u53D6\u6838\u5FC3\u8981\u70B9\u3001\u7AE0\u8282\u548C\u5173\u952E\u7ED3\u8BBA\u3002",
    "newVideoTitle": "\u68C0\u6D4B\u5230\u65B0\u89C6\u9891",
    "summaryPlaceholder": "\u70B9\u51FB\u300C \u2728 \u603B\u7ED3\u6B64\u89C6\u9891 \u300D\u4EE5\u751F\u6210\u6458\u8981\u5185\u5BB9\u3002",
    "newVideoPlaceholder": "\u68C0\u6D4B\u5230\u65B0\u89C6\u9891\u3002\u70B9\u51FB\u300C \u2728 \u603B\u7ED3\u6B64\u89C6\u9891 \u300D\u4EE5\u751F\u6210\u6458\u8981\u3002",
    "generatingSummary": "\u6B63\u5728\u751F\u6210\u6458\u8981...",
    "chatTitle": "\u{1F4AC} \u89C6\u9891\u95EE\u7B54\u4E92\u52A8",
    "clearChatBtn": "\u{1F5D1}\uFE0F \u6E05\u7A7A\u5BF9\u8BDD",
    "suggestions": [
      {
        "label": "\u{1F4A1} \u6838\u5FC3\u8981\u70B9",
        "question": "\u8FD9\u4E2A\u89C6\u9891\u6700\u6838\u5FC3\u7684\u5173\u952E\u7ED3\u8BBA\u662F\u4EC0\u4E48\uFF1F"
      },
      {
        "label": "\u23F1\uFE0F \u65F6\u95F4\u7EBF\u5B9A\u4F4D",
        "question": "\u89C6\u9891\u5728\u54EA\u4E2A\u65F6\u95F4\u70B9\u8C08\u5230\u4E86\u6838\u5FC3\u4E3B\u9898\uFF1F"
      },
      {
        "label": "\u{1F4CA} \u5173\u952E\u6570\u636E\u4E0E\u6848\u4F8B",
        "question": "\u4F5C\u8005\u63D0\u5230\u4E86\u54EA\u4E9B\u5177\u4F53\u6570\u636E\u3001\u6848\u4F8B\u6216\u8BBA\u636E\uFF1F"
      },
      {
        "label": "\u{1F3AF} \u7ED3\u8BBA\u4E0E\u5EFA\u8BAE",
        "question": "\u4F5C\u8005\u5728\u6700\u540E\u7ED9\u51FA\u4E86\u4EC0\u4E48\u603B\u7ED3\u6216\u5B9E\u7528\u5EFA\u8BAE\uFF1F"
      }
    ],
    "chatWelcome": "\u60A8\u597D\uFF01\u5173\u4E8E\u8FD9\u4E2A\u89C6\u9891\u7684\u4EFB\u4F55\u5185\u5BB9\uFF0C\u6B22\u8FCE\u968F\u65F6\u5411\u6211\u63D0\u95EE\u3002\u6211\u5C06\u5B8C\u5168\u6839\u636E\u89C6\u9891\u7684\u5B8C\u6574\u5B57\u5E55\u9010\u5B57\u7A3F\u4E3A\u60A8\u89E3\u7B54\u3002",
    "chatPlaceholder": "\u8F93\u5165\u95EE\u9898\u6216\u4F7F\u7528\u9EA6\u514B\u98CE\u8BED\u97F3\u8F93\u5165... (\u6309 Enter \u53D1\u9001)",
    "chatInputListening": "\u{1F399}\uFE0F \u6B63\u5728\u8BED\u97F3\u8F93\u5165... \u8BF7\u5BF9\u7740\u9EA6\u514B\u98CE\u8BF4\u8BDD\u3002",
    "chatResetNotice": "\u5BF9\u8BDD\u5DF2\u91CD\u7F6E\u3002\u6B22\u8FCE\u8BE2\u95EE\u5173\u4E8E\u89C6\u9891\u5185\u5BB9\u7684\u4EFB\u4F55\u95EE\u9898\uFF01",
    "micTitle": "\u4F7F\u7528\u9EA6\u514B\u98CE\u8BED\u97F3\u8F93\u5165\u95EE\u9898",
    "micStopTitle": "\u505C\u6B62\u8BED\u97F3\u8F93\u5165",
    "sendBtn": "\u53D1\u9001 \u27A4",
    "transcriptTitle": "\u{1F4DC} \u5B8C\u6574\u9010\u5B57\u7A3F",
    "wordsBadge": "\u5B57",
    "copyRawBtn": "\u{1F4CB} \u590D\u5236\u7EAF\u6587\u672C",
    "transcriptWaiting": "\u7B49\u5F85\u63D0\u53D6\u4E2D... (\u5C06\u5728\u751F\u6210\u6458\u8981\u6216\u63D0\u95EE\u65F6\u81EA\u52A8\u52A0\u8F7D)",
    "micActiveNotice": "\u{1F399}\uFE0F \u8BED\u97F3\u8F93\u5165\u5DF2\u6FC0\u6D3B... \u8BF7\u5F00\u59CB\u8BF4\u8BDD\u3002",
    "micBlockedNotice": "\u9EA6\u514B\u98CE\u5DF2\u88AB\u963B\u6B62\uFF1A\u8BF7\u5728 Chrome \u4E2D\u5141\u8BB8\u9EA6\u514B\u98CE\u6743\u9650\uFF08\u70B9\u51FB\u7F51\u5740\u5DE6\u4FA7\u7684 \u{1F512} \u56FE\u6807\uFF09\u3002",
    "micNoDeviceNotice": "\u672A\u68C0\u6D4B\u5230\u9EA6\u514B\u98CE\u6216\u97F3\u9891\u8BBE\u5907\u4E0D\u53EF\u7528\u3002",
    "micNetworkNotice": "Google \u8BED\u97F3\u670D\u52A1\u7F51\u7EDC\u9519\u8BEF\u3002\u82E5\u4F7F\u7528 Brave \u6D4F\u89C8\u5668\uFF0C\u8BF7\u5728 brave://settings/privacy \u4E2D\u542F\u7528\u201C\u4F7F\u7528 Google \u8BED\u97F3\u8BC6\u522B\u670D\u52A1\u201D\uFF0C\u6216\u68C0\u67E5\u5E7F\u544A\u62E6\u622A\u63D2\u4EF6/VPN\u8BBE\u7F6E\u3002",
    "micErrorNotice": "\u9EA6\u514B\u98CE\u9519\u8BEF: ",
    "micNotSupportedNotice": "\u6B64\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\u529F\u80FD\u3002",
    "listenBubbleTitle": "\u6717\u8BFB\u6B64\u56DE\u7B54",
    "noSummaryToRead": "\u76EE\u524D\u6682\u65E0\u6458\u8981\u53EF\u4F9B\u6717\u8BFB\u3002",
    "noTranscriptError": "\u65E0\u6CD5\u63D0\u53D6\u8BE5\u89C6\u9891\u7684\u9010\u5B57\u7A3F\u4EE5\u56DE\u7B54\u95EE\u9898\u3002\u8BF7\u786E\u4FDD\u8BE5\u89C6\u9891\u5DF2\u5F00\u542F\u5B57\u5E55\u3002",
    "selectModelAlert": "\u8BF7\u5728\u4E0A\u65B9\u8BBE\u7F6E\u680F\u4E2D\u9009\u62E9\u4E00\u4E2A AI \u6A21\u578B\u3002",
    "missingKeyAlert": "\u8BF7\u8F93\u5165\u60A8\u7684 API \u5BC6\u94A5\u4EE5\u5F00\u59CB\u5BF9\u8BDD\u3002",
    "advancedOptions": "\u2699\uFE0F \u9AD8\u7EA7\u9009\u9879 (AI\u3001\u8BED\u97F3\u4E0E\u81EA\u52A8\u5316)",
    "settingsBtn": "\u8BBE\u7F6E",
    "errorLabel": "\u9519\u8BEF: ",
    "settingsHideBtn": "\u2715 \u5173\u95ED\u8BBE\u7F6E",
    "tabSettingsModel": "\u{1F916} AI\u6A21\u578B\u4E0E\u670D\u52A1\u5668",
    "tabSettingsAudio": "\u{1F399}\uFE0F \u8BED\u97F3\u4E0E\u97F3\u9891",
    "tabSettingsParams": "\u2699\uFE0F AI\u53C2\u6570\u4E0E\u6307\u4EE4",
    "testSttBtn": "\u26A1 \u6D4B\u8BD5\u8BED\u97F3\u8BC6\u522B",
    "customPromptPlaceholder": "\u4F8B\u5982\uFF1A\u7740\u91CD\u6280\u672F\u7EC6\u8282\uFF0C\u4F7F\u7528\u6BD4\u55BB\u6DF1\u5165\u6D45\u51FA...",
    "whisperUrlPlaceholder": "\u4F8B\u5982: http://localhost:8000/v1/audio/transcriptions",
    "footerBy": "\u4F5C\u8005:",
    "footerReportBug": "\u53CD\u9988\u95EE\u9898",
    "footerDocs": "\u4F7F\u7528\u6587\u6863",
    "tempStrict": "0.0 - \u4E25\u8C28\u7CBE\u51C6",
    "tempBalanced": "0.3 - \u5747\u8861 (\u63A8\u8350\u9ED8\u8BA4)",
    "tempCreative": "0.7 - \u5BCC\u6709\u521B\u610F\u4E14\u8BE6\u5C3D",
    "tempWild": "1.0 - \u6781\u5177\u53D1\u6563\u6027",
    "tokensAuto": "\u81EA\u52A8 (\u9ED8\u8BA4)",
    "tokensShort": "\u7CBE\u7B80 (1,024\u8BCD\u5143)",
    "tokensStandard": "\u6807\u51C6 (2,048\u8BCD\u5143)",
    "tokensDetailed": "\u8BE6\u5C3D (4,096\u8BCD\u5143)",
    "tokensMax": "\u6700\u5927 (8,192\u8BCD\u5143)",
    "speedSlow": "0.75x (\u8212\u7F13)",
    "speedNormal": "1.0x (\u6B63\u5E38)",
    "speedFast": "1.25x (\u8F83\u5FEB)",
    "speedVeryFast": "1.5x (\u5FEB\u901F)",
    "speedDouble": "2.0x (\u53CC\u500D)",
    "tempLabel": "AI\u521B\u9020\u529B (\u6E29\u5EA6):",
    "maxTokensLabel": "\u6700\u5927\u957F\u5EA6 (Tokens):",
    "ttsSpeedLabel": "\u8BED\u97F3\u6717\u8BFB\u901F\u5EA6:",
    "whisperUrlLabel": "\u672C\u5730 Whisper \u8BED\u97F3\u8F6C\u5F55\u670D\u52A1\u5668 (STT):",
    "autoSummarizeLabel": "\u26A1 \u6253\u5F00\u89C6\u9891\u65F6\u81EA\u52A8\u751F\u6210\u6458\u8981",
    "customPromptLabel": "AI \u81EA\u5B9A\u4E49\u6307\u4EE4 (\u53EF\u9009):",
    "saveTxtBtn": "\u{1F4C4} .txt",
    "saveJsonBtn": "\u{1F4E6} .json"
  };
  var zh_default = zh;

  // src/locales/index.js
  var I18N = {
    fr: fr_default,
    en: en_default,
    es: es_default,
    de: de_default,
    it: it_default,
    ru: ru_default,
    ja: ja_default,
    zh: zh_default
  };

  // src/services/implementations/I18nService.js
  var I18nService = class extends II18nService {
    /**
     * @param {string} initialLang
     */
    constructor(initialLang = "en") {
      super();
      this.currentLang = I18N[initialLang] ? initialLang : "en";
      this.dictionaries = I18N;
    }
    /**
     * @param {string} langCode
     */
    setLanguage(langCode) {
      if (this.dictionaries[langCode]) {
        this.currentLang = langCode;
      }
    }
    /**
     * @returns {string}
     */
    getLanguage() {
      return this.currentLang;
    }
    /**
     * Resolves translation string for current language with fallback to English
     * @param {string} key
     * @param {Object} [params]
     * @returns {string|any}
     */
    t(key, params = {}) {
      const dict = this.dictionaries[this.currentLang] || this.dictionaries.en;
      let val = dict[key] !== void 0 ? dict[key] : this.dictionaries.en[key] || key;
      if (typeof val === "string" && Object.keys(params).length > 0) {
        for (const [pKey, pVal] of Object.entries(params)) {
          val = val.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
        }
      }
      return val;
    }
    /**
     * @returns {Object}
     */
    getDictionary() {
      return this.dictionaries[this.currentLang] || this.dictionaries.en;
    }
  };

  // src/services/interfaces/IPromptBuilder.js
  var IPromptBuilder = class {
    /**
     * Condenses a long transcript if it exceeds character limits
     * @param {string} text
     * @param {number} maxChars
     * @returns {string}
     */
    condenseTranscript(text, maxChars) {
      throw new Error("Not implemented");
    }
    /**
     * Builds system and user prompts for video summarization
     * @param {string} title
     * @param {string} author
     * @param {string} transcriptText
     * @param {string} targetLang
     * @param {string} formatMode
     * @param {string} [customDirectives]
     * @returns {{ systemPrompt: string, userPrompt: string }}
     */
    buildSummaryPrompts(title, author, transcriptText, targetLang, formatMode, customDirectives = "") {
      throw new Error("Not implemented");
    }
    /**
     * Builds system and user prompts for Q&A chat
     * @param {string} title
     * @param {string} transcriptText
     * @param {string} targetLang
     * @param {Array<Object>} chatHistory
     * @param {string} userQuestion
     * @returns {{ systemPrompt: string, messages: Array<Object> }}
     */
    buildChatPrompts(title, transcriptText, targetLang, chatHistory, userQuestion) {
      throw new Error("Not implemented");
    }
  };

  // src/services/implementations/PromptBuilder.js
  var PromptBuilder = class extends IPromptBuilder {
    /**
     * Smart 3-part condensation algorithm (40% intro, 25% middle, 35% conclusion)
     * @param {string} transcript
     * @param {number} maxChars
     * @returns {string}
     */
    condenseTranscript(transcript, maxChars) {
      if (!transcript || transcript.length <= maxChars) {
        return transcript || "";
      }
      const introSize = Math.floor(maxChars * 0.4);
      const middleSize = Math.floor(maxChars * 0.25);
      const endSize = Math.floor(maxChars * 0.35);
      const intro = transcript.slice(0, introSize);
      const middleStart = Math.floor((transcript.length - middleSize) / 2);
      const middle = transcript.slice(middleStart, middleStart + middleSize);
      const end = transcript.slice(-endSize);
      return `${intro}

[... Progression de la vid\xE9o condens\xE9e pour respecter la fen\xEAtre de contexte de l'IA ...]

${middle}

[... Suite et conclusion de la vid\xE9o ...]

${end}`;
    }
    /**
     * Builds system and user prompts for video summarization
     * @param {string} title
     * @param {string} author
     * @param {string} safeTranscript
     * @param {string} lang
     * @param {string} mode
     * @param {string} [customDirectives]
     * @returns {{ systemPrompt: string, userPrompt: string }}
     */
    buildSummaryPrompts(title, author, safeTranscript, lang, mode, customDirectives = "") {
      let systemPrompt = "";
      let userPrompt = "";
      const langNames = {
        en: "ENGLISH",
        fr: "FRAN\xC7AIS",
        es: "ESPA\xD1OL",
        de: "DEUTSCH",
        it: "ITALIANO",
        ru: "\u0420\u0423\u0421\u0421\u041A\u0418\u0419",
        ja: "\u65E5\u672C\u8A9E (JAPANESE)",
        zh: "\u4E2D\u6587 (SIMPLIFIED CHINESE)"
      };
      const targetLangName = langNames[lang] || "ENGLISH";
      if (lang === "fr") {
        systemPrompt = `Tu es un assistant IA d'\xE9lite sp\xE9cialis\xE9 dans la synth\xE8se et l'analyse de vid\xE9os.
Ton but est de produire un r\xE9sum\xE9 clair, naturel, bien structur\xE9 et fid\xE8le en FRAN\xC7AIS, quelle que soit la langue originale de la vid\xE9o.
R\xC8GLES DE STYLE :
- Style naturel, direct et percutant : va droit au but sans phrases de remplissage.
- \xC9vite les phrases inutilement longues, privil\xE9gie la fluidit\xE9 et la clart\xE9.
- Mise en page a\xE9r\xE9e en Markdown avec des listes \xE0 puces et des mots-cl\xE9s en **gras** en d\xE9but de point.
- Fid\xE9lit\xE9 \xE0 100% \xE0 la transcription, z\xE9ro hallucination ou extrapolation.`;
        let formatInstructions = "";
        if (mode === "quick") {
          formatInstructions = `Produis un r\xE9sum\xE9 COURT, CONCIS et DIRECT sous cette forme :
### \u26A1 En Bref
(2 \xE0 3 phrases percutantes r\xE9sumant l'essentiel absolu)

### \u{1F3AF} Points Cl\xE9s \xE0 Retenir
- **[Point 1]** : Explication courte et concr\xE8te.
- **[Point 2]** : Explication courte et concr\xE8te.
- **[Point 3]** : Explication courte et concr\xE8te.

### \u{1F4CC} Conclusion
(1 phrase de conclusion finale)`;
        } else if (mode === "detailed") {
          formatInstructions = `Produis une synth\xE8se COMPL\xC8TE, D\xC9TAILL\xC9E et EXHAUSTIVE :
### \u{1F3AF} Vue d'ensemble & Enjeux
(Contexte, probl\xE8me abord\xE9 et th\xE8se de la vid\xE9o)

### \u23F1\uFE0F D\xE9roul\xE9 chronologique & Chapitres cl\xE9s
(Reconstitue les grandes \xE9tapes avec timestamps si mentionn\xE9s)

### \u{1F4A1} Analyses, Arguments & Exemples cit\xE9s
(D\xE9cortique les donn\xE9es, anecdotes ou concepts expliqu\xE9s)

### \u{1F6E0}\uFE0F Conseils pratiques & Actions concr\xE8tes
(Tout ce qui est actionnable pour le spectateur)

### \u{1F4CC} Conclusion & Perspective
(Message final et conclusion de l'auteur)`;
        } else {
          formatInstructions = `Produis un r\xE9sum\xE9 \xC9QUILIBR\xC9, NATUREL et STRUCTUR\xC9 :
### \u{1F3AF} L'Essentiel
(2-3 phrases r\xE9sumant le sujet et le message central)

### \u23F1\uFE0F Moments Cl\xE9s & D\xE9roulement
- **[Th\xE8me 1]** : Ce qui est expliqu\xE9 ou d\xE9montr\xE9.
- **[Th\xE8me 2]** : Ce qui est expliqu\xE9 ou d\xE9montr\xE9.
- **[Th\xE8me 3]** : Ce qui est expliqu\xE9 ou d\xE9montr\xE9.

### \u{1F4A1} Enseignements & Conseils
- **[Le\xE7on cl\xE9]** : D\xE9tail concret et utile.
- **[Actionable]** : Recommandation de l'auteur.

### \u{1F4CC} Ce qu'il faut en retenir
(Conclusion synth\xE9tique)`;
        }
        userPrompt = `Voici la transcription de la vid\xE9o YouTube :
Titre : "${title}"
Auteur/Cha\xEEne : "${author}"

Format demand\xE9 :
${formatInstructions}
${customDirectives ? `
DIRECTIVES PERSONNALIS\xC9ES DE L'UTILISATEUR :
${customDirectives}
` : ""}

TRANSCRIPTION :
${safeTranscript}`;
      } else {
        systemPrompt = `You are an expert AI assistant specializing in video summarization and insights.
Your goal is to produce a clear, natural, well-structured, and faithful summary in ${targetLangName}, regardless of the original video language.
STYLE RULES:
- Natural, direct, and engaging style: go straight to the point without filler phrases.
- Avoid overly long and complex sentences, focus on clarity and flow.
- Use airy Markdown formatting with bullet points and **bold** keywords at the start of each point.
- 100% faithful to the transcript, with zero hallucinations or extrapolation.`;
        let formatInstructions = "";
        if (mode === "quick") {
          formatInstructions = `Produce a SHORT, CONCISE, and DIRECT summary in this format:
### \u26A1 Quick Summary
(2 to 3 impactful sentences capturing the absolute essence)

### \u{1F3AF} Key Takeaways
- **[Point 1]**: Short, concrete explanation.
- **[Point 2]**: Short, concrete explanation.
- **[Point 3]**: Short, concrete explanation.

### \u{1F4CC} Conclusion
(1 final concluding sentence)`;
        } else if (mode === "detailed") {
          formatInstructions = `Produce a THOROUGH, DETAILED, and COMPREHENSIVE study guide:
### \u{1F3AF} Overview & Core Thesis
(Context, problem addressed, and central thesis of the video)

### \u23F1\uFE0F Chronological Breakdown & Key Chapters
(Reconstruct key sections with timestamps if present)

### \u{1F4A1} Deep Dive: Arguments, Data & Examples
(Analyze the data, case studies, or concepts presented)

### \u{1F6E0}\uFE0F Actionable Advice & Practical Steps
(Actionable takeaways for the viewer)

### \u{1F4CC} Author's Conclusion & Key Takeaway
(Final takeaway and perspective)`;
        } else {
          formatInstructions = `Produce a BALANCED, NATURAL, and STRUCTURED summary:
### \u{1F3AF} Core Takeaways
(2-3 sentences summarizing the topic and central message)

### \u23F1\uFE0F Key Highlights & Chapters
- **[Topic 1]**: What is explained or demonstrated.
- **[Topic 2]**: What is explained or demonstrated.
- **[Topic 3]**: What is explained or demonstrated.

### \u{1F4A1} Insights & Practical Advice
- **[Key insight]**: Concrete and actionable takeaway.
- **[Actionable item]**: Author recommendation.

### \u{1F4CC} Final Summary
(Synthetic concluding thought)`;
        }
        userPrompt = `Here is the transcript of the YouTube video:
Title: "${title}"
Author/Channel: "${author}"

Requested format:
${formatInstructions}
${customDirectives ? `
USER CUSTOM DIRECTIVES:
${customDirectives}
` : ""}

TRANSCRIPT:
${safeTranscript}`;
      }
      return { systemPrompt, userPrompt };
    }
    /**
     * Builds system and user messages for interactive Q&A chat
     * @param {string} title
     * @param {string} transcriptText
     * @param {string} targetLang
     * @param {Array<Object>} chatHistory
     * @param {string} userQuestion
     * @returns {{ systemPrompt: string, messages: Array<Object> }}
     */
    buildChatPrompts(title, transcriptText, targetLang, chatHistory, userQuestion) {
      const langNames = {
        en: "English",
        fr: "French",
        es: "Spanish",
        de: "German",
        it: "Italian",
        ru: "Russian",
        ja: "Japanese",
        zh: "Simplified Chinese"
      };
      const targetLangName = langNames[targetLang] || "English";
      const systemPrompt = `You are a conversational AI video assistant.
You answer questions accurately based SOLELY on the video transcript provided below.
Video Title: "${title}"
Always answer in ${targetLangName}.
If the answer is not mentioned in the transcript, state clearly that the video does not mention it.
Be concise, helpful, and quote timestamps in [m:ss] format if applicable.

TRANSCRIPT:
${transcriptText}`;
      const messages = [];
      if (Array.isArray(chatHistory)) {
        for (const msg of chatHistory) {
          if (msg.role && msg.content) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      messages.push({ role: "user", content: userQuestion });
      return { systemPrompt, messages };
    }
  };

  // src/services/interfaces/ITranscriptService.js
  var ITranscriptService = class {
    /**
     * Fetches and normalizes transcript for a YouTube video
     * @param {string} videoId
     * @param {string} [preferredLang]
     * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
     */
    async getTranscript(videoId, preferredLang = "en") {
      throw new Error("Not implemented");
    }
  };

  // src/parsers/TextCleaner.js
  var TextCleaner = class {
    /**
     * Cleans HTML entities and excessive whitespace from subtitle text
     * @param {string} text
     * @returns {string}
     */
    static cleanTranscriptText(text) {
      if (!text || typeof text !== "string") return "";
      return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code)).replace(/&#x2F;/g, "/").replace(/&nbsp;/g, " ").replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
    }
  };

  // src/domain/models/TranscriptSegment.js
  var TranscriptSegment = class {
    /**
     * @param {number} startMs - Start time in milliseconds
     * @param {number} durationMs - Duration in milliseconds
     * @param {string} text - Cleaned text content
     */
    constructor(startMs = 0, durationMs = 0, text = "") {
      this.startMs = Number(startMs) || 0;
      this.durationMs = Number(durationMs) || 0;
      this.text = String(text || "").trim();
    }
    /**
     * Formats start time into m:ss or h:mm:ss format
     * @returns {string}
     */
    formatTime() {
      const totalSeconds = Math.floor(this.startMs / 1e3);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor(totalSeconds % 3600 / 60);
      const seconds = totalSeconds % 60;
      const pad = (num) => String(num).padStart(2, "0");
      if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
      }
      return `${minutes}:${pad(seconds)}`;
    }
  };

  // src/parsers/TimedtextParser.js
  var TimedtextParser = class {
    /**
     * Parses JSON3 events array into normalized TranscriptSegment list
     * @param {Array<Object>} events
     * @returns {Array<TranscriptSegment>}
     */
    static parseTimedtextEvents(events) {
      if (!Array.isArray(events)) return [];
      const segments = [];
      for (const ev of events) {
        if (!ev || !Array.isArray(ev.segs)) continue;
        const rawText = ev.segs.map((s) => s && s.utf8 ? s.utf8 : "").join("");
        const cleanText = TextCleaner.cleanTranscriptText(rawText);
        if (!cleanText || cleanText === "\n") continue;
        const startMs = Number(ev.tStartMs || ev.tOffsetMs) || 0;
        const durationMs = Number(ev.dDurationMs) || 0;
        segments.push(new TranscriptSegment(startMs, durationMs, cleanText));
      }
      return segments;
    }
  };

  // src/domain/errors/AppError.js
  var AppError = class extends Error {
    /**
     * @param {string} message
     * @param {string} code
     * @param {any} details
     */
    constructor(message, code = "ERR_INTERNAL", details = null) {
      super(message);
      this.name = this.constructor.name;
      this.code = code;
      this.details = details;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  };
  var AppError_default = AppError;

  // src/domain/errors/TranscriptError.js
  var TranscriptError = class extends AppError_default {
    constructor(message, code = "ERR_TRANSCRIPT_UNAVAILABLE", details = null) {
      super(message, code, details);
    }
  };

  // src/services/implementations/YouTubeTranscriptService.js
  var YouTubeTranscriptService = class extends ITranscriptService {
    constructor() {
      super();
      this.pendingResolvers = /* @__PURE__ */ new Map();
      this.setupPageListener();
    }
    /**
     * Listens for messages dispatched from main_world.js
     */
    setupPageListener() {
      if (typeof window === "undefined") return;
      window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data) return;
        if (event.data.type === "YT_AI_TRANSCRIPT_RESULT") {
          const { videoId, segments, fullText, error } = event.data;
          const resolver = this.pendingResolvers.get(videoId);
          if (resolver) {
            this.pendingResolvers.delete(videoId);
            if (error) {
              resolver.reject(new TranscriptError(error));
            } else {
              resolver.resolve({ segments: segments || [], fullText: fullText || "" });
            }
          }
        }
      });
    }
    /**
     * Fetches transcript for a video
     * @param {string} videoId
     * @param {string} [preferredLang]
     * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
     */
    async getTranscript(videoId, preferredLang = "en") {
      if (!videoId) {
        throw new TranscriptError("Video ID is required");
      }
      try {
        const mainWorldResult = await this.requestFromMainWorld(videoId);
        if (mainWorldResult && mainWorldResult.segments && mainWorldResult.segments.length > 0) {
          return mainWorldResult;
        }
      } catch {
      }
      try {
        const pageResult = await this.extractFromPageSource(videoId, preferredLang);
        if (pageResult && pageResult.segments && pageResult.segments.length > 0) {
          return pageResult;
        }
      } catch {
      }
      throw new TranscriptError("No transcript available for this video");
    }
    /**
     * Requests transcript from main_world execution context via postMessage
     * @param {string} videoId
     * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
     */
    requestFromMainWorld(videoId) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingResolvers.delete(videoId);
          resolve(null);
        }, 3500);
        this.pendingResolvers.set(videoId, {
          resolve: (val) => {
            clearTimeout(timeout);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          }
        });
        window.postMessage({ type: "YT_AI_REQUEST_TRANSCRIPT", videoId }, "*");
      });
    }
    /**
     * Fallback extractor reading HTML and caption tracks
     * @param {string} videoId
     * @param {string} preferredLang
     * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
     */
    async extractFromPageSource(videoId, preferredLang = "en") {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      if (!res.ok) return null;
      const html = await res.text();
      const captionMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
      if (!captionMatch) return null;
      let tracks = [];
      try {
        tracks = JSON.parse(captionMatch[1]);
      } catch {
        return null;
      }
      if (!Array.isArray(tracks) || tracks.length === 0) return null;
      let selectedTrack = tracks.find((t) => t.languageCode === preferredLang);
      if (!selectedTrack) selectedTrack = tracks.find((t) => t.languageCode === "en");
      if (!selectedTrack) selectedTrack = tracks[0];
      const baseUrl = selectedTrack.baseUrl;
      if (!baseUrl) return null;
      const timedtextUrl = `${baseUrl}&fmt=json3`;
      const ttRes = await fetch(timedtextUrl);
      if (!ttRes.ok) return null;
      const json = await ttRes.json();
      const segments = TimedtextParser.parseTimedtextEvents(json.events || []);
      const fullText = segments.map((s) => s.text).join(" ");
      return { segments, fullText };
    }
  };

  // src/services/interfaces/IExportService.js
  var IExportService = class {
    /**
     * Generates formatted Markdown string
     * @param {Object} data - Video metadata and summary content
     * @returns {string}
     */
    exportMarkdown(data) {
      throw new Error("Not implemented");
    }
    /**
     * Generates clean plain text string
     * @param {Object} data
     * @returns {string}
     */
    exportPlainText(data) {
      throw new Error("Not implemented");
    }
    /**
     * Generates structured JSON string
     * @param {Object} data
     * @returns {string}
     */
    exportJSON(data) {
      throw new Error("Not implemented");
    }
    /**
     * Triggers browser download of file
     * @param {string} filename
     * @param {string} content
     * @param {string} mimeType
     */
    downloadFile(filename, content, mimeType) {
      throw new Error("Not implemented");
    }
  };

  // src/services/implementations/ExportService.js
  var ExportService = class extends IExportService {
    /**
     * Generates formatted Markdown document
     * @param {Object} data
     * @returns {string}
     */
    exportMarkdown({ title = "", author = "", url = "", model = "", summary = "", segments = [] } = {}) {
      let md = `# ${title || "YouTube Summary"}

`;
      if (author) md += `**Author / Channel:** ${author}
`;
      if (url) md += `**Video URL:** ${url}
`;
      if (model) md += `**AI Model:** ${model}
`;
      md += `**Date:** ${(/* @__PURE__ */ new Date()).toLocaleDateString()}

`;
      md += `## \u{1F4DD} AI Summary

${summary || "No summary generated."}

`;
      if (Array.isArray(segments) && segments.length > 0) {
        md += `## \u{1F4DC} Full Transcript

`;
        for (const seg of segments) {
          const time = seg.timestamp || (seg.formatTime ? seg.formatTime() : "");
          const text = seg.text || "";
          md += `- **[${time}]** ${text}
`;
        }
      }
      return md;
    }
    /**
     * Generates clean plain text file
     * @param {Object} data
     * @returns {string}
     */
    exportPlainText({ title = "", author = "", url = "", summary = "", segments = [] } = {}) {
      let txt = `YOUTUBE AI SUMMARY
`;
      txt += `Title: ${title}
`;
      txt += `Author: ${author}
`;
      txt += `URL: ${url}
`;
      txt += `Generated: ${(/* @__PURE__ */ new Date()).toLocaleString()}
`;
      txt += `------------------------------------------------------------

`;
      txt += `SUMMARY:
${summary}

`;
      if (Array.isArray(segments) && segments.length > 0) {
        txt += `------------------------------------------------------------
`;
        txt += `TRANSCRIPT:
`;
        for (const seg of segments) {
          const time = seg.timestamp || (seg.formatTime ? seg.formatTime() : "");
          txt += `[${time}] ${seg.text || ""}
`;
        }
      }
      return txt;
    }
    /**
     * Generates structured JSON representation
     * @param {Object} data
     * @returns {string}
     */
    exportJSON({ title = "", author = "", url = "", model = "", summary = "", segments = [] } = {}) {
      const payload = {
        title,
        author,
        url,
        model,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        summary,
        transcript: (segments || []).map((s) => ({
          timestamp: s.timestamp || (s.formatTime ? s.formatTime() : ""),
          text: s.text || ""
        }))
      };
      return JSON.stringify(payload, null, 2);
    }
    /**
     * Triggers download of a file via Blob and HTML5 anchor element
     * @param {string} filename
     * @param {string} content
     * @param {string} mimeType
     */
    downloadFile(filename, content, mimeType = "text/plain;charset=utf-8") {
      if (typeof window === "undefined" || !window.document) return;
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  };

  // src/services/implementations/WebSpeechTTSService.js
  var WebSpeechTTSService = class _WebSpeechTTSService {
    constructor() {
      this.isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
      this.currentUtterance = null;
      this.isPlaying = false;
    }
    /**
     * Cleans Markdown formatting, timestamps, and emojis before feeding to speech synthesizer
     * @param {string} md
     * @returns {string}
     */
    static cleanMarkdownForSpeech(md) {
      if (!md || typeof md !== "string") return "";
      return md.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").replace(/###+\s+/g, ". ").replace(/##+\s+/g, ". ").replace(/#+\s+/g, ". ").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^[-*•]\s+/gm, "").replace(/\[\d{1,2}:\d{2}\]/g, "").replace(/\n+/g, ". ").replace(/\.\s*\./g, ".").replace(/\s+/g, " ").trim();
    }
    /**
     * Speaks markdown or text aloud
     * @param {string} text
     * @param {Object} options
     * @param {Function} onStart
     * @param {Function} onEnd
     * @param {Function} onError
     */
    speak(text, { speed = 1, lang = "en", voiceURI = "" } = {}, onStart = null, onEnd = null, onError = null) {
      if (!this.isSupported) {
        if (onError) onError(new Error("Speech synthesis not supported in this browser"));
        return;
      }
      this.stop();
      const cleanText = _WebSpeechTTSService.cleanMarkdownForSpeech(text);
      if (!cleanText) return;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = Number(speed) || 1;
      utterance.lang = lang || "en";
      if (voiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find((v) => v.voiceURI === voiceURI);
        if (selected) utterance.voice = selected;
      }
      utterance.onstart = () => {
        this.isPlaying = true;
        if (onStart) onStart();
      };
      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };
      utterance.onerror = (e) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        if (onError) onError(e);
      };
      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }
    /**
     * Stops currently playing speech
     */
    stop() {
      if (this.isSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  };

  // src/services/implementations/WhisperSTTService.js
  var WhisperSTTService = class {
    constructor() {
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.isRecording = false;
    }
    /**
     * Starts recording audio from selected microphone
     * @param {string} [deviceId]
     * @returns {Promise<void>}
     */
    async startRecording(deviceId = "") {
      if (this.isRecording) return;
      const constraints = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mimeType = mimeType;
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };
      this.mediaRecorder.start();
      this.isRecording = true;
    }
    /**
     * Stops recording and returns the recorded audio Blob
     * @returns {Promise<Blob>}
     */
    stopRecording() {
      return new Promise((resolve, reject) => {
        if (!this.mediaRecorder || !this.isRecording) {
          resolve(null);
          return;
        }
        this.mediaRecorder.onstop = () => {
          const stream = this.mediaRecorder.stream;
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
          const blob = new Blob(this.audioChunks, { type: this.mimeType || "audio/webm" });
          this.isRecording = false;
          this.mediaRecorder = null;
          resolve(blob);
        };
        try {
          this.mediaRecorder.stop();
        } catch (err) {
          this.isRecording = false;
          reject(err);
        }
      });
    }
    /**
     * Sends audio Blob to Whisper endpoint for transcription
     * @param {Blob} audioBlob
     * @param {string} endpoint
     * @param {string} [apiKey]
     * @param {string} [language]
     * @returns {Promise<string>}
     */
    async transcribe(audioBlob, endpoint, apiKey = "", language = "en") {
      if (!audioBlob || audioBlob.size < 1e3) {
        throw new Error("Audio recording too short");
      }
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");
      formData.append("model", "whisper-1");
      if (language) formData.append("language", language);
      const headers = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.text?.trim() || "";
    }
  };

  // src/presentation/templates/ExtensionLayoutTemplate.js
  var ExtensionLayoutTemplate = class {
    /**
     * Generates the root container HTML markup
     * @param {Object} options
     * @returns {string}
     */
    static render({ isExpanded = false, version = "v1.3.0", initialModelText = "Gemini 1.5 Flash" } = {}) {
      return `
      <div class="yt-ai-header-bar">
        <div class="yt-ai-header-left">
          <div class="yt-ai-brand">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" class="yt-ai-logo-red"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" class="yt-ai-logo-white"/></svg>
            <span id="ytAiBrandText">YT Summarizer AI</span>
          </div>
          <div id="ytAiStatusBadge" class="yt-ai-badge connected">
            <span class="yt-ai-badge-dot"></span>
            <span id="ytAiStatusText">Checking...</span>
          </div>
          <div id="ytAiModelPill" class="yt-ai-model-pill" title="Click to change model">
            \u{1F916} <span id="ytAiHeaderModelText">Model: ${initialModelText}</span> \u25BE
          </div>
        </div>

        <div class="yt-ai-header-center">
          <div class="yt-ai-format-pills">
            <button class="yt-ai-format-pill" data-mode="quick" title="Short & concise">\u26A1 Quick</button>
            <button class="yt-ai-format-pill active" data-mode="standard" title="Natural & balanced">\u{1F4CC} Standard</button>
            <button class="yt-ai-format-pill" data-mode="detailed" title="Detailed & in-depth">\u{1F4DD} Deep</button>
          </div>
          <button id="ytAiSummarizeBtn" class="yt-ai-btn-cta">
            \u2728 Summarize video
          </button>
        </div>

        <div class="yt-ai-header-right">
          <select id="ytAiLangSelect" class="yt-ai-select yt-ai-header-select" title="Change interface & summary language">
            <option value="en">\u{1F1EC}\u{1F1E7} English</option>
            <option value="fr">\u{1F1EB}\u{1F1F7} Fran\xE7ais</option>
            <option value="es">\u{1F1EA}\u{1F1F8} Espa\xF1ol</option>
            <option value="de">\u{1F1E9}\u{1F1EA} Deutsch</option>
            <option value="it">\u{1F1EE}\u{1F1F9} Italiano</option>
            <option value="ru">\u{1F1F7}\u{1F1FA} \u0420\u0443\u0441\u0441\u043A\u0438\u0439</option>
            <option value="ja">\u{1F1EF}\u{1F1F5} \u65E5\u672C\u8A9E</option>
            <option value="zh">\u{1F1E8}\u{1F1F3} \u4E2D\u6587</option>
          </select>
          <button id="ytAiSettingsToggleBtn" class="yt-ai-btn-ghost" title="Settings">\u2699\uFE0F Settings</button>
          <button id="ytAiToggleBtn" class="yt-ai-btn-ghost" title="Collapse / Expand">Collapse \u25B2</button>
          <span class="yt-ai-version-tag">${version}</span>
        </div>
      </div>

      <div id="yt-ai-body" class="${isExpanded ? "" : "yt-ai-hidden"}">
        <!-- Settings Drawer, Navigation Tabs, and Panes are inserted here -->
      </div>
    `;
    }
  };

  // src/presentation/components/HeaderBarComponent.js
  var HeaderBarComponent = class {
    /**
     * @param {HTMLElement} rootEl
     * @param {Object} callbacks
     */
    constructor(rootEl, callbacks = {}) {
      this.rootEl = rootEl;
      this.callbacks = callbacks;
      this.bindEvents();
    }
    bindEvents() {
      const summarizeBtn = this.rootEl.querySelector("#ytAiSummarizeBtn");
      if (summarizeBtn && this.callbacks.onSummarize) {
        summarizeBtn.addEventListener("click", () => this.callbacks.onSummarize());
      }
      const toggleBtn = this.rootEl.querySelector("#ytAiToggleBtn");
      if (toggleBtn && this.callbacks.onToggleExpand) {
        toggleBtn.addEventListener("click", () => this.callbacks.onToggleExpand());
      }
      const settingsBtn = this.rootEl.querySelector("#ytAiSettingsToggleBtn");
      if (settingsBtn && this.callbacks.onToggleSettings) {
        settingsBtn.addEventListener("click", () => this.callbacks.onToggleSettings());
      }
      const modelPill = this.rootEl.querySelector("#ytAiModelPill");
      if (modelPill && this.callbacks.onToggleSettings) {
        modelPill.addEventListener("click", () => this.callbacks.onToggleSettings("model"));
      }
      const langSelect = this.rootEl.querySelector("#ytAiLangSelect");
      if (langSelect && this.callbacks.onLanguageChange) {
        langSelect.addEventListener("change", (e) => this.callbacks.onLanguageChange(e.target.value));
      }
      const formatPills = this.rootEl.querySelectorAll(".yt-ai-format-pill");
      formatPills.forEach((pill) => {
        pill.addEventListener("click", () => {
          formatPills.forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
          const mode = pill.getAttribute("data-mode");
          if (mode && this.callbacks.onFormatChange) {
            this.callbacks.onFormatChange(mode);
          }
        });
      });
    }
    /**
     * Updates status badge
     * @param {string} text
     * @param {boolean} isConnected
     */
    setStatus(text, isConnected = true) {
      const badge = this.rootEl.querySelector("#ytAiStatusBadge");
      const textEl = this.rootEl.querySelector("#ytAiStatusText");
      if (badge && textEl) {
        badge.className = `yt-ai-badge ${isConnected ? "connected" : "offline"}`;
        textEl.textContent = text;
      }
    }
    /**
     * Updates model text in pill
     * @param {string} modelName
     */
    setModelText(modelName) {
      const textEl = this.rootEl.querySelector("#ytAiHeaderModelText");
      if (textEl) {
        textEl.textContent = `Model: ${modelName || "None"}`;
      }
    }
    /**
     * Sets active format pill
     * @param {string} mode
     */
    setActiveFormat(mode) {
      const formatPills = this.rootEl.querySelectorAll(".yt-ai-format-pill");
      formatPills.forEach((p) => {
        p.classList.toggle("active", p.getAttribute("data-mode") === mode);
      });
    }
  };

  // src/presentation/components/SettingsDrawerComponent.js
  var SettingsDrawerComponent = class {
    /**
     * @param {HTMLElement} rootEl
     * @param {Object} callbacks
     */
    constructor(rootEl, callbacks = {}) {
      this.rootEl = rootEl;
      this.callbacks = callbacks;
      this.bindEvents();
    }
    bindEvents() {
      const subtabs = this.rootEl.querySelectorAll(".yt-ai-settings-subtab-btn");
      const panes = this.rootEl.querySelectorAll(".yt-ai-settings-subpane");
      subtabs.forEach((btn) => {
        btn.addEventListener("click", () => {
          subtabs.forEach((b) => b.classList.remove("active"));
          panes.forEach((p) => p.classList.remove("active"));
          btn.classList.add("active");
          const target = btn.getAttribute("data-subtab");
          const pane = this.rootEl.querySelector(`#ytAiSettingsSubpane${target}`);
          if (pane) pane.classList.add("active");
        });
      });
      const providerSelect = this.rootEl.querySelector("#ytAiProviderSelect");
      if (providerSelect && this.callbacks.onProviderChange) {
        providerSelect.addEventListener("change", (e) => this.callbacks.onProviderChange(e.target.value));
      }
      const modelSelect = this.rootEl.querySelector("#ytAiModelSelect");
      if (modelSelect && this.callbacks.onModelChange) {
        modelSelect.addEventListener("change", (e) => this.callbacks.onModelChange(e.target.value));
      }
      const testModelBtn = this.rootEl.querySelector("#ytAiTestModelBtn");
      if (testModelBtn && this.callbacks.onTestModel) {
        testModelBtn.addEventListener("click", () => this.callbacks.onTestModel());
      }
      const refreshBtn = this.rootEl.querySelector("#ytAiRefreshModelsBtn");
      if (refreshBtn && this.callbacks.onRefreshModels) {
        refreshBtn.addEventListener("click", () => this.callbacks.onRefreshModels());
      }
      const hideBtn = this.rootEl.querySelector("#ytAiHideSettingsBtn");
      if (hideBtn && this.callbacks.onClose) {
        hideBtn.addEventListener("click", () => this.callbacks.onClose());
      }
    }
    /**
     * Switches active subtab ('Model', 'Audio', 'Params')
     * @param {string} subtabName
     */
    openSubtab(subtabName = "Model") {
      const subtabs = this.rootEl.querySelectorAll(".yt-ai-settings-subtab-btn");
      const panes = this.rootEl.querySelectorAll(".yt-ai-settings-subpane");
      subtabs.forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-subtab") === subtabName);
      });
      panes.forEach((p) => {
        p.classList.toggle("active", p.id === `ytAiSettingsSubpane${subtabName}`);
      });
    }
    /**
     * Toggles drawer open/closed
     * @param {boolean} [forceState]
     */
    toggle(forceState) {
      const drawer = this.rootEl.querySelector("#ytAiAdvancedDrawer");
      if (!drawer) return;
      const isHidden = drawer.classList.contains("yt-ai-hidden");
      const shouldOpen = forceState !== void 0 ? forceState : isHidden;
      drawer.classList.toggle("yt-ai-hidden", !shouldOpen);
    }
  };

  // src/presentation/components/SummaryViewComponent.js
  var SummaryViewComponent = class {
    /**
     * @param {HTMLElement} rootEl
     * @param {Object} callbacks
     */
    constructor(rootEl, callbacks = {}) {
      this.rootEl = rootEl;
      this.callbacks = callbacks;
      this.bindEvents();
    }
    bindEvents() {
      const copyBtn = this.rootEl.querySelector("#ytAiCopyBtn");
      if (copyBtn && this.callbacks.onCopy) {
        copyBtn.addEventListener("click", () => this.callbacks.onCopy());
      }
      const downloadMdBtn = this.rootEl.querySelector("#ytAiDownloadBtn");
      if (downloadMdBtn && this.callbacks.onDownloadMd) {
        downloadMdBtn.addEventListener("click", () => this.callbacks.onDownloadMd());
      }
      const saveTxtBtn = this.rootEl.querySelector("#ytAiSaveTxtBtn");
      if (saveTxtBtn && this.callbacks.onDownloadTxt) {
        saveTxtBtn.addEventListener("click", () => this.callbacks.onDownloadTxt());
      }
      const saveJsonBtn = this.rootEl.querySelector("#ytAiSaveJsonBtn");
      if (saveJsonBtn && this.callbacks.onDownloadJson) {
        saveJsonBtn.addEventListener("click", () => this.callbacks.onDownloadJson());
      }
      const speakBtn = this.rootEl.querySelector("#ytAiSpeakSummaryBtn");
      if (speakBtn && this.callbacks.onToggleSpeak) {
        speakBtn.addEventListener("click", () => this.callbacks.onToggleSpeak());
      }
    }
    /**
     * Updates summary HTML and attaches click listeners to timestamp links
     * @param {string} htmlContent
     * @param {Function} onTimestampClick
     */
    setSummaryContent(htmlContent, onTimestampClick = null) {
      const body = this.rootEl.querySelector("#ytAiSummaryBody");
      if (!body) return;
      body.innerHTML = htmlContent;
      if (onTimestampClick) {
        body.querySelectorAll(".yt-ai-timestamp-link").forEach((link) => {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            const seconds = Number(link.getAttribute("data-seconds"));
            if (!isNaN(seconds)) onTimestampClick(seconds);
          });
        });
      }
    }
    /**
     * Updates reasoning text box
     * @param {string} text
     * @param {string} statusText
     */
    setReasoning(text, statusText = "") {
      const box = this.rootEl.querySelector("#ytAiReasoningBox");
      const textEl = this.rootEl.querySelector("#ytAiReasoningText");
      const statusEl = this.rootEl.querySelector("#ytAiReasoningStatus");
      if (!box || !textEl) return;
      if (text && text.trim()) {
        box.classList.remove("yt-ai-hidden");
        textEl.textContent = text;
        if (statusEl && statusText) statusEl.textContent = statusText;
      } else {
        box.classList.add("yt-ai-hidden");
      }
    }
  };

  // src/presentation/components/ChatViewComponent.js
  var ChatViewComponent = class {
    /**
     * @param {HTMLElement} rootEl
     * @param {Object} callbacks
     */
    constructor(rootEl, callbacks = {}) {
      this.rootEl = rootEl;
      this.callbacks = callbacks;
      this.bindEvents();
    }
    bindEvents() {
      const input = this.rootEl.querySelector("#ytAiChatInput");
      const sendBtn = this.rootEl.querySelector("#ytAiSendChatBtn");
      if (sendBtn && input) {
        sendBtn.addEventListener("click", () => this.submitMessage());
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.submitMessage();
          }
        });
      }
      const micBtn = this.rootEl.querySelector("#ytAiMicBtn");
      if (micBtn && this.callbacks.onToggleMic) {
        micBtn.addEventListener("click", () => this.callbacks.onToggleMic());
      }
      const clearBtn = this.rootEl.querySelector("#ytAiClearChatBtn");
      if (clearBtn && this.callbacks.onClear) {
        clearBtn.addEventListener("click", () => this.callbacks.onClear());
      }
    }
    submitMessage() {
      const input = this.rootEl.querySelector("#ytAiChatInput");
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      if (this.callbacks.onSendMessage) {
        this.callbacks.onSendMessage(text);
      }
    }
    /**
     * Appends a message bubble to chat history
     * @param {string} role ('user' or 'ai')
     * @param {string} text
     */
    appendMessage(role, text) {
      const container = this.rootEl.querySelector("#ytAiChatMessages");
      if (!container) return;
      const bubble = document.createElement("div");
      bubble.className = `yt-ai-chat-bubble ${role}`;
      bubble.textContent = text;
      container.appendChild(bubble);
      container.scrollTop = container.scrollHeight;
      return bubble;
    }
    /**
     * Sets prompt suggestion chips
     * @param {Array<{label: string, question: string}>} suggestions
     */
    setSuggestions(suggestions = []) {
      const container = this.rootEl.querySelector(".yt-ai-chat-suggestions");
      if (!container) return;
      container.innerHTML = suggestions.map((s) => `
      <span class="yt-ai-suggestion-chip" data-question="${s.question}">${s.label}</span>
    `).join("");
      container.querySelectorAll(".yt-ai-suggestion-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const q = chip.getAttribute("data-question");
          if (q && this.callbacks.onSendMessage) {
            this.callbacks.onSendMessage(q);
          }
        });
      });
    }
    /**
     * Clears all messages from the chat view
     * @param {string} welcomeMessage
     */
    clear(welcomeMessage = "") {
      const container = this.rootEl.querySelector("#ytAiChatMessages");
      if (container) {
        container.innerHTML = welcomeMessage ? `<div class="yt-ai-chat-bubble ai">${welcomeMessage}</div>` : "";
      }
    }
  };

  // src/presentation/components/TranscriptViewComponent.js
  var TranscriptViewComponent = class {
    /**
     * @param {HTMLElement} rootEl
     * @param {Object} callbacks
     */
    constructor(rootEl, callbacks = {}) {
      this.rootEl = rootEl;
      this.callbacks = callbacks;
      this.bindEvents();
    }
    bindEvents() {
      const copyBtn = this.rootEl.querySelector("#ytAiCopyTranscriptBtn");
      if (copyBtn && this.callbacks.onCopyRaw) {
        copyBtn.addEventListener("click", () => this.callbacks.onCopyRaw());
      }
    }
    /**
     * Sets transcript segments list and word count
     * @param {Array<Object>} segments
     * @param {Function} [onTimestampClick]
     */
    setTranscript(segments = [], onTimestampClick = null) {
      const body = this.rootEl.querySelector("#ytAiTranscriptBody");
      const wordCountEl = this.rootEl.querySelector("#ytAiWordCount");
      if (!body) return;
      if (!segments || segments.length === 0) {
        body.textContent = "No transcript available.";
        if (wordCountEl) wordCountEl.textContent = "0";
        return;
      }
      let totalWords = 0;
      const html = segments.map((s) => {
        const time = s.timestamp || (s.formatTime ? s.formatTime() : "");
        const text = s.text || "";
        totalWords += text.split(/\s+/).filter(Boolean).length;
        return `
        <div class="yt-ai-transcript-line">
          <span class="yt-ai-timestamp-pill" data-time="${time}">${time}</span>
          <span class="yt-ai-transcript-snippet">${text}</span>
        </div>
      `;
      }).join("");
      body.innerHTML = html;
      if (wordCountEl) wordCountEl.textContent = String(totalWords);
      if (onTimestampClick) {
        body.querySelectorAll(".yt-ai-timestamp-pill").forEach((pill) => {
          pill.addEventListener("click", () => {
            const timeStr = pill.getAttribute("data-time");
            const seconds = this.parseTimeStringToSeconds(timeStr);
            onTimestampClick(seconds);
          });
        });
      }
    }
    /**
     * Parses time string (e.g. "02:15" or "1:05:12") into seconds
     * @param {string} timeStr
     * @returns {number}
     */
    parseTimeStringToSeconds(timeStr) {
      if (!timeStr) return 0;
      const parts = timeStr.trim().split(":").map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    }
  };

  // src/domain/models/VideoMetadata.js
  var VideoMetadata = class {
    constructor(videoId = "", title = "", author = "", url = "") {
      this.videoId = String(videoId || "").trim();
      this.title = String(title || "").trim();
      this.author = String(author || "").trim();
      this.url = String(url || "").trim();
    }
    /**
     * Extracts YouTube Video ID from any URL or string
     * @param {string} urlString
     * @returns {string}
     */
    static extractVideoId(urlString) {
      if (!urlString) return "";
      try {
        const url = new URL(urlString, "https://www.youtube.com");
        if (url.searchParams.has("v")) {
          return url.searchParams.get("v");
        }
        if (url.pathname.startsWith("/shorts/")) {
          return url.pathname.split("/")[2] || "";
        }
        if (url.pathname.startsWith("/live/")) {
          return url.pathname.split("/")[2] || "";
        }
      } catch {
        const match = urlString.match(/(?:v=|\/shorts\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : "";
      }
      return "";
    }
  };

  // src/config/AIProviderPresets.js
  var CLOUD_MODELS = {
    gemini: [
      { id: "gemini-1.5-flash", name: "\u2B50 gemini-1.5-flash (Gratuit, 1M ctx)" },
      { id: "gemini-2.0-flash", name: "gemini-2.0-flash (Nouveau & Rapide)" },
      { id: "gemini-1.5-pro", name: "gemini-1.5-pro (Analyse approfondie)" }
    ],
    groq: [
      { id: "llama-3.3-70b-versatile", name: "\u2B50 llama-3.3-70b-versatile (Ultra-rapide)" },
      { id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b (R1 Thinking)" },
      { id: "llama-3.1-8b-instant", name: "llama-3.1-8b-instant (\xC9clair)" },
      { id: "mixtral-8x7b-32768", name: "mixtral-8x7b-32768 (Mixtral)" }
    ],
    openai: [
      { id: "gpt-4o-mini", name: "\u2B50 gpt-4o-mini (\xC9conomique & Rapide)" },
      { id: "gpt-4o", name: "gpt-4o (Mod\xE8le phare)" },
      { id: "o3-mini", name: "o3-mini (Raisonnement)" }
    ],
    claude: [
      { id: "claude-3-5-haiku-20241022", name: "\u2B50 claude-3-5-haiku (Rapide)" },
      { id: "claude-3-5-sonnet-20241022", name: "claude-3-5-sonnet (Excellence)" }
    ],
    deepseek: [
      { id: "deepseek-chat", name: "\u2B50 deepseek-chat (V3)" },
      { id: "deepseek-reasoner", name: "deepseek-reasoner (R1 Thinking)" }
    ],
    grok: [
      { id: "grok-2-latest", name: "\u2B50 grok-2-latest" },
      { id: "grok-2-vision-1212", name: "grok-2-vision" },
      { id: "grok-beta", name: "grok-beta" }
    ],
    qwen: [
      { id: "qwen-plus", name: "\u2B50 qwen-plus (\xC9quilibr\xE9 & Efficace)" },
      { id: "qwen-max", name: "qwen-max (Maximum de puissance)" },
      { id: "qwen-turbo", name: "qwen-turbo (Ultra rapide)" },
      { id: "qwen2.5-72b-instruct", name: "qwen2.5-72b-instruct" }
    ],
    mistral: [
      { id: "mistral-small-latest", name: "\u2B50 mistral-small-latest (Rapide)" },
      { id: "mistral-large-latest", name: "mistral-large-latest (Mod\xE8le phare)" },
      { id: "codestral-latest", name: "codestral-latest" }
    ],
    openrouter: [
      { id: "deepseek/deepseek-r1", name: "\u2B50 deepseek/deepseek-r1" },
      { id: "qwen/qwen-2.5-72b-instruct", name: "qwen/qwen-2.5-72b-instruct" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "meta-llama/llama-3.3-70b-instruct" },
      { id: "anthropic/claude-3.5-sonnet", name: "anthropic/claude-3.5-sonnet" },
      { id: "google/gemini-2.0-flash-exp:free", name: "google/gemini-2.0-flash-exp (Gratuit)" }
    ],
    perplexity: [
      { id: "sonar", name: "\u2B50 sonar (Rapide)" },
      { id: "sonar-pro", name: "sonar-pro" },
      { id: "sonar-reasoning", name: "sonar-reasoning" }
    ],
    together: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "\u2B50 Llama-3.3-70B-Instruct-Turbo" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen2.5-72B-Instruct-Turbo" },
      { id: "deepseek-ai/DeepSeek-R1", name: "deepseek-ai/DeepSeek-R1" }
    ]
  };
  var API_KEY_PORTALS = {
    gemini: { url: "https://aistudio.google.com/app/apikey", label: "\u{1F511} Obtenir cl\xE9 Gemini (100% Gratuite)" },
    groq: { url: "https://console.groq.com/keys", label: "\u{1F511} Obtenir cl\xE9 Groq (Gratuite & Ultra-rapide)" },
    openai: { url: "https://platform.openai.com/api-keys", label: "\u{1F511} Obtenir cl\xE9 OpenAI" },
    claude: { url: "https://console.anthropic.com/settings/keys", label: "\u{1F511} Obtenir cl\xE9 Claude" },
    deepseek: { url: "https://platform.deepseek.com/api_keys", label: "\u{1F511} Obtenir cl\xE9 DeepSeek" },
    grok: { url: "https://console.x.ai/", label: "\u{1F511} Obtenir cl\xE9 Grok (xAI)" },
    qwen: { url: "https://dashscope.console.aliyun.com/", label: "\u{1F511} Obtenir cl\xE9 Qwen (DashScope)" },
    mistral: { url: "https://console.mistral.ai/api-keys/", label: "\u{1F511} Obtenir cl\xE9 Mistral" },
    openrouter: { url: "https://openrouter.ai/keys", label: "\u{1F511} Obtenir cl\xE9 OpenRouter" },
    perplexity: { url: "https://www.perplexity.ai/settings/api", label: "\u{1F511} Obtenir cl\xE9 Perplexity" },
    together: { url: "https://api.together.xyz/settings/api-keys", label: "\u{1F511} Obtenir cl\xE9 Together AI" }
  };
  var CONTEXT_LIMITS = {
    lmstudio: 16e3,
    ollama: 16e3,
    gemini: 12e4,
    groq: 5e4,
    openai: 8e4,
    claude: 9e4,
    deepseek: 5e4,
    grok: 7e4,
    qwen: 6e4,
    mistral: 6e4,
    openrouter: 8e4,
    perplexity: 5e4,
    together: 6e4
  };
  var PROVIDER_NAMES = {
    lmstudio: "LM Studio",
    ollama: "Ollama",
    gemini: "Google Gemini",
    groq: "Groq",
    openai: "OpenAI (ChatGPT)",
    claude: "Anthropic Claude",
    deepseek: "DeepSeek",
    grok: "xAI (Grok)",
    qwen: "Qwen (DashScope)",
    mistral: "Mistral AI",
    openrouter: "OpenRouter",
    perplexity: "Perplexity AI",
    together: "Together AI"
  };
  var LANG_LOCALES = {
    fr: "fr-FR",
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    ru: "ru-RU",
    ja: "ja-JP",
    zh: "zh-CN"
  };

  // src/content/ContentController.js
  var ContentController = class {
    constructor() {
      this.storage = new ChromeStorageService();
      this.i18n = new I18nService("en");
      this.promptBuilder = new PromptBuilder();
      this.transcriptService = new YouTubeTranscriptService();
      this.exportService = new ExportService();
      this.ttsService = new WebSpeechTTSService();
      this.sttService = new WhisperSTTService();
      this.currentVideoId = "";
      this.cachedTranscript = null;
      this.currentSummary = "";
      this.chatHistory = [];
      this.currentMode = "standard";
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
        "aiProvider",
        "selectedModel",
        "targetLang",
        "summaryMode",
        "temperature",
        "maxTokens",
        "ttsSpeed",
        "autoSummarize",
        "customPrompt"
      ]);
      this.provider = settings.aiProvider || "lmstudio";
      this.model = settings.selectedModel || "";
      this.targetLang = settings.targetLang || "en";
      this.currentMode = settings.summaryMode || "standard";
      this.temperature = settings.temperature || "0.3";
      this.maxTokens = settings.maxTokens || "auto";
      this.ttsSpeed = settings.ttsSpeed || "1.0";
      this.autoSummarize = Boolean(settings.autoSummarize);
      this.customPrompt = settings.customPrompt || "";
      this.i18n.setLanguage(this.targetLang);
    }
    observeNavigation() {
      window.addEventListener("yt-navigate-finish", () => this.handleNavigationChange());
      window.addEventListener("popstate", () => this.handleNavigationChange());
      let lastUrl = window.location.href;
      setInterval(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          this.handleNavigationChange();
        }
      }, 1e3);
    }
    handleNavigationChange() {
      const newVideoId = VideoMetadata.extractVideoId(window.location.href);
      if (newVideoId && newVideoId !== this.currentVideoId) {
        this.currentVideoId = newVideoId;
        this.cachedTranscript = null;
        this.currentSummary = "";
        this.chatHistory = [];
        this.tryInjectBanner();
        if (this.autoSummarize) {
          setTimeout(() => this.startSummarization(), 1500);
        }
      }
    }
    tryInjectBanner() {
      if (document.getElementById("yt-ai-summarizer-container")) return;
      const target = document.querySelector("#above-the-fold") || document.querySelector("#related");
      if (!target || !target.parentNode) {
        setTimeout(() => this.tryInjectBanner(), 500);
        return;
      }
      const container = document.createElement("div");
      container.id = "yt-ai-summarizer-container";
      container.className = "yt-ai-container";
      container.innerHTML = ExtensionLayoutTemplate.render({
        isExpanded: this.isExpanded,
        version: "v1.3.0",
        initialModelText: this.model || "Gemini 1.5 Flash"
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
        onFormatChange: (mode) => {
          this.currentMode = mode;
        }
      });
      this.settingsDrawer = new SettingsDrawerComponent(container, {
        onProviderChange: (p) => {
          this.provider = p;
        },
        onModelChange: (m) => {
          this.model = m;
          this.headerBar.setModelText(m);
        },
        onClose: () => this.settingsDrawer?.toggle(false)
      });
      this.summaryView = new SummaryViewComponent(container, {
        onCopy: () => {
          if (this.currentSummary) navigator.clipboard.writeText(this.currentSummary);
        },
        onDownloadMd: () => this.downloadSummary("md"),
        onDownloadTxt: () => this.downloadSummary("txt"),
        onDownloadJson: () => this.downloadSummary("json"),
        onToggleSpeak: () => this.toggleSpeech()
      });
      this.chatView = new ChatViewComponent(container, {
        onSendMessage: (msg) => this.sendChatMessage(msg),
        onToggleMic: () => this.toggleVoiceDictation(),
        onClear: () => {
          this.chatHistory = [];
          this.chatView.clear(this.i18n.t("chatWelcome"));
        }
      });
      this.transcriptView = new TranscriptViewComponent(container, {
        onCopyRaw: () => {
          if (this.cachedTranscript?.fullText) {
            navigator.clipboard.writeText(this.cachedTranscript.fullText);
          }
        }
      });
      this.headerBar.setStatus(this.i18n.t("connectedBadge"), true);
    }
    async startSummarization() {
      this.isExpanded = true;
      const body = document.getElementById("yt-ai-body");
      if (body) body.classList.remove("yt-ai-hidden");
      this.summaryView?.setSummaryContent(`<p style="color:#58a6ff;">${this.i18n.t("generatingSummary")}</p>`);
      try {
        if (!this.cachedTranscript) {
          this.cachedTranscript = await this.transcriptService.getTranscript(this.currentVideoId, this.targetLang);
          this.transcriptView?.setTranscript(this.cachedTranscript.segments, (sec) => this.seekVideo(sec));
        }
        const limit = CONTEXT_LIMITS[this.provider] || 5e4;
        const safeText = this.promptBuilder.condenseTranscript(this.cachedTranscript.fullText, limit);
        const title = document.title.replace(/ - YouTube$/, "");
        const author = document.querySelector("#channel-name")?.textContent?.trim() || "";
        const { systemPrompt, userPrompt } = this.promptBuilder.buildSummaryPrompts(
          title,
          author,
          safeText,
          this.targetLang,
          this.currentMode,
          this.customPrompt
        );
        this.executeStreamingInference(systemPrompt, [{ role: "user", content: userPrompt }], (chunk) => {
          this.currentSummary += chunk;
          this.summaryView?.setSummaryContent(this.formatMarkdownHtml(this.currentSummary), (sec) => this.seekVideo(sec));
        });
      } catch (err) {
        this.summaryView?.setSummaryContent(`<p style="color:#ff7b72;">${this.i18n.t("errorLabel")} ${err.message}</p>`);
      }
    }
    executeStreamingInference(systemPrompt, messages, onChunk) {
      if (this.activePort) {
        try {
          this.activePort.disconnect();
        } catch {
        }
      }
      this.activePort = chrome.runtime.connect({ name: "YT_AI_STREAM" });
      this.activePort.onMessage.addListener((msg) => {
        if (msg.type === "CHUNK") {
          onChunk(msg.text);
        } else if (msg.type === "REASONING_CHUNK") {
          this.summaryView?.setReasoning(msg.text, this.i18n.t("reasoningInProgress"));
        } else if (msg.type === "DONE") {
          this.activePort.disconnect();
          this.activePort = null;
        } else if (msg.type === "ERROR") {
          this.summaryView?.setSummaryContent(`<p style="color:#ff7b72;">${this.i18n.t("errorLabel")} ${msg.error}</p>`);
        }
      });
      const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
      this.activePort.postMessage({
        action: "STREAM_CHAT",
        provider: this.provider,
        model: this.model,
        messages: fullMessages,
        temperature: this.temperature,
        maxTokens: this.maxTokens
      });
    }
    seekVideo(seconds) {
      const video = document.querySelector("video");
      if (video) {
        video.currentTime = seconds;
        video.play().catch(() => {
        });
      }
    }
    formatMarkdownHtml(md) {
      return md.replace(/### (.*?)\n/g, '<h3 style="color:#ff7b72; margin:12px 0 6px;">$1</h3>').replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/- (.*?)\n/g, '<li style="margin-left:20px;">$1</li>').replace(/\n\n/g, "<br><br>");
    }
    toggleExpand() {
      this.isExpanded = !this.isExpanded;
      const body = document.getElementById("yt-ai-body");
      if (body) body.classList.toggle("yt-ai-hidden", !this.isExpanded);
    }
    async changeLanguage(lang) {
      this.targetLang = lang;
      this.i18n.setLanguage(lang);
      await this.storage.set("targetLang", lang);
    }
    downloadSummary(format) {
      const title = document.title.replace(/ - YouTube$/, "");
      const data = {
        title,
        summary: this.currentSummary,
        segments: this.cachedTranscript?.segments || []
      };
      if (format === "md") {
        this.exportService.downloadFile(`${title}.md`, this.exportService.exportMarkdown(data), "text/markdown;charset=utf-8");
      } else if (format === "txt") {
        this.exportService.downloadFile(`${title}.txt`, this.exportService.exportPlainText(data), "text/plain;charset=utf-8");
      } else if (format === "json") {
        this.exportService.downloadFile(`${title}.json`, this.exportService.exportJSON(data), "application/json;charset=utf-8");
      }
    }
    toggleSpeech() {
      if (this.ttsService.isPlaying) {
        this.ttsService.stop();
      } else {
        this.ttsService.speak(this.currentSummary, { speed: this.ttsSpeed, lang: this.targetLang });
      }
    }
  };

  // src/content/index.js
  var promptBuilder = new PromptBuilder();
  if (typeof window !== "undefined") {
    window.I18N = I18N;
    window.CLOUD_MODELS = CLOUD_MODELS;
    window.API_KEY_PORTALS = API_KEY_PORTALS;
    window.CONTEXT_LIMITS = CONTEXT_LIMITS;
    window.PROVIDER_NAMES = PROVIDER_NAMES;
    window.LANG_LOCALES = LANG_LOCALES;
    window.condenseTranscriptForContext = function(transcript, maxChars) {
      return promptBuilder.condenseTranscript(transcript, maxChars);
    };
    window.buildPrompts = function(title, author, safeTranscript, lang, mode) {
      return promptBuilder.buildSummaryPrompts(title, author, safeTranscript, lang, mode);
    };
  }
  (function() {
    if (typeof window !== "undefined") {
      if (window.__ytAiSummarizerInjected) return;
      window.__ytAiSummarizerInjected = true;
      const controller = new ContentController();
      controller.init();
    }
  })();
})();
