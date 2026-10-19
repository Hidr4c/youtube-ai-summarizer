import { InnerTubeParser } from '../parsers/InnerTubeParser.js';

/**
 * Bridge for YouTube InnerTube API and parameter discovery in Main World memory
 */
export class InnerTubeBridge {
  /**
   * Finds transcript params in YouTube memory structures
   * @param {string} [requestedVideoId]
   * @returns {{ type: string, params?: string, continuation?: string } | null}
   */
  static findTranscriptParams(requestedVideoId) {
    try {
      function searchParams(obj, depth = 0) {
        if (!obj || depth > 10) return null;
        if (typeof obj !== 'object') return null;

        if (obj.getTranscriptEndpoint && typeof obj.getTranscriptEndpoint.params === 'string') {
          return { type: 'get_transcript', params: obj.getTranscriptEndpoint.params };
        }

        if (obj.getTranscriptCommand && typeof obj.getTranscriptCommand.params === 'string') {
          return { type: 'get_transcript', params: obj.getTranscriptCommand.params };
        }

        if (obj.targetId === 'engagement-panel-searchable-transcript' && obj.continuation && typeof obj.continuation === 'string') {
          return { type: 'browse_continuation', continuation: obj.continuation };
        }

        const keys = Array.isArray(obj) ? null : Object.keys(obj);
        const list = keys || obj;
        for (let i = 0; i < list.length; i++) {
          const k = keys ? keys[i] : i;
          if (k === 'polymerController' || k === '__shady' || k === 'host' || k === '__events') continue;
          const val = obj[k];
          if (val && typeof val === 'object') {
            const res = searchParams(val, depth + 1);
            if (res) return res;
          }
        }
        return null;
      }

      const flexy = document.querySelector('ytd-watch-flexy');
      const flexyData = flexy?.data || flexy?.playerData;
      if (flexyData) {
        const p = searchParams(flexyData);
        if (p) return p;
      }

      const grid = document.querySelector('ytd-watch-grid');
      const gridData = grid?.data || grid?.playerData;
      if (gridData) {
        const p = searchParams(gridData);
        if (p) return p;
      }

      if (window.ytInitialData) {
        const p = searchParams(window.ytInitialData);
        if (p) return p;
      }

      if (window.ytInitialPlayerResponse) {
        const p = searchParams(window.ytInitialPlayerResponse);
        if (p) return p;
      }
    } catch (_) {}
    return null;
  }

  /**
   * Fetches transcript via YouTube InnerTube API 100% in background
   * @param {Object|string} paramObj
   * @returns {Promise<Array<Object>|null>}
   */
  static async fetchTranscript(paramObj) {
    if (!paramObj) return null;
    try {
      const apiKey = window.ytcfg?.get?.('INNERTUBE_API_KEY');
      const context = window.ytcfg?.get?.('INNERTUBE_CONTEXT');
      if (!apiKey || !context) return null;

      const clientName = String(window.ytcfg?.get?.('INNERTUBE_CLIENT_NAME') || '1');
      const clientVersion = String(window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '');
      const visitorData = String(window.ytcfg?.get?.('VISITOR_DATA') || '');

      const headers = {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': clientName
      };
      if (clientVersion) headers['X-YouTube-Client-Version'] = clientVersion;
      if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      let url = '';
      let bodyData = { context };

      if (typeof paramObj === 'string') {
        url = `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`;
        bodyData.params = paramObj;
      } else if (paramObj.type === 'get_transcript' && paramObj.params) {
        url = `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`;
        bodyData.params = paramObj.params;
      } else if (paramObj.type === 'browse_continuation' && paramObj.continuation) {
        url = `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`;
        bodyData.continuation = paramObj.continuation;
      } else {
        clearTimeout(timer);
        return null;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
        credentials: 'include',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timer);

      if (!res || !res.ok) return null;
      const json = await res.json().catch(() => null);
      return InnerTubeParser.extractSegmentsFromInnerTubeJson(json, { allowChapters: false });
    } catch (_) {}
    return null;
  }
}

export default InnerTubeBridge;
