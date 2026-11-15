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

export const EXTENSION_BRAND_TITLE = 'YT Summarizer AI';

/**
 * Renders the YouTube red play SVG icon used next to the extension brand title.
 * @returns {string}
 */
export function renderBrandLogoSvg() {
  return `
    <svg class="yt-ai-brand-logo-svg" width="22" height="16" viewBox="0 0 24 17" fill="none" aria-hidden="true">
      <rect width="24" height="17" rx="4.5" fill="#FF0000"/>
      <path d="M9.5 4.8L16 8.5L9.5 12.2V4.8Z" fill="#FFFFFF"/>
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
      <span id="${idPrefix}Author">YouTube Summarizer AI <strong>${verLabel}</strong> <span id="${idPrefix}By">${byWord}</span> <a href="https://github.com/Hidr4c" target="_blank" rel="noopener">@Hidr4c</a></span>
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
