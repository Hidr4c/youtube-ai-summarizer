import { InnerTubeParser } from '../parsers/InnerTubeParser.js';
import { SpeechRecognitionBridge } from './SpeechRecognitionBridge.js';
import { InnerTubeBridge } from './InnerTubeBridge.js';
import { BrowseContinuationFetcher } from './BrowseContinuationFetcher.js';
import { TimedtextTrackFetcher } from './TimedtextTrackFetcher.js';
import { CaptionTrackPrioritizer } from '../parsers/CaptionTrackPrioritizer.js';
import { PlayerElementHelper } from './PlayerElementHelper.js';

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
    this.lastNavResponse = null;
    const navHandler = (e) => {
      const resp = e.detail?.response?.playerResponse || e.detail?.playerResponse;
      if (resp) this.lastNavResponse = resp;
    };
    window.addEventListener("yt-navigate-finish", navHandler);
    window.addEventListener("yt-page-data-updated", navHandler);
    window.addEventListener('message', async (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === 'YT_AI_START_SPEECH') {
        this.speechBridge.start(event.data.lang || 'en-US');
        return;
      }

      if (event.data.type === 'YT_AI_STOP_SPEECH') {
        this.speechBridge.stop();
        return;
      }

      if (event.data.type === 'YT_AI_REQ_PLAYER_DATA') {
        const videoId = event.data.videoId || '';
        const preferredLang = event.data.preferredLang || 'en';
        await this.handlePlayerDataRequest(videoId, preferredLang);
        return;
      }

      if (event.data.type === 'YT_AI_REQ_BROWSE_CONTINUATION') {
        const result = await BrowseContinuationFetcher.fetchPage(event.data);
        window.postMessage({
          type: 'YT_AI_BROWSE_CONTINUATION_RESULT',
          requestId: event.data.requestId,
          ok: result.ok,
          status: result.status,
          items: result.items || [],
          ...(result.html !== undefined ? { html: result.html, url: result.url || '' } : {})
        }, '*');
        return;
      }

      if (event.data.type === 'YT_AI_REQUEST_TRANSCRIPT') {
        const videoId = event.data.videoId;
        const result = await this.extractTranscript(videoId, event.data.preferredLang || 'en');
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
   * Directly extracts transcript in-memory (backward compatible implementation)
   */
  async extractTranscript(requestedVideoId, preferredLang = 'en') {
    try {
      const playerResponse = this.resolvePlayerResponse(requestedVideoId);
      const captions = this.resolveCaptionTracks(playerResponse);
      let directSegments = null;

      if (captions && captions.length > 0) {
        const ordered = CaptionTrackPrioritizer.prioritizeTracks(captions, preferredLang);
        for (const track of ordered) {
          if (track?.baseUrl) {
            directSegments = await this.fetchTrackSegments(track.baseUrl, preferredLang);
            if (directSegments && directSegments.length > 0) break;
          }
        }
      }

      if (!directSegments || directSegments.length === 0) {
        const transcriptParams = this.findTranscriptParams(requestedVideoId);
        if (transcriptParams) {
          directSegments = await this.fetchTranscriptFromInnerTube(transcriptParams);
        }
      }

      if ((!directSegments || directSegments.length === 0) && requestedVideoId) {
        directSegments = await InnerTubeBridge.fetchTranscriptDirect(requestedVideoId, preferredLang);
      }

      if (!directSegments || directSegments.length === 0) {
        const initialVideoId = PlayerElementHelper.extractInitialDataVideoId(window.ytInitialData);
        if (!requestedVideoId || !initialVideoId || initialVideoId === requestedVideoId) {
          directSegments = InnerTubeParser.extractSegmentsFromInnerTubeJson(window.ytInitialData, { allowChapters: false });
        }
      }

      if (directSegments && directSegments.length > 0) {
        return {
          segments: directSegments,
          fullText: directSegments.map(s => s.text).join(' ')
        };
      }
      return null;
    } catch (e) {
      return { error: e.message };
    }
  }

  resolvePlayerResponse(requestedVideoId) {
    const player = PlayerElementHelper.resolvePlayerElement(requestedVideoId);
    try { player?.loadModule?.('captions'); } catch (_) {}
    if (player && typeof player.getPlayerResponse === 'function') {
      const resp = player.getPlayerResponse();
      const respId = resp?.videoDetails?.videoId;
      const dataId = player.getVideoData?.()?.video_id;
      if (!requestedVideoId) return resp;
      if (respId === requestedVideoId && (!dataId || dataId === requestedVideoId)) return resp;
      if (!respId && dataId === requestedVideoId && resp) return resp;
    }
    if (window.ytInitialPlayerResponse) {
      const initId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
      if (!requestedVideoId || (initId && initId === requestedVideoId)) return window.ytInitialPlayerResponse;
    }
    const containerData = PlayerElementHelper.resolveContainerPlayerData(requestedVideoId);
    if (containerData) return containerData;
    if (this.lastNavResponse?.videoDetails?.videoId === requestedVideoId) return this.lastNavResponse;
    return requestedVideoId ? null : (window.ytInitialPlayerResponse || null);
  }

  resolveCaptionTracks(playerResponse, requestedVideoId) {
    let captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!captions || captions.length === 0) {
      const player = PlayerElementHelper.resolvePlayerElement(requestedVideoId);
      try { player?.loadModule?.('captions'); } catch (_) {}
      const activeId = player?.getVideoData?.()?.video_id;
      const respId = player?.getPlayerResponse?.()?.videoDetails?.videoId;
      if (!requestedVideoId || (activeId === requestedVideoId && (!respId || respId === requestedVideoId))) {
        if (player && typeof player.getOption === 'function') {
          try {
            const pt = player.getOption('captions', 'tracklist');
            if (Array.isArray(pt) && pt.length > 0) captions = pt;
          } catch (_) {}
        }
      }
    }
    if ((!captions || captions.length === 0) && window.ytInitialPlayerResponse) {
      const initId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
      if (!requestedVideoId || (initId && initId === requestedVideoId)) {
        captions = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      }
    }
    return captions;
  }

  pickCaptionTrack(captions, preferredLang) {
    const list = CaptionTrackPrioritizer.prioritizeTracks(captions, preferredLang);
    return list[0] || null;
  }

  /**
   * Handles in-memory player data and transcript extraction
   */
  async handlePlayerDataRequest(requestedVideoId, preferredLang) {
    try {
      let playerResponse = null;
      let captions = [];
      for (let attempt = 0; attempt < 16; attempt++) {
        playerResponse = this.resolvePlayerResponse(requestedVideoId);
        captions = this.resolveCaptionTracks(playerResponse, requestedVideoId);
        if (captions && captions.length > 0) break;
        if (attempt === 2 && !playerResponse && requestedVideoId) {
          const fetched = await InnerTubeBridge.fetchPlayerResponse(requestedVideoId);
          if (fetched) {
            playerResponse = fetched;
            captions = this.resolveCaptionTracks(playerResponse, requestedVideoId);
            if ((captions && captions.length > 0) || playerResponse?.videoDetails?.videoId === requestedVideoId) break;
          }
        }
        await new Promise(r => setTimeout(r, 120));
      }

      const player = PlayerElementHelper.resolvePlayerElement(requestedVideoId);
      const activeId = player?.getVideoData?.()?.video_id || '';
      if (requestedVideoId && activeId && activeId !== requestedVideoId && !playerResponse) {
        window.postMessage({
          type: 'YT_AI_RES_PLAYER_DATA',
          success: false,
          error: 'Video ID mismatch during transition',
          videoId: requestedVideoId,
          captions: [],
          segments: null
        }, '*');
        return;
      }
      const isInitialMatch = (!requestedVideoId || window.ytInitialPlayerResponse?.videoDetails?.videoId === requestedVideoId);
      const videoDetails = playerResponse?.videoDetails || (isInitialMatch ? window.ytInitialPlayerResponse?.videoDetails : {}) || {};

      let directSegments = null;
      if (captions && captions.length > 0) {
        const ordered = CaptionTrackPrioritizer.prioritizeTracks(captions, preferredLang);
        for (const track of ordered) {
          if (track?.baseUrl) {
            directSegments = await this.fetchTrackSegments(track.baseUrl, preferredLang);
            if (directSegments && directSegments.length > 0) break;
          }
        }
      }

      if (!directSegments || directSegments.length === 0) {
        const transcriptParams = this.findTranscriptParams(requestedVideoId || activeId);
        if (transcriptParams) {
          directSegments = await this.fetchTranscriptFromInnerTube(transcriptParams);
        }
      }

      const targetId = requestedVideoId || activeId;
      if ((!directSegments || directSegments.length === 0) && targetId) {
        directSegments = await InnerTubeBridge.fetchTranscriptDirect(targetId, preferredLang);
      }

      if (!directSegments || directSegments.length === 0) {
        const initialVideoId = PlayerElementHelper.extractInitialDataVideoId(window.ytInitialData);
        if (!requestedVideoId || initialVideoId === requestedVideoId) {
          directSegments = InnerTubeParser.extractSegmentsFromInnerTubeJson(window.ytInitialData, { allowChapters: false });
        }
      }

      const microformat = playerResponse?.microformat?.playerMicroformatRenderer ||
        (isInitialMatch ? window.ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer : {}) || {};

      const description = videoDetails.shortDescription || microformat.description?.simpleText || '';
      const keywords = Array.isArray(videoDetails.keywords) ? videoDetails.keywords : [];
      const category = microformat.category || '';
      const publishDate = microformat.publishDate || microformat.uploadDate || '';
      const viewCount = videoDetails.viewCount || microformat.viewCount || '';
      const channelId = videoDetails.channelId || microformat.externalChannelId || '';
      const channelUrl = microformat.ownerProfileUrl || (channelId ? `https://www.youtube.com/channel/${channelId}` : '');

      window.postMessage({
        type: 'YT_AI_RES_PLAYER_DATA',
        success: true,
        hasCaptions: (directSegments && directSegments.length > 0) || (captions && captions.length > 0),
        segments: directSegments || null,
        captions: JSON.parse(JSON.stringify(captions || [])),
        title: videoDetails.title || document.title.replace(' - YouTube', '').trim(),
        author: videoDetails.author || microformat.ownerChannelName || '',
        videoId: requestedVideoId || videoDetails.videoId || activeId,
        channelId,
        channelUrl,
        description,
        keywords,
        category,
        publishDate,
        viewCount
      }, '*');
    } catch (err) {
      window.postMessage({
        type: 'YT_AI_RES_PLAYER_DATA',
        success: false,
        videoId: requestedVideoId || '',
        error: err.message,
        captions: [],
        segments: null
      }, '*');
    }
  }

  async fetchTrackSegments(baseUrl, preferredLang = null) {
    return TimedtextTrackFetcher.fetchTrackSegments(baseUrl, preferredLang);
  }

  findTranscriptParams(requestedVideoId) {
    return InnerTubeBridge.findTranscriptParams(requestedVideoId);
  }

  async fetchTranscriptFromInnerTube(paramObj) {
    return InnerTubeBridge.fetchTranscript(paramObj);
  }
}

export default YouTubeContextExtractor;
