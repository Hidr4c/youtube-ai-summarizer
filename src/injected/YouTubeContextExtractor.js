import { InnerTubeParser } from '../parsers/InnerTubeParser.js';
import { TimedtextParser } from '../parsers/TimedtextParser.js';
import { SpeechRecognitionBridge } from './SpeechRecognitionBridge.js';

/**
 * YouTube Main World context extractor
 * Runs directly in the page's execution context to access window.ytInitialPlayerResponse,
 * movie_player, and InnerTube get_transcript API 100% in memory with ZERO DOM interference.
 */
export class YouTubeContextExtractor {
  constructor() {
    this.speechBridge = new SpeechRecognitionBridge();
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('message', async (event) => {
      if (event.source !== window || !event.data) return;

      // 1. Microphone speech recognition handling in Main World
      if (event.data.type === 'YT_AI_START_SPEECH') {
        this.speechBridge.start(event.data.lang || 'en-US');
        return;
      }

      if (event.data.type === 'YT_AI_STOP_SPEECH') {
        this.speechBridge.stop();
        return;
      }

      // 2. Player data & transcript request (Primary flow)
      if (event.data.type === 'YT_AI_REQ_PLAYER_DATA') {
        const videoId = event.data.videoId || '';
        const preferredLang = event.data.preferredLang || 'en';
        await this.handlePlayerDataRequest(videoId, preferredLang);
        return;
      }

      // 3. Backward compatible legacy transcript request
      if (event.data.type === 'YT_AI_REQUEST_TRANSCRIPT') {
        const videoId = event.data.videoId;
        const result = await this.extractTranscript(videoId);
        window.postMessage({
          type: 'YT_AI_TRANSCRIPT_RESULT',
          videoId,
          segments: result?.segments || null,
          fullText: result?.fullText || null,
          error: result?.error || null
        }, '*');
      }
    });
  }

  /**
   * Handles in-memory player data and transcript extraction
   */
  async handlePlayerDataRequest(requestedVideoId, preferredLang) {
    try {
      let playerResponse = null;
      let player = document.getElementById('movie_player');
      try { player?.loadModule?.('captions'); } catch (_) {}

      // Wait up to 5 attempts (500ms total) for player response to match current video ID
      for (let attempt = 0; attempt < 5; attempt++) {
        player = document.getElementById('movie_player');
        if (player && typeof player.getPlayerResponse === 'function') {
          const resp = player.getPlayerResponse();
          const activeId = player.getVideoData?.()?.video_id || resp?.videoDetails?.videoId;
          if (!requestedVideoId || activeId === requestedVideoId) {
            playerResponse = resp;
            if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
          }
        }

        if (window.ytInitialPlayerResponse) {
          const initId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
          if (!requestedVideoId || initId === requestedVideoId) {
            if (!playerResponse || (!playerResponse.captions && window.ytInitialPlayerResponse.captions)) {
              playerResponse = window.ytInitialPlayerResponse;
              if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
            }
          }
        }

        const flexy = document.querySelector('ytd-watch-flexy');
        const flexyData = flexy?.playerData || flexy?.data;
        if (flexyData) {
          const fId = flexyData?.videoDetails?.videoId;
          if (!requestedVideoId || fId === requestedVideoId) {
            if (!playerResponse || (!playerResponse.captions && flexyData.captions)) {
              playerResponse = flexyData;
              if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
            }
          }
        }

        const grid = document.querySelector('ytd-watch-grid');
        const gridData = grid?.playerData || grid?.data;
        if (gridData) {
          const gId = gridData?.videoDetails?.videoId;
          if (!requestedVideoId || gId === requestedVideoId) {
            if (!playerResponse || (!playerResponse.captions && gridData.captions)) {
              playerResponse = gridData;
              if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
            }
          }
        }

        await new Promise(r => setTimeout(r, 100));
      }

      let activeId = '';
      if (player && typeof player.getVideoData === 'function') {
        activeId = player.getVideoData()?.video_id || '';
      }

      if (!playerResponse) {
        player = document.getElementById('movie_player');
        playerResponse = (player && typeof player.getPlayerResponse === 'function')
          ? player.getPlayerResponse()
          : window.ytInitialPlayerResponse;
      }

      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
                       window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
                       [];

      const videoDetails = playerResponse?.videoDetails || window.ytInitialPlayerResponse?.videoDetails || {};

      // 100% in-memory timedtext extraction
      let directSegments = null;
      if (captions && captions.length > 0) {
        let track = captions.find(t => t.languageCode === preferredLang);
        if (!track) track = captions.find(t => t.languageCode?.startsWith(preferredLang));
        if (!track) track = captions.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
        if (!track) track = captions[0];

        if (track && track.baseUrl) {
          directSegments = await this.fetchTrackSegments(track.baseUrl);
        }
      }

      // 100% in-memory InnerTube API fallback if timedtext was empty
      if (!directSegments || directSegments.length === 0) {
        const transcriptParams = this.findTranscriptParams(requestedVideoId || activeId);
        if (transcriptParams) {
          directSegments = await this.fetchTranscriptFromInnerTube(transcriptParams);
        }
      }

      // Initial data fallback
      if (!directSegments || directSegments.length === 0) {
        directSegments = InnerTubeParser.extractSegmentsFromInnerTubeJson(window.ytInitialData);
      }

      window.postMessage({
        type: 'YT_AI_RES_PLAYER_DATA',
        success: true,
        hasCaptions: (directSegments && directSegments.length > 0) || (captions && captions.length > 0),
        segments: directSegments || null,
        captions: JSON.parse(JSON.stringify(captions || [])),
        title: videoDetails.title || document.title.replace(' - YouTube', '').trim(),
        author: videoDetails.author || '',
        videoId: videoDetails.videoId || requestedVideoId || activeId
      }, '*');

    } catch (err) {
      window.postMessage({
        type: 'YT_AI_RES_PLAYER_DATA',
        success: false,
        error: err.message,
        captions: [],
        segments: null
      }, '*');
    }
  }

