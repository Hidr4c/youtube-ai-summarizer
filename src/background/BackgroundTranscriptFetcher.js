/**
 * Background service to fetch transcripts or chapters for arbitrary YouTube videos.
 * Combines direct watch page parsing with a silent background tab fallback.
 */
export class BackgroundTranscriptFetcher {
  /**
   * Main entry point to fetch transcript/chapters for a given video
   * @param {string} videoId
   * @param {string} [lang='fr']
   * @returns {Promise<{success: boolean, segments?: Array, title?: string, error?: string}>}
   */
  static async fetchTranscript(videoId, lang = 'fr') {
    if (!videoId) return { success: false, error: 'No videoId provided' };

    // 1. Fast path: Direct watch page fetch (< 300ms)
    try {
      const fastResult = await BackgroundTranscriptFetcher.fetchDirect(videoId, lang);
      if (fastResult?.segments?.length > 0) {
        return { success: true, segments: fastResult.segments, title: fastResult.title };
      }
    } catch (_) {}

    // 2. Reliable path: Silent background tab extraction
    if (chrome?.tabs?.create && chrome?.scripting?.executeScript) {
      try {
        const tabResult = await BackgroundTranscriptFetcher.fetchViaBackgroundTab(videoId, lang);
        if (tabResult?.segments?.length > 0) {
          return { success: true, segments: tabResult.segments, title: tabResult.title };
        }
      } catch (_) {}
    }

    return { success: false, error: 'Unable to extract transcript for video ' + videoId };
  }

