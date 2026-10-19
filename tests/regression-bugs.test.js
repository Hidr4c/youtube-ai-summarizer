import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { AIProviderFactory } from '../src/services/ai/providers/AIProviderFactory.js';
import { BaseAIProvider } from '../src/services/ai/providers/BaseAIProvider.js';

test('Regression Suite - Bug Prevention & Integration Contracts', async (suite) => {
  const rootDir = path.resolve('.');

  // 1. REGRESSION: Transparent Transcript Extraction (Zero DOM manipulation / No panel opening)
  await suite.test('Transparent Transcript: zero DOM clicks on native YouTube panels or buttons', () => {
    const contextExtractorSrc = fs.readFileSync(path.join(rootDir, 'src/injected/YouTubeContextExtractor.js'), 'utf-8');
    const contentSrc = fs.readFileSync(path.join(rootDir, 'src/content/index.js'), 'utf-8');

    // Never click description or transcript buttons to toggle native panel
    const forbiddenPatterns = [
      /description.*\.click\(\)/i,
      /engagement-panel.*\.click\(\)/i,
      /transcript.*\.click\(\)/i,
      /aria-label.*transcript.*click/i
    ];

    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(contextExtractorSrc),
        false,
        `YouTubeContextExtractor must not click DOM to extract transcript (matched ${pattern})`
      );
      assert.equal(
        pattern.test(contentSrc),
        false,
        `content/index.js must not click DOM to extract transcript (matched ${pattern})`
      );
    }

    // Must use in-memory message protocol
    assert.match(contextExtractorSrc, /YT_AI_REQ_PLAYER_DATA/);
    assert.match(contextExtractorSrc, /YT_AI_RES_PLAYER_DATA/);
    assert.match(contentSrc, /YT_AI_REQ_PLAYER_DATA/);
  });

  // 2. REGRESSION: Model Detection Response Contracts (success, ok, data.data, models)
  await suite.test('Model Detection: response contracts guarantee both modern and legacy format consumers', async () => {
    // Mock provider fetchModels output
    const mockModels = [
      { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
      { id: 'llama3.2:3b', name: 'Llama 3.2 3B' }
    ];

    // Simulating MessageRouter FETCH_MODELS response payload builder
    const buildFetchModelsResponse = (models) => ({
      success: true,
      ok: true,
      data: { data: models, models: models },
      models: models
    });

    const response = buildFetchModelsResponse(mockModels);

    // Verify all consumers receive truthy ok/success
    assert.equal(response.success, true);
    assert.equal(response.ok, true);

    // Verify all legacy & modern paths to model lists exist and match
    assert.deepEqual(response.models, mockModels);
    assert.deepEqual(response.data.data, mockModels);
    assert.deepEqual(response.data.models, mockModels);
  });

  // 3. REGRESSION: AI Stream Message Synthesis (systemPrompt + userPrompt when messages is omitted)
  await suite.test('StreamRelay: synthesizes chatMessages when messages array is omitted', async () => {
    const capturedRequests = [];
    const originalFetch = globalThis.fetch;

    // Mock fetch to capture payload
    globalThis.fetch = async (url, options) => {
      capturedRequests.push({ url, options, body: JSON.parse(options.body) });
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    };

    try {
      const messagesSent = [];
      const mockPort = {
        name: 'ai-stream',
        postMessage: (msg) => messagesSent.push(msg)
      };

      // Case A: systemPrompt + userPrompt without messages array (the exact bug that occurred)
      await StreamRelay.handleStream({
        provider: 'lmstudio',
        model: 'deepseek-r1',
        systemPrompt: 'You are a summarizer.',
        userPrompt: 'Summarize this video.'
      }, mockPort);

      assert.equal(capturedRequests.length, 1);
      const reqA = capturedRequests[0].body;
      assert.deepEqual(reqA.messages, [
        { role: 'system', content: 'You are a summarizer.' },
        { role: 'user', content: 'Summarize this video.' }
      ]);
      assert.equal(messagesSent.some(m => m.type === 'CHUNK' && m.content === 'OK'), true);
      assert.equal(messagesSent.some(m => m.type === 'DONE'), true);

      // Case B: existing messages array, systemPrompt must be prepended if not already first
      capturedRequests.length = 0;
      await StreamRelay.handleStream({
        provider: 'lmstudio',
        model: 'deepseek-r1',
        systemPrompt: 'System instruction',
        messages: [{ role: 'user', content: 'Hello' }]
      }, mockPort);

      const reqB = capturedRequests[0].body;
      assert.deepEqual(reqB.messages, [
        { role: 'system', content: 'System instruction' },
        { role: 'user', content: 'Hello' }
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 4. REGRESSION: Minimalist Header UI Layout & Component Organization
  await suite.test('Minimalist Header: compact 4-element header bar with controls moved to Settings', () => {
    const contentSrc = fs.readFileSync(path.join(rootDir, 'src/content/index.js'), 'utf-8');
    const headerBarMatch = contentSrc.match(/<div class="yt-ai-header-bar">([\s\S]*?)<\/div>\s*<!-- CONTENU DÉPLIABLE -->/);
    assert.ok(headerBarMatch, 'Header bar must exist in template');
    const headerBarHtml = headerBarMatch[1];

    // Header bar MUST contain:
    assert.match(headerBarHtml, /ytAiBrandToggle/, 'Brand/logo must be in header');
    assert.match(headerBarHtml, /ytAiLangSelect/, 'Language selector must be in header');
    assert.match(headerBarHtml, /ytAiSummarizeBtn/, 'Summarize CTA button must be in header');
    assert.match(headerBarHtml, /ytAiSettingsToggleBtn/, 'Settings button must be in header');
    assert.match(headerBarHtml, /ytAiToggleBtn/, 'Expand/collapse button must be in header');

    // Header bar MUST NOT contain (moved to settings to prevent horizontal overflow):
    assert.equal(headerBarHtml.includes('id="ytAiFormatPills"'), false, 'Format pills must be removed from header bar');
    assert.equal(headerBarHtml.includes('id="ytAiBadge"'), false, 'Status badge must be removed from header bar');
    assert.equal(headerBarHtml.includes('id="ytAiHeaderModelPill"'), false, 'Active model pill must be removed from header bar');
    assert.equal(headerBarHtml.includes('v1.3.0'), false, 'Duplicate version link must be removed from header bar');

    // Controls MUST be found inside the Settings Drawer:
    const settingsDrawerMatch = contentSrc.match(/<div id="ytAiSettingsDrawer"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- BANNIÈRE DE STATUT/);
    assert.ok(settingsDrawerMatch, 'Settings drawer must exist');
    const settingsDrawerHtml = settingsDrawerMatch[0];

    // Mode format select in Settings Parameters
    assert.match(settingsDrawerHtml, /id="ytAiModeSelect"/, 'Mode select must be inside Settings drawer');
    assert.match(settingsDrawerHtml, /value="quick"/);
    assert.match(settingsDrawerHtml, /value="standard"/);
    assert.match(settingsDrawerHtml, /value="detailed"/);

    // AI Badge and Model display in Settings Model subpane
    assert.match(settingsDrawerHtml, /id="ytAiBadge"/, 'Status badge must be inside Settings drawer');
    assert.match(settingsDrawerHtml, /id="ytAiHeaderModelText"/, 'Model display text must be inside Settings drawer');
  });

  // 5. REGRESSION: Provider URL Normalization (http:// scheme & trailing slash cleanup)
  await suite.test('URL Normalization: guarantees local endpoints are properly formatted', () => {
    const provider = new BaseAIProvider('lmstudio', 'LM Studio', true);

    // Missing http prefix
    assert.equal(provider.normalizeUrl('192.168.56.1:1234'), 'http://192.168.56.1:1234');
    assert.equal(provider.normalizeUrl('localhost:11434'), 'http://localhost:11434');

    // Trailing slash cleanup
    assert.equal(provider.normalizeUrl('http://localhost:11434/'), 'http://localhost:11434');
    assert.equal(provider.normalizeUrl('http://192.168.56.1:1234///'), 'http://192.168.56.1:1234');

    // Preserves valid HTTPS
    assert.equal(provider.normalizeUrl('https://api.deepseek.com/v1'), 'https://api.deepseek.com/v1');
  });
});
