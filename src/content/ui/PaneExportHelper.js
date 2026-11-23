import { ExportHandler } from '../services/ExportHandler.js';
import { I18N } from '../../locales/index.js';

/**
 * Binds standardized Copy and Export (.md, .txt, .json) controls to any analysis pane.
 */
export class PaneExportHelper {
  static bind({ root = document, prefix, copyBtnId, getPayload, bannerView, getLang }) {
    const byId = (id) => (root.getElementById ? root.getElementById(id) : root.querySelector?.(`#${id}`));
    const resolveLang = () => (typeof getLang === 'function' ? getLang() : 'en') || 'en';
    const copyBtn = byId(copyBtnId);
    const dropdown = byId(`${prefix}ExportDropdown`);
    const exportBtn = byId(`${prefix}ExportBtn`);
    const menu = byId(`${prefix}ExportMenu`);

    copyBtn?.addEventListener('click', () => {
      const payload = getPayload?.() || {};
      const out = String(payload.markdown || payload.text || '').trim();
      const t = I18N[resolveLang()] || I18N.en;
      if (!out) {
        bannerView?.showStatusBanner?.(t.nothingToCopy || 'Generate content first before copying.', true);
        return;
      }
      ExportHandler.copyToClipboard(out, copyBtn, t.copiedBtn || '✅ Copied!');
    });

    exportBtn?.addEventListener('click', (e) => {
      e.stopPropagation?.();
      menu?.classList?.toggle('yt-ai-hidden');
    });

    const run = (fmt) => {
      menu?.classList?.add('yt-ai-hidden');
      const payload = getPayload?.() || {};
      const md = String(payload.markdown || payload.text || '').trim();
      const t = I18N[resolveLang()] || I18N.en;
      if (!md) {
        bannerView?.showStatusBanner?.(t.nothingToExport || 'Generate content first before exporting.', true);
        return;
      }
      const title = payload.title || (typeof document !== 'undefined' ? document.title : 'clarifai_report');
      if (fmt === 'md') ExportHandler.downloadMarkdown(md, title);
      else if (fmt === 'txt') ExportHandler.downloadText(md, title);
      else if (fmt === 'json') {
        ExportHandler.downloadJson({
          title,
          url: payload.url || (typeof window !== 'undefined' ? window.location?.href : '') || '',
          score: payload.score ?? null,
          lang: resolveLang(),
          exportedAt: new Date().toISOString(),
          content: md
        }, title);
      }
    };

    byId(`${prefix}DownloadBtn`)?.addEventListener('click', () => run('md'));
    byId(`${prefix}SaveTxtBtn`)?.addEventListener('click', () => run('txt'));
    byId(`${prefix}SaveJsonBtn`)?.addEventListener('click', () => run('json'));

    if (typeof document !== 'undefined' && menu) {
      document.addEventListener?.('click', (e) => {
        if (dropdown && !dropdown.contains?.(e.target)) menu.classList?.add('yt-ai-hidden');
      });
    }
  }

  static localizeControls(root, t = {}) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('.yt-ai-copy-btn').forEach((b) => { b.textContent = t.copyBtn || '📋 Copy'; });
    root.querySelectorAll('.yt-ai-export-btn').forEach((b) => { b.textContent = t.exportBtn || '💾 Export ▾'; });
    root.querySelectorAll('[id$="DownloadBtn"]').forEach((b) => { b.textContent = t.saveMdBtn || '💾 .md'; });
    root.querySelectorAll('[id$="SaveTxtBtn"]').forEach((b) => { b.textContent = t.saveTxtBtn || '📄 .txt'; });
    root.querySelectorAll('[id$="SaveJsonBtn"]').forEach((b) => { b.textContent = t.saveJsonBtn || '📦 .json'; });
  }
}

export default PaneExportHelper;
