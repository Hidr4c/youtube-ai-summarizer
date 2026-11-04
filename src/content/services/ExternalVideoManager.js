/**
 * External Video Manager
 * Detects YouTube links in chat prompts, transparently fetches their transcripts
 * in the background, and injects their context into conversational AI prompts.
 */
export class ExternalVideoManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Extracts unique external YouTube video IDs from prompt text, ignoring the current active video
   * @param {string} text
   * @param {string} currentVideoId
   * @returns {string[]}
   */
  extractYouTubeVideoIds(text, currentVideoId = '') {
    if (!text || typeof text !== 'string') return [];
    const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
    const matches = new Set();
    let m;
    while ((m = ytRegex.exec(text)) !== null) {
      const id = m[1];
      if (id && id !== currentVideoId) {
        matches.add(id);
      }
    }
    return Array.from(matches);
  }

  /**
   * Fetches an external video's transcript and metadata via background service worker
   * @param {string} videoId
   * @param {string} lang
   * @returns {Promise<Object|null>}
   */
  async fetchExternalVideo(videoId, lang = 'fr') {
    if (!videoId) return null;
    if (this.cache.has(videoId)) {
      return this.cache.get(videoId);
    }

    if (!chrome?.runtime?.sendMessage) return null;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'FETCH_WATCH_PAGE_TRANSCRIPT', videoId, lang },
        (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            resolve(null);
          } else {
            const data = {
              videoId,
              title: res.title || `Video ${videoId}`,
              author: res.author || 'YouTube Creator',
              segments: res.segments || [],
              fullText: res.fullText || (res.segments ? res.segments.map(s => s.text).join(' ') : '')
            };
            this.cache.set(videoId, data);
            resolve(data);
          }
        }
      );
    });
  }

  /**
   * Formats external video transcripts into a structured prompt context block
   * @param {Array<Object>} externalVideos
   * @param {number} maxCharsPerVideo
   * @returns {string}
   */
  formatExternalContextBlock(externalVideos, maxCharsPerVideo = 5000) {
    if (!Array.isArray(externalVideos) || externalVideos.length === 0) return '';

    const blocks = externalVideos.map((vid) => {
      let text = (vid.fullText || '').trim();
      if (text.length > maxCharsPerVideo) {
        const half = Math.floor(maxCharsPerVideo / 2);
        text = `${text.slice(0, half)}\n\n[... transcription condensée ...]\n\n${text.slice(-half)}`;
      }
      return `---
[VIDÉO EXTERNE FOURNIE PAR L'UTILISATEUR]
Titre : "${vid.title}"
Auteur / Chaîne : "${vid.author}"
ID Vidéo : ${vid.videoId}
Transcription :
"""
${text}
"""`;
    });

    return `\n### INFORMATIONS & TRANSCRIPTIONS DES VIDÉOS EXTERNES MENTIONNÉES :\n${blocks.join('\n\n')}\n`;
  }
}

export default ExternalVideoManager;
