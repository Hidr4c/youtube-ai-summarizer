/**
 * Parser utility for cleaning subtitle and HTML text
 */
export class TextCleaner {
  /**
   * Cleans HTML entities and excessive whitespace from subtitle text
   * @param {string} text
   * @returns {string}
   */
  static cleanTranscriptText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default TextCleaner;
