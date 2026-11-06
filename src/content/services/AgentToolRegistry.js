/**
 * Registry defining OpenAI-compatible agentic tools and function calling schemas
 */
export class AgentToolRegistry {
  /**
   * Returns list of tools available for LLM function calling
   * @param {string} [lang='fr']
   * @returns {Array<Object>}
   */
  static getTools(lang = 'fr') {
    const isFr = lang === 'fr';

    return [
      {
        type: 'function',
        function: {
          name: 'fetch_channel_dossier',
          description: isFr
            ? 'Récupère le dossier officiel complet de la chaîne YouTube d\'un créateur (biographie, statistiques abonnés, volume de vidéos et les 30 dernières vidéos publiées avec date et vues). Utilise cet outil quand l\'utilisateur demande d\'analyser une chaîne, le parcours du créateur, ses partenariats ou ses thématiques récentes.'
            : 'Fetches the comprehensive official dossier of a YouTube creator channel (biography, subscribers, total uploads, and last 30 published videos with view counts and dates). Use when the user asks to analyze a channel, creator background, recent topics, or sponsorships.',
          parameters: {
            type: 'object',
            properties: {
              channel_query: {
                type: 'string',
                description: isFr
                  ? 'Identifiant de la chaîne (ex: @JulienChieze), URL YouTube ou nom du créateur'
                  : 'Channel handle (e.g. @JulienChieze), YouTube URL or creator name'
              }
            },
            required: ['channel_query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_video_transcript',
          description: isFr
            ? 'Récupère la transcription intégrale et les métadonnées d\'une autre vidéo YouTube via son URL ou son identifiant.'
            : 'Fetches the full transcript and metadata of another YouTube video via its URL or 11-character video ID.',
          parameters: {
            type: 'object',
            properties: {
              video_url_or_id: {
                type: 'string',
                description: isFr ? 'URL de la vidéo ou ID YouTube' : 'YouTube video URL or ID'
              }
            },
            required: ['video_url_or_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_video_comments',
          description: isFr
            ? 'Récupère les commentaires les plus populaires et les réactions du public sous une vidéo YouTube pour analyser le sentiment de la communauté, les avis des spectateurs ou les controverses.'
            : 'Fetches top public comments and audience reactions under a YouTube video to analyze community sentiment, viewer opinions, and debates.',
          parameters: {
            type: 'object',
            properties: {
              video_id: {
                type: 'string',
                description: isFr ? 'ID de la vidéo YouTube' : 'YouTube video ID'
              }
            }
          }
        }
      }
    ];
  }

  /**
   * System directive teaching the LLM how to utilize channel dossiers and comments
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static getAgentSystemDirective(lang = 'fr') {
    if (lang === 'fr') {
      return `\nCAPACITÉS D'ANALYSE AVANCÉES & DOSSIERS DE CHAÎNE ET AGENTIQUES :\n` +
        `- Si un dossier de chaîne officielle est fourni, utilise-le de manière approfondie et factuelle pour répondre aux questions sur le créateur, sa ligne éditoriale, ses sponsors et son parcours.\n` +
        `- Si les commentaires et réactions de la communauté sont fournis, analyse-les pour restituer fidèlement l'avis du public, les critiques et le sentiment des spectateurs.\n` +
        `- Reste objectif, nuancé et factuel.`;
    }

    return `\nADVANCED AGENT & CHANNEL INTELLIGENCE CAPABILITIES:\n` +
      `- If an official channel dossier is provided, leverage it thoroughly and factually to answer questions about the creator, editorial direction, sponsors, and background.\n` +
      `- If community comments are provided, analyze them to accurately reflect viewer sentiment, debates, and public reception.\n` +
      `- Remain objective, balanced, and factual.`;
  }
}

export default AgentToolRegistry;
