import { DOMTranscriptExtractor } from './DOMTranscriptExtractor.js';
import { NativeTranscriptPanel } from './NativeTranscriptPanel.js';
import { YouTubeDOMContext } from './YouTubeDOMContext.js';
import { getVideoId } from '../ui/NavigationObserver.js';
import { escapeHtml } from '../ui/MarkdownRenderer.js';

/**
 * Orchestrates multi-model transcript extraction, caching, and state management
 */
export class InPageTranscriptController {
  constructor() {
    this.cachedTranscript = {
      videoId: '',
      segments: [],
      fullText: '',
      isChapterOnly: false
    };

    this.cachedVideoMetadata = {
      videoId: '',
      title: '',
      author: '',
      channelId: '',
      subscribers: '',
      description: '',
      keywords: [],
      category: '',
      publishDate: '',
      viewCount: ''
    };
  }

  static cleanTranscriptText(text) {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static parseTimedtextContent(bodyText) {
    if (!bodyText || typeof bodyText !== 'string' || bodyText.trim().length === 0) return null;
    const trimmed = bodyText.trim();

    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        if (json && Array.isArray(json.events)) {
          const segs = [];
          for (const ev of json.events) {
            if (!ev.segs) continue;
            const startMs = ev.tStartMs || 0;
            const sec = Math.floor(startMs / 1000);
            const m = Math.floor(sec / 60);
            const s = (sec % 60).toString().padStart(2, '0');
            const txt = InPageTranscriptController.cleanTranscriptText(ev.segs.map(s => s.utf8 || '').join(''));
            if (txt && txt !== '\n') {
              segs.push({ timestamp: `${m}:${s}`, text: txt });
            }
          }
          if (segs.length > 5) return segs;
        }
      } catch (_) {}
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/xml');
      const textNodes = Array.from(doc.querySelectorAll('text'));
      if (textNodes.length > 5) {
        const segs = textNodes.map(n => {
          const sec = parseFloat(n.getAttribute('start') || '0');
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60).toString().padStart(2, '0');
          return { timestamp: `${m}:${s}`, text: InPageTranscriptController.cleanTranscriptText(n.textContent || '') };
        }).filter(s => s.text.length > 0);
        if (segs.length > 5) return segs;
      }

