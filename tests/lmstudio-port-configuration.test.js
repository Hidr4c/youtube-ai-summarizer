import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { LMStudioProvider } from '../src/services/ai/providers/LMStudioProvider.js';
import { DEFAULT_URLS } from '../src/config/ExtensionConstants.js';

function startLocalMockLMStudio(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((done) => server.close(done))
      });
    });
  });
}

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

  it('verifies real HTTP loopback connection on local server without external LM Studio', async () => {
    const mockServer = await startLocalMockLMStudio((req, res) => {
      if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'local-loopback-model' }] }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    try {
      const provider = new LMStudioProvider();
      const res = await provider.testConnection(mockServer.url);
      assert.equal(res.ok, true, `Loopback connection must succeed: ${res.error || ''}`);
      assert.ok(typeof res.latencyMs === 'number');

      const models = await provider.fetchModels(mockServer.url);
      assert.deepEqual(models, [{ id: 'local-loopback-model', name: 'local-loopback-model' }]);
    } finally {
      await mockServer.close();
    }
  });

  it('falls back between 127.0.0.1 and localhost in fetchModels and testConnection', async () => {
    const provider = new LMStudioProvider();
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        if (url.startsWith('http://127.0.0.1:1234')) {
          return new Response('err', { status: 500 });
        }
        if (url.startsWith('http://localhost:1234')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        throw new Error('Unexpected URL');
      };

      const models = await provider.fetchModels('http://127.0.0.1:1234');
      assert.deepEqual(models, []);

      const conn = await provider.testConnection('http://127.0.0.1:1234');
      assert.equal(conn.ok, true);
      assert.equal(conn.resolvedUrl, 'http://localhost:1234');

      globalThis.fetch = async (url) => {
        if (url.startsWith('http://localhost:1235')) {
          throw new Error('ECONNREFUSED');
        }
        return new Response(JSON.stringify({ data: [{ id: 'mirror-hit' }] }), { status: 200 });
      };

      const models2 = await provider.fetchModels('http://localhost:1235');
      assert.equal(models2[0].id, 'mirror-hit');

      const conn2 = await provider.testConnection('http://localhost:1235');
      assert.equal(conn2.ok, true);
      assert.equal(conn2.resolvedUrl, 'http://127.0.0.1:1235');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles HTTP and network failures gracefully when mirror or remote host also fails', async () => {
    const provider = new LMStudioProvider();
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response('Server Error', { status: 503 });
      await assert.rejects(() => provider.fetchModels('http://192.168.1.100:8080'), /HTTP 503/);
      await assert.rejects(() => provider.fetchModels('http://127.0.0.1:1234'), /HTTP 503/);

      const connErr = await provider.testConnection('http://192.168.1.100:8080');
      assert.equal(connErr.ok, false);
      assert.match(connErr.error, /HTTP 503/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
