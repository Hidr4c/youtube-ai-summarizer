import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';
import { SettingsDrawerController } from '../src/content/ui/SettingsDrawerController.js';

function createMockElement(tag) {
  const classes = new Set();
  const attributes = new Map();
  const listeners = new Map();
  let text = '';
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    parentNode: null,
    style: {},
    classList: {
      add: (c) => { classes.add(c); el.className = Array.from(classes).join(' '); },
      remove: (c) => { classes.delete(c); el.className = Array.from(classes).join(' '); },
      toggle: (c, force) => {
        const has = classes.has(c);
        const shouldAdd = force !== undefined ? !!force : !has;
        if (shouldAdd) classes.add(c); else classes.delete(c);
        el.className = Array.from(classes).join(' ');
        return shouldAdd;
      },
      contains: (c) => classes.has(c)
    },
    getAttribute: (n) => attributes.get(n) || null,
    setAttribute: (n, v) => attributes.set(n, String(v)),
    hasAttribute: (n) => attributes.has(n),
    get textContent() {
      if (el.children.length === 0) return text;
      return el.children.map(c => c.textContent).join(' ') + text;
    },
    set textContent(v) { text = v; },
    appendChild: (child) => {
      child.parentNode = el;
      el.children.push(child);
      return child;
    },
    insertBefore: (child, ref) => {
      child.parentNode = el;
      const idx = ref ? el.children.indexOf(ref) : -1;
      if (idx !== -1) el.children.splice(idx, 0, child);
      else el.children.push(child);
      return child;
    },
    remove: () => {
      if (el.parentNode) {
        const idx = el.parentNode.children.indexOf(el);
        if (idx !== -1) el.parentNode.children.splice(idx, 1);
      }
    },
    addEventListener: (evt, handler) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(handler);
    },
    click: () => {
      const handlers = listeners.get('click') || [];
      handlers.forEach(h => h({ currentTarget: el, target: el }));
    },
    set innerHTML(html) {
      el.children = [];
      const parsed = parseHtml(html);
      parsed.forEach(c => el.appendChild(c));
    },
    querySelector: (sel) => findMock(el, sel),
    querySelectorAll: (sel) => {
      const results = [];
      findAllMock(el, sel, results);
      return results;
    }
  };
  return el;
}

function parseHtml(html) {
  const root = createMockElement('div');
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
      const child = createMockElement(tagName);
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

function findMock(root, sel) {
  for (const child of root.children) {
    if (sel.startsWith('#') && child.id === sel.slice(1)) return child;
    if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) return child;
    const res = findMock(child, sel);
    if (res) return res;
  }
  return null;
}

function findAllMock(root, sel, acc) {
  for (const child of root.children) {
    if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) acc.push(child);
    findAllMock(child, sel, acc);
  }
}

describe('ChannelCompanionCard Settings Integration', () => {
  let docRoot;
  let savedPrefs = {};

  beforeEach(() => {
    savedPrefs = {};
    docRoot = createMockElement('html');
    const body = createMockElement('body');
    const phc = createMockElement('div');
    phc.id = 'page-header-container';
    body.appendChild(phc);
    docRoot.appendChild(body);

    globalThis.document = {
      documentElement: docRoot,
      body,
      getElementById: (id) => findMock(docRoot, `#${id}`),
      querySelector: (sel) => findMock(docRoot, sel),
      querySelectorAll: (sel) => {
        const res = [];
        findAllMock(docRoot, sel, res);
        return res;
      },
      createElement: (tag) => createMockElement(tag)
    };

    globalThis.chrome = {
      runtime: {
        sendMessage: (_msg, cb) => { if (cb) cb({ success: true, data: [] }); },
        lastError: null
      }
    };

    globalThis.window = {
      location: { pathname: '/@testchannel', origin: 'https://www.youtube.com' },
      dispatchEvent: () => {}
    };
  });

  it('renders embedded settings drawer inside channel companion card and toggles on settings button click', () => {
    const state = {
      extensionEnabled: true,
      currentLang: 'fr',
      currentProvider: 'lmstudio',
      serverUrls: { lmstudio: 'http://localhost:1234' },
      apiKeys: {},
      availableLocalModels: {},
      selectedModels: {},
      getActiveModel: () => '',
      setActiveModel: () => {},
      savePreference: (k, v) => { savedPrefs[k] = v; }
    };

    const settingsDrawer = new SettingsDrawerController(state);
    const card = new ChannelCompanionCard({
      state,
      settingsDrawer
    });

    card.tryInjectCompanion();

    const companion = document.getElementById('yt-ai-channel-companion');
    assert.ok(companion, 'Companion should be injected');

    const drawer = companion.querySelector('#ytAiSettingsDrawer');
    assert.ok(drawer, 'Settings drawer should be rendered inside companion card');
    assert.equal(drawer.classList.contains('yt-ai-hidden'), true, 'Drawer should be hidden initially');

    const settingsBtn = companion.querySelector('#ytAiCompanionSettingsBtn');
    assert.ok(settingsBtn, 'Settings button should exist in companion header');

    // Click settings button to open
    settingsBtn.click();
    assert.equal(drawer.classList.contains('yt-ai-hidden'), false, 'Drawer should open on click');

    // Click settings button again to close
    settingsBtn.click();
    assert.equal(drawer.classList.contains('yt-ai-hidden'), true, 'Drawer should close on second click');
  });
});