  /**
   * Fetches timedtext segments in memory
   */
  async fetchTrackSegments(baseUrl) {
    if (!baseUrl) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const jsonUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const res = await fetch(jsonUrl, { credentials: 'include', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.text();
        if (raw && raw.trim().startsWith('{')) {
          const json = JSON.parse(raw);
          const segs = TimedtextParser.parseTimedtextEvents(json?.events);
          if (segs && segs.length > 3) return segs;
        }
      }
    } catch (_) {}

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(baseUrl, { credentials: 'include', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.text();
        if (raw && raw.trim().startsWith('{')) {
          const json = JSON.parse(raw);
          const segs = TimedtextParser.parseTimedtextEvents(json?.events);
          if (segs && segs.length > 3) return segs;
        } else if (raw && (raw.includes('<transcript') || raw.includes('<tt') || raw.includes('<text'))) {
          const segs = TimedtextParser.parseTimedtextXml(raw);
          if (segs && segs.length > 3) return segs;
        }
      }
    } catch (_) {}

    return null;
  }

  /**
   * Finds transcript params in YouTube memory structures
   */
  findTranscriptParams(requestedVideoId) {
    try {
      function searchParams(obj, depth = 0) {
        if (!obj || depth > 10) return null;
        if (typeof obj !== 'object') return null;

        if (obj.getTranscriptEndpoint && typeof obj.getTranscriptEndpoint.params === 'string') {
          return obj.getTranscriptEndpoint.params;
        }

        if (obj.getTranscriptCommand && typeof obj.getTranscriptCommand.params === 'string') {
          return obj.getTranscriptCommand.params;
        }

        if (obj.targetId === 'engagement-panel-searchable-transcript' && obj.continuation && typeof obj.continuation === 'string') {
          return obj.continuation;
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
   */
  async fetchTranscriptFromInnerTube(params) {
    if (!params) return null;
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

      const res = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ context, params }),
        credentials: 'include',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timer);

      if (!res || !res.ok) return null;
      const json = await res.json().catch(() => null);
      return InnerTubeParser.extractSegmentsFromInnerTubeJson(json);
    } catch (_) {}
  }
}

export default YouTubeContextExtractor;
