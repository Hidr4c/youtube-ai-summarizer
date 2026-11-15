import { escapeHtml } from './MarkdownRenderer.js';

/**
 * Visual Progress Bar, Step Tracker & Stop Action Component for Long-Running Audits
 */
export class AuditProgressBar {
  /**
   * Generates the initial HTML markup for the visual progress widget
   * @param {Object} options
   * @param {number} [options.percent=0] - Current percentage (0 to 100)
   * @param {string} [options.title='Initialisation...'] - Main step title
   * @param {string} [options.detail=''] - Sub-detail (e.g. video/segment name)
   * @param {number} [options.currentStep=null] - Active step index
   * @param {number} [options.totalSteps=null] - Total number of steps
   * @param {boolean} [options.showStop=true] - Render interactive Stop button
   * @param {string} [options.stopLabel='Arrêter'] - Label for Stop button
   * @returns {string} HTML markup
   */
  static renderWidget({
    percent = 0,
    title = 'Initialisation...',
    detail = '',
    currentStep = null,
    totalSteps = null,
    showStop = true,
    stopLabel = 'Arrêter'
  } = {}) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    const shouldShowBadge = (typeof currentStep === 'number' && typeof totalSteps === 'number' && totalSteps > 1);
    const stepBadge = shouldShowBadge ? `[${currentStep}/${totalSteps}] ` : '';
    const stopBtnHtml = showStop
      ? `<button type="button" class="yt-ai-btn yt-ai-progress-stop-btn" data-action="stop-audit" title="${escapeHtml(stopLabel)}">⏹ ${escapeHtml(stopLabel)}</button>`
      : '';

    return `
      <div class="yt-ai-progress-widget" role="progressbar" aria-valuenow="${safePercent}" aria-valuemin="0" aria-valuemax="100">
        <div class="yt-ai-progress-header">
          <span class="yt-ai-progress-title">
            <span class="yt-ai-spinner yt-ai-progress-spinner"></span>
            <span class="yt-ai-progress-step-text">${escapeHtml(stepBadge)}${escapeHtml(title)}</span>
          </span>
          <div class="yt-ai-progress-actions">
            <span class="yt-ai-progress-percentage">${safePercent}%</span>
            ${stopBtnHtml}
          </div>
        </div>
        <div class="yt-ai-progress-track">
          <div class="yt-ai-progress-bar-fill" style="width: ${safePercent}%;"></div>
        </div>
        ${detail ? `<div class="yt-ai-progress-detail">${escapeHtml(detail)}</div>` : '<div class="yt-ai-progress-detail yt-ai-hidden"></div>'}
      </div>
    `;
  }

  /**
   * Attaches click handler to the Stop button inside a progress container
   * @param {HTMLElement} container
   * @param {Function} onStop
   */
  static bindStopAction(container, onStop) {
    if (!container || typeof onStop !== 'function') return;
    const stopBtn = container.querySelector?.('.yt-ai-progress-stop-btn');
    if (!stopBtn || stopBtn.__ytAiStopBound) return;
    stopBtn.__ytAiStopBound = true;
    stopBtn.addEventListener?.('click', (e) => {
      e?.stopPropagation?.();
      stopBtn.disabled = true;
      onStop();
    });
  }

  /**
   * Smoothly updates an existing progress widget DOM element
   * @param {HTMLElement} container
   * @param {Object} options
   */
  static updateWidget(container, {
    percent,
    title,
    detail,
    currentStep = null,
    totalSteps = null
  } = {}) {
    if (!container) return;
    const widget = container.querySelector('.yt-ai-progress-widget') || container;

    if (typeof percent === 'number') {
      const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
      const fill = widget.querySelector('.yt-ai-progress-bar-fill');
      const pctText = widget.querySelector('.yt-ai-progress-percentage');
      if (fill) fill.style.width = `${safePercent}%`;
      if (pctText) pctText.textContent = `${safePercent}%`;
      widget.setAttribute('aria-valuenow', String(safePercent));
    }

    if (title) {
      const stepText = widget.querySelector('.yt-ai-progress-step-text');
      if (stepText) {
        const shouldShowBadge = (typeof currentStep === 'number' && typeof totalSteps === 'number' && totalSteps > 1);
        const stepBadge = shouldShowBadge ? `[${currentStep}/${totalSteps}] ` : '';
        stepText.textContent = `${stepBadge}${title}`;
      }
    }

    if (typeof detail === 'string') {
      const detailEl = widget.querySelector('.yt-ai-progress-detail');
      if (detailEl) {
        if (detail.trim()) {
          detailEl.textContent = detail;
          detailEl.classList.remove('yt-ai-hidden');
        } else {
          detailEl.classList.add('yt-ai-hidden');
        }
      }
    }
  }
}

export default AuditProgressBar;
