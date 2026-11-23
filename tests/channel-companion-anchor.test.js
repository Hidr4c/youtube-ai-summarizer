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
  beforeEach(() => {
    const body = createMockElement('body');
    globalThis.document = {
      body,
      querySelector() {
        return null;
      }
    };
  });

  it('anchors cleanly at top of document.body before ytd-app when channel page has body children', () => {
    const ytdApp = createMockElement('ytd-app');
    globalThis.document.body.appendChild(ytdApp);

    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.ok(anchor, 'Anchor should be found');
    assert.strictEqual(anchor.parent, globalThis.document.body);
    assert.strictEqual(anchor.reference, ytdApp);
  });

  it('anchors with null reference when document.body is empty', () => {
    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.ok(anchor, 'Anchor should be found');
    assert.strictEqual(anchor.parent, globalThis.document.body);
    assert.strictEqual(anchor.reference, null);
  });

  it('anchors above mobile YouTube browse shells consistently via document.body', () => {
    const ytmBrowse = createMockElement('ytm-browse');
    globalThis.document.body.appendChild(ytmBrowse);

    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();

    assert.ok(anchor, 'Anchor should be found');
    assert.strictEqual(anchor.parent, globalThis.document.body);
    assert.strictEqual(anchor.reference, ytmBrowse);
  });

  it('returns null when document.body is absent', () => {
    globalThis.document = { body: null, querySelector: () => null };
    const card = new ChannelCompanionCard();
    const anchor = card._findChannelAnchor();
    assert.strictEqual(anchor, null);
  });
});
