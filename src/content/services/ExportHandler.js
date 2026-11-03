/**
 * Export & Clipboard Utility Service
 * Generates and downloads .md, .txt, .json files and manages clipboard operations.
 */
export class ExportHandler {
  /**
   * Copies text to clipboard with button feedback
   * @param {string} text
   * @param {HTMLElement} btn
   * @param {string} [copiedText]
   */
  static copyToClipboard(text, btn, copiedText = '✅ Copied!') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = copiedText;
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  }

  /**
   * Sanitizes video title for clean filesystem file naming
   * @param {string} title
   * @returns {string}
   */
  static sanitizeFilename(title) {
    return (title || 'resume_youtube')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);
  }

  /**
   * Triggers download of a Blob file
   * @param {Blob} blob
   * @param {string} filename
   */
  static triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports summary as Markdown (.md)
   * @param {string} markdown
   * @param {string} title
   */
  static downloadMarkdown(markdown, title) {
    if (!markdown) return;
    const cleanTitle = ExportHandler.sanitizeFilename(title);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    ExportHandler.triggerBlobDownload(blob, `${cleanTitle}_summary.md`);
  }

  /**
   * Exports summary as Plain Text (.txt)
   * @param {string} markdown
   * @param {string} title
   */
  static downloadText(markdown, title) {
    if (!markdown) return;
    const cleanTitle = ExportHandler.sanitizeFilename(title);
    const plainText = markdown.replace(/[#*`_~]/g, '');
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    ExportHandler.triggerBlobDownload(blob, `${cleanTitle}_summary.txt`);
  }

  /**
   * Exports complete session as JSON (.json)
   * @param {Object} data
   * @param {string} title
   */
  static downloadJson(data, title) {
    if (!data) return;
    const cleanTitle = ExportHandler.sanitizeFilename(title);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    ExportHandler.triggerBlobDownload(blob, `${cleanTitle}_data.json`);
  }
}

export const copyToClipboard = ExportHandler.copyToClipboard;
export const handleDownload = (md, title) => ExportHandler.downloadMarkdown(md, title);
export const handleDownloadTxt = (md, title) => ExportHandler.downloadText(md, title);
export const handleDownloadJson = (data, title) => ExportHandler.downloadJson(data, title);
export default ExportHandler;
