const ASSET_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|ico|pdf|zip|tar|gz|mp[34]|webm|wav|css|js|mjs|woff2?|ttf|eot|xml|json)$/i;
const MAX_EXCERPT_CHARS = 2000;

/**
 * Fetches domain-level transparency signals (homepage identity, robots.txt, sitemap,
 * and deduplicated multi-depth BFS discovery of structural navigation/footer pages).
 * Language-agnostic and strictly read-only: GET only, credentials omitted, zero form
 * submissions, zero hardcoded keyword/path lists, and query-string URLs excluded.
 */
export class DomainAuditFetcher {
  static normalizeUrlKey(rawUrl, cleanOrigin) {
    try {
      const u = new URL(rawUrl, cleanOrigin);
      if (u.origin !== cleanOrigin || !/^https?:$/i.test(u.protocol)) return '';
      if (u.search) return '';
      if (ASSET_EXT_RE.test(u.pathname)) return '';
      const path = u.pathname.replace(/\/+$/, '') || '/';
      return `${u.origin}${path}`;
    } catch (_) {
      return '';
    }
  }

  static async fetchTextSafe(url, fetchFn = fetch, timeoutMs = 3500) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetchFn(url, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'follow',
        signal: controller?.signal
      });
      if (!res?.ok) return { ok: false, status: res?.status || 0, url: res?.url || url, text: '' };
      const ctype = res.headers?.get?.('content-type') || '';
      if (ctype && !/(?:text\/|application\/(?:xhtml\+xml|xml))/i.test(ctype)) {
        return { ok: false, status: res.status, url: res?.url || url, text: '' };
      }
      const rawText = await res.text();
      return { ok: true, status: res.status, url: res?.url || url, text: rawText.slice(0, 262144) };
    } catch (_) {
      return { ok: false, status: 0, url, text: '' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  static _htmlToCleanText(html = '') {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<(?:br|p|div|li|tr|h[1-6]|section|article)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  static extractStructuredHtml(html = '') {
    const raw = String(html || '');
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

    const headerParts = (raw.match(/<(?:header|nav)\b[\s\S]*?<\/(?:header|nav)>/gi) || [])
      .map((b) => DomainAuditFetcher._htmlToCleanText(b))
      .filter(Boolean);
    const footerParts = (raw.match(/<footer\b[\s\S]*?<\/footer>/gi) || [])
      .map((b) => DomainAuditFetcher._htmlToCleanText(b))
      .filter(Boolean);

    const withoutChrome = raw
      .replace(/<(?:header|nav|footer)\b[\s\S]*?<\/(?:header|nav|footer)>/gi, ' ');
    const mainMatch = /<(?:main|article)\b[\s\S]*?<\/(?:main|article)>/i.exec(withoutChrome);
    const mainText = DomainAuditFetcher._htmlToCleanText(mainMatch ? mainMatch[0] : withoutChrome);

    return {
      title,
      header: headerParts.join(' | ').slice(0, 700),
      footer: footerParts.join(' | ').slice(0, 700),
      mainText
    };
  }

  static deduplicateText(text = '', seenBlocks = new Set()) {
    const lines = String(text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const kept = [];
    for (const line of lines) {
      const norm = line.toLowerCase().replace(/\s+/g, ' ');
      if (norm.length >= 35) {
        if (seenBlocks.has(norm)) continue;
        seenBlocks.add(norm);
      }
      kept.push(line);
    }
    return kept.join('\n').slice(0, MAX_EXCERPT_CHARS);
  }

  static stripHtmlToText(html = '') {
    const structured = DomainAuditFetcher.extractStructuredHtml(html);
    return { title: structured.title, excerpt: structured.mainText.slice(0, MAX_EXCERPT_CHARS) };
  }

  static extractSignalsFromHtml(html = '', cleanOrigin = '') {
    const navUrls = [];
    const contacts = new Set();
    const semanticBlocks = html.match(/<(?:footer|nav|header)\b[\s\S]*?<\/(?:footer|nav|header)>/gi);
    const targetHtml = semanticBlocks && semanticBlocks.length > 0 ? semanticBlocks.join('\n') : html;

    const linkRe = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
    let m;
    while ((m = linkRe.exec(targetHtml)) !== null) {
      const raw = m[1].trim();
      if (/^(mailto:|tel:)/i.test(raw)) {
        contacts.add(raw.slice(0, 80));
        continue;
      }
      const key = DomainAuditFetcher.normalizeUrlKey(raw, cleanOrigin);
      if (key && !navUrls.includes(key)) navUrls.push(key);
      if (navUrls.length >= 12 && contacts.size >= 5) break;
    }

    if (targetHtml !== html && contacts.size < 5) {
      const contactRe = /href\s*=\s*["']((?:mailto:|tel:)[^"']+)["']/gi;
      while ((m = contactRe.exec(html)) !== null) {
        contacts.add(m[1].trim().slice(0, 80));
        if (contacts.size >= 5) break;
      }
    }
    return { legalUrls: navUrls, contacts: Array.from(contacts).slice(0, 5) };
  }

  static extractSitemapUrls(sitemapXml = '', cleanOrigin = '') {
    const urls = [];
    const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
    let m;
    while ((m = locRe.exec(sitemapXml)) !== null) {
      const key = DomainAuditFetcher.normalizeUrlKey(m[1], cleanOrigin);
      if (key && !urls.includes(key)) urls.push(key);
      if (urls.length >= 10) break;
    }
    return urls;
  }

  /**
   * Collects root homepage, robots.txt, sitemap.xml, and deduplicated multi-level structural pages.
   * Never re-fetches or re-analyzes an already visited URL.
   * @param {Object} params
   */
  static async collectDomainDossier({ origin, hostname = '', currentUrl = '', knownLegalLinks = [], maxDepth = 2, fetchFn = fetch }) {
    if (!origin || !/^https?:\/\//i.test(origin)) {
      return { origin: '', hostname, maxDepth: 1, hasRobotsTxt: false, sitemapUrlCount: 0, contacts: [], home: null, legalPages: [] };
    }

    const depthLimit = Math.max(1, Math.min(4, parseInt(maxDepth, 10) || 2));
    const maxPagesTotal = depthLimit * 4;
    const cleanOrigin = origin.replace(/\/+$/, '');
    const visited = new Set();

    const currentKey = currentUrl ? DomainAuditFetcher.normalizeUrlKey(currentUrl, cleanOrigin) : '';
    if (currentKey) visited.add(currentKey);
    const homeKey = DomainAuditFetcher.normalizeUrlKey(`${cleanOrigin}/`, cleanOrigin);
    if (homeKey) visited.add(homeKey);

    const [homeRes, robotsRes, sitemapRes] = await Promise.all([
      DomainAuditFetcher.fetchTextSafe(`${cleanOrigin}/`, fetchFn),
      DomainAuditFetcher.fetchTextSafe(`${cleanOrigin}/robots.txt`, fetchFn),
      DomainAuditFetcher.fetchTextSafe(`${cleanOrigin}/sitemap.xml`, fetchFn)
    ]);

    const allContacts = new Set();
    const enqueueUnique = (rawUrls, queue) => {
      for (const raw of rawUrls) {
        const key = DomainAuditFetcher.normalizeUrlKey(raw, cleanOrigin);
        if (key && !visited.has(key)) {
          visited.add(key);
          queue.push(key);
        }
      }
    };

    let frontier = [];
    enqueueUnique((knownLegalLinks || []).map((l) => l?.url).filter(Boolean), frontier);
    if (homeRes.ok && homeRes.text) {
      const hs = DomainAuditFetcher.extractSignalsFromHtml(homeRes.text, cleanOrigin);
      hs.contacts.forEach((c) => allContacts.add(c));
      enqueueUnique(hs.legalUrls, frontier);
    }
    if (sitemapRes.ok && sitemapRes.text) {
      enqueueUnique(DomainAuditFetcher.extractSitemapUrls(sitemapRes.text, cleanOrigin), frontier);
    }

    const seenBlocks = new Set();
    const homeParsed = homeRes.ok && homeRes.text ? DomainAuditFetcher.extractStructuredHtml(homeRes.text) : null;
    const siteChrome = homeParsed
      ? { header: homeParsed.header, footer: homeParsed.footer }
      : { header: '', footer: '' };
    const home = homeParsed
      ? { url: homeRes.url, title: homeParsed.title, excerpt: DomainAuditFetcher.deduplicateText(homeParsed.mainText, seenBlocks) }
      : null;

    const legalPages = [];
    for (let depth = 1; depth <= depthLimit && frontier.length > 0 && legalPages.length < maxPagesTotal; depth += 1) {
      const batch = frontier.slice(0, Math.min(4, maxPagesTotal - legalPages.length));
      const results = await Promise.all(batch.map((u) => DomainAuditFetcher.fetchTextSafe(u, fetchFn)));
      const nextFrontier = [];

      for (const r of results) {
        if (!r.ok || !r.text) continue;
        const parsed = DomainAuditFetcher.extractStructuredHtml(r.text);
        const dedupedMain = DomainAuditFetcher.deduplicateText(parsed.mainText, seenBlocks);
        const diffNotes = [];
        if (parsed.header && parsed.header !== siteChrome.header) diffNotes.push(`[Changed Header]: ${parsed.header}`);
        if (parsed.footer && parsed.footer !== siteChrome.footer) diffNotes.push(`[Changed Footer]: ${parsed.footer}`);
        const excerpt = [dedupedMain, ...diffNotes].filter(Boolean).join('\n').slice(0, MAX_EXCERPT_CHARS);

        legalPages.push({ url: r.url, depth, title: parsed.title, excerpt });
        if (depth < depthLimit) {
          const sig = DomainAuditFetcher.extractSignalsFromHtml(r.text, cleanOrigin);
          sig.contacts.forEach((c) => allContacts.add(c));
          enqueueUnique(sig.legalUrls, nextFrontier);
        }
      }
      frontier = nextFrontier;
    }

    const sitemapUrlCount = sitemapRes.ok && sitemapRes.text ? (sitemapRes.text.match(/<loc>/gi) || []).length : 0;

    return {
      origin: cleanOrigin,
      hostname: hostname || new URL(cleanOrigin).hostname,
      maxDepth: depthLimit,
      visitedCount: visited.size,
      hasRobotsTxt: Boolean(robotsRes.ok && robotsRes.text?.trim()),
      sitemapUrlCount,
      contacts: Array.from(allContacts).slice(0, 6),
      siteChrome,
      home,
      legalPages
    };
  }
}

export default DomainAuditFetcher;
