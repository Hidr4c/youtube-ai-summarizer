import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NavigationObserver, isWatchPage, isShortsPage, isChannelPage, getVideoId, getActiveVideoElement } from '../src/content/ui/NavigationObserver.js';
import { BannerView } from '../src/content/ui/BannerView.js';
import { BannerEventHandler } from '../src/content/ui/BannerEventHandler.js';
import { YouTubeDOMContext } from '../src/content/services/YouTubeDOMContext.js';
import { PlayerElementHelper } from '../src/injected/PlayerElementHelper.js';
import { InnerTubeBridge } from '../src/injected/InnerTubeBridge.js';
import { YouTubeContextExtractor } from '../src/injected/YouTubeContextExtractor.js';
import { PopupController } from '../src/popup/PopupController.js';
import { DOMTranscriptExtractor } from '../src/content/services/DOMTranscriptExtractor.js';
import { InPageTranscriptController } from '../src/content/services/InPageTranscriptController.js';

function createNode(tag, attrs = {}, children = []) {
  const classes = new Set((attrs.className || '').split(/\s+/).filter(Boolean));
  const listeners = {};
  const attrMap = { ...attrs };
  delete attrMap.className;

  const node = {
    tagName: tag.toUpperCase(),
    id: attrs.id || '',
    href: attrs.href || '',
    children: [...children],
    parentNode: null,
    isConnected: true,
    textContent: attrs.textContent || '',
    innerText: attrs.textContent || '',
    _innerHTML: '',
    style: { display: '', setProperty: () => {}, removeProperty: () => {} },
    classList: {
      add: (...cls) => cls.forEach(c => classes.add(c)),
      remove: (...cls) => cls.forEach(c => classes.delete(c)),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (force) classes.add(c); else classes.delete(c);
        return !!force;
      }
    },
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      String(val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    set innerHTML(val) { node._innerHTML = val; },
    get innerHTML() { return node._innerHTML; },
    get firstElementChild() { return node.children[0] || null; },
    hasAttribute: (k) => k in attrMap,
    getAttribute: (k) => (k in attrMap ? attrMap[k] : null),
    setAttribute: (k, v) => { attrMap[k] = v; },
    removeAttribute: (k) => { delete attrMap[k]; },
    addEventListener: (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); },
    removeEventListener: () => {},
    dispatchEvent: (evt) => { (listeners[evt.type] || []).forEach(fn => fn(evt)); },
    appendChild: (c) => {
      if (c.parentNode) c.parentNode.children = c.parentNode.children.filter(x => x !== c);
      c.parentNode = node;
      node.children.push(c);
      return c;
    },
    insertBefore: (c, ref) => {
      if (c.parentNode) c.parentNode.children = c.parentNode.children.filter(x => x !== c);
      c.parentNode = node;
      const idx = ref ? node.children.indexOf(ref) : -1;
      if (idx >= 0) node.children.splice(idx, 0, c);
      else node.children.push(c);
      return c;
    },
    prepend: (c) => node.insertBefore(c, node.children[0] || null),
    remove: () => {
      if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(x => x !== node);
      node.parentNode = null;
      node.isConnected = false;
    },
    querySelector: (sel) => queryTree(node, sel)[0] || null,
    querySelectorAll: (sel) => queryTree(node, sel)
  };
  node.children.forEach(c => { c.parentNode = node; });
  return node;
}

function matchesSimple(el, sel) {
  if (!sel || !el?.tagName) return false;
  let rest = sel;
  let ok = true;
  if (rest.includes(':not([hidden])')) {
    if (el.hasAttribute?.('hidden')) ok = false;
    rest = rest.replace(':not([hidden])', '');
  }
  const attrMatches = [...rest.matchAll(/\[([a-z0-9-]+)(?:\*="([^"]+)"|="([^"]+)")?\]/gi)];
  for (const m of attrMatches) {
    const [, attr, containsVal, exactVal] = m;
    const val = el.getAttribute?.(attr);
    if (val === null) ok = false;
    else if (containsVal && !String(val).includes(containsVal)) ok = false;
    else if (exactVal !== undefined && String(val) !== exactVal) ok = false;
    rest = rest.replace(m[0], '');
  }
  const idMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    if (el.id !== idMatch[1]) ok = false;
    rest = rest.replace(idMatch[0], '');
  }
  const clsMatches = [...rest.matchAll(/\.([a-zA-Z0-9_-]+)/g)];
  for (const m of clsMatches) {
    if (!el.classList?.contains(m[1])) ok = false;
    rest = rest.replace(m[0], '');
  }
  if (rest.trim() && el.tagName !== rest.trim().toUpperCase()) ok = false;
  return ok;
}

