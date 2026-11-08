import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';

const artifactDir = 'C:\\Users\\rb\\.gemini\\antigravity\\brain\\600c919d-5748-41fa-9720-cf638c539b6b';
const extPath = 'E:\\Dev\\Projets\\YouTube_AI_Summarizer';
const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-store-gen-'));

(async () => {
  console.log('=== Generating Chrome Web Store 1280x800 Marketing Assets ===');

  const browser = await puppeteer.launch({
    executablePath: bravePath,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--user-data-dir=${tmpDir}`,
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--window-size=1280,800'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    const workerTarget = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().includes('chrome-extension://'),
      { timeout: 8000 }
    );
    const extId = new URL(workerTarget.url()).hostname;

    // Config LM Studio
    const configPage = await browser.newPage();
    await configPage.goto(`chrome-extension://${extId}/dist/popup.html`);
    await configPage.evaluate(async () => {
      await new Promise(r => chrome.storage.local.set({
        aiProvider: 'lmstudio',
        serverUrl_lmstudio: 'http://127.0.0.1:1234',
        selectedModel_lmstudio: 'qwen3.5-4b',
        selectedModel: 'qwen3.5-4b',
        targetLang: 'fr',
        extensionEnabled: true,
        maxTokens: '4096'
      }, r));
    });
    await configPage.close();

    // Navigate to Monsieur Phi video
    console.log('[Store Assets] Navigating to YouTube video...');
    await page.goto('https://www.youtube.com/watch?v=Nr-AYhVNUmI', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Handle consent
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText && (btn.innerText.includes('Tout refuser') || btn.innerText.includes('Tout accepter')));
      b?.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Wait for banner & expand
    await page.waitForSelector('#yt-ai-summarizer-container', { timeout: 15000 });
    await page.evaluate(() => {
      const banner = document.getElementById('yt-ai-summarizer-container');
      if (banner?.classList.contains('is-collapsed')) {
        document.getElementById('ytAiToggleBtn')?.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Helper inside page for TrustedTypes safe innerHTML
    await page.evaluate(() => {
      window.__setSafeHtml = function(el, html) {
        if (!el) return;
        try {
          if (window.trustedTypes && window.trustedTypes.defaultPolicy) {
            el.innerHTML = window.trustedTypes.defaultPolicy.createHTML(html);
            return;
          }
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          el.replaceChildren(...doc.body.childNodes);
        } catch (_) {
          el.textContent = html.replace(/<[^>]+>/g, '');
        }
      };
    });

    // SLIDE 1: Hero Overview (Summary tab active)
    console.log('[Store Assets] Capturing Slide 1 (Overview / Hero)...');
    await page.evaluate(() => {
      document.getElementById('ytAiTabSummaryBtn')?.click();
      const body = document.getElementById('ytAiSummaryBody');
      window.__setSafeHtml(body, `
        <h3>🎯 Synthèse Stratégique & Idées Clés</h3>
        <ul class="yt-ai-points-list">
          <li class="yt-ai-point-item"><strong>Le Sophisme Paresseux :</strong> Argument fataliste antique prétendant que si l'avenir est écrit, l'action humaine est inutile.</li>
          <li class="yt-ai-point-item"><strong>La Réponse de Leibniz :</strong> Dans sa <em>Théodicée</em>, Leibniz démontre que le destin inclut les causes intermédiaires et nos choix délibérés.</li>
          <li class="yt-ai-point-item"><strong>Application Contemporaine :</strong> Analogie frappante avec les défis écologiques et sanitaires modernes où l'inaction est un piège cognitif.</li>
        </ul>
      `);
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide1Path = path.join(artifactDir, 'store_slide_1_hero_1280x800.png');
    await page.screenshot({ path: slide1Path });
    console.log('Saved:', slide1Path);

    // SLIDE 2: Audit & Veracity (With the new Hero Score Card)
    console.log('[Store Assets] Capturing Slide 2 (Audit & Véracité with Hero Gauge)...');
    await page.evaluate(() => {
      document.getElementById('ytAiTabAuditBtn')?.click();
      const body = document.getElementById('ytAiAuditBody');
      const tabBtn = document.getElementById('ytAiTabAuditBtn');
      if (tabBtn) {
        window.__setSafeHtml(tabBtn, `🛡️ Audit & Fact-Check <span class="yt-ai-tab-count-badge yt-ai-badge-success">95/100</span>`);
      }
      window.__setSafeHtml(body, `
        <div class="yt-ai-audit-hero-card yt-ai-score-high">
          <div class="yt-ai-audit-hero-main">
            <div class="yt-ai-audit-gauge-circle">
              <span class="yt-ai-audit-gauge-val">95</span>
              <span class="yt-ai-audit-gauge-max">/100</span>
            </div>
            <div class="yt-ai-audit-hero-meta">
              <div class="yt-ai-audit-status-badge">Solidité Élevée</div>
              <div class="yt-ai-audit-hero-desc">Rigueur et cohérence logique élevées • Aucun sophisme manipulatoire</div>
            </div>
          </div>
          <div class="yt-ai-audit-meter">
            <div class="yt-ai-audit-meter-fill" style="width: 95%;"></div>
          </div>
        </div>
        <div class="yt-ai-audit-body-content">
          <h3>⚖️ Analyse Logique & Détection de Sophismes</h3>
          <ul class="yt-ai-points-list">
            <li class="yt-ai-point-item"><strong>Structure Réfutative Valide :</strong> Distinction irréprochable entre nécessité logique et responsabilité causale de l'agent.</li>
            <li class="yt-ai-point-item"><strong>Absence de Biais ou Manipulation :</strong> Démarche pédagogique étayée par des analogies rigoureuses (Leibniz, Théodicée).</li>
          </ul>
          <h3>🔍 Recoupement Factuel & Temporel</h3>
          <ul class="yt-ai-points-list">
            <li class="yt-ai-point-item"><strong>Cohérence Historique :</strong> Les références au décret du 17 mars 2020 et aux prévisions sanitaires concordent exactement.</li>
          </ul>
        </div>
      `);
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide2Path = path.join(artifactDir, 'store_slide_2_audit_1280x800.png');
    await page.screenshot({ path: slide2Path });
    console.log('Saved:', slide2Path);

    // SLIDE 3: Interactive Q&A Chat
    console.log('[Store Assets] Capturing Slide 3 (Interactive Chat & Voice)...');
    await page.evaluate(() => {
      document.getElementById('ytAiTabChatBtn')?.click();
      const messagesContainer = document.getElementById('ytAiChatMessages');
      window.__setSafeHtml(messagesContainer, `
        <div class="yt-ai-chat-bubble yt-ai-chat-user">
          <div class="yt-ai-bubble-sender">Vous</div>
          <div class="yt-ai-bubble-body">Peux-tu m'expliquer pourquoi Leibniz réfute l'inaction face au destin ?</div>
        </div>
        <div class="yt-ai-chat-bubble yt-ai-chat-ai">
          <div class="yt-ai-bubble-sender">Assistant IA</div>
          <div class="yt-ai-bubble-body">
            <p>Selon Leibniz dans la <em>Théodicée</em>, le destin ne décide pas d'une fin sans ses moyens intermédiaires :</p>
            <ul class="yt-ai-points-list">
              <li class="yt-ai-point-item">Si vous êtes destiné à guérir d'une maladie, vous êtes également destiné à appeler le médecin et à prendre le remède.</li>
              <li class="yt-ai-point-item">L'action humaine fait partie intégrante du tissu causal prédéterminé.</li>
            </ul>
          </div>
        </div>
      `);
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide3Path = path.join(artifactDir, 'store_slide_3_chat_1280x800.png');
    await page.screenshot({ path: slide3Path });
    console.log('Saved:', slide3Path);

    // SLIDE 4: Settings Drawer (100% Local & Multi-Provider)
    console.log('[Store Assets] Capturing Slide 4 (Settings / LM Studio & Ollama)...');
    await page.evaluate(() => {
      document.getElementById('ytAiSettingsToggleBtn')?.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide4Path = path.join(artifactDir, 'store_slide_4_local_privacy_1280x800.png');
    await page.screenshot({ path: slide4Path });
    console.log('Saved:', slide4Path);

    // SLIDE 5: Popup Toolbar Window (Cache Manager & Provider Selection)
    console.log('[Store Assets] Capturing Slide 5 (Popup UI & Cache Control)...');
    const popupPage = await browser.newPage();
    await popupPage.setViewport({ width: 380, height: 620 });
    await popupPage.goto(`chrome-extension://${extId}/dist/popup.html`);
    await new Promise(r => setTimeout(r, 1000));
    const slide5Path = path.join(artifactDir, 'store_slide_5_popup_cache.png');
    await popupPage.screenshot({ path: slide5Path });
    await popupPage.close();
    console.log('Saved:', slide5Path);

    console.log('[Store Assets] All 5 Chrome Web Store slides generated successfully!');

  } catch (err) {
    console.error('Error generating store assets:', err);
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})();
