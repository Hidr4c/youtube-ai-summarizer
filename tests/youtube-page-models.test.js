import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigationObserver, isWatchPage, getVideoId } from '../src/content/ui/NavigationObserver.js';
import { BannerView } from '../src/content/ui/BannerView.js';
import { DOMTranscriptExtractor } from '../src/content/services/DOMTranscriptExtractor.js';
import { isNativeTranscriptPanelVisible, closeNativeTranscriptPanel } from '../src/content/services/NativeTranscriptPanel.js';
import { YouTubeDOMContext } from '../src/content/services/YouTubeDOMContext.js';

// Minimal DOM Node factory with selector queries for YouTube layout testing
function createMockNode(tag, attrs = {}, children = []) {
  const classes = new Set((attrs.class || attrs.className || '').split(/\s+/).filter(Boolean));
  const node = {
    tagName: tag.toUpperCase(),
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      String(val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    id: attrs.id || '',
    textContent: attrs.textContent || '',
    innerText: attrs.innerText || attrs.textContent || '',
    innerHTML: attrs.innerHTML || '',
    attributes: new Map(Object.entries(attrs)),
    children: [],
    parentNode: null,
    offsetParent: attrs.offsetParent !== undefined ? attrs.offsetParent : {},
    offsetWidth: attrs.offsetWidth !== undefined ? attrs.offsetWidth : 300,
    isConnected: true,
    classList: {
      classes,
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); }
    },
    getAttribute(name) { return node.attributes.get(name) || null; },
    setAttribute(name, val) { node.attributes.set(name, String(val)); },
    hasAttribute(name) { return node.attributes.has(name); },
    appendChild(child) {
      if (!child) return child;
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    get firstElementChild() {
      return this.children[0] || null;
    },
    insertBefore(newChild, refChild) {
      newChild.parentNode = node;
      const idx = node.children.indexOf(refChild);
      if (idx !== -1) node.children.splice(idx, 0, newChild);
      else node.children.push(newChild);
      return newChild;
    },
    removeChild(child) {
      const idx = node.children.indexOf(child);
      if (idx !== -1) node.children.splice(idx, 1);
      child.parentNode = null;
      return child;
    },
    remove() {
      if (node.parentNode) node.parentNode.removeChild(node);
      node.isConnected = false;
    },
    querySelector(selector) {
      return findOne(node, selector);
    },
    querySelectorAll(selector) {
      const results = [];
      findAll(node, selector, results);
      return results;
    },
    addEventListener() {},
    click() {
      if (typeof node.onclick === 'function') node.onclick();
    }
  };

  children.forEach(c => node.appendChild(c));
  return node;
}