function queryTree(root, selector) {
  const parts = String(selector).split(',').map(s => s.trim()).filter(Boolean);
  const all = [];
  const walk = (node) => {
    for (const c of node.children || []) {
      const ancestors = [];
      let p = c.parentNode;
      while (p) { ancestors.push(p); p = p.parentNode; }
      all.push({ node: c, ancestors });
      walk(c);
    }
  };
  walk(root);

  const matched = [];
  for (const { node, ancestors } of all) {
    for (const part of parts) {
      const tokens = part.split(/\s+/).filter(Boolean);
      const leafMatch = matchesSimple(node, tokens[tokens.length - 1]);
      if (!leafMatch) continue;
      if (tokens.length === 1 || tokens.slice(0, -1).every(ancTok => ancestors.some(a => matchesSimple(a, ancTok)))) {
        if (!matched.includes(node)) matched.push(node);
      }
    }
  }
  return matched;
}

function setupMockEnv(url, rootChildren = []) {
  const body = createNode('body', {}, rootChildren);
  const docElement = createNode('html', {}, [body]);
  const urlObj = new URL(url);

  global.window = {
    location: { href: urlObj.href, origin: urlObj.origin, pathname: urlObj.pathname, search: urlObj.search },
    addEventListener: () => {},
    removeEventListener: () => {},
    postMessage: () => {},
    scrollY: 0,
    scrollTo: () => {}
  };
  global.document = {
    title: 'Short Demo - YouTube',
    body,
    documentElement: docElement,
    createElement: (tag) => createNode(tag),
    getElementById: (id) => queryTree(docElement, `#${id}`)[0] || null,
    querySelector: (sel) => queryTree(docElement, sel)[0] || null,
    querySelectorAll: (sel) => queryTree(docElement, sel)
  };
  global.chrome = {
    runtime: { getManifest: () => ({ version: '1.5.3' }), sendMessage: async () => ({}), onMessage: { addListener: () => {} } },
    storage: { local: { get: (_, cb) => cb?.({}), set: (_, cb) => cb?.() } }
  };
  global.navigator = { language: 'fr-FR' };
  return { body, docElement };
}

