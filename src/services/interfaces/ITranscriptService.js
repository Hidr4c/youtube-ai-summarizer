/**
 * Interface for Video Transcript Retrieval
 */
export class ITranscriptService {
  /**
   * Fetches and normalizes transcript for a YouTube video
   * @param {string} videoId
   * @param {string} [preferredLang]
   * @returns {Promise<{ segments: Array<Object>, fullText: string }>}
   */
  async getTranscript(videoId, preferredLang = 'en') {
    throw new Error('Not implemented');
  }
}

export default ITranscriptService;
