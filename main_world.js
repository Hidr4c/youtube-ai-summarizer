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

  // src/injected/YouTubeContextExtractor.js
  var YouTubeContextExtractor = class {
    constructor() {
      this.setupListeners();
    }
    setupListeners() {
      window.addEventListener("message", async (event) => {
        if (event.source !== window || !event.data) return;
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
     * Attempts extraction from page globals
     * @param {string} videoId
     */
    async extractTranscript(videoId) {
      try {
        const pr = window.ytInitialPlayerResponse;
        const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) {
          const track = tracks.find((t) => t.languageCode === "en") || tracks[0];
          if (track && track.baseUrl) {
            const res = await fetch(`${track.baseUrl}&fmt=json3`);
            if (res.ok) {
              const json = await res.json();
              const segments = [];
              for (const ev of json.events || []) {
                if (ev.segs) {
                  const text = ev.segs.map((s) => s.utf8 || "").join("").trim();
                  if (text) {
                    const ms = ev.tStartMs || ev.tOffsetMs || 0;
                    segments.push({ timestamp: InnerTubeParser.formatMs(ms), text });
                  }
                }
              }
              if (segments.length > 0) {
                return { segments, fullText: segments.map((s) => s.text).join(" ") };
              }
            }
          }
        }
      } catch {
      }
      try {
        const data = window.ytInitialData;
        const segments = InnerTubeParser.extractSegmentsFromInnerTubeJson(data);
        if (segments && segments.length > 0) {
          return { segments, fullText: segments.map((s) => s.text).join(" ") };
        }
      } catch {
      }
      return { error: "No transcript found in page context" };
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
