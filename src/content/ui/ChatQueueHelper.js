import { I18N } from '../../locales/index.js';
import { ChatQueueDockView } from './ChatQueueDockView.js';

/**
 * Coordinates FIFO Q&A message queuing, recall-to-composer for queued or in-flight
 * turns, and Antigravity-style turn revert across Watch, Web, and Channel chat panes.
 */
export class ChatQueueHelper {
  static ensureState(ctrl) {
    if (!ctrl._chatQueueState) {
      ctrl._chatQueueState = {
        isBusy: false,
        activeTurn: null,
        queue: [],
        completedTurns: [],
        nextId: 1
      };
    }
    return ctrl._chatQueueState;
  }

  static getTranslations(ctrl, cfg = {}) {
    const lang = (typeof cfg.getLang === 'function' ? cfg.getLang() : null)
      || (typeof document !== 'undefined' ? document.getElementById?.('ytAiLangSelect')?.value : null)
      || ctrl?.state?.currentLang
      || ctrl?.lastLang
      || 'en';
    return I18N[lang] || I18N.en;
  }

  static setInputText(inputId, text = '', attachments = [], attachmentHelper = null) {
    if (typeof document === 'undefined' || !inputId) return;
    const inputEl = document.getElementById?.(inputId);
    const cleanText = String(text || '');
    if (inputEl) {
      const existing = String(inputEl.value || '').trim();
      inputEl.value = existing && existing !== cleanText ? `${cleanText}\n${existing}` : cleanText;
      if (inputEl.style) {
        inputEl.style.height = 'auto';
        if (inputEl.scrollHeight) inputEl.style.height = `${Math.min(inputEl.scrollHeight, 140)}px`;
      }
      inputEl.focus?.();
    }
    if (attachmentHelper && Array.isArray(attachments) && attachments.length > 0) {
      attachmentHelper.restore?.(attachments);
    }
  }

  static enqueueOrRun(ctrl, item = {}, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    const text = String(item.text || '').trim();
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    if (!text && attachments.length === 0) return { accepted: false, queued: false };

    if (item.clearInput !== false && typeof document !== 'undefined' && cfg.inputId) {
      const inputEl = document.getElementById?.(cfg.inputId);
      if (inputEl) {
        inputEl.value = '';
        if (inputEl.style) inputEl.style.height = 'auto';
      }
    }

    const entry = { id: st.nextId++, text, attachments, ctx: item.ctx || {} };
    if (st.isBusy) {
      st.queue.push(entry);
      ChatQueueHelper.renderQueueDock(ctrl, cfg);
      return Promise.resolve({ accepted: true, queued: true, entry });
    }
    return ChatQueueHelper._startEntry(ctrl, entry, cfg);
  }

  static _startEntry(ctrl, entry, cfg) {
    const st = ChatQueueHelper.ensureState(ctrl);
    st.isBusy = true;
    const turnObj = {
      id: entry.id, text: entry.text, attachments: entry.attachments,
      userBubble: null, aiBubble: null, aborted: false, abortFn: null, entry
    };
    st.activeTurn = turnObj;
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
    try {
      const res = cfg.onExecuteTurn?.(entry, turnObj);
      if (res && typeof res.catch === 'function') {
        return res.catch(() => {
          if (!turnObj.aborted) ChatQueueHelper.failOrEmptyTurn(ctrl, turnObj, cfg);
        });
      }
      return res;
    } catch (_) {
      if (!turnObj.aborted) ChatQueueHelper.failOrEmptyTurn(ctrl, turnObj, cfg);
    }
  }

  static bindTurnBubbles(ctrl, turnObj, userBubble, aiBubble, cfg = {}) {
    if (!turnObj) return;
    if (userBubble) turnObj.userBubble = userBubble;
    if (aiBubble) turnObj.aiBubble = aiBubble;
    ChatQueueHelper._setUserBubbleButtonMode(ctrl, turnObj, 'active', cfg);
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
  }

