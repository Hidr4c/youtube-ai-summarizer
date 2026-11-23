/**
 * Scans, prioritizes, slices (for tall/wide strips), and re-encodes rendered
 * DOM images through an offscreen canvas with structural metadata for Vision LLMs.
 */
const DEFAULT_MAX_EDGE = 1024;
const DEFAULT_SLICE_OVERLAP = 80;
const CHROME_SELECTOR = 'header, footer, nav, aside, [role="banner"], [role="navigation"], [role="contentinfo"]';
const MAIN_SELECTOR = 'main, article, [role="main"]';

export class PageImageExtractor {
  static computeSlicePlan(width, height) {
    const w = Math.max(1, Math.round(Number(width) || 0));
    const h = Math.max(1, Math.round(Number(height) || 0));
    if (h / w >= 2.1 && h > 1200) {
      const sliceH = Math.min(1450, Math.max(Math.round(w * 2.0), 1000));
      const step = Math.max(200, sliceH - DEFAULT_SLICE_OVERLAP);
      const slices = [];
      for (let y = 0; y < h; y += step) {
        const sy = y > 0 && h - y <= Math.round(sliceH * 0.25) ? Math.max(0, h - sliceH) : y;
        const sh = Math.min(sliceH, h - sy);
        slices.push({ sx: 0, sy, sw: w, sh, axis: 'vertical', rangeLabel: `y=${sy}..${sy + sh}/${h}px` });
        if (sy + sh >= h) break;
      }
      return slices;
    }
    if (w / h >= 2.8 && w > 1800) {
      const sliceW = Math.min(1450, Math.max(Math.round(h * 2.0), 1000));
      const step = Math.max(200, sliceW - DEFAULT_SLICE_OVERLAP);
      const slices = [];
      for (let x = 0; x < w; x += step) {
        const sx = x > 0 && w - x <= Math.round(sliceW * 0.25) ? Math.max(0, w - sliceW) : x;
        const sw = Math.min(sliceW, w - sx);
        slices.push({ sx, sy: 0, sw, sh: h, axis: 'horizontal', rangeLabel: `x=${sx}..${sx + sw}/${w}px` });
        if (sx + sw >= w) break;
      }
      return slices;
    }
    return [{ sx: 0, sy: 0, sw: w, sh: h, axis: 'full', rangeLabel: `${w}x${h}px` }];
  }

  static _classifyZone(img) {
    if (typeof img?.closest !== 'function') return 'main';
    if (img.closest('#yt-ai-summarizer-container, #yt-ai-channel-companion')) return 'ignore';
    const inMain = Boolean(img.closest(MAIN_SELECTOR));
    const inChrome = Boolean(img.closest(CHROME_SELECTOR));
    if (inMain && !img.closest('header, footer, nav')) return 'main';
    if (inChrome) return 'chrome';
    const w = img.naturalWidth || img.width || img.clientWidth || 0;
    const h = img.naturalHeight || img.height || img.clientHeight || 0;
    const loadingAttr = String(img?.getAttribute?.('loading') || '').toLowerCase();
    return w >= 220 || h >= 220 || loadingAttr === 'lazy' ? 'main' : 'body';
  }

  static scanPageImages(doc) {
    if (!doc?.querySelectorAll) return [];
    const raw = Array.from(doc.querySelectorAll('img') || []);
    const candidates = [];
    raw.forEach((img, domOrder) => {
      const src = String(img?.currentSrc || img?.src || img?.getAttribute?.('src') || '');
      if (!src || /\.svg(?:$|\?)|^data:image\/svg\+xml/i.test(src)) return;
      const zone = PageImageExtractor._classifyZone(img);
      if (zone === 'ignore') return;
      const loaded = Boolean(img?.complete && img?.naturalWidth >= 48 && img?.naturalHeight >= 48);
      const attrW = Number(img?.getAttribute?.('width') || img?.clientWidth || 0);
      const attrH = Number(img?.getAttribute?.('height') || img?.clientHeight || 0);
      const loadingAttr = String(img?.getAttribute?.('loading') || '').toLowerCase();
      const likelyLazyContent = !img?.complete && (zone === 'main' || loadingAttr === 'lazy' || attrW >= 120 || attrH >= 120);
      if (!loaded && !likelyLazyContent) return;
      if (loaded && zone === 'chrome' && Math.max(img.naturalWidth, img.naturalHeight) < 64) return;
      const w = img.naturalWidth || attrW || 0;
      const h = img.naturalHeight || attrH || 0;
      const slices = loaded ? PageImageExtractor.computeSlicePlan(w, h) : [];
      candidates.push({
        el: img,
        domOrder,
        src,
        alt: String(img?.alt || img?.getAttribute?.('alt') || '').trim().slice(0, 80),
        naturalWidth: w,
        naturalHeight: h,
        loaded,
        lazy: loadingAttr === 'lazy' || !loaded,
        zone,
        slicePlan: slices,
        totalSlices: slices.length || 1,
        isOversized: slices.length > 1
      });
    });

    const rank = { main: 0, body: 1, chrome: 2 };
    candidates.sort((a, b) => (rank[a.zone] ?? 1) - (rank[b.zone] ?? 1) || a.domOrder - b.domOrder);
    return candidates.map((item, idx) => ({ ...item, index: idx + 1 }));
  }

