import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PageImageExtractor } from '../src/content/services/PageImageExtractor.js';
import { PageImageToolHandler } from '../src/content/services/PageImageToolHandler.js';
import { WebPagePromptBuilder } from '../src/services/implementations/WebPagePromptBuilder.js';
import { WebPageChatHelper } from '../src/content/services/WebPageChatHelper.js';
import { ChatToolProtocol } from '../src/content/services/ChatToolProtocol.js';
import { BackgroundImageFetcher } from '../src/background/BackgroundImageFetcher.js';
import { WebPageController } from '../src/content/services/WebPageController.js';
import { HeaderTabHandler } from '../src/content/ui/HeaderTabHandler.js';

function makeMockCanvasDoc(drawCalls = []) {
  return {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args) => drawCalls.push(args)
      }),
      toDataURL: () => 'data:image/jpeg;base64,SLICEDPIXELDATA'
    })
  };
}

describe('PageImageExtractor & Multi-Image Slicing Tool', () => {
  it('prioritizes main-content images ahead of header/footer logos and tracks lazy unloaded scans', () => {
    const logoImg = {
      complete: true, naturalWidth: 260, naturalHeight: 70, src: 'https://site.test/logo.png', alt: 'Site Logo',
      closest: (sel) => (sel.includes('header') ? {} : null)
    };
    const scan1 = {
      complete: true, naturalWidth: 690, naturalHeight: 900, src: 'https://site.test/scans/1.jpg', alt: 'Chapitre 119 - page 1',
      closest: (sel) => (sel.includes('main') ? {} : null)
    };
    const scan2Lazy = {
      complete: false, naturalWidth: 0, naturalHeight: 0, src: 'https://site.test/scans/2.jpg', alt: 'Chapitre 119 - page 2',
      getAttribute: (k) => (k === 'loading' ? 'lazy' : ''),
      closest: () => null
    };
    const scan3 = {
      complete: true, naturalWidth: 690, naturalHeight: 950, src: 'https://site.test/scans/3.jpg', alt: 'Chapitre 119 - page 3',
      closest: (sel) => (sel.includes('main') ? {} : null)
    };

    const drawCalls = [];
    const doc = {
      ...makeMockCanvasDoc(drawCalls),
      querySelectorAll: () => [logoImg, scan1, scan2Lazy, scan3]
    };

    const inventory = PageImageExtractor.scanPageImages(doc);
    assert.equal(inventory.length, 4);
    assert.equal(inventory[0].alt, 'Chapitre 119 - page 1');
    assert.equal(inventory[1].alt, 'Chapitre 119 - page 2');
    assert.equal(inventory[1].loaded, false);
    assert.equal(inventory[2].alt, 'Chapitre 119 - page 3');
    assert.equal(inventory[3].alt, 'Site Logo');

    const extracted = PageImageExtractor.extractSafeCanvasImages(doc, 8, inventory);
    assert.equal(extracted.length, 3);
    assert.equal(extracted[0].alt, 'Chapitre 119 - page 1');
    assert.equal(extracted[1].alt, 'Chapitre 119 - page 3');
    assert.equal(extracted[2].alt, 'Site Logo');
  });

  it('slices tall vertical webtoon strips (690x15360) and wide panoramas with overlap and crisp <=1024px sizing', () => {
    const tallPlan = PageImageExtractor.computeSlicePlan(690, 15360);
    assert.equal(tallPlan.length >= 10, true);
    assert.equal(tallPlan[0].axis, 'vertical');
    assert.equal(tallPlan[0].sy, 0);
    assert.equal(tallPlan[1].sy < tallPlan[0].sy + tallPlan[0].sh, true);
    assert.equal(tallPlan[tallPlan.length - 1].sy + tallPlan[tallPlan.length - 1].sh, 15360);

    const widePlan = PageImageExtractor.computeSlicePlan(3600, 600);
    assert.equal(widePlan.length >= 3, true);
    assert.equal(widePlan[0].axis, 'horizontal');
    assert.equal(widePlan[widePlan.length - 1].sx + widePlan[widePlan.length - 1].sw, 3600);

    const tallScan = {
      complete: true, naturalWidth: 690, naturalHeight: 15360, src: 'https://site.test/webtoon.jpg', alt: 'Monster Eater Ch.119',
      closest: (sel) => (sel.includes('main') ? {} : null)
    };
    const drawCalls = [];
    const doc = {
      ...makeMockCanvasDoc(drawCalls),
      querySelectorAll: () => [tallScan]
    };

    const frames = PageImageExtractor.extractSafeCanvasImages(doc, 8);
    assert.equal(frames.length, 8);
    assert.equal(frames[0].totalSlices, tallPlan.length);
    assert.equal(frames[0].sliceIndex, 1);
    assert.equal(frames[7].sliceIndex, 8);
    assert.equal(frames[0].label.includes('Slice 1/'), true);
    assert.equal(drawCalls.length, 8);
    assert.equal(drawCalls[0].length, 9);

    const inv = PageImageExtractor.scanPageImages(doc);
    const prompt = WebPagePromptBuilder.buildChatSystemPrompt(
      { url: 'https://site.test/scan', text: 'Webtoon reader', imageInventory: inv, safeImages: frames },
      'fr', 'standard', '', '', '', '', '', frames, 'Prior batch notes: Hero fights monster'
    );
    assert.equal(prompt.includes('PAGE IMAGES & SLICING INVENTORY'), true);
    assert.equal(prompt.includes(`SPLIT INTO ${tallPlan.length} SLICES`), true);
    assert.equal(prompt.includes('INSPECT_PAGE_IMAGES'), true);
    assert.equal(prompt.includes('Hero fights monster'), true);
  });

  it('PageImageToolHandler parses ranges, forces lazy loads, advances pagination with next, and chains via ChatToolProtocol', async () => {
    const parsed = PageImageToolHandler.parseArgs('image=1,slices=9-16');
    assert.deepEqual(parsed, { mode: 'target', imageStart: 1, imageEnd: 1, sliceStart: 9, sliceEnd: 16 });
    assert.equal(PageImageToolHandler.parseArgs('next').mode, 'next');

    const img1 = {
      complete: true, naturalWidth: 690, naturalHeight: 15360, src: 'https://site.test/1.jpg', alt: 'Page 1',
      closest: () => null
    };
    const img2Lazy = {
      complete: false, naturalWidth: 0, naturalHeight: 0, loading: 'lazy', src: 'https://site.test/2.jpg', alt: 'Page 2',
      getAttribute: (k) => (k === 'loading' ? 'lazy' : ''),
      decode: async () => { img2Lazy.complete = true; img2Lazy.naturalWidth = 700; img2Lazy.naturalHeight = 900; },
      closest: () => null
    };
    const doc = {
      ...makeMockCanvasDoc(),
      querySelectorAll: () => [img1, img2Lazy]
    };

    const inventory = PageImageExtractor.scanPageImages(doc);
    const first8 = PageImageExtractor.extractSafeCanvasImages(doc, 8, inventory);
    const controller = {
      cachedPageData: { url: 'https://site.test/ch1', imageInventory: inventory, safeImages: first8 },
      deliveredImageSlices: new Set(first8.map((f) => `${f.imageIndex}:${f.sliceIndex}`)),
      inspectedNotes: [],
      auditReport: null,
      domainAuditMarkdown: ''
    };

    const tools = WebPageChatHelper.getAvailableTools(controller, controller.cachedPageData, true);
    assert.equal(tools.some((t) => t.name === 'INSPECT_PAGE_IMAGES'), true);

    const batch2 = await PageImageToolHandler.execute(controller, 'next', controller.cachedPageData, doc);
    assert.equal(batch2.frames.length > 0, true);
    assert.equal(batch2.frames[0].sliceIndex, 9);

    const batch3 = await PageImageToolHandler.execute(controller, 'images=2', controller.cachedPageData, doc);
    assert.equal(img2Lazy.loading, 'eager');
    assert.equal(batch3.frames.some((f) => f.imageIndex === 2), true);

    // Multi-round ChatToolProtocol preserves notes and updates multimodal messages per round
    controller.deliveredImageSlices = new Set(first8.map((f) => `${f.imageIndex}:${f.sliceIndex}`));
    controller.inspectedImages = null;
    controller.inspectedNotes = [];
    let roundSeen = 0;
    const seenMsgs = [];
    const seenSys = [];
    let finalText = '';
    const streamClient = {
      startStream: ({ systemPrompt, messages, onChunk, onDone }) => {
        roundSeen += 1;
        seenMsgs.push(messages);
        seenSys.push(systemPrompt);
        if (roundSeen === 1) {
          onChunk('Batch 1 saw blue armor.\n[TOOL_CALL:INSPECT_PAGE_IMAGES|next]');
        } else {
          onChunk('Full chapter summary combining Batch 1 & Batch 2.');
        }
        onDone();
      }
    };
    await new Promise((resolve) => {
      ChatToolProtocol.runStream({
        streamClient,
        streamConfig: { systemPrompt: 'INITIAL', messages: [{ role: 'user', content: 'Analyze all', images: first8 }] },
        allowedTools: ['INSPECT_PAGE_IMAGES'],
        maxToolRounds: 4,
        onExecuteTools: async (req, invs, notes) => {
          controller.inspectedNotes.push(notes);
          await PageImageToolHandler.execute(controller, invs[0].arg, controller.cachedPageData, doc);
        },
        rebuildSystemPrompt: () => `Notes=${controller.inspectedNotes.join(';')}`,
        rebuildMessages: () => [{ role: 'user', content: 'Analyze all', images: controller.inspectedImages.frames }],
        onComplete: (ans) => { finalText = ans; resolve(); }
      });
    });

    assert.equal(roundSeen, 2);
    assert.equal(seenSys[1].includes('Batch 1 saw blue armor.'), true);
    assert.equal(seenMsgs[1][0].images.length > 0, true);
    assert.equal(finalText, 'Full chapter summary combining Batch 1 & Batch 2.');
  });

  it('BackgroundImageFetcher validates URLs and MIME types safely without leaking SVGs', async () => {
    const badProto = await BackgroundImageFetcher.fetchSafeJpeg('file:///etc/passwd');
    assert.equal(badProto.success, false);

    const prevFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: true,
        headers: { get: () => 'image/svg+xml' },
        blob: async () => new Blob(['<svg/>'])
      });
      const svgReject = await BackgroundImageFetcher.fetchSafeJpeg('https://cdn.example/vector.svg');
      assert.equal(svgReject.success, false);
    } finally {
      global.fetch = prevFetch;
    }
  });

  it('WebPageController guards re-entry, updates busy buttons, caps audit images to 2, and renders explicit warning on empty/think-only responses', async () => {
    const prevDoc = global.document;
    const prevWin = global.window;
    const prevChrome = global.chrome;
    try {
      const makeNode = (text = '') => ({
        innerHTML: '',
        textContent: text,
        disabled: false,
        dataset: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        querySelector: () => null
      });
      const runBtn = makeNode('⚡ Auditer la page');
      const auditBody = makeNode('');
      const tabBtn = makeNode('🛡️ Fiabilité');
      const nodes = new Map([['ytAiRunAuditBtn', runBtn], ['ytAiAuditBody', auditBody], ['ytAiTabAuditBtn', tabBtn]]);
      global.window = { location: new URL('https://anime-sama.test/scan') };
      global.document = {
        getElementById: (id) => nodes.get(id) || null,
        querySelector: () => null
      };

      const sentImgCounts = [];
      let finishStream = null;
      const fakeFrames = Array.from({ length: 8 }, (_, i) => ({ name: `f${i}.jpg`, mimeType: 'image/jpeg', dataUrl: `data:image/jpeg;base64,img${i}` }));
      const ctrl = new WebPageController({
        state: {
          currentProvider: 'lmstudio',
          currentLang: 'fr',
          serverUrls: { lmstudio: 'http://127.0.0.1:1234' },
          apiKeys: {},
          modelCapabilities: { 'qwen-vl': { supportsImages: true } },
          getActiveModel: () => 'qwen-vl'
        },
        bannerView: { setExpanded() {}, switchTab() {} }
      });
      ctrl.cachedPageData = {
        url: 'https://anime-sama.test/scan',
        origin: 'https://anime-sama.test',
        hostname: 'anime-sama.test',
        registrableDomain: 'anime-sama.test',
        protocol: 'https:',
        claimedBrand: 'Anime-Sama',
        warnings: [],
        text: 'Chapter 119',
        safeImages: fakeFrames,
        imageInventory: [],
        youtubeVideos: []
      };
      ctrl.getPageData = () => ctrl.cachedPageData;
      ctrl.streamClient = {
        startStream: ({ messages, onChunk, onDone }) => {
          sentImgCounts.push((messages?.[0]?.images || []).length);
          finishStream = () => {
            onChunk('<think>Only reasoning, no visible answer</think>');
            onDone();
          };
        }
      };

      const p1 = ctrl.triggerPageAudit();
      assert.equal(ctrl.isAuditing, true);
      assert.equal(runBtn.disabled, true);
      assert.equal(runBtn.textContent.includes('⏳'), true);

      // Re-entrant click / tab selection while auditing must NOT spawn a second stream
      let secondTriggered = false;
      HeaderTabHandler.handleTabSelection(
        { getAttribute: () => 'audit' },
        { state: ctrl.state, bannerView: ctrl.bannerView, webPageController: ctrl, triggerAudit: () => { secondTriggered = true; } }
      );
      await ctrl.triggerPageAudit();
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(secondTriggered, false);
      assert.equal(sentImgCounts.length, 1);
      assert.equal(sentImgCounts[0], 2);

      finishStream();
      await p1;
      assert.equal(ctrl.isAuditing, false);
      assert.equal(runBtn.disabled, false);
      assert.equal(runBtn.textContent, '⚡ Auditer la page');
      assert.equal(auditBody.innerHTML.includes('yt-ai-web-empty-warn'), true);
      assert.equal(auditBody.innerHTML.includes('yt-ai-web-grid'), true);

      // Concurrent per-tab stream channels isolate Page Audit vs Site Audit vs Summary vs Chat without disconnecting each other
      const isoCtrl = new WebPageController({ state: ctrl.state, bannerView: ctrl.bannerView });
      const cSummary = isoCtrl.getStreamClient('summary');
      const cAudit = isoCtrl.getStreamClient('audit');
      const cDomain = isoCtrl.getStreamClient('domain');
      const cChat = isoCtrl.getStreamClient('chat');
      assert.notEqual(cSummary, cAudit);
      assert.notEqual(cAudit, cDomain);
      assert.notEqual(cDomain, cChat);
      assert.equal(isoCtrl.getStreamClient('audit'), cAudit);

      // Calling abortAll() triggers onCancel cleanly so busy flags never hang
      let cancelled = 0;
      const origChrome = global.chrome;
      try {
        global.chrome = {
          runtime: {
            connect: () => ({
              postMessage() {},
              disconnect() {},
              onMessage: { addListener() {} },
              onDisconnect: { addListener() {} }
            })
          }
        };
        cAudit.startStream({ provider: 'lmstudio', serverUrl: 'http://127.0.0.1:1234', model: 'qwen', systemPrompt: 's', messages: [], onChunk() {}, onDone() {}, onCancel: () => { cancelled += 1; } });
        cDomain.startStream({ provider: 'lmstudio', serverUrl: 'http://127.0.0.1:1234', model: 'qwen', systemPrompt: 's', messages: [], onChunk() {}, onDone() {}, onCancel: () => { cancelled += 1; } });
        assert.equal(cancelled, 0);
        isoCtrl.abortAll();
        assert.equal(cancelled, 2);
      } finally {
        global.chrome = origChrome;
      }
    } finally {
      global.document = prevDoc;
      global.window = prevWin;
      global.chrome = prevChrome;
    }
  });
});
