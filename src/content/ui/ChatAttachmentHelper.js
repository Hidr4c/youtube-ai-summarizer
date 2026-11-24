import { I18N } from '../../locales/index.js';
import { ModelCapabilities } from '../../config/ModelCapabilities.js';
import { escapeHtml } from './MarkdownRenderer.js';

const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 24000;
const TEXT_ACCEPT = '.txt,.md,.markdown,.csv,.tsv,.json,.xml,.yaml,.yml,.log,.js,.mjs,.cjs,.ts,.tsx,.jsx,.py,.rs,.go,.java,.c,.cpp,.h,.html,.css,.sql,.srt,.vtt';
const TEXT_EXT_RE = /\.(txt|md|markdown|csv|tsv|json|xml|yaml|yml|log|js|mjs|cjs|ts|tsx|jsx|py|rs|go|java|c|cpp|h|hpp|cs|php|rb|sh|ps1|html|htm|css|scss|sql|srt|vtt|ini|toml|env|conf|cfg)$/i;

/**
 * Manages image and text-file attachments (file picker, drag-drop, clipboard paste)
 * for the Q&A chat input across both Watch and Shorts pages.
 */
export class ChatAttachmentHelper {
  /**
   * @param {Object} [options]
   * @param {() => string} [options.getLang]
   * @param {(msg: string) => void} [options.onNotice]
   * @param {() => { provider?: string, model?: string, meta?: Object|null }} [options.getModelInfo]
   */
  constructor(options = {}) {
    this.attachments = [];
    this.getLang = typeof options.getLang === 'function' ? options.getLang : () => 'en';
    this.onNotice = typeof options.onNotice === 'function' ? options.onNotice : null;
    this.getModelInfo = typeof options.getModelInfo === 'function' ? options.getModelInfo : null;
  }

  canAttachImages() {
    if (!this.getModelInfo) return true;
    const info = this.getModelInfo() || {};
    return ModelCapabilities.supportsImages(info.provider, info.model, info.meta);
  }

  syncUiCapability() {
    const allowed = this.canAttachImages();
    const t = I18N[this.getLang()] || I18N.en;
    const input = document.getElementById('ytAiAttachInput');
    if (input) input.accept = allowed ? `image/*,${TEXT_ACCEPT}` : TEXT_ACCEPT;
    const btn = document.getElementById('ytAiAttachBtn');
    if (btn) {
      btn.setAttribute?.('data-vision-supported', String(allowed));
      btn.title = allowed
        ? (t.attachTitle || 'Attach image or file (or paste Ctrl+V)')
        : (t.attachTitleTextOnly || 'Attach text/code file (images require a multimodal model)');
    }
    if (!allowed && this.attachments.some((a) => a.kind === 'image')) {
      this.attachments = this.attachments.filter((a) => a.kind !== 'image');
      this.renderPreview();
    }
    return allowed;
  }

  hasPending() {
    return this.attachments.length > 0;
  }

  clear() {
    this.attachments = [];
    this.renderPreview();
  }

  restore(items = []) {
    if (!Array.isArray(items) || items.length === 0) return;
    const next = [...this.attachments];
    for (const item of items) {
      if (next.length >= MAX_ATTACHMENTS) break;
      if (item && (item.kind === 'image' || item.kind === 'text')) next.push({ ...item });
    }
    this.attachments = next;
    this.renderPreview();
  }

  consume() {
    const taken = this.attachments.slice();
    this.clear();
    return taken;
  }

  removeAt(index) {
    if (index < 0 || index >= this.attachments.length) return;
    this.attachments.splice(index, 1);
    this.renderPreview();
  }