function matchSingle(node, sel) {
  if (!node || !sel) return false;
  const tokens = sel.trim().split(/\s+/);
  if (tokens.length > 1) {
    if (!matchSingle(node, tokens[tokens.length - 1])) return false;
    let curr = node.parentNode;
    while (curr) {
      if (matchSingle(curr, tokens[0])) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  let s = sel.trim();
  const tagMatch = s.match(/^([a-zA-Z0-9-]+)/);
  if (tagMatch) {
    if (node.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;
    s = s.slice(tagMatch[1].length);
  }
  const idMatch = s.match(/#([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    if (node.id !== idMatch[1]) return false;
    s = s.replace(idMatch[0], '');
  }
  const classMatches = s.matchAll(/\.([a-zA-Z0-9-_]+)/g);
  for (const cm of classMatches) {
    if (!node.classList.contains(cm[1])) return false;
  }
  s = s.replace(/\.[a-zA-Z0-9-_]+/g, '');
  const attrMatch = s.match(/\[([a-zA-Z0-9-_]+)([\*~^$]?=)?["']?([^"'\]]*)["']?\]/);
  if (attrMatch) {
    const attrName = attrMatch[1];
    const op = attrMatch[2];
    const expected = attrMatch[3];
    const actual = node.getAttribute(attrName);
    if (actual === null) return false;
    if (op === '*=' && !actual.includes(expected)) return false;
    if (op === '=' && actual !== expected) return false;
  }
  return true;
}

function findOne(root, selector) {
  const parts = selector.split(',').map(s => s.trim());
  for (const part of parts) {
    const walk = (node) => {
      for (const child of node.children) {
        if (matchSingle(child, part)) return child;
        const res = walk(child);
        if (res) return res;
      }
      return null;
    };
    const found = walk(root);
    if (found) return found;
  }
  return null;
}

function findAll(root, selector, acc) {
  const parts = selector.split(',').map(s => s.trim());
  const walk = (node) => {
    for (const child of node.children) {
      for (const part of parts) {
        if (matchSingle(child, part)) {
          if (!acc.includes(child)) acc.push(child);
          break;
        }
      }
      walk(child);
    }
  };
  walk(root);
}

function setupGlobalDom(url, bodyChildren = []) {
  const body = createMockNode('body', {}, bodyChildren);
  const docElement = createMockNode('html', {}, [body]);

  global.document = {
    body,
    documentElement: docElement,
    title: 'Test Video - YouTube',
    getElementById: (id) => findOne(docElement, `#${id}`),
    querySelector: (sel) => findOne(docElement, sel),
    querySelectorAll: (sel) => {
      const res = [];
      findAll(docElement, sel, res);
      return res;
    },
    createElement: (tag) => createMockNode(tag)
  };

  const parsed = new URL(url);
  global.window = {
    location: {
      href: url,
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  return { docElement, body };
}

describe('YouTube Page Models Specification & Regression Gate', () => {

  it('Suite 1: URL Models - Accurate Video ID and Watch Page Resolution', () => {
    const testCases = [
      { url: 'https://www.youtube.com/watch?v=STD_VID_1', isWatch: true, id: 'STD_VID_1' },
      { url: 'https://www.youtube.com/watch?v=PL_VID_2&list=PL123&index=4', isWatch: true, id: 'PL_VID_2' },
      { url: 'https://www.youtube.com/watch?v=TIME_VID_3&t=1h20m', isWatch: true, id: 'TIME_VID_3' },
      { url: 'https://www.youtube.com/watch?feature=shared&v=FEAT_VID_4', isWatch: true, id: 'FEAT_VID_4' },
      { url: 'https://www.youtube.com/live/LIVE_STREAM_5', isWatch: true, id: 'LIVE_STREAM_5' },
      { url: 'https://www.youtube.com/shorts/SHORT_CLIP_6', isWatch: true, id: 'SHORT_CLIP_6' },
      { url: 'https://www.youtube.com/embed/EMBED_VID_7', isWatch: false, id: 'EMBED_VID_7' },
      { url: 'https://www.youtube.com/', isWatch: false, id: '' },
      { url: 'https://www.youtube.com/results?search_query=antigravity', isWatch: false, id: '' },
      { url: 'https://www.youtube.com/@veritasium', isWatch: false, id: '' },
      { url: 'https://www.youtube.com/feed/subscriptions', isWatch: false, id: '' },
      { url: 'https://www.youtube.com/feed/history', isWatch: false, id: '' }
    ];

    for (const tc of testCases) {
      assert.equal(isWatchPage(tc.url), tc.isWatch, `URL ${tc.url} isWatchPage must be ${tc.isWatch}`);
      assert.equal(getVideoId(tc.url), tc.id, `URL ${tc.url} getVideoId must be ${tc.id}`);
    }
  });

  it('Suite 2: DOM Layout Models - BannerView Injection Across YouTube Page Types', () => {
    // Model 1: Classic Desktop Watch Flexy (ytd-watch-flexy) -> unified top-of-page shell at document.body index 0
    {
      const columns = createMockNode('div', { id: 'columns' });
      const watchFlexy = createMockNode('ytd-watch-flexy', {}, [columns]);
      setupGlobalDom('https://www.youtube.com/watch?v=MODEL_FLEXY', [watchFlexy]);

      const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
      bannerView.tryInjectBanner();

      const injected = global.document.getElementById('yt-ai-summarizer-container');
      assert.ok(injected, 'Banner must be injected at top of site on ytd-watch-flexy page');
      assert.equal(injected.parentNode, global.document.body, 'Parent must be document.body');
      assert.equal(global.document.body.children[0], injected, 'Banner must sit at document.body index 0');
      assert.equal(global.document.body.children[1], watchFlexy, 'Watch container remains intact after banner');
      assert.equal(injected.classList.contains('yt-ai-top-shell'), true);
    }

    // Model 2: Theater Mode (ytd-watch-flexy with #player-theater-container)
    {
      const theater = createMockNode('div', { id: 'player-theater-container' });
      const columns = createMockNode('div', { id: 'columns' });
      const watchFlexy = createMockNode('ytd-watch-flexy', {}, [theater, columns]);
      setupGlobalDom('https://www.youtube.com/watch?v=MODEL_THEATER', [watchFlexy]);

      const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'fr' });
      bannerView.tryInjectBanner();

      const injected = global.document.getElementById('yt-ai-summarizer-container');
      assert.ok(injected, 'Banner must be injected in Theater mode');
      assert.equal(global.document.body.children[0], injected, 'Banner must precede app wrapper at document.body top');
    }

    // Model 3: Modern Redesign Grid (ytd-watch-grid)
    {
      const columns = createMockNode('div', { id: 'columns' });
      const watchGrid = createMockNode('ytd-watch-grid', {}, [columns]);
      setupGlobalDom('https://www.youtube.com/watch?v=MODEL_GRID', [watchGrid]);

      const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
      bannerView.tryInjectBanner();

      const injected = global.document.getElementById('yt-ai-summarizer-container');
      assert.ok(injected, 'Banner must be injected on ytd-watch-grid page');
      assert.equal(global.document.body.children[0], injected, 'Banner must precede ytd-watch-grid at document.body top');
    }

    // Model 4: Headless / Custom Layout with #primary fallback
    {
      const primary = createMockNode('div', { id: 'primary' });
      const wrapper = createMockNode('div', { id: 'page-wrapper' }, [primary]);
      setupGlobalDom('https://www.youtube.com/watch?v=MODEL_PRIMARY', [wrapper]);

      const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
      bannerView.tryInjectBanner();

      const injected = global.document.getElementById('yt-ai-summarizer-container');
      assert.ok(injected, 'Banner must be injected above #page-wrapper');
      assert.equal(global.document.body.children[0], injected, 'Banner must precede wrapper at document.body top');
    }

    // Model 5: Non-Watch YouTube Pages (Home / Search -> Web Mode) & Restricted URLs
    {
      const searchBox = createMockNode('ytd-search', { id: 'search-content' });
      setupGlobalDom('https://www.youtube.com/results?search_query=tech', [searchBox]);

      const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
      bannerView.tryInjectBanner();

      const injected = global.document.getElementById('yt-ai-summarizer-container');
      assert.ok(injected, 'Non-watch YouTube pages must use universal Web Mode banner');
      assert.equal(injected.classList.contains('yt-ai-webpage-mode'), true);
      assert.equal(global.document.body.children[0], injected);

      setupGlobalDom('chrome://extensions', [createMockNode('div')]);
      bannerView.tryInjectBanner();
      assert.equal(global.document.getElementById('yt-ai-summarizer-container'), null, 'Restricted browser schemes must abort');
    }

    // Model 6: Disabled Extension State
    {
      const columns = createMockNode('div', { id: 'columns' });
      const watchFlexy = createMockNode('ytd-watch-flexy', {}, [columns]);
      setupGlobalDom('https://www.youtube.com/watch?v=MODEL_DISABLED', [watchFlexy]);

      const bannerView = new BannerView({ extensionEnabled: false, currentLang: 'en' });
      bannerView.tryInjectBanner();

      assert.equal(global.document.getElementById('yt-ai-summarizer-container'), null, 'Must abort when disabled');
    }
  });

  it('Suite 3: DOM Transcript Extraction Models Across YouTube Formats', () => {
    // Component Model A: Modern Attributed String (transcript-segment-view-model)
    {
      const segments = [];
      for (let i = 0; i < 4; i++) {
        const timeEl = createMockNode('div', { class: 'ytTranscriptSegmentViewModelTimestamp', textContent: `0:${i * 10}` });
        const textEl = createMockNode('span', { role: 'text', textContent: `Speech segment ${i}` });
        segments.push(createMockNode('transcript-segment-view-model', {}, [timeEl, textEl]));
      }
      setupGlobalDom('https://www.youtube.com/watch?v=COMP_MODERN', segments);

      const extracted = DOMTranscriptExtractor.extractTranscriptFromActiveDOM();
      assert.ok(extracted && extracted.length === 4, 'Must extract modern attributed string segments');
      assert.equal(extracted[0].timestamp, '0:0');
      assert.equal(extracted[0].text, 'Speech segment 0');
    }

    // Component Model B: Classic Segment Renderer (ytd-transcript-segment-renderer)
    {
      const segments = [];
      for (let i = 0; i < 4; i++) {
        const timeEl = createMockNode('div', { class: 'segment-timestamp', textContent: `1:${i * 15}` });
        const textEl = createMockNode('div', { class: 'segment-text', textContent: `Classic caption text ${i}` });
        segments.push(createMockNode('ytd-transcript-segment-renderer', {}, [timeEl, textEl]));
      }
      setupGlobalDom('https://www.youtube.com/watch?v=COMP_CLASSIC', segments);

      const extracted = DOMTranscriptExtractor.extractTranscriptFromActiveDOM();
      assert.ok(extracted && extracted.length === 4, 'Must extract classic segment renderer elements');
      assert.equal(extracted[0].timestamp, '1:0');
      assert.equal(extracted[0].text, 'Classic caption text 0');
    }

    // Component Model C: Description Chapters (ytd-macro-markers-entry-renderer)
    {
      const chapters = [];
      const titles = ['Introduction', 'Core Architecture', 'Deep Dive', 'Summary'];
      titles.forEach((t, i) => {
        const timeEl = createMockNode('div', { id: 'time', textContent: `${i * 2}:00` });
        const titleEl = createMockNode('h4', { id: 'title', textContent: t });
        chapters.push(createMockNode('ytd-macro-markers-entry-renderer', {}, [timeEl, titleEl]));
      });
      setupGlobalDom('https://www.youtube.com/watch?v=COMP_CHAPTERS', chapters);

      const extracted = YouTubeDOMContext.extractChaptersFromDescription();
      assert.ok(extracted && extracted.length === 4, 'Must extract chapter segments from description');
      assert.equal(extracted[1].timestamp, '2:00');
      assert.equal(extracted[1].text, 'Core Architecture');
    }

    // Component Model D: Live Stream with Live Chat Frame (no false transcript detection)
    {
      const chatFrame = createMockNode('ytd-live-chat-frame', { id: 'chat' });
      const chatContainer = createMockNode('div', { id: 'chat-container' }, [chatFrame]);
      setupGlobalDom('https://www.youtube.com/live/LIVE_CHAT_TEST', [chatContainer]);

      assert.equal(isNativeTranscriptPanelVisible(), false, 'Live chat frame must NOT be detected as transcript');
    }
  });

  it('Suite 4: YouTube Metadata Models Across Video Page Variations', () => {
    // Model 1: Modern Rich Metadata Layout
    {
      const titleEl = createMockNode('h1', { class: 'ytd-watch-metadata' }, [
        createMockNode('yt-formatted-string', { textContent: 'Quantum Revolution 2026' })
      ]);
      const channelEl = createMockNode('ytd-channel-name', {}, [
        createMockNode('a', { textContent: 'Future Science' })
      ]);
      const subEl = createMockNode('div', { id: 'owner-sub-count', textContent: '1.2M subscribers' });
      const descEl = createMockNode('div', { id: 'description-inline-expander' }, [
        createMockNode('yt-attributed-string', { textContent: 'Full breakdown of quantum hardware.' })
      ]);
      const hashtagEl = createMockNode('div', { id: 'description' }, [
        createMockNode('a', { href: '/hashtag/quantum', textContent: '#quantum' }),
        createMockNode('a', { href: '/hashtag/tech', textContent: '#tech' })
      ]);

      setupGlobalDom('https://www.youtube.com/watch?v=META_MODERN', [titleEl, channelEl, subEl, descEl, hashtagEl]);

      const meta = YouTubeDOMContext.getVideoMetadata();
      assert.equal(meta.title, 'Quantum Revolution 2026');
      assert.equal(meta.author, 'Future Science');
      assert.equal(meta.subscribers, '1.2M subscribers');
      assert.ok(meta.description.includes('quantum hardware'));
      assert.ok(meta.keywords.includes('quantum'));
      assert.ok(meta.keywords.includes('tech'));
    }

    // Model 2: Minimalist Fallback Metadata
    {
      setupGlobalDom('https://www.youtube.com/watch?v=META_MINIMAL', []);
      global.document.title = 'Minimalist Title - YouTube';

      const meta = YouTubeDOMContext.getVideoMetadata({
        videoId: 'META_MINIMAL',
        author: 'Cached Creator'
      });

      assert.equal(meta.title, 'Minimalist Title');
      assert.equal(meta.author, 'Cached Creator');
    }
  });
});
