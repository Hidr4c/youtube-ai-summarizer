import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';

function createMockNode(tagName = 'div') {
  const listeners = {};
  const classes = new Set();
  const attributes = new Map();
  let text = '';

  const node = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    children: [],
    parentNode: null,
    attributes,
    classList: {
      add: (c) => { classes.add(c); node.className = Array.from(classes).join(' '); },
      remove: (c) => { classes.delete(c); node.className = Array.from(classes).join(' '); },
      toggle: (c) => {
        if (classes.has(c)) { classes.delete(c); node.className = Array.from(classes).join(' '); return false; }
        classes.add(c); node.className = Array.from(classes).join(' '); return true;
      },
      contains: (c) => classes.has(c)
    },
    getAttribute: (n) => attributes.get(n) || null,
    setAttribute: (n, v) => attributes.set(n, String(v)),
    hasAttribute: (n) => attributes.has(n),
    get textContent() {
      if (node.children.length === 0) return text;
      return node.children.map(c => c.textContent).join(' ') + text;
    },
    set textContent(v) { text = v; },
    appendChild: (child) => {
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    prepend: (child) => {
      child.parentNode = node;
      node.children.unshift(child);
      return child;
    },
    insertBefore: (child, ref) => {
      child.parentNode = node;
      const idx = ref ? node.children.indexOf(ref) : -1;
      if (idx !== -1) node.children.splice(idx, 0, child);
      else node.children.push(child);
      return child;
    },
    get firstChild() {
      return node.children[0] || null;
    },
    remove: () => {
      if (node.parentNode) {
        const idx = node.parentNode.children.indexOf(node);
        if (idx !== -1) node.parentNode.children.splice(idx, 1);
      }
    },
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    click: () => {
      for (const fn of (listeners['click'] || [])) fn();
    },
    set innerHTML(html) {
      node.children = [];
      const parsed = parseHtmlToNodes(html);
      parsed.forEach(c => node.appendChild(c));
    },
    querySelector: (sel) => findNode(node, sel),
    querySelectorAll: (sel) => {
      const results = [];
      findAllNodes(node, sel, results);
      return results;
    }
  };
  return node;
}

function parseHtmlToNodes(html) {
  const root = createMockNode('div');
  const tagRegex = /<(\/?[a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
  const stack = [root];
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const [, tagName, attrsStr, text] = match;
    if (text) {
      if (text.trim()) {
        const top = stack[stack.length - 1];
        top.textContent = (top.textContent || '') + text.trim();
      }
    } else if (tagName.startsWith('/')) {
      if (stack.length > 1) stack.pop();
    } else {
      const isSelfClosing = attrsStr.endsWith('/') || ['img', 'br', 'hr', 'input'].includes(tagName.toLowerCase());
      const child = createMockNode(tagName);
      const attrRegex = /([a-zA-Z0-9-_]+)(?:=["']([^"']*)["'])?/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const name = attrMatch[1];
        const val = attrMatch[2] !== undefined ? attrMatch[2] : '';
        if (name === 'id') child.id = val;
        else if (name === 'class') {
          val.split(/\s+/).filter(Boolean).forEach(c => child.classList.add(c));
        }
        child.setAttribute(name, val);
      }
      stack[stack.length - 1].appendChild(child);
      if (!isSelfClosing) stack.push(child);
    }
  }
  return root.children;
}

