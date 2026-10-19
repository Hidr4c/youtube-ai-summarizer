import { PROVIDER_CONFIGS } from '../config/AIProviderPresets.js';

/**
 * Handles streaming HTTP inference and dispatches chunks over Chrome Runtime Port
 */
export class StreamRelay {
  /**
   * Connects and streams LLM response to client port
   * @param {Object} request
   * @param {chrome.runtime.Port} port
   */
  static async handleStream(request, port) {
    const { provider = 'lmstudio', model, messages, temperature = 0.3, maxTokens, serverUrl, apiKey } = request;

    const config = PROVIDER_CONFIGS[provider] || {};
    let endpoint = config.endpoint;
    let headers = { 'Content-Type': 'application/json' };

    if (provider === 'lmstudio' || provider === 'ollama') {
      const base = (serverUrl || (provider === 'ollama' ? 'http://localhost:11434' : 'http://192.168.56.1:1234')).replace(/\/+$/, '');
      endpoint = `${base}/v1/chat/completions`;
    }

    if (apiKey) {
      if (provider === 'claude') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    const bodyPayload = {
      model,
      messages,
      temperature: Number(temperature) || 0.3,
      stream: true
    };
    if (maxTokens && maxTokens !== 'auto') {
      bodyPayload.max_tokens = Number(maxTokens);
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        port.postMessage({ type: 'ERROR', error: errJson.error?.message || `HTTP ${res.status}` });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') {
            port.postMessage({ type: 'DONE' });
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta;
              if (delta) {
                if (delta.reasoning_content) {
                  port.postMessage({ type: 'REASONING_CHUNK', text: delta.reasoning_content });
                }
                if (delta.content) {
                  port.postMessage({ type: 'CHUNK', text: delta.content });
                }
              }
            } catch {}
          }
        }
      }

      port.postMessage({ type: 'DONE' });
    } catch (err) {
      port.postMessage({ type: 'ERROR', error: err.message || 'Stream connection failed' });
    }
  }
}

export default StreamRelay;
