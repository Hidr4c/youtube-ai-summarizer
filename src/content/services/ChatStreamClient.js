import { QuickOnboardingHelper } from './QuickOnboardingHelper.js';
import { PortKeepaliveHelper } from './PortKeepaliveHelper.js';

/**
 * Client for streaming AI chat messages through Chrome background runtime port
 */
export class ChatStreamClient {
  constructor() {
    this.port = null;
    this.keepalive = null;
    this._intentionalDisconnect = false;
    this._pendingCancel = null;
  }

  /**
   * Disconnects active stream port if connected
   */
  disconnect() {
    this._intentionalDisconnect = true;
    const cancel = this._pendingCancel;
    this._pendingCancel = null;
    this.keepalive?.stop?.();
    this.keepalive = null;
    if (this.port) {
      try {
        this.port.disconnect();
      } catch (_) {
        // Port may already be closed
      }
      this.port = null;
    }
    if (typeof cancel === 'function') cancel();
  }

  /**
   * Starts AI streaming session over background port
   * @param {Object} options
   * @param {string} options.provider
   * @param {string} options.serverUrl
   * @param {string} options.apiKey
   * @param {string} options.model
   * @param {string} options.systemPrompt
   * @param {Array<Object>} options.messages
   * @param {string|number} [options.temperature='0.3']
   * @param {string|number} [options.maxTokens='auto']
   * @param {Function} options.onChunk
   * @param {Function} options.onDone
   * @param {Function} options.onError
   */
  startStream({
    provider,
    serverUrl,
    apiKey,
    model,
    systemPrompt,
    messages,
    temperature = '0.3',
    maxTokens = 'auto',
    localContextLength = 'auto',
    onChunk,
    onReasoning,
    onDone,
    onError,
    onCancel
  }) {
    this.disconnect();

    this._intentionalDisconnect = false;
    try {
      this.port = chrome.runtime.connect({ name: 'ai-stream' });
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err.message || String(err));
      }
      return;
    }

    const port = this.port;
    let settled = false;
    let canceled = false;
    this._pendingCancel = () => {
      if (settled || canceled) return;
      canceled = true;
      if (typeof onCancel === 'function') onCancel();
    };
    this.keepalive = PortKeepaliveHelper.attach(port);

    if (port.onDisconnect?.addListener) {
      port.onDisconnect.addListener(() => {
        const wasIntentional = this._intentionalDisconnect;
        this._pendingCancel = null;
        this.disconnect();
        if (!settled && !canceled && !wasIntentional) {
          settled = true;
          if (typeof onError === 'function') onError('Connection interrupted before model response.');
        } else if (!canceled && settled && typeof onDone === 'function') {
          onDone();
        }
      });
    }

    if (port.onMessage?.addListener) {
      port.onMessage.addListener((msg) => {
        if (canceled || settled) return;
        if (msg.type === 'CHUNK') {
          if (msg.content && typeof onChunk === 'function') onChunk(msg.content);
          else if (msg.reasoning && typeof onReasoning === 'function') onReasoning(msg.reasoning);
        } else if (msg.type === 'MODEL_RESOLVED') {
          QuickOnboardingHelper.syncResolvedModel(null, msg.provider || provider, msg.model);
        } else if (msg.type === 'DONE') {
          settled = true;
          this._pendingCancel = null;
          this.disconnect();
          if (typeof onDone === 'function') onDone();
        } else if (msg.type === 'ERROR') {
          settled = true;
          this._pendingCancel = null;
          this.disconnect();
          if (typeof onError === 'function') onError(msg.error || 'Stream error');
        }
      });
    }

    port.postMessage({
      action: 'CHAT_STREAM',
      provider,
      serverUrl,
      apiKey,
      model,
      systemPrompt,
      messages,
      temperature,
      maxTokens,
      localContextLength
    });
  }
}

export default ChatStreamClient;
