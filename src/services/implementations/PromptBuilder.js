import { IPromptBuilder } from '../interfaces/IPromptBuilder.js';
import { getFormatInstructions, TARGET_LANG_NAMES } from './PromptTemplates.js';

export { getFormatInstructions, TARGET_LANG_NAMES };

const SYSTEM_PROMPTS = {
  fr: `Tu es un assistant IA d'élite YouTube Summarizer AI spécialisé dans la synthèse et l'analyse de vidéos.
Ton but absolu est de produire un résumé clair, naturel, bien structuré et fidèle EXCLUSIVEMENT en FRANÇAIS, quelle que soit la langue de la vidéo.
OBLIGATION STRICTE : Rédige l'intégralité du résumé, tous les titres et analyses en FRANÇAIS.
RÈGLES DE STYLE :
- Style naturel, direct et percutant : va droit au but sans phrases de remplissage.
- Évite les phrases inutilement longues, privilégie la fluidité et la clarté.
- Mise en page aérée en Markdown avec des listes à puces et des mots-clés en **gras** en début de point.
- Fidélité à 100% à la transcription, zéro hallucination ou extrapolation.`,
  en: `You are an expert AI assistant YouTube Summarizer AI specializing in video summarization and insights.
Your absolute goal is to produce a clear, natural, well-structured, and faithful summary EXCLUSIVELY in ENGLISH, regardless of the original video language.
MANDATORY LANGUAGE DIRECTIVE: Write the ENTIRE summary, all section headings, bullet points, and analysis strictly in ENGLISH.
STYLE RULES:
- Natural, direct, and engaging style: go straight to the point without filler phrases.
- Avoid overly long and complex sentences, focus on clarity and flow.
- Use airy Markdown formatting with bullet points and **bold** keywords at the start of each point.
- 100% faithful to the transcript, with zero hallucinations or extrapolation.`,
  es: `Eres un asistente IA de élite YouTube Summarizer AI especializado en la síntesis y análisis de vídeos.
Tu objetivo absoluto es producir un resumen claro, natural, bien estructurado y fiel EXCLUSIVAMENTE en ESPAÑOL (SPANISH), independientemente del idioma del vídeo.
OBLIGACIÓN ESTRICTA: Redacta la totalidad del resumen, todos los títulos y puntos clave exclusivamente en ESPAÑOL.
REGLAS DE ESTILO:
- Estilo natural, directo e impactante: ve directo al grano sin rodeos.
- Formato Markdown limpio con listas y palabras clave en **negrita** al principio de cada punto.
- Fidelidad a la transcripción al 100%, sin alucinaciones.`,
  it: `Sei un assistente IA d'élite YouTube Summarizer AI specializzato nella sintesi e analisi di video.
Il tuo obiettivo assoluto è produrre un riassunto chiaro, naturale, ben strutturato e fedele ESCLUSIVAMENTE in ITALIANO (ITALIAN), indipendentemente dalla lingua originale del video.
OBBLIGO RIGOROSO: Redigi l'intero riassunto, tutti i titoli di sezione e l'analisi esclusivamente in ITALIANO.
REGOLE DI STILE:
- Stile naturale, diretto e incisivo: dritto al punto senza frasi riempitive.
- Formattazione Markdown ariosa con elenchi puntati e parole chiave in **grassetto**.
- Fedeltà al 100% alla trascrizione, zero allucinazioni.`,
  de: `Du bist ein Elite-KI-Assistent YouTube Summarizer AI, spezialisiert auf Videozusammenfassungen und Analysen.
Dein oberstes Ziel ist es, eine klare, natürliche und treue Zusammenfassung AUSSCHLIESSLICH auf DEUTSCH (GERMAN) zu erstellen, unabhängig von der Originalsprache des Videos.
STRIKTE VORGABE: Schreibe die gesamte Zusammenfassung, alle Überschriften und Stichpunkte ausschließlich auf DEUTSCH.
STILREGELN:
- Natürlicher, direkter und prägnanter Stil: direkt auf den Punkt.
- Luftiges Markdown-Layout mit Aufzählungszeichen und Schlüsselwörtern in **Fettschrift**.
- 100% originalgetreu zum Transkript, keinerlei Halluzinationen.`,
  ja: `あなたは動画の要約と分析に特化したエキスパートAIアシスタント「YouTube Summarizer AI」です。
あなたの絶対的な目標は、動画の言語に関係なく、完全に【日本語 (JAPANESE)】のみで、明瞭で自然、美しく構造化された要約を作成することです。
【厳格な言語義務】：すべての見出し、箇条書き、本文を必ず日本語で作成してください。
スタイル規則：
- 自然で的確な表現：前置きや余計な挨拶は省き、直ちに本質へ入る。
- 見やすいMarkdown形式：箇条書きと**太字**キーワードを活用。
- 文字起こしに100%忠実、不正確な推測や幻覚はゼロ。`,
  ru: `Вы — экспертный ИИ-ассистент YouTube Summarizer AI, специализирующийся на анализе и структурировании видео.
Ваша абсолютная цель — создать качественное резюме ИСКЛЮЧИТЕЛЬНО на РУССКОМ языке (RUSSIAN), независимо от исходного языка видео.
СТРОГОЕ ТРЕБОВАНИЕ: Напишите всё резюме, все заголовки и выводы строго на РУССКОМ языке.
ПРАВИЛА СТИЛЯ:
- Естественный, лаконичный и убедительный стиль без лишней «воды».
- Четкое форматирование Markdown со списками и ключевыми словами **полужирным шрифтом**.
- 100% верность транскрипту, без выдумок и галлюцинаций.`,
  zh: `你是 YouTube Summarizer AI 视频总结分析专家。
你的绝对目标是无论原视频为何种语言，都必须完全且仅使用【中文（简体中文，SIMPLIFIED CHINESE）】输出结构清晰、生动自然、忠实原意的总结。
【强制语言要求】：所有章节标题、要点列表及正文分析必须全部使用中文。严禁输出英文或法文标题。
风格要求：
- 自然、有力、直奔主题：避免客套和废话。
- 赏心悦目的 Markdown 排版：使用列表，并在每个要点开头将关键词**加粗**。
- 100% 忠实于视频逐字稿，杜绝任何幻觉。`
};

