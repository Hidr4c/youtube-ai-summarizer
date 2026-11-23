/**
 * Shared HTML template fragments for Watch Banner and Channel Companion headers and footers.
 */
import { I18N } from '../../locales/index.js';

export const EXTENSION_VERSION_FALLBACK = 'v1.5.1';

export const SUPPORTED_LANGUAGES = [
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'zh', label: '🇨🇳 中文' }
];

export const EXTENSION_BRAND_TITLE = 'ClarifAI';

/**
 * Renders the ClarifAI magnifying lens & sparkle SVG icon next to the brand title.
 * @returns {string}
 */
export function renderBrandLogoSvg() {
  return `
    <svg class="yt-ai-brand-logo-svg" width="20" height="20" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="clarifAiNavGrad" x1="8" y1="8" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#4338CA"/>
          <stop offset="52%" stop-color="#2563EB"/>
          <stop offset="100%" stop-color="#06B6D4"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#clarifAiNavGrad)"/>
      <circle cx="58" cy="60" r="28" fill="#FFFFFF" fill-opacity="0.16" stroke="#FFFFFF" stroke-width="8"/>
      <path d="M78 80L99 101" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round"/>
      <path d="M46 54H70M46 65H57" stroke="#BAE6FD" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M62 67L67 72L76 60" stroke="#34D399" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M98 16L101.6 25.4L111 29L101.6 32.6L98 42L94.4 32.6L85 29L94.4 25.4L98 16Z" fill="#FDE047"/>
    </svg>
  `.trim();
}

/**
 * Renders language <option> elements for all supported locales.
 * @param {string} [currentLang='en']
 * @returns {string}
 */
export function renderLangOptionsHtml(currentLang = 'en') {
  return SUPPORTED_LANGUAGES.map((lang) => {
    const sel = currentLang === lang.value ? ' selected' : '';
    return `<option value="${lang.value}"${sel}>${lang.label}</option>`;
  }).join('\n');
}

/**
 * Renders format/verbosity <option> elements (quick, standard, detailed).
 * @param {Object} [t={}]
 * @param {string} [currentMode='standard']
 * @returns {string}
 */
export function renderModeOptionsHtml(t = {}, currentMode = 'standard') {
  const active = currentMode || 'standard';
  return [
    { value: 'quick', label: t.formatQuick || '⚡ Quick' },
    { value: 'standard', label: t.formatStandard || '📌 Standard' },
    { value: 'detailed', label: t.formatDetailed || '📝 Deep' }
  ].map((opt) => `<option value="${opt.value}"${active === opt.value ? ' selected' : ''}>${opt.label}</option>`).join('\n');
}

/**
 * Renders an Export dropdown button (.md, .txt, .json) using shared UI styles.
 * @param {Object} [t={}]
 * @param {string} [prefix='ytAi']
 * @returns {string}
 */
export function renderExportDropdownHtml(t = {}, prefix = 'ytAi') {
  const isSum = prefix === 'ytAi';
  const ddId = `${prefix}ExportDropdown`;
  const btnId = `${prefix}ExportBtn`;
  const menuId = `${prefix}ExportMenu`;
  const mdId = isSum ? 'ytAiDownloadBtn' : `${prefix}DownloadBtn`;
  const txtId = isSum ? 'ytAiSaveTxtBtn' : `${prefix}SaveTxtBtn`;
  const jsonId = isSum ? 'ytAiSaveJsonBtn' : `${prefix}SaveJsonBtn`;
  return `
    <div class="yt-ai-export-dropdown" id="${ddId}">
      <button id="${btnId}" type="button" class="yt-ai-btn yt-ai-btn-secondary yt-ai-export-btn" style="padding: 3px 8px; font-size: 11px;">${t.exportBtn || '💾 Export ▾'}</button>
      <div id="${menuId}" class="yt-ai-export-menu yt-ai-hidden" role="menu">
        <button id="${mdId}" type="button" class="yt-ai-export-item" role="menuitem">${t.saveMdBtn || '💾 .md'}</button>
        <button id="${txtId}" type="button" class="yt-ai-export-item" role="menuitem">${t.saveTxtBtn || '📄 .txt'}</button>
        <button id="${jsonId}" type="button" class="yt-ai-export-item" role="menuitem">${t.saveJsonBtn || '📦 .json'}</button>
      </div>
    </div>
  `;
}

/**
 * Resolves the extension version tag from the active Chrome manifest with a release fallback.
 * @param {string} [versionOverride='']
 * @returns {string}
 */
export function getExtensionVersionTag(versionOverride = '') {
  if (versionOverride) {
    const raw = String(versionOverride);
    return raw.startsWith('v') ? raw : `v${raw}`;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    return `v${chrome.runtime.getManifest().version}`;
  }
  return EXTENSION_VERSION_FALLBACK;
}

/**
 * Renders the localized attribution & links footer block.
 * @param {Object} t - Active I18N dictionary
 * @param {string} [idPrefix='ytAiFooter']
 * @param {string} [version='']
 * @returns {string}
 */
export function renderExtensionFooterHtml(t = {}, idPrefix = 'ytAiFooter', version = '') {
  const fb = I18N.en;
  const verLabel = getExtensionVersionTag(version);
  const byWord = t.footerBy || fb.footerBy;
  const bugText = t.footerReportBug || fb.footerReportBug;
  const docsText = t.footerDocs || fb.footerDocs;

  return `
    <div class="yt-ai-footer-info">
      <span id="${idPrefix}Author">ClarifAI <strong>${verLabel}</strong> <span id="${idPrefix}By">${byWord}</span> <a href="https://github.com/Hidr4c" target="_blank" rel="noopener">@Hidr4c</a></span>
      <span>•</span>
      <a href="https://github.com/Hidr4c/youtube-ai-summarizer" target="_blank" rel="noopener">⭐ GitHub</a>
      <span>•</span>
      <a id="${idPrefix}BugLink" href="https://github.com/Hidr4c/youtube-ai-summarizer/issues" target="_blank" rel="noopener">🐛 ${bugText}</a>
      <span>•</span>
      <a id="${idPrefix}DocsLink" href="https://github.com/Hidr4c/youtube-ai-summarizer#readme" target="_blank" rel="noopener">📖 ${docsText}</a>
    </div>
  `;
}

/**
 * Updates footer strings in-place without re-creating DOM nodes.
 * @param {Object} t - Active I18N dictionary
 * @param {string} [idPrefix='ytAiFooter']
 */
export function applyFooterLanguage(t = {}, idPrefix = 'ytAiFooter') {
  const fb = I18N.en;
  const byEl = document.getElementById(`${idPrefix}By`);
  if (byEl) byEl.textContent = t.footerBy || fb.footerBy;
  const bugEl = document.getElementById(`${idPrefix}BugLink`);
  if (bugEl) bugEl.textContent = `🐛 ${t.footerReportBug || fb.footerReportBug}`;
  const docsEl = document.getElementById(`${idPrefix}DocsLink`);
  if (docsEl) docsEl.textContent = `📖 ${t.footerDocs || fb.footerDocs}`;
}
