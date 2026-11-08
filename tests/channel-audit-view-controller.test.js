import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelAuditViewController } from '../src/content/ui/ChannelAuditViewController.js';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';

function createMockNode(tagName = 'div') {
  const classes = new Set();
  const attributes = new Map();
  let text = '';
  const style = {};

  const node = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    children: [],
    parentNode: null,
    style,
    attributes,
    classList: {
      add: (c) => { classes.add(c); node.className = Array.from(classes).join(' '); },
      remove: (c) => { classes.delete(c); node.className = Array.from(classes).join(' '); },
      contains: (c) => classes.has(c)
    },
    getAttribute: (n) => attributes.get(n) || null,
    setAttribute: (n, v) => attributes.set(n, String(v)),
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
    set innerHTML(html) {
      node.children = [];
      const parsed = parseHtmlToNodes(html);
      parsed.forEach(c => node.appendChild(c));
    },
    addEventListener: () => {},
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
  const cleanHtml = (html || '').replace(/<!--[\s\S]*?-->/g, '');
  const root = createMockNode('div');
  const tagRegex = /<(\/?[a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
  const stack = [root];
  let match;
  while ((match = tagRegex.exec(cleanHtml)) !== null) {
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
        } else if (name === 'style') {
          const pairs = val.split(';');
          for (const p of pairs) {
            const [k, v] = p.split(':');
            if (k && v) child.style[k.trim()] = v.trim();
          }
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
  if (sel.includes('.')) {
    const parts = sel.split('.');
    const tag = parts[0];
    const classes = parts.slice(1);
    if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    return classes.every(c => node.classList.contains(c));
  }
  if (sel.startsWith('#')) return node.id === sel.slice(1);
  return node.tagName.toLowerCase() === sel.toLowerCase();
}

function findNode(root, sel) {
  const tokens = sel.trim().split(/\s+/);
  let currentRoots = [root];
  for (const token of tokens) {
    const next = [];
    for (const r of currentRoots) {
      const walk = (n) => {
        for (const child of n.children) {
          if (matchesSelector(child, token)) next.push(child);
          walk(child);
        }
      };
      walk(r);
    }
    currentRoots = next;
    if (currentRoots.length === 0) return null;
  }
  return currentRoots[0] || null;
}

function findAllNodes(root, sel, acc) {
  const tokens = sel.trim().split(/\s+/);
  let currentRoots = [root];
  for (const token of tokens) {
    const next = [];
    for (const r of currentRoots) {
      const walk = (n) => {
        for (const child of n.children) {
          if (matchesSelector(child, token)) next.push(child);
          walk(child);
        }
      };
      walk(r);
    }
    currentRoots = next;
    if (currentRoots.length === 0) return;
  }
  for (const el of currentRoots) {
    if (!acc.includes(el)) acc.push(el);
  }
}

describe('ChannelAuditViewController - Rendering Channel Global Audit', () => {
  beforeEach(() => {
    globalThis.window = {};
    globalThis.document = {
      createElement: (tag) => createMockNode(tag)
    };
  });
  it('renders complete audit view with gauge, proportions, trajectory and pillars', () => {
    const report = new ChannelAuditReport({
      channelTitle: 'Le Réveilleur',
      channelHandle: '@LeReveilleur',
      subscribers: '218 k abonnés',
      globalScore: 88,
      clickbaitIndex: 10,
      proportions: { reliablePct: 80, cautionPct: 15, clickbaitPct: 5 },
      trajectory: 'improving',
      trajectoryLabel: 'En progression constante',
      temporalEvolution: 'Recul scientifique exemplaire sur les sujets énergétiques.',
      strengths: ['Rigueur des sources scientifiques', 'Pédagogie remarquable'],
      weaknesses: ['Vidéos denses demandant de l’attention'],
      drawbacks: ['Aucun piège constaté'],
      evaluatedVideos: [
        { id: 'v1', title: 'Climatisation : désastre ?', score: 92, era: 'recent', comment: 'Très rigoureux' },
        { id: 'v2', title: 'Chauffage au bois', score: 85, era: 'mid', comment: 'Analyse nuancée' }
      ],
      executiveSummary: 'Chaîne de vulgarisation de premier ordre.'
    });

    const container = document.createElement('div');
    const controller = new ChannelAuditViewController();

    controller.renderReport(report, container, 'fr');

    assert.ok(container.querySelector('.yt-ai-channel-audit-wrapper'), 'Wrapper should exist');

    // Score gauge
    const gaugeNum = container.querySelector('.yt-ai-gauge-num');
    assert.equal(gaugeNum.textContent, '88');
    assert.ok(container.querySelector('.yt-ai-gauge-circle.yt-ai-score-high'));

    // Proportion bar segments
    const relSegment = container.querySelector('.yt-ai-prop-reliable');
    assert.equal(relSegment.style.width, '80%');

    // Trajectory badge
    const trajButton = container.querySelector('.yt-ai-traj-badge');
    assert.ok(trajButton.textContent.includes('En progression constante'));
    assert.ok(trajButton.textContent.includes('↗'));

    // Pillars
    const goodList = container.querySelectorAll('.yt-ai-pillar-good li');
    assert.equal(goodList.length, 2);
    assert.ok(goodList[0].textContent.includes('Rigueur des sources'));

    // Sampled videos accordion
    const sampleItems = container.querySelectorAll('.yt-ai-sample-item');
    assert.equal(sampleItems.length, 2);
    assert.ok(sampleItems[0].textContent.includes('Climatisation : désastre ?'));
    assert.ok(sampleItems[0].textContent.includes('92/100'));

    // Executive summary
    const execBox = container.querySelector('.yt-ai-exec-text');
    assert.ok(execBox.textContent.includes('Chaîne de vulgarisation de premier ordre'));
  });

  it('renders caution and danger score classes based on thresholds', () => {
    const containerMed = document.createElement('div');
    const containerLow = document.createElement('div');
    const controller = new ChannelAuditViewController();

    const reportMed = new ChannelAuditReport({ globalScore: 65, trajectory: 'stable' });
    controller.renderReport(reportMed, containerMed, 'fr');
    assert.ok(containerMed.querySelector('.yt-ai-gauge-circle.yt-ai-score-med'));

    const reportLow = new ChannelAuditReport({ globalScore: 40, trajectory: 'declining' });
    controller.renderReport(reportLow, containerLow, 'fr');
    assert.ok(containerLow.querySelector('.yt-ai-gauge-circle.yt-ai-score-low'));
    assert.ok(containerLow.querySelector('.yt-ai-traj-down'));
  });

  it('handles null report or null container gracefully', () => {
    const controller = new ChannelAuditViewController();
    assert.doesNotThrow(() => controller.renderReport(null, document.createElement('div')));
    assert.doesNotThrow(() => controller.renderReport(new ChannelAuditReport(), null));
  });
});