      const pNodes = Array.from(doc.querySelectorAll('p'));
      if (pNodes.length > 5) {
        const segs = pNodes.map(p => {
          const tAttr = p.getAttribute('t');
          const sec = tAttr ? Math.floor(parseInt(tAttr, 10) / 1000) : Math.floor(parseFloat(p.getAttribute('begin') || '0'));
          const m = Math.floor(sec / 60);
          const s = (sec % 60).toString().padStart(2, '0');
          return { timestamp: `${m}:${s}`, text: InPageTranscriptController.cleanTranscriptText(p.textContent || '') };
        }).filter(s => s.text.length > 0);
        if (segs.length > 5) return segs;
      }
    } catch (_) {}

    return null;
  }

  async fetchTimedtextSegments(baseUrl) {
    if (!baseUrl) return null;
    try {
      const jsonUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const resp = await fetch(jsonUrl, { credentials: 'include' });
      if (resp.ok) {
        const text = await resp.text();
        const segs = InPageTranscriptController.parseTimedtextContent(text);
        if (segs) return segs;
      }
    } catch (_) {}

    try {
      const resp = await fetch(baseUrl, { credentials: 'include' });
      if (resp.ok) {
        const bodyText = await resp.text();
        const segs = InPageTranscriptController.parseTimedtextContent(bodyText);
        if (segs) return segs;
      }
    } catch (_) {}

    return null;
  }

  requestPlayerDataFromMainWorld(videoId, preferredLang = 'fr') {
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.source !== window || !e.data || e.data.type !== 'YT_AI_RES_PLAYER_DATA') return;
        window.removeEventListener('message', handler);
        const data = e.data || {};
        if (data.videoId && (!videoId || data.videoId === videoId)) {
          this.cachedVideoMetadata = {
            videoId: data.videoId,
            title: data.title || '',
            author: data.author || '',
            channelId: data.channelId || '',
            subscribers: this.cachedVideoMetadata.subscribers || '',
            description: data.description || '',
            keywords: Array.isArray(data.keywords) ? data.keywords : [],
            category: data.category || '',
            publishDate: data.publishDate || '',
            viewCount: data.viewCount || ''
          };
        }
        resolve(data);
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'YT_AI_REQ_PLAYER_DATA', videoId, preferredLang }, '*');

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({});
      }, 8000);
    });
  }

  async extractYouTubeTranscript(preferredLang = 'en') {
    const currentVideoId = getVideoId();

    if (this.cachedTranscript.videoId === currentVideoId && this.cachedTranscript.segments.length > 0 && !this.cachedTranscript.isChapterOnly) {
      return this.cachedTranscript.segments;
    }

    // MODÈLE 1 : DOM actif
    let domSegments = DOMTranscriptExtractor.extractTranscriptFromActiveDOM();
    if (domSegments && domSegments.length > 5) {
      const words = domSegments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
      if (domSegments.length >= 15 || words >= 150) {
        this.saveCachedTranscript(currentVideoId, domSegments, false);
        if (!this.cachedVideoMetadata.description || this.cachedVideoMetadata.videoId !== currentVideoId) {
          this.requestPlayerDataFromMainWorld(currentVideoId, preferredLang).catch(() => {});
        }
        return domSegments;
      }
    }

    // MODÈLE 2 : Main World in-memory
    const playerData = await this.requestPlayerDataFromMainWorld(currentVideoId, preferredLang);
    if (playerData && Array.isArray(playerData.segments) && playerData.segments.length > 3) {
      const words = playerData.segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
      if (playerData.segments.length >= 15 || words >= 150) {
        this.saveCachedTranscript(currentVideoId, playerData.segments, false);
        return playerData.segments;
      }
    }

    // MODÈLE 3 : Timedtext stream
    if (playerData && playerData.captions && playerData.captions.length > 0) {
      let track = playerData.captions.find(t => t.languageCode === preferredLang);
      if (!track) track = playerData.captions.find(t => t.languageCode?.startsWith(preferredLang));
      if (!track) track = playerData.captions.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
      if (!track) track = playerData.captions[0];

      if (track && track.baseUrl) {
        const segments = await this.fetchTimedtextSegments(track.baseUrl);
        if (segments && segments.length > 3) {
          this.saveCachedTranscript(currentVideoId, segments, false);
          return segments;
        }
      }
    }

    // MODÈLE 4 : Stealth native panel
    const stealthSegments = await NativeTranscriptPanel.triggerStealthNativeTranscript();
    if (stealthSegments && stealthSegments.length > 3) {
      this.saveCachedTranscript(currentVideoId, stealthSegments, false);
      return stealthSegments;
    }

    // MODÈLE 5 : Description chapters
    const chapterSegments = YouTubeDOMContext.extractChaptersFromDescription();
    if (chapterSegments && chapterSegments.length > 1) {
      this.saveCachedTranscript(currentVideoId, chapterSegments, true);
      return chapterSegments;
    }

    return null;
  }

  saveCachedTranscript(videoId, segments, isChapterOnly = false) {
    this.cachedTranscript = {
      videoId,
      segments,
      fullText: segments.map(s => s.text).join(' '),
      isChapterOnly: !!isChapterOnly
    };

    const wordsCount = this.cachedTranscript.fullText.trim().split(/\s+/).filter(Boolean).length;
    const wordCountEl = document.getElementById('ytAiWordCount');
    const wordCountTab = document.getElementById('ytAiWordCountTab');
    const transcriptBody = document.getElementById('ytAiTranscriptBody');

    if (wordCountEl) wordCountEl.textContent = wordsCount.toLocaleString();
    if (wordCountTab) {
      wordCountTab.textContent = isChapterOnly
        ? `${wordsCount.toLocaleString()} words (Chapitres)`
        : `${wordsCount.toLocaleString()} words`;
    }

    if (transcriptBody) {
      transcriptBody.innerHTML = segments.map(s => {
        let sec = 0;
        if (s.timestamp) {
          const parts = s.timestamp.split(':').map(Number);
          if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
        }
        return `<div class="yt-ai-transcript-line"><a href="javascript:void(0)" class="yt-ai-timestamp-link" data-time="${sec}">[${s.timestamp || '--:--'}]</a> <span>${escapeHtml(s.text)}</span></div>`;
      }).join('');
    }
  }

  resetAllState() {
    this.cachedTranscript = { videoId: '', segments: [], fullText: '', isChapterOnly: false };
    this.cachedVideoMetadata = {
      videoId: '', title: '', author: '', channelId: '', subscribers: '',
      description: '', keywords: [], category: '', publishDate: '', viewCount: ''
    };
  }
}

export default InPageTranscriptController;
