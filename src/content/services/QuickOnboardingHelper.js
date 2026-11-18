import { API_KEY_PORTALS, PROVIDER_NAMES, resolveDeprecatedModel } from '../../config/AIProviderPresets.js';
import { I18N } from '../../locales/index.js';
import { ConnectionTester } from './ConnectionTester.js';

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
        hint: isFr ? 'Inférence ultra-rapide et gratuite (GPT-OSS, Llama, Qwen).' : 'Ultra-fast and free inference (GPT-OSS, Llama, Qwen).'
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
   * Updates verification badge state and auto-resolved model cleanly from ConnectionTester results.
   * @param {Object} state
   * @param {string} provider
   * @param {string} testedModel
   * @param {Object} res
   */
  static applyVerificationState(state, provider, testedModel, { isError, resolvedModel, isAuthError, isBusyError } = {}) {
    if (!state.keyVerified) state.keyVerified = {};
    if (!isError) {
      state.keyVerified[provider] = true;
      state.savePreference?.(`keyVerified_${provider}`, true);
      if (resolvedModel && resolvedModel !== testedModel) {
        QuickOnboardingHelper.syncResolvedModel(state, provider, resolvedModel);
      }
    } else {
      const nextStatus = (isBusyError && !isAuthError) || isAuthError === false ? 'busy' : false;
      state.keyVerified[provider] = nextStatus;
      state.savePreference?.(`keyVerified_${provider}`, nextStatus);
    }
  }

  /**
   * Applies an auto-recovered model ID received from background MODEL_RESOLVED events.
   * @param {Object} state
   * @param {string} provider
   * @param {string} resolvedModel
   */
  static syncResolvedModel(state, provider, resolvedModel) {
    if (!resolvedModel) return;
    if (state) {
      if (!provider || state.currentProvider === provider) {
        state.setActiveModel?.(resolvedModel);
      } else if (state.selectedModels) {
        state.selectedModels[provider] = resolvedModel;
      }
      if (provider) state.savePreference?.(`selectedModel_${provider}`, resolvedModel);
      state.savePreference?.('selectedModel', resolvedModel);
      if (!state.keyVerified) state.keyVerified = {};
      if (provider) {
        state.keyVerified[provider] = true;
        state.savePreference?.(`keyVerified_${provider}`, true);
      }
    } else if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
      const patch = { selectedModel: resolvedModel };
      if (provider) {
        patch[`selectedModel_${provider}`] = resolvedModel;
        patch[`keyVerified_${provider}`] = true;
      }
      chrome.storage.local.set(patch);
    }

    if (typeof document !== 'undefined' && (!state || !provider || state.currentProvider === provider)) {
      const select = document.getElementById('ytAiModelSelect');
      if (select && select.options) {
        const hasOpt = Array.from(select.options).some(o => o.value === resolvedModel);
        if (hasOpt) select.value = resolvedModel;
      }
      const headerModel = document.getElementById('ytAiHeaderModelText');
      if (headerModel) {
        const t = I18N[state?.currentLang] || I18N.en;
        headerModel.textContent = `${t.modelPrefix || 'Model: '}${resolvedModel}`;
      }
    }
  }

  /**
   * Saves, validates, and refreshes live Cloud models for an entered or pasted API key.
   * @param {Object} params
   */
  static validateAndSyncCloudKey({ state, provider, key, settingsDrawer, showStatusBanner, updateHeaderBadge }) {
    if (!state || !provider || provider === 'lmstudio' || provider === 'ollama') return;
    const clean = String(key || '').trim();
    if (!state.apiKeys) state.apiKeys = {};
    state.apiKeys[provider] = clean;
    state.savePreference?.(`apiKey_${provider}`, clean);
    const model = resolveDeprecatedModel(provider, state.getActiveModel?.() || '');
    QuickOnboardingHelper.testAndValidateKey({ state, provider, key: clean, model, showStatusBanner, updateHeaderBadge });
    if (clean) settingsDrawer?.populateCloudModels?.(provider, null, true);
  }

  /**
   * Tests and validates API key in real-time with provider servers
   * @param {Object} params
   */
  static testAndValidateKey({ state, provider, key, model, showStatusBanner, updateHeaderBadge }) {
    if (!state.keyVerified) state.keyVerified = {};
    if (!key) {
      delete state.keyVerified[provider];
      state.savePreference?.(`keyVerified_${provider}`, null);
      if (typeof updateHeaderBadge === 'function') updateHeaderBadge();
      return;
    }

    state.keyVerified[provider] = 'checking';
    if (typeof updateHeaderBadge === 'function') updateHeaderBadge();

    const isFr = (state.currentLang === 'fr');
    const checking = isFr
      ? `[i] Clé enregistrée. Test de connexion en cours auprès de ${provider.toUpperCase()}...`
      : `[i] Key saved. Testing live connection with ${provider.toUpperCase()}...`;
    if (typeof showStatusBanner === 'function') showStatusBanner(checking, false);

    ConnectionTester.testModelConnection({
      provider,
      serverUrl: state.serverUrls?.[provider] || '',
      apiKey: key,
      model,
      lang: state.currentLang
    }, (res) => {
      QuickOnboardingHelper.applyVerificationState(state, provider, model, res);
      if (typeof updateHeaderBadge === 'function') updateHeaderBadge();
      if (typeof showStatusBanner === 'function') {
        if (!res.isError) {
          const successMsg = isFr
            ? `[✓] Clé API validée avec succès par ${provider.toUpperCase()} (${res.latencyMs || 0}ms) !`
            : `[✓] API key verified successfully by ${provider.toUpperCase()} (${res.latencyMs || 0}ms)!`;
          showStatusBanner(successMsg, false);
        } else {
          showStatusBanner(res.message || res.error, true);
        }
      }
    });
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
