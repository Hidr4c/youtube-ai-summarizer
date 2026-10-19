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
        element.textContent = (html || '').replace(/<[^>]*>/g, '');
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
   * Parses bullet point text into title and body sentences
   * @param {string} rawText
   * @returns {{ hasTitle: boolean, title: string, sentences: Array<string> }}
   */
  static parsePoint(rawText) {
    const colonMatch = rawText.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\s'\-_–—]{2,60})\s*:\s*(.*)$/);
    if (colonMatch) {
      const rawTitle = colonMatch[1].trim();
      const cleanTitle = rawTitle.replace(/^\*\*|\*\*$/g, '').trim();
      const body = colonMatch[2].trim();
      const sentences = MarkdownRenderer.splitSentences(body);
      return {
        hasTitle: true,
        title: cleanTitle + ' :',
        sentences: sentences.length > 0 ? sentences : [body]
      };
    }
    return {
      hasTitle: false,
      title: '',
      sentences: MarkdownRenderer.splitSentences(rawText)
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
   * Renders structured list item
   * @param {string} rawText
   * @returns {string}
   */
  static renderListItem(rawText) {
    const parsed = MarkdownRenderer.parsePoint(rawText);
    const sentenceDivs = parsed.sentences
      .map(s => `<div class="yt-ai-point-sentence">${MarkdownRenderer.formatInline(s)}</div>`)
      .join('');

    if (parsed.hasTitle) {
      return `
        <li class="yt-ai-point-item">
          <div class="yt-ai-point-title"><strong>${MarkdownRenderer.formatInline(parsed.title)}</strong></div>
          <div class="yt-ai-point-body">${sentenceDivs}</div>
        </li>
      `;
    }
    return `
      <li class="yt-ai-point-item">
        <div class="yt-ai-point-body" style="padding-left: 14px;">${sentenceDivs}</div>
      </li>
    `;
  }

  /**
   * Renders complete Markdown document into target DOM container
   * @param {string} mdText
   * @param {HTMLElement} container
   */
  static renderMarkdown(mdText, container) {
    if (!mdText) {
      container.innerHTML = '';
      return;
    }

    const lines = mdText.split('\n');
    let html = '';
    let inUl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('### ')) {
        if (inUl) { html += '</ul>'; inUl = false; }
        html += `<h3>${MarkdownRenderer.formatInline(line.slice(4))}</h3>`;
        continue;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        if (inUl) { html += '</ul>'; inUl = false; }
        html += `<h2>${MarkdownRenderer.formatInline(line.replace(/^#+\s*/, ''))}</h2>`;
        continue;
      }

      const ulMatch = line.match(/^[-*•]\s+(.*)$/);
      if (ulMatch) {
        if (!inUl) { html += '<ul class="yt-ai-points-list">'; inUl = true; }
        html += MarkdownRenderer.renderListItem(ulMatch[1]);
        continue;
      }

      if (inUl) { html += '</ul>'; inUl = false; }

      const trimmed = line.trim();
      if (trimmed.length > 0) {
        const pointMatch = trimmed.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\s'\-_–—]{2,60})\s*:\s+(.*[.!?].*)$/);
        if (pointMatch) {
          html += `<ul class="yt-ai-points-list">${MarkdownRenderer.renderListItem(trimmed)}</ul>`;
        } else {
          html += `<p>${MarkdownRenderer.formatInline(trimmed)}</p>`;
        }
      }
    }

    if (inUl) html += '</ul>';
    MarkdownRenderer.safeSetInnerHTML(container, html);
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
