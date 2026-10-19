/**
 * Component managing the Collapsible Settings Drawer with 3 Sub-tabs
 */
export class SettingsDrawerComponent {
  /**
   * @param {HTMLElement} rootEl
   * @param {Object} callbacks
   */
  constructor(rootEl, callbacks = {}) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  bindEvents() {
    // Sub-tabs navigation
    const subtabs = this.rootEl.querySelectorAll('.yt-ai-settings-subtab-btn');
    const panes = this.rootEl.querySelectorAll('.yt-ai-settings-subpane');

    subtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        subtabs.forEach(b => b.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const target = btn.getAttribute('data-subtab');
        const pane = this.rootEl.querySelector(`#ytAiSettingsSubpane${target}`);
        if (pane) pane.classList.add('active');
      });
    });

    // Provider select
    const providerSelect = this.rootEl.querySelector('#ytAiProviderSelect');
    if (providerSelect && this.callbacks.onProviderChange) {
      providerSelect.addEventListener('change', (e) => this.callbacks.onProviderChange(e.target.value));
    }

    // Model select
    const modelSelect = this.rootEl.querySelector('#ytAiModelSelect');
    if (modelSelect && this.callbacks.onModelChange) {
      modelSelect.addEventListener('change', (e) => this.callbacks.onModelChange(e.target.value));
    }

    // Test model button
    const testModelBtn = this.rootEl.querySelector('#ytAiTestModelBtn');
    if (testModelBtn && this.callbacks.onTestModel) {
      testModelBtn.addEventListener('click', () => this.callbacks.onTestModel());
    }

    // Refresh models button
    const refreshBtn = this.rootEl.querySelector('#ytAiRefreshModelsBtn');
    if (refreshBtn && this.callbacks.onRefreshModels) {
      refreshBtn.addEventListener('click', () => this.callbacks.onRefreshModels());
    }

    // Hide drawer button
    const hideBtn = this.rootEl.querySelector('#ytAiHideSettingsBtn');
    if (hideBtn && this.callbacks.onClose) {
      hideBtn.addEventListener('click', () => this.callbacks.onClose());
    }
  }

  /**
   * Switches active subtab ('Model', 'Audio', 'Params')
   * @param {string} subtabName
   */
  openSubtab(subtabName = 'Model') {
    const subtabs = this.rootEl.querySelectorAll('.yt-ai-settings-subtab-btn');
    const panes = this.rootEl.querySelectorAll('.yt-ai-settings-subpane');

    subtabs.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-subtab') === subtabName);
    });
    panes.forEach(p => {
      p.classList.toggle('active', p.id === `ytAiSettingsSubpane${subtabName}`);
    });
  }

  /**
   * Toggles drawer open/closed
   * @param {boolean} [forceState]
   */
  toggle(forceState) {
    const drawer = this.rootEl.querySelector('#ytAiAdvancedDrawer');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('yt-ai-hidden');
    const shouldOpen = forceState !== undefined ? forceState : isHidden;
    drawer.classList.toggle('yt-ai-hidden', !shouldOpen);
  }
}

export default SettingsDrawerComponent;
