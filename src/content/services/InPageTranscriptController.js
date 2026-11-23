import { DOMTranscriptExtractor } from './DOMTranscriptExtractor.js';
import { NativeTranscriptPanel } from './NativeTranscriptPanel.js';
import { YouTubeDOMContext } from './YouTubeDOMContext.js';
import { CaptionTrackPrioritizer } from '../../parsers/CaptionTrackPrioritizer.js';
import { TimedtextParser } from '../../parsers/TimedtextParser.js';
import { TextCleaner } from '../../parsers/TextCleaner.js';
import { getVideoId, isShortsPage } from '../ui/NavigationObserver.js';
import { escapeHtml } from '../ui/MarkdownRenderer.js';
import { I18N } from '../../locales/index.js';

/**
 * Orchestrates multi-strategy transparent transcript extraction, caching, and state management
 */
export class InPageTranscriptController {
  constructor() {
    this.cachedTranscript = { videoId: '', segments: [], fullText: '', isChapterOnly: false };
    this.cachedVideoMetadata = {
      videoId: '', title: '', author: '', channelId: '', subscribers: '',
      description: '', keywords: [], category: '', publishDate: '', viewCount: ''
    };
  }

  static cleanTranscriptText(text) {
    return TextCleaner.cleanTranscriptText(text);
  }

