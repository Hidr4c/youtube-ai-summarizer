/**
 * Formats canonical chat messages (text + optional attached images/files)
 * into provider-specific multimodal API payloads.
 */
export class MultimodalMessageFormatter {
  /**
   * Parses a base64 data URL into media type and raw base64 payload.
   * @param {string} dataUrl
   * @returns {{ mimeType: string, base64: string } | null}
   */
  static parseDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string') return null;
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
    if (!match) return null;
    return { mimeType: match[1], base64: match[2] };
  }

  /**
   * Appends attached text file contents cleanly to a message's text prompt.
   * @param {Object} msg
   * @returns {string}
   */
  static buildCombinedText(msg) {
    const baseText = typeof msg?.content === 'string' ? msg.content : '';
    const files = Array.isArray(msg?.files) ? msg.files : [];
    if (files.length === 0) return baseText;

    const fileBlocks = files
      .filter((f) => f && f.name && typeof f.textContent === 'string')
      .map((f) => `[Attached file: ${f.name}]\n\`\`\`\n${f.textContent}\n\`\`\``);

    if (fileBlocks.length === 0) return baseText;
    return [baseText, ...fileBlocks].filter(Boolean).join('\n\n');
  }

  /**
   * Formats messages for OpenAI-compatible, Claude, or native Ollama /api/chat.
   * @param {Array<Object>} messages
   * @param {'openai'|'claude'|'ollama'} [format='openai']
   * @returns {Array<Object>}
   */
  static formatMessages(messages = [], format = 'openai') {
    if (!Array.isArray(messages)) return [];
    return messages.map((msg) => this._formatSingle(msg, format));
  }

  /**
   * @param {Object} msg
   * @param {'openai'|'claude'|'ollama'} format
   * @returns {Object}
   */
  static _formatSingle(msg, format) {
    if (!msg || typeof msg !== 'object') return msg;
    const text = this.buildCombinedText(msg);
    const images = Array.isArray(msg.images) ? msg.images.filter((i) => i?.dataUrl) : [];

    if (images.length === 0) {
      return { role: msg.role, content: text };
    }

    if (format === 'ollama') {
      const rawImages = images
        .map((img) => this.parseDataUrl(img.dataUrl)?.base64)
        .filter(Boolean);
      return rawImages.length > 0
        ? { role: msg.role, content: text, images: rawImages }
        : { role: msg.role, content: text };
    }

    if (format === 'claude') {
      const blocks = [];
      for (const img of images) {
        const parsed = this.parseDataUrl(img.dataUrl);
        if (parsed) {
          blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: parsed.mimeType, data: parsed.base64 }
          });
        }
      }
      if (text) blocks.push({ type: 'text', text });
      return { role: msg.role, content: blocks };
    }

    // Default: OpenAI-compatible (LM Studio, OpenAI, Gemini OpenAI endpoint, OpenRouter, Groq)
    const parts = [];
    if (text) parts.push({ type: 'text', text });
    for (const img of images) {
      parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }
    return { role: msg.role, content: parts };
  }
}

export default MultimodalMessageFormatter;
