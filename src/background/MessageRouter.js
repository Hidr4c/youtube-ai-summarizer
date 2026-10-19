import { StreamRelay } from './StreamRelay.js';
import { AIProviderFactory } from '../services/ai/providers/AIProviderFactory.js';

/**
 * Message routing controller for background service worker
 */
export class MessageRouter {
  static init() {
    // Port listener for streaming inference
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'YT_AI_STREAM') {
        port.onMessage.addListener((msg) => {
          if (msg.action === 'STREAM_CHAT') {
            StreamRelay.handleStream(msg, port);
          }
        });
      }
    });

    // One-time message listener for model lists and ping tests
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'FETCH_MODELS') {
        const provider = AIProviderFactory.getProvider(request.provider || 'lmstudio');
        provider.fetchModels(request.serverUrl, request.apiKey)
          .then(models => sendResponse({ ok: true, data: models }))
          .catch(err => sendResponse({ ok: false, error: err.message }));
        return true; // Keep channel open for async response
      }

      if (request.action === 'PING_SERVER') {
        const provider = AIProviderFactory.getProvider(request.provider || 'lmstudio');
        provider.testConnection(request.serverUrl, request.apiKey, request.model)
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ ok: false, error: err.message }));
        return true;
      }

      if (request.action === 'FETCH_TIMEDTEXT') {
        fetch(request.url)
          .then(r => r.json())
          .then(data => sendResponse({ ok: true, data }))
          .catch(err => sendResponse({ ok: false, error: err.message }));
        return true;
      }
    });
  }
}

export default MessageRouter;
