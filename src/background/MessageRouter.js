import { StreamRelay } from './StreamRelay.js';
import { LocalContextManager } from './LocalContextManager.js';
import { AIProviderFactory } from '../services/ai/providers/AIProviderFactory.js';
import { BackgroundTranscriptFetcher } from './BackgroundTranscriptFetcher.js';
import { ChannelIntelligenceFetcher } from './ChannelIntelligenceFetcher.js';
import { VideoCommentsFetcher } from './VideoCommentsFetcher.js';
import { VideoDossierFetcher } from './VideoDossierFetcher.js';
import { DomainAuditFetcher } from './DomainAuditFetcher.js';
import { BackgroundImageFetcher } from './BackgroundImageFetcher.js';

/**
 * Message routing controller for background service worker
 */
export class MessageRouter {
  static init() {
    // Port listener for streaming inference (supports both modern and legacy port names)
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'ai-stream' || port.name === 'ai_stream' || port.name === 'lm-studio-stream' || port.name === 'YT_AI_STREAM') {
        port.onMessage.addListener((msg) => {
          if (msg?.action === 'KEEPALIVE' || msg?.type === 'KEEPALIVE') return;
          if (msg.action === 'START_STREAM' || msg.action === 'CHAT_STREAM' || msg.action === 'STREAM_CHAT' || msg.action === 'GENERATE_STREAM' || msg.action === 'AUDIT_STREAM') {
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
          .then(async (models) => {
            const enriched = typeof provider.enrichCapabilities === 'function'
              ? await provider.enrichCapabilities(models, request.serverUrl)
              : models;
            sendResponse({
              success: true,
              ok: true,
              data: { data: enriched, models: enriched },
              models: enriched
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
              resolvedModel: result.resolvedModel || null,
              errorKind: result.errorKind || null,
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

      if (request.action === 'GET_LOCAL_CONTEXT_DEFAULT') {
        LocalContextManager.detectLocalContextDefault({
          provider: request.provider || 'lmstudio',
          serverUrl: request.serverUrl,
          model: request.model || '',
          apiKey: request.apiKey || ''
        })
          .then((res) => sendResponse({ success: true, ...res }))
          .catch((err) => sendResponse({ success: false, contextLength: request.provider === 'ollama' ? 4096 : 8192, error: err.message }));
        return true;
      }

      if (request.action === 'APPLY_LOCAL_CONTEXT') {
        const prov = request.provider || 'lmstudio';
        const parsed = LocalContextManager.parseContextLength(request.contextLength);
        if (prov === 'ollama') {
          sendResponse({ success: true, provider: 'ollama', contextLength: parsed || 'auto', appliedOnNextRequest: true });
          return false;
        }
        if (!parsed) {
          sendResponse({ success: true, provider: prov, contextLength: 'auto', skipped: true });
          return false;
        }
        LocalContextManager.ensureLmStudioContext({
          serverUrl: request.serverUrl,
          model: request.model,
          apiKey: request.apiKey,
          contextLength: parsed
        })
          .then((res) => sendResponse({ success: Boolean(res?.applied), ...res }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
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

      if (request.action === 'FETCH_VIDEO_COMMENTS') {
        const { videoId, limit = 25 } = request;
        VideoCommentsFetcher.fetchVideoComments(videoId, limit)
          .then(res => sendResponse(res))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === 'FETCH_DOMAIN_AUDIT') {
        DomainAuditFetcher.collectDomainDossier(request)
          .then(dossier => sendResponse({ success: true, dossier }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === 'FETCH_CHANNEL_DOSSIER') {
        const { query, limit = 30 } = request;
        const resolveBrowseTabId = () => new Promise((resolve) => {
          if (sender?.tab?.id) return resolve(sender.tab.id);
          if (!chrome.tabs?.query) return resolve(null);
          chrome.tabs.query({ url: ['https://www.youtube.com/*', 'https://m.youtube.com/*'] }, (tabs) => {
            const active = (tabs || []).find((t) => t.active) || tabs?.[0];
            resolve(active?.id || null);
          });
        });
        resolveBrowseTabId().then((tabId) => {
          const sendProxy = (payload) => new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { action: 'PROXY_INNERTUBE_BROWSE', ...payload }, (res) => {
              if (chrome.runtime?.lastError || !res) return resolve({ ok: false, items: [] });
              resolve(res);
            });
          });
          const hasTabProxy = Boolean(tabId && chrome.tabs?.sendMessage);
          const browseFetcher = hasTabProxy ? (params) => sendProxy(params) : null;
          const pageFetcher = hasTabProxy ? (url) => sendProxy({ mode: 'html', url }) : null;
          return ChannelIntelligenceFetcher.fetchChannelDossier(query, limit, { browseFetcher, pageFetcher });
        })
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

      if (request.action === 'FETCH_BATCH_DOSSIERS') {
        const { videoIds = [], lang = 'fr', includeComments = true } = request;
        VideoDossierFetcher.fetchDossiersBatch(videoIds, lang, { includeComments })
          .then(map => {
            const obj = {};
            for (const [k, v] of map.entries()) obj[k] = v;
            sendResponse({ success: true, dossiers: obj });
          })
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === 'FETCH_SAFE_IMAGE') {
        BackgroundImageFetcher.fetchSafeJpeg(request.url)
          .then(res => sendResponse(res))
          .catch(err => sendResponse({ success: false, error: err?.message || 'Image fetch failed' }));
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
