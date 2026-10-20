import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseAIProvider } from '../src/services/ai/providers/BaseAIProvider.js';
import { StreamRelay } from '../src/background/StreamRelay.js';

describe('StreamRelay and URL Normalization', () => {
  it('BaseAIProvider.normalizeUrl adds http scheme and trims trailing slashes', () => {
    const provider = new BaseAIProvider('test', 'Test', true);

    assert.equal(provider.normalizeUrl('192.168.56.1:1234'), 'http://192.168.56.1:1234');
    assert.equal(provider.normalizeUrl('http://192.168.56.1:1234/'), 'http://192.168.56.1:1234');
    assert.equal(provider.normalizeUrl('https://api.openai.com/v1/'), 'https://api.openai.com/v1');
    assert.equal(provider.normalizeUrl('', 'http://localhost:11434'), 'http://localhost:11434');
    assert.equal(provider.normalizeUrl(null, 'http://localhost:11434'), 'http://localhost:11434');
  });

  it('StreamRelay.formatContextError formats context length errors into helpful instructions', () => {
    const lmError = StreamRelay.formatContextError('Maximum context length exceeded (4096 tokens)', 'lmstudio');
    assert.match(lmError, /Dépassement de contexte LM Studio/);
    assert.match(lmError, /Context Length/);

    const ollamaError = StreamRelay.formatContextError('token context overflow', 'ollama');
    assert.match(ollamaError, /Dépassement de contexte Ollama/);
    assert.match(ollamaError, /num_ctx/);

    const genericError = StreamRelay.formatContextError('Network timeout', 'gemini');
    assert.equal(genericError, 'Network timeout');
  });
});
