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
    const {
      provider = 'lmstudio',
      model,
      systemPrompt,
      userPrompt,
      messages = null,
      temperature = 0.3,
      maxTokens,
      serverUrl,
      apiKey
    } = request;

    // Build chat message sequence from system/user prompts or chat history
    let chatMessages = messages;
    if (!chatMessages) {
      chatMessages = [
        { role: 'system', content: systemPrompt || '' },
        { role: 'user', content: userPrompt || '' }
      ];
    } else if (systemPrompt && (!chatMessages[0] || chatMessages[0].role !== 'system')) {
      chatMessages = [{ role: 'system', content: systemPrompt }, ...chatMessages];
    }

    try {
      if (provider === 'claude') {
        await this.streamClaude(port, apiKey, model, systemPrompt, chatMessages, temperature, maxTokens);
      } else {
        await this.streamOpenAICompatible(port, provider, serverUrl, apiKey, model, chatMessages, temperature, maxTokens);
      }
      port.postMessage({ type: 'DONE' });
    } catch (err) {
      const userFriendlyError = this.formatContextError(err.message || String(err), provider);
      port.postMessage({ type: 'ERROR', error: userFriendlyError });
    }
  }

  /**
   * Formats token context limit errors with actionable user hints
   */
  static formatContextError(rawError, provider) {
    const lower = (rawError || '').toLowerCase();
    if (
      lower.includes('context') ||
      lower.includes('token') ||
      lower.includes('maximum context length') ||
      lower.includes('num_ctx') ||
      lower.includes('too long')
    ) {
      if (provider === 'lmstudio' || provider === 'ollama') {
        const toolName = provider === 'ollama' ? 'Ollama' : 'LM Studio';
        const hint = provider === 'ollama' ? 'réglez num_ctx à 8192' : "augmentez 'Context Length' à 8192 ou 16384";
        return `Dépassement de contexte ${toolName} : La transcription dépasse la mémoire allouée au modèle. Dans ${toolName}, ${hint}, ou utilisez Google Gemini (1 million de tokens gratuit). Détail: ${rawError}`;
      }
      return `Dépassement de contexte : Le texte est trop long pour la fenêtre du modèle (${rawError}).`;
    }
    return rawError;
  }

  /**
   * Streams from OpenAI-compatible endpoints (LM Studio, Ollama, Groq, Gemini, DeepSeek, etc.)
   */
  static async streamOpenAICompatible(port, provider, serverUrl, apiKey, model, messages, temperature, maxTokens) {
    let endpoint = '';
    const headers = { 'Content-Type': 'application/json' };

    if (provider === 'lmstudio') {
      let base = (serverUrl || 'http://192.168.56.1:1234').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(base)) base = 'http://' + base;
      endpoint = `${base}/v1/chat/completions`;
    } else if (provider === 'ollama') {
      let base = (serverUrl || 'http://localhost:11434').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(base)) base = 'http://' + base;
      endpoint = `${base}/v1/chat/completions`;
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    } else {
      const config = PROVIDER_CONFIGS[provider];
      if (!config) throw new Error(`Fournisseur ${provider} non supporté`);
      if (!apiKey) throw new Error(`Clé API manquante pour ${config.name}`);
      endpoint = config.endpoint;
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://youtube.com';
        headers['X-Title'] = 'YouTube AI Summarizer';
      }
    }

    const parsedTemp = parseFloat(temperature);
    const bodyPayload = {
      model,
      messages,
      temperature: !isNaN(parsedTemp) ? parsedTemp : 0.3,
      stream: true
    };

    if (maxTokens && maxTokens !== 'auto') {
      const parsedMax = parseInt(maxTokens, 10);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        bodyPayload.max_tokens = parsedMax;
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur ${provider.toUpperCase()} (${response.status}) : ${errText || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Retain incomplete line for next iteration

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta || {};
            port.postMessage({
              type: 'CHUNK',
              content: delta.content || '',
              reasoning: delta.reasoning_content || '',
              text: delta.content || ''
            });
          } catch (e) {}
        }
      }
    }
  }

  /**
   * Streams from Anthropic Claude API (/v1/messages)
   */
  static async streamClaude(port, apiKey, model, systemPrompt, messages, temperature, maxTokens) {
    if (!apiKey) throw new Error('Clé API Claude requise');

    const claudeMessages = messages.filter(m => m.role !== 'system');
    const systemContent = systemPrompt || (messages.find(m => m.role === 'system')?.content || '');

    const parsedTemp = parseFloat(temperature);
    const parsedMax = parseInt(maxTokens, 10);

    const bodyPayload = {
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: (!isNaN(parsedMax) && parsedMax > 0) ? parsedMax : 4096,
      system: systemContent,
      messages: claudeMessages,
      stream: true
    };

    if (!isNaN(parsedTemp)) {
      bodyPayload.temperature = Math.max(0, Math.min(parsedTemp, 1.0));
    }

    const response = await fetch(PROVIDER_CONFIGS.claude.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur Claude (${response.status}) : ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              port.postMessage({
                type: 'CHUNK',
                content: parsed.delta.text,
                reasoning: '',
                text: parsed.delta.text
              });
            }
          } catch (e) {}
        }
      }
    }
  }
}

export default StreamRelay;