  /**
   * Checks whether a File is a supported text/code document.
   * @param {File} file
   * @returns {boolean}
   */
  static isTextFile(file) {
    if (!file) return false;
    const mime = String(file.type || '').toLowerCase();
    if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || mime === 'application/javascript') {
      return true;
    }
    return TEXT_EXT_RE.test(String(file.name || ''));
  }

  /**
   * Processes clipboard paste events for images (e.g. Windows Snipping Tool).
   * @param {ClipboardEvent} event
   * @returns {Promise<number>} number of accepted attachments
   */
  async handlePaste(event) {
    const cd = event?.clipboardData;
    if (!cd) return 0;

    const imageFiles = [];
    if (cd.items && cd.items.length > 0) {
      for (const item of cd.items) {
        if (item.kind === 'file' && String(item.type || '').startsWith('image/')) {
          const f = item.getAsFile?.();
          if (f) imageFiles.push(f);
        }
      }
    } else if (cd.files && cd.files.length > 0) {
      for (const f of cd.files) {
        if (String(f.type || '').startsWith('image/')) imageFiles.push(f);
      }
    }

    if (imageFiles.length === 0) return 0;
    const hasPlainText = Boolean(cd.getData?.('text/plain'));
    if (!hasPlainText && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    return this.handleFiles(imageFiles);
  }

  /**
   * Reads selected or dropped File objects into pending attachments.
   * @param {FileList|Array<File>} fileList
   * @returns {Promise<number>}
   */
  async handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return 0;
    const t = I18N[this.getLang()] || I18N.en;
    let added = 0;

    for (const file of Array.from(fileList)) {
      if (this.attachments.length >= MAX_ATTACHMENTS) break;
      const mime = String(file.type || '').toLowerCase();

      if (mime.startsWith('image/')) {
        if (!this.canAttachImages()) {
          this.onNotice?.(t.attachImageNotSupported || 'The selected model does not support images.');
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          this.onNotice?.(t.attachTooLarge || 'Image exceeds 8 MB limit.');
          continue;
        }
        const dataUrl = await ChatAttachmentHelper._readFileAs(file, 'dataUrl');
        if (dataUrl) {
          this.attachments.push({ kind: 'image', name: file.name || 'image.png', mimeType: mime, dataUrl });
          added += 1;
        }
      } else if (ChatAttachmentHelper.isTextFile(file)) {
        const rawText = await ChatAttachmentHelper._readFileAs(file, 'text');
        if (typeof rawText === 'string') {
          const truncated = rawText.length > MAX_TEXT_CHARS
            ? `${rawText.slice(0, MAX_TEXT_CHARS)}\n... [truncated]`
            : rawText;
          this.attachments.push({ kind: 'text', name: file.name || 'file.txt', mimeType: mime || 'text/plain', textContent: truncated });
          added += 1;
        }
      } else {
        this.onNotice?.(t.attachUnsupported || 'Unsupported file type. Attach images or text/code files.');
      }
    }

    if (added > 0) this.renderPreview();
    return added;
  }

  static _readFileAs(file, mode) {
    if (mode === 'text' && typeof file.text === 'function') {
      return file.text().catch(() => null);
    }
    if (typeof FileReader === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      if (mode === 'dataUrl') reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
  }

  renderPreview(containerId = 'ytAiChatAttachments') {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (this.attachments.length === 0) {
      el.innerHTML = '';
      el.classList?.add('yt-ai-hidden');
      return;
    }

    el.classList?.remove('yt-ai-hidden');
    el.innerHTML = '';
    this.attachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = att.kind === 'image' ? 'yt-ai-attachment-thumb' : 'yt-ai-attachment-file';
      if (att.kind === 'image') {
        const img = document.createElement('img');
        img.src = att.dataUrl;
        img.alt = att.name;
        chip.appendChild(img);
      } else {
        const label = document.createElement('span');
        label.className = 'yt-ai-attachment-filename';
        label.textContent = `📄 ${att.name}`;
        chip.appendChild(label);
      }
      const rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'yt-ai-attachment-remove';
      rmBtn.textContent = '×';
      rmBtn.addEventListener('click', () => this.removeAt(idx));
      chip.appendChild(rmBtn);
      el.appendChild(chip);
    });
  }

  /**
   * Builds user bubble HTML containing attached thumbnails/file badges and escaped message text.
   * @param {string} text
   * @param {Array<Object>} attachments
   * @returns {string}
   */
  static buildUserBubbleHtml(text, attachments = []) {
    if (!attachments || attachments.length === 0) return escapeHtml(text);
    const itemsHtml = attachments.map((att) => {
      if (att.kind === 'image') {
        return `<img class="yt-ai-bubble-img" src="${escapeHtml(att.dataUrl)}" alt="${escapeHtml(att.name)}">`;
      }
      return `<span class="yt-ai-bubble-file">📄 ${escapeHtml(att.name)}</span>`;
    }).join('');
    const textHtml = text ? `<div class="yt-ai-bubble-text">${escapeHtml(text)}</div>` : '';
    return `<div class="yt-ai-bubble-attachments">${itemsHtml}</div>${textHtml}`;
  }

  /**
   * Converts attachments into canonical payload fields for StreamRelay / chatHistory.
   * @param {string} text
   * @param {Array<Object>} attachments
   * @returns {{ role: string, content: string, images?: Array<Object>, files?: Array<Object> }}
   */
  static buildMessagePayload(text, attachments = []) {
    const cleanText = String(text || '').trim();
    const images = attachments.filter((a) => a.kind === 'image').map(({ name, mimeType, dataUrl }) => ({ name, mimeType, dataUrl }));
    const files = attachments.filter((a) => a.kind === 'text').map(({ name, mimeType, textContent }) => ({ name, mimeType, textContent }));
    const fallbackPrompt = (images.length > 0 || files.length > 0) && !cleanText
      ? 'Analyze the attached image(s)/file(s) in the context of this video.'
      : cleanText;
    const msg = { role: 'user', content: fallbackPrompt };
    if (images.length > 0) msg.images = images;
    if (files.length > 0) msg.files = files;
    return msg;
  }
}

export default ChatAttachmentHelper;
