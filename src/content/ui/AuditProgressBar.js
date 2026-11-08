import { escapeHtml } from './MarkdownRenderer.js';

/**
 * Visual Progress Bar & Step Tracker Component for Long-Running Audits
 */
export class AuditProgressBar {
  /**
   * Generates the initial HTML markup for the visual progress widget
   * @param {Object} options
   * @param {number} [options.percent=0] - Current percentage (0 to 100)
   * @param {string} [options.title='Initialisation...'] - Main step title
   * @param {string} [options.detail=''] - Sub-detail (e.g. video/segment name)
   * @param {number} [options.currentStep=1] - Active step index
   * @param {number} [options.totalSteps=4] - Total number of steps
   * @returns {string} HTML markup
   */
  static renderWidget({
    percent = 0,
    title = 'Initialisation...',
    detail = '',
    currentStep = null,
    totalSteps = null
  } = {}) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    const shouldShowBadge = (typeof currentStep === 'number' && typeof totalSteps === 'number' && totalSteps > 1);
    const stepBadge = shouldShowBadge ? `[${currentStep}/${totalSteps}] ` : '';

    return `
      <div class="yt-ai-progress-widget" role="progressbar" aria-valuenow="${safePercent}" aria-valuemin="0" aria-valuemax="100">
        <div class="yt-ai-progress-header">
          <span class="yt-ai-progress-title">
            <span class="yt-ai-spinner yt-ai-progress-spinner"></span>
            <span class="yt-ai-progress-step-text">${escapeHtml(stepBadge)}${escapeHtml(title)}</span>
          </span>
          <span class="yt-ai-progress-percentage">${safePercent}%</span>
        </div>
        <div class="yt-ai-progress-track">
          <div class="yt-ai-progress-bar-fill" style="width: ${safePercent}%;"></div>
        </div>
        ${detail ? `<div class="yt-ai-progress-detail">${escapeHtml(detail)}</div>` : '<div class="yt-ai-progress-detail yt-ai-hidden"></div>'}
      </div>
    `;
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
