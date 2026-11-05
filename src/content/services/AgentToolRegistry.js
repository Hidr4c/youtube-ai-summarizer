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
      }
    ];
  }

  /**
   * System directive teaching the LLM how to utilize channel dossiers
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static getAgentSystemDirective(lang = 'fr') {
    if (lang === 'fr') {
      return `\nCAPACITÉS D'ANALYSE AVANCÉES & DOSSIERS DE CHAÎNE :\n` +
        `- Si un dossier de chaîne officielle est fourni dans le contexte, utilise-le de manière approfondie et factuelle pour répondre aux questions sur le créateur, sa ligne éditoriale, son indépendance, ses sponsors et la fréquence de ses publications.\n` +
        `- Base toujours tes conclusions sur des preuves concrètes : titres récents, volume d'abonnés, diversité des sujets abordés.\n` +
        `- Reste objectif, nuancé et factuel.`;
    }

    return `\nADVANCED CHANNEL INTELLIGENCE CAPABILITIES:\n` +
      `- If an official channel dossier is provided in the context, leverage it thoroughly and factually to answer questions about the creator, editorial direction, independence, sponsors, and upload frequency.\n` +
      `- Always ground your conclusions in concrete evidence from recent video titles, audience metrics, and covered topics.\n` +
      `- Remain objective, balanced, and factual.`;
  }
}

export default AgentToolRegistry;
