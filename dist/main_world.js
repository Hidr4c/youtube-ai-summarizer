(() => {
  // src/parsers/TextCleaner.js
  var TextCleaner = class {
    /**
     * Cleans HTML entities and excessive whitespace from subtitle text
     * @param {string} text
     * @returns {string}
     */
    static cleanTranscriptText(text) {
      if (!text || typeof text !== "string") return "";
      return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code)).replace(/&#x2F;/g, "/").replace(/&nbsp;/g, " ").replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
    }
  };

  // src/parsers/InnerTubeParser.js
  var InnerTubeParser = class {
    /**
     * Formats milliseconds into m:ss
     * @param {number} ms
     * @returns {string}
     */
    static formatMs(ms) {
      const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1e3));
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    /**
     * Extracts transcript segments from any InnerTube JSON response
     * @param {Object} json
     * @returns {Array<{timestamp: string, text: string}>|null}
     */
    static extractSegmentsFromInnerTubeJson(json) {
      if (!json || typeof json !== "object") return null;
      const segments = [];
      const seen = /* @__PURE__ */ new Set();
      function walk(node, depth = 0) {
        if (!node || depth > 14) return;
        if (typeof node !== "object") return;
        const seg = node.transcriptSegmentRenderer;
        if (seg) {
          const time = seg.startTimeText?.simpleText || (seg.startTimeText?.runs || []).map((r) => r.text || "").join("");
          const text = (seg.snippet?.runs || []).map((r) => r.text || "").join("") || seg.snippet?.simpleText || "";
          if (time && text) {
            const cleaned = TextCleaner.cleanTranscriptText(text);
            const key = `${time}|${cleaned.slice(0, 30)}`;
            if (!seen.has(key)) {
              seen.add(key);
              segments.push({ timestamp: time.trim(), text: cleaned });
            }
          }
        }
        const vm = node.transcriptSegmentViewModel;
        if (vm) {
          const time = vm.startTimeText?.content || (typeof vm.startTimeText === "string" ? vm.startTimeText : "");
          let text = "";
          if (vm.snippet) {
            text = vm.snippet.content || (vm.snippet.runs || []).map((r) => r.text || "").join("") || (typeof vm.snippet === "string" ? vm.snippet : "");
          }
          if (time && text) {
            const cleaned = TextCleaner.cleanTranscriptText(text);
            const key = `${time}|${cleaned.slice(0, 30)}`;
            if (!seen.has(key)) {
              seen.add(key);
              segments.push({ timestamp: time.trim(), text: cleaned });
            }
          }
        }
        const macro = node.macroMarkersListItemRenderer;
        if (macro) {
          const time = macro.timeDescription?.simpleText || (macro.timeDescription?.runs || []).map((r) => r.text || "").join("");
          const title = macro.title?.simpleText || (macro.title?.runs || []).map((r) => r.text || "").join("");
          if (time && title) {
            const cleaned = TextCleaner.cleanTranscriptText(title);
            const key = `${time}|${cleaned.slice(0, 30)}`;
            if (!seen.has(key)) {
              seen.add(key);
              segments.push({ timestamp: time.trim(), text: cleaned });
            }
          }
        }
        if (Array.isArray(node)) {
          for (const item of node) {
            walk(item, depth + 1);
          }
        } else {
          for (const k of Object.keys(node)) {
            if (k === "parent" || k === "window") continue;
            walk(node[k], depth + 1);
          }
        }
      }
      walk(json);
      return segments.length > 0 ? segments : null;
    }
  };

  // src/domain/models/TranscriptSegment.js
  var TranscriptSegment = class {
    /**
     * @param {number} startMs - Start time in milliseconds
     * @param {number} durationMs - Duration in milliseconds
     * @param {string} text - Cleaned text content
     */
    constructor(startMs = 0, durationMs = 0, text = "") {
      this.startMs = Number(startMs) || 0;
      this.durationMs = Number(durationMs) || 0;
      this.text = String(text || "").trim();
      this.timestamp = this.formatTime();
    }
    /**
     * Formats start time into m:ss or h:mm:ss format
     * @returns {string}
     */
    formatTime() {
      const totalSeconds = Math.floor(this.startMs / 1e3);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor(totalSeconds % 3600 / 60);
      const seconds = totalSeconds % 60;
      const pad = (num) => String(num).padStart(2, "0");
      if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
      }
      return `${minutes}:${pad(seconds)}`;
    }
  };

  // src/parsers/TimedtextParser.js
  var TimedtextParser = class {
    /**
     * Parses JSON3 events array into normalized TranscriptSegment list
     * @param {Array<Object>} events
     * @returns {Array<TranscriptSegment>}
     */
    static parseTimedtextEvents(events) {
      if (!Array.isArray(events)) return [];
      const segments = [];
      for (const ev of events) {
        if (!ev || !Array.isArray(ev.segs)) continue;
        const rawText = ev.segs.map((s) => s && s.utf8 ? s.utf8 : "").join("");
        const cleanText = TextCleaner.cleanTranscriptText(rawText);
        if (!cleanText || cleanText === "\n") continue;
        const startMs = Number(ev.tStartMs || ev.tOffsetMs) || 0;
        const durationMs = Number(ev.dDurationMs) || 0;
        segments.push(new TranscriptSegment(startMs, durationMs, cleanText));
      }
      return segments;
    }
    /**
     * Parses standard XML or TTML string into TranscriptSegment list
     * @param {string} xmlStr
     * @returns {Array<TranscriptSegment>}
     */
    static parseTimedtextXml(xmlStr) {
      if (!xmlStr || typeof xmlStr !== "string") return [];
      try {
        if (typeof DOMParser === "undefined") return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, "text/xml");
        const textNodes = Array.from(doc.querySelectorAll("text"));
        if (textNodes.length > 3) {
          return textNodes.map((n) => {
            const sec = parseFloat(n.getAttribute("start") || "0");
            const dur = parseFloat(n.getAttribute("dur") || "0");
            const text = TextCleaner.cleanTranscriptText(n.textContent || "");
            return new TranscriptSegment(Math.round(sec * 1e3), Math.round(dur * 1e3), text);
          }).filter((s) => s.text.length > 0);
        }
        const pNodes = Array.from(doc.querySelectorAll("p"));
        if (pNodes.length > 3) {
          return pNodes.map((p) => {
            const tAttr = p.getAttribute("t");
            const dAttr = p.getAttribute("d");
            const startMs = tAttr ? parseInt(tAttr, 10) : Math.round(parseFloat(p.getAttribute("begin") || "0") * 1e3);
            const durMs = dAttr ? parseInt(dAttr, 10) : 0;
            const text = TextCleaner.cleanTranscriptText(p.textContent || "");
            return new TranscriptSegment(startMs, durMs, text);
          }).filter((s) => s.text.length > 0);
        }
      } catch (_) {
      }
      return [];
    }
  };

  // src/injected/YouTubeContextExtractor.js
  var YouTubeContextExtractor = class {
    constructor() {
      this.activeSpeechRecognition = null;
      this.setupListeners();
    }
    setupListeners() {
      window.addEventListener("message", async (event) => {
        if (event.source !== window || !event.data) return;
        if (event.data.type === "YT_AI_START_SPEECH") {
          this.startSpeechRecognition(event.data.lang || "en-US");
          return;
        }
        if (event.data.type === "YT_AI_STOP_SPEECH") {
          this.stopSpeechRecognition();
          return;
        }
        if (event.data.type === "YT_AI_REQ_PLAYER_DATA") {
          const videoId = event.data.videoId || "";
          const preferredLang = event.data.preferredLang || "en";
          await this.handlePlayerDataRequest(videoId, preferredLang);
          return;
        }
        if (event.data.type === "YT_AI_REQUEST_TRANSCRIPT") {
          const videoId = event.data.videoId;
          const result = await this.extractTranscript(videoId);
          window.postMessage({
            type: "YT_AI_TRANSCRIPT_RESULT",
            videoId,
            segments: result?.segments || null,
            fullText: result?.fullText || null,
            error: result?.error || null
          }, "*");
        }
      });
    }
    /**
     * Handles in-memory player data and transcript extraction
     */
    async handlePlayerDataRequest(requestedVideoId, preferredLang) {
      try {
        let playerResponse = null;
        let player = document.getElementById("movie_player");
        try {
          player?.loadModule?.("captions");
        } catch (_) {
        }
        for (let attempt = 0; attempt < 5; attempt++) {
          player = document.getElementById("movie_player");
          if (player && typeof player.getPlayerResponse === "function") {
            const resp = player.getPlayerResponse();
            const activeId2 = player.getVideoData?.()?.video_id || resp?.videoDetails?.videoId;
            if (!requestedVideoId || activeId2 === requestedVideoId) {
              playerResponse = resp;
              if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
            }
          }
          if (window.ytInitialPlayerResponse) {
            const initId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
            if (!requestedVideoId || initId === requestedVideoId) {
              if (!playerResponse || !playerResponse.captions && window.ytInitialPlayerResponse.captions) {
                playerResponse = window.ytInitialPlayerResponse;
                if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
              }
            }
          }
          const flexy = document.querySelector("ytd-watch-flexy");
          const flexyData = flexy?.playerData || flexy?.data;
          if (flexyData) {
            const fId = flexyData?.videoDetails?.videoId;
            if (!requestedVideoId || fId === requestedVideoId) {
              if (!playerResponse || !playerResponse.captions && flexyData.captions) {
                playerResponse = flexyData;
                if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) break;
              }
            }
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        let activeId = "";
        if (player && typeof player.getVideoData === "function") {
          activeId = player.getVideoData()?.video_id || "";
        }
        if (!playerResponse) {
          player = document.getElementById("movie_player");
          playerResponse = player && typeof player.getPlayerResponse === "function" ? player.getPlayerResponse() : window.ytInitialPlayerResponse;
        }
        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        const videoDetails = playerResponse?.videoDetails || window.ytInitialPlayerResponse?.videoDetails || {};
        let directSegments = null;
        if (captions && captions.length > 0) {
          let track = captions.find((t) => t.languageCode === preferredLang);
          if (!track) track = captions.find((t) => t.languageCode?.startsWith(preferredLang));
          if (!track) track = captions.find((t) => t.languageCode === "en" || t.languageCode?.startsWith("en"));
          if (!track) track = captions[0];
          if (track && track.baseUrl) {
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
          directSegments = InnerTubeParser.extractSegmentsFromInnerTubeJson(window.ytInitialData);
        }
        window.postMessage({
          type: "YT_AI_RES_PLAYER_DATA",
          success: true,
          hasCaptions: directSegments && directSegments.length > 0 || captions && captions.length > 0,
          segments: directSegments || null,
          captions: JSON.parse(JSON.stringify(captions || [])),
          title: videoDetails.title || document.title.replace(" - YouTube", "").trim(),
          author: videoDetails.author || "",
          videoId: videoDetails.videoId || requestedVideoId || activeId
        }, "*");
      } catch (err) {
        window.postMessage({
          type: "YT_AI_RES_PLAYER_DATA",
          success: false,
          error: err.message,
          captions: [],
          segments: null
        }, "*");
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
        const jsonUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "fmt=json3";
        const res = await fetch(jsonUrl, { credentials: "include", signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.text();
          if (raw && raw.trim().startsWith("{")) {
            const json = JSON.parse(raw);
            const segs = TimedtextParser.parseTimedtextEvents(json?.events);
            if (segs && segs.length > 3) return segs;
          }
        }
      } catch (_) {
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(baseUrl, { credentials: "include", signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.text();
          if (raw && raw.trim().startsWith("{")) {
            const json = JSON.parse(raw);
            const segs = TimedtextParser.parseTimedtextEvents(json?.events);
            if (segs && segs.length > 3) return segs;
          } else if (raw && (raw.includes("<transcript") || raw.includes("<tt") || raw.includes("<text"))) {
            const segs = TimedtextParser.parseTimedtextXml(raw);
            if (segs && segs.length > 3) return segs;
          }
        }
      } catch (_) {
      }
      return null;
    }
    /**
     * Finds transcript params in YouTube memory structures
     */
    findTranscriptParams(requestedVideoId) {
      try {
        let searchParams = function(obj, depth = 0) {
          if (!obj || depth > 10) return null;
          if (typeof obj !== "object") return null;
          if (obj.getTranscriptEndpoint && typeof obj.getTranscriptEndpoint.params === "string") {
            return obj.getTranscriptEndpoint.params;
          }
          const keys = Array.isArray(obj) ? null : Object.keys(obj);
          const list = keys || obj;
          for (let i = 0; i < list.length; i++) {
            const k = keys ? keys[i] : i;
            if (k === "polymerController" || k === "__shady" || k === "host" || k === "__events") continue;
            const val = obj[k];
            if (val && typeof val === "object") {
              const res = searchParams(val, depth + 1);
              if (res) return res;
            }
          }
          return null;
        };
        const flexy = document.querySelector("ytd-watch-flexy");
        const flexyData = flexy?.data || flexy?.playerData;
        if (flexyData) {
          const p = searchParams(flexyData);
          if (p) return p;
        }
        if (window.ytInitialData) {
          const p = searchParams(window.ytInitialData);
          if (p) return p;
        }
      } catch (_) {
      }
      return null;
    }
    /**
     * Fetches transcript via YouTube InnerTube API 100% in background
     */
    async fetchTranscriptFromInnerTube(params) {
      if (!params) return null;
      try {
        const apiKey = window.ytcfg?.get?.("INNERTUBE_API_KEY");
        const context = window.ytcfg?.get?.("INNERTUBE_CONTEXT");
        if (!apiKey || !context) return null;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4e3);
        const res = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, params }),
          credentials: "include",
          signal: controller.signal
        }).catch(() => null);
        clearTimeout(timer);
        if (!res || !res.ok) return null;
        const json = await res.json().catch(() => null);
        return InnerTubeParser.extractSegmentsFromInnerTubeJson(json);
      } catch (_) {
      }
      return null;
    }
    startSpeechRecognition(lang) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        window.postMessage({ type: "YT_AI_SPEECH_ERROR", error: "not-supported" }, "*");
        return;
      }
      this.stopSpeechRecognition();
      try {
        this.activeSpeechRecognition = new SpeechRecognition();
        this.activeSpeechRecognition.lang = lang;
        this.activeSpeechRecognition.continuous = true;
        this.activeSpeechRecognition.interimResults = true;
        this.activeSpeechRecognition.onstart = () => window.postMessage({ type: "YT_AI_SPEECH_STARTED" }, "*");
        this.activeSpeechRecognition.onresult = (e) => {
          let interimText = "";
          let finalText = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
            else interimText += e.results[i][0].transcript;
          }
          window.postMessage({ type: "YT_AI_SPEECH_RESULT", finalText, interimText }, "*");
        };
        this.activeSpeechRecognition.onerror = (e) => window.postMessage({ type: "YT_AI_SPEECH_ERROR", error: e.error }, "*");
        this.activeSpeechRecognition.onend = () => window.postMessage({ type: "YT_AI_SPEECH_ENDED" }, "*");
        this.activeSpeechRecognition.start();
      } catch (err) {
        window.postMessage({ type: "YT_AI_SPEECH_ERROR", error: err.message || "start-failed" }, "*");
      }
    }
    stopSpeechRecognition() {
      if (this.activeSpeechRecognition) {
        try {
          this.activeSpeechRecognition.stop();
        } catch (_) {
        }
        this.activeSpeechRecognition = null;
      }
    }
  };

  // src/injected/index.js
  (function() {
    if (window.__ytAiMainWorldInjected) return;
    window.__ytAiMainWorldInjected = true;
    new YouTubeContextExtractor();
    window.formatMs = InnerTubeParser.formatMs;
    window.cleanTranscriptText = TextCleaner.cleanTranscriptText;
    window.parseTimedtextEvents = TimedtextParser.parseTimedtextEvents;
    window.extractSegmentsFromInnerTubeJson = InnerTubeParser.extractSegmentsFromInnerTubeJson;
  })();
})();
