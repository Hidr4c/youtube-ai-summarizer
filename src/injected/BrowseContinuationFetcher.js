/**
 * Same-origin InnerTube browse continuation proxy executed inside YouTube Main World.
 * Ensures continuation requests carry authentic page Origin and credentials instead of
 * chrome-extension:// background origin (which YouTube InnerTube rejects with HTTP 403).
 */
export class BrowseContinuationFetcher {
  /**
   * Dispatches Main World InnerTube continuation or same-origin channel HTML requests.
   * @param {Object} params
   * @returns {Promise<{ok: boolean, status: number, items: Array<Object>, html?: string, url?: string}>}
   */
  static async fetchPage(params = {}) {
    if (params?.mode === 'html') {
      return this.fetchHtmlPage(params);
    }
    const { apiKey, clientVersion, continuation, visitorData } = params || {};
    try {
      const cfgKey = apiKey || window.ytcfg?.get?.('INNERTUBE_API_KEY') || '';
      if (!cfgKey || !continuation) {
        return { ok: false, status: 400, items: [] };
      }

      const resolvedVersion = clientVersion || window.ytcfg?.get?.('INNERTUBE_CLIENT_VERSION') || '2.20260101.00.00';
      const resolvedVisitor = visitorData || window.ytcfg?.get?.('VISITOR_DATA') || '';
      const client = {
        clientName: 'WEB',
        clientVersion: resolvedVersion,
        hl: 'fr',
        gl: 'FR'
      };
      if (resolvedVisitor) client.visitorData = resolvedVisitor;

      const origin = (typeof window !== 'undefined' && window.location?.origin?.includes('youtube.com'))
        ? window.location.origin
        : 'https://www.youtube.com';

      const headers = {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': resolvedVersion
      };
      if (resolvedVisitor) headers['X-Goog-Visitor-Id'] = resolvedVisitor;

      const res = await fetch(`${origin}/youtubei/v1/browse?key=${encodeURIComponent(cfgKey)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ context: { client }, continuation }),
        credentials: 'include'
      });

      if (!res.ok) {
        return { ok: false, status: res.status, items: [] };
      }

      const json = await res.json().catch(() => null);
      const items = [];
      for (const action of (json?.onResponseReceivedActions || [])) {
        const batch = action.appendContinuationItemsAction?.continuationItems || action.reloadContinuationItemsCommand?.continuationItems;
        if (Array.isArray(batch)) items.push(...batch);
      }
      return { ok: true, status: 200, items };
    } catch (_) {
      return { ok: false, status: 0, items: [] };
    }
  }

  /**
   * Fetches same-origin YouTube channel or search HTML directly in Main World.
   * @param {Object} params
   * @returns {Promise<{ok: boolean, status: number, url: string, html: string, items: Array<Object>}>}
   */
  static async fetchHtmlPage({ url } = {}) {
    try {
      const origin = (typeof window !== 'undefined' && window.location?.origin?.includes('youtube.com'))
        ? window.location.origin
        : 'https://www.youtube.com';
      const parsed = new URL(String(url || ''), origin);
      if (!/(^|\.)youtube\.com$/i.test(parsed.hostname)) {
        return { ok: false, status: 400, url: '', html: '', items: [] };
      }
      const res = await fetch(`${origin}${parsed.pathname}${parsed.search}`, { credentials: 'include' });
      const finalUrl = res.url || '';
      const isConsent = finalUrl.includes('consent.youtube.');
      const html = (res.ok && !isConsent) ? await res.text() : '';
      return { ok: Boolean(res.ok && !isConsent && html), status: res.status || 0, url: finalUrl, html, items: [] };
    } catch (_) {
      return { ok: false, status: 0, url: '', html: '', items: [] };
    }
  }
}

export default BrowseContinuationFetcher;