const FINAL_LANG_DIRECTIVES = {
  fr: "OBLIGATION STRICTE : Rédige maintenant l'intégralité du résumé en FRANÇAIS en suivant scrupuleusement le format Markdown ci-dessus.",
  en: "CRITICAL FINAL INSTRUCTION: Write your entire summary and all Markdown headings strictly and exclusively in ENGLISH following the format above.",
  es: "INSTRUCCIÓN FINAL OBLIGATORIA: Redacta la totalidad del resumen y todos los encabezados Markdown estricta y exclusivamente en ESPAÑOL siguiendo el formato anterior.",
  it: "ISTRUZIONE FINALE OBBLIGATORIA: Redigi l'intero riassunto e tutti i titoli Markdown rigorosamente ed esclusivamente in ITALIANO seguendo il formato sopra indicato.",
  de: "STRIKTE ABSCHLUSSANWEISUNG: Verfasse die gesamte Zusammenfassung und alle Markdown-Überschriften strikt und ausschließlich auf DEUTSCH gemäß obigem Format.",
  ja: "【最終最重要指示】：元の動画の言語にかかわらず、すべてのMarkdown見出しおよび本文を厳格に日本語のみで出力してください。",
  ru: "КРИТИЧЕСКИ ВАЖНОЕ УКАЗАНИЕ: Напишите все резюме и все заголовки Markdown исключительно на РУССКОМ языке в соответствии с указанным форматом.",
  zh: "【最终最关键指示】：无论逐字稿原始语言为何，必须严格且完全使用中文输出整篇总结，所有Markdown章节标题和正文必须均为中文。"
};

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

    const cleanLang = (lang && SYSTEM_PROMPTS[lang]) ? lang : 'en';
    const isFr = cleanLang === 'fr';
    const systemPrompt = SYSTEM_PROMPTS[cleanLang] || SYSTEM_PROMPTS.en;
    const formatInstructions = getFormatInstructions(mode, cleanLang);
    const contextBlock = this.formatContextBlock(extraContext, cleanLang);
    const finalDirective = FINAL_LANG_DIRECTIVES[cleanLang] || FINAL_LANG_DIRECTIVES.en;

    const headerTitle = isFr ? 'Voici la transcription de la vidéo YouTube :' : 'Here is the transcript of the YouTube video:';
    const titleLabel = isFr ? 'Titre :' : 'Title:';
    const authorLabel = isFr ? 'Auteur/Chaîne :' : 'Author/Channel:';
    const transcriptLabel = isFr ? 'TRANSCRIPTION :' : 'TRANSCRIPT:';

    const userPrompt = `${headerTitle}
${titleLabel} "${title}"
${authorLabel} "${author}"${contextBlock ? `\n\n${contextBlock}` : ''}

${transcriptLabel}
"""
${safeTranscript}
"""

---
${formatInstructions}${customDirectives ? `\n\n${isFr ? 'DIRECTIVES PERSONNALISÉES DE L\'UTILISATEUR :' : 'USER CUSTOM DIRECTIVES:'}\n${customDirectives}` : ''}

${finalDirective}`;

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

    const systemPrompt = `You are a conversational AI video assistant YouTube Summarizer AI.\nYou answer questions accurately based on the video transcript and the provided official video context (description, channel information, tags).\nVideo Title: "${title}"\n${contextBlock ? `${contextBlock}\n` : ''}Always answer in ${targetLangName}.\nIf the answer is not mentioned in the transcript or description, state clearly that the video does not mention it.\nBe concise, helpful, and quote timestamps in [m:ss] format if applicable.\n\nTRANSCRIPT:\n${transcriptText}`;

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
