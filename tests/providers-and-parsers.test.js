import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIProviderFactory } from '../src/services/ai/providers/AIProviderFactory.js';
import { BaseAIProvider } from '../src/services/ai/providers/BaseAIProvider.js';
import { LMStudioProvider } from '../src/services/ai/providers/LMStudioProvider.js';
import { OllamaProvider } from '../src/services/ai/providers/OllamaProvider.js';
import { GeminiProvider } from '../src/services/ai/providers/GeminiProvider.js';
import { GroqProvider } from '../src/services/ai/providers/GroqProvider.js';
import { OpenAIProvider } from '../src/services/ai/providers/OpenAIProvider.js';
import { ClaudeProvider } from '../src/services/ai/providers/ClaudeProvider.js';
import { DeepSeekProvider } from '../src/services/ai/providers/DeepSeekProvider.js';
import { TimedtextParser } from '../src/parsers/TimedtextParser.js';
import { InnerTubeParser } from '../src/parsers/InnerTubeParser.js';
import { TextCleaner } from '../src/parsers/TextCleaner.js';
import { TranscriptSegment } from '../src/domain/models/TranscriptSegment.js';
import { PromptBuilder } from '../src/services/implementations/PromptBuilder.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { AppError } from '../src/domain/errors/AppError.js';
import { AIProviderError } from '../src/domain/errors/AIProviderError.js';
import { TranscriptError } from '../src/domain/errors/TranscriptError.js';
import { VideoMetadata } from '../src/domain/models/VideoMetadata.js';
import { AIRequest } from '../src/domain/models/AIRequest.js';