  static parseTimedtextContent(bodyText) {
    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) return null;
    const trimmed = bodyText.trim();
    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        const segs = TimedtextParser.parseTimedtextEvents(json?.events);
        if (segs && segs.length > 0) {
          return segs.map(s => {
            const sec = Math.floor(s.startMs / 1000);
            return { timestamp: `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`, text: s.text };
          });
        }
      } catch (_) {}
    }
    const xmlSegs = TimedtextParser.parseTimedtextXml(trimmed);
    if (xmlSegs && xmlSegs.length > 0) {
      return xmlSegs.map(s => {
        const sec = Math.floor(s.startMs / 1000);
        return { timestamp: `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`, text: s.text };
      });
    }
    return null;
  }

  async fetchTimedtextSegments(baseUrl, preferredLang = null) {
    if (!baseUrl) return null;
    const urls = [];
    if (preferredLang && !baseUrl.includes(`lang=${preferredLang}`)) {
      urls.push(baseUrl + (baseUrl.includes('?') ? '&' : '?') + `tlang=${preferredLang}&fmt=json3`);
    }
    urls.push(baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'fmt=json3');
    if (baseUrl.includes('&variant=')) {
      const stripped = baseUrl.replace(/&variant=[^&]+/, '');
      urls.push(stripped + (stripped.includes('?') ? '&' : '?') + 'fmt=json3');
      urls.push(stripped);
    }
    urls.push(baseUrl);

    for (const u of urls) {
      try {
        const resp = await fetch(u, { credentials: 'include' });
        if (resp.ok) {
          const segs = InPageTranscriptController.parseTimedtextContent(await resp.text());
          if (segs && segs.length > 0) return segs;
        }
      } catch (_) {}
    }
    return null;
  }

  requestPlayerDataFromMainWorld(videoId, preferredLang = 'fr') {
    return new Promise((resolve) => {
      let resolved = false;
      const handler = (e) => {
        if (e.source !== window || !e.data || e.data.type !== 'YT_AI_RES_PLAYER_DATA') return;
        const data = e.data || {};
        if (videoId && data.videoId && data.videoId !== videoId) return;

        resolved = true;
        window.removeEventListener('message', handler);
        if (data.videoId && (!videoId || data.videoId === videoId)) {
          this.cachedVideoMetadata = {
            videoId: data.videoId,
            title: data.title || '',
            author: data.author || '',
            channelId: data.channelId || '',
            channelUrl: data.channelUrl || (data.channelId ? `/channel/${data.channelId}` : ''),
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
        if (!resolved) {
          window.removeEventListener('message', handler);
          resolve({});
        }
      }, 5000);
    });
  }

  fetchTranscriptFromBackground(videoId, lang = 'fr') {
    if (!chrome?.runtime?.sendMessage) return Promise.resolve(null);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'FETCH_WATCH_PAGE_TRANSCRIPT', videoId, lang }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) resolve(null);
        else resolve(res);
      });
    });
  }

  async extractYouTubeTranscript(preferredLang = 'en', isUserInitiated = false) {
    const currentVideoId = getVideoId();
    if (!currentVideoId) return null;

    if (this.cachedTranscript.videoId === currentVideoId && this.cachedTranscript.segments.length > 0 && !this.cachedTranscript.isChapterOnly) {
      return this.cachedTranscript.segments;
    }

    if (this.cachedTranscript.videoId && this.cachedTranscript.videoId !== currentVideoId) {
      this.resetAllState(preferredLang);
    }

    const segments = await this.executeExtractionPipeline(currentVideoId, preferredLang, isUserInitiated);
    if (segments && segments.length > 0) return segments;

    if (isUserInitiated) {
      const retryDelays = [600, 1200];
      for (const delay of retryDelays) {
        await new Promise(r => setTimeout(r, delay));
        const retrySegments = await this.executeExtractionPipeline(currentVideoId, preferredLang, isUserInitiated);
        if (retrySegments && retrySegments.length > 0) return retrySegments;
      }
    }
    return null;
  }

  _commitTranscript(videoId, segments, isChapterOnly = false) {
    if (!Array.isArray(segments) || segments.length === 0) return null;
    this.saveCachedTranscript(videoId, segments, isChapterOnly);
    return this.cachedTranscript.videoId === videoId ? segments : null;
  }

  async executeExtractionPipeline(currentVideoId, preferredLang, isUserInitiated) {
    const onShorts = isShortsPage();
    // STRATÉGIE 1 : Passive Active DOM (skipped on Shorts feeds to prevent stale Watch DOM leakage)
    if (!onShorts) {
      const committed = this._commitTranscript(currentVideoId, DOMTranscriptExtractor.extractTranscriptFromActiveDOM(), false);
      if (committed) return committed;
    }

    // STRATÉGIE 2 : Main World in-memory
    const playerData = await this.requestPlayerDataFromMainWorld(currentVideoId, preferredLang);
    if (playerData?.videoId === currentVideoId) {
      const committed = this._commitTranscript(currentVideoId, playerData.segments, false);
      if (committed) return committed;
    }

    // STRATÉGIE 3 : Timedtext Direct Streams (All candidate tracks)
    if (playerData?.videoId === currentVideoId && playerData?.captions?.length > 0) {
      const ordered = CaptionTrackPrioritizer.prioritizeTracks(playerData.captions, preferredLang);
      for (const track of ordered) {
        if (track?.baseUrl) {
          const committed = this._commitTranscript(currentVideoId, await this.fetchTimedtextSegments(track.baseUrl, preferredLang), false);
          if (committed) return committed;
        }
      }
    }

    // STRATÉGIE 4 : Stealth Native Panel (Full dialogue transcript in DOM)
    if (!onShorts) {
      const committed = this._commitTranscript(currentVideoId, await NativeTranscriptPanel.triggerStealthNativeTranscript(), false);
      if (committed) return committed;
    }

    // STRATÉGIE 5 & 6 : Background Fetch via Service Worker & Description Chapters
    const bgResult = await this.fetchTranscriptFromBackground(currentVideoId, preferredLang);
    const bgMatches = !bgResult?.videoId || bgResult.videoId === currentVideoId;
    if (bgMatches) {
      const committed = this._commitTranscript(currentVideoId, bgResult?.segments, !!bgResult?.isChapterOnly);
      if (committed) return committed;
    }

    const chapterSegments = !onShorts ? YouTubeDOMContext.extractChaptersFromDescription() : null;
    if (chapterSegments && chapterSegments.length > 1) {
      return this._commitTranscript(currentVideoId, chapterSegments, true);
    }
    return null;
  }

  saveCachedTranscript(videoId, segments, isChapterOnly = false) {
    const activeVideoId = getVideoId();
    if (activeVideoId && videoId && activeVideoId !== videoId) return;
    this.cachedTranscript = {
      videoId,
      segments,
      fullText: segments.map(s => s.text).join(' '),
      isChapterOnly: !!isChapterOnly
    };

    const wordsCount = this.cachedTranscript.fullText.trim().split(/\s+/).filter(Boolean).length;
    const wordCountEl = document.getElementById('ytAiWordCount');
    const wordCountTab = document.getElementById('ytAiWordCountTab');
    const headerTitle = document.getElementById('ytAiTranscriptHeaderTitle');
    const transcriptBody = document.getElementById('ytAiTranscriptBody');
    const currentLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[currentLang] || I18N.en;
    const fb = I18N.en;

    const chapSuffix = t.chapterBadge || fb.chapterBadge;
    if (wordCountEl) wordCountEl.textContent = wordsCount.toLocaleString();
    if (wordCountTab) {
      wordCountTab.textContent = isChapterOnly
        ? `${wordsCount.toLocaleString()} ${t.wordsBadge || fb.wordsBadge} ${chapSuffix}`
        : `${wordsCount.toLocaleString()} ${t.wordsBadge || fb.wordsBadge}`;
    }
    if (headerTitle) {
      headerTitle.textContent = isChapterOnly
        ? `${t.transcriptTitle || fb.transcriptTitle} ${chapSuffix}`
        : (t.transcriptTitle || fb.transcriptTitle);
    }

    if (transcriptBody) {
      const warnHtml = isChapterOnly
        ? `<div class="yt-ai-chapter-warning" style="margin-bottom:8px;padding:8px 10px;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.3);border-radius:4px;font-size:11px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
             <span>⚠️ ${escapeHtml(t.chapterOnlyNotice || fb.chapterOnlyNotice)}</span>
             <button id="ytAiForceTranscriptBtn" class="yt-ai-btn yt-ai-btn-secondary" style="font-size:11px;padding:2px 8px;cursor:pointer;">🔄 ${escapeHtml(t.forceRetryBtn || fb.forceRetryBtn)}</button>
           </div>`
        : '';
      transcriptBody.innerHTML = warnHtml + segments.map(s => {
        let sec = 0;
        if (s.timestamp) {
          const parts = s.timestamp.split(':').map(Number);
          if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
        }
        return `<div class="yt-ai-transcript-line"><a href="javascript:void(0)" class="yt-ai-timestamp-link" data-time="${sec}">[${s.timestamp || '--:--'}]</a> <span>${escapeHtml(s.text)}</span></div>`;
      }).join('');

      if (isChapterOnly) {
        document.getElementById('ytAiForceTranscriptBtn')?.addEventListener('click', async () => {
          const activeLang = document.getElementById('ytAiLangSelect')?.value || currentLang;
          const activeT = I18N[activeLang] || I18N.en;
          transcriptBody.innerHTML = `<div class="yt-ai-loading">${escapeHtml(activeT.extractingLabel || fb.extractingLabel)}</div>`;
          const segs = await NativeTranscriptPanel.triggerStealthNativeTranscript();
          if (segs && segs.length > 0) {
            this.saveCachedTranscript(videoId, segs, false);
          } else {
            this.saveCachedTranscript(videoId, segments, true);
          }
        });
      }
    }
  }

  resetAllState(currentLang = 'en') {
    this.cachedTranscript = { videoId: '', segments: [], fullText: '', isChapterOnly: false };
    this.cachedVideoMetadata = {
      videoId: '', title: '', author: '', channelId: '', subscribers: '',
      description: '', keywords: [], category: '', publishDate: '', viewCount: ''
    };
    const t = I18N[currentLang] || I18N.en;
    const wordCountEl = document.getElementById('ytAiWordCount');
    const wordCountTab = document.getElementById('ytAiWordCountTab');
    const headerTitle = document.getElementById('ytAiTranscriptHeaderTitle');
    const transcriptBody = document.getElementById('ytAiTranscriptBody');
    if (wordCountEl) wordCountEl.textContent = '0';
    if (wordCountTab) wordCountTab.textContent = `0 ${t.wordsBadge || 'words'}`;
    if (headerTitle) headerTitle.textContent = t.transcriptTitle || '📜 Full Transcript';
    if (transcriptBody) {
      transcriptBody.innerHTML = `<div class="yt-ai-loading">${escapeHtml(t.transcriptWaiting || 'Waiting for transcript...')}</div>`;
    }
  }
}

export default InPageTranscriptController;
