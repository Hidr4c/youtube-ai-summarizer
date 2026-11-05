import { API_KEY_PORTALS, PROVIDER_NAMES } from '../../config/AIProviderPresets.js';
import { I18N } from '../../locales/index.js';

/**
 * Helper service for simplified 1-click AI account linking, clipboard pasting, and onboarding
 */
export class QuickOnboardingHelper {
  /**
   * Retrieves quick-start guidance for a provider
   * @param {string} provider
   * @param {string} [lang='fr']
   * @returns {{url: string, label: string, hint: string}}
   */
  static getQuickStartInfo(provider, lang = 'fr') {
    const p = String(provider).toLowerCase();
    const isFr = (lang === 'fr');
    const portal = API_KEY_PORTALS[p];
    const defaultUrl = portal?.url || 'https://aistudio.google.com/app/apikey';

    if (p === 'gemini') {
      return {
        url: defaultUrl,
        label: isFr ? '⚡ Obtenir ma clé Gemini gratuite (Google)' : '⚡ Get Free Gemini Key (with Google)',
        hint: isFr ? '100% gratuit, sans carte bancaire, avec votre compte Google.' : '100% free, no credit card required, with your Google account.'
      };
    }

    if (p === 'openrouter') {
      return {
        url: defaultUrl,
        label: isFr ? '🌐 Lier mon compte OpenRouter' : '🌐 Connect OpenRouter Account',
        hint: isFr ? 'Donne accès à GPT-4o, Claude 3.5, Mistral et modèles gratuits.' : 'Access GPT-4o, Claude 3.5, Mistral, and free models.'
      };
    }

    if (p === 'groq') {
      return {
        url: defaultUrl,
        label: isFr ? '⚡ Obtenir ma clé Groq (Gratuit)' : '⚡ Get Free Groq Key (Ultra-fast)',
        hint: isFr ? 'Inférence ultra-rapide et gratuite (Llama 3.3).' : 'Ultra-fast and free inference (Llama 3.3).'
      };
    }

    const name = PROVIDER_NAMES[p] || p.toUpperCase();
    return {
      url: defaultUrl,
      label: isFr ? `🔑 Obtenir ma clé ${name}` : `🔑 Get ${name} API Key`,
      hint: isFr ? `Liez votre compte ${name} pour résumer et discuter.` : `Connect your ${name} account to summarize and chat.`
    };
  }

  /**
   * Reads clipboard content and updates target input with optional callback
   * @param {HTMLInputElement} inputEl
   * @param {Function} [onKeyUpdated]
   * @returns {Promise<boolean>}
   */
  static async pasteApiKeyFromClipboard(inputEl, onKeyUpdated) {
    if (!inputEl) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const clean = (text || '').trim();
        if (clean) {
          inputEl.value = clean;
          if (typeof onKeyUpdated === 'function') {
            onKeyUpdated(clean);
          }
          return true;
        }
      }
    } catch (_) {
      // Clipboard access might require user gesture or permission
    }
    return false;
  }

  /**
   * Opens official external web chat pre-filled with video context (Zero-config fallback)
   * @param {string} destination 'chatgpt' | 'claude'
   * @param {string} promptText Text to send
   */
  static openExternalWebChat(destination = 'chatgpt', promptText = '') {
    const text = String(promptText || '').slice(0, 3500);
    const encoded = encodeURIComponent(text);

    if (destination === 'claude') {
      window.open('https://claude.ai/new', '_blank');
    } else {
      window.open(`https://chatgpt.com/?q=${encoded}`, '_blank');
    }
  }

  /**
   * Generates a sleek, non-intrusive notification banner for missing key guidance
   * @param {string} provider
   * @param {string} lang
   * @param {Function} onOpenSettings
   * @returns {string} HTML markup
   */
  static formatMissingKeyNotice(provider, lang = 'fr') {
    const info = this.getQuickStartInfo(provider, lang);
    const isFr = (lang === 'fr');
    const title = isFr ? 'Clé API requise' : 'API key required';
    const sub = isFr ? 'Veuillez renseigner votre clé API pour continuer.' : 'Please enter your API key to continue.';

    return `
      <div class="yt-ai-missing-key-card">
        <div style="font-weight: 600; margin-bottom: 4px;">[!] ${title} (${provider.toUpperCase()})</div>
        <div style="font-size: 11px; opacity: 0.85; margin-bottom: 4px;">${sub}</div>
        <div style="font-size: 11px; opacity: 0.75; margin-bottom: 8px;">${info.hint}</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="${info.url}" target="_blank" rel="noopener" class="yt-ai-link-pill" style="font-size: 11px;">${info.label}</a>
        </div>
      </div>
    `.trim();
  }
}

export default QuickOnboardingHelper;
