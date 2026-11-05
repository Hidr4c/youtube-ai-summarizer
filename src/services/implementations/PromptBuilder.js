import { IPromptBuilder } from '../interfaces/IPromptBuilder.js';
import { getFormatInstructions, TARGET_LANG_NAMES } from './PromptTemplates.js';

export { getFormatInstructions, TARGET_LANG_NAMES };

/**
 * Service for prompt generation, context compression, and system instructions
 */
export class PromptBuilder extends IPromptBuilder {
  /**
   * Smart 3-part condensation algorithm (40% intro, 25% middle, 35% conclusion)
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

    return `${intro}\n\n[... Progression de la vidéo condensée pour respecter la fenêtre de contexte de l'IA ...]\n\n${middle}\n\n[... Suite et conclusion de la vidéo ...]\n\n${end}`;
  }

  /**
   * Formats video description, channel, category and tag context for AI prompts
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
    if (subscribers) lines.push(isFr ? `- Abonnés chaîne : ${subscribers}` : `- Channel subscribers: ${subscribers}`);
    if (category) lines.push(isFr ? `- Catégorie : ${category}` : `- Category: ${category}`);
    if (publishDate) lines.push(isFr ? `- Date de publication : ${publishDate}` : `- Published date: ${publishDate}`);
    if (keywords) lines.push(isFr ? `- Mots-clés : ${keywords}` : `- Keywords: ${keywords}`);
    if (description) lines.push(isFr ? `- Description officielle :\n"""\n${description}\n"""` : `- Official Description:\n"""\n${description}\n"""`);
    if (extraContext.channelDossier) {
      lines.push('\n' + extraContext.channelDossier);
    }
    if (lines.length === 0) return '';

    const header = isFr ? 'CONTEXTE DE LA VIDÉO & DE LA CHAÎNE :' : 'VIDEO & CHANNEL CONTEXT:';
    return `${header}\n${lines.join('\n')}\n`;
  }

  /**
   * Builds system and user prompts for video summarization
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

    const isFr = lang === 'fr';
    const targetLangName = TARGET_LANG_NAMES[lang] || 'ENGLISH';

    const systemPrompt = isFr
      ? `Tu es un assistant IA d'élite YouTube Summarizer AI spécialisé dans la synthèse et l'analyse de vidéos.\nTon but absolu est de produire un résumé clair, naturel, bien structuré et fidèle EXCLUSIVEMENT en FRANÇAIS, quelle que soit la langue de la vidéo.\nOBLIGATION STRICTE : Rédige l'intégralité du résumé, tous les titres et analyses en FRANÇAIS.\nRÈGLES DE STYLE :\n- Style naturel, direct et percutant : va droit au but sans phrases de remplissage.\n- Évite les phrases inutilement longues, privilégie la fluidité et la clarté.\n- Mise en page aérée en Markdown avec des listes à puces et des mots-clés en **gras** en début de point.\n- Fidélité à 100% à la transcription, zéro hallucination ou extrapolation.`
      : `You are an expert AI assistant YouTube Summarizer AI specializing in video summarization and insights.\nYour absolute goal is to produce a clear, natural, well-structured, and faithful summary EXCLUSIVELY in ${targetLangName}, regardless of the original video language.\nMANDATORY LANGUAGE DIRECTIVE: Write the ENTIRE summary, all section headings, bullet points, and analysis strictly in ${targetLangName}. Do NOT use English unless the requested language is English.\nSTYLE RULES:\n- Natural, direct, and engaging style: go straight to the point without filler phrases.\n- Avoid overly long and complex sentences, focus on clarity and flow.\n- Use airy Markdown formatting with bullet points and **bold** keywords at the start of each point.\n- 100% faithful to the transcript, with zero hallucinations or extrapolation.`;

    const formatInstructions = getFormatInstructions(mode, lang);
    const contextBlock = this.formatContextBlock(extraContext, lang);
    const langRule = isFr
      ? `OBLIGATION : Rédige l'intégralité du résumé en FRANÇAIS.`
      : `MANDATORY: Write the entire summary exclusively in ${targetLangName}.`;

    const userPrompt = isFr
      ? `Voici la transcription de la vidéo YouTube :\nTitre : "${title}"\nAuteur/Chaîne : "${author}"${contextBlock ? `\n\n${contextBlock}` : ''}\n\n${langRule}\n\nFormat demandé :\n${formatInstructions}${customDirectives ? `\nDIRECTIVES PERSONNALISÉES DE L'UTILISATEUR :\n${customDirectives}\n` : ''}\n\nTRANSCRIPTION :\n${safeTranscript}`
      : `Here is the transcript of the YouTube video:\nTitle: "${title}"\nAuthor/Channel: "${author}"${contextBlock ? `\n\n${contextBlock}` : ''}\n\n${langRule}\n\nRequested format:\n${formatInstructions}${customDirectives ? `\nUSER CUSTOM DIRECTIVES:\n${customDirectives}\n` : ''}\n\nTRANSCRIPT:\n${safeTranscript}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Builds system and user messages for interactive Q&A chat
   */
  buildChatPrompts(title, transcriptText, targetLang, chatHistory, userQuestion, extraContext = {}) {
    const langNames = {
      en: 'English', fr: 'French', es: 'Spanish', de: 'German',
      it: 'Italian', ru: 'Russian', ja: 'Japanese', zh: 'Simplified Chinese'
    };
    const targetLangName = langNames[targetLang] || 'English';
    const contextBlock = this.formatContextBlock(extraContext, targetLang);

    const systemPrompt = `You are a conversational AI video assistant YouTube Summarizer AI.\nYou answer questions accurately based on the video transcript and the provided official video context (description, channel information, tags).\nVideo Title: "${title}"\n${contextBlock ? `${contextBlock}\n` : ''}Always answer in ${targetLangName}.\nIf an official channel dossier is provided above, use it authoritatively to answer questions regarding the channel, creator, recent videos, and editorial background. Otherwise, if the answer is not mentioned in the transcript or video context, state clearly that the video does not mention it.\nBe concise, helpful, and quote timestamps in [m:ss] format if applicable.\n\nTRANSCRIPT:\n${transcriptText}`;

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
