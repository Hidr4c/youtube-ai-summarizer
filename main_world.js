/**
 * main_world.js - YouTube AI Summarizer
 * Exécuté dans le contexte MAIN de YouTube.
 * Attend que le lecteur vidéo soit synchronisé avec la vidéo active.
 * Extraction de transcription transparente en mémoire (Player Captions & Timedtext)
 * SANS AUCUNE MODIFICATION DU DOM YOUTUBE (aucun panneau ouvert ou modifié).
 */

(function () {
  function formatMs(ms) {
    const totalSec = Math.floor(parseInt(ms, 10) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function cleanTranscriptText(text) {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse le format JSON3 (events) renvoyé par l'API timedtext YouTube
   */
  function parseTimedtextEvents(events) {
    if (!Array.isArray(events) || events.length === 0) return null;
    const segments = [];
    for (const ev of events) {
      if (!ev.segs) continue;
      const startMs = ev.tStartMs || 0;
      const text = cleanTranscriptText(ev.segs.map(s => s.utf8 || '').join(''));
      if (text && text !== '\n') {
        segments.push({
          timestamp: formatMs(startMs),
          text
        });
      }
    }
    return segments.length > 3 ? segments : null;
  }

  /**
   * Parse le format XML standard ou TTML renvoyé par l'API timedtext YouTube
   */
  function parseTimedtextXml(xmlStr) {
    if (!xmlStr || typeof xmlStr !== 'string') return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'text/xml');

      // Cas A : balises classiques <text start="..." dur="...">
      const textNodes = Array.from(doc.querySelectorAll('text'));
      if (textNodes.length > 3) {
        const segs = textNodes.map(n => {
          const sec = parseFloat(n.getAttribute('start') || '0');
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60).toString().padStart(2, '0');
          return {
            timestamp: `${m}:${s}`,
            text: cleanTranscriptText(n.textContent || '')
          };
        }).filter(s => s.text.length > 0);
        if (segs.length > 3) return segs;
      }

      // Cas B : balises TTML <p t="..." d="...">
      const pNodes = Array.from(doc.querySelectorAll('p'));
      if (pNodes.length > 3) {
        const segs = pNodes.map(p => {
          const tAttr = p.getAttribute('t');
          let sec = 0;
          if (tAttr) {
            sec = Math.floor(parseInt(tAttr, 10) / 1000);
          } else {
            const begin = p.getAttribute('begin') || '0';
            sec = parseFloat(begin);
          }
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60).toString().padStart(2, '0');
          return {
            timestamp: `${m}:${s}`,
            text: cleanTranscriptText(p.textContent || '')
          };
        }).filter(s => s.text.length > 0);
        if (segs.length > 3) return segs;
      }
    } catch (e) {
      console.warn('[YT AI Main World] XML parsing error:', e);
    }
    return null;
  }

  /**
   * Récupère silencieusement les segments de sous-titres via timedtext depuis le contexte YouTube
   */
  async function fetchTrackSegments(baseUrl) {
    if (!baseUrl) return null;

    // Tentative 1 : Demande au format json3
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
          const segs = parseTimedtextEvents(json?.events);
          if (segs && segs.length > 3) return segs;
        }
      }
    } catch (_) {}

    // Tentative 2 : Format brut (XML ou JSON)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(baseUrl, { credentials: 'include', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.text();
        if (raw && raw.trim().startsWith('{')) {
          try {
            const json = JSON.parse(raw);
            const segs = parseTimedtextEvents(json?.events);
            if (segs && segs.length > 3) return segs;
          } catch (_) {}
        } else if (raw && (raw.includes('<transcript') || raw.includes('<tt') || raw.includes('<text'))) {
          const segs = parseTimedtextXml(raw);
          if (segs && segs.length > 3) return segs;
        }
      }
    } catch (_) {}

    return null;
  }

  function findTranscriptParams(requestedVideoId) {
    try {
      function searchParams(obj, depth = 0) {
        if (!obj || depth > 10) return null;
        if (typeof obj !== 'object') return null;

        if (obj.getTranscriptEndpoint && typeof obj.getTranscriptEndpoint.params === 'string') {
          return obj.getTranscriptEndpoint.params;
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
      const flexyId = flexyData?.videoDetails?.videoId;

      if (!requestedVideoId || flexyId === requestedVideoId) {
        if (flexyData?.engagementPanels) {
          const p = searchParams(flexyData.engagementPanels);
          if (p) return p;
        }
        if (flexyData) {
          const p = searchParams(flexyData);
          if (p) return p;
        }
      }

      const initId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
      if (!requestedVideoId || initId === requestedVideoId) {
        if (window.ytInitialData?.engagementPanels) {
          const p = searchParams(window.ytInitialData.engagementPanels);
          if (p) return p;
        }
        if (window.ytInitialData) {
          const p = searchParams(window.ytInitialData);
          if (p) return p;
        }
      }
    } catch (_) {}
    return null;
  }

  function extractSegmentsFromInnerTubeJson(json) {
    if (!json) return null;
    const segments = [];
    const seen = new Set();

    function walk(node, depth = 0) {
      if (!node || depth > 14) return;
      if (typeof node !== 'object') return;

      // Cas 1 : transcriptSegmentRenderer standard
      const seg = node.transcriptSegmentRenderer;
      if (seg) {
        const time = seg.startTimeText?.simpleText || (seg.startTimeText?.runs || []).map(r => r.text || '').join('');
        const text = (seg.snippet?.runs || []).map(r => r.text || '').join('') || seg.snippet?.simpleText || '';
        if (time && text) {
          const cleaned = cleanTranscriptText(text);
          const key = `${time}|${cleaned.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            segments.push({ timestamp: time.trim(), text: cleaned });
          }
        }
      }

      // Cas 2 : transcriptSegmentViewModel moderne YouTube
      const vm = node.transcriptSegmentViewModel;
      if (vm) {
        let time = '';
        if (typeof vm.startTimeText === 'string') time = vm.startTimeText;
        else if (vm.startTimeText?.content) time = vm.startTimeText.content;
        else if (Array.isArray(vm.startTimeText?.runs)) time = vm.startTimeText.runs.map(r => r.text || '').join('');

        let text = '';
        if (typeof vm.snippet === 'string') text = vm.snippet;
        else if (vm.snippet?.content) text = vm.snippet.content;
        else if (Array.isArray(vm.snippet?.runs)) text = vm.snippet.runs.map(r => r.text || '').join('');

        if (time && text) {
          const cleaned = cleanTranscriptText(text);
          const key = `${time}|${cleaned.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            segments.push({ timestamp: time.trim(), text: cleaned });
          }
        }
      }

      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) walk(node[i], depth + 1);
      } else {
        const keys = Object.keys(node);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (k === 'trackingParams' || k === 'serviceEndpoint' || k === 'commandMetadata') continue;
          walk(node[k], depth + 1);
        }
      }
    }

    walk(json);
    return segments.length > 3 ? segments : null;
  }

  async function fetchTranscriptFromInnerTube(params) {
    if (!params) return null;
    try {
      const apiKey = window.ytcfg?.get?.('INNERTUBE_API_KEY');
      const context = window.ytcfg?.get?.('INNERTUBE_CONTEXT');
      if (!apiKey || !context) return null;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, params }),
        credentials: 'include',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timer);

      if (!res || !res.ok) return null;
      const json = await res.json().catch(() => null);
      return extractSegmentsFromInnerTubeJson(json);
    } catch (_) {}
    return null;
  }

  // --- GESTIONNAIRE DE RECONNAISSANCE VOCALE DANS LE CONTEXTE PRINCIPAL YOUTUBE ---
  let activeSpeechRecognition = null;

  function stopMainWorldSpeech() {
    if (activeSpeechRecognition) {
      try { activeSpeechRecognition.stop(); } catch (e) {}
      activeSpeechRecognition = null;
    }
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'YT_AI_START_SPEECH') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        window.postMessage({ type: 'YT_AI_SPEECH_ERROR', error: 'not-supported' }, '*');
        return;
      }

      stopMainWorldSpeech();

      try {
        activeSpeechRecognition = new SpeechRecognition();
        activeSpeechRecognition.lang = event.data.lang || 'en-US';
        activeSpeechRecognition.continuous = true;
        activeSpeechRecognition.interimResults = true;

        activeSpeechRecognition.onstart = () => {
          window.postMessage({ type: 'YT_AI_SPEECH_STARTED' }, '*');
        };

        activeSpeechRecognition.onresult = (e) => {
          let interimText = '';
          let finalText = '';

          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              finalText += e.results[i][0].transcript + ' ';
            } else {
              interimText += e.results[i][0].transcript;
            }
          }

          window.postMessage({
            type: 'YT_AI_SPEECH_RESULT',
            finalText,
            interimText
          }, '*');
        };

        activeSpeechRecognition.onerror = (e) => {
          console.warn('[YT AI Main World] SpeechRecognition error:', e.error);
          window.postMessage({ type: 'YT_AI_SPEECH_ERROR', error: e.error }, '*');
        };

        activeSpeechRecognition.onend = () => {
          window.postMessage({ type: 'YT_AI_SPEECH_ENDED' }, '*');
        };

        activeSpeechRecognition.start();
      } catch (err) {
        console.error('[YT AI Main World] Speech start failed:', err);
        window.postMessage({ type: 'YT_AI_SPEECH_ERROR', error: err.message || 'start-failed' }, '*');
      }
      return;
    }

    if (event.data.type === 'YT_AI_STOP_SPEECH') {
      stopMainWorldSpeech();
      return;
    }

    if (event.data.type !== 'YT_AI_REQ_PLAYER_DATA') return;

    const requestedVideoId = event.data.videoId || '';
    const preferredLang = event.data.preferredLang || 'en';

    try {
      let playerResponse = null;
      let player = document.getElementById('movie_player');
      try { player?.loadModule?.('captions'); } catch (_) {}

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

        const flexyData = document.querySelector('ytd-watch-flexy')?.playerData;
        if (flexyData) {
          const fId = flexyData?.videoDetails?.videoId;
          if (!requestedVideoId || fId === requestedVideoId) {
            if (!playerResponse || (!playerResponse.captions && flexyData.captions)) {
              playerResponse = flexyData;
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

      let captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
                     window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
                     [];

      const videoDetails = playerResponse?.videoDetails || window.ytInitialPlayerResponse?.videoDetails || {};

      // Récupération directe et transparente des segments en mémoire (sans toucher à l'écran)
      let directSegments = null;
      if (captions && captions.length > 0) {
        let track = captions.find(t => t.languageCode === preferredLang);
        if (!track) track = captions.find(t => t.languageCode?.startsWith(preferredLang));
        if (!track) track = captions.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
        if (!track) track = captions[0];

        if (track && track.baseUrl) {
          directSegments = await fetchTrackSegments(track.baseUrl);
        }
      }

      // Fallback 100% transparent en mémoire via InnerTube si timedtext n'a pas répondu
      if (!directSegments || directSegments.length === 0) {
        const transcriptParams = findTranscriptParams(requestedVideoId || activeId);
        if (transcriptParams) {
          directSegments = await fetchTranscriptFromInnerTube(transcriptParams);
        }
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
  });
})();
