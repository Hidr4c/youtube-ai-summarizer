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
    summaryLabel: "ZUVOR GENERIERTE VIDEO-ZUSAMMENFASSUNG (ALS REFERENZ):",
    transcriptLabel: "Transkript des Videos:"
  },
  ja: {
    persona: "あなたは YouTube Summarizer AI、YouTube 画面に直接統合されたインテリジェントな Chrome 拡張機能アシスタントです。",
    role: "動画の文字起こし、公式コンテキスト（説明文、チャンネル情報、タグ）、および生成された要約に基づいて正確に回答してください。",
    identity: "拡張機能について言及された場合、YouTube Summarizer AI アシスタントであることを確認してください。",
    rule: "【言語の絶対義務】動画や質問の言語にかかわらず、必ず【日本語】のみで回答してください。",
    quick: "希望の長さ：簡潔で要点のみの短い回答（1〜2の短い段落）。",
    detailed: "希望の長さ：詳細で充実した解説。",
    standard: "希望の長さ：自然でバランスの取れた、要点を得た回答。",
    summaryLabel: "以前に生成された動画の要約（参考用）：",
    transcriptLabel: "動画の文字起こし："
  },
  ru: {
    persona: "Вы — YouTube Summarizer AI, интеллектуальный Chrome-ассистент, встроенный в YouTube.",
    role: "Вы отвечаете на вопросы пользователя строго на основе транскрипта видео, официального контекста (описания, канала, тегов) и сгенерированного резюме.",
    identity: "Если пользователь спрашивает, кто вы, подтвердите, что вы ассистент расширения YouTube Summarizer AI.",
    rule: "СТРОГОЕ ПРАВИЛО: Отвечайте ИСКЛЮЧИТЕЛЬНО на РУССКОМ языке, независимо от языка вопроса или видео.",
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

export const CHAT_USER_DIRECTIVES = {
  fr: "\n\n(Consigne impérative : Réponds EXCLUSIVEMENT en FRANÇAIS, quelle que soit la langue de la question, de la vidéo ou des échanges précédents.)",
  en: "\n\n(Mandatory directive: Answer EXCLUSIVELY in ENGLISH, regardless of the question, video, or prior conversation language.)",
  es: "\n\n(Instrucción obligatoria: Responde EXCLUSIVAMENTE en ESPAÑOL, independientemente del idioma de la pregunta, del vídeo o del historial.)",
  it: "\n\n(Obbligo rigoroso: Rispondi ESCLUSIVAMENTE in ITALIANO, indipendentemente dalla lingua della domanda, del video o dei messaggi precedenti.)",
  de: "\n\n(Strikte Vorgabe: Antworte AUSSCHLIESSLICH auf DEUTSCH, unabhängig von der Sprache der Frage, des Videos oder des bisherigen Verlaufs.)",
  ja: "\n\n【言語指示：動画や質問、過去の会話履歴にかかわらず、必ず【日本語】のみで回答してください。】",
  ru: "\n\n(Строгое указание: Отвечайте ИСКЛЮЧИТЕЛЬНО на РУССКОМ языке, независимо от языка вопроса, видео или предыдущих сообщений.)",
  zh: "\n\n【语言强制指令：无论提问、原视频或此前对话为何种语言，本回答必须全部且仅使用【中文（简体中文）】输出。严禁使用法语或英语。】"
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
  static buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode, summaryText = '', externalContext = '') {
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

    const extBlock = (externalContext && externalContext.trim())
      ? `\n${externalContext.trim()}\n\nDIRECTIVES DE COMPARAISON MULTI-VIDÉOS :\n- L'utilisateur a fourni le contexte d'une ou plusieurs vidéos YouTube externes.\n- Réponds aux questions en comparant et recoupant les informations des vidéos avec rigueur.\n- Attribue explicitement les faits à leur vidéo ou auteur respectif.\n`
      : '';

    return `${cfg.persona}
${cfg.role}
${cfg.identity}

${cfg.rule}

Title: "${meta?.title || ''}"
Channel: "${meta?.author || ''}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}${summaryBlock}${extBlock}
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
   - 100% faithful to the video content, transcript, and summary without hallucinations.
5. FINAL MANDATORY DIRECTIVE:
   - ${cfg.rule}`;
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
  const externalContext = arguments[5] || '';
  return PromptService.buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode, summaryText, externalContext);
}

export default PromptService;
