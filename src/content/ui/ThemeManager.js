/**
 * YouTube Theme Synchronization Manager
 * Detects dark / light mode changes and synchronizes extension CSS theme classes.
 */

let themeObserverAttached = false;

/**
 * Synchronizes container theme with YouTube's current mode
 * @param {HTMLElement} [bannerEl]
 */
export function syncThemeWithYouTube(bannerEl) {
  const elements = [
    bannerEl,
    document.getElementById('yt-ai-summarizer-container'),
    document.getElementById('yt-ai-channel-companion'),
    ...(document.querySelectorAll?.('.yt-ai-channel-card') || [])
  ].filter(Boolean);

  if (elements.length === 0) return;
  const htmlEl = document.documentElement;

  // YouTube uses 'dark' attribute on <html> or .dark-theme class on body
  const isDark = htmlEl.hasAttribute('dark') ||
                 htmlEl.getAttribute('dark') === 'true' ||
                 document.body?.classList.contains('dark-theme') ||
                 window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  for (const el of elements) {
    if (isDark) {
      el.classList?.remove('yt-ai-light-theme');
      el.classList?.add('yt-ai-dark-theme');
      if (el.style) el.style.colorScheme = 'dark';
    } else {
      el.classList?.remove('yt-ai-dark-theme');
      el.classList?.add('yt-ai-light-theme');
      if (el.style) el.style.colorScheme = 'light';
    }
  }
}

/**
 * Initializes dynamic MutationObserver for YouTube theme switches
 * @param {HTMLElement} [banner]
 */
export function initThemeSync(banner) {
  syncThemeWithYouTube(banner);
  if (!themeObserverAttached) {
    themeObserverAttached = true;
    try {
      const themeObserver = new MutationObserver(() => {
        syncThemeWithYouTube();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dark', 'class']
      });
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          syncThemeWithYouTube();
        });
      }
    } catch (_) {}
  }
}

export const ThemeManager = {
  syncThemeWithYouTube,
  initThemeSync
};

export default ThemeManager;
