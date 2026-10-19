/**
 * Component managing the Interactive Q&A Chat Pane
 */
export class ChatViewComponent {
  /**
   * @param {HTMLElement} rootEl
   * @param {Object} callbacks
   */
  constructor(rootEl, callbacks = {}) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  bindEvents() {
    const input = this.rootEl.querySelector('#ytAiChatInput');
    const sendBtn = this.rootEl.querySelector('#ytAiSendChatBtn');

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => this.submitMessage());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.submitMessage();
        }
      });
    }

    const micBtn = this.rootEl.querySelector('#ytAiMicBtn');
    if (micBtn && this.callbacks.onToggleMic) {
      micBtn.addEventListener('click', () => this.callbacks.onToggleMic());
    }

    const clearBtn = this.rootEl.querySelector('#ytAiClearChatBtn');
    if (clearBtn && this.callbacks.onClear) {
      clearBtn.addEventListener('click', () => this.callbacks.onClear());
    }
  }

  submitMessage() {
    const input = this.rootEl.querySelector('#ytAiChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (this.callbacks.onSendMessage) {
      this.callbacks.onSendMessage(text);
    }
  }

  /**
   * Appends a message bubble to chat history
   * @param {string} role ('user' or 'ai')
   * @param {string} text
   */
  appendMessage(role, text) {
    const container = this.rootEl.querySelector('#ytAiChatMessages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `yt-ai-chat-bubble ${role}`;
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  /**
   * Sets prompt suggestion chips
   * @param {Array<{label: string, question: string}>} suggestions
   */
  setSuggestions(suggestions = []) {
    const container = this.rootEl.querySelector('.yt-ai-chat-suggestions');
    if (!container) return;

    container.innerHTML = suggestions.map(s => `
      <span class="yt-ai-suggestion-chip" data-question="${s.question}">${s.label}</span>
    `).join('');

    container.querySelectorAll('.yt-ai-suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-question');
        if (q && this.callbacks.onSendMessage) {
          this.callbacks.onSendMessage(q);
        }
      });
    });
  }

  /**
   * Clears all messages from the chat view
   * @param {string} welcomeMessage
   */
  clear(welcomeMessage = '') {
    const container = this.rootEl.querySelector('#ytAiChatMessages');
    if (container) {
      container.innerHTML = welcomeMessage ? `<div class="yt-ai-chat-bubble ai">${welcomeMessage}</div>` : '';
    }
  }
}

export default ChatViewComponent;
