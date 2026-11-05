/**
 * ChatTranscriptManager
 * Manages multi-video transcripts, context window allocation, and session continuity
 * for the interactive Q&A chat tab.
 */
export class ChatTranscriptManager {
  constructor() {
    this.cachedExternalTranscripts = new Map();
    this.activeExternalVideoIds = new Set();
  }

  /**
   * Resets active external video session
   */
  reset() {
    this.activeExternalVideoIds.clear();
  }

  /**
   * Gets list of active external video IDs in this chat session
   * @returns {string[]}
   */
  getActiveExternalIds() {
    return Array.from(this.activeExternalVideoIds);
  }

  /**
   * Registers newly detected external video IDs into the active chat session
   * @param {string[]} ids
   */
  registerExternalIds(ids = []) {
    for (const id of ids) {
      if (id && typeof id === 'string') {
        this.activeExternalVideoIds.add(id);
      }
    }
  }

  /**
   * Fetches transcripts for any active external videos not yet cached
   * @param {string[]} externalIds
   * @param {Object} transcriptController
   * @param {string} lang
   * @param {Function} [onStatusNotice]
   * @returns {Promise<{loaded: string[], failed: string[]}>}
   */
  async ensureTranscriptsLoaded(externalIds, transcriptController, lang = 'fr', onStatusNotice = null) {
    const loaded = [];
    const failed = [];

    for (const videoId of externalIds) {
      if (this.cachedExternalTranscripts.has(videoId)) {
        loaded.push(videoId);
        continue;
      }

      if (typeof onStatusNotice === 'function') {
        onStatusNotice(videoId, true);
      }

      const res = await transcriptController?.fetchTranscriptFromBackground(videoId, lang);

      if (typeof onStatusNotice === 'function') {
        onStatusNotice(videoId, false);
      }

      if (res && res.segments && res.segments.length > 0) {
        this.cachedExternalTranscripts.set(videoId, res);
        loaded.push(videoId);
      } else {
        failed.push(videoId);
      }
    }

    return { loaded, failed };
  }

  /**
   * Builds combined multi-video transcript text and composite metadata
   * @param {string} currentVideoId
   * @param {Object} currentMeta
   * @param {string} currentFullText
   * @param {number} maxChars
   * @param {Function} condenseFn
   * @returns {{safeTranscript: string, meta: Object, isMultiVideo: boolean}}
   */
  buildMultiVideoContext(currentVideoId, currentMeta, currentFullText, maxChars, condenseFn) {
    const activeIds = this.getActiveExternalIds();
    const availableExternal = activeIds
      .map(id => ({ id, data: this.cachedExternalTranscripts.get(id) }))
      .filter(item => item.data && Array.isArray(item.data.segments) && item.data.segments.length > 0);

    // Single video mode (only the current watch page)
    if (availableExternal.length === 0) {
      return {
        safeTranscript: condenseFn(currentFullText || '', maxChars),
        meta: currentMeta,
        isMultiVideo: false
      };
    }

    // Multi-video mode: allocate character budget across all participating videos
    const totalCount = 1 + availableExternal.length;
    const currentWeight = 1 / (totalCount + 0.5);
    const currentBudget = Math.max(1200, Math.floor(maxChars * currentWeight));
    const externalBudget = Math.max(1200, Math.floor((maxChars - currentBudget) / availableExternal.length));

    const parts = [];
    const currentTitle = currentMeta?.title || 'Vidéo actuelle';
    if (currentFullText && currentFullText.length > 30) {
      parts.push(`[VIDÉO ACTUELLE : "${currentTitle}" (https://www.youtube.com/watch?v=${currentVideoId})]\n${condenseFn(currentFullText, currentBudget)}`);
    }

    for (let i = 0; i < availableExternal.length; i++) {
      const { id, data } = availableExternal[i];
      const title = data.title || `Vidéo externe (${id})`;
      const text = data.segments.map(s => s.text).join(' ');
      parts.push(`[VIDÉO EXTERNE RÉFÉRENCÉE ${i + 1} : "${title}" (https://www.youtube.com/watch?v=${id})]\n${condenseFn(text, externalBudget)}`);
    }

    const titlesSummary = availableExternal.map(e => e.data?.title || e.id).join(' | ');
    const compositeMeta = {
      videoId: currentVideoId,
      title: `${currentTitle} [vs: ${titlesSummary}]`,
      author: currentMeta?.author || '',
      description: `Discussion comparative multi-vidéos (${totalCount} vidéos).`
    };

    return {
      safeTranscript: parts.join('\n\n'),
      meta: compositeMeta,
      isMultiVideo: true
    };
  }
}

export default ChatTranscriptManager;
