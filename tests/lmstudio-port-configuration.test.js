import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LMStudioProvider } from '../src/services/ai/providers/LMStudioProvider.js';
import { DEFAULT_URLS } from '../src/config/ExtensionConstants.js';

describe('LMStudioProvider - Port & Server URL Configuration Gate', () => {
  it('uses default port 1234 when no serverUrl is provided', async () => {
    let capturedUrl = '';
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ data: [{ id: 'model-default' }] }), { status: 200 });
      };

      const provider = new LMStudioProvider();
      const models = await provider.fetchModels();

      assert.equal(models.length, 1);
      assert.equal(models[0].id, 'model-default');
      assert.ok(capturedUrl.includes('1234'), `Must use default port 1234: got ${capturedUrl}`);
      assert.ok(capturedUrl.startsWith(DEFAULT_URLS.LMSTUDIO));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('strictly respects custom port 1235 when configured by user', async () => {
    let capturedUrl = '';
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ data: [{ id: 'qwen3.5-9b' }] }), { status: 200 });
      };

      const provider = new LMStudioProvider();
      const models = await provider.fetchModels('http://127.0.0.1:1235');

      assert.equal(models.length, 1);
      assert.equal(models[0].id, 'qwen3.5-9b');
      assert.ok(capturedUrl.includes(':1235/v1/models'), `Must respect custom port 1235: got ${capturedUrl}`);
      assert.equal(capturedUrl.includes(':1234'), false, 'Must never overwrite user port with default 1234');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('strictly respects any custom remote IP and port (e.g. 192.168.1.100:8080)', async () => {
    let capturedUrl = '';
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ data: [{ id: 'remote-llama' }] }), { status: 200 });
      };

      const provider = new LMStudioProvider();
      const models = await provider.fetchModels('http://192.168.1.100:8080');

      assert.equal(models.length, 1);
      assert.ok(capturedUrl.includes('192.168.1.100:8080/v1/models'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('normalizes missing scheme and trailing slashes correctly without altering port', async () => {
    let capturedUrl = '';
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      };

      const provider = new LMStudioProvider();
      await provider.fetchModels('127.0.0.1:1235///');

      assert.equal(capturedUrl, 'http://127.0.0.1:1235/v1/models');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('verifies real live connection on currently active LM Studio server', async () => {
    const provider = new LMStudioProvider();
    // Test on active port 1234 where user LM Studio is currently loaded
    const res = await provider.testConnection('http://127.0.0.1:1234');
    assert.equal(res.ok, true, `Real connection to active LM Studio must succeed: ${res.error || ''}`);
    assert.ok(typeof res.latencyMs === 'number');
  });
});
