import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditProgressBar } from '../src/content/ui/AuditProgressBar.js';

describe('AuditProgressBar - Visual Progress Widget', () => {
  it('renders initial widget HTML with correct percentage and aria attributes', () => {
    const html = AuditProgressBar.renderWidget({
      percent: 45,
      title: 'Analyse du lot 1/2',
      detail: '0 coupure',
      currentStep: 2,
      totalSteps: 4
    });

    assert.ok(html.includes('yt-ai-progress-widget'));
    assert.ok(html.includes('width: 45%;'));
    assert.ok(html.includes('45%'));
    assert.ok(html.includes('[2/4]'));
    assert.ok(html.includes('Analyse du lot 1/2'));
    assert.ok(html.includes('0 coupure'));
    assert.ok(html.includes('aria-valuenow="45"'));
  });

  it('clamps percent between 0 and 100', () => {
    const htmlLow = AuditProgressBar.renderWidget({ percent: -20 });
    assert.ok(htmlLow.includes('width: 0%;'));

    const htmlHigh = AuditProgressBar.renderWidget({ percent: 150 });
    assert.ok(htmlHigh.includes('width: 100%;'));
  });

  it('updates existing widget elements smoothly', () => {
    const mockWidget = {
      attributes: {},
      setAttribute: (k, v) => { mockWidget.attributes[k] = v; },
      querySelector: (sel) => {
        if (sel === '.yt-ai-progress-bar-fill') return { style: {} };
        if (sel === '.yt-ai-progress-percentage') return { textContent: '' };
        if (sel === '.yt-ai-progress-step-text') return { textContent: '' };
        if (sel === '.yt-ai-progress-detail') return {
          textContent: '',
          classList: {
            add: () => {},
            remove: () => {}
          }
        };
        return null;
      }
    };

    const container = {
      querySelector: () => mockWidget
    };

    AuditProgressBar.updateWidget(container, {
      percent: 80,
      title: 'Finalisation',
      detail: 'Calcul du score',
      currentStep: 4,
      totalSteps: 4
    });

    assert.equal(mockWidget.attributes['aria-valuenow'], '80');
  });

  it('escapes special characters in title and detail to prevent XSS injection', () => {
    const maliciousTitle = '<script>alert("hack")</script>';
    const maliciousDetail = '<img src=x onerror=alert(1)> & "quotes"';
    const html = AuditProgressBar.renderWidget({
      percent: 50,
      title: maliciousTitle,
      detail: maliciousDetail
    });

    assert.equal(html.includes('<script>'), false, 'Raw script tag must be sanitized');
    assert.ok(html.includes('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;'));
    assert.equal(html.includes('<img src=x'), false, 'Raw img tag must be sanitized');
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quotes&quot;'));
  });

  it('omits step badge when currentStep or totalSteps are null or totalSteps <= 1', () => {
    const htmlNull = AuditProgressBar.renderWidget({ title: 'Chargement...', currentStep: null });
    assert.equal(htmlNull.includes('['), false);

    const htmlSingle = AuditProgressBar.renderWidget({ title: 'Chargement...', currentStep: 1, totalSteps: 1 });
    assert.equal(htmlSingle.includes('[1/1]'), false);
  });

  it('toggles detail element visibility when detail is updated to empty string', () => {
    let hasHiddenClass = false;
    let detailContent = 'Old detail';

    const mockDetailEl = {
      set textContent(v) { detailContent = v; },
      get textContent() { return detailContent; },
      classList: {
        add: (c) => { if (c === 'yt-ai-hidden') hasHiddenClass = true; },
        remove: (c) => { if (c === 'yt-ai-hidden') hasHiddenClass = false; }
      }
    };

    const mockContainer = {
      querySelector: (sel) => {
        if (sel === '.yt-ai-progress-detail') return mockDetailEl;
        return null;
      }
    };

    // Update with non-empty detail
    AuditProgressBar.updateWidget(mockContainer, { detail: 'Nouveau segment' });
    assert.equal(detailContent, 'Nouveau segment');
    assert.equal(hasHiddenClass, false);

    // Update with empty detail -> adds hidden class
    AuditProgressBar.updateWidget(mockContainer, { detail: '   ' });
    assert.equal(hasHiddenClass, true);
  });

  it('handles null container gracefully without throwing', () => {
    assert.doesNotThrow(() => {
      AuditProgressBar.updateWidget(null, { percent: 50 });
    });
  });
});
