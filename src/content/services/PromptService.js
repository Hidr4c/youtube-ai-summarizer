import { formatContextInfo } from './YouTubeDOMContext.js';
import { PromptBuilder } from '../../services/implementations/PromptBuilder.js';

const promptBuilder = new PromptBuilder();

/**
 * Prompt service for in-page summarization and interactive Q&A
 */
export class PromptService {
  /**
   * Condenses transcript to fit within AI model context limits
   * @param {string} transcript
   * @param {number} maxChars
   * @returns {string}
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
    const contextBlock = formatContextInfo(meta, lang);
    const subStr = meta?.subscribers ? ` (${meta.subscribers})` : '';

    if (lang === 'en') {
      let lenDir = 'Desired length: balanced, natural response, not too long, straight to the point.';
      if (selectedChatMode === 'quick') lenDir = 'Desired length: short and concise answer (1-2 short paragraphs), straight to the point.';
      else if (selectedChatMode === 'detailed') lenDir = 'Desired length: detailed and comprehensive explanation.';

      return `You are an expert AI assistant specializing in clear, natural, and direct oral and written explanations.
You answer the user's questions about this YouTube video, strictly based on its transcript and official video context (description, channel information, tags):
Title: "${meta.title}"
Channel: "${meta.author}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}
Transcript:
"""
${safeTranscript}
"""

WRITING GUIDELINES (FOR READING AND AUDIO LISTENING):
1. NATURAL AND DIRECT TONE:
   - Answer in clear, fluent, natural English.
   - Go straight to the point without filler phrases.
   - ${lenDir}

2. CONTINUOUS PROSE (NO THEMATIC BULLETS OR EMOJIS):
   - Write in flowing prose paragraphs so that text-to-speech (TTS) playback remains smooth.

3. AIRY STRUCTURE:
   - Break your response into short, readable paragraphs with **bold** key terms.
   - 100% faithful to the transcript and official description, no hallucinations.`;
    }

    if (lang === 'es') {
      let lenDir = 'Longitud deseada: respuesta equilibrada y natural, sin rodeos.';
      if (selectedChatMode === 'quick') lenDir = 'Longitud deseada: respuesta corta y concisa (1 o 2 párrafos cortos).';
      else if (selectedChatMode === 'detailed') lenDir = 'Longitud deseada: respuesta detallada y completa.';

      return `Eres un asistente de IA experto en explicaciones orales y escritas en ESPAÑOL.
Respondes a las preguntas del usuario sobre este vídeo de YouTube basándote estrictamente en su transcripción y en el contexto oficial (descripción, canal, etiquetas):
Título: "${meta.title}"
Canal: "${meta.author}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}
Transcripción:
"""
${safeTranscript}
"""
${lenDir} Resalta términos clave en **negrita**, sin viñetas para lectura TTS fluida. 100% fiel.`;
    }

    if (lang === 'de') {
      let lenDir = 'Gewünschte Länge: ausgewogene, natürliche Antwort, direkt auf den Punkt.';
      if (selectedChatMode === 'quick') lenDir = 'Gewünschte Länge: kurze und prägnante Antwort.';
      else if (selectedChatMode === 'detailed') lenDir = 'Gewünschte Länge: ausführliche und detaillierte Erklärung.';

      return `Du bist ein KI-Experte für klare Erklärungen auf DEUTSCH.
Beantworte Fragen basierend auf dem Transkript und offiziellen Videoinformationen:
Titel: "${meta.title}"
Kanal: "${meta.author}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}
Transkript:
"""
${safeTranscript}
"""
${lenDir} Fließtext für flüssige TTS-Wiedergabe, **fettgedruckte** Schlüsselwörter.`;
    }

    if (lang === 'ja') {
      return `あなたはYouTube動画の内容について日本語で回答するAIアシスタントです。
公式概要欄と文字起こしに忠実に回答してください：
タイトル: "${meta.title}"
チャンネル: "${meta.author}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}
文字起こし:
"""
${safeTranscript}
"""
自然な日本語の段落で、キーワードを **太字** で強調してください。`;
    }

    if (lang === 'zh') {
      return `你是一位专业的人工智能视频助手。请根据视频逐字稿与官方视频简介准确回答问题：
标题: "${meta.title}"
频道: "${meta.author}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}
逐字稿:
"""
${safeTranscript}
"""
以连贯的段落叙述，核心关键词用 **加粗** 显示。`;
    }

    // Français par défaut
    let lengthDirective = "Longueur souhaitée : réponse équilibrée et naturelle, pas trop longue, allant droit à l'essentiel.";
    if (selectedChatMode === 'quick') {
      lengthDirective = "Longueur souhaitée : réponse courte, concise et directe (1 ou 2 courts paragraphes suffisent).";
    } else if (selectedChatMode === 'detailed') {
      lengthDirective = "Longueur souhaitée : réponse détaillée et approfondie, développant les explications et arguments.";
    }

    return `Tu es un assistant IA expert en explications orales et écrites : directes, claires, naturelles et agréables à écouter.
Tu réponds aux questions de l'utilisateur sur la vidéo YouTube en t'appuyant rigoureusement sur sa transcription et sur le contexte officiel fourni (description officielle de la vidéo, chaîne, catégorie, mots-clés) :
Titre : "${meta.title}"
Chaîne : "${meta.author}"${subStr}
${contextBlock ? `\n${contextBlock}` : ''}
Transcription de la vidéo :
"""
${safeTranscript}
"""

DIRECTIVES DE RÉDACTION (CONFORT VISUEL ET ÉCOUTE AUDIO) :
1. TON NATUREL ET DIRECT :
   - Réponds de façon vivante, fluide et naturelle.
   - Va droit au but sans bavardage superflu.
   - ${lengthDirective}

2. FORMAT EN PROSE (PAS DE PUCES THÉMATIQUES NI D'ÉMOJIS) :
   - Rédige sous forme de paragraphes en prose continue pour que la lecture vocale (TTS) reste fluide.

3. STRUCTURE AÉRÉE :
   - Découpe ton texte en courts paragraphes faciles à lire avec des mots-clés en **gras**.
   - 100% fidèle à la transcription et à la description officielle, sans rien inventer.`;
  }
}

export function condenseTranscriptForContext(transcript, maxChars) {
  return PromptService.condenseTranscriptForContext(transcript, maxChars);
}

export function buildPrompts(title, author, safeTranscript, lang, mode, meta = null) {
  return PromptService.buildPrompts(title, author, safeTranscript, lang, mode, meta);
}

export function buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode) {
  return PromptService.buildChatSystemPrompt(meta, safeTranscript, lang, selectedChatMode);
}

export default PromptService;
