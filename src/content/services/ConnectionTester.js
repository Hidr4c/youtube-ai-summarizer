import { I18N } from '../../locales/index.js';

/**
 * Service for testing provider model latency and Whisper audio endpoint connectivity
 */
export class ConnectionTester {
  /**
   * Tests AI provider model connection and latency
   * @param {Object} params
   * @param {string} params.provider
   * @param {string} params.serverUrl
   * @param {string} params.apiKey
   * @param {string} params.model
   * @param {string} params.lang
   * @param {Function} callback
   */
  static testModelConnection({ provider, serverUrl, apiKey, model, lang = 'en' }, callback) {
    const t = I18N[lang] || I18N.en;
    if (!model) {
      callback({ error: t.selectModelAlert || 'Please select an AI model.', isError: true });
      return;
    }

    const isLocal = (provider === 'lmstudio' || provider === 'ollama');
    if (!isLocal && !apiKey) {
      callback({ error: t.missingKeyAlert || `Please enter an API key for ${provider.toUpperCase()}.`, isError: true });
      return;
    }

    chrome.runtime.sendMessage({
      action: 'TEST_PROVIDER',
      provider,
      serverUrl,
      apiKey,
      model
    }, (res) => {
      if (res && (res.success || res.ok)) {
        const msg = (t.modelReady || 'Model "{model}" ready ({latency}ms)!')
          .replace('{model}', model)
          .replace('{latency}', res.latency || res.latencyMs || 0);
        callback({ message: `✅ ${msg}`, isError: false });
      } else {
        const errText = (t.connectionFailed || 'Failed: {error}')
          .replace('{error}', res?.error || t.connectionError || 'Connection error');
        callback({ message: `❌ ${errText}`, isError: true });
      }
    });
  }

  /**
   * Tests Whisper STT HTTP endpoint
   * @param {string} url
   * @param {string} lang
   * @returns {Promise<{ message: string, isError: boolean }>}
   */
  static async testWhisperEndpoint(url, lang = 'en') {
    const t = I18N[lang] || I18N.en;
    if (!url) {
      const hint = t.whisperUrlPlaceholder ? `Please specify Whisper URL (${t.whisperUrlPlaceholder})` : 'Please enter Whisper server URL';
      return { message: `❌ ${hint}`, isError: true };
    }

    try {
      const res = await fetch(url, { method: 'POST' }).catch(e => e);
      if (res && (res.status === 400 || res.status === 422 || res.status === 200 || res.ok)) {
        const msg = (t.whisperReady || 'Local Whisper STT ready ({latency}ms)!').replace('{latency}', 0);
        return { message: `✅ ${msg}`, isError: false };
      } else {
        const err = (t.whisperFailed || 'Whisper STT failed: {error}').replace('{error}', res.status || 'Connection refused');
        return { message: `⚠️ ${err}`, isError: true };
      }
    } catch (e) {
      const err = (t.whisperFailed || 'Whisper STT failed: {error}').replace('{error}', e.message);
      return { message: `❌ ${err}`, isError: true };
    }
  }
}

export default ConnectionTester;
