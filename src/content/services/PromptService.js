import { formatContextInfo } from './YouTubeDOMContext.js';
import { PromptBuilder } from '../../services/implementations/PromptBuilder.js';

const promptBuilder = new PromptBuilder();

const CHAT_LANG_MAP = {
  fr: {
    persona: "Tu es YouTube Summarizer AI, une extension Chrome intelligente intégrée directement sous la vidéo YouTube.",
    role: "Tu réponds aux questions de l'utilisateur sur cette vidéo YouTube en t'appuyant rigoureusement sur sa transcription et sur le contexte officiel fourni (description, chaîne, catégorie) ainsi que sur le résumé vidéo.",
    identity: "Si l'utilisateur mentionne l'extension ou te demande qui tu es, confirme explicitement que tu es l'assistant de l'extension YouTube Summarizer AI.",
    rule: "OBLIGATION STRICTE DE LANGUE : Tu DOIS répondre EXCLUSIVEMENT en FRANÇAIS, quelle que soit la langue de la vidéo ou de la question.",
    quick: "Longueur souhaitée : réponse courte, concise et directe (1 ou 2 courts paragraphes).",
    detailed: "Longueur souhaitée : réponse détaillée et approfondie.",
    standard: "Longueur souhaitée : réponse équilibrée et naturelle, allant droit au but.",
    summaryLabel: "RÉSUMÉ VIDÉO PRÉCÉDEMMENT GÉNÉRÉ DANS L'EXTENSION (POUR RÉFÉRENCE) :",
    transcriptLabel: "Transcription de la vidéo :"
  },
  en: {
    persona: "You are YouTube Summarizer AI, an intelligent Chrome extension built directly into YouTube.",
    role: "You answer the user's questions about this YouTube video, strictly based on its transcript and official video context (description, channel information, tags) along with the generated summary.",
    identity: "If the user mentions the extension or asks who you are, explicitly confirm that you are the YouTube Summarizer AI Chrome extension assistant.",
    rule: "MANDATORY LANGUAGE RULE: You MUST write your ENTIRE response EXCLUSIVELY in ENGLISH, regardless of the video or question language.",
    quick: "Desired length: short and concise answer (1-2 short paragraphs), straight to the point.",
    detailed: "Desired length: detailed and comprehensive explanation.",
    standard: "Desired length: balanced, natural response, not too long, straight to the point.",
    summaryLabel: "PREVIOUSLY GENERATED VIDEO SUMMARY (FOR USER REFERENCE):",
    transcriptLabel: "Video Transcript:"
  },
  es: {
    persona: "Eres YouTube Summarizer AI, una extensión inteligente de Chrome integrada directamente en YouTube.",
    role: "Respondes a las preguntas del usuario sobre este vídeo de YouTube basándote estrictamente en su transcripción, contexto oficial y resumen.",
    identity: "Si el usuario menciona la extensión o pregunta quién eres, confirma explícitamente que eres el asistente de la extensión YouTube Summarizer AI.",
    rule: "REGLA OBLIGATORIA DE IDIOMA: Debes responder ÚNICA Y EXCLUSIVAMENTE en ESPAÑOL, sea cual sea el idioma de la pregunta o del vídeo.",
    quick: "Longitud deseada: respuesta corta y concisa (1 o 2 párrafos cortos).",
    detailed: "Longitud deseada: respuesta detallada y completa.",
    standard: "Longitud deseada: respuesta equilibrada y natural, sin rodeos.",
    summaryLabel: "RESUMEN DEL VÍDEO PREVIAMENTE GENERADO EN LA EXTENSIÓN (PARA REFERENCIA):",
    transcriptLabel: "Transcripción del vídeo:"
  },
  it: {
    persona: "Sei YouTube Summarizer AI, un'estensione intelligente per Chrome integrata direttamente in YouTube.",
    role: "Rispondi alle domande dell'utente su questo video di YouTube basandoti rigorosamente sulla trascrizione, sul contesto ufficiale e sul riassunto.",
    identity: "Se l'utente menziona l'estensione o chiede chi sei, conferma esplicitamente di essere l'assistente dell'estensione YouTube Summarizer AI.",
    rule: "REGOLA OBBLIGATORIA SULLA LINGUA: Devi rispondere ESCLUSIVAMENTE in ITALIANO, indipendentemente dalla lingua della domanda o del video.",
    quick: "Lunghezza desiderata: risposta breve e concisa (1 o 2 brevi paragrafi).",
    detailed: "Lunghezza desiderata: spiegazione dettagliata e approfondita.",
    standard: "Lunghezza desiderata: risposta equilibrata e naturale, dritta al punto.",
    summaryLabel: "RIASSUNTO DEL VIDEO PRECEDENTEMENTE GENERATO NELL'ESTENSIONE (PER RIFERIMENTO):",
    transcriptLabel: "Trascrizione del video:"
  },
  de: {
    persona: "Du bist YouTube Summarizer AI, eine intelligente Chrome-Erweiterung, die direkt in YouTube integriert ist.",
    role: "Du beantwortest Fragen des Nutzers basierend auf dem Videotranskript, offiziellen Kontextdaten und der Videozusammenfassung.",
    identity: "Wenn der Nutzer die Erweiterung erwähnt oder fragt wer du bist, bestätige explizit, dass du der Assistent der YouTube Summarizer AI Chrome-Erweiterung bist.",
    rule: "STRIKTE SPRACHVORGABE: Antworte AUSSCHLIESSLICH auf DEUTSCH, unabhängig von der Sprache der Frage oder des Videos.",
    quick: "Gewünschte Länge: kurze und prägnante Antwort (1-2 kurze Absätze).",
    detailed: "Gewünschte Länge: ausführliche und detaillierte Erklärung.",
    standard: "Gewünschte Länge: ausgewogene, natürliche Antwort, direkt auf den Punkt.",
    summaryLabel: "ZUVOR GENERIERTE VIDEOZUSAMMENFASSUNG IN DER ERWEITERUNG (ZUR REFERENZ):",
    transcriptLabel: "Videotranskript:"
  },
  ja: {
    persona: "あなたはYouTubeに直接統合されたインテリジェントなChrome拡張機能「YouTube Summarizer AI」です。",
    role: "動画の文字起こし、公式概要、および生成された要約に基づいて正確に回答してください。",
    identity: "ユーザーが拡張機能について言及した場合は、自身がYouTube Summarizer AI拡張機能のアシスタントであることを認めてください。",
    rule: "【最重要言語ルール】質問や動画の言語に関係なく、必ず自然な日本語のみで回答してください。",
    quick: "希望する長さ：簡潔な回答（1〜2段落）。",
    detailed: "希望する長さ：詳細で網羅的な説明。",
    standard: "希望する長さ：要点を押さえた自然な回答。",
    summaryLabel: "拡張機能で以前に生成された動画の要約（参考用）：",
    transcriptLabel: "動画の文字起こし："
  },
  ru: {
    persona: "Вы — YouTube Summarizer AI, интеллектуальное расширение Chrome, встроенное прямо в YouTube.",
    role: "Вы отвечаете на вопросы пользователя о видео strictly на основе транскрипта, контекста и готового резюме.",
    identity: "Если пользователь упоминает расширение или спрашивает кто вы, подтвердите, что вы ассистент расширения YouTube Summarizer AI.",
    rule: "СТРОГОЕ ТРЕБОВАНИЕ К ЯЗЫКУ: Отвечайте ИСКЛЮЧИТЕЛЬНО на РУССКОМ языке, независимо от языка вопроса или видео.",
    quick: "Желаемый объем: краткий и четкий ответ (1-2 коротких абзаца).",
    detailed: "Желаемый объем: подробное и исчерпывающее объяснение.",
    standard: "Желаемый объем: сбалансированный и естественный ответ по существу.",
    summaryLabel: "РАНЕЕ СФОРМИРОВАННОЕ РЕЗЮМЕ ВИДЕО В РАСШИРЕНИИ (ДЛЯ СПРАВКИ):",
    transcriptLabel: "Транскрипт видео:"
  },
  zh: {
    persona: "你是 YouTube Summarizer AI，一款直接内嵌于 YouTube 的智能 Chrome 扩展程序助手。",
    role: "请严格依据视频逐字稿、官方视频信息和已生成的视频摘要回答用户的问题。",
    identity: "如果用户提到扩展程序或询问你的身份，请明确确认你是 YouTube Summarizer AI 扩展程序助手。",
    rule: "【强制语言要求】无论提问或视频原始语言为何，必须全部使用中文（简体中文）回答。",
    quick: "期望长度：简明扼要的回答（1-2个简短段落）。",
    detailed: "期望长度：详尽而深入的解释分析。",
    standard: "期望长度：自然平衡、直奔主题的回答。",
    summaryLabel: "此前在扩展程序中生成的视频摘要（供参考）：",
    transcriptLabel: "视频逐字稿："
  }
};

