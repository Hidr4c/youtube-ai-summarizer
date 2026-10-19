import { IPromptBuilder } from '../interfaces/IPromptBuilder.js';

/**
 * Service for prompt generation, context compression, and system instructions
 */
export class PromptBuilder extends IPromptBuilder {
  /**
   * Smart 3-part condensation algorithm (40% intro, 25% middle, 35% conclusion)
   * @param {string} transcript
   * @param {number} maxChars
   * @returns {string}
   */
  condenseTranscript(transcript, maxChars) {
    if (!transcript || transcript.length <= maxChars) {
      return transcript || '';
    }

    const introSize = Math.floor(maxChars * 0.40);
    const middleSize = Math.floor(maxChars * 0.25);
    const endSize = Math.floor(maxChars * 0.35);

    const intro = transcript.slice(0, introSize);
    const middleStart = Math.floor((transcript.length - middleSize) / 2);
    const middle = transcript.slice(middleStart, middleStart + middleSize);
    const end = transcript.slice(-endSize);

    return `${intro}

[... Progression de la vidéo condensée pour respecter la fenêtre de contexte de l'IA ...]

${middle}

[... Suite et conclusion de la vidéo ...]

${end}`;
  }

  /**
   * Formats video description, channel, category and tag context for AI prompts
   * @param {Object} extraContext
   * @param {string} lang
   * @returns {string}
   */
  formatContextBlock(extraContext, lang = 'en') {
    if (!extraContext || typeof extraContext !== 'object') return '';
    const subscribers = extraContext.subscribers || '';
    const category = extraContext.category || '';
    const publishDate = extraContext.publishDate || '';
    const rawKeywords = extraContext.keywords || [];
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords.slice(0, 10).join(', ')
      : (typeof rawKeywords === 'string' ? rawKeywords : '');
    let description = String(extraContext.description || '').trim();

    if (description.length > 2000) {
      description = description.slice(0, 1950) + '... [description condensée]';
    }

    const lines = [];
    const isFr = lang === 'fr';

    if (subscribers) {
      lines.push(isFr ? `- Abonnés chaîne : ${subscribers}` : `- Channel subscribers: ${subscribers}`);
    }
    if (category) {
      lines.push(isFr ? `- Catégorie : ${category}` : `- Category: ${category}`);
    }
    if (publishDate) {
      lines.push(isFr ? `- Date de publication : ${publishDate}` : `- Published date: ${publishDate}`);
    }
    if (keywords) {
      lines.push(isFr ? `- Mots-clés : ${keywords}` : `- Keywords: ${keywords}`);
    }
    if (description) {
      lines.push(isFr ? `- Description officielle :\n"""\n${description}\n"""` : `- Official Description:\n"""\n${description}\n"""`);
    }

    if (lines.length === 0) return '';

    const header = isFr ? 'CONTEXTE DE LA VIDÉO & DE LA CHAÎNE :' : 'VIDEO & CHANNEL CONTEXT:';
    return `${header}\n${lines.join('\n')}\n`;
  }

