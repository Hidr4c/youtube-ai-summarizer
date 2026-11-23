import { ChannelPageParser } from '../parsers/ChannelPageParser.js';

const CHANNEL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
};

/**
 * HTTP and same-origin tab-proxy transport layer for YouTube channel HTML & InnerTube continuations.
 * Prevents EU consent.youtube.com Service Worker cookie loops via credentials: 'omit' and ?ucbcb=1 / tab proxy fallback.
 */
export class ChannelHttpClient {
  /**
   * Fetches channel/search HTML bypassing EU consent redirects when possible.
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<{ ok: boolean, status: number, html: string, url: string }>}
   */
  static async fetchHtmlPage(url, options = {}) {
    let lastStatus = 0;
    let lastHtml = '';
    let directError = null;
    try {
      const response = await fetch(url, { headers: CHANNEL_HEADERS, credentials: 'omit' });
      lastStatus = response?.status || 0;
      const isConsent = Boolean(response?.url && response.url.includes('consent.youtube.'));
      if (response?.ok && !isConsent) {
        lastHtml = await response.text();
        if (lastHtml && (ChannelPageParser.extractBalancedInitialData(lastHtml) || typeof options.pageFetcher !== 'function')) {
          return { ok: true, status: lastStatus || 200, html: lastHtml, url: response.url || url };
        }
      }
    } catch (err) {
      directError = err;
    }

    if (typeof options.pageFetcher === 'function') {
      try {
        const tabRes = await options.pageFetcher(url);
        if (tabRes?.ok && typeof tabRes.html === 'string' && tabRes.html.length > 0) {
          return { ok: true, status: tabRes.status || 200, html: tabRes.html, url: tabRes.url || url };
        }
      } catch (_) {}
    }

    if (!lastHtml && !String(url).includes('ucbcb=')) {
      try {
        const sep = String(url).includes('?') ? '&' : '?';
        const retry = await fetch(`${url}${sep}ucbcb=1`, { headers: CHANNEL_HEADERS, credentials: 'omit' });
        if (retry?.ok && !retry.url?.includes('consent.youtube.')) {
          const retryHtml = await retry.text();
          if (retryHtml && ChannelPageParser.extractBalancedInitialData(retryHtml)) {
            return { ok: true, status: retry.status || 200, html: retryHtml, url: retry.url || url };
          }
        }
      } catch (_) {}
    }

    if (lastStatus >= 400) return { ok: false, status: lastStatus, html: '', url };
    if (directError && !lastHtml) throw directError;
    return { ok: Boolean(lastHtml), status: lastStatus || 200, html: lastHtml, url };
  }

  /**
   * Fetches one continuation batch directly from InnerTube browse API.
   * @returns {Promise<{ ok: boolean, status: number, items: Array<Object> }>}
   */
  static async fetchBrowseContinuationResult(apiKey, clientVersion, continuation, visitorData = '') {
    try {
      const client = { clientName: 'WEB', clientVersion: clientVersion || '2.20260101.00.00', hl: 'fr', gl: 'FR' };
      if (visitorData) client.visitorData = visitorData;
      const headers = { 'Content-Type': 'application/json' };
      if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;
      const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', credentials: 'omit', headers, body: JSON.stringify({ context: { client }, continuation })
      });
      if (!res.ok) return { ok: false, status: res.status, items: [] };
      const json = await res.json();
      const items = [];
      for (const action of (json.onResponseReceivedActions || [])) {
        const batch = action.appendContinuationItemsAction?.continuationItems || action.reloadContinuationItemsCommand?.continuationItems;
        if (Array.isArray(batch)) items.push(...batch);
      }
      return { ok: true, status: 200, items };
    } catch (_) {
      return { ok: false, status: 0, items: [] };
    }
  }
}

export default ChannelHttpClient;
