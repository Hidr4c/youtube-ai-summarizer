import { I18N } from '../../locales/index.js';

/**
 * UI Renderer for chat bubbles and inline audio controls
 */
export class ChatBubbleView {
  static scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  static appendChatBubble(role, contentHtml) {
    const container = document.getElementById('ytAiChatMessages');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `yt-ai-chat-bubble ${role} ${role === 'ai' ? 'yt-ai-markdown' : ''}`;
    bubble.innerHTML = contentHtml;
    container.appendChild(bubble);
    this.scrollToBottom(container);
    return bubble;
  }

  static attachAudioButton(bubble, answerText, audioController, currentLang = 'en') {
    if (!bubble || !audioController) return;
    const existingToolbar = bubble.querySelector('.yt-ai-bubble-toolbar');
    if (existingToolbar) return;

    const t = I18N[currentLang] || I18N.en;
    const toolbar = document.createElement('div');
    toolbar.className = 'yt-ai-bubble-toolbar';

    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'yt-ai-tts-btn';
    ttsBtn.title = t.listenBubbleTitle || 'Listen to this answer';
    ttsBtn.textContent = t.listenBtn || '🔊 Listen';

    ttsBtn.addEventListener('click', () => {
      const activeLang = document.getElementById('ytAiLangSelect')?.value || currentLang;
      audioController.speakText(answerText, ttsBtn, { lang: activeLang });
    });

    toolbar.appendChild(ttsBtn);
    bubble.appendChild(toolbar);
  }
}

export default ChatBubbleView;