describe('YouTube Shorts Full Support Suite', () => {
  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.chrome;
    delete global.navigator;
  });

  it('recognizes /shorts/<id> URLs across Desktop and Mobile while handling partial window.location mocks', () => {
    assert.equal(isShortsPage('https://www.youtube.com/shorts/NzA0ZHG8h-E'), true);
    assert.equal(isWatchPage('https://www.youtube.com/shorts/NzA0ZHG8h-E'), true);
    assert.equal(getVideoId('https://www.youtube.com/shorts/NzA0ZHG8h-E?feature=share'), 'NzA0ZHG8h-E');
    assert.equal(isShortsPage('https://m.youtube.com/shorts/NzA0ZHG8h-E'), true);

    assert.equal(isShortsPage('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
    assert.equal(isWatchPage('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
    assert.equal(isShortsPage('https://www.youtube.com/shorts/'), false);
    assert.equal(isShortsPage('https://www.youtube.com/@Hidr4c/shorts'), false);
    assert.equal(isChannelPage('https://www.youtube.com/@Hidr4c/shorts'), true);

    global.window = { location: { search: '?v=PARTIAL_MOCK_ID' } };
    assert.equal(getVideoId(), 'PARTIAL_MOCK_ID');
    assert.equal(isShortsPage(), false);
  });

  it('injects zero-layout-shift .yt-ai-top-shell.yt-ai-shorts-mode banner at top of document.body and syncs class across /watch <-> /shorts transitions', () => {
    const shortsContainer = createNode('div', { id: 'shorts-container' });
    const ytdShorts = createNode('ytd-shorts', {}, [shortsContainer]);
    const hiddenFlexy = createNode('ytd-watch-flexy', { hidden: '' }, [createNode('div', { id: 'columns' })]);
    const pageManager = createNode('ytd-page-manager', { id: 'page-manager' }, [hiddenFlexy, ytdShorts]);
    setupMockEnv('https://www.youtube.com/shorts/NzA0ZHG8h-E', [pageManager]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'fr' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner, 'Banner must inject on /shorts/ page');
    assert.equal(banner.parentNode, global.document.body, 'Banner must sit at document.body top in unified shell');
    assert.equal(global.document.body.children[0], banner, 'Banner must sit above YouTube app/masthead at body index 0');
    assert.equal(ytdShorts.children.length, 1, 'ytd-shorts children must remain completely untouched');
    assert.equal(banner.classList.contains('yt-ai-top-shell'), true, 'Banner must have yt-ai-top-shell class');
    assert.equal(banner.classList.contains('yt-ai-shorts-mode'), true, 'Banner must have yt-ai-shorts-mode class');

    // SPA transition back to /watch?v=NORMAL_123 clears shorts-specific class in place
    ytdShorts.setAttribute('hidden', '');
    hiddenFlexy.removeAttribute('hidden');
    global.window.location = new URL('https://www.youtube.com/watch?v=NORMAL_123');
    bannerView.tryInjectBanner();

    const relocated = global.document.getElementById('yt-ai-summarizer-container');
    assert.equal(relocated.parentNode, global.document.body, 'Banner remains unified at document.body top');
    assert.equal(relocated.classList.contains('yt-ai-shorts-mode'), false, 'yt-ai-shorts-mode must clear on regular watch pages');

    // Mobile m.youtube.com/shorts also anchors cleanly at document.body top shell
    const mobileReel = createNode('ytm-reel-video-renderer');
    const ytmShorts = createNode('ytm-shorts', {}, [mobileReel]);
    setupMockEnv('https://m.youtube.com/shorts/NzA0ZHG8h-E', [ytmShorts]);
    bannerView.tryInjectBanner();
    const mobileBanner = global.document.getElementById('yt-ai-summarizer-container');
    assert.equal(mobileBanner.parentNode, global.document.body, 'Mobile Shorts banner must inject at document.body top');
    assert.equal(mobileBanner.classList.contains('yt-ai-top-shell'), true);
    assert.equal(mobileBanner.classList.contains('yt-ai-shorts-mode'), true);

    // CSS safety invariant: place Shorts banner in top column flow above ytd-shorts (zero video overlap) while preserving #shorts-container scroll-snap
    const cssText = fs.readFileSync(path.resolve('src/content/content.css'), 'utf8');
    assert.equal(cssText.includes('flex-direction: column !important'), true);
    assert.equal(cssText.includes('position: relative !important'), true);
    assert.equal(cssText.includes('overflow-y: scroll !important'), true);
    assert.equal(cssText.includes('overflow-anchor: none !important'), true);
    assert.equal(cssText.includes('container-type: size'), true);
    assert.equal(cssText.includes('--ytd-shorts-player-height'), true);
    assert.equal(cssText.includes('cqh'), true);
    assert.equal(cssText.includes('- 54px'), false, 'Shorts height must adapt dynamically without hardcoded banner pixel offset');

    // Expanding/collapsing on Shorts resets parent page-manager scrollTop to 0 so scroll anchoring never hides the expanded panel
    const shortsContainer2 = createNode('div', { id: 'shorts-container' });
    const ytdShorts2 = createNode('ytd-shorts', {}, [shortsContainer2]);
    const pageManager2 = createNode('ytd-page-manager', { id: 'page-manager' }, [ytdShorts2]);
    setupMockEnv('https://www.youtube.com/shorts/NzA0ZHG8h-E', [pageManager2]);
    const bv2 = new BannerView({ extensionEnabled: true, currentLang: 'fr' });
    bv2.tryInjectBanner();
    pageManager2.scrollTop = 245;
    bv2.setExpanded(true);
    assert.equal(pageManager2.scrollTop, 0, 'Expanding Shorts banner must reset parent scrollTop to keep panel visible at top');
    pageManager2.scrollTop = 180;
    bv2.setExpanded(false);
    assert.equal(pageManager2.scrollTop, 0, 'Collapsing Shorts banner must reset parent scrollTop cleanly');

    // Disabling extension on Shorts removes banner and dispatches window resize so YouTube restores full video size
    let resizeCount = 0;
    const origDispatch = global.window.dispatchEvent;
    global.window.dispatchEvent = (ev) => {
      if (ev?.type === 'resize') resizeCount += 1;
      return true;
    };
    bv2.state.extensionEnabled = false;
    bv2.tryInjectBanner();
    global.window.dispatchEvent = origDispatch;
    assert.equal(global.document.getElementById('yt-ai-summarizer-container'), null, 'Disabling extension must remove Shorts banner');
    assert.equal(resizeCount, 1, 'Disabling extension on Shorts must dispatch resize so YouTube restores native player dimensions');
  });

  it('seeks active Short video element and stops wheel propagation when expanded in Shorts mode', () => {
    const oldVideo = { currentTime: 0, play: () => Promise.resolve() };
    const activeVideo = { currentTime: 0, play: () => Promise.resolve() };
    const inactiveVidNode = createNode('video');
    Object.assign(inactiveVidNode, oldVideo);
    const activeVidNode = createNode('video');
    Object.assign(activeVidNode, activeVideo);

    const inactiveReel = createNode('ytd-reel-video-renderer', {}, [inactiveVidNode]);
    const activeReel = createNode('ytd-reel-video-renderer', { 'is-active': '' }, [activeVidNode]);
    const ytdShorts = createNode('ytd-shorts', {}, [inactiveReel, activeReel]);
    setupMockEnv('https://www.youtube.com/shorts/NzA0ZHG8h-E', [ytdShorts]);

    assert.equal(getActiveVideoElement(), activeVidNode, 'Must prioritize is-active reel video element');

    const link = createNode('a', { 'data-time': '18' });
    link.classList.add('yt-ai-timestamp-link');
    link.closest = () => link;
    const banner = createNode('div', { id: 'yt-ai-summarizer-container' }, [link]);
    banner.className = 'yt-ai-shorts-mode';
    BannerEventHandler.bind(banner, {
      state: { currentLang: 'fr' },
      bannerView: { state: {} },
      settingsDrawer: { syncProviderUI: () => {}, bindPasteButton: () => {} },
      audioController: { init: () => {} },
      auditViewController: { syncChannelAuditUI: () => {} }
    });

    let wheelStopped = false;
    banner.dispatchEvent({ type: 'click', target: link, preventDefault: () => {} });
    assert.equal(activeVidNode.currentTime, 18, 'Active Short video must seek to 18s');
    assert.equal(inactiveVidNode.currentTime, 0, 'Inactive preloaded reel video must not be modified');

    banner.dispatchEvent({ type: 'wheel', stopPropagation: () => { wheelStopped = true; } });
    assert.equal(wheelStopped, true, 'Expanded Shorts sheet must capture wheel scroll to prevent accidental Short swipe');

    let collapsedWheelStopped = false;
    banner.classList.add('is-collapsed');
    banner.dispatchEvent({ type: 'wheel', stopPropagation: () => { collapsedWheelStopped = true; } });
    assert.equal(collapsedWheelStopped, false, 'Collapsed bar must let user wheel-scroll to next Short');
  });

  it('extracts active Short DOM metadata from ytd-reel-video-renderer[is-active] without reading stale cache', () => {
    const prevTitle = createNode('h2', { className: 'ytShortsVideoTitleViewModelShortsVideoTitle', textContent: 'Old Short Title' });
    const prevReel = createNode('ytd-reel-video-renderer', {}, [prevTitle]);

    const activeTitle = createNode('h2', { className: 'ytShortsVideoTitleViewModelShortsVideoTitle', textContent: 'Actual Active Short' });
    const activeChannel = createNode('a', { href: '/@ActiveCreator', textContent: '@ActiveCreator' });
    const activeTag = createNode('a', { href: '/hashtag/science', textContent: '#science' });
    const activeBar = createNode('yt-reel-channel-bar-view-model', {}, [activeChannel]);
    const activeMeta = createNode('yt-reel-metapanel-view-model', { textContent: 'Actual Active Short #science' }, [activeTitle, activeBar, activeTag]);
    const activeReel = createNode('ytd-reel-video-renderer', { 'is-active': '' }, [activeMeta]);
    const ytdShorts = createNode('ytd-shorts', {}, [prevReel, activeReel]);

    setupMockEnv('https://www.youtube.com/shorts/NzA0ZHG8h-E', [ytdShorts]);
    const meta = YouTubeDOMContext.getVideoMetadata({ videoId: 'DIFFERENT_PREV_ID', title: 'Stale', description: 'Stale desc' });

    assert.equal(meta.videoId, 'NzA0ZHG8h-E');
    assert.equal(meta.title, 'Actual Active Short');
    assert.equal(meta.author, '@ActiveCreator');
    assert.equal(meta.channelUrl, '/@ActiveCreator');
    assert.deepEqual(meta.keywords, ['science']);
    assert.equal(meta.description.includes('Actual Active Short'), true);
  });

  it('rejects stale ytInitialData params on swiped Shorts and resolves #shorts-player correctly', () => {
    const moviePlayer = createNode('div', { id: 'movie_player' });
    moviePlayer.getVideoData = () => ({ video_id: 'OLD_WATCH' });
    moviePlayer.getPlayerResponse = () => ({ videoDetails: { videoId: 'OLD_WATCH', title: 'Old' } });

    const shortsPlayer = createNode('div', { id: 'shorts-player' });
    shortsPlayer.getVideoData = () => ({ video_id: 'NzA0ZHG8h-E' });
    shortsPlayer.getPlayerResponse = () => ({ videoDetails: { videoId: 'NzA0ZHG8h-E', title: 'Short Target' } });

    setupMockEnv('https://www.youtube.com/shorts/NzA0ZHG8h-E', [moviePlayer, shortsPlayer]);
    global.window.ytInitialData = {
      currentVideoEndpoint: { reelWatchEndpoint: { videoId: 'FIRST_SHORT' } },
      engagementPanels: [{ getTranscriptEndpoint: { params: 'STALE_FIRST_SHORT_PARAMS' } }]
    };
    global.window.ytInitialPlayerResponse = { videoDetails: { videoId: 'FIRST_SHORT' } };

    assert.equal(PlayerElementHelper.resolvePlayerElement('NzA0ZHG8h-E'), shortsPlayer);
    assert.equal(InnerTubeBridge.findTranscriptParams('NzA0ZHG8h-E'), null, 'Must ignore stale ytInitialData params belonging to FIRST_SHORT');

    const extractor = new YouTubeContextExtractor();
    const resolved = extractor.resolvePlayerResponse('NzA0ZHG8h-E');
    assert.equal(resolved?.videoDetails?.videoId, 'NzA0ZHG8h-E');
    assert.equal(extractor.resolvePlayerResponse('SWIPED_SHORT_XYZ'), null, 'Must not return stale playerResponse for swiped Short');

    // Fullscreen protection on ytd-shorts
    const ytdShortsFs = createNode('ytd-shorts', { fullscreen: '' });
    setupMockEnv('https://www.youtube.com/shorts/NzA0ZHG8h-E', [ytdShortsFs]);
    assert.equal(NavigationObserver.isFullscreen(), true, 'Must detect ytd-shorts[fullscreen]');
  });

  it('recognizes YouTube Shorts active tab inside toolbar PopupController', async () => {
    const videoCard = createNode('div', { id: 'videoCard', className: 'hidden' });
    const idleCard = createNode('div', { id: 'idleCard' });
    const disabledCard = createNode('div', { id: 'disabledNoticeCard', className: 'hidden' });
    const videoTitle = createNode('div', { id: 'videoTitle' });
    const stateBadge = createNode('span', { id: 'bannerStateBadge' });
    const toggleText = createNode('span', { id: 'toggleBannerText' });

    const elMap = { videoCard, idleCard, disabledNoticeCard: disabledCard, videoTitle, bannerStateBadge: stateBadge, toggleBannerText: toggleText };
    setupMockEnv('https://www.youtube.com/', []);
    global.document.getElementById = (id) => elMap[id] || null;
    let sentAction = null;
    global.chrome.tabs = {
      query: async () => [{ id: 42, url: 'https://www.youtube.com/shorts/NzA0ZHG8h-E', title: 'Test Short - YouTube' }],
      sendMessage: async (_tabId, msg) => {
        sentAction = msg.action;
        return { success: true, enabled: true, isWatch: true, isWatchPage: true, isShorts: true, isExpanded: false, title: 'Test Short' };
      }
    };

    const controller = new PopupController();
    controller.extensionEnabled = true;
    await controller.inspectActiveTab();

    assert.equal(sentAction, 'GET_IN_PAGE_STATUS');
    assert.equal(videoCard.classList.contains('hidden'), false, 'Video card must be visible on YouTube Shorts');
    assert.equal(idleCard.classList.contains('hidden'), true, 'Idle card must hide on YouTube Shorts');
    assert.equal(videoTitle.textContent, 'Test Short');

    // Reject non-YouTube host reusing /shorts/ path
    global.chrome.tabs.query = async () => [{ id: 43, url: 'https://example.com/shorts/NzA0ZHG8h-E', title: 'Fake' }];
    await controller.inspectActiveTab();
    assert.equal(videoCard.classList.contains('hidden'), true);
    assert.equal(idleCard.classList.contains('hidden'), false);
  });

  it('prevents cross-video transcript/chapter leakage from hidden watch containers or unverified Main World payloads onto Shorts', async () => {
    // 1. Stale 931-word watch transcript & chapters living inside hidden ytd-watch-flexy while viewing a silent Short
    const segs = [];
    for (let i = 0; i < 4; i++) {
      segs.push(createNode('transcript-segment-view-model', {}, [
        createNode('div', { className: 'segment-timestamp', textContent: `0:0${i}` }),
        createNode('span', { role: 'text', textContent: `Unrelated long video sentence number ${i}` })
      ]));
    }
    const chapters = [
      createNode('ytd-macro-markers-entry-renderer', {}, [createNode('div', { id: 'time', textContent: '0:00' }), createNode('h4', { id: 'title', textContent: 'Old Chap 1' })]),
      createNode('ytd-macro-markers-entry-renderer', {}, [createNode('div', { id: 'time', textContent: '1:00' }), createNode('h4', { id: 'title', textContent: 'Old Chap 2' })])
    ];
    const hiddenWatch = createNode('ytd-watch-flexy', { hidden: '', 'video-id': 'OLD_LONG_VID' }, [...segs, ...chapters]);
    const ytdShorts = createNode('ytd-shorts', {}, [createNode('div', { id: 'shorts-container' })]);
    setupMockEnv('https://www.youtube.com/shorts/gxfJOqMCJ8A', [hiddenWatch, ytdShorts]);

    assert.equal(DOMTranscriptExtractor.extractTranscriptFromActiveDOM(), null, 'DOMTranscriptExtractor must ignore stale nodes in hidden ytd-watch-flexy');
    assert.equal(YouTubeDOMContext.extractChaptersFromDescription(), null, 'extractChaptersFromDescription must ignore stale chapters in hidden ytd-watch-flexy');

    // 2. Main world must reject mixed/unverified player states & ytInitialData without positive matching videoId
    const desyncedShortsPlayer = createNode('div', { id: 'shorts-player' });
    desyncedShortsPlayer.getVideoData = () => ({ video_id: 'gxfJOqMCJ8A' });
    desyncedShortsPlayer.getPlayerResponse = () => ({ videoDetails: { videoId: 'PREV_SHORT_931W' }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'https://stale' }] } } });

    const orphanMoviePlayer = createNode('div', { id: 'movie_player' });
    orphanMoviePlayer.getOption = () => [{ baseUrl: 'https://stale-movie-player' }];

    setupMockEnv('https://www.youtube.com/shorts/gxfJOqMCJ8A', [hiddenWatch, ytdShorts, desyncedShortsPlayer, orphanMoviePlayer]);
    global.window.ytInitialData = { engagementPanels: [{ getTranscriptEndpoint: { params: 'UNVERIFIED_STALE_PARAMS' } }] };

    const extractor = new YouTubeContextExtractor();
    assert.equal(extractor.resolvePlayerResponse('gxfJOqMCJ8A'), null, 'Must reject playerResponse whose videoDetails.videoId disagrees with requestedVideoId');
    assert.deepEqual(extractor.resolveCaptionTracks(null, 'gxfJOqMCJ8A'), [], 'Must never read tracklist from mismatched or unverified player');
    assert.equal(InnerTubeBridge.findTranscriptParams('gxfJOqMCJ8A'), null, 'Must reject ytInitialData lacking matching videoId');

    // 3. InPageTranscriptController must discard mismatched background/late cache writes on Shorts
    const tc = new InPageTranscriptController();
    tc.requestPlayerDataFromMainWorld = async () => ({ videoId: 'gxfJOqMCJ8A', captions: [], segments: null });
    tc.fetchTranscriptFromBackground = async () => ({ success: true, videoId: 'OLD_LONG_VID', segments: [{ timestamp: '0:00', text: 'Wrong video' }] });
    const result = await tc.executeExtractionPipeline('gxfJOqMCJ8A', 'fr', true);
    assert.equal(result, null, 'Must reject background transcript belonging to a different videoId');

    tc.saveCachedTranscript('OLD_LONG_VID', [{ timestamp: '0:00', text: 'Stale' }], false);
    assert.equal(tc.cachedTranscript.videoId, '', 'saveCachedTranscript must refuse overwriting cache for a different active videoId');
  });
});
