/**
 * Pure XSS-safe DOM renderer for the active-turn & queued-message dock
 * displayed above the Q&A chat composer.
 */
export class ChatQueueDockView {
  static render({ dock, state, t, onCancelActive, onRecallQueued, onRemoveQueued, onSendQueuedNow }) {
    if (!dock || typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    const hasActive = Boolean(state.activeTurn);
    const hasQueue = state.queue.length > 0;
    if (!hasActive && !hasQueue) {
      dock.classList?.add?.('yt-ai-hidden');
      while (dock.firstChild) dock.removeChild?.(dock.firstChild);
      if ('innerHTML' in dock && !dock.removeChild) dock.innerHTML = '';
      return;
    }

    dock.classList?.remove?.('yt-ai-hidden');
    while (dock.firstChild) dock.removeChild?.(dock.firstChild);
    if ('innerHTML' in dock && !dock.removeChild) dock.innerHTML = '';

    if (hasActive) {
      const row = document.createElement('div');
      row.className = 'yt-ai-chat-active-pill';
      const label = document.createElement('span');
      label.className = 'yt-ai-queue-text';
      const snippet = state.activeTurn.text || `[${state.activeTurn.attachments?.length || 1} file(s)]`;
      label.textContent = `${t.chatInProgressLabel || 'Generating:'} ${snippet}`;
      row.appendChild?.(label);
      row.appendChild?.(ChatQueueDockView.makeMiniBtn(
        `✎ ${t.chatEditRecallBtn || 'Edit / Cancel'}`,
        t.chatEditRecallBtn || 'Cancel and put back in input',
        'is-recall',
        () => onCancelActive?.(true)
      ));
      row.appendChild?.(ChatQueueDockView.makeMiniBtn(
        '⏹',
        t.stopShortBtn || 'Stop',
        'is-remove',
        () => onCancelActive?.(false)
      ));
      dock.appendChild?.(row);
    }

    if (hasQueue) {
      const header = document.createElement('div');
      header.className = 'yt-ai-queue-header';
      header.textContent = `⏳ ${(t.chatQueueTitle || 'Queued ({count})').replace('{count}', String(state.queue.length))}`;
      dock.appendChild?.(header);

      state.queue.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'yt-ai-chat-queue-item';
        const txt = document.createElement('span');
        txt.className = 'yt-ai-queue-text';
        const preview = item.text || `[${item.attachments?.length || 1} file(s)]`;
        const attSuffix = item.text && item.attachments?.length ? ` (+${item.attachments.length})` : '';
        txt.textContent = `${index + 1}. ${preview}${attSuffix}`;
        itemEl.appendChild?.(txt);

        if (!state.isBusy) {
          itemEl.appendChild?.(ChatQueueDockView.makeMiniBtn('▶', t.chatSendNowBtn || 'Send now', 'is-send', () => onSendQueuedNow?.(item.id)));
        }
        itemEl.appendChild?.(ChatQueueDockView.makeMiniBtn('✎', t.chatEditRecallBtn || 'Edit / Cancel', 'is-recall', () => onRecallQueued?.(item.id)));
        itemEl.appendChild?.(ChatQueueDockView.makeMiniBtn('✕', t.chatRemoveQueueBtn || 'Remove from queue', 'is-remove', () => onRemoveQueued?.(item.id)));
        dock.appendChild?.(itemEl);
      });
    }
  }

  static makeMiniBtn(label, title, extraClass, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `yt-ai-chat-action-mini ${extraClass || ''}`.trim();
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener?.('click', (e) => {
      e?.stopPropagation?.();
      onClick?.();
    });
    return btn;
  }
}

export default ChatQueueDockView;
