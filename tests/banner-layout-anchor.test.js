import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BannerView } from '../src/content/ui/BannerView.js';

function createMockNode(tag, attrs = {}, children = []) {
  const node = {
    tagName: tag.toUpperCase(),
    className: attrs.class || attrs.className || '',
    id: attrs.id || '',
    attributes: new Map(Object.entries(attrs)),
    children: [],
    parentNode: null,
    isConnected: true,
    classList: {
      classes: new Set((attrs.class || '').split(/\s+/).filter(Boolean)),
      add(c) { this.classes.add(c); node.className = Array.from(this.classes).join(' '); },
      remove(c) { this.classes.delete(c); node.className = Array.from(this.classes).join(' '); },
      contains(c) { return this.classes.has(c); }
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

  it('correctly anchors before #full-bleed-container when nested #player-theater-container exists', () => {
    const theater = createMockNode('div', { id: 'player-theater-container' });
    const fullBleed = createMockNode('div', { id: 'full-bleed-container' }, [theater]);
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [fullBleed, columns]);
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_TOP_1', [watchFlexy]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'fr' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner, 'Banner must be injected');
    assert.equal(banner.parentNode, watchFlexy, 'Banner parent must be ytd-watch-flexy');
    assert.equal(watchFlexy.children[0], banner, 'Banner must be at index 0 (top of page)');
    assert.equal(watchFlexy.children[1], fullBleed, '#full-bleed-container must be after banner');
  });

  it('skips non-visual elements (iron-media-query) to anchor at top', () => {
    const mediaQuery = createMockNode('iron-media-query', { id: 'two-column-query' });
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [mediaQuery, columns]);
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_TOP_2', [watchFlexy]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner);
    assert.equal(watchFlexy.children[1], banner, 'Banner anchors before columns');
  });

  it('gracefully handles insertBefore error by calling parent.prepend', () => {
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [columns]);
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_TOP_3', [watchFlexy]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    // Intentionally pass an alien ref child that throws
    const alienNode = createMockNode('div', { id: 'alien' });
    bannerView._resolveWatchAnchor = () => alienNode;

    assert.doesNotThrow(() => bannerView.tryInjectBanner());
    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(banner);
    assert.equal(watchFlexy.children[0], banner, 'Banner prepended to parent after fallback');
  });

  it('refuses to inject into document.body when only skeleton elements on body exist', () => {
    const skeletonPlayer = createMockNode('div', { id: 'player' });
    setupGlobalDom('https://www.youtube.com/watch?v=TEST_SKELETON', [skeletonPlayer]);

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    bannerView.tryInjectBanner();

    const banner = global.document.getElementById('yt-ai-summarizer-container');
    assert.equal(banner, null, 'Must NEVER inject into document.body');
    assert.equal(skeletonPlayer.parentNode.children.length, 1, 'Body must contain only skeleton player');
  });

  it('relocates mislocated banner from document.body to ytd-watch-flexy', () => {
    // 1. Initial state: banner was erroneously placed on body by legacy code
    const columns = createMockNode('div', { id: 'columns' });
    const watchFlexy = createMockNode('ytd-watch-flexy', {}, [columns]);
    const oldBanner = createMockNode('div', { id: 'yt-ai-summarizer-container' });

    setupGlobalDom('https://www.youtube.com/watch?v=TEST_RELOCATE', [oldBanner, watchFlexy]);
    assert.equal(global.document.body.children[0], oldBanner, 'Initial banner on body');

    const bannerView = new BannerView({ extensionEnabled: true, currentLang: 'en' });
    bannerView.tryInjectBanner();

    const currentBanner = global.document.getElementById('yt-ai-summarizer-container');
    assert.ok(currentBanner, 'Banner exists');
    assert.equal(currentBanner.parentNode, watchFlexy, 'Banner parent must now be ytd-watch-flexy');
    assert.equal(global.document.body.children.includes(oldBanner), false, 'Old banner must be removed from body');
  });
});
