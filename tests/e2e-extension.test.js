import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROMIUM_CANDIDATE_PATHS = [
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

function findSupportedBrowser() {
  for (const p of CHROMIUM_CANDIDATE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

describe('End-to-End (E2E) Live Extension Verification in Real Chromium Browser', () => {
  const executablePath = findSupportedBrowser();
  const rootDir = path.resolve('.');

  it('launches live browser, verifies background service worker, popup cache management, and YouTube in-page banner tabs', async (t) => {
    if (!executablePath) {
      t.skip('No compatible Chromium browser detected for live E2E extension test');
      return;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-ai-e2e-'));

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: 'new',
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          `--user-data-dir=${tmpDir}`,
          `--disable-extensions-except=${rootDir}`,
          `--load-extension=${rootDir}`
        ]
      });

      // 1. Verify Extension Background Service Worker
      const workerTarget = await browser.waitForTarget(
        target => target.type() === 'service_worker' && target.url().includes('chrome-extension://'),
        { timeout: 8000 }
      );
      assert.ok(workerTarget, 'Background service worker must be registered and running');

      const extId = new URL(workerTarget.url()).hostname;
      assert.ok(extId && extId.length > 5, 'Extension ID must be resolved');

      // 2. Test Extension Toolbar Action Popup Window
      const popupPage = await browser.newPage();
      await popupPage.goto(`chrome-extension://${extId}/dist/popup.html`, { waitUntil: 'domcontentloaded' });

      const brandTitle = await popupPage.$eval('.brand-title', el => el.textContent.trim());
      assert.equal(brandTitle, 'YT Summarizer AI', 'Popup title must match extension brand');

      const isMasterToggleChecked = await popupPage.$eval('#extensionToggle', el => el.checked);
      assert.equal(isMasterToggleChecked, true, 'Master extension toggle must be checked by default');

      // Verify Cache Manager Card in Popup
      const cacheCard = await popupPage.$('#cacheCard');
      assert.ok(cacheCard, 'Cache Manager card must be rendered in popup');

      const cacheBadge = await popupPage.$eval('#cacheSizeBadge', el => el.textContent.trim());
      assert.ok(cacheBadge.length > 0, 'Cache metrics badge must be populated');

      // Test purge cache action in popup
      await popupPage.click('#purgeCacheBtn');
      const noticeVisible = await popupPage.waitForSelector('#cacheNotice:not(.hidden)', { timeout: 3000 });
      assert.ok(noticeVisible, 'Purge confirmation notice must appear upon clicking Purge');
      await popupPage.close();

      // 3. Test In-Page Companion Banner Injection & 4-Tab Navigation on Mock YouTube Page
      const ytPage = await browser.newPage();
      await ytPage.setRequestInterception(true);
      ytPage.on('request', req => {
        if (req.url().includes('youtube.com/watch')) {
          req.respond({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <head><title>Mock Video Title - YouTube</title></head>
                <body>
                  <div id="player"><video></video></div>
                  <div id="below"></div>
                  <div id="secondary"></div>
                </body>
              </html>
            `
          });
        } else {
          req.continue();
        }
      });

      await ytPage.goto('https://www.youtube.com/watch?v=TEST_VID_1', { waitUntil: 'domcontentloaded' });

      // Verify that the companion banner is mounted in the DOM
      const banner = await ytPage.waitForSelector('#yt-ai-summarizer-container', { timeout: 6000 });
      assert.ok(banner, 'In-page banner #yt-ai-summarizer-container must be mounted into YouTube DOM');

      // Verify all 4 tabs exist
      const summaryTab = await ytPage.$('#ytAiTabSummaryBtn');
      const chatTab = await ytPage.$('#ytAiTabChatBtn');
      const auditTab = await ytPage.$('#ytAiTabAuditBtn');
      const transcriptTab = await ytPage.$('#ytAiTabTranscriptBtn');

      assert.ok(summaryTab, 'Tab 1: AI Summary button must exist');
      assert.ok(chatTab, 'Tab 2: Interactive Chat button must exist');
      assert.ok(auditTab, 'Tab 3: Logic & Fact-Check Audit button must exist');
      assert.ok(transcriptTab, 'Tab 4: Transcript button must exist');

      // Expand banner to make tab panes visible
      await ytPage.click('#ytAiToggleBtn');

      // Click Audit Tab -> verifies pane activation
      await ytPage.click('#ytAiTabAuditBtn');
      const isAuditPaneActive = await ytPage.$eval('#ytAiPaneAudit', el => el.classList.contains('active'));
      assert.equal(isAuditPaneActive, true, 'Audit pane must become active upon clicking audit tab');

      const runAuditBtn = await ytPage.$('#ytAiRunAuditBtn');
      assert.ok(runAuditBtn, 'Run audit CTA button must be present in audit pane');

      // Click Chat Tab -> verifies pane activation and multiline textarea
      await ytPage.click('#ytAiTabChatBtn');
      const isChatPaneActive = await ytPage.$eval('#ytAiPaneChat', el => el.classList.contains('active'));
      assert.equal(isChatPaneActive, true, 'Chat pane must become active upon clicking chat tab');

      const chatInputTag = await ytPage.$eval('#ytAiChatInput', el => el.tagName.toLowerCase());
      assert.equal(chatInputTag, 'textarea', 'Chat input must be a multiline textarea');

      await ytPage.close();
    } finally {
      if (browser) await browser.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
