/**
 * Pure block & inline formatting helpers for MarkdownRenderer.
 * Handles audit metadata tag stripping, tokenized inline formatting,
 * pipe-delimited Markdown tables, semicolon runs, and card sectioning.
 */
export class MarkdownBlockHelper {
  /**
   * Strips raw audit control tags (e.g. [SCORE: 92/100]) from visual output
   * without altering the underlying stored Markdown report.
   * @param {string} mdText
   * @returns {string}
   */
  static stripScoreTags(mdText) {
    if (!mdText) return '';
    return String(mdText)
      .replace(/^\s*(?:[-*•]\s*)?(?:\*\*)?\[(?:SCORE|AXES|GENRE):[^\]]+\](?:\*\*)?\s*$/gim, '')
      .replace(/\s*\[(?:SCORE|AXES|GENRE):[^\]]+\]\s*/gi, ' ')
      .replace(/^\s*\n+/, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();
  }

  /**
   * Formats inline Markdown safely using placeholder tokens so code spans and URLs
   * are protected from emphasis and timestamp substitutions.
   * @param {string} text
   * @param {Function} escapeHtmlFn
   * @returns {string}
   */
  static formatInline(text, escapeHtmlFn) {
    if (!text) return '';
    let escaped = escapeHtmlFn(text);
    const tokens = [];
    const stash = (renderedHtml) => {
      const idx = tokens.length;
      tokens.push(renderedHtml);
      return `\u0000YTMD${idx}\u0000`;
    };

    escaped = escaped.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${code}</code>`));

    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      const styledLabel = label
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return stash(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="yt-ai-md-link">${styledLabel}</a>`);
    });

    escaped = escaped.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    const tsRegex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]|\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g;
    escaped = escaped.replace(tsRegex, (match, bH, bM, bS, pH, pM, pS) => {
      const h = bH ?? pH;
      const m = bM ?? pM;
      const s = bS ?? pS;
      const hours = h ? parseInt(h, 10) : 0;
      const minutes = parseInt(m, 10);
      const seconds = parseInt(s, 10);
      if (seconds >= 60 || (h && minutes >= 60)) return match;
      const totalSec = hours * 3600 + minutes * 60 + seconds;
      const displayTime = h ? `${h}:${m}:${s}` : `${m}:${s}`;
      return `<a href="javascript:void(0)" class="yt-ai-timestamp-link" data-time="${totalSec}" title="Go to ${displayTime}">⏱️ ${displayTime}</a>`;
    });

    return escaped.replace(/\u0000YTMD(\d+)\u0000/g, (_, idx) => tokens[Number(idx)] ?? '');
  }

  /**
   * Parses a pipe-delimited Markdown table block starting at startIdx.
   * @param {Array<string>} lines
   * @param {number} startIdx
   * @param {Function} formatInlineFn
   * @returns {{ html: string, nextIndex: number }|null}
   */
  static parseTableBlock(lines, startIdx, formatInlineFn) {
    if (startIdx + 1 >= lines.length) return null;
    const headLine = lines[startIdx].trim();
    const sepLine = lines[startIdx + 1].trim();
    if (!headLine.includes('|') || !/^\|?[\s:-]+\|[\s|:-]*$/.test(sepLine)) return null;

    const splitRow = (row) => row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headers = splitRow(headLine);
    let html = `<div class="yt-ai-table-wrap"><table class="yt-ai-md-table"><thead><tr>${headers.map(h => `<th>${formatInlineFn(h)}</th>`).join('')}</tr></thead><tbody>`;
    let idx = startIdx + 2;
    while (idx < lines.length && lines[idx].trim().includes('|')) {
      const cells = splitRow(lines[idx].trim());
      html += `<tr>${cells.map(c => `<td>${formatInlineFn(c)}</td>`).join('')}</tr>`;
      idx++;
    }
    html += '</tbody></table></div>';
    return { html, nextIndex: idx - 1 };
  }

  /**
   * Checks whether lines[idx] begins a short semicolon-delimited prose list
   * (e.g. isolated phrases ending with ';' separated by blank lines).
   * @param {Array<string>} lines
   * @param {number} idx
   * @returns {boolean}
   */
  static isSemicolonListLine(lines, idx) {
    const line = lines[idx]?.trim() || '';
    if (!line || line.length > 95 || !/;\s*$/.test(line)) return false;
    if (/^(?:#|>|\||[-*•]\s|\d+[.)]\s|```)/.test(line)) return false;
    for (let j = idx - 1; j >= 0; j--) {
      const prev = lines[j].trim();
      if (!prev) continue;
      if (/;\s*$/.test(prev) && prev.length <= 95 && !/^(?:#|>|\||```)/.test(prev)) return true;
      break;
    }
    for (let j = idx + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (/;\s*$/.test(next) && next.length <= 95 && !/^(?:#|>|\||```)/.test(next)) return true;
      break;
    }
    return false;
  }

  /**
   * Checks whether a preceding open semicolon list is terminated by a final '.' item.
   * @param {Array<string>} lines
   * @param {number} idx
   * @returns {boolean}
   */
  static isSemicolonListClosingLine(lines, idx) {
    const line = lines[idx]?.trim() || '';
    if (!line || line.length > 95 || !/[.;]\s*$/.test(line)) return false;
    if (/^(?:#|>|\||[-*•]\s|\d+[.)]\s|```)/.test(line)) return false;
    for (let j = idx - 1; j >= 0; j--) {
      const prev = lines[j].trim();
      if (!prev) continue;
      return /;\s*$/.test(prev) && prev.length <= 95 && !/^(?:#|>|\||```)/.test(prev);
    }
    return false;
  }

  /**
   * Checks whether an active list remains unbroken across a blank line
   * @param {Array<string>} lines
   * @param {number} blankIdx
   * @param {'ul'|'ol'} listTag
   * @returns {boolean}
   */
  static canContinueListOnBlankLine(lines, blankIdx, listTag) {
    let nextIdx = -1;
    for (let j = blankIdx + 1; j < lines.length; j++) {
      if (lines[j].trim().length > 0) { nextIdx = j; break; }
    }
    if (nextIdx < 0) return false;
    const nextRaw = lines[nextIdx];
    const nextTrim = nextRaw.trim();
    if (listTag === 'ol') {
      return /^\s*\d+[.)]\s+/.test(nextRaw) || /^\s{2,}[-*•]\s+/.test(nextRaw);
    }
    return (
      /^\s*[-*•]\s+/.test(nextRaw) ||
      MarkdownBlockHelper.isSemicolonListLine(lines, nextIdx) ||
      MarkdownBlockHelper.isSemicolonListClosingLine(lines, nextIdx) ||
      /^(\*\*.*?\*\*|[A-Za-z0-9À-ÿ\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\s'\-_–—]{2,60})\s*[:：]\s+(.*[.!?。！？].*)$/.test(nextTrim)
    );
  }

  /**
   * Wraps top-level heading groups (<h2>/<h3> sections) into card containers.
   * @param {string} html
   * @returns {string}
   */
  static wrapSectionCards(html) {
    if (!html || !/<h[23]\b/.test(html)) return html;
    const parts = html.split(/(?=<h[23]\b)/g).filter(Boolean);
    return parts.map(part => {
      const cleaned = part.replace(/<hr class="yt-ai-md-hr">\s*$/g, '');
      if (!cleaned.trim()) return '';
      if (/^<h[23]\b/.test(cleaned)) {
        return `<section class="yt-ai-md-section">${cleaned}</section>`;
      }
      return `<div class="yt-ai-md-intro">${cleaned}</div>`;
    }).join('');
  }
}

export default MarkdownBlockHelper;
