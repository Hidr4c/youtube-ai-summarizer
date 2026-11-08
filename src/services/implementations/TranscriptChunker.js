/**
 * Intelligent Transcript Chunker for Long Video Processing (Zero Information Loss)
 */
export class TranscriptChunker {
  /**
   * Splits a long transcript into coherent, timestamp-aware chunks
   * @param {Object} options
   * @param {string} options.fullText - Full text with [MM:SS] timestamps
   * @param {Array} [options.chapters] - Optional YouTube chapters structure
   * @param {number} [options.maxChars=16000] - Safe character boundary per chunk
   * @returns {Array<{index: number, total: number, text: string, startTimestamp: string, endTimestamp: string}>}
   */
  static splitIntoChunks({ fullText, chapters = [], maxChars = 16000 }) {
    if (!fullText || typeof fullText !== 'string') return [];
    const trimmed = fullText.trim();
    if (trimmed.length <= maxChars) {
      const matchStart = trimmed.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
      const matchEnd = [...trimmed.matchAll(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g)].pop();
      return [{
        index: 1,
        total: 1,
        text: trimmed,
        startTimestamp: matchStart ? matchStart[1] : '00:00',
        endTimestamp: matchEnd ? matchEnd[1] : 'FIN'
      }];
    }

    const rawChunks = [];
    const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;

    // Split along timestamp boundaries or natural sentence terminators
    let currentChunk = '';
    const parts = trimmed.split(/(?=\[\d{1,2}:\d{2}(?::\d{2})?\])/g);

    for (const part of parts) {
      if ((currentChunk.length + part.length > maxChars) && currentChunk.length > 0) {
        rawChunks.push(currentChunk.trim());
        currentChunk = part;
      } else {
        currentChunk += part;
      }
    }
    if (currentChunk.trim()) {
      rawChunks.push(currentChunk.trim());
    }

    const total = rawChunks.length;
    return rawChunks.map((text, idx) => {
      const startMatch = text.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
      const endMatches = [...text.matchAll(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g)];
      const endMatch = endMatches.length > 0 ? endMatches[endMatches.length - 1] : null;

      return {
        index: idx + 1,
        total,
        text,
        startTimestamp: startMatch ? startMatch[1] : `Segment ${idx + 1}`,
        endTimestamp: endMatch ? endMatch[1] : '...'
      };
    });
  }
}

export default TranscriptChunker;