  static renderSliceToDataUrl(doc, drawable, srcW, srcH, slice, maxEdge = DEFAULT_MAX_EDGE) {
    if (!doc?.createElement) return null;
    const sw = Math.max(1, Math.round(slice?.sw || srcW));
    const sh = Math.max(1, Math.round(slice?.sh || srcH));
    const sx = Math.max(0, Math.round(slice?.sx || 0));
    const sy = Math.max(0, Math.round(slice?.sy || 0));
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const canvas = doc.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return null;
    if (sx === 0 && sy === 0 && sw === srcW && sh === srcH) {
      ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(drawable, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    return dataUrl && dataUrl.startsWith('data:image/jpeg;base64,') ? dataUrl : null;
  }

  static extractSafeCanvasImages(doc, maxFramesOrOpts = 8, existingInventory = null) {
    const opts = typeof maxFramesOrOpts === 'number'
      ? { maxFrames: maxFramesOrOpts }
      : (maxFramesOrOpts || {});
    const maxFrames = Math.max(1, opts.maxFrames || 8);
    const maxEdge = opts.maxEdge || DEFAULT_MAX_EDGE;
    const inventory = Array.isArray(existingInventory) ? existingInventory : PageImageExtractor.scanPageImages(doc);
    const results = [];

    for (const item of inventory) {
      if (results.length >= maxFrames) break;
      if (!item.loaded) continue;
      const slices = item.slicePlan.length > 0
        ? item.slicePlan
        : [{ sx: 0, sy: 0, sw: item.naturalWidth, sh: item.naturalHeight, axis: 'full', rangeLabel: `${item.naturalWidth}x${item.naturalHeight}px` }];
      for (let sIdx = 0; sIdx < slices.length; sIdx += 1) {
        if (results.length >= maxFrames) break;
        const slice = slices[sIdx];
        try {
          const dataUrl = PageImageExtractor.renderSliceToDataUrl(doc, item.el, item.naturalWidth, item.naturalHeight, slice, maxEdge);
          if (!dataUrl) continue;
          const totalSlices = slices.length;
          const sliceNum = sIdx + 1;
          const label = totalSlices > 1
            ? `Page Image #${item.index}/${inventory.length} — Slice ${sliceNum}/${totalSlices} (${slice.rangeLabel})`
            : `Page Image #${item.index}/${inventory.length} (${slice.rangeLabel})`;
          results.push({
            name: totalSlices > 1 ? `page_img_${item.index}_slice_${sliceNum}.jpg` : `page_img_${results.length + 1}.jpg`,
            mimeType: 'image/jpeg',
            dataUrl,
            imageIndex: item.index,
            totalPageImages: inventory.length,
            sliceIndex: sliceNum,
            totalSlices,
            rangeLabel: slice.rangeLabel,
            alt: item.alt,
            label
          });
        } catch (_) {
          break; // Cross-origin tainted canvas: handled asynchronously on tool request
        }
      }
    }
    return results;
  }

  static formatInventoryPrompt(inventory = [], attachedFrames = [], inspectedSummary = '') {
    if (!Array.isArray(inventory) || inventory.length === 0) return '';
    const lines = [
      `=== PAGE IMAGES & SLICING INVENTORY (${inventory.length} detected, ${attachedFrames.length} attached in this turn) ===`,
      'IMPORTANT: Oversized tall/wide images are automatically sliced into consecutive overlapping crops (~80px overlap so cut lines remain readable).'
    ];
    for (const item of inventory.slice(0, 30)) {
      const dims = item.naturalWidth > 0 ? `${item.naturalWidth}x${item.naturalHeight}` : 'unloaded lazy size';
      const status = item.loaded ? (item.totalSlices > 1 ? `loaded, SPLIT INTO ${item.totalSlices} SLICES` : 'loaded') : 'lazy/unloaded (needs INSPECT_PAGE_IMAGES)';
      const altTxt = item.alt ? ` | alt="${item.alt}"` : '';
      lines.push(`- Page Image #${item.index} (${dims}, zone=${item.zone}, ${status})${altTxt}`);
    }
    if (inventory.length > 30) lines.push(`- ... and ${inventory.length - 30} more page images.`);
    if (attachedFrames.length > 0) {
      lines.push('Sequence of attached images in this request (1-to-1 order):');
      attachedFrames.forEach((f, idx) => {
        const desc = f.label || f.name || `Image ${idx + 1}`;
        const altSuffix = f.alt ? ` | alt="${f.alt}"` : '';
        lines.push(`  ${idx + 1}. ${desc}${altSuffix}`);
      });
    }
    if (inspectedSummary) lines.push(`Last Inspection Batch: ${inspectedSummary}`);
    return lines.join('\n');
  }
}

export default PageImageExtractor;
