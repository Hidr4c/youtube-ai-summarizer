import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InPageAudioController } from '../src/content/services/InPageAudioController.js';
import { SpeechPlayerBar } from '../src/content/ui/SpeechPlayerBar.js';
import { AccessiblePageDescriber } from '../src/content/ui/AccessiblePageDescriber.js';
import { VideoFrameExtractor } from '../src/content/services/VideoFrameExtractor.js';
import { PageVisionCollector } from '../src/content/services/PageVisionCollector.js';
import { StreamRelay } from '../src/background/StreamRelay.js';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { WebPageController } from '../src/content/services/WebPageController.js';
import { ChatViewController } from '../src/content/ui/ChatViewController.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { I18N } from '../src/locales/index.js';

function createInteractiveMockDom(ids = []) {
  const elements = new Map();
  const makeNode = (tag = 'div', id = '') => {
    const classes = new Set();
    const listeners = new Map();
    const attrs = new Map();
    let _html = '';
    const node = {
      tagName: tag.toUpperCase(),
      id,
      type: '',
      className: '',
      value: '',
      min: '',
      max: '',
      step: '',
      textContent: '',
      title: '',
      disabled: false,
      dataset: {},
      style: {},
      children: [],
      parentNode: null,
      get firstChild() { return this.children[0] || null; },
      get innerHTML() { return _html; },
      set innerHTML(v) { _html = String(v); if (!_html) this.children = []; },
      classList: {
        add: (...cls) => cls.forEach((c) => classes.add(c)),
        remove: (...cls) => cls.forEach((c) => classes.delete(c)),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : Boolean(force);
          if (on) classes.add(c); else classes.delete(c);
          return on;
        },
        contains: (c) => classes.has(c)
      },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => attrs.get(k) || '',
      appendChild(child) {
        if (!child) return child;
        child.parentNode = this;
        if (child.id) elements.set(child.id, child);
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        return child;
      },
      remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
      },
      focus() {},
      addEventListener(evt, fn) {
        if (!listeners.has(evt)) listeners.set(evt, []);
        listeners.get(evt).push(fn);
      },
      dispatch(evt, evObj = {}) {
        (listeners.get(evt) || []).forEach((fn) => fn({ target: this, stopPropagation() {}, ...evObj }));
      },
      click() { this.dispatch('click'); },
      querySelector(sel) {
        const cls = sel.startsWith('.') ? sel.slice(1) : sel;
        for (const c of this.children) {
          if ((sel.startsWith('#') && c.id === sel.slice(1)) || String(c.className || '').split(/\s+/).includes(cls) || c.classList?.contains(cls)) return c;
          const nested = c.querySelector?.(sel);
          if (nested) return nested;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const cls = sel.startsWith('.') ? sel.slice(1) : sel;
        for (const c of this.children) {
          if (String(c.className || '').split(/\s+/).includes(cls) || c.classList?.contains(cls)) out.push(c);
          if (c.querySelectorAll) out.push(...c.querySelectorAll(sel));
        }
        return out;
      }
    };
    return node;
  };
  ids.forEach((id) => elements.set(id, makeNode('div', id)));
  globalThis.document = {
    body: { innerText: 'Instagram feed post caption: Morning coffee overlooking Montmartre in Paris.' },
    title: 'Instagram Post',
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => (sel.startsWith('#') ? elements.get(sel.slice(1)) || null : null),
    querySelectorAll: () => [],
    createElement: (tag) => makeNode(tag)
  };
  return { elements };
}

function setupSpeechHarness() {
  const events = [];
  const utterances = [];
  const synth = {
    speaking: false,
    paused: false,
    getVoices: () => [{ name: 'Google français', lang: 'fr-FR', voiceURI: 'fr-1' }],
    speak: (u) => { synth.speaking = true; synth.paused = false; utterances.push(u); events.push(`speak:${u.text}`); },
    pause: () => { synth.paused = true; events.push('pause'); },
    resume: () => { synth.paused = false; events.push('resume'); },
    cancel: () => { synth.speaking = false; synth.paused = false; events.push('cancel'); }
  };
  globalThis.window = {
    speechSynthesis: synth,
    addEventListener: () => {},
    postMessage: () => {},
    location: { href: 'https://www.instagram.com/p/demo123/', origin: 'https://www.instagram.com', hostname: 'www.instagram.com', protocol: 'https:' }
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.voice = null; }
  };
  return { events, utterances, synth };
}

