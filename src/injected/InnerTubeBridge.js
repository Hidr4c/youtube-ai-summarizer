import { InnerTubeParser } from '../parsers/InnerTubeParser.js';
import { TimedtextTrackFetcher } from './TimedtextTrackFetcher.js';

/**
 * Bridge for YouTube InnerTube API and parameter discovery in Main World memory
 */
export class InnerTubeBridge {
  /**
   * Finds transcript params in YouTube memory structures
   * @param {string} [requestedVideoId]
   * @returns {{ type: string, params?: string, continuation?: string } | null}
   */
  /**
   * Encodes variable integer according to protobuf specifications
   * @param {number} val
   * @returns {number[]}
   */
  static encodeVarint(val) {
    const bytes = [];
    let v = val;
    while (v > 127) {
      bytes.push((v & 127) | 128);
      v >>>= 7;
    }
    bytes.push(v & 127);
    return bytes;
  }

  /**
   * Encodes a length-delimited protobuf field (string or byte array)
   * @param {number} fieldNumber
   * @param {string|number[]} strOrBytes
   * @returns {number[]}
   */
  static encodeField(fieldNumber, strOrBytes) {
    const bytes = typeof strOrBytes === "string"
      ? Array.from(new TextEncoder().encode(strOrBytes))
      : strOrBytes;
    const tag = (fieldNumber << 3) | 2;
    return [...InnerTubeBridge.encodeVarint(tag), ...InnerTubeBridge.encodeVarint(bytes.length), ...bytes];
  }

  /**
   * Synthesizes valid protobuf params string for InnerTube get_transcript API
   * @param {string} videoId
   * @param {string} [lang=""]
   * @param {string} [kind="asr"]
   * @returns {string|null}
   */
  static generateTranscriptParams(videoId, lang = "", kind = "asr") {
    if (!videoId) return null;
    const inner = [];
    if (kind) inner.push(...InnerTubeBridge.encodeField(1, kind));
    if (lang) inner.push(...InnerTubeBridge.encodeField(2, lang));

    const outer = [
      ...InnerTubeBridge.encodeField(1, videoId),
      ...(inner.length > 0 ? InnerTubeBridge.encodeField(2, inner) : [])
    ];
    let binary = "";
    for (let i = 0; i < outer.length; i++) binary += String.fromCharCode(outer[i]);
    return btoa(binary);
  }

  static searchParamsInObject(obj, depth = 0) {
    if (!obj || depth > 10 || typeof obj !== 'object') return null;

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
        const res = InnerTubeBridge.searchParamsInObject(val, depth + 1);
        if (res) return res;
      }
    }
    return null;
  }

  static findTranscriptParams(requestedVideoId) {
    try {
      const flexy = document.querySelector('ytd-watch-flexy');
      const flexyData = flexy?.data || flexy?.playerData;
      if (flexyData) {
        const p = InnerTubeBridge.searchParamsInObject(flexyData);
        if (p) return p;
      }

      const grid = document.querySelector('ytd-watch-grid');
      const gridData = grid?.data || grid?.playerData;
      if (gridData) {
        const p = InnerTubeBridge.searchParamsInObject(gridData);
        if (p) return p;
      }

      if (window.ytInitialData) {
        const p = InnerTubeBridge.searchParamsInObject(window.ytInitialData);
        if (p) return p;
      }

      if (window.ytInitialPlayerResponse) {
        const p = InnerTubeBridge.searchParamsInObject(window.ytInitialPlayerResponse);
        if (p) return p;
      }
    } catch (_) {}
    return null;
  }

  static async fetchNextParams(videoId) {
    if (!videoId) return null;
    try {
      const apiKey = window.ytcfg?.get?.('INNERTUBE_API_KEY');
      const context = window.ytcfg?.get?.('INNERTUBE_CONTEXT');
      if (!apiKey || !context) return null;

      const res = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': String(window.ytcfg?.get?.('INNERTUBE_CLIENT_NAME') || '1'),
          'X-YouTube-Client-Version': String(window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '')
        },
        body: JSON.stringify({ context, videoId }),
        credentials: 'include'
      }).catch(() => null);

      if (!res || !res.ok) return null;
      const json = await res.json().catch(() => null);
      return InnerTubeBridge.searchParamsInObject(json);
    } catch (_) {
      return null;
    }
  }

  static async fetchPlayerResponse(videoId) {
    if (!videoId) return null;
    try {
      const apiKey = window.ytcfg?.get?.('INNERTUBE_API_KEY');
      const context = window.ytcfg?.get?.('INNERTUBE_CONTEXT');
      if (!apiKey || !context) return null;

      const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': String(window.ytcfg?.get?.('INNERTUBE_CLIENT_NAME') || '1'),
          'X-YouTube-Client-Version': String(window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '')
        },
        body: JSON.stringify({ context, videoId }),
        credentials: 'include'
      }).catch(() => null);

      if (!res || !res.ok) return null;
      return await res.json().catch(() => null);
    } catch (_) {
      return null;
    }
  }

  static async fetchTranscriptDirect(videoId, preferredLang = 'fr') {
    if (!videoId) return null;

    // 1. Découverte via Next endpoint -> engagementPanels -> getTranscriptEndpoint.params
    const nextParams = await InnerTubeBridge.fetchNextParams(videoId);
    if (nextParams) {
      const segs = await InnerTubeBridge.fetchTranscript(nextParams);
      if (segs && segs.length > 0) return segs;
    }

    // 2. Découverte via Player endpoint -> captionTracks signées -> timedtext
    const playerJson = await InnerTubeBridge.fetchPlayerResponse(videoId);
    const tracks = playerJson?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks) && tracks.length > 0) {
      let track = tracks.find(t => t.languageCode === preferredLang) ||
                  tracks.find(t => t.languageCode?.startsWith(preferredLang)) ||
                  tracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
                  tracks[0];
      if (track?.baseUrl) {
        const segs = await TimedtextTrackFetcher.fetchTrackSegments(track.baseUrl);
        if (segs && segs.length > 0) return segs;
      }
    }
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

      let urls = [];
      let bodyData = { context };

      if (typeof paramObj === 'string' || (paramObj.type === 'get_transcript' && paramObj.params)) {
        bodyData.params = typeof paramObj === 'string' ? paramObj : paramObj.params;
        urls = [
          'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false',
          `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`
        ];
      } else if (paramObj.type === 'browse_continuation' && paramObj.continuation) {
        bodyData.continuation = paramObj.continuation;
        urls = [`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`];
      } else {
        clearTimeout(timer);
        return null;
      }

      let res = null;
      for (const url of urls) {
        res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyData),
          credentials: 'include',
          signal: controller.signal
        }).catch(() => null);
        if (res && res.ok) break;
      }
      clearTimeout(timer);

      if (!res || !res.ok) return null;
      const json = await res.json().catch(() => null);
      return InnerTubeParser.extractSegmentsFromInnerTubeJson(json, { allowChapters: false });
    } catch (_) {}
    return null;
  }
}

export default InnerTubeBridge;
