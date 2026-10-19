import { DOMTranscriptExtractor } from './DOMTranscriptExtractor.js';

export const CLOSE_BTN_LANG_REGEX = /fermer|close|schließen|cerrar|chiudi|fechar|закрыть|sluiten|stäng|luk|sulje|閉じる|닫기|关闭|關閉|إغلاق|बंद करें/i;
export const TRANSCRIPT_LANG_REGEX = /transcription|transcript|transkript|transcripción|trascrizione|transcrição|транскрипция|文字起こし|자막|文字记录|文字記錄|نص|प्रतिलेख/i;

const ENGAGEMENT_SELECTORS = [
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]',
  'ytd-engagement-panel-section-list-renderer[target-id="modern_transcript_fe"]',
  'ytd-engagement-panel-section-list-renderer[target-id*="transcript"]',
  'ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"]'
].join(', ');

export function isNativeTranscriptPanelVisible() {
  const segs = document.querySelectorAll(
    'transcript-segment-view-model, ytd-transcript-segment-renderer, [class*="ytTranscriptSegmentViewModelHost"]'
  );
  if (segs && segs.length > 3) {
    for (const seg of segs) {
      if (seg.offsetParent !== null && !document.getElementById('yt-ai-stealth-style')) return true;
    }
  }

  const panels = document.querySelectorAll(ENGAGEMENT_SELECTORS);
  for (const panel of panels) {
    if (panel.style.display === 'none' || panel.hasAttribute('hidden')) continue;
    const vis = panel.getAttribute('visibility');
    if (vis === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED' && panel.offsetParent !== null && panel.offsetWidth > 100) {
      return true;
    }
  }
  return false;
}

export function closeNativeTranscriptPanel() {
  const panels = document.querySelectorAll(ENGAGEMENT_SELECTORS);
  for (const panel of panels) {
    const header = panel.querySelector('ytd-engagement-panel-title-header-renderer, #header, [id="header"]');
    let closeBtn = null;
    if (header) {
      closeBtn = header.querySelector('#visibility-button button, [id="visibility-button"] button');
      if (!closeBtn) {
        const headerBtns = header.querySelectorAll('button, yt-icon-button, tp-yt-paper-icon-button');
        for (const btn of headerBtns) {
          const aria = btn.getAttribute('aria-label') || '';
          const title = btn.getAttribute('title') || '';
          if (CLOSE_BTN_LANG_REGEX.test(aria) || CLOSE_BTN_LANG_REGEX.test(title)) {
            closeBtn = btn.querySelector('button') || btn;
            break;
          }
        }
      }
      if (!closeBtn) {
        const svgs = header.querySelectorAll('svg path');
        for (const p of svgs) {
          const d = p.getAttribute('d') || '';
          if (d.includes('6.41') || d.includes('12.7') || d.includes('17.59') || d.includes('18.3 5.71')) {
            closeBtn = p.closest('button, yt-icon-button') || p.closest('[role="button"]');
            if (closeBtn) break;
          }
        }
      }
      if (!closeBtn) {
        const allHeaderBtns = header.querySelectorAll('button, yt-icon-button button');
        if (allHeaderBtns.length > 0) closeBtn = allHeaderBtns[allHeaderBtns.length - 1];
      }
    }

    if (closeBtn) {
      try { closeBtn.click(); } catch (_) {}
    }
    if (typeof panel.hide === 'function') {
      try { panel.hide(); } catch (_) {}
    }
    if (typeof panel.close === 'function') {
      try { panel.close(); } catch (_) {}
    }
    panel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
    panel.setAttribute('hidden', '');
    panel.style.setProperty('display', 'none', 'important');
  }
}

export function collapseDescription() {
  const collapseBtn = document.querySelector(
    'tp-yt-paper-button#collapse, #collapse.ytd-text-inline-expander, #description-inline-expander #collapse'
  );
  if (collapseBtn && collapseBtn.offsetParent !== null) collapseBtn.click();
}

function findTranscriptButtonInDOM() {
  let btn = document.querySelector('ytd-video-description-transcript-section-renderer button');
  if (btn) return btn;
  const allBtns = document.querySelectorAll('#description button, ytd-watch-metadata button');
  for (const b of allBtns) {
    const aria = b.getAttribute('aria-label') || '';
    const text = b.textContent || '';
    if (TRANSCRIPT_LANG_REGEX.test(aria) || TRANSCRIPT_LANG_REGEX.test(text)) return b;
  }
  return null;
}

