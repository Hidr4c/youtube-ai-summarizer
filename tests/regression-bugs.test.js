import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { AIProviderFactory } from '../src/services/ai/providers/AIProviderFactory.js';
import { BaseAIProvider } from '../src/services/ai/providers/BaseAIProvider.js';
import { InnerTubeParser } from '../src/parsers/InnerTubeParser.js';

test('Regression Suite - Bug Prevention & Integration Contracts', async (suite) => {
  const rootDir = path.resolve('.');

  // Helper to read all content script sources
  const getAllContentSrc = () => {
    const contentFiles = fs.readdirSync(path.join(rootDir, 'src/content'), { recursive: true }).filter(f => f.endsWith('.js'));
    return contentFiles.map(f => fs.readFileSync(path.join(rootDir, 'src/content', f), 'utf-8')).join('\n');
  };

  // 1. REGRESSION: Multi-Model Transcript Extraction & State Preservation
  await suite.test('Multi-Model Transcript: handles all YouTube layouts and preserves user panel state', () => {
    const contextExtractorSrc = fs.readFileSync(path.join(rootDir, 'src/injected/YouTubeContextExtractor.js'), 'utf-8') +
      (fs.existsSync(path.join(rootDir, 'src/injected/InnerTubeBridge.js')) ? fs.readFileSync(path.join(rootDir, 'src/injected/InnerTubeBridge.js'), 'utf-8') : '');
    const contentSrc = getAllContentSrc();

    // ContextExtractor runs purely in memory without DOM clicks
    const forbiddenInMainWorld = [
      /description.*\.click\(\)/i,
      /engagement-panel.*\.click\(\)/i,
      /transcript.*\.click\(\)/i,
      /aria-label.*transcript.*click/i
    ];
    for (const pattern of forbiddenInMainWorld) {
      assert.equal(
        pattern.test(contextExtractorSrc),
        false,
        `YouTubeContextExtractor must not click DOM to extract transcript (matched ${pattern})`
      );
    }

    // Must use in-memory message protocol
    assert.match(contextExtractorSrc, /YT_AI_REQ_PLAYER_DATA/);
    assert.match(contextExtractorSrc, /YT_AI_RES_PLAYER_DATA/);
    assert.match(contentSrc, /YT_AI_REQ_PLAYER_DATA/);

    // Multi-model support functions must be present in content/index.js:
    assert.match(contentSrc, /function isNativeTranscriptPanelVisible\(\)/, 'Must check if panel is already visible');
    assert.match(contentSrc, /function closeNativeTranscriptPanel\(\)/, 'Must be able to restore closed state');
    assert.match(contentSrc, /function collapseDescription\(\)/, 'Must be able to collapse expanded description');
    assert.match(contentSrc, /function triggerStealthNativeTranscript\(\)/, 'Must have stealth native loader');
    assert.match(contentSrc, /function extractChaptersFromDescription\(\)/, 'Must have chapters / "Dans cette vidéo" parser');

    // State preservation rule: when stealth trigger runs, it only closes if it wasn't open before
    assert.match(contentSrc, /if \(!wasPanelOpen\) \{\s*closeNativeTranscriptPanel\(\)/);
  });

  // 2. REGRESSION: Model Detection Response Contracts (success, ok, data.data, models)
  await suite.test('Model Detection: response contracts guarantee both modern and legacy format consumers', async () => {
    const mockModels = [
      { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
      { id: 'llama3.2:3b', name: 'Llama 3.2 3B' }
    ];

    const buildFetchModelsResponse = (models) => ({
      success: true,
      ok: true,
      data: { data: models, models: models },
      models: models
    });

    const response = buildFetchModelsResponse(mockModels);

    assert.equal(response.success, true);
    assert.equal(response.ok, true);
    assert.deepEqual(response.models, mockModels);
    assert.deepEqual(response.data.data, mockModels);
    assert.deepEqual(response.data.models, mockModels);
  });

  // 3. REGRESSION: AI Stream Message Synthesis (systemPrompt + userPrompt when messages is omitted)
  await suite.test('StreamRelay: synthesizes chatMessages when messages array is omitted', async () => {
    const capturedRequests = [];
    const originalFetch = globalThis.fetch;

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

  // 4. REGRESSION: Minimalist Header UI Layout & Settings Tab Order
  await suite.test('Minimalist Header & Settings Order: Model -> Params -> Audio', () => {
    const contentSrc = getAllContentSrc();
    const headerBarMatch = contentSrc.match(/<div class="yt-ai-header-bar">([\s\S]*?)<\/div>\s*<!-- CONTENU DÉPLIABLE -->/);
    assert.ok(headerBarMatch, 'Header bar must exist in template');
    const headerBarHtml = headerBarMatch[1];

    // Header bar MUST contain:
    assert.match(headerBarHtml, /ytAiBrandToggle/, 'Brand/logo must be in header');
    assert.match(headerBarHtml, /ytAiLangSelect/, 'Language selector must be in header');
    assert.match(headerBarHtml, /ytAiSummarizeBtn/, 'Summarize CTA button must be in header');
    assert.match(headerBarHtml, /ytAiSettingsToggleBtn/, 'Settings button must be in header');
    assert.match(headerBarHtml, /ytAiToggleBtn/, 'Expand/collapse button must be in header');

    // Header bar MUST NOT contain:
    assert.equal(headerBarHtml.includes('id="ytAiFormatPills"'), false, 'Format pills must be removed from header bar');
    assert.equal(headerBarHtml.includes('id="ytAiBadge"'), false, 'Status badge must be removed from header bar');
    assert.equal(headerBarHtml.includes('id="ytAiHeaderModelPill"'), false, 'Active model pill must be removed from header bar');
    assert.equal(headerBarHtml.includes('v1.3.0'), false, 'Duplicate version link must be removed from header bar');

    // Controls MUST be found inside the Settings Drawer:
    const settingsDrawerMatch = contentSrc.match(/<div id="ytAiSettingsDrawer"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*`;/);
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

    // Settings subtab buttons order: Model -> Params -> Audio
    const modelIdx = settingsDrawerHtml.indexOf('data-subtab="model"');
    const paramsIdx = settingsDrawerHtml.indexOf('data-subtab="params"');
    const audioIdx = settingsDrawerHtml.indexOf('data-subtab="audio"');
    assert.ok(modelIdx < paramsIdx, 'Model tab must come before Params tab');
    assert.ok(paramsIdx < audioIdx, 'Params tab must come before Audio tab');

    // Settings subpanes order: SubpaneModel -> SubpaneParams -> SubpaneAudio
    const paneModelIdx = settingsDrawerHtml.indexOf('id="ytAiSettingsSubpaneModel"');
    const paneParamsIdx = settingsDrawerHtml.indexOf('id="ytAiSettingsSubpaneParams"');
    const paneAudioIdx = settingsDrawerHtml.indexOf('id="ytAiSettingsSubpaneAudio"');
    assert.ok(paneModelIdx < paneParamsIdx, 'Model subpane must come before Params subpane');
    assert.ok(paneParamsIdx < paneAudioIdx, 'Params subpane must come before Audio subpane');
  });

  // 5. REGRESSION: Provider URL Normalization (http:// scheme & trailing slash cleanup)
  await suite.test('URL Normalization: guarantees local endpoints are properly formatted', () => {
    const provider = new BaseAIProvider('lmstudio', 'LM Studio', true);

    assert.equal(provider.normalizeUrl('192.168.56.1:1234'), 'http://192.168.56.1:1234');
    assert.equal(provider.normalizeUrl('localhost:11434'), 'http://localhost:11434');
    assert.equal(provider.normalizeUrl('http://localhost:11434/'), 'http://localhost:11434');
    assert.equal(provider.normalizeUrl('http://192.168.56.1:1234///'), 'http://192.168.56.1:1234');
    assert.equal(provider.normalizeUrl('https://api.deepseek.com/v1'), 'https://api.deepseek.com/v1');
  });

  // 6. REGRESSION: Header-Scoped Close, Stealth Timeout & Multilingual Regex
  await suite.test('Native Transcript Closing: strictly scoped to header, multilingual, and stealth delay preserved', () => {
    const contentSrc = getAllContentSrc();

    // Forbidden: unscoped yt-button-shape button search on panel that would match body tabs
    assert.equal(
      contentSrc.includes("panel.querySelector('#visibility-button button, button[aria-label*=\"Fermer\" i], button[aria-label*=\"Close\" i], yt-button-shape button')"),
      false,
      'Close button search must never match body tabs via unscoped yt-button-shape button'
    );

    // Required: Scoped strictly to header
    assert.match(contentSrc, /header\.querySelector\('#visibility-button button/);
    assert.match(contentSrc, /panel\.style\.setProperty\('display',\s*'none'/);

    // Required: Multilingual regex
    assert.match(contentSrc, /TRANSCRIPT_LANG_REGEX/);
    assert.match(contentSrc, /CLOSE_BTN_LANG_REGEX/);

    // Test regex on various languages
    const transRegex = /transcript|transcription|transcrip|transkript|trascriz|trascrizione|транскрип|расшифровк|文字起こし|文字记录|文字記錄|스크립트|نص|प्रतिलेख/i;
    assert.equal(transRegex.test('Transcription'), true, 'Matches French');
    assert.equal(transRegex.test('Show transcript'), true, 'Matches English');
    assert.equal(transRegex.test('Transkript'), true, 'Matches German');
    assert.equal(transRegex.test('Mostrar transcripción'), true, 'Matches Spanish');
    assert.equal(transRegex.test('Trascrizione'), true, 'Matches Italian');
    assert.equal(transRegex.test('Показать расшифровку видео'), true, 'Matches Russian');
    assert.equal(transRegex.test('文字起こし'), true, 'Matches Japanese');
    assert.equal(transRegex.test('文字记录'), true, 'Matches Chinese');
    assert.equal(transRegex.test('스크립트'), true, 'Matches Korean');

    const closeRegex = /fermer|close|schließen|cerrar|chiudi|fechar|закрыть|sluiten|stäng|luk|sulje|閉じる|닫기|关闭|關閉|إغلاق|बंद करें/i;
    assert.equal(closeRegex.test('Fermer'), true, 'Matches French close');
    assert.equal(closeRegex.test('Close'), true, 'Matches English close');
    assert.equal(closeRegex.test('Schließen'), true, 'Matches German close');
    assert.equal(closeRegex.test('Cerrar'), true, 'Matches Spanish close');
    assert.equal(closeRegex.test('Chiudi'), true, 'Matches Italian close');
    assert.equal(closeRegex.test('Закрыть'), true, 'Matches Russian close');
    assert.equal(closeRegex.test('閉じる'), true, 'Matches Japanese close');
    assert.equal(closeRegex.test('关闭'), true, 'Matches Chinese close');

    // Required: Stealth delay to avoid flash when closing
    assert.match(contentSrc, /setTimeout\(\(\)\s*=>\s*\{[\s\S]*?stealthStyle\.parentNode\.removeChild\(stealthStyle\)[\s\S]*?\},\s*350\)/);
  });

  // 7. REGRESSION: YouTube Theme Adaptation (Dark & Light Mode Support)
  await suite.test('Theme Adaptation: CSS variables and dynamic observer for dark/light YouTube parity', () => {
    const cssSrc = fs.readFileSync(path.join(rootDir, 'src/content/content.css'), 'utf-8');
    const contentSrc = getAllContentSrc();

    // CSS Theme variables definitions
    assert.match(cssSrc, /html\[dark\]\s*#yt-ai-summarizer-container/);
    assert.match(cssSrc, /html:not\(\[dark\]\)\s*#yt-ai-summarizer-container/);
    assert.match(cssSrc, /\.yt-ai-dark-theme/);
    assert.match(cssSrc, /\.yt-ai-light-theme/);

    // Essential theme variables must be declared
    const requiredVars = [
      '--yt-ai-bg',
      '--yt-ai-bg-header',
      '--yt-ai-bg-card',
      '--yt-ai-bg-secondary',
      '--yt-ai-border',
      '--yt-ai-border-subtle',
      '--yt-ai-text',
      '--yt-ai-text-secondary',
      '--yt-ai-timestamp-bg',
      '--yt-ai-timestamp-text'
    ];
    for (const v of requiredVars) {
      assert.equal(cssSrc.includes(v), true, `CSS variable ${v} must be defined`);
    }

    // Dynamic theme synchronization functions in content/index.js
    assert.match(contentSrc, /function syncThemeWithYouTube\(/);
    assert.match(contentSrc, /function initThemeSync\(/);
    assert.match(contentSrc, /attributes:\s*true,\s*attributeFilter:\s*\['dark',\s*'class'\]/);
  });

  // 8. REGRESSION: Speech Synthesis Reliability (LANG_LOCALES import, Chunking, Chrome 15s keepalive & DOM fallback)
  await suite.test('Speech Synthesis: LANG_LOCALES import, sentence chunking, Chrome keepalive & DOM fallback', () => {
    const contentSrc = getAllContentSrc();

    // LANG_LOCALES must be imported to prevent ReferenceError when clicking listen or mic
    assert.match(contentSrc, /import\s*\{[^}]*LANG_LOCALES[^}]*\}\s*from\s*['"](?:\.\.\/)+config\/AIProviderPresets\.js['"]/);
    assert.match(contentSrc, /DEFAULT_LANG_LOCALES/);

    // Sentence chunking must exist to prevent synthesis-failed buffer overflow on long summaries
    assert.match(contentSrc, /function splitTextIntoSpeechChunks\(/);

    // Chrome 15-second speech keepalive watchdog must exist
    assert.match(contentSrc, /speechKeepAliveTimer/);
    assert.match(contentSrc, /window\.speechSynthesis\.pause\(\);\s*window\.speechSynthesis\.resume\(\);/);

    // activeUtterance must be stored to prevent Chrome V8 garbage-collection mid-speech
    assert.match(contentSrc, /activeUtterance\s*=\s*utterance/);

    // DOM fallback on summary body if fullSummaryMarkdown is empty
    assert.match(contentSrc, /document\.getElementById\('ytAiSummaryBody'\)/);
  });

  // 9. REGRESSION: Complete Speech Transcript vs Video Chapters Separation
  await suite.test('Speech Transcript vs Chapters: InnerTubeParser separation, DOM selectors, and quality guards', () => {
    const contentFiles = fs.readdirSync(path.join(rootDir, 'src/content'), { recursive: true }).filter(f => f.endsWith('.js'));
    const contentSrc = contentFiles.map(f => fs.readFileSync(path.join(rootDir, 'src/content', f), 'utf-8')).join('\n');
    const extractorSrc = fs.readFileSync(path.join(rootDir, 'src/injected/YouTubeContextExtractor.js'), 'utf-8') +
      (fs.existsSync(path.join(rootDir, 'src/injected/InnerTubeBridge.js')) ? fs.readFileSync(path.join(rootDir, 'src/injected/InnerTubeBridge.js'), 'utf-8') : '');

    // 1. Fallback 2 in extractTranscriptFromActiveDOM must strictly exclude macro-markers
    assert.equal(
      contentSrc.includes('target-id*="transcript"]:not([target-id*="macro-markers"])'),
      true,
      'extractTranscriptFromActiveDOM must strictly exclude macro-markers'
    );
    assert.match(
      contentSrc,
      /\/\/ 2\. Fallback textuel STRICTEMENT sur les panneaux de transcription dédiés \(JAMAIS sur les panneaux de chapitres\)/,
      'extractTranscriptFromActiveDOM must document strict chapter exclusion'
    );

    // 2. InnerTubeParser must prioritize speech segments over chapters and support allowChapters: false
    const mixedJson = {
      response: {
        actions: [
          {
            macroMarkersListItemRenderer: {
              timeDescription: { simpleText: '00:00' },
              title: { simpleText: 'Chapter 1' }
            }
          },
          {
            transcriptSegmentViewModel: {
              startTimeText: { content: '0:02' },
              snippet: { content: 'This is real speech text.' }
            }
          }
        ]
      }
    };
    const speechOnly = InnerTubeParser.extractSegmentsFromInnerTubeJson(mixedJson);
    assert.equal(speechOnly.length, 1);
    assert.equal(speechOnly[0].timestamp, '0:02');
    assert.equal(speechOnly[0].text, 'This is real speech text.');

    // Chapters only with allowChapters: false must return null
    const chaptersOnlyJson = {
      macroMarkersListItemRenderer: {
        timeDescription: { simpleText: '02:20' },
        title: { simpleText: 'Why time dilates' }
      }
    };
    assert.equal(InnerTubeParser.extractSegmentsFromInnerTubeJson(chaptersOnlyJson, { allowChapters: false }), null);
    assert.equal(InnerTubeParser.extractSegmentsFromInnerTubeJson(chaptersOnlyJson, { allowChapters: true }).length, 1);

    // 3. YouTubeContextExtractor must call extractSegmentsFromInnerTubeJson with allowChapters: false
    assert.match(
      extractorSrc,
      /extractSegmentsFromInnerTubeJson\(window\.ytInitialData,\s*\{\s*allowChapters:\s*false\s*\}\)/,
      'Main world extractor must reject chapters from ytInitialData'
    );

    // 4. YouTubeContextExtractor must have extractTranscript method implemented
    assert.match(extractorSrc, /async extractTranscript\(requestedVideoId/);

    // 5. YouTubeContextExtractor must differentiate get_transcript vs browse_continuation
    assert.match(extractorSrc, /type:\s*['"]browse_continuation['"]/);
    assert.match(extractorSrc, /https:\/\/www\.youtube\.com\/youtubei\/v1\/browse/);

    // 6. Quality guards: isChapterOnly tracking and dynamic upgrade observer in content/index.js
    assert.match(contentSrc, /isChapterOnly:\s*!!isChapterOnly/);
    assert.match(contentSrc, /\(Chapitres\)/);
    assert.match(contentSrc, /transcript-segment-view-model,\s*ytd-transcript-segment-renderer/);
  });

  // 10. REGRESSION: Video and Channel Context (Description, Subscribers, Category, Tags)
  await suite.test('Video and Channel Context: In-memory extraction, DOM fallbacks, and prompt injection', () => {
    const extractorSrc = fs.readFileSync(path.join(rootDir, 'src/injected/YouTubeContextExtractor.js'), 'utf-8') +
      (fs.existsSync(path.join(rootDir, 'src/injected/InnerTubeBridge.js')) ? fs.readFileSync(path.join(rootDir, 'src/injected/InnerTubeBridge.js'), 'utf-8') : '');
    const contentFiles = fs.readdirSync(path.join(rootDir, 'src/content'), { recursive: true }).filter(f => f.endsWith('.js'));
    const contentSrc = contentFiles.map(f => fs.readFileSync(path.join(rootDir, 'src/content', f), 'utf-8')).join('\n');
    const modelSrc = fs.readFileSync(path.join(rootDir, 'src/domain/models/VideoMetadata.js'), 'utf-8');

    // 1. YouTubeContextExtractor must extract description, keywords, category, publishDate, and channelId
    assert.match(extractorSrc, /const\s+description\s*=\s*videoDetails\.shortDescription/);
    assert.match(extractorSrc, /const\s+keywords\s*=\s*Array\.isArray\(videoDetails\.keywords\)/);
    assert.match(extractorSrc, /const\s+category\s*=\s*microformat\.category/);
    assert.match(extractorSrc, /const\s+publishDate\s*=\s*microformat\.publishDate/);
    assert.match(extractorSrc, /description,\s*keywords,\s*category,\s*publishDate/);

    // 2. Content script must maintain cachedVideoMetadata and query DOM for channel subscribers
    assert.match(contentSrc, /cachedVideoMetadata\s*=\s*\{/);
    assert.match(contentSrc, /#owner-sub-count/);
    assert.match(contentSrc, /#description-inline-expander/);
    assert.match(contentSrc, /formatContextInfo/);

    // 3. buildPrompts and buildChatSystemPrompt must inject context
    assert.match(contentSrc, /function buildPrompts\(title,\s*author,\s*safeTranscript,\s*lang,\s*mode,\s*meta/);
    assert.match(contentSrc, /function buildChatSystemPrompt\(meta,\s*safeTranscript,\s*lang,\s*selectedChatMode\)/);
    assert.match(contentSrc, /strictly based on its transcript and official video context/);
    assert.match(contentSrc, /t['’]appuyant rigoureusement sur sa transcription et sur le contexte officiel/);

    // 4. VideoMetadata entity must accept extra options without breaking existing contract
    assert.match(modelSrc, /constructor\(videoId\s*=\s*'',\s*title\s*=\s*'',\s*author\s*=\s*'',\s*url\s*=\s*'',\s*extra\s*=\s*\{\}\)/);
    assert.match(modelSrc, /this\.subscribers\s*=\s*String\(extra\?\.subscribers/);
    assert.match(modelSrc, /this\.description\s*=\s*String\(extra\?\.description/);
  });
});