  /**
   * Builds system and user prompts for video summarization
   * @param {string} title
   * @param {string} author
   * @param {string} safeTranscript
   * @param {string} lang
   * @param {string} mode
   * @param {string} [customDirectives]
   * @param {Object} [extraContext]
   * @returns {{ systemPrompt: string, userPrompt: string }}
   */
  buildSummaryPrompts(title, author, safeTranscript, lang, mode, customDirectives = '', extraContext = {}) {
    if (typeof title === 'object' && title !== null) {
      const opts = title;
      title = opts.title;
      author = opts.author;
      safeTranscript = opts.safeTranscript || opts.transcript;
      lang = opts.lang || opts.targetLang;
      mode = opts.mode || opts.formatMode;
      customDirectives = typeof opts.customDirectives === 'string' ? opts.customDirectives : '';
      extraContext = opts.extra || opts.metadata || opts;
    } else if (typeof author === 'object' && author !== null) {
      extraContext = author;
      author = extraContext.author || '';
    } else if (typeof customDirectives === 'object' && customDirectives !== null) {
      extraContext = customDirectives;
      customDirectives = '';
    } else if (typeof arguments[6] === 'object' && arguments[6] !== null) {
      extraContext = arguments[6];
    }

    let systemPrompt = '';
    let userPrompt = '';

    const langNames = {
      en: 'ENGLISH',
      fr: 'FRANÇAIS',
      es: 'ESPAÑOL',
      de: 'DEUTSCH',
      it: 'ITALIANO',
      ru: 'РУССКИЙ',
      ja: '日本語 (JAPANESE)',
      zh: '中文 (SIMPLIFIED CHINESE)'
    };
    const targetLangName = langNames[lang] || 'ENGLISH';

    if (lang === 'fr') {
      systemPrompt = `Tu es un assistant IA d'élite spécialisé dans la synthèse et l'analyse de vidéos.
Ton but est de produire un résumé clair, naturel, bien structuré et fidèle en FRANÇAIS, quelle que soit la langue originale de la vidéo.
RÈGLES DE STYLE :
- Style naturel, direct et percutant : va droit au but sans phrases de remplissage.
- Évite les phrases inutilement longues, privilégie la fluidité et la clarté.
- Mise en page aérée en Markdown avec des listes à puces et des mots-clés en **gras** en début de point.
- Fidélité à 100% à la transcription, zéro hallucination ou extrapolation.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Produis un résumé COURT, CONCIS et DIRECT sous cette forme :
### ⚡ En Bref
(2 à 3 phrases percutantes résumant l'essentiel absolu)

### 🎯 Points Clés à Retenir
- **[Point 1]** : Explication courte et concrète.
- **[Point 2]** : Explication courte et concrète.
- **[Point 3]** : Explication courte et concrète.

### 📌 Conclusion
(1 phrase de conclusion finale)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Produis une synthèse COMPLÈTE, DÉTAILLÉE et EXHAUSTIVE :
### 🎯 Vue d'ensemble & Enjeux
(Contexte, problème abordé et thèse de la vidéo)

### ⏱️ Déroulé chronologique & Chapitres clés
(Reconstitue les grandes étapes avec timestamps si mentionnés)

### 💡 Analyses, Arguments & Exemples cités
(Décortique les données, anecdotes ou concepts expliqués)

### 🛠️ Conseils pratiques & Actions concrètes
(Tout ce qui est actionnable pour le spectateur)

### 📌 Conclusion & Perspective
(Message final et conclusion de l'auteur)`;
      } else {
        formatInstructions = `Produis un résumé ÉQUILIBRÉ, NATUREL et STRUCTURÉ :
### 🎯 L'Essentiel
(2-3 phrases résumant le sujet et le message central)

### ⏱️ Moments Clés & Déroulement
- **[Thème 1]** : Ce qui est expliqué ou démontré.
- **[Thème 2]** : Ce qui est expliqué ou démontré.
- **[Thème 3]** : Ce qui est expliqué ou démontré.

### 💡 Enseignements & Conseils
- **[Leçon clé]** : Détail concret et utile.
- **[Actionable]** : Recommandation de l'auteur.

### 📌 Ce qu'il faut en retenir
(Conclusion synthétique)`;
      }

      const contextBlock = this.formatContextBlock(extraContext, 'fr');
      userPrompt = `Voici la transcription de la vidéo YouTube :
Titre : "${title}"
Auteur/Chaîne : "${author}"${contextBlock ? `\n\n${contextBlock}` : ''}

Format demandé :
${formatInstructions}
${customDirectives ? `\nDIRECTIVES PERSONNALISÉES DE L'UTILISATEUR :\n${customDirectives}\n` : ''}

TRANSCRIPTION :
${safeTranscript}`;

    } else {
      // Default English and other languages
      systemPrompt = `You are an expert AI assistant specializing in video summarization and insights.
Your goal is to produce a clear, natural, well-structured, and faithful summary in ${targetLangName}, regardless of the original video language.
STYLE RULES:
- Natural, direct, and engaging style: go straight to the point without filler phrases.
- Avoid overly long and complex sentences, focus on clarity and flow.
- Use airy Markdown formatting with bullet points and **bold** keywords at the start of each point.
- 100% faithful to the transcript, with zero hallucinations or extrapolation.`;

      let formatInstructions = '';
      if (mode === 'quick') {
        formatInstructions = `Produce a SHORT, CONCISE, and DIRECT summary in this format:
### ⚡ Quick Summary
(2 to 3 impactful sentences capturing the absolute essence)

### 🎯 Key Takeaways
- **[Point 1]**: Short, concrete explanation.
- **[Point 2]**: Short, concrete explanation.
- **[Point 3]**: Short, concrete explanation.

### 📌 Conclusion
(1 final concluding sentence)`;
      } else if (mode === 'detailed') {
        formatInstructions = `Produce a THOROUGH, DETAILED, and COMPREHENSIVE study guide:
### 🎯 Overview & Core Thesis
(Context, problem addressed, and central thesis of the video)

### ⏱️ Chronological Breakdown & Key Chapters
(Reconstruct key sections with timestamps if present)

### 💡 Deep Dive: Arguments, Data & Examples
(Analyze the data, case studies, or concepts presented)

### 🛠️ Actionable Advice & Practical Steps
(Actionable takeaways for the viewer)

### 📌 Author's Conclusion & Key Takeaway
(Final takeaway and perspective)`;
      } else {
        formatInstructions = `Produce a BALANCED, NATURAL, and STRUCTURED summary:
### 🎯 Core Takeaways
(2-3 sentences summarizing the topic and central message)

### ⏱️ Key Highlights & Chapters
- **[Topic 1]**: What is explained or demonstrated.
- **[Topic 2]**: What is explained or demonstrated.
- **[Topic 3]**: What is explained or demonstrated.

### 💡 Insights & Practical Advice
- **[Key insight]**: Concrete and actionable takeaway.
- **[Actionable item]**: Author recommendation.

### 📌 Final Summary
(Synthetic concluding thought)`;
      }

      const contextBlock = this.formatContextBlock(extraContext, lang);
      userPrompt = `Here is the transcript of the YouTube video:
Title: "${title}"
Author/Channel: "${author}"${contextBlock ? `\n\n${contextBlock}` : ''}

Requested format:
${formatInstructions}
${customDirectives ? `\nUSER CUSTOM DIRECTIVES:\n${customDirectives}\n` : ''}

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
   * @param {Object} [extraContext]
   * @returns {{ systemPrompt: string, messages: Array<Object> }}
   */
  buildChatPrompts(title, transcriptText, targetLang, chatHistory, userQuestion, extraContext = {}) {
    const langNames = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      ru: 'Russian',
      ja: 'Japanese',
      zh: 'Simplified Chinese'
    };
    const targetLangName = langNames[targetLang] || 'English';
    const contextBlock = this.formatContextBlock(extraContext, targetLang);

    const systemPrompt = `You are a conversational AI video assistant.
You answer questions accurately based on the video transcript and the provided official video context (description, channel information, tags).
Video Title: "${title}"
${contextBlock ? `${contextBlock}\n` : ''}Always answer in ${targetLangName}.
If the answer is not mentioned in the transcript or description, state clearly that the video does not mention it.
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
    messages.push({ role: 'user', content: userQuestion });

    return { systemPrompt, messages };
  }
}

export default PromptBuilder;
