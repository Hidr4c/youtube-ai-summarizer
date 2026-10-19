const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contentJsPath = path.resolve(__dirname, '..', 'content.js');
const backgroundJsPath = path.resolve(__dirname, '..', 'background.js');

function loadConfigs() {
  const content = fs.readFileSync(contentJsPath, 'utf8');
  const bg = fs.readFileSync(backgroundJsPath, 'utf8');

  const providerNamesMatch = content.match(/const PROVIDER_NAMES = (\{[\s\S]*?\n  \});/);
  assert.ok(providerNamesMatch, 'PROVIDER_NAMES must exist in content.js');

  const cloudModelsMatch = content.match(/const CLOUD_MODELS = (\{[\s\S]*?\n  \});/);
  assert.ok(cloudModelsMatch, 'CLOUD_MODELS must exist in content.js');

  const apiKeyPortalsMatch = content.match(/const API_KEY_PORTALS = (\{[\s\S]*?\n  \});/);
  assert.ok(apiKeyPortalsMatch, 'API_KEY_PORTALS must exist in content.js');

  const bgConfigsMatch = bg.match(/const PROVIDER_CONFIGS = (\{[\s\S]*?\n\};)/);
  assert.ok(bgConfigsMatch, 'PROVIDER_CONFIGS must exist in background.js');

  const PROVIDER_NAMES = eval('(' + providerNamesMatch[1].replace(/;\s*$/, '') + ')');
  const CLOUD_MODELS = eval('(' + cloudModelsMatch[1].replace(/;\s*$/, '') + ')');
  const API_KEY_PORTALS = eval('(' + apiKeyPortalsMatch[1].replace(/;\s*$/, '') + ')');
  const PROVIDER_CONFIGS = eval('(' + bgConfigsMatch[1].replace(/;\s*$/, '') + ')');

  return { PROVIDER_NAMES, CLOUD_MODELS, API_KEY_PORTALS, PROVIDER_CONFIGS };
}

test('AI Providers & Model Configurations', async (t) => {
  const { PROVIDER_NAMES, CLOUD_MODELS, API_KEY_PORTALS, PROVIDER_CONFIGS } = loadConfigs();

  const cloudProviders = [
    'gemini',
    'groq',
    'openai',
    'claude',
    'deepseek',
    'grok',
    'qwen',
    'mistral',
    'openrouter',
    'perplexity',
    'together'
  ];

  await t.test('all cloud providers have display names, model presets, and portal links', () => {
    for (const p of cloudProviders) {
      assert.ok(PROVIDER_NAMES[p], `PROVIDER_NAMES must contain "${p}"`);
      assert.ok(Array.isArray(CLOUD_MODELS[p]) && CLOUD_MODELS[p].length > 0, `CLOUD_MODELS must contain models for "${p}"`);
      assert.ok(API_KEY_PORTALS[p], `API_KEY_PORTALS must contain entry for "${p}"`);
      assert.ok(API_KEY_PORTALS[p].url.startsWith('https://'), `API key URL for "${p}" must be HTTPS`);
      assert.ok(API_KEY_PORTALS[p].label && API_KEY_PORTALS[p].label.length > 0, `API key portal label for "${p}" must not be empty`);
    }
  });

  await t.test('all cloud providers have valid endpoints configured in background.js', () => {
    for (const p of cloudProviders) {
      assert.ok(PROVIDER_CONFIGS[p], `PROVIDER_CONFIGS in background.js must contain "${p}"`);
      assert.ok(
        typeof PROVIDER_CONFIGS[p].endpoint === 'string' && PROVIDER_CONFIGS[p].endpoint.startsWith('https://'),
        `Endpoint for "${p}" must be a valid HTTPS URL`
      );
      assert.ok(
        typeof PROVIDER_CONFIGS[p].name === 'string' && PROVIDER_CONFIGS[p].name.length > 0,
        `name for "${p}" must not be empty`
      );
      assert.ok(
        typeof PROVIDER_CONFIGS[p].defaultModel === 'string' && PROVIDER_CONFIGS[p].defaultModel.length > 0,
        `defaultModel for "${p}" must not be empty`
      );
    }
  });

  await t.test('all model presets have valid id and name strings', () => {
    for (const p of cloudProviders) {
      const models = CLOUD_MODELS[p];
      for (const m of models) {
        assert.ok(typeof m.id === 'string' && m.id.length > 0, `Model in "${p}" must have non-empty id`);
        assert.ok(typeof m.name === 'string' && m.name.length > 0, `Model in "${p}" must have non-empty name`);
      }
    }
  });
});