export async function ensureTranscriptTabActive(targetPanel) {
  const panels = document.querySelectorAll(ENGAGEMENT_SELECTORS);
  let activePanel = targetPanel;
  if (!activePanel) {
    for (const p of panels) {
      if (p.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED' || p.offsetParent !== null) {
        activePanel = p;
        break;
      }
    }
    if (!activePanel && panels.length > 0) activePanel = panels[0];
  }
  if (!activePanel) return false;
  if (document.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer').length > 5) return true;

  const candidates = activePanel.querySelectorAll('button, [role="tab"], [role="button"], yt-chip-cloud-chip-renderer');
  for (const el of candidates) {
    const text = (el.textContent || '').trim();
    const aria = (el.getAttribute('aria-label') || '').trim();
    if (TRANSCRIPT_LANG_REGEX.test(text) || TRANSCRIPT_LANG_REGEX.test(aria)) {
      if (el.getAttribute('aria-selected') === 'true' || el.classList.contains('selected')) return true;
      const clickable = el.closest('button, [role="tab"], [role="button"]') || el;
      clickable.querySelector('button')?.click();
      clickable.click();
      clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }
  }

  const tabList = activePanel.querySelectorAll('[role="tab"], yt-chip-cloud-chip-renderer, ytd-sub-feed-selector-renderer button');
  if (tabList.length >= 2) {
    const secondTab = tabList[1];
    if (secondTab.getAttribute('aria-selected') === 'true' || secondTab.classList.contains('selected')) return true;
    secondTab.querySelector('button')?.click();
    secondTab.click();
    secondTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }
  return false;
}

export async function triggerStealthNativeTranscript() {
  const wasPanelOpen = isNativeTranscriptPanelVisible();
  let didWeOpenPanel = false;
  const expandDesc = document.querySelector('tp-yt-paper-button#expand, #expand.ytd-text-inline-expander, #description-inline-expander #expand');
  const wasDescExpanded = !expandDesc || expandDesc.offsetParent === null;

  if (wasPanelOpen) {
    await ensureTranscriptTabActive();
    const direct = DOMTranscriptExtractor.extractTranscriptFromActiveDOM();
    if (direct && direct.length > 5) return direct;
  }

  let stealthStyle = document.getElementById('yt-ai-stealth-style');
  if (!stealthStyle) {
    stealthStyle = document.createElement('style');
    stealthStyle.id = 'yt-ai-stealth-style';
    stealthStyle.textContent = `
      ytd-engagement-panel-section-list-renderer[target-id*="transcript"],
      ytd-engagement-panel-section-list-renderer[target-id*="macro-markers"] {
        display: none !important; opacity: 0 !important; visibility: hidden !important;
        position: fixed !important; left: -99999px !important; top: -99999px !important;
        width: 1px !important; height: 1px !important; z-index: -9999 !important;
      }
    `;
    document.head.appendChild(stealthStyle);
  }

  try {
    let directBtn = findTranscriptButtonInDOM();
    if (!directBtn && expandDesc && expandDesc.offsetParent !== null) {
      expandDesc.click();
      await new Promise(r => setTimeout(r, 200));
      directBtn = findTranscriptButtonInDOM();
    }

    if (directBtn) {
      didWeOpenPanel = true;
      directBtn.click();
    } else {
      const markersBtn = document.querySelector('ytd-macro-markers-list-renderer button, #structured-description ytd-macro-markers-list-renderer [role="button"]');
      if (markersBtn) {
        didWeOpenPanel = true;
        markersBtn.click();
        await new Promise(r => setTimeout(r, 200));
        await ensureTranscriptTabActive();
      } else {
        const hiddenPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ytd-engagement-panel-section-list-renderer[target-id*="transcript"]');
        if (hiddenPanel) {
          didWeOpenPanel = true;
          hiddenPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');
          if (typeof hiddenPanel.show === 'function') hiddenPanel.show();
          await ensureTranscriptTabActive(hiddenPanel);
        } else {
          return null;
        }
      }
    }

    let segments = null;
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (i % 3 === 0) await ensureTranscriptTabActive();
      segments = DOMTranscriptExtractor.extractTranscriptFromActiveDOM();
      if (segments && segments.length > 5) {
        const words = segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
        if (segments.length >= 15 || words >= 100) break;
      }
    }
    return segments;
  } catch (_) {
    return null;
  } finally {
    const shouldClose = !wasPanelOpen || didWeOpenPanel;
    if (!wasPanelOpen) {
      closeNativeTranscriptPanel();
      if (!wasDescExpanded) collapseDescription();
      setTimeout(() => {
        if (stealthStyle?.parentNode) stealthStyle.parentNode.removeChild(stealthStyle);
      }, 350);
    } else if (didWeOpenPanel) {
      closeNativeTranscriptPanel();
      if (!wasDescExpanded) collapseDescription();
      setTimeout(() => {
        if (stealthStyle?.parentNode) stealthStyle.parentNode.removeChild(stealthStyle);
      }, 350);
    } else {
      if (stealthStyle?.parentNode) stealthStyle.parentNode.removeChild(stealthStyle);
    }
  }
}

export const NativeTranscriptPanel = {
  isNativeTranscriptPanelVisible,
  closeNativeTranscriptPanel,
  collapseDescription,
  ensureTranscriptTabActive,
  triggerStealthNativeTranscript
};
export default NativeTranscriptPanel;
