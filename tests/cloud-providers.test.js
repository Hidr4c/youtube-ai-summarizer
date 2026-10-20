import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVIDER_NAMES,
  CLOUD_MODELS,
  API_KEY_PORTALS,
  PROVIDER_CONFIGS
} from '../src/config/AIProviderPresets.js';

describe('AI Providers & Model Configurations', () => {
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

  it('all cloud providers have display names, model presets, and portal links', () => {
    for (const p of cloudProviders) {
      assert.ok(PROVIDER_NAMES[p], `PROVIDER_NAMES must contain "${p}"`);
      assert.ok(Array.isArray(CLOUD_MODELS[p]) && CLOUD_MODELS[p].length > 0, `CLOUD_MODELS must contain models for "${p}"`);
      assert.ok(API_KEY_PORTALS[p], `API_KEY_PORTALS must contain entry for "${p}"`);
      assert.ok(API_KEY_PORTALS[p].url.startsWith('https://'), `API key URL for "${p}" must be HTTPS`);
      assert.ok(API_KEY_PORTALS[p].label && API_KEY_PORTALS[p].label.length > 0, `API key portal label for "${p}" must not be empty`);
    }
  });

  it('all cloud providers have valid endpoints configured in background.js', () => {
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

  it('all model presets have valid id and name strings', () => {
    for (const p of cloudProviders) {
      const models = CLOUD_MODELS[p];
      for (const m of models) {
        assert.ok(typeof m.id === 'string' && m.id.length > 0, `Model in "${p}" must have non-empty id`);
        assert.ok(typeof m.name === 'string' && m.name.length > 0, `Model in "${p}" must have non-empty name`);
      }
    }
  });
});
