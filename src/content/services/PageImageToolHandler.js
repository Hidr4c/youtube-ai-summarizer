import { PageImageExtractor } from './PageImageExtractor.js';

const MAX_TOOL_FRAMES = 8;
const LAZY_WAIT_MS = 2500;

export class PageImageToolHandler {
  static parseArgs(arg = '') {
    const raw = String(arg || '').trim().toLowerCase();
    if (!raw || raw === 'next' || raw === 'all' || raw === 'more') {
      return { mode: 'next', imageStart: null, imageEnd: null, sliceStart: null, sliceEnd: null };
    }
    const imgMatch = /images?\s*=\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(raw);
    const sliceMatch = /slices?\s*=\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(raw);
    const bareRange = !imgMatch && !sliceMatch ? /^(\d+)(?:\s*-\s*(\d+))?$/.exec(raw) : null;
    const iStart = imgMatch ? parseInt(imgMatch[1], 10) : (bareRange ? parseInt(bareRange[1], 10) : null);
    const iEnd = imgMatch ? parseInt(imgMatch[2] || imgMatch[1], 10) : (bareRange ? parseInt(bareRange[2] || bareRange[1], 10) : iStart);
    const sStart = sliceMatch ? parseInt(sliceMatch[1], 10) : null;
    const sEnd = sliceMatch ? parseInt(sliceMatch[2] || sliceMatch[1], 10) : sStart;
    return { mode: iStart ? 'target' : 'next', imageStart: iStart, imageEnd: iEnd, sliceStart: sStart, sliceEnd: sEnd };
  }

  static async _ensureImageLoaded(img) {
    if (!img) return false;
    if (img.complete && img.naturalWidth >= 48 && img.naturalHeight >= 48) return true;
    try {
      if ('loading' in img) img.loading = 'eager';
    } catch (_) {}
    if (typeof img.decode === 'function') {
      try {
        await Promise.race([img.decode(), new Promise((r) => setTimeout(r, LAZY_WAIT_MS))]);
        if (img.complete && img.naturalWidth >= 48 && img.naturalHeight >= 48) return true;
      } catch (_) {}
    }
    if (typeof img.addEventListener !== 'function') return Boolean(img.complete && img.naturalWidth >= 48);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve(Boolean(img.complete && img.naturalWidth >= 48 && img.naturalHeight >= 48));
      };
      const timer = setTimeout(finish, LAZY_WAIT_MS);
      img.addEventListener('load', () => { clearTimeout(timer); finish(); }, { once: true });
      img.addEventListener('error', () => { clearTimeout(timer); finish(); }, { once: true });
    });
  }

  static async _fetchSafeDrawable(url) {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage || typeof Image === 'undefined') return null;
    const res = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'FETCH_SAFE_IMAGE', url }, (r) => resolve(r || null));
    });
    if (!res?.success || !res?.dataUrl) return null;
    return new Promise((resolve) => {
      const proxy = new Image();
      proxy.onload = () => resolve(proxy);
      proxy.onerror = () => resolve(null);
      proxy.src = res.dataUrl;
    });
  }

  static _buildFrame(doc, drawable, item, slice, sliceNum, totalSlices, totalPageImages) {
    const w = drawable.naturalWidth || item.naturalWidth || 1;
    const h = drawable.naturalHeight || item.naturalHeight || 1;
    const dataUrl = PageImageExtractor.renderSliceToDataUrl(doc, drawable, w, h, slice, 1024);
    if (!dataUrl) return null;
    const label = totalSlices > 1
      ? `Page Image #${item.index}/${totalPageImages} — Slice ${sliceNum}/${totalSlices} (${slice.rangeLabel})`
      : `Page Image #${item.index}/${totalPageImages} (${slice.rangeLabel})`;
    return {
      name: totalSlices > 1 ? `page_img_${item.index}_slice_${sliceNum}.jpg` : `page_img_${item.index}.jpg`,
      mimeType: 'image/jpeg',
      dataUrl,
      imageIndex: item.index,
      totalPageImages,
      sliceIndex: sliceNum,
      totalSlices,
      rangeLabel: slice.rangeLabel,
      alt: item.alt || '',
      label
    };
  }

  static async execute(controller, arg, pageData, doc = typeof document !== 'undefined' ? document : null) {
    const inventory = Array.isArray(pageData?.imageInventory) && pageData.imageInventory.length > 0
      ? pageData.imageInventory
      : PageImageExtractor.scanPageImages(doc);
    if (inventory.length === 0 || !doc) return { frames: [], summary: 'No inspectable images found on this page.' };

    const parsed = PageImageToolHandler.parseArgs(arg);
    const delivered = controller.deliveredImageSlices || (controller.deliveredImageSlices = new Set());
    const targets = parsed.mode === 'target'
      ? inventory.filter((it) => it.index >= parsed.imageStart && it.index <= parsed.imageEnd)
      : inventory;

    const frames = [];
    for (const item of targets) {
      if (frames.length >= MAX_TOOL_FRAMES) break;
      await PageImageToolHandler._ensureImageLoaded(item.el);
      const loadedNow = Boolean(item.el?.complete && item.el?.naturalWidth >= 48 && item.el?.naturalHeight >= 48);
      let drawable = loadedNow ? item.el : null;
      let w = drawable?.naturalWidth || item.naturalWidth || 0;
      let h = drawable?.naturalHeight || item.naturalHeight || 0;
      if (!drawable && item.src) {
        drawable = await PageImageToolHandler._fetchSafeDrawable(item.src);
        w = drawable?.naturalWidth || 0;
        h = drawable?.naturalHeight || 0;
      }
      if (!drawable || w < 48 || h < 48) continue;

      item.loaded = true;
      item.naturalWidth = w;
      item.naturalHeight = h;
      const slices = PageImageExtractor.computeSlicePlan(w, h);
      item.slicePlan = slices;
      item.totalSlices = slices.length;

      for (let sIdx = 0; sIdx < slices.length; sIdx += 1) {
        if (frames.length >= MAX_TOOL_FRAMES) break;
        const sliceNum = sIdx + 1;
        if (parsed.sliceStart !== null && (sliceNum < parsed.sliceStart || sliceNum > parsed.sliceEnd)) continue;
        const key = `${item.index}:${sliceNum}`;
        if (parsed.mode === 'next' && delivered.has(key)) continue;

        let frame = null;
        try {
          frame = PageImageToolHandler._buildFrame(doc, drawable, item, slices[sIdx], sliceNum, slices.length, inventory.length);
        } catch (_) {
          drawable = item.src ? await PageImageToolHandler._fetchSafeDrawable(item.src) : null;
          if (drawable) {
            try {
              frame = PageImageToolHandler._buildFrame(doc, drawable, item, slices[sIdx], sliceNum, slices.length, inventory.length);
            } catch (_) { frame = null; }
          }
        }
        if (frame) {
          delivered.add(key);
          frames.push(frame);
        } else {
          break;
        }
      }
    }

    const summary = frames.length > 0
      ? `Delivered ${frames.length} frame(s): ${frames.map((f) => f.label).join('; ')}`
      : 'No additional unloaded or remaining image slices could be captured.';
    controller.inspectedImages = { frames, summary };
    return controller.inspectedImages;
  }
}

export default PageImageToolHandler;
