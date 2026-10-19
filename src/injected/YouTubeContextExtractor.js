import { InnerTubeParser } from '../parsers/InnerTubeParser.js';
import { SpeechRecognitionBridge } from './SpeechRecognitionBridge.js';
import { InnerTubeBridge } from './InnerTubeBridge.js';
import { TimedtextTrackFetcher } from './TimedtextTrackFetcher.js';

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
        const track = this.pickCaptionTrack(captions, preferredLang);
        if (track?.baseUrl) {
          directSegments = await this.fetchTrackSegments(track.baseUrl);
        }
      }

      if (!directSegments || directSegments.length === 0) {
        const transcriptParams = this.findTranscriptParams(requestedVideoId);
        if (transcriptParams) {
          directSegments = await this.fetchTranscriptFromInnerTube(transcriptParams);
        }
      }

      if (!directSegments || directSegments.length === 0) {
        directSegments = InnerTubeParser.extractSegmentsFromInnerTubeJson(window.ytInitialData, { allowChapters: false });
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
    let player = document.getElementById('movie_player');
    try { player?.loadModule?.('captions'); } catch (_) {}
    if (player && typeof player.getPlayerResponse === 'function') {
      const resp = player.getPlayerResponse();
      const activeId = player.getVideoData?.()?.video_id || resp?.videoDetails?.videoId;
      if (!requestedVideoId || activeId === requestedVideoId) return resp;
    }
    if (window.ytInitialPlayerResponse) {
      const initId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
      if (!requestedVideoId || initId === requestedVideoId) return window.ytInitialPlayerResponse;
    }
    const flexy = document.querySelector('ytd-watch-flexy');
    const flexyData = flexy?.playerData || flexy?.data;
    if (flexyData) {
      const fId = flexyData?.videoDetails?.videoId;
      if (!requestedVideoId || fId === requestedVideoId) return flexyData;
    }
    return window.ytInitialPlayerResponse || null;
  }

  resolveCaptionTracks(playerResponse) {
    let captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
                   window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if ((!captions || captions.length === 0)) {
      const player = document.getElementById('movie_player');
      if (player && typeof player.getOption === 'function') {
        try {
          const pt = player.getOption('captions', 'tracklist');
          if (Array.isArray(pt) && pt.length > 0) captions = pt;
        } catch (_) {}
      }
    }
    if ((!captions || captions.length === 0) && window.ytplayer?.config?.args?.raw_player_response) {
      try {
        const raw = typeof window.ytplayer.config.args.raw_player_response === 'string'
          ? JSON.parse(window.ytplayer.config.args.raw_player_response)
          : window.ytplayer.config.args.raw_player_response;
        const rawTracks = raw?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(rawTracks) && rawTracks.length > 0) captions = rawTracks;
      } catch (_) {}
    }
    return captions;
  }

  pickCaptionTrack(captions, preferredLang) {
    let track = captions.find(t => t.languageCode === preferredLang);
    if (!track) track = captions.find(t => t.languageCode?.startsWith(preferredLang));
    if (!track) track = captions.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
    return track || captions[0] || null;
  }

  /**
   * Handles in-memory player data and transcript extraction
   */
  async handlePlayerDataRequest(requestedVideoId, preferredLang) {
    try {
      let playerResponse = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        playerResponse = this.resolvePlayerResponse(requestedVideoId);
        if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
        await new Promise(r => setTimeout(r, 100));
      }

      const player = document.getElementById('movie_player');
      const activeId = player?.getVideoData?.()?.video_id || '';
      const captions = this.resolveCaptionTracks(playerResponse);
      const videoDetails = playerResponse?.videoDetails || window.ytInitialPlayerResponse?.videoDetails || {};

      let directSegments = null;
      if (captions && captions.length > 0) {
        const track = this.pickCaptionTrack(captions, preferredLang);
        if (track?.baseUrl) {
          directSegments = await this.fetchTrackSegments(track.baseUrl);
        }
      }

      if (!directSegments || directSegments.length === 0) {
        const transcriptParams = this.findTranscriptParams(requestedVideoId || activeId);
        if (transcriptParams) {
          directSegments = await this.fetchTranscriptFromInnerTube(transcriptParams);
        }
      }

      if (!directSegments || directSegments.length === 0) {
        directSegments = InnerTubeParser.extractSegmentsFromInnerTubeJson(window.ytInitialData, { allowChapters: false });
      }

      const microformat = playerResponse?.microformat?.playerMicroformatRenderer ||
                          window.ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer || {};

      const description = videoDetails.shortDescription || microformat.description?.simpleText || '';
      const keywords = Array.isArray(videoDetails.keywords) ? videoDetails.keywords : [];
      const category = microformat.category || '';
      const publishDate = microformat.publishDate || microformat.uploadDate || '';
      const viewCount = videoDetails.viewCount || microformat.viewCount || '';
      const channelId = videoDetails.channelId || microformat.externalChannelId || '';

      window.postMessage({
        type: 'YT_AI_RES_PLAYER_DATA',
        success: true,
        hasCaptions: (directSegments && directSegments.length > 0) || (captions && captions.length > 0),
        segments: directSegments || null,
        captions: JSON.parse(JSON.stringify(captions || [])),
        title: videoDetails.title || document.title.replace(' - YouTube', '').trim(),
        author: videoDetails.author || microformat.ownerChannelName || '',
        videoId: videoDetails.videoId || requestedVideoId || activeId,
        channelId,
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
        error: err.message,
        captions: [],
        segments: null
      }, '*');
    }
  }

  async fetchTrackSegments(baseUrl) {
    return TimedtextTrackFetcher.fetchTrackSegments(baseUrl);
  }

  findTranscriptParams(requestedVideoId) {
    return InnerTubeBridge.findTranscriptParams(requestedVideoId);
  }

  async fetchTranscriptFromInnerTube(paramObj) {
    return InnerTubeBridge.fetchTranscript(paramObj);
  }
}

export default YouTubeContextExtractor;
