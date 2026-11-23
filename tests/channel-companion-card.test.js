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
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      String(val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    children: [],
    parentNode: null,
    attributes,
    classList: {
      add: (c) => { classes.add(c); },
      remove: (c) => { classes.delete(c); },
      toggle: (c) => {
        if (classes.has(c)) { classes.delete(c); return false; }
        classes.add(c); return true;
      },
      contains: (c) => classes.has(c)
    },
    getAttribute: (n) => attributes.get(n) || null,
    setAttribute: (n, v) => attributes.set(n, String(v)),
    hasAttribute: (n) => attributes.has(n),
    get textContent() { return node.children.length === 0 ? text : node.children.map(c => c.textContent).join(' ') + text; },
    set textContent(v) { text = v; },
    appendChild: (child) => { child.parentNode = node; node.children.push(child); return child; },
    prepend: (child) => { child.parentNode = node; node.children.unshift(child); return child; },
    insertBefore: (child, ref) => {
      child.parentNode = node;
      const idx = ref ? node.children.indexOf(ref) : -1;
      if (idx !== -1) node.children.splice(idx, 0, child);
      else node.children.push(child);
      return child;
    },
    get firstChild() { return node.children[0] || null; },
    remove: () => {
      if (node.parentNode) {
        const idx = node.parentNode.children.indexOf(node);
        if (idx !== -1) node.parentNode.children.splice(idx, 1);
      }
    },
    addEventListener: (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); },
    click: () => { for (const fn of (listeners['click'] || [])) fn(); },
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
    if (text !== undefined) {
      if (text.trim()) {
        const top = stack[stack.length - 1];
        top.textContent = (top.textContent || '') + text.trim();
      }
    } else if (tagName && tagName.startsWith('/')) {
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
    const phc = createMockNode('div');
    phc.id = 'page-header-container';
    const phb = createMockNode('div');
    phb.id = 'page-header-banner';
    phc.appendChild(phb);
    ytdBrowse.appendChild(phc);
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

    const brandEl = injectedCard.querySelector('.yt-ai-brand');
    const brandTitle = injectedCard.querySelector('#ytAiCompBrandTitle');
    assert.ok(brandEl, 'Brand header group should exist');
    assert.ok(injectedCard.querySelector('.yt-ai-brand-logo-svg'), 'YouTube brand SVG logo should exist');
    assert.equal(brandTitle.textContent.trim(), 'ClarifAI');
    assert.equal(injectedCard.querySelector('.yt-ai-card-title'), null, 'Redundant channel banner title should be removed');

    const headerTabs = injectedCard.querySelector('.yt-ai-header-tabs');
    assert.ok(headerTabs, 'Channel companion header should render unified single-row tab actions');
    assert.ok(headerTabs.querySelector('#ytAiChanTabAuditBtn'), 'Channel Audit tab action must live in header');
    assert.ok(headerTabs.querySelector('#ytAiChanTabChatBtn'), 'Channel Q&A tab action must live in header');
    assert.equal(injectedCard.querySelector('#ytAiCompLangSelect'), null, 'Legacy header language selector must not clutter top bar');
    assert.ok(injectedCard.querySelector('#ytAiSettingsDrawer #ytAiLangSelect'), 'Language selector should live in Settings Drawer');
    assert.ok(injectedCard.querySelector('#ytAiChannelAuditModeSelect'), 'Channel audit depth selector should live inside audit pane');
    assert.ok(injectedCard.querySelector('.yt-ai-footer-info'), 'Channel companion should render footer attribution');

    const chatPane = injectedCard.querySelector('#ytAiChanPaneChat');
    assert.ok(chatPane.querySelector('.yt-ai-chat-container'), 'Channel Q&A must use yt-ai-chat-container');
    assert.ok(chatPane.querySelector('.yt-ai-chat-input-row'), 'Channel Q&A input must use flex yt-ai-chat-input-row');

    const runBtn = injectedCard.querySelector('#ytAiRunChannelAuditBtn');
    assert.ok(runBtn, 'Run button should exist inside audit pane');
    assert.ok(/Lancer l['’]audit de la cha[îi]ne/i.test(runBtn.textContent));

    // Check period pills
    const pills = injectedCard.querySelectorAll('.yt-ai-period-pill');
    assert.equal(pills.length, 4);
    assert.ok(pills[0].classList.contains('active'));
  });

  it('starts collapsed and toggles expansion state when toggle button is clicked', () => {
    const cardController = new ChannelCompanionCard({
      state: { extensionEnabled: true, currentLang: 'fr' }
    });

    cardController.tryInjectCompanion();
    const card = document.getElementById('yt-ai-channel-companion');
    const toggleBtn = card.querySelector('#ytAiCompanionToggleBtn');
    const body = card.querySelector('#ytAiCompanionBody');

    assert.equal(cardController.isExpanded, false);
    assert.equal(card.classList.contains('is-collapsed'), true);
    assert.equal(card.classList.contains('yt-ai-top-shell'), true);
    assert.equal(body.classList.contains('yt-ai-hidden'), true);
    assert.ok(toggleBtn.textContent.includes('▾'));

    // Click toggle to expand
    toggleBtn.click();
    assert.equal(cardController.isExpanded, true);
    assert.equal(card.classList.contains('is-collapsed'), false);
    assert.equal(body.classList.contains('yt-ai-hidden'), false);
    assert.ok(toggleBtn.textContent.includes('▲'));

    // Click toggle to collapse
    toggleBtn.click();
    assert.equal(cardController.isExpanded, false);
    assert.equal(card.classList.contains('is-collapsed'), true);
    assert.equal(body.classList.contains('yt-ai-hidden'), true);
    assert.ok(toggleBtn.textContent.includes('▾'));
  });

  it('updates selected period when clicking period filter pills', () => {
    const cardController = new ChannelCompanionCard({
      state: { extensionEnabled: true, currentLang: 'en' }
    });

    cardController.tryInjectCompanion();
    const card = document.getElementById('yt-ai-channel-companion');
    const pills = card.querySelectorAll('.yt-ai-period-pill');

    // Click "1 year" pill (pills[1])
    pills[1].click();
    assert.equal(pills[0].classList.contains('active'), false);
    assert.equal(pills[1].classList.contains('active'), true);
    assert.equal(pills[1].getAttribute('data-period'), 'year');
  });

  it('removes card when extension is disabled', () => {
    const cardController = new ChannelCompanionCard({
      state: { extensionEnabled: false, currentLang: 'fr' }
    });

    cardController.tryInjectCompanion();
    const card = document.getElementById('yt-ai-channel-companion');
    assert.equal(card, null);
  });

  it('handleRunAudit invokes viewController render without throwing renderChannelReport error', async () => {
    let rendered = false;
    const mockService = { executeChannelAudit: async () => ({ score: 85 }) };
    const mockViewController = { renderReport: () => { rendered = true; } };
    const cardController = new ChannelCompanionCard({
      channelAuditService: mockService,
      channelAuditViewController: mockViewController,
      state: { extensionEnabled: true, currentLang: 'fr' }
    });

    cardController.tryInjectCompanion();
    await cardController.handleRunAudit();
    assert.equal(rendered, true);
  });

  it('auto-expands and launches channel audit or focuses Q&A in 1 click from collapsed header tabs', async () => {
    let auditLaunched = 0;
    const mockService = {
      getCachedReport: () => null,
      executeChannelAudit: async () => { auditLaunched += 1; return { globalScore: 88 }; }
    };
    const cardController = new ChannelCompanionCard({
      channelAuditService: mockService,
      channelAuditViewController: { renderReport: () => {} },
      state: { extensionEnabled: true, currentLang: 'fr' }
    });

    cardController.tryInjectCompanion();
    assert.equal(cardController.isExpanded, false);

    document.getElementById('ytAiChanTabAuditBtn').click();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(cardController.isExpanded, true);
    assert.equal(cardController.activeTab, 'channelAudit');
    assert.equal(auditLaunched, 1, '1-click audit tab must launch channel audit when uncached');

    document.getElementById('ytAiCompanionToggleBtn').click();
    assert.equal(cardController.isExpanded, false);
    document.getElementById('ytAiChanTabChatBtn').click();
    assert.equal(cardController.isExpanded, true);
    assert.equal(cardController.activeTab, 'channelChat');
  });
});