  static _setUserBubbleButtonMode(ctrl, turnObj, mode, cfg = {}) {
    const bubble = turnObj?.userBubble;
    if (!bubble || typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    const t = ChatQueueHelper.getTranslations(ctrl, cfg);
    let actions = bubble.querySelector?.('.yt-ai-user-bubble-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'yt-ai-user-bubble-actions';
      bubble.appendChild?.(actions);
    }
    while (actions.firstChild) actions.removeChild?.(actions.firstChild);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'yt-ai-chat-action-mini';
    if (mode === 'revert') {
      btn.classList?.add?.('is-revert');
      btn.textContent = `↩ ${t.chatRevertBtn || 'Revert'}`;
      btn.title = t.chatRevertTitle || 'Revert conversation to this message and edit it';
      btn.addEventListener?.('click', (e) => {
        e?.stopPropagation?.();
        ChatQueueHelper.revertToTurn(ctrl, turnObj, cfg);
      });
    } else if (mode === 'error') {
      btn.classList?.add?.('is-recall');
      btn.textContent = `✎ ${t.chatEditRecallBtn || 'Edit'}`;
      btn.title = t.chatEditRecallBtn || 'Put message back in input';
      btn.addEventListener?.('click', (e) => {
        e?.stopPropagation?.();
        turnObj.userBubble?.remove?.();
        turnObj.aiBubble?.remove?.();
        ChatQueueHelper.setInputText(cfg.inputId, turnObj.text, turnObj.attachments, cfg.attachmentHelper);
      });
    } else {
      btn.classList?.add?.('is-recall');
      btn.textContent = `✎ ${t.chatEditRecallBtn || 'Edit / Cancel'}`;
      btn.title = t.chatEditRecallBtn || 'Cancel and put message back in input';
      btn.addEventListener?.('click', (e) => {
        e?.stopPropagation?.();
        ChatQueueHelper.cancelActiveTurn(ctrl, cfg, true, false);
      });
    }
    actions.appendChild?.(btn);
  }

  static completeTurn(ctrl, turnObj, cfg = {}) {
    if (!turnObj || turnObj.aborted) return;
    const st = ChatQueueHelper.ensureState(ctrl);
    st.completedTurns.push(turnObj);
    ChatQueueHelper._setUserBubbleButtonMode(ctrl, turnObj, 'revert', cfg);
    if (st.activeTurn === turnObj) st.activeTurn = null;
    st.isBusy = false;
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
    ChatQueueHelper.processNext(ctrl, cfg);
  }

  static failOrEmptyTurn(ctrl, turnObj, cfg = {}) {
    if (!turnObj || turnObj.aborted) return;
    const st = ChatQueueHelper.ensureState(ctrl);
    ChatQueueHelper._setUserBubbleButtonMode(ctrl, turnObj, 'error', cfg);
    if (st.activeTurn === turnObj) st.activeTurn = null;
    st.isBusy = false;
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
    ChatQueueHelper.processNext(ctrl, cfg);
  }

  static cancelActiveTurn(ctrl, cfg = {}, restoreToInput = true, skipProcessNext = false) {
    const st = ChatQueueHelper.ensureState(ctrl);
    const turn = st.activeTurn;
    if (!turn) return false;
    turn.aborted = true;
    try { turn.abortFn?.(); } catch (_) {}
    const streamClient = typeof cfg.getStreamClient === 'function' ? cfg.getStreamClient(ctrl) : ctrl?.streamClient;
    try { streamClient?.disconnect?.(); } catch (_) {}
    if (typeof document !== 'undefined' && cfg.messagesId) {
      document.getElementById?.(cfg.messagesId)?.querySelectorAll?.('.yt-ai-status-bubble')?.forEach((el) => el.remove?.());
    }
    turn.aiBubble?.remove?.();
    turn.userBubble?.remove?.();
    st.activeTurn = null;
    st.isBusy = false;
    if (restoreToInput) {
      ChatQueueHelper.setInputText(cfg.inputId, turn.text, turn.attachments, cfg.attachmentHelper);
    }
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
    if (!restoreToInput && !skipProcessNext) ChatQueueHelper.processNext(ctrl, cfg);
    return true;
  }

  static recallQueuedItem(ctrl, itemId, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    const idx = st.queue.findIndex((q) => q.id === itemId);
    if (idx === -1) return null;
    const [item] = st.queue.splice(idx, 1);
    ChatQueueHelper.setInputText(cfg.inputId, item.text, item.attachments, cfg.attachmentHelper);
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
    return item;
  }

  static removeQueuedItem(ctrl, itemId, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    st.queue = st.queue.filter((q) => q.id !== itemId);
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
  }

  static sendQueuedNow(ctrl, itemId, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    if (st.isBusy) return false;
    const idx = st.queue.findIndex((q) => q.id === itemId);
    if (idx === -1) return false;
    const [item] = st.queue.splice(idx, 1);
    ChatQueueHelper._startEntry(ctrl, item, cfg);
    return true;
  }

  static revertToTurn(ctrl, turnObj, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    const idx = st.completedTurns.indexOf(turnObj);
    if (idx === -1) return false;
    if (st.isBusy && st.activeTurn) {
      ChatQueueHelper.cancelActiveTurn(ctrl, cfg, false, true);
    }
    ctrl.chatHistory = Array.isArray(ctrl.chatHistory) ? ctrl.chatHistory.slice(0, idx * 2) : [];
    const removed = st.completedTurns.splice(idx);
    for (const r of removed) {
      r.userBubble?.remove?.();
      r.aiBubble?.remove?.();
    }
    if (typeof document !== 'undefined' && cfg.messagesId) {
      document.getElementById?.(cfg.messagesId)?.querySelectorAll?.('.yt-ai-status-bubble')?.forEach((el) => el.remove?.());
    }
    const badge = typeof document !== 'undefined' && cfg.countBadgeId ? document.getElementById?.(cfg.countBadgeId) : null;
    if (badge) badge.textContent = String(idx);
    ChatQueueHelper.setInputText(cfg.inputId, turnObj.text, turnObj.attachments, cfg.attachmentHelper);
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
    return true;
  }

  static processNext(ctrl, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    if (st.isBusy || st.queue.length === 0) return false;
    const next = st.queue.shift();
    ChatQueueHelper._startEntry(ctrl, next, cfg);
    return true;
  }

  static clearAll(ctrl, cfg = {}) {
    const st = ChatQueueHelper.ensureState(ctrl);
    if (st.activeTurn) {
      st.activeTurn.aborted = true;
      try { st.activeTurn.abortFn?.(); } catch (_) {}
    }
    st.isBusy = false;
    st.activeTurn = null;
    st.queue = [];
    st.completedTurns = [];
    ChatQueueHelper.renderQueueDock(ctrl, cfg);
  }

  static renderQueueDock(ctrl, cfg = {}) {
    if (typeof document === 'undefined' || !cfg.queueContainerId) return;
    const dock = document.getElementById?.(cfg.queueContainerId);
    if (!dock) return;
    const st = ChatQueueHelper.ensureState(ctrl);
    const t = ChatQueueHelper.getTranslations(ctrl, cfg);
    ChatQueueDockView.render({
      dock,
      state: st,
      t,
      onCancelActive: (restore) => ChatQueueHelper.cancelActiveTurn(ctrl, cfg, restore, false),
      onRecallQueued: (id) => ChatQueueHelper.recallQueuedItem(ctrl, id, cfg),
      onRemoveQueued: (id) => ChatQueueHelper.removeQueuedItem(ctrl, id, cfg),
      onSendQueuedNow: (id) => ChatQueueHelper.sendQueuedNow(ctrl, id, cfg)
    });
  }
}

export default ChatQueueHelper;
