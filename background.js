/**
 * background.js - YouTube AI Summarizer
 * Relais réseau pour LM Studio (local) et les APIs Cloud (OpenAI, Gemini, Claude, DeepSeek).
 * Gestion des requêtes de synthèse et du chat interactif avec détection d'erreurs de contexte.
 */

const PROVIDER_CONFIGS = {
  lmstudio: {
    name: 'LM Studio (Local)'
  },
  ollama: {
    name: 'Ollama (Local / Cloud)'
  },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-1.5-flash'
  },
  groq: {
    name: 'Groq (Inférence Rapide)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini'
  },
  claude: {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-haiku-20241022'
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat'
  },
  grok: {
    name: 'xAI (Grok)',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-2-latest'
  },
  qwen: {
    name: 'Qwen (Alibaba DashScope)',
    endpoint: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus'
  },
  mistral: {
    name: 'Mistral AI',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest'
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'deepseek/deepseek-r1'
  },
  perplexity: {
    name: 'Perplexity AI',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    defaultModel: 'sonar'
  },
  together: {
    name: 'Together AI',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_MODELS') {
    const provider = request.provider || 'lmstudio';
    const defaultUrl = provider === 'ollama' ? 'http://localhost:11434' : 'http://192.168.56.1:1234';
    const cleanUrl = (request.serverUrl || defaultUrl).replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    if (provider === 'ollama') {
      // Pour Ollama : tester d'abord /api/tags puis /v1/models
      fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      })
        .then(res => {
          if (!res.ok) {
            return fetch(`${cleanUrl}/v1/models`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: controller.signal
            }).then(r => r.json());
          }
          return res.json().then(data => {
            const models = (data.models || []).map(m => ({ id: m.name || m.model }));
            return { data: models };
          });
        })
        .then(data => {
          clearTimeout(timer);
          sendResponse({ success: true, data });
        })
        .catch(err => {
          clearTimeout(timer);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    // LM Studio par défaut
    fetch(`${cleanUrl}/v1/models`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        clearTimeout(timer);
        sendResponse({ success: true, data });
      })
      .catch(err => {
        clearTimeout(timer);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === 'FETCH_TIMEDTEXT') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    fetch(request.url, {
      method: 'GET',
      signal: controller.signal
    })
      .then(async res => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        sendResponse({ success: true, text });
      })
      .catch(err => {
        clearTimeout(timer);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === 'TEST_PROVIDER') {
    const { provider, serverUrl, apiKey, model } = request;
    const startTime = Date.now();

    testProviderConnection(provider, serverUrl, apiKey, model)
      .then(() => sendResponse({ success: true, latency: Date.now() - startTime }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function testProviderConnection(provider, serverUrl, apiKey, model) {
  if (provider === 'lmstudio' || provider === 'ollama') {
    const defaultUrl = provider === 'ollama' ? 'http://localhost:11434' : 'http://192.168.56.1:1234';
    const cleanUrl = (serverUrl || defaultUrl).replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(`${cleanUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: model || (provider === 'ollama' ? 'llama3' : 'local-model'),
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  if (provider === 'claude') {
    if (!apiKey) throw new Error('Clé API Claude requise');
    const res = await fetch(PROVIDER_CONFIGS.claude.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model || PROVIDER_CONFIGS.claude.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Ping' }]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return;
  }

  const config = PROVIDER_CONFIGS[provider];
  if (!config) throw new Error(`Fournisseur inconnu: ${provider}`);
  if (!apiKey) throw new Error(`Clé API ${config.name} requise`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.trim()}`
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://youtube.com';
    headers['X-Title'] = 'YouTube AI Summarizer';
  }

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || config.defaultModel,
      messages: [{ role: 'user', content: 'Ping' }],
      max_tokens: 5
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
}

// Gestion des flux de streaming (synthèse + chat Q&A)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'ai-stream' || port.name === 'lm-studio-stream') {
    port.onMessage.addListener(async (msg) => {
      if (msg.action === 'START_STREAM' || msg.action === 'CHAT_STREAM') {
        const {
          provider = 'lmstudio',
          serverUrl,
          apiKey,
          model,
          systemPrompt,
          userPrompt,
          messages = null,
          temperature,
          maxTokens
        } = msg;

        try {
          // Si une liste de messages de conversation est fournie (mode Chat)
          let chatMessages = messages;
          if (!chatMessages) {
            chatMessages = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ];
          } else if (systemPrompt && (!chatMessages[0] || chatMessages[0].role !== 'system')) {
            chatMessages = [{ role: 'system', content: systemPrompt }, ...chatMessages];
          }

          if (provider === 'claude') {
            await streamClaude(port, apiKey, model, systemPrompt, chatMessages, temperature, maxTokens);
          } else {
            await streamOpenAICompatible(port, provider, serverUrl, apiKey, model, chatMessages, temperature, maxTokens);
          }
          port.postMessage({ type: 'DONE' });

        } catch (err) {
          const userFriendlyError = formatContextError(err.message, provider);
          port.postMessage({ type: 'ERROR', error: userFriendlyError });
        }
      }
    });
  }
});

function formatContextError(rawError, provider) {
  const lower = rawError.toLowerCase();
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

async function streamOpenAICompatible(port, provider, serverUrl, apiKey, model, messages, temperature, maxTokens) {
  let endpoint = '';
  let headers = { 'Content-Type': 'application/json' };

  if (provider === 'lmstudio') {
    endpoint = `${(serverUrl || 'http://192.168.56.1:1234').replace(/\/+$/, '')}/v1/chat/completions`;
  } else if (provider === 'ollama') {
    endpoint = `${(serverUrl || 'http://localhost:11434').replace(/\/+$/, '')}/v1/chat/completions`;
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
    buffer = lines.pop();

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
            reasoning: delta.reasoning_content || ''
          });
        } catch (e) {}
      }
    }
  }
}

async function streamClaude(port, apiKey, model, systemPrompt, messages, temperature, maxTokens) {
  if (!apiKey) throw new Error('Clé API Claude requise');

  // Séparer le message system et les messages user/assistant pour Claude
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
              reasoning: ''
            });
          }
        } catch (e) {}
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        files: ['main_world.js']
      }).catch(() => {});
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).catch(() => {});
      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      }).catch(() => {});
    }
  });
});
