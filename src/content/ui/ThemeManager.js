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
  const banner = bannerEl || document.getElementById('yt-ai-summarizer-container');
  if (!banner) return;
  const htmlEl = document.documentElement;

  // YouTube uses 'dark' attribute on <html> or .dark-theme class on body
  const isDark = htmlEl.hasAttribute('dark') ||
                 htmlEl.getAttribute('dark') === 'true' ||
                 document.body?.classList.contains('dark-theme') ||
                 window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  if (isDark) {
    banner.classList.remove('yt-ai-light-theme');
    banner.classList.add('yt-ai-dark-theme');
  } else {
    banner.classList.remove('yt-ai-dark-theme');
    banner.classList.add('yt-ai-light-theme');
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
