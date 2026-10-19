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
const tempProfile = 'C:\\Users\\rb\\AppData\\Local\\Temp\\real_store_profile';

async function generateAll() {
  console.log('🚀 Launching Microsoft Edge with real extension on YouTube...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--user-data-dir=${tempProfile}`,
      `--disable-extensions-except=${rootDir}`,
      `--load-extension=${rootDir}`,
      '--window-size=1280,850',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  // Set consent cookies
  await page.setCookie(
    { name: 'SOCS', value: 'CAESEwgDEgk2NTY5NjM0ODQaAmZyIAEaBgiA_LyaBg', domain: '.youtube.com', path: '/' },
    { name: 'CONSENT', value: 'YES+cb.20230531-04-p0.fr+FX+987', domain: '.youtube.com', path: '/' }
  );

  console.log('📺 Navigating to YouTube video...');
  await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ', { waitUntil: 'domcontentloaded' });
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

  // Expand banner
  await page.evaluate(() => {
    const b = document.getElementById('yt-ai-summarizer-container');
    if (b) {
      b.classList.remove('is-collapsed');
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Function to configure page state using TrustedTypes policy
  async function configureState(stateName) {
    await page.evaluate((name) => {
      // Create trusted type policy
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

      // Reset Settings drawer if open
      const drawer = document.getElementById('ytAiSettingsDrawer');
      if (drawer && name !== 'settings') {
        drawer.classList.remove('is-open');
        drawer.classList.add('yt-ai-hidden');
      }

      if (name === 'summary') {
        document.getElementById('ytAiTabSummaryBtn')?.click();
        const summaryBody = document.getElementById('ytAiSummaryBody');
        if (summaryBody) {
          summaryBody.classList.remove('yt-ai-typing');
          setHTML(summaryBody, `
            <div style="font-size: 13.5px; line-height: 1.65; color: #e1e4e8;">
              <h3 style="color: #fff; margin-bottom: 8px; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span>🎬</span> Synthèse Structurée & Points Clés (LM Studio / Qwen2.5)
              </h3>
              <p style="margin-bottom: 12px; color: #c9d1d9;">
                Court-métrage d'animation emblématique de la Fondation Blender mettant en scène <strong>Big Buck Bunny</strong>, un lièvre géant et pacifique dont la quiétude dans la forêt est brutalement troublée par trois rongeurs farceurs.
              </p>
              
              <h4 style="color: #58a6ff; font-size: 13px; font-weight: 600; margin-bottom: 6px;">⏱️ Déroulement Chronologique Interactif :</h4>
              <ul style="list-style: none; padding-left: 0; margin-bottom: 14px;">
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">00:00</a> <strong>Réveil printanier</strong> — Bunny s'éveille et profite harmonieusement de la nature.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">02:15</a> <strong>Arrivée des perturbateurs</strong> — Frank l'écureuil volant, Rinky et Gamera attaquent des animaux sans défense.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">04:48</a> <strong>L'incident tragique du papillon</strong> — Le trio écrase un papillon, provoquant la décision d'agir de Bunny.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">07:12</a> <strong>Planification & Pièges ingénieux</strong> — Bunny prépare des mécanismes de contre-attaque non violents.</li>
                <li style="margin-bottom: 6px;"><a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: 700; text-decoration: none; background: rgba(56,139,253,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace;">09:30</a> <strong>Épilogue & Paix restaurée</strong> — Les perturbateurs sont neutralisés dans la bonne humeur.</li>
              </ul>

              <h4 style="color: #7ee787; font-size: 13px; font-weight: 600; margin-bottom: 6px;">💡 Enseignements & Spécificités :</h4>
              <ul style="list-style: square; padding-left: 20px; color: #8b949e;">
                <li><strong style="color: #c9d1d9;">Triomphe de l'ingéniosité</strong> : Résolution de conflit par la ruse tactique plutôt que par la violence.</li>
                <li><strong style="color: #c9d1d9;">Fierté Open-Source</strong> : Film de référence de l'écosystème Creative Commons mondial.</li>
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
              Que se passe-t-il exactement à 04:48 avec le papillon ?
            </div>
            <div class="yt-ai-chat-bubble ai" style="background: #161b22; border: 1px solid rgba(255,255,255,0.1); color: #e1e4e8; max-width: 85%; border-radius: 12px 12px 12px 2px; padding: 12px 16px; margin-bottom: 12px; font-size: 13px; line-height: 1.6;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="background: #ff0000; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">LM STUDIO</span>
                <strong style="color: #fff; font-size: 12px;">Qwen2.5-7B-Instruct</strong>
              </div>
              <p>À <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; background: rgba(56,139,253,0.15); padding: 1px 4px; border-radius: 3px;">04:48</a>, un papillon aux reflets bleus se pose délicatement sur une pierre devant Big Buck Bunny.</p>
              <p style="margin-top: 6px;">Le trio hostile mené par Frank l'écureuil volant lui projette une pomme de pin depuis un arbre pour l'abattre. Cet acte gratuit met fin à la patience de Bunny et déclenche la fabrication de ses célèbres pièges !</p>
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
                <span>[Musique orchestrale enjouée — Lever de soleil sur la forêt]</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">00:45</a>
                <span>Bunny sort paisiblement de son terrier et respire le parfum des fleurs sauvages.</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">02:15</a>
                <span>Frank l'écureuil volant prend position dans les branches avec une pomme de pin.</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">04:48</a>
                <span>Un projectile est tiré, heurtant le papillon en plein vol sous le regard choqué de Bunny.</span>
              </div>
              <div style="display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <a href="#" class="yt-ai-timestamp" style="color: #3ea6ff; font-weight: bold; font-family: monospace;">07:12</a>
                <span>Bunny trace un schéma tactique au sol et assemble minutieusement ses pièges.</span>
              </div>
            </div>
          `);
        }
      }
    }, stateName);
    await new Promise(r => setTimeout(r, 800));
  }

  // 1. Capture 1280x800 Official Chrome Web Store Screenshots
  console.log('\n📸 Capturing Official Chrome Web Store Screenshots (1280x800)...');
  await page.setViewport({ width: 1280, height: 800 });

  console.log('  -> Screenshot 1: Synthèse IA Instantanée...');
  await configureState('summary');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-1-instant-summary.png') });

  console.log('  -> Screenshot 2: Chat & Q&A Interactif...');
  await configureState('chat');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-2-interactive-chat.png') });

  console.log('  -> Screenshot 3: Réglages & Modèles Locaux (LM Studio & Ollama)...');
  await configureState('settings');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-3-local-and-cloud-ai.png') });

  console.log('  -> Screenshot 4: Transcription & Multi-Formats...');
  await configureState('transcript');
  await page.screenshot({ path: path.join(storeDir, 'screenshot-4-multilingual-and-export.png') });

  // 2. Capture 1920x1080 Scenes for Promo Video
  console.log('\n🎬 Capturing Promo Video Scenes at 1920x1080...');
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('  -> Promo Scene 1: Summary...');
  await configureState('summary');
  await page.screenshot({ path: path.join(promoDir, 'scene-1.png') });

  console.log('  -> Promo Scene 2: Interactive Chat...');
  await configureState('chat');
  await page.screenshot({ path: path.join(promoDir, 'scene-2.png') });

  console.log('  -> Promo Scene 3: Settings & Local AI Models...');
  await configureState('settings');
  await page.screenshot({ path: path.join(promoDir, 'scene-3.png') });

  console.log('  -> Promo Scene 4: Interactive Transcript...');
  await configureState('transcript');
  await page.screenshot({ path: path.join(promoDir, 'scene-4.png') });

  console.log('  -> Promo Scene 5: Outro & Installation...');
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

  // 3. Capture Promo Marquee (1400x560) and Small Tile (440x280)
  console.log('\n🎨 Capturing Promotional Tiles...');
  await page.evaluate(() => {
    const o = document.getElementById('yt-ai-promo-outro');
    if (o) o.remove();
  });
  await configureState('summary');

  console.log('  -> Promo Marquee (1400x560)...');
  await page.setViewport({ width: 1400, height: 560 });
  await page.screenshot({ path: path.join(storeDir, 'promo-marquee-1400x560.png') });

  console.log('  -> Promo Tile Small (440x280)...');
  await page.setViewport({ width: 440, height: 280 });
  await page.screenshot({ path: path.join(storeDir, 'promo-tile-small-440x280.png') });

  await browser.close();
  console.log('\n✨ All authentic YouTube screenshots successfully generated!');

  // 4. Re-encode the 1080p Promotional Video with FFmpeg
  console.log('\n🎥 Encoding 1080p Promotional Video with FFmpeg...');
  try {
    execSync('powershell -ExecutionPolicy Bypass -File store-assets/promo-video/generate-promo.ps1 -SkipRenderSlides', {
      cwd: rootDir,
      stdio: 'inherit'
    });
    console.log('🎉 Promotional video successfully compiled!');
  } catch (err) {
    console.error('Video compilation warning:', err.message);
  }
}

generateAll().catch(err => {
  console.error('Error during generation:', err);
  process.exit(1);
});