describe('Accessible Low-Vision Page Description & Advanced TTS Player', () => {
  it('SpeechPlayerBar & InPageAudioController support pause, resume, seek across text chunks, restart from start, and stop', () => {
    const { elements } = createInteractiveMockDom(['ytAiLangSelect', 'ytAiSpeechPlayerBar']);
    elements.get('ytAiLangSelect').value = 'fr';
    const { events, utterances } = setupSpeechHarness();

    const audioCtrl = new InPageAudioController();
    SpeechPlayerBar.bind(audioCtrl, () => 'fr');

    const longText = [
      'Première phrase décrivant le site web et son titre principal.',
      'Deuxième phrase détaillant les éléments visuels principaux sur la photo.',
      'Troisième phrase précisant les boutons disponibles à l écran.',
      'Quatrième phrase donnant la conclusion finale de la visite guidée.'
    ].join(' ');

    audioCtrl.speakText(longText, null, { lang: 'fr' });
    const bar = elements.get('ytAiSpeechPlayerBar');
    assert.equal(bar.classList.contains('yt-ai-hidden'), false, 'Speech player bar must become visible when speaking');
    assert.equal(audioCtrl.getSpeechState().totalChunks >= 2, true);
    assert.equal(audioCtrl.getSpeechState().currentIndex, 0);

    // Pause then Resume
    elements.get('ytAiSpeechPauseBtn').click();
    assert.equal(audioCtrl.getSpeechState().isPaused, true);
    assert.ok(events.includes('pause'));
    assert.ok(elements.get('ytAiSpeechPauseBtn').textContent.includes('Reprendre'));

    elements.get('ytAiSpeechPauseBtn').click();
    assert.equal(audioCtrl.getSpeechState().isPaused, false);
    assert.ok(events.includes('resume'));

    // Move playhead via seek slider into a later chunk
    const lastIdx = audioCtrl.getSpeechState().totalChunks - 1;
    const slider = elements.get('ytAiSpeechSeekSlider');
    slider.value = String(lastIdx);
    slider.dispatch('change');
    assert.equal(audioCtrl.getSpeechState().currentIndex, lastIdx);
    assert.ok(utterances[utterances.length - 1].text.includes('Quatrième') || utterances[utterances.length - 1].text.includes('Troisième'));

    // Stale onend from an earlier chunk after seek must NOT skip forward or stop
    utterances[0].onend();
    assert.equal(audioCtrl.getSpeechState().isActive, true);
    assert.equal(audioCtrl.getSpeechState().currentIndex, lastIdx);

    // Restart from beginning resets chunk index back to 0
    elements.get('ytAiSpeechRestartBtn').click();
    assert.equal(audioCtrl.getSpeechState().currentIndex, 0);
    assert.ok(utterances[utterances.length - 1].text.includes('Première'));

    // Stop terminates playback and hides bar
    elements.get('ytAiSpeechStopBtn').click();
    assert.equal(audioCtrl.getSpeechState().isActive, false);
    assert.equal(bar.classList.contains('yt-ai-hidden'), true);
  });

  it('AccessiblePageDescriber on Instagram builds low-vision prompt, inspects blocked images, and auto-reads completed description', async () => {
    const { elements } = createInteractiveMockDom(['ytAiLangSelect', 'ytAiModeSelect', 'ytAiChatMessages', 'ytAiChatQueue', 'ytAiChatInput', 'ytAiChatCount', 'ytAiSpeechPlayerBar']);
    elements.get('ytAiLangSelect').value = 'fr';
    const { utterances } = setupSpeechHarness();

    let sentPayload = null;
    const msgListeners = [];
    globalThis.chrome = {
      runtime: {
        sendMessage: (msg, cb) => {
          if (msg.action === 'FETCH_SAFE_IMAGE') return cb({ success: true, dataUrl: 'data:image/jpeg;base64,fakeImg' });
          return cb({ success: false });
        },
        connect: () => ({
          onMessage: { addListener: (fn) => msgListeners.push(fn) },
          onDisconnect: { addListener: () => {} },
          postMessage: (p) => { sentPayload = p; },
          disconnect: () => {}
        })
      }
    };

    const state = {
      currentLang: 'fr',
      currentProvider: 'lmstudio',
      serverUrls: { lmstudio: 'http://localhost:1234' },
      apiKeys: {},
      modelCapabilities: { 'qwen3-vl': { supportsImages: true } },
      getActiveModel: () => 'qwen3-vl'
    };
    const audioCtrl = new InPageAudioController();
    SpeechPlayerBar.bind(audioCtrl, () => 'fr');
    const chatCtrl = new ChatViewController();
    const webCtrl = new WebPageController({ state, bannerView: { setExpanded() {}, switchTab() {} } });
    webCtrl.cachedPageData = {
      url: 'https://www.instagram.com/p/demo123/',
      origin: 'https://www.instagram.com',
      hostname: 'www.instagram.com',
      registrableDomain: 'instagram.com',
      protocol: 'https:',
      riskLevel: 'low',
      title: 'Instagram (@paris_photo)',
      claimedBrand: 'Instagram',
      description: 'Coffee view over Paris',
      warnings: [],
      text: 'paris_photo Coffee view over Montmartre.',
      imageInventory: [{ index: 1, src: 'https://scontent.cdninstagram.com/photo.jpg', alt: 'Sunset coffee in Montmartre', naturalWidth: 1080, naturalHeight: 1350, loaded: true, slicePlan: [{ sx: 0, sy: 0, sw: 1080, sh: 1350, axis: 'full', rangeLabel: '1080x1350px' }] }],
      safeImages: [],
      youtubeVideos: []
    };
    webCtrl.getPageData = () => webCtrl.cachedPageData;

    await AccessiblePageDescriber.trigger({
      isWebMode: true,
      webPageController: webCtrl,
      chatViewController: chatCtrl,
      bannerView: webCtrl.bannerView,
      audioController: audioCtrl,
      state
    });

    assert.ok(sentPayload, 'Must dispatch accessible description prompt to AI stream');
    assert.ok(sentPayload.systemPrompt.includes('INSTAGRAM / REELS FOCUS'));
    assert.ok(sentPayload.systemPrompt.includes('BLIND & LOW-VISION'));

    const answerText = 'Publication Instagram de Paris Photo. On y voit une tasse de café fumante posée sur une table de bistrot face aux toits de Montmartre.';
    msgListeners.forEach((fn) => fn({ type: 'CHUNK', content: answerText }));
    msgListeners.forEach((fn) => fn({ type: 'DONE' }));

    assert.equal(audioCtrl.getSpeechState().isActive, true, 'Must start TTS automatically once accessible description finishes');
    assert.ok(utterances.length >= 1 && utterances[0].text.includes('Publication Instagram'));
    assert.equal(elements.get('ytAiSpeechPlayerBar').classList.contains('yt-ai-hidden'), false);
    audioCtrl.stopSpeech();
  });

  it('YouTube Watch auto-read mode and BannerTemplate expose low-vision button & speech bar in all 8 locales', async () => {
    const { elements } = createInteractiveMockDom(['ytAiLangSelect', 'ytAiModeSelect', 'ytAiChatMessages', 'ytAiChatQueue', 'ytAiChatInput', 'ytAiChatCount', 'ytAiSpeechPlayerBar']);
    elements.get('ytAiLangSelect').value = 'en';
    const { utterances } = setupSpeechHarness();

    const msgListeners = [];
    globalThis.chrome = {
      runtime: {
        connect: () => ({
          onMessage: { addListener: (fn) => msgListeners.push(fn) },
          onDisconnect: { addListener: () => {} },
          postMessage: () => {},
          disconnect: () => {}
        })
      }
    };

    const audioCtrl = new InPageAudioController();
    const chatCtrl = new ChatViewController({
      audioController: audioCtrl,
      transcriptController: {
        cachedTranscript: { videoId: '', segments: [{ start: 0, text: 'hello' }], fullText: 'hello world' },
        cachedVideoMetadata: { title: 'Video', author: 'Creator', description: '' },
        extractYouTubeTranscript: async () => [{ start: 0, text: 'hello' }]
      },
      promptService: { constructor: { condenseTranscriptForContext: (t) => t, buildChatSystemPrompt: () => 'sys' } }
    });

    await AccessiblePageDescriber.trigger({
      isWebMode: false,
      chatViewController: chatCtrl,
      bannerView: { setExpanded() {}, switchTab() {} },
      audioController: audioCtrl,
      state: { currentLang: 'en', currentProvider: 'lmstudio', getActiveModel: () => 'qwen3', serverUrls: {}, apiKeys: {} }
    });

    msgListeners.forEach((fn) => fn({ type: 'CHUNK', content: 'In this scene, a presenter demonstrates how ClarifAI works step by step.' }));
    msgListeners.forEach((fn) => fn({ type: 'DONE' }));

    assert.equal(audioCtrl.getSpeechState().isActive, true);
    assert.ok(utterances[0].text.includes('presenter demonstrates'));
    audioCtrl.stopSpeech();

    const html = BannerTemplate.render(I18N.fr, { currentLang: 'fr' });
    assert.ok(html.includes('id="ytAiDescribeAccessibleBtn"'));
    assert.ok(html.includes('id="ytAiSpeechPlayerBar"'));
    for (const lang of ['fr', 'en', 'es', 'de', 'it', 'ja', 'ru', 'zh']) {
      assert.ok(I18N[lang].describeAccessibleBtn && I18N[lang].speechPauseBtn && I18N[lang].speechSeekLabel);
    }
  });

  it('VideoFrameExtractor captures chronological HTML5 <video> keyframes and falls back to CAPTURE_VISIBLE_TAB on CORS taint', async () => {
    // 1. Seekable HTML5 video (<canvas> succeeds cleanly)
    let pausedDuringSeek = false;
    let currentT = 4.2;
    const seekedTimes = [];
    const mockVideo = {
      videoWidth: 1080,
      videoHeight: 1920,
      readyState: 4,
      paused: false,
      duration: 20,
      get currentTime() { return currentT; },
      set currentTime(v) { currentT = v; seekedTimes.push(v); },
      pause() { pausedDuringSeek = true; this.paused = true; },
      play() { this.paused = false; return Promise.resolve(); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 640 }),
      addEventListener: (_e, cb) => cb()
    };
    const makeCanvas = () => ({
      width: 0, height: 0,
      getContext: () => ({ drawImage() {} }),
      toDataURL: () => 'data:image/jpeg;base64,frameBytes'
    });
    const fakeDoc = {
      querySelectorAll: (sel) => (sel === 'video' ? [mockVideo] : []),
      createElement: (tag) => (tag === 'canvas' ? makeCanvas() : {})
    };
    const res = await VideoFrameExtractor.captureVideoFrames(fakeDoc, { maxFrames: 5 });
    assert.equal(res.hasVideo, true);
    assert.equal(res.frames.length, 5, 'Must extract 5 chronological keyframes across video duration');
    assert.ok(pausedDuringSeek && !mockVideo.paused, 'Must restore playing state after keyframe capture');
    assert.equal(Math.round(mockVideo.currentTime * 10), 42, 'Must restore exact playhead position');
    assert.ok(res.frames[0].label.includes('Video Frame #1/5'));

    // 2. Cross-origin tainted video throws SecurityError -> CAPTURE_VISIBLE_TAB fallback crops player
    let tabCaptured = 0;
    globalThis.window = { devicePixelRatio: 1 };
    globalThis.chrome = {
      runtime: {
        sendMessage: (msg, cb) => {
          if (msg.action === 'CAPTURE_VISIBLE_TAB') {
            tabCaptured += 1;
            return cb({ success: true, dataUrl: 'data:image/jpeg;base64,visibleTabPng' });
          }
          return cb({ success: false });
        }
      }
    };
    globalThis.Image = class {
      set src(v) {
        this.width = 1280;
        this.height = 720;
        this.onload?.();
      }
    };
    const taintedCanvas = (callIdx => () => ({
      width: 0, height: 0,
      getContext: () => ({ drawImage() {} }),
      toDataURL: () => {
        callIdx += 1;
        if (callIdx === 1) throw new Error('SecurityError: Tainted canvas');
        return 'data:image/jpeg;base64,croppedTabFrame';
      }
    }))(0);
    const corsDoc = {
      querySelectorAll: (sel) => (sel === 'video' ? [{ ...mockVideo, addEventListener: () => {} }] : []),
      createElement: (tag) => (tag === 'canvas' ? taintedCanvas() : {})
    };
    const corsRes = await VideoFrameExtractor.captureVideoFrames(corsDoc, { maxFrames: 3 });
    assert.equal(tabCaptured, 1, 'Must invoke CAPTURE_VISIBLE_TAB fallback when canvas is tainted');
    assert.equal(corsRes.frames.length, 1);
    assert.equal(corsRes.frames[0].dataUrl, 'data:image/jpeg;base64,croppedTabFrame');
  });

  it('Attaches visual images and video keyframes across Web Summary, Page Audit, Site Audit, YouTube Summary, and StreamRelay', async () => {
    const { elements } = createInteractiveMockDom([
      'ytAiLangSelect', 'ytAiModeSelect', 'ytAiSummarizeBtn', 'ytAiStopSummaryBtn', 'ytAiSummaryBody',
      'ytAiReasoningBox', 'ytAiReasoningText', 'ytAiReasoningStatus',
      'ytAiRunAuditBtn', 'ytAiAuditBody', 'ytAiRunWatchChannelAuditBtn', 'ytAiWatchChannelResultContainer',
      'ytAiWatchChannelHandle', 'ytAiWatchChannelMaxVideos'
    ]);
    elements.get('ytAiLangSelect').value = 'fr';
    const postedPayloads = [];
    const mockVid = {
      videoWidth: 1280, videoHeight: 720, readyState: 4, paused: true, duration: 15, currentTime: 2,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
      addEventListener: (_e, cb) => cb()
    };
    const origQueryAll = globalThis.document.querySelectorAll;
    const origCreateEl = globalThis.document.createElement;
    globalThis.window = { location: { href: 'https://www.youtube.com/watch?v=v1', search: '?v=v1', pathname: '/watch', hostname: 'www.youtube.com', origin: 'https://www.youtube.com', protocol: 'https:' }, devicePixelRatio: 1 };
    globalThis.document.querySelectorAll = (sel) => (sel === 'video' ? [mockVid] : origQueryAll(sel));
    globalThis.document.createElement = (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,vidFrame' } : origCreateEl(tag));
    globalThis.chrome = {
      runtime: {
        sendMessage: (_m, cb) => cb({ success: false }),
        connect: () => ({
          onMessage: { addListener() {} },
          onDisconnect: { addListener() {} },
          postMessage: (p) => postedPayloads.push(p),
          disconnect() {}
        })
      }
    };

    const state = {
      currentLang: 'fr', currentProvider: 'lmstudio',
      serverUrls: { lmstudio: 'http://localhost:1234' }, apiKeys: {},
      modelCapabilities: { 'qwen3-vl': { supportsImages: true } },
      getActiveModel: () => 'qwen3-vl'
    };
    const webCtrl = new WebPageController({ state, bannerView: { setExpanded() {}, switchTab() {} } });
    webCtrl.cachedPageData = {
      url: 'https://instagram.com/p/reel1', origin: 'https://instagram.com', hostname: 'instagram.com',
      registrableDomain: 'instagram.com', protocol: 'https:', riskLevel: 'low', title: 'Reel',
      warnings: [], text: 'Reel caption', imageInventory: [], safeImages: [{ name: 'pic.jpg', mimeType: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,pic' }], youtubeVideos: []
    };
    webCtrl.getPageData = () => webCtrl.cachedPageData;

    await webCtrl.triggerSummary();
    await webCtrl.triggerPageAudit();
    await webCtrl.triggerDomainAudit();

    assert.equal(postedPayloads.length, 3, 'Web Summary, Page Audit, and Site Audit must all dispatch');
    assert.ok(postedPayloads[0].messages[0].images.length >= 2, 'Web Summary must include both video frames and page images');
    assert.ok(postedPayloads[1].messages[0].images.some((i) => i.name.startsWith('video_frame_')), 'Page Audit must include video frames');
    assert.ok(postedPayloads[2].messages[0].images.length >= 1, 'Site Audit must include active page visual frames');

    // YouTube Summary attaches video frames to START_STREAM, and StreamRelay preserves request.images
    const sumCtrl = new SummaryViewController({
      transcriptController: {
        cachedTranscript: { videoId: 'v1', segments: [{ start: 0, text: 'hi' }], fullText: 'hi all' },
        cachedVideoMetadata: { videoId: 'v1', title: 'T', author: 'A', description: 'D' },
        extractYouTubeTranscript: async () => [{ start: 0, text: 'hi' }]
      },
      promptService: { constructor: { condenseTranscriptForContext: (t) => t, buildPrompts: () => ({ systemPrompt: 's', userPrompt: 'u' }) } }
    });
    await sumCtrl.startSummarization({ state, currentLang: 'fr', currentProvider: 'lmstudio', getActiveModel: () => 'qwen3-vl' });
    const ytStart = postedPayloads[3];
    assert.equal(ytStart.action, 'START_STREAM');
    assert.ok(Array.isArray(ytStart.images) && ytStart.images.length >= 1, 'YouTube Summary must attach video keyframes for Vision models');

    let streamedBody = null;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (_url, opts) => {
      streamedBody = JSON.parse(opts.body);
      return { ok: true, status: 200, body: { getReader: () => ({ read: async () => ({ done: true }) }) } };
    };
    try {
      await StreamRelay.handleStream(ytStart, { postMessage() {} });
      assert.ok(Array.isArray(streamedBody.messages[1].content), 'StreamRelay must convert START_STREAM request.images into multimodal content blocks');
      assert.ok(streamedBody.messages[1].content.some((p) => p.type === 'image_url'));
    } finally {
      globalThis.fetch = origFetch;
      sumCtrl.finishGeneration('fr');
    }
  });
});
