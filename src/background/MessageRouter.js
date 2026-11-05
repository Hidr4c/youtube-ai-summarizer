import { StreamRelay } from './StreamRelay.js';
import { AIProviderFactory } from '../services/ai/providers/AIProviderFactory.js';
import { BackgroundTranscriptFetcher } from './BackgroundTranscriptFetcher.js';
import { ChannelIntelligenceFetcher } from './ChannelIntelligenceFetcher.js';

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
              error: result.error || null,
              message: result.error ? `Failed: ${result.error}` : 'Connected'
            });
          })
          .catch(err => {
            sendResponse({
              success: false,
              ok: false,
              error: err.message,
              message: `Failed: ${err.message}`
            });
          });
        return true;
      }

      if (request.action === 'FETCH_TIMEDTEXT') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        fetch(request.url, { signal: controller.signal, credentials: 'include' })
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

      if (request.action === 'TTS_FETCH_AUDIO') {
        const text = (request.text || '').trim();
        const lang = request.lang || 'en';
        if (!text) {
          sendResponse({ success: false, error: 'Empty text' });
          return false;
        }

        (async () => {
          try {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const b64 = btoa(binary);
            sendResponse({ success: true, audioDataUrl: `data:audio/mpeg;base64,${b64}` });
          } catch (err) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }

      if (request.action === 'FETCH_CHANNEL_DOSSIER') {
        const { query, limit = 30 } = request;
        ChannelIntelligenceFetcher.fetchChannelDossier(query, limit)
          .then(res => sendResponse(res))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === 'FETCH_WATCH_PAGE_TRANSCRIPT') {
        const { videoId, lang = 'fr' } = request;
        BackgroundTranscriptFetcher.fetchTranscript(videoId, lang)
          .then(res => sendResponse(res))
          .catch(err => sendResponse({ success: false, error: err.message }));
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

    // Toolbar Action Badge Synchronization
    function updateBadge(enabled) {
      if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
        if (!enabled) {
          chrome.action.setBadgeText({ text: 'OFF' });
          if (chrome.action.setBadgeBackgroundColor) {
            chrome.action.setBadgeBackgroundColor({ color: '#6e7681' });
          }
        } else {
          chrome.action.setBadgeText({ text: '' });
        }
      }
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['extensionEnabled'], (res) => {
        const enabled = res?.extensionEnabled !== undefined ? Boolean(res.extensionEnabled) : true;
        updateBadge(enabled);
      });

      chrome.storage.onChanged?.addListener((changes, area) => {
        if (area === 'local' && changes.extensionEnabled !== undefined) {
          updateBadge(Boolean(changes.extensionEnabled.newValue));
        }
      });
    }
  }
}

export default MessageRouter;
