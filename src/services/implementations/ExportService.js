import { IExportService } from '../interfaces/IExportService.js';

/**
 * Service for multi-format export (Markdown, Plain Text, JSON) and file download
 */
export class ExportService extends IExportService {
  /**
   * Generates formatted Markdown document
   * @param {Object} data
   * @returns {string}
   */
  exportMarkdown({ title = '', author = '', url = '', model = '', summary = '', segments = [] } = {}) {
    let md = `# ${title || 'YouTube Summary'}\n\n`;
    if (author) md += `**Author / Channel:** ${author}\n`;
    if (url) md += `**Video URL:** ${url}\n`;
    if (model) md += `**AI Model:** ${model}\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

    md += `## 📝 AI Summary\n\n${summary || 'No summary generated.'}\n\n`;

    if (Array.isArray(segments) && segments.length > 0) {
      md += `## 📜 Full Transcript\n\n`;
      for (const seg of segments) {
        const time = seg.timestamp || (seg.formatTime ? seg.formatTime() : '');
        const text = seg.text || '';
        md += `- **[${time}]** ${text}\n`;
      }
    }

    return md;
  }

  /**
   * Generates clean plain text file
   * @param {Object} data
   * @returns {string}
   */
  exportPlainText({ title = '', author = '', url = '', summary = '', segments = [] } = {}) {
    let txt = `YOUTUBE AI SUMMARY\n`;
    txt += `Title: ${title}\n`;
    txt += `Author: ${author}\n`;
    txt += `URL: ${url}\n`;
    txt += `Generated: ${new Date().toLocaleString()}\n`;
    txt += `------------------------------------------------------------\n\n`;

    txt += `SUMMARY:\n${summary}\n\n`;

    if (Array.isArray(segments) && segments.length > 0) {
      txt += `------------------------------------------------------------\n`;
      txt += `TRANSCRIPT:\n`;
      for (const seg of segments) {
        const time = seg.timestamp || (seg.formatTime ? seg.formatTime() : '');
        txt += `[${time}] ${seg.text || ''}\n`;
      }
    }

    return txt;
  }

  /**
   * Generates structured JSON representation
   * @param {Object} data
   * @returns {string}
   */
  exportJSON({ title = '', author = '', url = '', model = '', summary = '', segments = [] } = {}) {
    const payload = {
      title,
      author,
      url,
      model,
      exportedAt: new Date().toISOString(),
      summary,
      transcript: (segments || []).map(s => ({
        timestamp: s.timestamp || (s.formatTime ? s.formatTime() : ''),
        text: s.text || ''
      }))
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Triggers download of a file via Blob and HTML5 anchor element
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    if (typeof window === 'undefined' || !window.document) return;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

export default ExportService;
