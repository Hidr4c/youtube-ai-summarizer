import { I18N } from '../../locales/index.js';
import { LocalModelDiscovery } from '../services/LocalModelDiscovery.js';
import { SettingsDrawerI18n } from './SettingsDrawerI18n.js';

/**
 * Coordinates the 0-to-1M Local Context slider, numeric box, Apply trigger, and grey-out states.
 */
export class LocalContextUiHelper {
  /**
   * Binds bidirectional slider/input controls and syncs server-default or read-only availability.
   * @param {Object} params
   */
  static bind({ rootContainer, state, showStatus }) {
    const ctxSlider = rootContainer.querySelector('#ytAiLocalContextSlider');
    const ctxInput = rootContainer.querySelector('#ytAiLocalContextInput');
    const ctxValueBadge = rootContainer.querySelector('#ytAiLocalContextValue');
    const applyCtxBtn = rootContainer.querySelector('#ytAiApplyContextBtn');

    const syncControls = (rawVal, persist = false, isServerDefault = false) => {
      const num = parseInt(String(rawVal ?? '0'), 10);
      const safeNum = Number.isFinite(num) && num > 0 ? Math.min(num, 1048576) : 0;
      const prov = state.currentProvider || 'lmstudio';
      const storedVal = isServerDefault ? 'auto' : (safeNum > 0 ? String(safeNum) : 'auto');
      if (ctxSlider) {
        ctxSlider.value = String(safeNum);
        ctxSlider.setAttribute?.('data-server-default', isServerDefault ? prov : '');
      }
      if (ctxInput) ctxInput.value = String(safeNum);
      if (ctxValueBadge) {
        ctxValueBadge.textContent = SettingsDrawerI18n.formatLocalContextValue(safeNum, state.currentLang, prov, isServerDefault);
      }
      state.localContextLength = storedVal;
      if (persist) state.savePreference('localContextLength', storedVal);
      return storedVal;
    };

    const syncDetected = () => {
      const prov = state.currentProvider;
      const activeModel = state.getActiveModel?.() || '';
      const serverUrl = state.serverUrls?.[prov] || '';
      const baseOpts = { model: activeModel, serverUrl, lang: state.currentLang };
      if (prov !== 'lmstudio' && prov !== 'ollama') {
        SettingsDrawerI18n.syncLocalContextVisibility(prov, { ...baseOpts, canModifyContext: false, readOnlyReason: 'cloud' });
        return;
      }
      const isCloudOllama = /(?:^|[:\-])cloud$/i.test(activeModel) || /ollama\.com/i.test(serverUrl);
      if (prov === 'ollama' && isCloudOllama) {
        SettingsDrawerI18n.syncLocalContextVisibility(prov, { ...baseOpts, canModifyContext: false, readOnlyReason: 'cloud' });
        return;
      }
      SettingsDrawerI18n.syncLocalContextVisibility(prov, { ...baseOpts, canModifyContext: true });
      if ((state.localContextLength || 'auto') === 'auto') {
        syncControls(state.serverDefaultContexts?.[prov]?.contextLength || (prov === 'ollama' ? 4096 : 8192), false, true);
      } else {
        syncControls(state.localContextLength, false, false);
      }
      LocalModelDiscovery.syncLocalContextDefault(state, (res) => {
        if (state.currentProvider !== res.provider) return;
        const canMod = res.canModifyContext !== false;
        SettingsDrawerI18n.syncLocalContextVisibility(res.provider, {
          model: state.getActiveModel?.() || '',
          serverUrl: state.serverUrls?.[res.provider] || '',
          canModifyContext: canMod,
          readOnlyReason: res.readOnlyReason || 'server',
          lang: state.currentLang
        });
        if (canMod && (state.localContextLength || 'auto') === 'auto' && res.contextLength) {
          syncControls(res.contextLength, false, true);
        }
      });
    };

    syncDetected();
    rootContainer.querySelector('#ytAiProviderSelect')?.addEventListener('change', syncDetected);
    rootContainer.querySelector('#ytAiModelSelect')?.addEventListener('change', syncDetected);
    rootContainer.querySelector('#ytAiRefreshModelsBtn')?.addEventListener('click', syncDetected);

    ctxSlider?.addEventListener('input', (e) => syncControls(e.target.value, false, false));
    ctxSlider?.addEventListener('change', (e) => syncControls(e.target.value, true, false));
    ctxInput?.addEventListener('input', (e) => syncControls(e.target.value, true, false));
    ctxInput?.addEventListener('change', (e) => syncControls(e.target.value, true, false));

    applyCtxBtn?.addEventListener('click', () => {
      const provider = state.currentProvider || 'lmstudio';
      const targetCtx = syncControls(ctxInput?.value ?? ctxSlider?.value ?? 0, true, false);
      const t = I18N[state.currentLang] || I18N.en;
      if (provider === 'ollama') {
        showStatus((t.contextOllamaHint || 'Ollama context set to {ctx} tokens (applies on next request)').replace('{ctx}', targetCtx), false);
        return;
      }
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
      applyCtxBtn.disabled = true;
      chrome.runtime.sendMessage({
        action: 'APPLY_LOCAL_CONTEXT',
        provider,
        serverUrl: state.serverUrls?.[provider] || '',
        apiKey: state.apiKeys?.[provider] || '',
        model: state.getActiveModel?.() || '',
        contextLength: targetCtx
      }, (res) => {
        applyCtxBtn.disabled = false;
        if (chrome.runtime?.lastError || !res || !res.success) {
          showStatus(res?.error || chrome.runtime?.lastError?.message || 'Unable to apply context length', true);
          return;
        }
        if (res.contextLength && res.contextLength !== 'auto') syncControls(res.contextLength, true, false);
        const msg = res.skipped
          ? (t.ctxAuto || '0 — Auto (Server Default)')
          : (t.contextAppliedMsg || 'Context window set to {ctx} tokens (ready)').replace('{ctx}', res.contextLength || targetCtx);
        showStatus(`✓ ${msg}`, false);
      });
    });
  }
}

export default LocalContextUiHelper;