function matchesSelector(node, sel) {
  if (!node || !sel) return false;
  if (sel.startsWith('#')) return node.id === sel.slice(1);
  if (sel.startsWith('.')) return node.classList.contains(sel.slice(1));
  if (sel.includes('[') && sel.endsWith(']')) {
    const match = sel.match(/^([a-zA-Z0-9-._#]*?)\[([a-zA-Z0-9-_]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
    if (match) {
      const [, prefix, attrName, attrVal] = match;
      if (prefix && !matchesSelector(node, prefix)) return false;
      if (!node.hasAttribute(attrName)) return false;
      if (attrVal !== undefined && node.getAttribute(attrName) !== attrVal) return false;
      return true;
    }
  }
  return node.tagName.toLowerCase() === sel.toLowerCase();
}

function findNode(root, sel) {
  const parts = sel.split(',').map(s => s.trim());
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const target = tokens[tokens.length - 1];
    const walk = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, target)) return child;
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

function findAllNodes(root, sel, acc) {
  const tokens = sel.trim().split(/\s+/);
  const target = tokens[tokens.length - 1];
  const walk = (node) => {
    for (const child of node.children) {
      if (matchesSelector(child, target)) {
        if (!acc.includes(child)) acc.push(child);
      }
      walk(child);
    }
  };
  walk(root);
}

describe('ChannelCompanionCard - In-Page Channel Companion UI Component', () => {
  let docRoot;

  beforeEach(() => {
    docRoot = createMockNode('html');
    const body = createMockNode('body');
    const content = createMockNode('div');
    content.id = 'content';
    const ytdBrowse = createMockNode('ytd-browse');
    ytdBrowse.setAttribute('page-subtype', 'channels');
    ytdBrowse.appendChild(content);
    body.appendChild(ytdBrowse);
    docRoot.appendChild(body);

    globalThis.document = {
      documentElement: docRoot,
      body,
      getElementById: (id) => findNode(docRoot, `#${id}`),
      querySelector: (sel) => findNode(docRoot, sel),
      querySelectorAll: (sel) => {
        const res = [];
        findAllNodes(docRoot, sel, res);
        return res;
      },
      createElement: (tag) => createMockNode(tag)
    };

    globalThis.window = {
      location: {
        pathname: '/@testchannel',
        origin: 'https://www.youtube.com'
      }
    };
  });

  it('renders companion card with title, handle, period pills, and audit button', () => {
    const mockService = {
      getCachedReport: () => null,
      executeChannelAudit: async () => ({})
    };
    const mockViewController = {
      renderReport: () => {}
    };
    const state = {
      extensionEnabled: true,
      currentLang: 'fr'
    };

    const cardController = new ChannelCompanionCard({
      channelAuditService: mockService,
      channelAuditViewController: mockViewController,
      state
    });

    cardController.tryInjectCompanion();

    const injectedCard = document.getElementById('yt-ai-channel-companion');
    assert.ok(injectedCard, 'Card should be injected into DOM');

    const brandTitle = injectedCard.querySelector('.yt-ai-card-title');
    assert.ok(brandTitle.textContent.includes('Audit Global'));

    const runBtn = injectedCard.querySelector('#ytAiRunChannelAuditBtn');
    assert.ok(runBtn, 'Run button should exist');
    assert.ok(runBtn.textContent.includes('Lancer l’Audit Global'));

    // Check period pills
    const pills = injectedCard.querySelectorAll('.yt-ai-period-pill');
    assert.equal(pills.length, 4);
    assert.ok(pills[0].classList.contains('active'));
  });

  it('toggles expansion state when toggle button is clicked', () => {
    const cardController = new ChannelCompanionCard({
      state: { extensionEnabled: true, currentLang: 'fr' }
    });

    cardController.tryInjectCompanion();
    const card = document.getElementById('yt-ai-channel-companion');
    const toggleBtn = card.querySelector('#ytAiCompanionToggleBtn');
    const body = card.querySelector('#ytAiCompanionBody');

    assert.equal(cardController.isExpanded, true);
    assert.equal(body.classList.contains('yt-ai-hidden'), false);

    // Click toggle to collapse
    toggleBtn.click();
    assert.equal(cardController.isExpanded, false);
    assert.equal(body.classList.contains('yt-ai-hidden'), true);
    assert.equal(toggleBtn.textContent, '▲');

    // Click toggle to expand
    toggleBtn.click();
    assert.equal(cardController.isExpanded, true);
    assert.equal(body.classList.contains('yt-ai-hidden'), false);
    assert.equal(toggleBtn.textContent, '▾');
  });

  it('updates selected period when clicking period filter pills', () => {
    const cardController = new ChannelCompanionCard({
      state: { extensionEnabled: true, currentLang: 'en' }
    });

    cardController.tryInjectCompanion();
    const card = document.getElementById('yt-ai-channel-companion');
    const pills = card.querySelectorAll('.yt-ai-period-pill');

    // Click "Last month" pill
    pills[1].click();
    assert.equal(pills[0].classList.contains('active'), false);
    assert.equal(pills[1].classList.contains('active'), true);
    assert.equal(pills[1].getAttribute('data-period'), 'month');
  });

  it('removes card when extension is disabled', () => {
    const cardController = new ChannelCompanionCard({
      state: { extensionEnabled: false, currentLang: 'fr' }
    });

    cardController.tryInjectCompanion();
    const card = document.getElementById('yt-ai-channel-companion');
    assert.equal(card, null);
  });
});
