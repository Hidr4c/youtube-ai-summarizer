import { MarkdownBlockHelper } from './MarkdownBlockHelper.js';

/**
 * Markdown & HTML Sanitizing / Rendering Engine
 * Formats headings, structured nested lists, blockquotes, tables, code blocks, and clickable timestamps.
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
    const colonMatch = rawText.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\s'\-_–—]{2,60})\s*[:：]\s*(.*)$/);
    if (colonMatch) {
      const rawTitle = colonMatch[1].trim();
      const cleanTitle = rawTitle.replace(/^\*\*|\*\*$/g, '').trim();
      const body = colonMatch[2].trim();
      return { hasTitle: true, title: cleanTitle + ' :', sentences: [body] };
    }
    return { hasTitle: false, title: '', sentences: [rawText] };
  }

  /**
   * Strips raw audit metadata control tags ([SCORE: XX/100]) for clean UI rendering
   * @param {string} mdText
   * @returns {string}
   */
  static stripScoreTags(mdText) {
    return MarkdownBlockHelper.stripScoreTags(mdText);
  }

  /**
   * Formats inline Markdown (bold, italic, code, links, clickable timestamps)
   * @param {string} text
   * @returns {string}
   */
  static formatInline(text) {
    return MarkdownBlockHelper.formatInline(text, MarkdownRenderer.escapeHtml);
  }

  /**
   * Renders a single list item node
   * @param {string} rawText
   * @returns {string}
   */
  static renderListItem(rawText) {
    return `<li class="yt-ai-point-item">${MarkdownRenderer.formatInline(rawText)}</li>`;
  }

  /**
   * Renders complete Markdown document into target DOM container
   * @param {string} mdText
   * @param {HTMLElement|null} container
   * @param {Object} [options={}]
   * @param {boolean} [options.sectionCards=false] - Wraps h2/h3 sections into visual cards
   * @returns {string} Rendered HTML string
   */
  static renderMarkdown(mdText, container, options = {}) {
    if (!mdText) {
      if (container) container.innerHTML = '';
      return '';
    }

    const lines = String(mdText).split('\n');
    let html = '';
    let listTag = null;
    let openLi = false;
    let inSublist = false;
    let inQuote = false;
    let inCode = false;
    let codeLines = [];

    const closeOpenLi = () => {
      if (inSublist) { html += '</ul>'; inSublist = false; }
      if (openLi) { html += '</li>'; openLi = false; }
    };
    const closeList = () => {
      closeOpenLi();
      if (listTag) { html += `</${listTag}>`; listTag = null; }
    };
    const closeOpenBlocks = () => {
      closeList();
      if (inQuote) { html += '</blockquote>'; inQuote = false; }
    };
    const appendTopListItem = (tag, content) => {
      if (listTag && listTag !== tag) closeList();
      if (!listTag) {
        const cls = tag === 'ol' ? 'yt-ai-ordered-list' : 'yt-ai-points-list';
        html += `<${tag} class="${cls}">`;
        listTag = tag;
      }
      closeOpenLi();
      html += `<li class="yt-ai-point-item">${MarkdownRenderer.formatInline(content)}`;
      openLi = true;
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

      if (!trimmed) {
        if (inQuote) { html += '</blockquote>'; inQuote = false; }
        if (listTag && !MarkdownBlockHelper.canContinueListOnBlankLine(lines, i, listTag)) {
          closeList();
        }
        continue;
      }

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

      const tableRes = MarkdownBlockHelper.parseTableBlock(lines, i, MarkdownRenderer.formatInline);
      if (tableRes) {
        closeOpenBlocks();
        html += tableRes.html;
        i = tableRes.nextIndex;
        continue;
      }

      const quoteMatch = trimmed.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        closeList();
        if (!inQuote) { html += '<blockquote class="yt-ai-blockquote">'; inQuote = true; }
        if (quoteMatch[1]) html += `<p>${MarkdownRenderer.formatInline(quoteMatch[1])}</p>`;
        continue;
      }
      if (inQuote) { html += '</blockquote>'; inQuote = false; }

      const ulMatch = rawLine.match(/^(\s*)[-*•]\s+(.*)$/);
      if (ulMatch) {
        const indent = ulMatch[1].length;
        if (indent >= 2 && listTag && openLi) {
          if (!inSublist) { html += '<ul class="yt-ai-sublist">'; inSublist = true; }
          html += `<li class="yt-ai-subitem">${MarkdownRenderer.formatInline(ulMatch[2])}</li>`;
        } else {
          appendTopListItem('ul', ulMatch[2]);
        }
        continue;
      }

      const olMatch = rawLine.match(/^\s*\d+[.)]\s+(.*)$/);
      if (olMatch) {
        appendTopListItem('ol', olMatch[1]);
        continue;
      }

      const pointMatch = trimmed.match(/^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\s'\-_–—]{2,60})\s*[:：]\s+(.*[.!?。！？].*)$/);
      if (pointMatch) {
        appendTopListItem('ul', trimmed);
        continue;
      }

      if (MarkdownBlockHelper.isSemicolonListLine(lines, i) ||
          (listTag === 'ul' && MarkdownBlockHelper.isSemicolonListClosingLine(lines, i))) {
        appendTopListItem('ul', trimmed);
        continue;
      }

      closeList();
      html += `<p>${MarkdownRenderer.formatInline(trimmed)}</p>`;
    }

    if (inCode) html += `<pre class="yt-ai-code-block"><code>${MarkdownRenderer.escapeHtml(codeLines.join('\n'))}</code></pre>`;
    closeOpenBlocks();

    if (options && options.sectionCards) {
      html = MarkdownBlockHelper.wrapSectionCards(html);
    }

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
export const stripScoreTags = MarkdownRenderer.stripScoreTags;
export const wrapSectionCards = MarkdownBlockHelper.wrapSectionCards;
export default MarkdownRenderer;
