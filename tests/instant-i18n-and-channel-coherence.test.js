import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { I18N } from '../src/locales/index.js';
import { BannerTemplate } from '../src/content/templates/BannerTemplate.js';
import { BannerView } from '../src/content/ui/BannerView.js';
import { BannerEventHandler } from '../src/content/ui/BannerEventHandler.js';
import { SettingsDrawerController } from '../src/content/ui/SettingsDrawerController.js';
import { createInPageState } from '../src/content/services/InPageState.js';
import { SummaryViewController } from '../src/content/ui/SummaryViewController.js';
import { ChatViewController } from '../src/content/ui/ChatViewController.js';
import { AuditViewController } from '../src/content/ui/AuditViewController.js';
import { ChannelCompanionCard } from '../src/content/ui/ChannelCompanionCard.js';
import { ChannelAuditViewController } from '../src/content/ui/ChannelAuditViewController.js';
import { ChannelAuditReport } from '../src/domain/models/ChannelAuditReport.js';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';
import { ChannelAuditPromptBuilder } from '../src/services/implementations/ChannelAuditPromptBuilder.js';
import { ChannelAuditBatchRunner } from '../src/content/services/ChannelAuditBatchRunner.js';

function createNode(tagName = 'div') {
  const classes = new Set();
  const attrs = new Map();
  const listeners = new Map();
  let rawText = '';
  let selectValue = '';
  const node = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    children: [],
    parentNode: null,
    style: {},
    dataset: {},
    disabled: false,
    title: '',
    placeholder: '',
    classList: {
      add: (...list) => { list.forEach(c => c && classes.add(c)); node.className = Array.from(classes).join(' '); },
      remove: (...list) => { list.forEach(c => classes.delete(c)); node.className = Array.from(classes).join(' '); },
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        const on = force !== undefined ? Boolean(force) : !classes.has(c);
        if (on) classes.add(c); else classes.delete(c);
        node.className = Array.from(classes).join(' ');
        return on;
      }
    },
    hasAttribute: (n) => attrs.has(n),
    getAttribute: (n) => (n === 'id' ? node.id : attrs.get(n) ?? null),
    setAttribute: (n, v) => {
      attrs.set(n, String(v));
      if (n === 'id') node.id = String(v);
      if (n.startsWith('data-')) {
        const camel = n.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
        node.dataset[camel] = String(v);
      }
    },
    get value() {
      if (node.tagName === 'SELECT') {
        if (selectValue) return selectValue;
        const sel = node.children.find(c => c.getAttribute('selected') !== null) || node.children[0];
        return sel ? (sel.getAttribute('value') ?? sel.textContent) : '';
      }
      return selectValue;
    },
    set value(v) {
      selectValue = String(v);
      if (node.tagName === 'SELECT') {
        node.children.forEach((c) => {
          if (c.getAttribute('value') === selectValue) c.setAttribute('selected', '');
          else attrs.delete && attrs;
        });
      }
    },
    get options() {
      return node.children.filter(c => c.tagName === 'OPTION');
    },
    get textContent() {
      if (node.children.length === 0) return rawText;
      return node.children.map(c => c.textContent).join(' ') + (rawText ? ' ' + rawText : '');
    },
    set textContent(v) {
      node.children = [];
      rawText = String(v ?? '');
    },
    _appendText: (t) => { rawText += String(t ?? ''); },
    get innerText() { return node.textContent; },
    get outerHTML() {
      const cls = node.className ? ` class="${node.className}"` : '';
      const idAttr = node.id ? ` id="${node.id}"` : '';
      const tag = node.tagName.toLowerCase();
      return `<${tag}${idAttr}${cls}>${node.textContent}</${tag}>`;
    },
    set innerHTML(html) {
      node.children = [];
      rawText = '';
      const parsed = parseHtml(html);
      parsed.forEach(c => node.appendChild(c));
      if (parsed.length === 0 && typeof html === 'string' && !/<[a-z]/i.test(html)) {
        rawText = html;
      }
      if (node.tagName === 'SELECT') {
        const sel = node.children.find(c => c.getAttribute('selected') !== null) || node.children[0];
        selectValue = sel ? (sel.getAttribute('value') ?? '') : '';
      }
    },
    appendChild: (child) => {
      if (child.parentNode && child.parentNode !== node) {
        child.parentNode.children = child.parentNode.children.filter(c => c !== child);
      }
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    insertBefore: (child, ref) => {
      child.parentNode = node;
      const idx = node.children.indexOf(ref);
      if (idx >= 0) node.children.splice(idx, 0, child);
      else node.children.push(child);
      return child;
    },
    remove: () => {
      if (node.parentNode) {
        node.parentNode.children = node.parentNode.children.filter(c => c !== node);
        node.parentNode = null;
      }
    },
    addEventListener: (ev, cb) => {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(cb);
    },
    dispatchEvent: (evObj) => {
      const type = typeof evObj === 'string' ? evObj : evObj.type;
      const evt = typeof evObj === 'object' ? evObj : { type };
      if (!evt.target) evt.target = node;
      evt.currentTarget = node;
      let cur = node;
      while (cur) {
        const list = cur._listeners?.get(type) || [];
        for (const fn of list) fn(evt);
        cur = type === 'click' ? cur.parentNode : null;
      }
    },
    click: () => node.dispatchEvent({ type: 'click', target: node }),
    closest: (sel) => {
      let cur = node;
      while (cur) {
        if (matchesSimpleSelector(cur, sel)) return cur;
        cur = cur.parentNode;
      }
      return null;
    },
    querySelector: (sel) => queryAll(node, sel)[0] || null,
    querySelectorAll: (sel) => queryAll(node, sel),
    _listeners: listeners
  };
  return node;
}

