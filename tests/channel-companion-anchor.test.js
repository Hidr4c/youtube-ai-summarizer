import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';

function createMockElement(tagName, id = '') {
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    children: [],
    parentNode: null,
    get firstElementChild() {
      return el.children[0] || null;
    },
    appendChild(child) {
      child.parentNode = el;
      el.children.push(child);
      return child;
    },
    querySelector(sel) {
      if (sel.startsWith('#')) {
        const targetId = sel.slice(1);
        for (const child of el.children) {
          if (child.id === targetId) return child;
          const found = child.querySelector?.(sel);
          if (found) return found;
        }
      }
      return null;
    }
  };
  return el;
}

describe('ChannelCompanionCard Anchor Resolution', () => {
  let docElements;

  beforeEach(() => {
    docElements = new Map();
    globalThis.document = {
      querySelector(sel) {
        if (sel === '#page-header-container') return docElements.get('phc') || null;
        if (sel === 'tp-yt-app-header #contentContainer') return docElements.get('contentContainer') || null;
        if (sel === 'ytd-tabbed-page-header') return docElements.get('tabbedHeader') || null;
        if (sel.includes('ytd-browse')) return docElements.get('browse') || null;
        return null;
      }
    };
  });

  it('anchors before page-header-banner inside page-header-container when banner image exists', () => {
    const phc = createMockElement('div', 'page-header-container');
    const phb = createMockElement('div', 'page-header-banner');
    const ph = createMockElement('div', 'page-header');
    phc.appendChild(phb);
    phc.appendChild(ph);
    docElements.set('phc', phc);

    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.ok(anchor, 'Anchor should be found');
    assert.strictEqual(anchor.parent, phc);
    assert.strictEqual(anchor.reference, phb);
  });

  it('anchors before page-header inside page-header-container when no channel banner image exists', () => {
    const phc = createMockElement('div', 'page-header-container');
    const ph = createMockElement('div', 'page-header');
    phc.appendChild(ph);
    docElements.set('phc', phc);

    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.ok(anchor, 'Anchor should be found');
    assert.strictEqual(anchor.parent, phc);
    assert.strictEqual(anchor.reference, ph);
  });

  it('falls back to tp-yt-app-header #contentContainer when page-header-container is absent', () => {
    const cc = createMockElement('div', 'contentContainer');
    const child = createMockElement('div', 'some-child');
    cc.appendChild(child);
    docElements.set('contentContainer', cc);

    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.ok(anchor, 'Anchor should be found');
    assert.strictEqual(anchor.parent, cc);
    assert.strictEqual(anchor.reference, child);
  });

  it('strictly returns null when only outer containers exist to prevent crushing channel banner image', () => {
    const parent = createMockElement('div', 'header');
    const tabbedHeader = createMockElement('ytd-tabbed-page-header');
    parent.appendChild(tabbedHeader);
    docElements.set('tabbedHeader', tabbedHeader);

    const browse = createMockElement('ytd-browse');
    docElements.set('browse', browse);

    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.strictEqual(anchor, null, 'Must return null so tryInjectCompanion waits for #page-header-container');
  });

  it('returns null when no YouTube page containers exist', () => {
    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();
    assert.strictEqual(anchor, null);
  });
});
