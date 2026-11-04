/**
 * Service dedicated to analyzing and enriching summaries with timestamps from transcripts
 */
export class TimestampEnricher {
  /**
   * Enriches markdown with timestamps if the LLM output dropped them
   * @param {string} markdown
   * @param {Array<Object>} segments
   * @returns {string}
   */
  static injectTimestampsIfMissing(markdown, segments) {
    if (!markdown || !Array.isArray(segments) || segments.length === 0) return markdown;
    if (/\[\d{1,2}:\d{2}(?::\d{2})?\]/.test(markdown)) return markdown;

    const lines = markdown.split('\n');
    let items = [];

    // Strategy 1: Detect explicit bullet points or numbered lists
    lines.forEach((line, idx) => {
      const match = line.match(/^(\s*(?:[-*]|\d+\.)\s+)(.*)$/);
      if (match && match[2].trim().length > 3) {
        items.push({ idx, prefix: match[1], content: match[2] });
      }
    });

    // Strategy 2: If no bullets, detect items in key points / chronological sections
    if (items.length === 0) {
      let inKeySection = false;
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (/^#{1,4}\s+.*(?:point|temps|fort|key|takeaway|d[eé]roul|moment|chapitre|puntos|punti|kernpunkte)/i.test(trimmed)) {
          inKeySection = true;
          return;
        }
        if (/^#{1,4}\s+/.test(trimmed)) {
          inKeySection = false;
          return;
        }
        if (inKeySection && trimmed.length > 8 && !trimmed.startsWith('>') && !trimmed.startsWith('|')) {
          items.push({ idx, prefix: '- ', content: trimmed });
        }
      });
    }

    if (items.length === 0) return markdown;
    const total = items.length;

    items.forEach((item, bIndex) => {
      const textToSearch = item.content.toLowerCase().replace(/[*_#`:]/g, ' ');
      const words = textToSearch.split(/\s+/).filter(w => w.length > 3);
      let bestSeg = null;
      let maxScore = 0;

      for (const seg of segments) {
        const segText = (seg.text || '').toLowerCase();
        let score = 0;
        for (const w of words) {
          if (segText.includes(w)) score++;
        }
        if (score > maxScore) {
          maxScore = score;
          bestSeg = seg;
        }
      }

      if (!bestSeg || maxScore === 0) {
        const segIndex = Math.min(segments.length - 1, Math.floor((bIndex / total) * segments.length));
        bestSeg = segments[segIndex];
      }

      const timeStr = bestSeg?.timestamp || '00:00';
      if (item.content.startsWith('**')) {
        lines[item.idx] = `${item.prefix}**[${timeStr}] ${item.content.slice(2)}`;
      } else {
        lines[item.idx] = `${item.prefix}**[${timeStr}]** ${item.content}`;
      }
    });

    return lines.join('\n');
  }
}

export default TimestampEnricher;
