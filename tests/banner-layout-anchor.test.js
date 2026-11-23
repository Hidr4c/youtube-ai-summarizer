import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BannerView } from '../src/content/ui/BannerView.js';

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
    attributes: new Map(Object.entries(attrs)),
    children: [],
    parentNode: null,
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
    style: {},
    appendChild(child) {
      if (!child) return child;
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    insertBefore(newChild, refChild) {
      if (refChild && refChild.parentNode !== node) {
        throw new Error("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
      }
      newChild.parentNode = node;
      const idx = node.children.indexOf(refChild);
      if (idx !== -1) node.children.splice(idx, 0, newChild);
      else node.children.push(newChild);
      return newChild;
    },
    get firstElementChild() {
      return this.children[0] || null;
    },
    prepend(child) {
      child.parentNode = node;
      node.children.unshift(child);
      return child;
    },
    remove() {
      if (node.parentNode) {
        const idx = node.parentNode.children.indexOf(node);
        if (idx !== -1) node.parentNode.children.splice(idx, 1);
      }
      node.isConnected = false;
    },
    querySelector(selector) {
      const id = selector.replace('#', '');
      const find = (n) => {
        for (const c of n.children) {
          if (c.id === id) return c;
          const found = find(c);
          if (found) return found;
        }
        return null;
      };
      return find(node);
    }
  };
  children.forEach(c => node.appendChild(c));
  return node;
}

function setupGlobalDom(url, bodyChildren = []) {
  const body = createMockNode('body', {}, bodyChildren);
  const docElement = createMockNode('html', {}, [body]);
  const parsed = new URL(url);
  global.document = {
    body,
    documentElement: docElement,
    getElementById: (id) => {
      const find = (n) => {
        for (const c of n.children) {
          if (c.id === id) return c;
          const found = find(c);
          if (found) return found;
        }
        return null;
      };
      return find(docElement);
    },
    querySelector: (sel) => {
      if (sel.includes('ytd-watch-flexy')) {
        return body.children.find(c => c.tagName === 'YTD-WATCH-FLEXY') || null;
      }
      return null;
    },
    querySelectorAll: (sel) => [],
    createElement: (tag) => createMockNode(tag)
  };
  global.window = {
    location: {
      href: url,
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search
    }
  };
}

describe('Banner Layout Anchor & Top-of-Page Placement Specification', () => {

  it('correctly anchors at top of document.body before YouTube watch app layout', () => {
    const theater = createMockNode('div', { id: 'player-theater-container' });
    const fullBleed = createMockNode('div', { id: 'full-bleed-container' }, [theater]);
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [fullBleed, columns]);
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_TOP_1', [watchFlexy]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'fr' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner, 'Banner must be injected');
    assert.equal(banner.parentNode, global.document.body, 'Banner parent must be document.body in unified top shell');
    assert.equal(global.document.body.children[0], banner, 'Banner must be at index 0 (top of site)');
    assert.equal(global.document.body.children[1], watchFlexy, 'ytd-watch-flexy must remain after banner');
    assert.equal(banner.classList.contains('yt-ai-top-shell'), true, 'Banner must carry yt-ai-top-shell class');
  });

  it('skips inner layout quirks and always anchors cleanly before body.firstElementChild', () => {
    const mediaQuery = createMockNode('iron-media-query', { id: 'two-column-query' });
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [mediaQuery, columns]);
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_TOP_2', [watchFlexy]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner);
    assert.equal(global.document.body.children[0], banner, 'Banner anchors cleanly at body index 0');
  });

  it('gracefully handles insertBefore error by calling parent.prepend', () => {
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [columns]);
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_TOP_3', [watchFlexy]);
    global.document.body.insertBefore = () => {
      throw new Error('NotFoundError: node mismatch');
    };

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });

    assert.doesNotThrow(() => bannerView.tryInjectBanner());
    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner);
    assert.equal(global.document.body.children[0], banner, 'Banner prepended to document.body after insertBefore fallback');
  });

  it('aborts safely when document.body is unavailable', () => {
    const skeletonPlayer = createMockNode('div', { id: 'player' });
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_NO_BODY', [skeletonPlayer]);
    global.document.body = null;

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.equal(banner, null, 'Must abort gracefully when document.body is missing');
  });

  it('relocates mislocated banner from legacy inner ytd-watch-flexy up to document.body top shell', () => {
    const columns = createMockNode('div', { id: 'columns' });
    const oldBanner = createMockNode('div', { id: 'yt-ai-summarizer-container' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [oldBanner, columns]);

    setupGlobalDom('https://www.youtube.com/watch?v=TEST_RELOCATE', [watchFlexy]);
    assert.equal(watchFlexy.children[0], oldBanner, 'Initial banner misplaced inside watchFlexy');

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    bannerView.tryInjectBanner();

    const currentBanner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(currentBanner, 'Banner exists');
    assert.equal(currentBanner.parentNode, global.document.body, 'Banner parent must now be document.body');
    assert.equal(global.document.body.children[0], currentBanner, 'Relocated banner sits at top of document.body');
    assert.equal(watchFlexy.children.includes(oldBanner), false, 'Old banner must be removed from watchFlexy');
  });
});
