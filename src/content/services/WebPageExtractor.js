import { WebThreatDetector } from './WebThreatDetector.js';
import { extractAllVideoIdsFromText } from '../ui/NavigationObserver.js';
import { PageImageExtractor } from './PageImageExtractor.js';

const MAX_PAGE_TEXT_CHARS = 30000;

/**
 * Extracts readable page content, sanitized rendered images, and anti-phishing /
 * threat signals from any standard web page outside YouTube.
 */
export class WebPageExtractor {
  /**
   * Analyzes URL and DOM security/spoofing/phishing indicators.
   * @param {string} urlString
   * @param {Document} [doc]
   * @returns {Object}
   */
  static analyzeUrlSecurity(urlString, doc = typeof document !== 'undefined' ? document : null) {
    let parsed = null;
    try {
      parsed = new URL(urlString);
    } catch (_) {
      return { url: String(urlString || ''), hostname: '', protocol: '', warnings: ['Invalid URL format'], riskLevel: 'high' };
    }
    return WebThreatDetector.inspectUrl(parsed, doc);
  }

  /**
   * Safely re-encodes already-rendered DOM images through an offscreen canvas (pixel-only JPEG),
   * prioritizing main-content images and slicing tall/wide strips. Never fetches raw files.
   * @param {Document} doc
   * @param {number|Object} [maxImages=8]
   * @param {Array} [inventory]
   * @returns {Array<{ name: string, mimeType: string, dataUrl: string }>}
   */
  static extractSafeCanvasImages(doc, maxImages = 8, inventory = null) {
    return PageImageExtractor.extractSafeCanvasImages(doc, maxImages, inventory);
  }

  /**
   * Extracts structured metadata, navigation links, safe images, and clean main text from a web page.
   * @param {Document} [doc]
   * @param {string} [urlOverride]
   * @returns {Object}
   */
  static extractPageContent(doc = typeof document !== 'undefined' ? document : null, urlOverride = '') {
    const url = urlOverride || (typeof window !== 'undefined' ? window.location?.href : '') || '';
    const securityReport = WebPageExtractor.analyzeUrlSecurity(url, doc);
    if (!doc) return { ...securityReport, title: '', description: '', author: '', text: '', legalLinks: [], imageInventory: [], safeImages: [], youtubeVideos: [], wordCount: 0 };

    const title = (doc.title || '').trim();
    const description = (doc.querySelector?.('meta[name="description"], meta[property="og:description"]')?.getAttribute?.('content') || '').trim();
    const author = (doc.querySelector?.('meta[name="author"]')?.getAttribute?.('content') || '').trim();
    const canonical = (doc.querySelector?.('link[rel="canonical"]')?.getAttribute?.('href') || '').trim();

    const legalLinks = [];
    const seenHref = new Set();
    if (doc.querySelectorAll) {
      const navNodes = Array.from(doc.querySelectorAll('footer a[href], nav a[href], header a[href]') || []);
      const linkNodes = navNodes.length > 0 ? navNodes : Array.from(doc.querySelectorAll('a[href]') || []);
      for (const a of linkNodes) {
        const label = (a.textContent || '').trim();
        const href = a.getAttribute?.('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
        try {
          const absUrl = new URL(href, url || 'https://example.com');
          if (absUrl.origin !== securityReport.origin || absUrl.search) continue;
          const cleanHref = `${absUrl.origin}${absUrl.pathname}`;
          if (!seenHref.has(cleanHref)) {
            seenHref.add(cleanHref);
            legalLinks.push({ label: label.slice(0, 60) || cleanHref, url: cleanHref });
          }
        } catch (_) {}
        if (legalLinks.length >= 8) break;
      }
    }

    const root = doc.querySelector?.('article, main, [role="main"]') || doc.body;
    let rawText = WebPageExtractor._extractCleanText(root);
    if (root && root !== doc.body && doc.querySelector) {
      const footer = doc.querySelector('footer');
      if (footer && (!root.contains || !root.contains(footer))) {
        const footerTxt = WebPageExtractor._extractCleanText(footer);
        if (footerTxt && !rawText.includes(footerTxt)) rawText = `${rawText}\n\n${footerTxt}`;
      }
    }
    const text = rawText.length > MAX_PAGE_TEXT_CHARS
      ? `${rawText.slice(0, MAX_PAGE_TEXT_CHARS)}\n... [truncated]`
      : rawText;
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

    const imageInventory = PageImageExtractor.scanPageImages(doc);
    return {
      ...securityReport,
      title,
      description,
      author,
      canonical,
      legalLinks,
      imageInventory,
      safeImages: PageImageExtractor.extractSafeCanvasImages(doc, 8, imageInventory),
      youtubeVideos: WebPageExtractor.extractYoutubeVideos(doc, 5),
      text,
      wordCount
    };
  }

  static extractYoutubeVideos(doc, maxVideos = 5) {
    if (!doc?.querySelectorAll) return [];
    const seen = new Set();
    const videos = [];
    const nodes = Array.from(doc.querySelectorAll('iframe[src], a[href]') || []);
    for (const el of nodes) {
      const raw = String(el.getAttribute?.('src') || el.getAttribute?.('href') || '');
      if (!/youtu\.?be/i.test(raw)) continue;
      for (const id of extractAllVideoIdsFromText(raw)) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        videos.push({ videoId: id, url: `https://www.youtube.com/watch?v=${id}`, title: (el.getAttribute?.('title') || el.textContent || '').trim().slice(0, 80) });
        if (videos.length >= maxVideos) return videos;
      }
    }
    return videos;
  }

  static _extractCleanText(root) {
    if (!root) return '';
    if (typeof root.cloneNode !== 'function') return String(root.innerText || root.textContent || '').trim();
    const clone = root.cloneNode(true);
    clone.querySelectorAll?.('script, style, noscript, svg, #yt-ai-summarizer-container').forEach((n) => n.remove?.());
    return String(clone.innerText || clone.textContent || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export default WebPageExtractor;
