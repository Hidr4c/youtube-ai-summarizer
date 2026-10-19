import { StreamRelay } from './StreamRelay.js';
import { AIProviderFactory } from '../services/ai/providers/AIProviderFactory.js';

/**
 * Message routing controller for background service worker
 */
export class MessageRouter {
  static init() {
    // Port listener for streaming inference (supports both modern and legacy port names)
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'ai-stream' || port.name === 'lm-studio-stream' || port.name === 'YT_AI_STREAM') {
        port.onMessage.addListener((msg) => {
          if (msg.action === 'START_STREAM' || msg.action === 'CHAT_STREAM' || msg.action === 'STREAM_CHAT') {
            StreamRelay.handleStream(msg, port);
          }
        });
      }
    });

    // One-time message listener for model lists, ping tests and transcript fetching
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'FETCH_MODELS') {
        const provider = AIProviderFactory.getProvider(request.provider || 'lmstudio');
        provider.fetchModels(request.serverUrl, request.apiKey)
          .then(models => {
            sendResponse({
              success: true,
              ok: true,
              data: { data: models, models: models },
              models: models
            });
          })
          .catch(err => {
            sendResponse({
              success: false,
              ok: false,
              error: err.message
            });
          });
        return true; // Keep channel open for async response
      }

      if (request.action === 'TEST_PROVIDER' || request.action === 'PING_SERVER') {
        const provider = AIProviderFactory.getProvider(request.provider || 'lmstudio');
        provider.testConnection(request.serverUrl, request.apiKey, request.model)
          .then(result => {
            sendResponse({
              success: result.ok,
              ok: result.ok,
              latency: result.latencyMs || 0,
              latencyMs: result.latencyMs || 0,
              error: result.error
            });
          })
          .catch(err => {
            sendResponse({
              success: false,
              ok: false,
              error: err.message
            });
          });
        return true;
      }

      if (request.action === 'FETCH_TIMEDTEXT') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        fetch(request.url, { method: 'GET', signal: controller.signal })
          .then(async res => {
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            sendResponse({ success: true, ok: true, text, data: text });
          })
          .catch(err => {
            clearTimeout(timer);
            sendResponse({ success: false, ok: false, error: err.message });
          });
        return true;
      }
    });

    // Auto-inject scripts on install/update into open YouTube tabs
    if (chrome.runtime?.onInstalled) {
      chrome.runtime.onInstalled.addListener(() => {
        if (!chrome.tabs || !chrome.scripting) return;
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
          for (const tab of (tabs || [])) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              world: 'MAIN',
              files: ['dist/main_world.js']
            }).catch(() => {});
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['dist/content.js']
            }).catch(() => {});
            chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['dist/content.css']
            }).catch(() => {});
          }
        });
      });
    }
  }
}

export default MessageRouter;
