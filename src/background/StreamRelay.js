import { PROVIDER_CONFIGS, resolveDeprecatedModel } from '../config/AIProviderPresets.js';
import { CloudModelDiscovery } from '../services/ai/providers/CloudModelDiscovery.js';
import { StreamKeepalive } from './StreamKeepalive.js';
import { LocalContextManager } from './LocalContextManager.js';
import { MultimodalMessageFormatter } from './MultimodalMessageFormatter.js';

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
    const provider = request.provider || 'lmstudio';
    const serverUrl = request.serverUrl || request.serverUrls?.[provider] || '';
    const apiKey = request.apiKey || request.apiKeys?.[provider] || '';
    const {
      model, systemPrompt, userPrompt,
      messages = null, temperature = 0.3, maxTokens, localContextLength = 'auto'
    } = request;

    let isDisconnected = false;
    const abortController = new AbortController();

    const safePost = (msg) => {
      if (isDisconnected) return;
      try {
        port.postMessage(msg);
      } catch (_) {
        isDisconnected = true;
      }
    };

    const keepalive = StreamKeepalive.start({
      postMessageSafe: safePost,
      isAborted: () => isDisconnected || abortController.signal.aborted,
      intervalMs: request.heartbeatIntervalMs || 10000
    });

    if (port?.onDisconnect?.addListener) {
      port.onDisconnect.addListener(() => {
        isDisconnected = true;
        keepalive.stop();
        try { abortController.abort(); } catch (_) {}
      });
    }

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
        await this.streamClaude(port, apiKey, model, systemPrompt, chatMessages, temperature, maxTokens, abortController.signal, keepalive.emit);
      } else {
        await this.streamOpenAICompatible(port, provider, serverUrl, apiKey, model, chatMessages, temperature, maxTokens, abortController.signal, keepalive.emit, localContextLength);
      }
      if (provider !== 'lmstudio' && provider !== 'ollama') {
        chrome?.storage?.local?.set?.({ [`keyVerified_${provider}`]: true });
      }
      keepalive.emit({ type: 'DONE' });
    } catch (err) {
      if (isDisconnected || abortController.signal.aborted) return;
      const userFriendlyError = this.formatContextError(err.message || String(err), provider);
      keepalive.emit({ type: 'ERROR', error: userFriendlyError });
    } finally {
      keepalive.stop();
    }
  }

  /**
   * Formats token context limit errors with actionable user hints
   */
  static formatContextError(rawError, provider) {
    if (!/(?:context|token|maximum context length|num_ctx|too long)/i.test(rawError || '')) return rawError;
    if (provider === 'lmstudio' || provider === 'ollama') {
      const toolName = provider === 'ollama' ? 'Ollama' : 'LM Studio';
      const hint = provider === 'ollama' ? 'réglez num_ctx à 8192' : "augmentez 'Context Length' à 8192 ou 16384";
      return `Dépassement de contexte ${toolName} : La transcription dépasse la mémoire allouée au modèle. Dans ${toolName}, ${hint}, ou utilisez Google Gemini (1 million de tokens gratuit). Détail: ${rawError}`;
    }
    return `Dépassement de contexte : Le texte est trop long pour la fenêtre du modèle (${rawError}).`;
  }

  /**
   * Streams from OpenAI-compatible endpoints (LM Studio, Ollama, Groq, Gemini, DeepSeek, etc.)
   */
  static async streamOpenAICompatible(port, provider, serverUrl, apiKey, model, messages, temperature, maxTokens, signal = null, safePost = null, localContextLength = 'auto') {
    let endpoint = '';
    const headers = { 'Content-Type': 'application/json' };

    if (provider === 'lmstudio') {
      let base = (serverUrl || 'http://127.0.0.1:1234').trim().replace(/\/+$/, '');
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
    let effectiveModel = (model || '').trim();
    if (!effectiveModel || effectiveModel === 'default' || effectiveModel.toLowerCase() === 'loading...') {
      if (provider === 'lmstudio' || provider === 'ollama') {
        const base = (serverUrl || (provider === 'ollama' ? 'http://localhost:11434' : 'http://127.0.0.1:1234')).trim().replace(/\/+$/, '');
        const cleanBase = !/^https?:\/\//i.test(base) ? `http://${base}` : base;
        try {
          const mRes = await fetch(`${cleanBase}/v1/models`, { headers: { 'Accept': 'application/json' } });
          if (mRes.ok) {
            const mJson = await mRes.json();
            const list = Array.isArray(mJson?.data) ? mJson.data : (Array.isArray(mJson?.models) ? mJson.models : []);
            const found = list.find(m => {
              const id = m.id || m.name || '';
              return id && !id.toLowerCase().includes('embed');
            });
            if (found) effectiveModel = found.id || found.name;
          }
        } catch (_) {}
      }
    }

    if (!effectiveModel) {
      if (provider === 'lmstudio') {
        throw new Error("Aucun modèle n'est chargé ou sélectionné dans LM Studio. Veuillez démarrer un modèle dans LM Studio.");
      }
      throw new Error(`Aucun modèle sélectionné pour ${provider.toUpperCase()}.`);
    }
    effectiveModel = resolveDeprecatedModel(provider, effectiveModel);
    if (provider === 'lmstudio') {
      await LocalContextManager.ensureLmStudioContext({ serverUrl, model: effectiveModel, apiKey, contextLength: localContextLength, signal, postProgress: safePost });
    } else if (provider === 'ollama' && !LocalContextManager.isCloudHosted(provider, effectiveModel, serverUrl) && LocalContextManager.parseContextLength(localContextLength)) {
      return LocalContextManager.streamOllamaChat({ serverUrl, apiKey, model: effectiveModel, messages, temperature, maxTokens, contextLength: localContextLength, signal, safePost, port });
    }

    const bodyPayload = {
      model: effectiveModel,
      messages: MultimodalMessageFormatter.formatMessages(messages, 'openai'),
      temperature: !isNaN(parsedTemp) ? parsedTemp : 0.3,
      stream: true
    };

    if (maxTokens && maxTokens !== 'auto') {
      const parsedMax = parseInt(maxTokens, 10);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        bodyPayload.max_tokens = parsedMax;
      }
    }

    const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
      endpoint,
      headers,
      payload: bodyPayload,
      signal,
      provider,
      apiKey
    });

    if (resolvedModel && response.ok) {
      const postResolved = safePost || ((m) => port?.postMessage?.(m));
      postResolved({ type: 'MODEL_RESOLVED', provider, model: resolvedModel });
      chrome?.storage?.local?.set?.({
        [`selectedModel_${provider}`]: resolvedModel,
        selectedModel: resolvedModel,
        [`keyVerified_${provider}`]: true
      });
    }
    if (!response.ok) {
      const msg = (provider === 'lmstudio' || provider === 'ollama')
        ? `Erreur ${provider.toUpperCase()} (${response.status}) : ${errorText || response.statusText}`
        : CloudModelDiscovery.formatHttpError(provider, response.status, errorText || response.statusText);
      throw new Error(msg);
    }

    await StreamRelay._consumeSseStream(response, signal, safePost, port, (parsed) => {
      const delta = parsed.choices?.[0]?.delta || {};
      return { content: delta.content || '', reasoning: delta.reasoning_content || '', text: delta.content || '' };
    });
  }

  /**
   * Streams from Anthropic Claude API (/v1/messages)
   */
  static async streamClaude(port, apiKey, model, systemPrompt, messages, temperature, maxTokens, signal = null, safePost = null) {
    if (!apiKey) throw new Error('Clé API Claude requise');

    const claudeMessages = MultimodalMessageFormatter.formatMessages(
      messages.filter(m => m.role !== 'system'),
      'claude'
    );
    const systemContent = systemPrompt || (messages.find(m => m.role === 'system')?.content || '');

    const parsedTemp = parseFloat(temperature);
    const parsedMax = parseInt(maxTokens, 10);

    const bodyPayload = {
      model: resolveDeprecatedModel('claude', model) || PROVIDER_CONFIGS.claude.defaultModel,
      max_tokens: (!isNaN(parsedMax) && parsedMax > 0) ? parsedMax : 4096,
      system: systemContent,
      messages: claudeMessages,
      stream: true
    };

    if (!isNaN(parsedTemp)) {
      bodyPayload.temperature = Math.max(0, Math.min(parsedTemp, 1.0));
    }

    const headers = {
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    };

    const { response, resolvedModel, errorText } = await CloudModelDiscovery.fetchWithModelFallback({
      endpoint: PROVIDER_CONFIGS.claude.endpoint,
      headers,
      payload: bodyPayload,
      signal,
      provider: 'claude',
      apiKey: apiKey.trim()
    });

    if (resolvedModel && response.ok) {
      const postResolved = safePost || ((m) => port?.postMessage?.(m));
      postResolved({ type: 'MODEL_RESOLVED', provider: 'claude', model: resolvedModel });
      chrome?.storage?.local?.set?.({
        selectedModel_claude: resolvedModel,
        selectedModel: resolvedModel,
        keyVerified_claude: true
      });
    }

    if (!response.ok) {
      throw new Error(CloudModelDiscovery.formatHttpError('claude', response.status, errorText || response.statusText));
    }

    await StreamRelay._consumeSseStream(response, signal, safePost, port, (parsed) => {
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        return { content: parsed.delta.text, reasoning: '', text: parsed.delta.text };
      }
      return null;
    });
  }

  /**
   * Shared Server-Sent Events (SSE) stream reader for OpenAI-compatible and Claude streams
   */
  static async _consumeSseStream(response, signal, safePost, port, extractChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const emit = safePost || ((m) => port.postMessage(m));

    while (true) {
      if (signal?.aborted) {
        try { await reader.cancel(); } catch (_) {}
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Retain incomplete line for next iteration

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const chunk = extractChunk(JSON.parse(trimmed.slice(6)));
          if (chunk) emit({ type: 'CHUNK', ...chunk });
        } catch (_) {}
      }
    }
  }
}

export default StreamRelay;
