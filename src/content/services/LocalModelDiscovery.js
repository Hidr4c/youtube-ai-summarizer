import { I18N } from '../../locales/index.js';

/**
 * Service for local AI model discovery and fallback network attempts
 */
export class LocalModelDiscovery {
  /**
   * Refreshes model list for local providers (LM Studio / Ollama)
   * @param {Object} ctx
   * @param {boolean} showFeedback
   * @param {Function} onModelsLoaded
   * @param {Function} onFallbackNeeded
   */
  static refreshModelsList(ctx, showFeedback = false, onModelsLoaded = null, onFallbackNeeded = null) {
    if (ctx.currentProvider !== 'lmstudio' && ctx.currentProvider !== 'ollama') return;
    const isOllama = ctx.currentProvider === 'ollama';
    const defaultHost = isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234';
    const currentUrl = ctx.serverUrls[ctx.currentProvider] || defaultHost;

    chrome.runtime.sendMessage({
      action: 'FETCH_MODELS',
      provider: ctx.currentProvider,
      serverUrl: currentUrl
    }, (response) => {
      if (chrome.runtime.lastError || !response || (!response.success && !response.ok)) {
        if (typeof onFallbackNeeded === 'function') onFallbackNeeded();
        return;
      }
      const data = response.data;
      const models = Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.models)
          ? data.models
          : (Array.isArray(data)
            ? data
            : (Array.isArray(response.models) ? response.models : [])));

      if (typeof onModelsLoaded === 'function') {
        onModelsLoaded(models, currentUrl);
      }
    });
  }

  /**
   * Tries candidate fallback URLs when the primary host is unreachable
   * @param {Object} ctx
   * @param {Array<string>} testedUrls
   * @param {Function} onSuccess
   * @param {Function} onExhausted
   */
  static tryFallbackUrls(ctx, testedUrls = [], onSuccess = null, onExhausted = null) {
    const isOllama = ctx.currentProvider === 'ollama';
    const defaults = isOllama
      ? ['http://localhost:11434', 'http://127.0.0.1:11434', 'http://192.168.56.1:11434']
      : ['http://192.168.56.1:1234', 'http://localhost:1234', 'http://127.0.0.1:1234'];

    const currentUrl = ctx.serverUrls[ctx.currentProvider] || (isOllama ? 'http://localhost:11434' : 'http://192.168.56.1:1234');
    if (!testedUrls.includes(currentUrl)) testedUrls.push(currentUrl);

    const candidate = defaults.find(u => !testedUrls.includes(u));
    if (!candidate) {
      if (typeof onExhausted === 'function') onExhausted();
      return;
    }

    testedUrls.push(candidate);
    chrome.runtime.sendMessage({
      action: 'FETCH_MODELS',
      provider: ctx.currentProvider,
      serverUrl: candidate
    }, (res) => {
      if (res && (res.success || res.ok)) {
        const data = res.data;
        const models = Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data?.models)
            ? data.models
            : (Array.isArray(data)
              ? data
              : (Array.isArray(res.models) ? res.models : [])));

        if (typeof onSuccess === 'function') {
          onSuccess(candidate, models);
        }
      } else {
        LocalModelDiscovery.tryFallbackUrls(ctx, testedUrls, onSuccess, onExhausted);
      }
    });
  }

  /**
   * Populates the HTML select element with discovered models
   * @param {HTMLElement} select
   * @param {Array<Object>} models
   * @param {string} currentProvider
   * @param {string} currentSavedModel
   * @param {string} currentLang
   * @returns {string} activeSelectedModel
   */
  static populateModelSelect(select, models, currentProvider, currentSavedModel, currentLang = 'en') {
    if (!select) return '';
    select.innerHTML = '';
    const toolName = currentProvider === 'ollama' ? 'Ollama' : 'LM Studio';
    const t = I18N[currentLang] || I18N.en;

    if (!models || models.length === 0) {
      const opt = document.createElement('option');
      if (currentSavedModel) {
        opt.value = currentSavedModel;
        opt.textContent = currentSavedModel;
        opt.selected = true;
      } else {
        opt.value = '';
        opt.textContent = `${t.noModelSelected || 'No model'} (${toolName})`;
      }
      select.appendChild(opt);
      return currentSavedModel || '';
    }

    let hasSelected = false;
    models.forEach(m => {
      const modelId = m.id || m.name || m.model || '';
      if (!modelId || modelId.includes('embed')) return;
      const opt = document.createElement('option');
      opt.value = modelId;
      opt.textContent = modelId;
      if (currentSavedModel && modelId === currentSavedModel) {
        opt.selected = true;
        hasSelected = true;
      }
      select.appendChild(opt);
    });

    if (currentSavedModel && !hasSelected) {
      const opt = document.createElement('option');
      opt.value = currentSavedModel;
      opt.textContent = currentSavedModel;
      opt.selected = true;
      select.insertBefore(opt, select.firstChild);
      hasSelected = true;
    }

    if (!hasSelected && select.options.length > 0) select.selectedIndex = 0;
    return select.value;
  }
}

export default LocalModelDiscovery;
