import { InnerTubeParser } from '../parsers/InnerTubeParser.js';
import { TimedtextTrackFetcher } from './TimedtextTrackFetcher.js';
import { ProtobufHelper } from './ProtobufHelper.js';

/**
 * Bridge for YouTube InnerTube API and parameter discovery in Main World memory
 */
export class InnerTubeBridge {
  static _youtubeOrigin() {
    if (typeof window !== 'undefined' && window.location?.origin?.includes('youtube.com')) {
      return window.location.origin;
    }
    return 'https://www.youtube.com';
  }

  static encodeVarint(val) {
    return ProtobufHelper.encodeVarint(val);
  }

  static encodeField(fieldNumber, strOrBytes) {
    return ProtobufHelper.encodeField(fieldNumber, strOrBytes);
  }

  static generateTranscriptParams(videoId, lang = "", kind = "asr") {
    return ProtobufHelper.generateTranscriptParams(videoId, lang, kind);
  }

  static generateModernTranscriptPanelParams(videoId) {
    return ProtobufHelper.generateModernTranscriptPanelParams(videoId);
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

  static _matchesRequestedVideo(data, requestedVideoId, el = null) {
    if (!data) return false;
    if (!requestedVideoId) return true;
    const foundId = data?.videoDetails?.videoId
      || data?.playerResponse?.videoDetails?.videoId
      || data?.currentVideoEndpoint?.watchEndpoint?.videoId
      || data?.currentVideoEndpoint?.reelWatchEndpoint?.videoId
      || data?.endpoint?.reelWatchEndpoint?.videoId
      || data?.endpoint?.watchEndpoint?.videoId
      || el?.getAttribute?.('video-id')
      || '';
    return Boolean(foundId && foundId === requestedVideoId);
  }

  static findTranscriptParams(requestedVideoId) {
    try {
      const isShorts = typeof window !== 'undefined' && (window.location?.pathname || '').startsWith('/shorts/');
      const watchEl = document.querySelector('ytd-reel-video-renderer[is-active], ytm-reel-video-renderer[is-active]')
        || document.querySelector('ytd-shorts:not([hidden]), ytm-shorts:not([hidden])')
        || (!isShorts ? document.querySelector('ytd-watch-flexy:not([hidden]), ytd-watch-grid:not([hidden]), ytm-watch:not([hidden])') : null);
      const watchData = watchEl?.data || watchEl?.playerData;
      if (watchData && InnerTubeBridge._matchesRequestedVideo(watchData, requestedVideoId, watchEl)) {
        const p = InnerTubeBridge.searchParamsInObject(watchData);
        if (p) return p;
      }

      if (window.ytInitialData && InnerTubeBridge._matchesRequestedVideo(window.ytInitialData, requestedVideoId)) {
        const p = InnerTubeBridge.searchParamsInObject(window.ytInitialData);
        if (p) return p;
      }

      if (window.ytInitialPlayerResponse && InnerTubeBridge._matchesRequestedVideo(window.ytInitialPlayerResponse, requestedVideoId)) {
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

      const origin = InnerTubeBridge._youtubeOrigin();
      const res = await fetch(`${origin}/youtubei/v1/next?key=${apiKey}`, {
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

      const origin = InnerTubeBridge._youtubeOrigin();
      const res = await fetch(`${origin}/youtubei/v1/player?key=${apiKey}`, {
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
      if (videoId && json?.videoDetails?.videoId && json.videoDetails.videoId !== videoId) return null;
      return json;
    } catch (_) {
      return null;
    }
  }

  static async fetchModernTranscriptPanel(videoId) {
    if (!videoId) return null;
    try {
      const context = window.ytcfg?.get?.('INNERTUBE_CONTEXT');
      if (!context) return null;

      const clientName = String(window.ytcfg?.get?.('INNERTUBE_CLIENT_NAME') || '1');
      const clientVersion = String(window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '');
      const params = InnerTubeBridge.generateModernTranscriptPanelParams(videoId);
      if (!params) return null;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const origin = InnerTubeBridge._youtubeOrigin();
      const res = await fetch(`${origin}/youtubei/v1/get_panel?prettyPrint=false`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': clientName,
          'X-YouTube-Client-Version': clientVersion
        },
        body: JSON.stringify({
          context,
          panelId: 'PAmodern_transcript_view',
          params
        }),
        credentials: 'include',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timer);
      if (!res || !res.ok) return null;

      const json = await res.json().catch(() => null);
      return InnerTubeParser.extractSegmentsFromInnerTubeJson(json, { allowChapters: false });
    } catch (_) {
      return null;
    }
  }

  static async fetchTranscriptDirect(videoId, preferredLang = 'fr') {
    if (!videoId) return null;

    // 1. Priorité absolue : Modern InnerTube get_panel (PAmodern_transcript_view)
    const modernSegments = await InnerTubeBridge.fetchModernTranscriptPanel(videoId);
    if (modernSegments && modernSegments.length > 0) return modernSegments;

    // 2. Découverte via Next endpoint -> engagementPanels -> getTranscriptEndpoint.params
    const nextParams = await InnerTubeBridge.fetchNextParams(videoId);
    if (nextParams) {
      const segs = await InnerTubeBridge.fetchTranscript(nextParams);
      if (segs && segs.length > 0) return segs;
    }

    // 3. Découverte via Player endpoint -> captionTracks signées -> timedtext
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

      const origin = InnerTubeBridge._youtubeOrigin();
      if (typeof paramObj === 'string' || (paramObj.type === 'get_transcript' && paramObj.params)) {
        bodyData.params = typeof paramObj === 'string' ? paramObj : paramObj.params;
        urls = [
          `${origin}/youtubei/v1/get_transcript?prettyPrint=false`,
          `${origin}/youtubei/v1/get_transcript?key=${apiKey}`
        ];
      } else if (paramObj.type === 'browse_continuation' && paramObj.continuation) {
        bodyData.continuation = paramObj.continuation;
        urls = [`${origin}/youtubei/v1/browse?key=${apiKey}`];
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
