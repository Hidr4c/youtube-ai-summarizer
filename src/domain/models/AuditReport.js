/**
 * Domain Aggregate representing a Critical Audit Report (Logic consistency & Fact-checking)
 */
export class AuditReport {
  /**
   * @param {Object} params
   * @param {string} params.videoId
   * @param {number} [params.reliabilityScore=100] - 0 to 100
   * @param {string} [params.status='reliable'] - 'reliable', 'caution', 'questionable', 'manipulative'
   * @param {Array<Object>} [params.fallacies=[]] - Detected fallacies with timestamp, quote, flaw
   * @param {Array<Object>} [params.veracityChecks=[]] - Factual / temporal checks
   * @param {Object} [params.communitySignals={}] - Comments flags and viewer consensus
   * @param {string} [params.rawMarkdown=''] - Full streamed markdown report
   * @param {string} [params.verdict=''] - Concluding verdict
   * @param {string} [params.lang='en']
   */
  constructor(params = {}) {
    this.videoId = params.videoId || '';
    this.reliabilityScore = typeof params.reliabilityScore === 'number' ? params.reliabilityScore : 100;
    this.status = params.status || 'reliable';
    this.fallacies = Array.isArray(params.fallacies) ? params.fallacies : [];
    this.veracityChecks = Array.isArray(params.veracityChecks) ? params.veracityChecks : [];
    this.communitySignals = params.communitySignals || { flagCount: 0, flags: [] };
    this.rawMarkdown = params.rawMarkdown || '';
    this.verdict = params.verdict || '';
    this.lang = params.lang || 'en';
    this.createdAt = params.createdAt || Date.now();
  }

  /**
   * Determines if the video exhibits significant cognitive bias, fallacies or falsehoods
   * @returns {boolean}
   */
  hasSignificantFlaws() {
    return this.reliabilityScore < 70 || this.fallacies.length > 0 || this.veracityChecks.length > 0;
  }

  /**
   * Returns a localized badge label for the score
   * @param {string} [lang='en']
   * @returns {{ label: string, color: string }}
   */
  getReliabilityBadge(lang = 'en') {
    if (this.reliabilityScore >= 80) {
      return {
        label: lang === 'fr' ? 'Solidité Élevée' : 'High Reliability',
        color: '#2ea043'
      };
    }
    if (this.reliabilityScore >= 50) {
      return {
        label: lang === 'fr' ? 'Vigilance / Biais détectés' : 'Caution / Biases detected',
        color: '#d29922'
      };
    }
    return {
      label: lang === 'fr' ? 'Majeure Incohérence / Douteux' : 'Questionable / Low Reliability',
      color: '#f85149'
    };
  }

  /**
   * Exports audit context for injection into Q&A Chat
   * @returns {string}
   */
  toChatContextBlock() {
    if (!this.rawMarkdown && this.fallacies.length === 0) return '';
    return [
      '### [RAPPORT D’AUDIT CRITIQUE, LOGIQUE & VÉRACITÉ]',
      `Indice de fiabilité évalué: ${this.reliabilityScore}/100 (${this.status})`,
      this.rawMarkdown.trim()
    ].filter(Boolean).join('\n\n');
  }

  /**
   * Serializes to JSON for persistence
   * @returns {Object}
   */
  toJSON() {
    return {
      videoId: this.videoId,
      reliabilityScore: this.reliabilityScore,
      status: this.status,
      fallacies: this.fallacies,
      veracityChecks: this.veracityChecks,
      communitySignals: this.communitySignals,
      rawMarkdown: this.rawMarkdown,
      verdict: this.verdict,
      lang: this.lang,
      createdAt: this.createdAt
    };
  }
}

export default AuditReport;
