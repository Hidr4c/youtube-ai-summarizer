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

      if (request.action === 'FETCH_WATCH_PAGE_TRANSCRIPT') {
        const { videoId, lang = 'fr' } = request;
        if (!videoId) {
          sendResponse({ success: false, error: 'No videoId' });
          return true;
        }

        (async () => {
          try {
            const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
              headers: { 'Accept-Language': `${lang},en;q=0.8` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();

            let captionTracks = [];
            const startIdx = html.indexOf('var ytInitialPlayerResponse = ');
            if (startIdx !== -1) {
              const sub = html.slice(startIdx + 'var ytInitialPlayerResponse = '.length);
              const endIdx = sub.indexOf(';</script>');
              if (endIdx !== -1) {
                try {
                  const parsed = JSON.parse(sub.slice(0, endIdx));
                  captionTracks = parsed.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
                } catch (_) {}
              }
            }

            if (!captionTracks.length) {
              const tracksMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
              if (tracksMatch) {
                try { captionTracks = JSON.parse(tracksMatch[1]); } catch (_) {}
              }
            }

            if (!captionTracks.length) {
              sendResponse({ success: false, error: 'No caption tracks found' });
              return;
            }

            let track = captionTracks.find(t => t.languageCode === lang);
            if (!track) track = captionTracks.find(t => t.languageCode?.startsWith(lang));
            if (!track) track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
            if (!track) track = captionTracks[0];

            if (!track?.baseUrl) {
              sendResponse({ success: false, error: 'No track baseUrl' });
              return;
            }

            const ttUrl = track.baseUrl + (track.baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
            const ttRes = await fetch(ttUrl);
            if (!ttRes.ok) throw new Error(`Timedtext HTTP ${ttRes.status}`);
            const ttJson = await ttRes.json();

            const segments = [];
            if (Array.isArray(ttJson.events)) {
              for (const ev of ttJson.events) {
                if (!ev.segs) continue;
                const sec = Math.floor((ev.tStartMs || 0) / 1000);
                const m = Math.floor(sec / 60);
                const s = (sec % 60).toString().padStart(2, '0');
                const text = ev.segs.map(seg => seg.utf8 || '').join('').replace(/\s+/g, ' ').trim();
                if (text && text !== '\n') {
                  segments.push({ timestamp: `${m}:${s}`, text });
                }
              }
            }

            sendResponse({ success: segments.length > 0, segments, captions: captionTracks });
          } catch (err) {
            sendResponse({ success: false, error: err.message });
          }
        })();
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