  static async fetchDirect(videoId, lang = 'fr') {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': `${lang},en;q=0.8`, 'User-Agent': navigator.userAgent || 'Mozilla/5.0' },
      credentials: 'include'
    });
    if (!res.ok) return null;
    const html = await res.text();

    let title = '';
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim();

    // 1. Try timedtext captions
    const timedtextSegments = BackgroundTranscriptFetcher.extractTimedtextFromHtml(html, lang);
    if (timedtextSegments?.length > 0) {
      return { title, segments: timedtextSegments };
    }

    // 2. Try chapters from ytInitialData
    const chapters = BackgroundTranscriptFetcher.extractChaptersFromHtml(html);
    if (chapters?.length > 0) {
      return { title, segments: chapters };
    }

    return null;
  }

  static async extractTimedtextFromHtml(html, lang = 'fr') {
    const key = '"captionTracks":';
    const pos = html.indexOf(key);
    if (pos === -1) return null;
    const start = html.indexOf('[', pos);
    if (start === -1) return null;

    let depth = 0, end = -1, inStr = false, esc = false;
    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (c === '[') depth++;
        else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
      }
    }
    if (end === -1) return null;

    try {
      const tracks = JSON.parse(html.slice(start, end));
      const track = tracks.find(t => t.languageCode === lang) ||
                    tracks.find(t => t.languageCode?.startsWith(lang)) ||
                    tracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
                    tracks[0];
      if (!track?.baseUrl) return null;

      const ttUrl = track.baseUrl + (track.baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const ttRes = await fetch(ttUrl, { credentials: 'include' });
      if (!ttRes.ok) return null;
      const raw = await ttRes.text();
      if (!raw || !raw.trim().startsWith('{')) return null;

      const ttJson = JSON.parse(raw);
      const segments = [];
      if (Array.isArray(ttJson.events)) {
        for (const ev of ttJson.events) {
          if (!ev.segs) continue;
          const sec = Math.floor((ev.tStartMs || 0) / 1000);
          const m = Math.floor(sec / 60);
          const s = (sec % 60).toString().padStart(2, '0');
          const text = ev.segs.map(seg => seg.utf8 || '').join('').replace(/\s+/g, ' ').trim();
          if (text && text !== '\n') segments.push({ timestamp: `${m}:${s}`, text });
        }
      }
      return segments.length > 0 ? segments : null;
    } catch (_) {
      return null;
    }
  }

  static extractChaptersFromHtml(html) {
    const dataKey = 'ytInitialData = ';
    const dataPos = html.indexOf(dataKey);
    if (dataPos === -1) return null;
    const end = html.indexOf(';</script>', dataPos);
    if (end === -1) return null;

    try {
      const data = JSON.parse(html.slice(dataPos + dataKey.length, end));
      const panels = data.engagementPanels || [];
      const chapters = [];
      for (const p of panels) {
        const list = p.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
        if (Array.isArray(list)) {
          for (const item of list) {
            const r = item.macroMarkersListItemRenderer;
            if (r) {
              const time = r.timeDescription?.simpleText || r.timeDescription?.runs?.[0]?.text;
              const txt = r.title?.simpleText || r.title?.runs?.[0]?.text;
              if (time && txt) chapters.push({ timestamp: time.trim(), text: txt.trim() });
            }
          }
        }
      }
      return chapters.length > 0 ? chapters : null;
    } catch (_) {
      return null;
    }
  }

  static async fetchViaBackgroundTab(videoId, lang = 'fr') {
    let tab = null;
    try {
      tab = await chrome.tabs.create({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        active: false
      });

      const results = await new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) { done = true; resolve(null); }
        }, 12000);

        const checkTab = async () => {
          if (done) return;
          try {
            const execRes = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              world: 'MAIN',
              func: async () => {
                const player = document.getElementById('movie_player');
                try { player?.mute?.(); player?.pauseVideo?.(); } catch (_) {}

                // If native in-page UI already rendered segments
                const countEl = document.getElementById('ytAiWordCount');
                const initialCount = parseInt(countEl?.innerText?.replace(/\D/g, '') || '0', 10);
                if (initialCount > 0) {
                  const lines = Array.from(document.querySelectorAll('.yt-ai-transcript-line') || []);
                  const segments = lines.map(el => {
                    const m = el.innerText.match(/^\[([^\]]+)\]\s*(.*)$/);
                    return m ? { timestamp: m[1], text: m[2] } : { timestamp: '', text: el.innerText };
                  }).filter(s => s.text);
                  if (segments.length > 0) {
                    return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim(), segments };
                  }
                }

                // Click native transcript button
                let nativeBtn = document.querySelector('button[aria-label*="transcription" i], button[aria-label*="transcript" i]');
                if (!nativeBtn) {
                  const expandBtn = document.querySelector('#expand, tp-yt-paper-button#expand, #description-inline-expander #expand');
                  if (expandBtn) expandBtn.click();
                  await new Promise(r => setTimeout(r, 250));
                  nativeBtn = document.querySelector('button[aria-label*="transcription" i], button[aria-label*="transcript" i], ytd-video-description-transcript-section-renderer button');
                }
                if (nativeBtn) nativeBtn.click();

                // Poll for segments & handle chip-bar tabs
                for (let retry = 0; retry < 12; retry++) {
                  await new Promise(r => setTimeout(r, 350));

                  const chip = document.querySelector('chip-bar-view-model button[aria-label*="transcription" i], chip-bar-view-model button[aria-label*="transcript" i]') ||
                    Array.from(document.querySelectorAll('chip-bar-view-model button')).find(b => /transcription|transcript/i.test(b.textContent));
                  if (chip && chip.getAttribute('aria-selected') !== 'true') chip.click();

                  const modernSegs = document.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer');
                  if (modernSegs.length > 0) {
                    const segments = Array.from(modernSegs).map(el => {
                      const timeEl = el.querySelector('.ytTranscriptSegmentViewModelTimestamp, .segment-timestamp, [class*="Timestamp"], [class*="timestamp"]');
                      const textEl = el.querySelector('span[role="text"], .ytAttributedStringInlineHost, span.ytAttributedStringHost, .yt-core-attributed-string, .segment-text, yt-formatted-string');
                      return { timestamp: timeEl?.textContent?.trim() || '', text: textEl?.textContent?.trim() || '' };
                    }).filter(s => s.text);
                    if (segments.length > 0) {
                      return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim(), segments };
                    }
                  }
                }

                // Fallback to structured chapters in ytInitialData
                const panels = window.ytInitialData?.engagementPanels || [];
                const chapters = [];
                for (const p of panels) {
                  const list = p.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
                  if (Array.isArray(list)) {
                    for (const item of list) {
                      const r = item.macroMarkersListItemRenderer;
                      if (r) {
                        const time = r.timeDescription?.simpleText || r.timeDescription?.runs?.[0]?.text;
                        const txt = r.title?.simpleText || r.title?.runs?.[0]?.text;
                        if (time && txt) chapters.push({ timestamp: time.trim(), text: txt.trim() });
                      }
                    }
                  }
                }
                if (chapters.length > 0) {
                  return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim(), segments: chapters };
                }

                // Fallback to DOM macro markers
                const domMarkers = Array.from(document.querySelectorAll('ytd-macro-markers-list-item-renderer, macro-markers-panel-item-view-model'));
                if (domMarkers.length > 0) {
                  const domChapters = domMarkers.map(el => {
                    const timeEl = el.querySelector('#time, [class*="time"]');
                    const titleEl = el.querySelector('h3:not([hidden]), h4:not([hidden]), #title:not([hidden])');
                    return { timestamp: timeEl?.textContent?.trim() || '', text: titleEl?.textContent?.trim() || '' };
                  }).filter(c => c.timestamp && c.text);
                  if (domChapters.length > 0) {
                    return { title: document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim(), segments: domChapters };
                  }
                }

                return null;
              }
            });

            const data = execRes?.[0]?.result;
            if (data?.segments?.length > 0) {
              if (!done) { done = true; clearTimeout(timer); resolve(data); }
            } else {
              setTimeout(checkTab, 600);
            }
          } catch (_) {
            setTimeout(checkTab, 600);
          }
        };

        setTimeout(checkTab, 1500);
      });

      return results;
    } finally {
      if (tab?.id) {
        try { await chrome.tabs.remove(tab.id); } catch (_) {}
      }
    }
  }
}

export default BackgroundTranscriptFetcher;
