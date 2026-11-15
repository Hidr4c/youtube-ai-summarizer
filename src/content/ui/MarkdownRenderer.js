/**
 * Markdown & HTML Sanitizing / Rendering Engine
 * Formats headings, structured bullet lists, bold text, code blocks, and clickable timestamps.
 */
export class MarkdownRenderer {
  /**
   * Safe HTML injection with Trusted Types fallback
   * @param {HTMLElement} element
   * @param {string} html
   */
  static safeSetInnerHTML(element, html) {
    if (!element) return;
    try {
      if (window.trustedTypes && window.trustedTypes.defaultPolicy) {
        element.innerHTML = window.trustedTypes.defaultPolicy.createHTML(html);
        return;
      }
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        if (!window.__ytAiPolicy) {
          try {
            window.__ytAiPolicy = window.trustedTypes.createPolicy('yt-ai-policy', {
              createHTML: s => s
            });
          } catch (e) {}
        }
        if (window.__ytAiPolicy) {
          element.innerHTML = window.__ytAiPolicy.createHTML(html);
          return;
        }
      }
      element.innerHTML = html;
    } catch (e) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        element.replaceChildren(...doc.body.childNodes);
      } catch (err) {
        try {
          const range = document.createRange();
          const frag = range.createContextualFragment(html);
          element.replaceChildren(frag);
        } catch (err2) {
          element.innerHTML = html;
        }
      }
    }
  }

  /**
   * HTML entity escaping
   * @param {string} str
   * @returns {string}
   */
  static escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Splits text into natural sentences
   * @param {string} text
   * @returns {Array<string>}
   */
  static splitSentences(text) {
    if (!text) return [];
    const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ß«"'])/u);
    return parts.map(s => s.trim()).filter(Boolean);
  }

  /**
   * Parses bullet point text into title and body
   * @param {string} rawText
   * @returns {{ hasTitle: boolean, title: string, sentences: Array<string> }}
   */
  static parsePoint(rawText) {
    const colonMatch = rawText.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\s'\-_–—]{2,60})\s*:\s*(.*)$/);
    if (colonMatch) {
      const rawTitle = colonMatch[1].trim();
      const cleanTitle = rawTitle.replace(/^\*\*|\*\*$/g, '').trim();
      const body = colonMatch[2].trim();
      return {
        hasTitle: true,
        title: cleanTitle + ' :',
        sentences: [body]
      };
    }
    return {
      hasTitle: false,
      title: '',
      sentences: [rawText]
    };
  }

  /**
   * Formats inline Markdown (bold, italic, code, clickable timestamps)
   * @param {string} text
   * @returns {string}
   */
  static formatInline(text) {
    let escaped = MarkdownRenderer.escapeHtml(text);
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Clickable timestamps: [1:23], [12:45], [1:05:30]
    escaped = escaped.replace(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g, (match, h, m, s) => {
      const hours = h ? parseInt(h, 10) : 0;
      const minutes = parseInt(m, 10);
      const seconds = parseInt(s, 10);
      const totalSec = hours * 3600 + minutes * 60 + seconds;
      return `<a href="javascript:void(0)" class="yt-ai-timestamp-link" data-time="${totalSec}" title="Go to ${match}">⏱️ ${match}</a>`;
    });
    return escaped;
  }

  /**
   * Renders structured list item ensuring bold keyword and explanation stay fluid on the same line
   * @param {string} rawText
   * @returns {string}
   */
  static renderListItem(rawText) {
    return `<li class="yt-ai-point-item">${MarkdownRenderer.formatInline(rawText)}</li>`;
  }

  /**
   * Renders a Markdown pipe-delimited table starting at startIdx.
   * @returns {{ html: string, nextIndex: number }|null}
   */
  static _parseTableBlock(lines, startIdx) {
    if (startIdx + 1 >= lines.length) return null;
    const headLine = lines[startIdx].trim();
    const sepLine = lines[startIdx + 1].trim();
    if (!headLine.includes('|') || !/^\|?[\s:-]+\|[\s|:-]*$/.test(sepLine)) return null;
    const splitRow = (row) => row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headers = splitRow(headLine);
    let html = `<div class="yt-ai-table-wrap"><table class="yt-ai-md-table"><thead><tr>${headers.map(h => `<th>${MarkdownRenderer.formatInline(h)}</th>`).join('')}</tr></thead><tbody>`;
    let idx = startIdx + 2;
    while (idx < lines.length && lines[idx].trim().includes('|')) {
      const cells = splitRow(lines[idx].trim());
      html += `<tr>${cells.map(c => `<td>${MarkdownRenderer.formatInline(c)}</td>`).join('')}</tr>`;
      idx++;
    }
    html += '</tbody></table></div>';
    return { html, nextIndex: idx - 1 };
  }

  /**
   * Renders complete Markdown document into target DOM container
   * @param {string} mdText
   * @param {HTMLElement} container
   */
  static renderMarkdown(mdText, container) {
    if (!mdText) {
      if (container) container.innerHTML = '';
      return '';
    }

    const lines = String(mdText).split('\n');
    let html = '';
    let listTag = null;
    let inQuote = false;
    let inCode = false;
    let codeLines = [];

    const closeOpenBlocks = () => {
      if (listTag) { html += `</${listTag}>`; listTag = null; }
      if (inQuote) { html += '</blockquote>'; inQuote = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (trimmed.startsWith('```')) {
        closeOpenBlocks();
        if (!inCode) {
          inCode = true;
          codeLines = [];
        } else {
          html += `<pre class="yt-ai-code-block"><code>${MarkdownRenderer.escapeHtml(codeLines.join('\n'))}</code></pre>`;
          inCode = false;
        }
        continue;
      }
      if (inCode) { codeLines.push(rawLine); continue; }

      if (/^(?:---+|\*\*\*+)$/.test(trimmed)) {
        closeOpenBlocks();
        html += '<hr class="yt-ai-md-hr">';
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        closeOpenBlocks();
        const lvl = headingMatch[1].length;
        const tag = lvl <= 2 ? 'h2' : lvl === 3 ? 'h3' : 'h4';
        html += `<${tag}>${MarkdownRenderer.formatInline(headingMatch[2])}</${tag}>`;
        continue;
      }

      const tableRes = MarkdownRenderer._parseTableBlock(lines, i);
      if (tableRes) {
        closeOpenBlocks();
        html += tableRes.html;
        i = tableRes.nextIndex;
        continue;
      }

      const quoteMatch = trimmed.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        if (listTag) { html += `</${listTag}>`; listTag = null; }
        if (!inQuote) { html += '<blockquote class="yt-ai-blockquote">'; inQuote = true; }
        if (quoteMatch[1]) html += `<p>${MarkdownRenderer.formatInline(quoteMatch[1])}</p>`;
        continue;
      }
      if (inQuote) { html += '</blockquote>'; inQuote = false; }

      const ulMatch = rawLine.match(/^\s*[-*•]\s+(.*)$/);
      if (ulMatch) {
        if (listTag === 'ol') { html += '</ol>'; listTag = null; }
        if (!listTag) { html += '<ul class="yt-ai-points-list">'; listTag = 'ul'; }
        html += MarkdownRenderer.renderListItem(ulMatch[1]);
        continue;
      }

      const olMatch = rawLine.match(/^\s*\d+[.)]\s+(.*)$/);
      if (olMatch) {
        if (listTag === 'ul') { html += '</ul>'; listTag = null; }
        if (!listTag) { html += '<ol class="yt-ai-ordered-list">'; listTag = 'ol'; }
        html += MarkdownRenderer.renderListItem(olMatch[1]);
        continue;
      }

      if (listTag) { html += `</${listTag}>`; listTag = null; }

      if (trimmed.length > 0) {
        const pointMatch = trimmed.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\s'\-_–—]{2,60})\s*:\s+(.*[.!?].*)$/);
        if (pointMatch) {
          html += `<ul class="yt-ai-points-list">${MarkdownRenderer.renderListItem(trimmed)}</ul>`;
        } else {
          html += `<p>${MarkdownRenderer.formatInline(trimmed)}</p>`;
        }
      }
    }

    if (inCode) html += `<pre class="yt-ai-code-block"><code>${MarkdownRenderer.escapeHtml(codeLines.join('\n'))}</code></pre>`;
    closeOpenBlocks();
    if (container) { MarkdownRenderer.safeSetInnerHTML(container, html); }
    return html;
  }
}

export const safeSetInnerHTML = MarkdownRenderer.safeSetInnerHTML;
export const escapeHtml = MarkdownRenderer.escapeHtml;
export const formatInline = MarkdownRenderer.formatInline;
export const renderMarkdown = MarkdownRenderer.renderMarkdown;
export const renderListItem = MarkdownRenderer.renderListItem;
export const splitSentences = MarkdownRenderer.splitSentences;
export const parsePoint = MarkdownRenderer.parsePoint;
export default MarkdownRenderer;
