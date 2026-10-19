/**
 * Interface for Summary & Transcript Multi-Format Export
 */
export class IExportService {
  /**
   * Generates formatted Markdown string
   * @param {Object} data - Video metadata and summary content
   * @returns {string}
   */
  exportMarkdown(data) {
    throw new Error('Not implemented');
  }

  /**
   * Generates clean plain text string
   * @param {Object} data
   * @returns {string}
   */
  exportPlainText(data) {
    throw new Error('Not implemented');
  }

  /**
   * Generates structured JSON string
   * @param {Object} data
   * @returns {string}
   */
  exportJSON(data) {
    throw new Error('Not implemented');
  }

  /**
   * Triggers browser download of file
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  downloadFile(filename, content, mimeType) {
    throw new Error('Not implemented');
  }
}

export default IExportService;