describe('AI Providers Strategy & Factory Implementation', () => {
  it('AIProviderFactory instantiates and caches all supported strategies', () => {
    const providers = ['lmstudio', 'ollama', 'gemini', 'groq', 'openai', 'claude', 'deepseek'];
    for (const p of providers) {
      const inst1 = AIProviderFactory.getProvider(p);
      const inst2 = AIProviderFactory.getProvider(p);
      assert.ok(inst1 instanceof BaseAIProvider);
      assert.equal(inst1, inst2, `Provider ${p} must be cached in instances map`);
      assert.equal(inst1.getProviderId(), p);
      assert.ok(typeof inst1.getDisplayName() === 'string' && inst1.getDisplayName().length > 0);
    }

    // Default fallback
    const fallback = AIProviderFactory.getProvider('unsupported-provider');
    assert.ok(fallback instanceof BaseAIProvider);
    assert.equal(fallback.getProviderId(), 'unsupported-provider');
    assert.equal(fallback.isLocal(), false);
  });

  it('BaseAIProvider helpers: identification, local check, and timeout', async () => {
    const base = new BaseAIProvider('test-ai', 'Test AI Provider', true);
    assert.equal(base.getProviderId(), 'test-ai');
    assert.equal(base.getDisplayName(), 'Test AI Provider');
    assert.equal(base.isLocal(), true);

    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => new Response(JSON.stringify({ ok: true, url }), { status: 200 });
      const res = await base.fetchWithTimeout('http://localhost:1234/test', {}, 1000);
      assert.equal(res.status, 200);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('Cloud providers return model lists and handle test connection', async () => {
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'pong' } }] }), { status: 200 });

      // Claude
      const claude = new ClaudeProvider();
      const claudeModels = await claude.fetchModels();
      assert.ok(Array.isArray(claudeModels) && claudeModels.length > 0);
      assert.equal((await claude.testConnection('', '')).ok, false);
      const claudeTest = await claude.testConnection('', 'sk-ant-test');
      assert.equal(claudeTest.ok, true);

      // Gemini
      const gemini = new GeminiProvider();
      const geminiModels = await gemini.fetchModels();
      assert.ok(Array.isArray(geminiModels) && geminiModels.length > 0);
      assert.equal((await gemini.testConnection('', '')).ok, false);
      const geminiTest = await gemini.testConnection('', 'AIza-test');
      assert.equal(geminiTest.ok, true);

      // Groq
      const groq = new GroqProvider();
      const groqModels = await groq.fetchModels();
      assert.ok(Array.isArray(groqModels) && groqModels.length > 0);
      assert.equal((await groq.testConnection('', '')).ok, false);
      const groqTest = await groq.testConnection('', 'gsk-test');
      assert.equal(groqTest.ok, true);

      // OpenAI
      const openai = new OpenAIProvider();
      const openaiModels = await openai.fetchModels();
      assert.ok(Array.isArray(openaiModels) && openaiModels.length > 0);
      assert.equal((await openai.testConnection('', '')).ok, false);
      const openaiTest = await openai.testConnection('', 'sk-test');
      assert.equal(openaiTest.ok, true);

      // DeepSeek
      const deepseek = new DeepSeekProvider();
      const deepseekModels = await deepseek.fetchModels();
      assert.ok(Array.isArray(deepseekModels) && deepseekModels.length > 0);
      assert.equal((await deepseek.testConnection('', '')).ok, false);
      const deepseekTest = await deepseek.testConnection('', 'sk-deepseek-test');
      assert.equal(deepseekTest.ok, true);

      // Error handling test
      globalThis.fetch = async () => { throw new Error('Network timeout'); };
      const failedTest = await claude.testConnection('', 'sk-ant-test');
      assert.equal(failedTest.ok, false);
      assert.match(failedTest.error, /Network timeout/);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('Local providers (LM Studio & Ollama) fetch models and test connections', async () => {
    const origFetch = globalThis.fetch;

    try {
      // LM Studio Mock
      globalThis.fetch = async (url) => {
        if (url.includes('/models')) {
          return new Response(JSON.stringify({ data: [{ id: 'qwen2.5-7b' }, { id: 'llama-3.2-3b' }] }), { status: 200 });
        }
        return new Response(JSON.stringify({ choices: [{ message: { content: 'pong' } }] }), { status: 200 });
      };

      const lm = new LMStudioProvider();
      const lmModels = await lm.fetchModels('http://localhost:1234');
      assert.equal(lmModels.length, 2);
      assert.equal(lmModels[0].id, 'qwen2.5-7b');
      const lmTest = await lm.testConnection('http://localhost:1234', '', 'qwen2.5-7b');
      assert.equal(lmTest.ok, true);

      // Ollama Mock
      globalThis.fetch = async (url) => {
        if (url.includes('/tags')) {
          return new Response(JSON.stringify({ models: [{ name: 'llama3:latest' }, { name: 'mistral:latest' }] }), { status: 200 });
        }
        return new Response(JSON.stringify({ message: { content: 'pong' } }), { status: 200 });
      };

      const ollama = new OllamaProvider();
      const ollamaModels = await ollama.fetchModels('http://localhost:11434');
      assert.equal(ollamaModels.length, 2);
      assert.equal(ollamaModels[0].id, 'llama3:latest');
      const ollamaTest = await ollama.testConnection('http://localhost:11434', '', 'llama3:latest');
      assert.equal(ollamaTest.ok, true);

      // Ollama fallback to /v1/models when /api/tags fails
      globalThis.fetch = async (url) => {
        if (url.includes('/tags')) {
          return new Response('Not found', { status: 404 });
        }
        if (url.includes('/v1/models')) {
          return new Response(JSON.stringify({ data: [{ id: 'qwen-fallback' }] }), { status: 200 });
        }
        return new Response('Error', { status: 500 });
      };
      const ollamaFallback = await ollama.fetchModels('http://localhost:11434');
      assert.equal(ollamaFallback.length, 1);
      assert.equal(ollamaFallback[0].id, 'qwen-fallback');

      // Local connection failure
      globalThis.fetch = async () => { throw new Error('Connection refused'); };
      const lmFail = await lm.testConnection('http://localhost:1234');
      assert.equal(lmFail.ok, false);
      const ollamaFail = await ollama.testConnection('http://localhost:11434');
      assert.equal(ollamaFail.ok, false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('Timedtext XML & TTML Parser Coverage', () => {
  it('parseTimedtextXml parses standard XML text tags and TTML p tags', () => {
    // Empty inputs
    assert.deepEqual(TimedtextParser.parseTimedtextXml(''), []);
    assert.deepEqual(TimedtextParser.parseTimedtextXml(null), []);

    // Mock DOMParser in Node environment for XML test
    const origDOMParser = globalThis.DOMParser;
    try {
      globalThis.DOMParser = class MockDOMParser {
        parseFromString(str) {
          return {
            querySelectorAll(selector) {
              if (selector === 'text') {
                const matches = [];
                const regex = /<text start="([^"]+)" dur="([^"]+)">([^<]+)<\/text>/g;
                let m;
                while ((m = regex.exec(str)) !== null) {
                  const startVal = m[1];
                  const durVal = m[2];
                  const textVal = m[3];
                  matches.push({
                    getAttribute: (attr) => attr === 'start' ? startVal : (attr === 'dur' ? durVal : null),
                    textContent: textVal
                  });
                }
                return matches;
              }
              if (selector === 'p') {
                const matches = [];
                const regex = /<p(?: t="([^"]+)" d="([^"]+)"| begin="([^"]+)")>([^<]+)<\/p>/g;
                let m;
                while ((m = regex.exec(str)) !== null) {
                  const tVal = m[1];
                  const dVal = m[2];
                  const beginVal = m[3];
                  const textVal = m[4];
                  matches.push({
                    getAttribute: (attr) => {
                      if (attr === 't') return tVal || null;
                      if (attr === 'd') return dVal || null;
                      if (attr === 'begin') return beginVal || null;
                      return null;
                    },
                    textContent: textVal
                  });
                }
                return matches;
              }
              return [];
            }
          };
        }
      };

      const standardXml = `
        <transcript>
          <text start="0.5" dur="2.0">Welcome to this video</text>
          <text start="2.5" dur="3.0">In this chapter we explore</text>
          <text start="5.5" dur="1.5">Deep concepts and algorithms</text>
          <text start="7.0" dur="2.0">Thank you for watching</text>
        </transcript>
      `;

      const segsA = TimedtextParser.parseTimedtextXml(standardXml);
      assert.equal(segsA.length, 4);
      assert.equal(segsA[0].startMs, 500);
      assert.equal(segsA[0].durationMs, 2000);
      assert.equal(segsA[0].text, 'Welcome to this video');

      const ttmlXml = `
        <tt><body><div>
          <p t="1000" d="2000">First line</p>
          <p t="3000" d="2500">Second line</p>
          <p t="5500" d="1500">Third line</p>
          <p t="7000" d="3000">Fourth line</p>
        </div></body></tt>
      `;

      const segsB = TimedtextParser.parseTimedtextXml(ttmlXml);
      assert.equal(segsB.length, 4);
      assert.equal(segsB[0].startMs, 1000);
      assert.equal(segsB[0].durationMs, 2000);
      assert.equal(segsB[0].text, 'First line');

      const ttmlBeginXml = `
        <tt><body><div>
          <p begin="1.5">First line begin</p>
          <p begin="3.0">Second line begin</p>
          <p begin="5.5">Third line begin</p>
          <p begin="7.0">Fourth line begin</p>
        </div></body></tt>
      `;
      const segsC = TimedtextParser.parseTimedtextXml(ttmlBeginXml);
      assert.equal(segsC.length, 4);
      assert.equal(segsC[0].startMs, 1500);

      const tooShortXml = `
        <transcript>
          <text start="0.5" dur="2.0">Only one text</text>
        </transcript>
      `;
      assert.deepEqual(TimedtextParser.parseTimedtextXml(tooShortXml), []);
    } finally {
      globalThis.DOMParser = origDOMParser;
    }
  });
});

describe('PromptBuilder & StreamRelay Comprehensive Coverage', () => {
  const builder = new PromptBuilder();

  it('buildSummaryPrompts handles detailed mode, French, and custom directives', () => {
    const resDetailed = builder.buildSummaryPrompts({
      title: 'Guide complet IA',
      author: 'Tech France',
      transcript: 'Ceci est une longue transcription de test pour vérifier le prompt détaillé.',
      mode: 'detailed',
      lang: 'fr',
      customDirectives: 'Mettre l accent sur les architectures neuronales.'
    });

    assert.match(resDetailed.systemPrompt, /Tu es un assistant IA d'élite/);
    assert.match(resDetailed.userPrompt, /synthèse COMPLÈTE, DÉTAILLÉE et EXHAUSTIVE/);
    assert.match(resDetailed.userPrompt, /DIRECTIVES PERSONNALISÉES DE L'UTILISATEUR/);
    assert.match(resDetailed.userPrompt, /Mettre l accent sur les architectures neuronales/);

    const resStandard = builder.buildSummaryPrompts({
      title: 'Complete Guide',
      author: 'Tech USA',
      transcript: 'A standard transcript for testing.',
      mode: 'standard',
      lang: 'en'
    });
    assert.match(resStandard.systemPrompt, /You are an expert AI assistant/);
    assert.match(resStandard.userPrompt, /BALANCED, NATURAL, and STRUCTURED summary/);

    // French Quick and Standard modes
    const resFrQuick = builder.buildSummaryPrompts({ title: 'T', author: 'A', transcript: 'Tr', lang: 'fr', mode: 'quick' });
    assert.match(resFrQuick.userPrompt, /Produis un résumé COURT, CONCIS et DIRECT/);
    const resFrStd = builder.buildSummaryPrompts({ title: 'T', author: 'A', transcript: 'Tr', lang: 'fr', mode: 'standard' });
    assert.match(resFrStd.userPrompt, /Produis un résumé ÉQUILIBRÉ, NATUREL et STRUCTURÉ/);

    // English Quick and Detailed modes
    const resEnQuick = builder.buildSummaryPrompts({ title: 'T', author: 'A', transcript: 'Tr', lang: 'en', mode: 'quick' });
    assert.match(resEnQuick.userPrompt, /Produce a SHORT, CONCISE, and DIRECT summary/);
    const resEnDet = builder.buildSummaryPrompts({ title: 'T', author: 'A', transcript: 'Tr', lang: 'en', mode: 'detailed', customDirectives: 'Add key takeaways' });
    assert.match(resEnDet.userPrompt, /Produce a THOROUGH, DETAILED, and COMPREHENSIVE study guide/);
    assert.match(resEnDet.userPrompt, /USER CUSTOM DIRECTIVES:/);

    // Condense Transcript
    assert.equal(builder.condenseTranscript('', 100), '');
    assert.equal(builder.condenseTranscript(null, 100), '');
    assert.equal(builder.condenseTranscript('Short text', 500), 'Short text');
    const longText = 'A'.repeat(600);
    const condensed = builder.condenseTranscript(longText, 100);
    assert.match(condensed, /Progression de la vidéo condensée/);
  });

  it('buildChatPrompts constructs system prompt with language and messages list', () => {
    const chatPrompts = builder.buildChatPrompts(
      'Deep Learning 101',
      'The video explains convolutional networks at 02:15.',
      'fr',
      [{ role: 'user', content: 'What is CNN?' }, { role: 'assistant', content: 'It is a network.' }],
      'Where is it mentioned?'
    );

    assert.match(chatPrompts.systemPrompt, /Deep Learning 101/);
    assert.match(chatPrompts.systemPrompt, /Always answer in French/);
    assert.equal(chatPrompts.messages.length, 3);
    assert.equal(chatPrompts.messages[2].content, 'Where is it mentioned?');
  });

  it('StreamRelay context error formatting for all providers', () => {
    const ollamaMsg = StreamRelay.formatContextError('Context length exceeded 2048', 'ollama', 'qwen');
    assert.match(ollamaMsg, /num_ctx/);

    const lmMsg = StreamRelay.formatContextError('max context size', 'lmstudio', 'llama');
    assert.match(lmMsg, /LM Studio/);

    const claudeMsg = StreamRelay.formatContextError('prompt too long', 'claude', 'haiku');
    assert.match(claudeMsg, /Dépassement de contexte/);

    const genericMsg = StreamRelay.formatContextError('context limit', 'gemini', 'flash');
    assert.match(genericMsg, /Dépassement de contexte/);

    const unaffectedMsg = StreamRelay.formatContextError('Network 503 error', 'openai');
    assert.equal(unaffectedMsg, 'Network 503 error');
  });
});

describe('InnerTubeParser Chapters and Edge Cases Coverage', () => {
  it('extractSegmentsFromInnerTubeJson handles macroMarkers and empty inputs', () => {
    assert.equal(InnerTubeParser.extractSegmentsFromInnerTubeJson(null), null);
    assert.equal(InnerTubeParser.extractSegmentsFromInnerTubeJson({}), null);
    assert.equal(InnerTubeParser.extractSegmentsFromInnerTubeJson([]), null);

    // Macro markers chapter with simpleText
    const macroJson = {
      macroMarkersListItemRenderer: {
        timeDescription: { simpleText: '01:23' },
        title: { simpleText: 'Introduction Chapter' }
      }
    };
    const segsA = InnerTubeParser.extractSegmentsFromInnerTubeJson(macroJson);
    assert.equal(segsA.length, 1);
    assert.equal(segsA[0].timestamp, '01:23');
    assert.equal(segsA[0].text, 'Introduction Chapter');

    // Macro markers chapter with runs
    const macroRunsJson = {
      macroMarkersListItemRenderer: {
        timeDescription: { runs: [{ text: '05:45' }] },
        title: { runs: [{ text: 'Deep Dive & Analysis' }] }
      }
    };
    const segsB = InnerTubeParser.extractSegmentsFromInnerTubeJson(macroRunsJson);
    assert.equal(segsB.length, 1);
    assert.equal(segsB[0].timestamp, '05:45');
    assert.equal(segsB[0].text, 'Deep Dive & Analysis');
  });
});

describe('Domain Models & Errors Validation', () => {
  it('TranscriptSegment formatting and boundary checks', () => {
    const seg = new TranscriptSegment(125000, 5000, 'Important statement');
    assert.equal(seg.startMs, 125000);
    assert.equal(seg.durationMs, 5000);
    assert.equal(seg.text, 'Important statement');
    assert.equal(seg.timestamp, '2:05');
    assert.equal(seg.formatTime(), '2:05');

    const longSeg = new TranscriptSegment(3725000, 5000, 'Hour mark');
    assert.equal(longSeg.timestamp, '1:02:05');
  });

  it('AppError, AIProviderError, and TranscriptError hierarchy', () => {
    const appErr = new AppError('General failure', 'ERR_APP', { extra: 1 });
    assert.equal(appErr.message, 'General failure');
    assert.equal(appErr.code, 'ERR_APP');
    assert.equal(appErr.details.extra, 1);

    const aiErr = new AIProviderError('API error', 'ERR_GROQ_429', { provider: 'groq' });
    assert.equal(aiErr.code, 'ERR_GROQ_429');
    assert.equal(aiErr.details.provider, 'groq');

    const transErr = new TranscriptError('Captions missing', 'NO_CAPTIONS');
    assert.equal(transErr.code, 'NO_CAPTIONS');
  });

  it('VideoMetadata and AIRequest models instantiation', () => {
    const defaultMeta = new VideoMetadata();
    assert.equal(defaultMeta.videoId, '');
    assert.equal(defaultMeta.title, '');

    const meta = new VideoMetadata('vid123', 'My Video', 'Creator', 'https://youtube.com/watch?v=vid123');
    assert.equal(meta.videoId, 'vid123');
    assert.equal(meta.title, 'My Video');
    assert.equal(meta.author, 'Creator');

    assert.equal(VideoMetadata.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.equal(VideoMetadata.extractVideoId('https://www.youtube.com/shorts/abcdef12345'), 'abcdef12345');
    assert.equal(VideoMetadata.extractVideoId('https://www.youtube.com/live/live1234567'), 'live1234567');
    assert.equal(VideoMetadata.extractVideoId(''), '');
    assert.equal(VideoMetadata.extractVideoId('http://:80/shorts/abcdef12345'), 'abcdef12345');
    assert.equal(VideoMetadata.extractVideoId('http://:80/invalid'), '');
    assert.equal(VideoMetadata.extractVideoId('completely_invalid'), '');

    const defaultReq = new AIRequest();
    assert.equal(defaultReq.provider, 'lmstudio');
    assert.equal(defaultReq.maxTokens, null);

    const req = new AIRequest({ provider: 'openai', model: 'gpt-4o', maxTokens: 800, messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(req.provider, 'openai');
    assert.equal(req.model, 'gpt-4o');
    assert.equal(req.maxTokens, 800);
    assert.equal(req.messages.length, 1);

    const reqFromPrompts = AIRequest.fromPrompts('System instructions', 'User question', { model: 'claude-3-5' });
    assert.equal(reqFromPrompts.messages.length, 2);
    assert.equal(reqFromPrompts.messages[0].role, 'system');
    assert.equal(reqFromPrompts.messages[1].role, 'user');

    const emptyPromptsReq = AIRequest.fromPrompts('', '');
    assert.equal(emptyPromptsReq.messages.length, 0);
  });
});