function parseHtml(html) {
  const clean = String(html || '').replace(/<!--[\s\S]*?-->/g, '');
  const root = createNode('div');
  const stack = [root];
  const regex = /<(\/?[a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = regex.exec(clean)) !== null) {
    const [, tag, attrStr, txt] = m;
    if (txt) {
      if (txt.trim()) {
        stack[stack.length - 1]._appendText(txt);
      }
    } else if (tag.startsWith('/')) {
      if (stack.length > 1) stack.pop();
    } else {
      const selfClosing = attrStr.trim().endsWith('/') || ['input', 'br', 'hr', 'img', 'rect', 'path', 'polygon'].includes(tag.toLowerCase());
      const el = createNode(tag);
      const attrRegex = /([a-zA-Z0-9-:]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g;
      let am;
      while ((am = attrRegex.exec(attrStr)) !== null) {
        const name = am[1];
        const val = am[2] ?? am[3] ?? '';
        if (name === '/') continue;
        if (name === 'id') el.id = val;
        else if (name === 'class') val.split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
        else if (name === 'placeholder') el.placeholder = val;
        else if (name === 'title') el.title = val;
        else el.setAttribute(name, val);
      }
      stack[stack.length - 1].appendChild(el);
      if (!selfClosing) stack.push(el);
    }
  }
  return root.children;
}

function matchesSimpleSelector(node, sel) {
  const parts = String(sel || '').trim().match(/(?:#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+|\[[^\]]+\]|[a-zA-Z0-9_-]+)/g) || [];
  if (parts.length === 0) return false;
  for (const part of parts) {
    if (part.startsWith('#')) {
      if (node.id !== part.slice(1)) return false;
    } else if (part.startsWith('.')) {
      if (!node.classList.contains(part.slice(1))) return false;
    } else if (part.startsWith('[')) {
      const attrMatch = part.slice(1, -1).match(/^([a-zA-Z0-9_-]+)(?:=["']?([^"'\]]+)["']?)?$/);
      if (!attrMatch) return false;
      const val = node.getAttribute(attrMatch[1]);
      if (val === null) return false;
      if (attrMatch[2] !== undefined && val !== attrMatch[2]) return false;
    } else {
      if (node.tagName.toLowerCase() !== part.toLowerCase()) return false;
    }
  }
  return true;
}

function matchesChain(node, chainStr) {
  const tokens = chainStr.trim().replace(/\s*>\s*/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (!matchesSimpleSelector(node, tokens[tokens.length - 1])) return false;
  let cur = node.parentNode;
  for (let i = tokens.length - 2; i >= 0; i--) {
    while (cur && !matchesSimpleSelector(cur, tokens[i])) {
      cur = cur.parentNode;
    }
    if (!cur) return false;
    cur = cur.parentNode;
  }
  return true;
}

function queryAll(root, selector) {
  const chains = String(selector || '').split(',').map(s => s.trim()).filter(Boolean);
  const out = [];
  const walk = (n) => {
    for (const c of n.children || []) {
      if (chains.some(ch => matchesChain(c, ch))) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

function setupFakeDom({ path = '/watch?v=test123', host = 'www.youtube.com', title = 'Test Video - YouTube' } = {}) {
  const docBody = createNode('body');
  global.window = {
    location: { href: `https://${host}${path}`, pathname: path.split('?')[0], search: path.includes('?') ? `?${path.split('?')[1]}` : '', hostname: host },
    dispatchEvent: () => {},
    matchMedia: () => ({ matches: true }),
    speechSynthesis: { cancel: () => {} }
  };
  global.Event = class Event { constructor(t) { this.type = t; } };
  const docEl = createNode('html');
  global.document = {
    body: docBody,
    documentElement: docEl,
    title,
    fullscreenElement: null,
    createElement: (tag) => createNode(tag),
    getElementById: (id) => queryAll(docBody, `#${id}`)[0] || null,
    querySelector: (sel) => queryAll(docBody, sel)[0] || null,
    querySelectorAll: (sel) => queryAll(docBody, sel)
  };
  global.chrome = {
    runtime: {
      getManifest: () => ({ version: '1.5.1' }),
      sendMessage: (_, cb) => { if (typeof cb === 'function') cb({ success: false, models: [] }); }
    },
    storage: { local: { set: () => {}, get: (_, cb) => cb?.({}) } }
  };
  return docBody;
}

describe('Instant UI Language Switching, Channel Coherence & Prompt Language Integrity', () => {
  beforeEach(() => {
    setupFakeDom();
  });

  it('Watch #ytAiLangSelect switches all Watch UI chrome immediately while preserving generated AI summary and delegated chips', () => {
    const savedPrefs = {};
    const state = createInPageState();
    Object.assign(state, {
      currentLang: 'fr',
      currentMode: 'standard',
      currentProvider: 'lmstudio',
      availableModels: { lmstudio: ['test-model'] },
      channelAuditMaxVideos: 30,
      currentChannelTotalVideos: 450,
      extensionEnabled: true,
      getActiveModel: () => 'test-model',
      savePreference: (k, v) => { savedPrefs[k] = v; }
    });

    const banner = document.createElement('div');
    banner.id = 'yt-ai-summarizer-container';
    banner.innerHTML = BannerTemplate.render(I18N.fr, {
      currentLang: 'fr',
      currentMode: 'standard',
      maxVideos: 30,
      channelTotalVideos: 450,
      version: 'v1.5.1'
    });
    document.body.appendChild(banner);

    const bannerView = new BannerView(state);
    bannerView.setExpanded(true);
    const settingsDrawer = new SettingsDrawerController(state, { bannerView });
    const summaryController = new SummaryViewController({ transcriptController: {}, promptService: {}, audioController: {} });
    summaryController.fullSummaryMarkdown = 'Ceci est le résumé IA déjà généré en français.';
    const summaryBody = document.getElementById('ytAiSummaryBody');
    summaryBody.innerHTML = '<p>Ceci est le résumé IA déjà généré en français.</p>';

    const chatCalls = [];
    const chatController = new ChatViewController({ transcriptController: {}, promptService: {}, audioController: {}, summaryViewController: summaryController });
    chatController.handleSendChatMessage = (q) => { chatCalls.push(q); };

    const auditViewController = new AuditViewController({
      auditService: { isAuditing: false },
      chatViewController: chatController,
      bannerView
    });

    const populatedVoices = [];
    BannerEventHandler.bind(banner, {
      state,
      bannerView,
      settingsDrawer,
      summaryViewController: summaryController,
      chatViewController: chatController,
      auditViewController,
      audioController: { init: () => {}, populateVoiceDropdown: (l) => populatedVoices.push(l) },
      transcriptController: { cachedTranscript: {} },
      triggerSummarize: () => {},
      triggerAudit: () => {},
      triggerChannelAudit: () => {}
    });

    const langSelect = document.getElementById('ytAiLangSelect');
    langSelect.value = 'en';
    langSelect.dispatchEvent({ type: 'change', target: langSelect });

    // Preferences and state updated immediately
    assert.equal(state.currentLang, 'en');
    assert.equal(savedPrefs.targetLang, 'en');
    assert.deepEqual(populatedVoices, ['en']);

    // Header & tabs switched to English
    assert.ok(document.getElementById('ytAiSummarizeBtn').textContent.includes('Summarize'));
    assert.equal(document.getElementById('ytAiToggleBtn').title.trim(), I18N.en.collapse);
    assert.equal(document.getElementById('ytAiCloseExtensionBtn').title.trim(), I18N.en.closeExtensionBtn);
    assert.equal(document.getElementById('ytAiSettingsBtnText').textContent.trim(), I18N.en.settingsBtn);
    assert.ok(document.getElementById('ytAiTabChannelAuditBtn').textContent.includes('Channel Audit'));

    // Watch Channel Audit pane translated cleanly (period, max limit, placeholder)
    assert.equal(document.getElementById('ytAiWatchChannelTitle').textContent.trim(), I18N.en.channelAuditTitle);
    assert.equal(document.getElementById('ytAiRunWatchChannelAuditBtn').textContent.trim(), I18N.en.runChannelAuditBtn);
    assert.equal(document.querySelector('#ytAiPaneChannelAudit .yt-ai-period-label').textContent.trim(), I18N.en.periodFilterLabel);
    assert.ok(document.querySelector('#ytAiPaneChannelAudit .yt-ai-period-pill[data-period="all"]').textContent.includes(I18N.en.periodAll));
    assert.equal(document.querySelector('#ytAiPaneChannelAudit .yt-ai-max-label').textContent.trim(), I18N.en.maxVideosLabel);
    const maxOptsText = document.getElementById('ytAiWatchChannelMaxVideos').options.map(o => o.textContent).join(' | ');
    assert.ok(maxOptsText.includes('All (450)'));
    assert.ok(maxOptsText.includes('30 videos (default)'));

    // Transcript header & footer links localized
    assert.equal(document.getElementById('ytAiTranscriptHeaderTitle').textContent.trim(), I18N.en.transcriptTitle);
    assert.equal(document.getElementById('ytAiTranscriptWordsLabel').textContent.trim(), I18N.en.wordsBadge);
    assert.equal(document.getElementById('ytAiFooterBy').textContent.trim(), I18N.en.footerBy);
    assert.ok(document.getElementById('ytAiFooterBugLink').textContent.includes(I18N.en.footerReportBug));

    // Settings drawer labels, optgroups & speed/voice controls switched to English
    assert.equal(document.getElementById('ytAiVoiceLabel').textContent.trim(), I18N.en.voiceLabel);
    assert.equal(document.getElementById('ytAiMicLabel').textContent.trim(), I18N.en.micLabel);
    assert.equal(document.getElementById('ytAiOptGroupLocal').getAttribute('label'), I18N.en.groupLocal);
    assert.ok(document.getElementById('ytAiPasteApiKeyBtn').textContent.includes(I18N.en.pasteBtn));
    assert.equal(document.getElementById('ytAiGetApiKeyLink').textContent.trim(), I18N.en.getApiKeyLink);
    assert.equal(document.querySelector('#ytAiTtsSpeedSelect option[value="0.75"]').textContent.trim(), I18N.en.speedSlow);

    // Switching back to French must translate #ytAiVoiceLabel to French ("Voix :") without falling back to "Voice:"
    langSelect.value = 'fr';
    langSelect.dispatchEvent({ type: 'change', target: langSelect });
    assert.equal(document.getElementById('ytAiVoiceLabel').textContent.trim(), I18N.fr.voiceLabel);
    assert.equal(document.getElementById('ytAiFooterBy').textContent.trim(), I18N.fr.footerBy);
    assert.equal(document.getElementById('ytAiOptGroupLocal').getAttribute('label'), I18N.fr.groupLocal);
    langSelect.value = 'en';
    langSelect.dispatchEvent({ type: 'change', target: langSelect });

    // AI-generated summary content remained completely intact
    assert.ok(summaryBody.textContent.includes('Ceci est le résumé IA déjà généré en français.'));

    // Re-rendered suggestion chip remains clickable via delegated handler
    const enChip = document.querySelector('#ytAiPaneChat .yt-ai-suggestion-chip');
    assert.ok(enChip);
    enChip.click();
    assert.equal(chatCalls.length, 1);
    assert.equal(chatCalls[0], I18N.en.suggestions[0].question);
  });

  it('Channel Companion matches Watch header/footer design and switches all UI chrome in-place without losing tab, collapse state, chat history, or AI audit bullets', () => {
    setupFakeDom({ path: '/@hugolisoiryoutube', title: 'Hugo Lisoir - YouTube' });
    const anchor = document.createElement('div');
    anchor.id = 'page-header-container';
    const bannerInner = document.createElement('div');
    bannerInner.id = 'page-header-banner';
    anchor.appendChild(bannerInner);
    document.body.appendChild(anchor);

    const savedPrefs = {};
    const state = {
      extensionEnabled: true,
      currentLang: 'fr',
      channelAuditMaxVideos: 30,
      savePreference: (k, v) => { savedPrefs[k] = v; }
    };

    const viewCtrl = new ChannelAuditViewController();
    const card = new ChannelCompanionCard({
      channelAuditService: { isAuditRunning: () => false, ensureHydrated: async () => {} },
      channelAuditViewController: viewCtrl,
      audioController: { populateVoiceDropdown: () => {} },
      state
    });

    card.tryInjectCompanion();
    const companion = document.getElementById('yt-ai-channel-companion');
    assert.ok(companion);

    // Unified single-row header coherence check (mirrors Watch & Web top shell)
    assert.ok(companion.querySelector('.yt-ai-header-left .yt-ai-brand-logo-svg'));
    assert.equal(companion.querySelector('#ytAiCompBrandTitle').textContent.trim(), 'ClarifAI');
    assert.ok(companion.querySelector('.yt-ai-header-left .yt-ai-card-handle').textContent.includes('@hugolisoiryoutube'));
    assert.ok(companion.querySelector('.yt-ai-header-center .yt-ai-header-tabs #ytAiChanTabAuditBtn'));
    assert.ok(companion.querySelector('.yt-ai-header-center .yt-ai-header-tabs #ytAiChanTabChatBtn'));
    assert.ok(companion.querySelector('#ytAiSettingsDrawer #ytAiLangSelect'));
    assert.ok(companion.querySelector('#ytAiChanPaneAudit #ytAiChannelAuditModeSelect'));
    assert.ok(companion.querySelector('#ytAiChanPaneAudit #ytAiRunChannelAuditBtn'));
    assert.ok(companion.querySelector('.yt-ai-header-right #ytAiCompanionSettingsBtn #ytAiCompSettingsBtnText'));
    assert.ok(companion.querySelector('.yt-ai-header-right #ytAiCompanionToggleBtn #ytAiCompToggleText'));
    assert.ok(companion.querySelector('.yt-ai-footer-info #ytAiCompFooterAuthor').textContent.includes('@Hidr4c'));

    // Starts collapsed cleanly at top bar height, expands on click
    assert.equal(card.isExpanded, false);
    document.getElementById('ytAiCompanionToggleBtn').click();
    assert.equal(card.isExpanded, true);

    // Simulate rendered audit report + active chat history + switched tab
    const report = new ChannelAuditReport({
      channelTitle: 'Hugo Lisoir',
      channelHandle: '@hugolisoiryoutube',
      globalScore: 86,
      clickbaitIndex: 9,
      strengths: ['Vulgarisation spatiale documentée'],
      weaknesses: ['Quelques titres dramatiques'],
      drawbacks: ['Aucun écueil majeur'],
      executiveSummary: 'Synthèse IA générée en français.',
      evaluatedVideos: [{ title: 'Fusée Ariane 6', score: 88, clickbait: 8, comment: 'Solide analyse technique' }]
    });
    const resultBox = document.getElementById('ytAiChannelResultContainer');
    resultBox.classList.remove('yt-ai-hidden');
    viewCtrl.renderReport(report, resultBox, 'fr');

    card.switchTab('channelChat');
    card.channelChat.chatHistory.push({ role: 'user', text: 'Question test' }, { role: 'assistant', text: 'Réponse IA existante' });
    const msgBox = document.getElementById('ytAiChannelChatMessages');
    msgBox.innerHTML = '<div class="yt-ai-chat-bubble ai">Réponse IA existante</div>';

    // Switch #ytAiLangSelect -> 'en' inside Settings Drawer
    const compLang = document.getElementById('ytAiLangSelect');
    compLang.value = 'en';
    compLang.dispatchEvent({ type: 'change', target: compLang });

    assert.equal(state.currentLang, 'en');
    assert.equal(savedPrefs.targetLang, 'en');
    // UI chrome & report headings switched to English
    assert.equal(document.getElementById('ytAiRunChannelAuditBtn').textContent.trim(), I18N.en.runChannelAuditBtn);
    assert.equal(document.getElementById('ytAiCompSettingsBtnText').textContent.trim(), I18N.en.settingsBtn);
    assert.equal(document.getElementById('ytAiCompToggleText').textContent.trim(), I18N.en.collapse);
    assert.equal(document.getElementById('ytAiChanTabAuditBtn').textContent.trim(), I18N.en.tabChannelAudit);
    assert.equal(companion.querySelector('.yt-ai-period-label').textContent.trim(), I18N.en.periodFilterLabel);
    assert.equal(companion.querySelector('.yt-ai-max-label').textContent.trim(), I18N.en.maxVideosLabel);
    assert.equal(document.getElementById('ytAiCompFooterBy').textContent.trim(), I18N.en.footerBy);
    assert.ok(document.getElementById('ytAiChannelSendChatBtn').textContent.includes('Send'));

    // Report section headers translated while AI bullet text stayed verbatim
    assert.ok(resultBox.querySelector('.yt-ai-pillar-good .yt-ai-pillar-title').textContent.includes('Strengths'));
    assert.ok(resultBox.textContent.includes('Vulgarisation spatiale documentée'));
    assert.ok(resultBox.textContent.includes('Synthèse IA générée en français.'));

    // Active tab and conversation history preserved in-place
    assert.equal(card.activeTab, 'channelChat');
    assert.ok(document.getElementById('ytAiChanPaneChat').classList.contains('active'));
    assert.ok(document.getElementById('ytAiChannelChatMessages').textContent.includes('Réponse IA existante'));
  });

  it('renders ChannelAuditViewController UI headings in requested non-French locale without French chrome bleed', () => {
    const controller = new ChannelAuditViewController();
    const container = document.createElement('div');
    const report = new ChannelAuditReport({
      channelTitle: 'NASA',
      channelHandle: '@nasa',
      globalScore: 93,
      clickbaitIndex: 3,
      strengths: ['Peer-reviewed mission updates'],
      evaluatedVideos: [{ title: 'Artemis Briefing', score: 94, clickbait: 2, comment: 'Clear official telemetry' }]
    });

    controller.renderReport(report, container, 'es');
    const txt = container.textContent;
    assert.ok(txt.includes(I18N.es.channelEvolutionTitle.replace('📈 ', '')));
    assert.ok(txt.includes('Fortalezas'));
    assert.ok(txt.includes(I18N.es.channelSensationalismLabel));
    assert.equal(txt.includes('Indice de Sensationnalisme'), false);
    assert.equal(txt.includes('Écueils & Pièges'), false);
  });

  it('builds Video, Channel & Map-Reduce Audit prompts strictly in target non-FR language without French bleed', () => {
    const sysEs = AuditPromptBuilder.buildSystemPrompt('es');
    const usrEs = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: 'Texto de prueba',
      videoMeta: { title: 'Video ES', author: 'Canal ES' },
      lang: 'es',
      isDialogue: true
    });
    assert.ok(sysEs.includes('ESPAÑOL'));
    assert.equal(sysEs.includes('Tu es un expert'), false);
    assert.equal(sysEs.includes('Mission : Analyser'), false);
    assert.ok(usrEs.includes('ESPAÑOL'));
    assert.equal(usrEs.includes('TRANSCRIPTION DES DIALOGUES'), false);

    const chanSysDe = ChannelAuditPromptBuilder.buildSystemPrompt('de');
    const chanUsrDe = ChannelAuditPromptBuilder.buildUserPrompt({ title: 'Tech DE', handle: '@techde' }, [{ id: 'v1', title: 'Test DE', chapters: ['Intro'] }], 'de');
    assert.ok(chanSysDe.includes('DEUTSCH'));
    assert.ok(chanUsrDe.includes('DEUTSCH'));
    assert.equal(chanUsrDe.includes('Aucune bio renseignée'), false);
    assert.equal(chanUsrDe.includes('Chapitres :'), false);

    const mapEn = ChannelAuditBatchRunner._buildMapPrompt({ title: 'Science' }, [{ id: 'v1', title: 'T1' }], 1, 2, 'en');
    const redEn = ChannelAuditBatchRunner._buildReducePrompt({ title: 'Science' }, 10, [{ index: 1, score: 84, clickbait: 7, raw: '1 | 84 | 7 | Reliable | Good' }], 'en');
    assert.ok(mapEn.includes('ENGLISH'));
    assert.ok(redEn.includes('ENGLISH'));
    assert.ok(redEn.includes('[SCORE_GLOBAL: 84/100]'));
  });
});
