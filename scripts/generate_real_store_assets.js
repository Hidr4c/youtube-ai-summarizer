import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const storeDir = path.join(rootDir, 'store-assets');
const promoDir = path.join(storeDir, 'promo-video');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tempProfile = 'C:\\Users\\rb\\AppData\\Local\\Temp\\real_store_en_profile';

async function generateAll() {
  console.log('🚀 Launching Microsoft Edge with real extension on English YouTube...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--user-data-dir=${tempProfile}`,
      `--disable-extensions-except=${rootDir}`,
      `--load-extension=${rootDir}`,
      '--window-size=1280,850',
      '--lang=en-US',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  // Set standard cookies ensuring YouTube is 100% English without consent dialog
  await page.setCookie(
    { name: 'SOCS', value: 'CAESEwgDEgk2NTY5NjM0ODQaAmVuIAEaBgiA_LyaBg', domain: '.youtube.com', path: '/' },
    { name: 'CONSENT', value: 'YES+cb.20230531-04-p0.en+FX+987', domain: '.youtube.com', path: '/' },
    { name: 'PREF', value: 'hl=en&gl=US', domain: '.youtube.com', path: '/' }
  );

  console.log('📺 Navigating to YouTube video (English UI)...');
  await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ&hl=en', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));

  // Pause YouTube video player
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video) video.pause();
  });

  // Verify extension container
  const banner = await page.$('#yt-ai-summarizer-container');
  if (!banner) {
    throw new Error('Extension container #yt-ai-summarizer-container not found on YouTube!');
  }
  console.log('✅ Found extension banner on YouTube!');

  // Switch extension language to English and setup header badge
  await page.evaluate(() => {
    const b = document.getElementById('yt-ai-summarizer-container');
    if (b) {
      b.classList.remove('is-collapsed');
    }
    const langSelect = document.getElementById('ytAiLangSelect');
    if (langSelect) {
      langSelect.value = 'en';
      langSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const modelText = document.getElementById('ytAiHeaderModelText');
    if (modelText) modelText.textContent = 'Model: Qwen2.5-7B';
    const badge = document.getElementById('ytAiBadge');
    if (badge) badge.className = 'yt-ai-badge connected';
    const badgeText = document.getElementById('ytAiBadgeText');
    if (badgeText) badgeText.textContent = 'Connected';
  });
  await new Promise(r => setTimeout(r, 1000));

  // Helper to add/remove floating promo callout badge for promo video scenes
  async function setCallout(pill, title, highlight) {
    await page.evaluate(({ pill, title, highlight }) => {
      let el = document.getElementById('yt-ai-promo-callout');
      if (!pill) {
        if (el) el.remove();
        return;
      }
      if (!el) {
        el = document.createElement('div');
        el.id = 'yt-ai-promo-callout';
        el.style.cssText = `
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999999;
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(22, 27, 34, 0.95);
          border: 1px solid rgba(230, 33, 23, 0.5);
          padding: 10px 28px;
          border-radius: 40px;
          box-shadow: 0 8px 32px rgba(230, 33, 23, 0.25), 0 0 15px rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          pointer-events: none;
        `;
        document.body.appendChild(el);
      }
      el.replaceChildren();

      const pillSpan = document.createElement('span');
      pillSpan.style.cssText = 'background: #e62117; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;';
      pillSpan.textContent = pill;

      const textSpan = document.createElement('span');
      textSpan.style.cssText = 'font-size: 15px; font-weight: 600; color: #fff;';
      textSpan.textContent = title + ' ';

      if (highlight) {
        const hlSpan = document.createElement('span');
        hlSpan.style.cssText = 'color: #58a6ff;';
        hlSpan.textContent = highlight;
        textSpan.appendChild(hlSpan);
      }

      el.appendChild(pillSpan);
      el.appendChild(textSpan);
    }, { pill, title, highlight });
  }

  // Function to configure page state in 100% English
  async function configureState(stateName) {
    await page.evaluate((name) => {
      let policy = window.__ytAiPolicy;
      if (!policy && window.trustedTypes) {
        try {
          if (!window.__storePolicy) {
            window.__storePolicy = window.trustedTypes.createPolicy('storeAssetsPolicy', {
              createHTML: s => s
            });
          }
          policy = window.__storePolicy;
        } catch (e) {
          policy = window.__ytAiPolicy || window.trustedTypes.defaultPolicy;
        }
      }

      const setHTML = (el, str) => {
        if (!el) return;
        const p = policy || window.__ytAiPolicy || window.__storePolicy;
        try {
          el.innerHTML = p ? p.createHTML(str) : str;
        } catch (err) {
          try {
            const range = document.createRange();
            const frag = range.createContextualFragment(p ? p.createHTML(str) : str);
            el.replaceChildren(frag);
          } catch (err2) {
            console.error('setHTML failed:', err2);
          }
        }
      };

      const b = document.getElementById('yt-ai-summarizer-container');
      const toggleText = document.getElementById('ytAiToggleText');
      const drawer = document.getElementById('ytAiSettingsDrawer');

      if (drawer && name !== 'settings') {
        drawer.classList.remove('is-open');
        drawer.classList.add('yt-ai-hidden');
      }

      if (name === 'collapsed') {
        if (b) b.classList.add('is-collapsed');
        if (toggleText) toggleText.textContent = 'Expand';
      } else {
        if (b) b.classList.remove('is-collapsed');
        if (toggleText) toggleText.textContent = 'Collapse';
      }

      if (name === 'summary' || name === 'collapsed') {
        document.getElementById('ytAiTabSummaryBtn')?.click();
        const summaryBody = document.getElementById('ytAiSummaryBody');
        if (summaryBody) {
          summaryBody.classList.remove('yt-ai-typing');
          setHTML(summaryBody, `
            <div style="font-size: 13.5px; line-height: 1.65; color: #e1e4e8;">
              <h3 style="color: #fff; margin-bottom: 8px; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span>🎬</span> Structured AI Summary & Key Takeaways (LM Studio / Qwen2.5)
              </h3>
              <p style="margin-bottom: 12px; color: #c9d1d9;">
                An iconic open-source animated short film by the Blender Foundation featuring <strong>Big Buck Bunny</strong>, a giant and peaceful rabbit whose calm morning in the forest is abruptly disturbed by three mischievous rodents.
              </p>
              
              <h4 style="color: #58a6ff; font-size: 13px; font-weight: 600; margin-bottom: 6px;">⏱️ Interactive Chronological Timeline:</h4>
              <ul style="list-style: none; padding-left: 0; margin-bottom: 14px;">
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">00:00</a> <strong>Spring Awakening</strong> — Bunny emerges from his burrow and peacefully enjoys the forest flowers.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">02:15</a> <strong>The Bully Trio Appears</strong> — Frank the flying squirrel, Rinky, and Gamera torment defenseless forest animals.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">04:48</a> <strong>The Butterfly Incident</strong> — The trio maliciously crushes a gentle butterfly, prompting Bunny to take action.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">07:12</a> <strong>Tactical Trap Preparation</strong> — Bunny cleverly designs and constructs non-violent mechanical traps.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">09:30</a> <strong>Epilogue & Harmony Restored</strong> — The bullies are neutralized in good humor, restoring peace to the forest.</li>
              </ul>

              <h4 style="color: #7ee787; font-size: 13px; font-weight: 600; margin-bottom: 6px;">💡 Core Highlights & Takeaways:</h4>
              <ul style="list-style: square; padding-left: 20px; color: #8b949e;">
                <li><strong style="color: #c9d1d9;">Ingenuity over Brutality</strong>: Conflicts are resolved through clever tactical engineering rather than raw violence.</li>
                <li><strong style="color: #c9d1d9;">Open-Source Heritage</strong>: World-renowned creative benchmark modeled and rendered entirely in Blender 3D.</li>
              </ul>
            </div>
          `);
        }
      } else if (name === 'chat') {
        document.getElementById('ytAiTabChatBtn')?.click();
        const chatMessages = document.getElementById('ytAiChatMessages');
        if (chatMessages) {
          setHTML(chatMessages, `
            <div class="yt-ai-chat-bubble user" style="background: #238636; color: #fff; margin-left: auto; max-width: 75%; border-radius: 12px 12px 2px 12px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px;">
              What exactly happens at 04:48 with the butterfly?
            </div>
            <div class="yt-ai-chat-bubble ai" style="background: #161b22; border: 1px solid rgba(255,255,255,0.1); color: #e1e4e8; max-width: 85%; border-radius: 12px 12px 12px 2px; padding: 12px 16px; margin-bottom: 12px; font-size: 13px; line-height: 1.6;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="background: #ff0000; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">LM STUDIO</span>
                <strong style="color: #fff; font-size: 12px;">Qwen2.5-7B-Instruct</strong>
              </div>
              <p>At <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; background: rgba(56,139,253,0.15); padding: 1px 4px; border-radius: 3px;">04:48</a>, a blue butterfly gently lands on a stone right in front of Big Buck Bunny.</p>
              <p style="margin-top: 6px;">The hostile trio led by Frank the flying squirrel throws a pinecone from the tree branches to crush it. This unprovoked act exhausts Bunny's patience and triggers the construction of his clever counter-traps!</p>
            </div>
          `);
        }
      } else if (name === 'settings') {
        document.getElementById('ytAiTabSummaryBtn')?.click();
        const drawer = document.getElementById('ytAiSettingsDrawer');
        if (drawer) {
          drawer.classList.remove('yt-ai-hidden');
          drawer.classList.add('is-open');
        }
        document.getElementById('ytAiTabSettingsModelBtn')?.click();
      } else if (name === 'transcript') {
        document.getElementById('ytAiTabTranscriptBtn')?.click();
        const transcriptBody = document.getElementById('ytAiTranscriptBody') || document.querySelector('.yt-ai-transcript-list');
        if (transcriptBody) {
          setHTML(transcriptBody, `
            <div style="font-size: 12.5px; line-height: 1.6;">
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">00:00</a>
                <span>[Cheerful orchestral opening music — Sunrise over the forest meadow]</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">00:45</a>
                <span>Bunny emerges peacefully from his burrow and smells the forest flowers.</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">02:15</a>
                <span>Frank the flying squirrel perches in the high branches with a pinecone.</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">04:48</a>
                <span>A projectile is thrown, striking the butterfly mid-air in front of a stunned Bunny.</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">07:12</a>
                <span>Bunny plans his tactical response and gathers vines to assemble mechanical traps.</span>
              </div>
            </div>
          `);
        }
      }
    }, stateName);
    await new Promise(r => setTimeout(r, 800));
  }

  // 1. Capture 1280x800 Official Chrome Web Store Screenshots in English
  console.log('\n📸 Capturing Official Chrome Web Store Screenshots in English (1280x800)...');
  await setCallout(null);
  await page.setViewport({ width: 1280, height: 800 });

  console.log('  -> Screenshot 1: Instant AI Summary...');
  await configureState('summary');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-1-instant-summary.png') });

  console.log('  -> Screenshot 2: Interactive Q&A Chat...');
  await configureState('chat');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-2-interactive-chat.png') });

  console.log('  -> Screenshot 3: Settings & Local AI Models (LM Studio & Ollama)...');
  await configureState('settings');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-3-local-and-cloud-ai.png') });

  console.log('  -> Screenshot 4: Full Transcription & Formats...');
  await configureState('transcript');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-4-multilingual-and-export.png') });

  // 2. Capture 1920x1080 Scenes for Promo Video in English
  console.log('\n🎬 Capturing Promo Video Scenes at 1920x1080 in English...');
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('  -> Promo Scene 1: Native Companion...');
  await configureState('collapsed');
  await setCallout('⚡ Native Companion', 'Spend Less Time Watching.', 'Learn More in Seconds.');
  await page.screenshot({ path: path.join(promoDir, 'scene-1.png') });

  console.log('  -> Promo Scene 2: Instant Summary & Timestamps...');
  await configureState('summary');
  await setCallout('📑 Instant Summary', 'Comprehensive Breakdowns with', 'Clickable Timestamps');
  await page.screenshot({ path: path.join(promoDir, 'scene-2.png') });

  console.log('  -> Promo Scene 3: Interactive Chat & Q&A...');
  await configureState('chat');
  await setCallout('💬 Interactive Video Chat', 'Chat with Any Video in Real Time.', 'Extract Insights & Code.');
  await page.screenshot({ path: path.join(promoDir, 'scene-3.png') });

  console.log('  -> Promo Scene 4: Settings & Local AI Models (Privacy-First)...');
  await configureState('settings');
  await setCallout('🔒 100% Private & Local', 'Run On Your GPU with LM Studio & Ollama.', 'Zero Data Tracking.');
  await page.screenshot({ path: path.join(promoDir, 'scene-4.png') });

  console.log('  -> Promo Scene 5: Outro & Installation...');
  await setCallout('🌍 Multilingual & Free', 'Supporting 8 Languages.', '100% Free & Open Source.');
  await page.evaluate(() => {
    let overlay = document.getElementById('yt-ai-promo-outro');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'yt-ai-promo-outro';
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 999999;
        background: rgba(15, 15, 15, 0.94);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        backdrop-filter: blur(16px); font-family: "Roboto", sans-serif; color: #fff; text-align: center;
      `;

      const icon = document.createElement('div');
      icon.style.cssText = 'font-size: 64px; margin-bottom: 16px;';
      icon.textContent = '🎬';

      const title = document.createElement('h1');
      title.style.cssText = 'font-size: 48px; font-weight: 800; margin-bottom: 12px; color: #ff0000;';
      title.textContent = 'YouTube Summarizer AI';

      const subtitle = document.createElement('p');
      subtitle.style.cssText = 'font-size: 22px; color: #aaa; margin-bottom: 32px; max-width: 800px;';
      subtitle.textContent = '100% Local & Private with LM Studio & Ollama — Or 11 Major Cloud Providers';

      const badgesRow = document.createElement('div');
      badgesRow.style.cssText = 'display: flex; gap: 16px; margin-bottom: 40px;';

      const badges = ['🔒 Zero Data Collection', '🌍 8 Languages', '🎙️ Whisper Voice STT', '🔊 Audio TTS'];
      badges.forEach(b => {
        const badge = document.createElement('span');
        badge.style.cssText = 'background: rgba(255,255,255,0.08); padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: 500;';
        badge.textContent = b;
        badgesRow.appendChild(badge);
      });

      const footer = document.createElement('div');
      footer.style.cssText = 'font-size: 18px; color: #3ea6ff; font-weight: 600;';
      footer.textContent = 'Available Now for Chrome • Brave • Edge';

      overlay.appendChild(icon);
      overlay.appendChild(title);
      overlay.appendChild(subtitle);
      overlay.appendChild(badgesRow);
      overlay.appendChild(footer);
      document.body.appendChild(overlay);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(promoDir, 'scene-5.png') });

  // 3. Capture Promo Marquee (1400x560)
  console.log('\n🎨 Capturing Promotional Marquee in English...');
  await setCallout(null);
  await page.evaluate(() => {
    const o = document.getElementById('yt-ai-promo-outro');
    if (o) o.remove();
  });
  await configureState('summary');

  await page.setViewport({ width: 1400, height: 560 });
  await page.screenshot({ path: path.join(storeDir, 'promo-marquee-1400x560.png') });

  await browser.close();
  console.log('\n✨ All authentic English YouTube screenshots successfully generated!');

  // 4. Render Promo Tile Small (440x280) via Edge headless
  console.log('  -> Rendering Promo Tile Small (440x280)...');
  execSync(`"${edgePath}" --headless --disable-gpu --hide-scrollbars --window-size=440,280 "--screenshot=${path.join(storeDir, 'promo-tile-small-440x280.png')}" "file:///${path.join(storeDir, 'templates', 'promo-small.html').replace(/\\/g, '/')}"`, { stdio: 'inherit' });

  // 5. Re-encode the 1080p Promotional Video with FFmpeg
  console.log('\n🎥 Encoding 1080p Promotional Video with FFmpeg (English Slides & Voiceovers)...');
  try {
    execSync('powershell -ExecutionPolicy Bypass -File store-assets/promo-video/generate-promo.ps1 -SkipRenderSlides', {
      cwd: rootDir,
      stdio: 'inherit'
    });
    console.log('🎉 Promotional video successfully compiled in English!');
  } catch (err) {
    console.error('Video compilation warning:', err.message);
  }
}

generateAll().catch(err => {
  console.error('Error during generation:', err);
  process.exit(1);
});
