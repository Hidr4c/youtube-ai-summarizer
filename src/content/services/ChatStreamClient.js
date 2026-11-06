/**
 * Client for streaming AI chat messages through Chrome background runtime port
 */
export class ChatStreamClient {
  constructor() {
    this.port = null;
  }

  /**
   * Disconnects active stream port if connected
   */
  disconnect() {
    if (this.port) {
      try {
        this.port.disconnect();
      } catch (_) {
        // Port may already be closed
      }
      this.port = null;
    }
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
    onChunk,
    onDone,
    onError
  }) {
    this.disconnect();

    try {
      this.port = chrome.runtime.connect({ name: 'ai-stream' });
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err.message || String(err));
      }
      return;
    }

    const port = this.port;

    if (port.onDisconnect?.addListener) {
      port.onDisconnect.addListener(() => {
        this.disconnect();
        if (typeof onDone === 'function') onDone();
      });
    }

    if (port.onMessage?.addListener) {
      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK' && msg.content) {
          if (typeof onChunk === 'function') onChunk(msg.content);
        } else if (msg.type === 'DONE') {
          this.disconnect();
          if (typeof onDone === 'function') onDone();
        } else if (msg.type === 'ERROR') {
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
      maxTokens
    });
  }
}

export default ChatStreamClient;
