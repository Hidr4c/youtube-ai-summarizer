import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';

const artifactDir = 'C:\\Users\\rb\\.gemini\\antigravity\\brain\\600c919d-5748-41fa-9720-cf638c539b6b';
const extPath = 'E:\\Dev\\Projets\\YouTube_AI_Summarizer';
const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const storeAssetsDir = path.join(extPath, 'store-assets', 'v1.5.0');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-store-gen-en-'));

(async () => {
  console.log('=== Generating Chrome Web Store 1280x800 Marketing Assets (ENGLISH) ===');

  if (!fs.existsSync(storeAssetsDir)) {
    fs.mkdirSync(storeAssetsDir, { recursive: true });
  }

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

    // Configure extension with English locale & LM Studio
    const configPage = await browser.newPage();
    await configPage.goto(`chrome-extension://${extId}/dist/popup.html`);
    await configPage.evaluate(async () => {
      await new Promise(r => chrome.storage.local.set({
        aiProvider: 'lmstudio',
        serverUrl_lmstudio: 'http://127.0.0.1:1234',
        selectedModel_lmstudio: 'qwen2.5-7b-instruct',
        selectedModel: 'qwen2.5-7b-instruct',
        targetLang: 'en',
        extensionEnabled: true,
        maxTokens: '4096'
      }, r));
    });
    await configPage.close();

    // Navigate to a premier English tech video (Veritasium)
    console.log('[Store Assets] Navigating to English YouTube video...');
    await page.goto('https://www.youtube.com/watch?v=bBC-nXj3Ng4', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Handle cookie consent dialog if present
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText && (
        btn.innerText.includes('Reject all') ||
        btn.innerText.includes('Accept all') ||
        btn.innerText.includes('Tout refuser') ||
        btn.innerText.includes('Tout accepter')
      ));
      b?.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Ensure extension banner is expanded
    await page.waitForSelector('#yt-ai-summarizer-container', { timeout: 15000 });
    await page.evaluate(() => {
      const banner = document.getElementById('yt-ai-summarizer-container');
      if (banner?.classList.contains('is-collapsed')) {
        document.getElementById('ytAiToggleBtn')?.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Safe HTML helper
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

    // -------------------------------------------------------------
    // SLIDE 1: Instant Smart Summary (English)
    // -------------------------------------------------------------
    console.log('[Store Assets] Capturing Slide 1: Instant AI Summary...');
    await page.evaluate(() => {
      document.getElementById('ytAiTabSummaryBtn')?.click();
      const body = document.getElementById('ytAiSummaryBody');
      window.__setSafeHtml(body, `
        <h3>🎯 Executive Summary & Core Insights</h3>
        <ul class="yt-ai-points-list">
          <li class="yt-ai-point-item"><strong>The Fundamental Dilemma [01:15] :</strong> Explores the counter-intuitive physics principle where common assumptions break down under rigorous empirical testing.</li>
          <li class="yt-ai-point-item"><strong>Experimental Demonstration [04:30] :</strong> Utilizes custom high-precision wind tunnel instruments to measure drag coefficients and verify theoretical aerodynamic limits.</li>
          <li class="yt-ai-point-item"><strong>Real-World Implications [09:12] :</strong> Highlights critical applications across aerospace engineering, renewable turbine efficiency, and computational fluid dynamics.</li>
        </ul>
      `);
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide1File = 'store_slide_1_hero_1280x800.png';
    await page.screenshot({ path: path.join(storeAssetsDir, slide1File) });
    await page.screenshot({ path: path.join(artifactDir, slide1File) });
    console.log('  -> Saved Slide 1 (English Hero Summary)');

    // -------------------------------------------------------------
    // SLIDE 2: Critical Logic & Fact-Checking Audit (English)
    // -------------------------------------------------------------
    console.log('[Store Assets] Capturing Slide 2: Credibility & Logic Audit...');
    await page.evaluate(() => {
      document.getElementById('ytAiTabAuditBtn')?.click();
      const tabBtn = document.getElementById('ytAiTabAuditBtn');
      if (tabBtn) {
        window.__setSafeHtml(tabBtn, `🛡️ Fact-Check & Audit <span class="yt-ai-tab-count-badge yt-ai-badge-success">95/100</span>`);
      }
      const body = document.getElementById('ytAiAuditBody');
      window.__setSafeHtml(body, `
        <div class="yt-ai-audit-hero-card yt-ai-score-high">
          <div class="yt-ai-audit-hero-main">
            <div class="yt-ai-audit-gauge-circle">
              <span class="yt-ai-audit-gauge-val">95</span>
              <span class="yt-ai-audit-gauge-max">/100</span>
            </div>
            <div class="yt-ai-audit-hero-meta">
              <div class="yt-ai-audit-status-badge">High Credibility</div>
              <div class="yt-ai-audit-hero-desc">Exceptional scientific rigor • No manipulative fallacies • Clear source methodology</div>
            </div>
          </div>
          <div class="yt-ai-audit-meter">
            <div class="yt-ai-audit-meter-fill" style="width: 95%;"></div>
          </div>
        </div>
        <div class="yt-ai-audit-body-content">
          <h3>⚖️ Logical Structure & Fallacy Verification</h3>
          <ul class="yt-ai-points-list">
            <li class="yt-ai-point-item"><strong>Valid Deductive Flow :</strong> Sharp demarcation between empirical observations and theoretical hypotheses.</li>
            <li class="yt-ai-point-item"><strong>Absence of Cognitive Traps :</strong> Free from hasty causalities, strawman arguments, or cherry-picked edge cases.</li>
          </ul>
          <h3>🔍 Source Level & Empirical Verification</h3>
          <ul class="yt-ai-points-list">
            <li class="yt-ai-point-item"><strong>Peer-Reviewed Consensus :</strong> Directly cross-references published wind-tunnel benchmarks and standard Navier-Stokes equations.</li>
          </ul>
        </div>
      `);
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide2File = 'store_slide_2_audit_1280x800.png';
    await page.screenshot({ path: path.join(storeAssetsDir, slide2File) });
    await page.screenshot({ path: path.join(artifactDir, slide2File) });
    console.log('  -> Saved Slide 2 (English Fact-Checking Audit)');

    // -------------------------------------------------------------
    // SLIDE 3: Interactive Transcript Q&A Chat (English)
    // -------------------------------------------------------------
    console.log('[Store Assets] Capturing Slide 3: Interactive Video Q&A Chat...');
    await page.evaluate(() => {
      document.getElementById('ytAiTabChatBtn')?.click();
      const messagesContainer = document.getElementById('ytAiChatMessages');
      window.__setSafeHtml(messagesContainer, `
        <div class="yt-ai-chat-bubble yt-ai-chat-user">
          <div class="yt-ai-bubble-sender">You</div>
          <div class="yt-ai-bubble-body">Can you explain why the vehicle moves faster than the wind propelling it?</div>
        </div>
        <div class="yt-ai-chat-bubble yt-ai-chat-ai">
          <div class="yt-ai-bubble-sender">AI Assistant</div>
          <div class="yt-ai-bubble-body">
            <p>At [04:30], the mechanical gearing creates a continuous leverage loop:</p>
            <ul class="yt-ai-points-list">
              <li class="yt-ai-point-item">The wheels drive the propeller backward through a direct gearing system, pushing against the air like a boat propeller against water.</li>
              <li class="yt-ai-point-item">This thrust exceeds the retarding force on the wheels, enabling continuous acceleration downwind faster than wind speed.</li>
            </ul>
          </div>
        </div>
      `);
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide3File = 'store_slide_3_chat_1280x800.png';
    await page.screenshot({ path: path.join(storeAssetsDir, slide3File) });
    await page.screenshot({ path: path.join(artifactDir, slide3File) });
    console.log('  -> Saved Slide 3 (English Q&A Chat)');

    // -------------------------------------------------------------
    // SLIDE 4: Global Channel Audit & Companion Card (English 1280x800)
    // -------------------------------------------------------------
    console.log('[Store Assets] Capturing Slide 4: Global Channel Companion Card (1280x800)...');
    await page.goto('https://www.youtube.com/@veritasium', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Handle cookie consent dialog if present on channel page
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText && (
        btn.innerText.includes('Reject all') ||
        btn.innerText.includes('Accept all') ||
        btn.innerText.includes('Tout refuser') ||
        btn.innerText.includes('Tout accepter')
      ));
      b?.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    await page.evaluate(() => {
      const setSafeHtml = (el, html) => {
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

      let companion = document.getElementById('yt-ai-channel-companion');
      if (!companion) {
        companion = document.createElement('div');
        companion.id = 'yt-ai-channel-companion';
        companion.className = 'yt-ai-channel-card';
        const target = document.querySelector('ytd-browse[page-subtype="channels"] #content, ytd-browse #content, ytd-tabbed-page-header') ||
          document.querySelector('ytd-browse') ||
          document.getElementById('content') || document.body;
        target.prepend(companion);
      }
      companion.style.display = 'block';
      companion.style.margin = '20px auto';
      companion.style.maxWidth = '1120px';
      companion.style.zIndex = '9999';
      companion.style.position = 'relative';

      setSafeHtml(companion, `
        <div class="yt-ai-card-inner" style="background: rgba(18, 18, 24, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div class="yt-ai-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="yt-ai-card-brand" style="display: flex; align-items: center; gap: 8px;">
              <span class="yt-ai-brand-badge" style="background: #3b82f6; color: #fff; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">AI</span>
              <span class="yt-ai-card-title" style="font-size: 15px; font-weight: 700; color: #fff;">Global Channel Audit & Editorial Rigor</span>
              <span class="yt-ai-card-handle" style="font-size: 13px; color: #9ca3af;">@veritasium</span>
            </div>
            <div class="yt-ai-card-controls">
              <span class="yt-ai-tab-count-badge yt-ai-badge-success" style="background: #10b981; color: #fff; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">Score: 94/100</span>
            </div>
          </div>
          <div id="ytAiCompanionBody" class="yt-ai-card-body">
            <div class="yt-ai-audit-hero-card yt-ai-score-high" style="display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px 18px;">
              <div class="yt-ai-audit-hero-main" style="display: flex; align-items: center; gap: 16px;">
                <div class="yt-ai-audit-gauge-circle" style="font-size: 28px; font-weight: 800; color: #10b981;">
                  <span class="yt-ai-audit-gauge-val">94</span><span class="yt-ai-audit-gauge-max" style="font-size: 16px; color: #9ca3af;">/100</span>
                </div>
                <div class="yt-ai-audit-hero-meta">
                  <div class="yt-ai-status-badge" style="font-weight: 700; color: #10b981; font-size: 14px;">High Scientific Rigor</div>
                  <div class="yt-ai-hero-desc" style="font-size: 12px; color: #d1d5db; margin-top: 2px;">Stratified sample of 30 videos (65% recent, 35% legacy) • Strong empirical proof & source citations</div>
                </div>
              </div>
            </div>
            <div class="yt-ai-period-selector" style="display: flex; gap: 8px; margin: 14px 0 10px 0; align-items: center;">
              <span style="font-size: 11px; color: #9ca3af;">Sample Period:</span>
              <button class="yt-ai-period-pill active" style="padding: 4px 10px; border-radius: 12px; background: #3b82f6; color: #fff; font-size: 11px; border: none; font-weight: 600;">All Time (30 Videos)</button>
              <button class="yt-ai-period-pill" style="padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,0.08); color: #ccc; font-size: 11px; border: none;">Past 12 Months</button>
              <button class="yt-ai-period-pill" style="padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,0.08); color: #ccc; font-size: 11px; border: none;">6 Months</button>
              <button class="yt-ai-period-pill" style="padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,0.08); color: #ccc; font-size: 11px; border: none;">30 Days</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px;">
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Clickbait Index</div>
                <div style="font-size: 18px; font-weight: 700; color: #34d399; margin: 4px 0;">12% (Minimal)</div>
                <div style="font-size: 11px; color: #9ca3af;">Titles match video conclusions accurately without misleading hooks.</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Sponsor Transparency</div>
                <div style="font-size: 18px; font-weight: 700; color: #34d399; margin: 4px 0;">100% Disclosed</div>
                <div style="font-size: 11px; color: #9ca3af;">Upfront commercial disclosures separated clearly from scientific logic.</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Editorial Trajectory</div>
                <div style="font-size: 18px; font-weight: 700; color: #60a5fa; margin: 4px 0;">Consistent High Quality</div>
                <div style="font-size: 11px; color: #9ca3af;">Continuous focus on empirical physics, wind tunnel tests, and peer interviews.</div>
              </div>
            </div>
          </div>
        </div>
      `);
      companion.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));
    const slide4File = 'store_slide_4_local_privacy_1280x800.png';
    const slide4ChannelFile = 'store_slide_4_channel_audit_1280x800.png';
    await page.screenshot({ path: path.join(storeAssetsDir, slide4File) });
    await page.screenshot({ path: path.join(artifactDir, slide4File) });
    await page.screenshot({ path: path.join(storeAssetsDir, slide4ChannelFile) });
    await page.screenshot({ path: path.join(artifactDir, slide4ChannelFile) });
    console.log('  -> Saved Slide 4 (Channel Companion Card 1280x800)');

    // -------------------------------------------------------------
    // SLIDE 5: Studio Showcase - Settings, Local Privacy & Cache (English 1280x800)
    // -------------------------------------------------------------
    console.log('[Store Assets] Capturing Slide 5: Studio Showcase (1280x800)...');
    const studioPage = await browser.newPage();
    await studioPage.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await studioPage.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>YouTube Summarizer AI - Local Privacy & Settings</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1280px;
            height: 800px;
            overflow: hidden;
            background: radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 60%, #020617 100%);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
          }
          .title-area {
            text-align: center;
            margin-bottom: 28px;
          }
          .badge {
            display: inline-block;
            background: #2563eb;
            color: #fff;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 8px;
          }
          h1 {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
            background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          p.subtitle {
            font-size: 15px;
            color: #94a3b8;
          }
          .showcase-grid {
            display: grid;
            grid-template-columns: 340px 380px 340px;
            gap: 28px;
            align-items: center;
            width: 100%;
            max-width: 1140px;
          }
          .feature-column {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            backdrop-filter: blur(8px);
          }
          .card-icon {
            font-size: 20px;
            margin-bottom: 6px;
            color: #60a5fa;
            font-weight: bold;
          }
          .card-title {
            font-size: 14px;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 4px;
          }
          .card-desc {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.45;
          }
          .popup-frame-wrap {
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
            overflow: hidden;
            height: 580px;
            background: #18181b;
          }
          iframe {
            width: 380px;
            height: 580px;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="title-area">
          <div class="badge">Privacy First • Local & Cloud</div>
          <h1>Extension Toolbar & Offline Cache Manager</h1>
          <p class="subtitle">Complete control over your AI provider, local storage cache, and language settings.</p>
        </div>
        <div class="showcase-grid">
          <div class="feature-column">
            <div class="card">
              <div class="card-icon">[✓] 100% Local & Private</div>
              <div class="card-title">Zero Cloud Telemetry</div>
              <div class="card-desc">Connect directly to local LLMs (LM Studio, Ollama, LocalAI). Transcripts and summaries never leave your machine.</div>
            </div>
            <div class="card">
              <div class="card-icon">[⚡] Persistent Local Cache</div>
              <div class="card-title">Instant Offline Replay</div>
              <div class="card-desc">Previously summarized videos load in under 10ms with zero token cost. Full byte size transparency & 1-click wipe.</div>
            </div>
          </div>

          <div class="popup-frame-wrap">
            <iframe src="chrome-extension://${extId}/dist/popup.html"></iframe>
          </div>

          <div class="feature-column">
            <div class="card">
              <div class="card-icon">[★] Universal Multi-Provider</div>
              <div class="card-title">BYOK Cloud Engines</div>
              <div class="card-desc">Switch seamlessly to Gemini 2.5 Flash, Groq, OpenAI GPT-4o, or Claude with your own private API keys.</div>
            </div>
            <div class="card">
              <div class="card-icon">[🌐] Global Multi-Language</div>
              <div class="card-title">8 Supported Locales</div>
              <div class="card-desc">Instant dynamic translation in English, French, Spanish, German, Italian, Japanese, Russian, and Chinese.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    await new Promise(r => setTimeout(r, 2000));
    const slide5File = 'store_slide_5_popup_cache_1280x800.png';
    const slide5LegacyFile = 'store_slide_5_popup_cache.png';
    await studioPage.screenshot({ path: path.join(storeAssetsDir, slide5File) });
    await studioPage.screenshot({ path: path.join(artifactDir, slide5File) });
    await studioPage.screenshot({ path: path.join(storeAssetsDir, slide5LegacyFile) });
    await studioPage.screenshot({ path: path.join(artifactDir, slide5LegacyFile) });
    await studioPage.close();
    console.log('  -> Saved Slide 5 (Studio Showcase 1280x800)');

    console.log('=== All 5 English Chrome Web Store Slides Successfully Generated (1280x800)! ===');
  } catch (err) {
    console.error('Error generating English store assets:', err);
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})();