/**
 * Prompt service for in-page summarization and interactive Q&A
 */
export class PromptService {
  /**
   * Condenses transcript to fit within AI model context limits
   */
  static condenseTranscriptForContext(transcript, maxChars) {
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

    return `${intro}\n\n[... Progression de la vidéo condensée pour respecter la mémoire du modèle ...]\n\n${middle}\n\n[... Progression vers la conclusion ...]\n\n${end}`;
  }

  /**
   * Builds system and user prompts for in-page video summarization
   */
  static buildPrompts(title, author, safeTranscript, lang, mode, meta = null) {
    const resolvedMeta = meta || { title, author };
    const { systemPrompt, userPrompt } = promptBuilder.buildSummaryPrompts(
      title,
      author,
      safeTranscript,
      lang,
      mode,
      '',
      resolvedMeta
    );
    return { systemPrompt, userPrompt };
  }

  /**
   * Builds chat system prompt for interactive Q&A
   */
  static buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode) {
    const summaryText = arguments[4] || '';
    const contextBlock = formatContextInfo(meta, lang);
    const subStr = meta?.subscribers ? ` (${meta.subscribers})` : '';
    const cleanLang = (lang && CHAT_LANG_MAP[lang]) ? lang : 'fr';
    const cfg = CHAT_LANG_MAP[cleanLang];

    let lenDir = cfg.standard;
    if (selectedChatMode === 'quick') lenDir = cfg.quick;
    else if (selectedChatMode === 'detailed') lenDir = cfg.detailed;

    const summaryBlock = (summaryText && summaryText.trim())
      ? `\n${cfg.summaryLabel}\n"""\n${summaryText.trim()}\n"""\n`
      : '';

    const channelDossier = meta?.channelDossier || arguments[5] || '';
    const channelBlock = channelDossier ? `\n${channelDossier}\n` : '';
    const channelDirective = channelDossier
      ? (cleanLang === 'fr'
        ? '\nDOSSIER DE CHAÎNE : Un dossier officiel de la chaîne et des dernières vidéos est fourni ci-dessous. Utilise-le pour analyser le créateur, son parcours, ses thèmes récents et son indépendance.\n'
        : '\nCHANNEL DOSSIER: An official channel dossier with recent videos is provided below. Use it to analyze the creator, topics, and editorial stance.\n')
      : '';

    const commentsDossier = meta?.commentsDossier || arguments[6] || '';
    const commentsBlock = commentsDossier ? `\n${commentsDossier}\n` : '';
    const commentsDirective = commentsDossier
      ? (cleanLang === 'fr'
        ? '\nAVIS ET RÉACTIONS DU PUBLIC : Une sélection de commentaires et réactions de la communauté sous la vidéo est fournie ci-dessous. Utilise-la fidèlement pour analyser le ressenti général, les débats, les critiques et les réactions du public. Si l\'utilisateur demande de retrouver un commentaire précis, mentionne un auteur (@pseudo) ou recherche un message particulier, identifie-le formellement dans la liste et cite-le textuellement avec son auteur et ses métadonnées.\n'
        : '\nAUDIENCE & COMMUNITY REACTIONS: A selection of public comments and viewer feedback is provided below. Use them to accurately analyze community sentiment, praise, criticisms, and audience reception. If the user asks to find a specific comment, mentions a user handle (@handle), or searches for a particular message, locate it explicitly in the list and quote it verbatim with author and metadata.\n')
      : '';

    const multiVideoDirective = safeTranscript.includes('[VIDÉO EXTERNE')
      ? (cleanLang === 'fr'
        ? '\nCONTEXTE MULTI-VIDÉOS : La discussion porte sur plusieurs vidéos fournies dans la transcription ([VIDÉO ACTUELLE] et [VIDÉO EXTERNE ...]). Conserve la mémoire et le contenu de chacune de ces vidéos tout au long de la conversation. Compare leurs informations avec précision et ne prétends jamais que tu ne peux pas accéder aux vidéos externes déjà fournies.\n'
        : '\nMULTI-VIDEO CONTEXT: This discussion involves multiple YouTube videos provided in the transcript section ([VIDÉO ACTUELLE] and [VIDÉO EXTERNE ...]). Maintain continuous awareness of all referenced videos across the discussion. Accurately compare them and never claim you lack access to the provided external videos.\n')
      : '';

    return `${cfg.persona}
${cfg.role}
${cfg.identity}

${cfg.rule}${multiVideoDirective}${channelDirective}${commentsDirective}

Title: "${meta?.title || ''}"
Channel: "${meta?.author || ''}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}${summaryBlock}${channelBlock}${commentsBlock}
${cfg.transcriptLabel}
"""
${safeTranscript}
"""

WRITING & AUDIO PLAYBACK GUIDELINES:
1. ${cfg.rule}
2. ${lenDir}
3. CONTINUOUS PROSE (TTS READY):
   - Write in flowing, natural prose paragraphs without disjointed lists or decorative emojis for smooth audio playback.
4. READABLE STRUCTURE:
   - Break answers into short paragraphs with **bold** key terms.
   - 100% faithful to the video content, transcript, and summary without hallucinations.`;
  }
}

export function condenseTranscriptForContext(transcript, maxChars) {
  return PromptService.condenseTranscriptForContext(transcript, maxChars);
}

export function buildPrompts(title, author, safeTranscript, lang, mode, meta = null) {
  return PromptService.buildPrompts(title, author, safeTranscript, lang, mode, meta);
}

export function buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode) {
  const summaryText = arguments[4] || '';
  return PromptService.buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode, arguments[4] || '', arguments[5] || '', arguments[6] || '');
}

export default PromptService;
