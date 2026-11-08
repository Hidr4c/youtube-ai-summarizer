import { ChannelStatisticalSampler } from '../../services/implementations/ChannelStatisticalSampler.js';

/**
 * Domain Aggregate Model for YouTube Channel Global Audit Report
 */
export class ChannelAuditReport {
  constructor(data = {}) {
    this.channelTitle = data.channelTitle || 'Chaîne YouTube';
    this.channelHandle = data.channelHandle || '';
    this.subscribers = data.subscribers || '';
    this.totalVideos = data.totalVideos || '';
    this.sampleSize = data.sampleSize || 0;

    this.globalScore = typeof data.globalScore === 'number' ? Math.max(0, Math.min(100, data.globalScore)) : 50;
    this.clickbaitIndex = typeof data.clickbaitIndex === 'number' ? Math.max(0, Math.min(100, data.clickbaitIndex)) : 20;

    this.proportions = data.proportions || { reliablePct: 60, cautionPct: 30, clickbaitPct: 10 };
    this.distribution = data.distribution || { reliable: 0, caution: 0, clickbait: 0 };
    this.trajectory = data.trajectory || 'stable';
    this.trajectoryLabel = data.trajectoryLabel || 'Ligne éditoriale stable';

    this.evaluatedVideos = Array.isArray(data.evaluatedVideos) ? data.evaluatedVideos : [];
    this.strengths = Array.isArray(data.strengths) ? data.strengths : [];
    this.weaknesses = Array.isArray(data.weaknesses) ? data.weaknesses : [];
    this.drawbacks = Array.isArray(data.drawbacks) ? data.drawbacks : [];

    this.temporalEvolution = data.temporalEvolution || '';
    this.executiveSummary = data.executiveSummary || '';
    this.rawText = data.rawText || '';
    this.timestamp = data.timestamp || Date.now();

    this.badge = this._computeBadge();
  }

  _computeBadge() {
    if (this.globalScore >= 75) {
      return { label: 'Chaîne Recommandable & Factuelle', color: 'success', symbol: '✓' };
    }
    if (this.globalScore >= 50) {
      return { label: 'Vigilance & Esprit Critique Recommandés', color: 'warning', symbol: '!' };
    }
    return { label: 'Sensationnalisme / Accroches Trompeuses', color: 'danger', symbol: '!' };
  }

  /**
   * Parses consolidated raw AI response and sample metadata into ChannelAuditReport
   * @param {string} rawText Complete streamed markdown output
   * @param {Object} context Metadata of sampled videos and channel
   * @returns {ChannelAuditReport}
   */
  static fromRawResponse(rawText = '', context = {}) {
    const channel = context.channel || {};
    const sampledVideos = context.sampledVideos || [];

    // 1. Extract explicit tags
    const scoreMatch = rawText.match(/\[(?:SCORE_GLOBAL|GLOBAL_SCORE|SCORE)\s*:\s*(\d{1,3})\s*(?:\/\s*100)?\]/i);
    const clickbaitMatch = rawText.match(/\[(?:INDICE_CLICKBAIT|CLICKBAIT_INDEX|CLICKBAIT|INDICE_SENSATIONNALISME|SENSATIONNALISME)\s*:\s*(\d{1,3})\s*%?\]/i);
    const trajectoryMatch = rawText.match(/\[(?:TRAJECTOIRE|TRAJECTORY)\s*:\s*(PROGRESSION|STABLE|DECLIN|IMPROVING|DECLINING)\]/i);

    // 2. Parse per-video evaluation table/block: [EVAL_VIDEOS] ... [/EVAL_VIDEOS]
    const evaluatedVideos = this._parseEvaluatedVideos(rawText, sampledVideos);

    // 3. Compute statistical aggregation from parsed videos if available
    const stats = ChannelStatisticalSampler.computeWeightedMetrics(evaluatedVideos);

    const parsedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : stats.weightedScore;
    const parsedClickbait = clickbaitMatch ? parseInt(clickbaitMatch[1], 10) : stats.weightedClickbait;

    let traj = stats.trajectory;
    let trajLabel = stats.trajectoryLabel;
    if (trajectoryMatch) {
      const t = trajectoryMatch[1].toUpperCase();
      if (t === 'PROGRESSION' || t === 'IMPROVING') {
        traj = 'improving';
        trajLabel = 'En nette progression (rigueur et nuance en hausse)';
      } else if (t === 'DECLIN' || t === 'DECLINING') {
        traj = 'declining';
        trajLabel = 'En baisse de rigueur (sensationnalisme accru)';
      } else {
        traj = 'stable';
        trajLabel = 'Ligne éditoriale stable';
      }
    }

    // 4. Extract structured sections
    const strengths = this._extractBulletSection(rawText, [
      /###\s*\[?✓?\]?\s*Ce que la chaîne fait de bien/i,
      /###\s*Points forts/i,
      /###\s*Strengths/i
    ]);

    const weaknesses = this._extractBulletSection(rawText, [
      /###\s*\[?!\]?\s*Ce qu'elle fait de moins bien/i,
      /###\s*Points de vigilance/i,
      /###\s*Weaknesses/i
    ]);

    const drawbacks = this._extractBulletSection(rawText, [
      /###\s*\[?X?\]?\s*Écueils et dérives/i,
      /###\s*Pièges et sensationnalisme/i,
      /###\s*Ce qui ne va pas/i,
      /###\s*Critical flaws/i
    ]);

    const temporalEvolution = this._extractSectionContent(rawText, [
      /###\s*\[?📈?\]?\s*Évolution temporelle/i,
      /###\s*Trajectoire d'année en année/i,
      /###\s*Year-over-Year/i
    ]);

    const executiveSummary = this._extractSectionContent(rawText, [
      /###\s*Synthèse & Recommandation/i,
      /###\s*Verdict global/i,
      /###\s*Executive Summary/i
    ]);

    return new ChannelAuditReport({
      channelTitle: channel.title || 'Créateur',
      channelHandle: channel.handle || '',
      subscribers: channel.subscribers || '',
      totalVideos: channel.videoCount || `${sampledVideos.length} vidéos analysées`,
      sampleSize: sampledVideos.length,
      globalScore: parsedScore,
      clickbaitIndex: parsedClickbait,
      proportions: stats.proportions,
      distribution: stats.distribution,
      trajectory: traj,
      trajectoryLabel: trajLabel,
      evaluatedVideos,
      strengths,
      weaknesses,
      drawbacks,
      temporalEvolution,
      executiveSummary,
      rawText
    });
  }

  static _parseEvaluatedVideos(rawText, sampledVideos) {
    const result = [];
    const blockMatch = rawText.match(/\[EVAL_VIDEOS\]([\s\S]*?)\[\/EVAL_VIDEOS\]/i);
    const content = blockMatch ? blockMatch[1] : rawText;

    const lines = content.split('\n');
    const parsedMap = new Map();

    for (const line of lines) {
      const cleanLine = line.trim().replace(/^\|\s*/, '').replace(/\s*\|$/, '');
      if (!cleanLine || cleanLine.startsWith('---') || cleanLine.startsWith(':--')) continue;

      // Format: index | score | clickbait | verdict | comment
      const parts = cleanLine.split('|').map(s => s.trim());
      if (parts.length >= 3) {
        const idx = parseInt(parts[0].replace(/[^0-9]/g, ''), 10);
        const score = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
        const clickbait = parseInt(parts[2].replace(/[^0-9]/g, ''), 10);
        const verdict = parts[3] || (score >= 75 ? 'Fiable' : score >= 50 ? 'Modéré' : 'Risque');
        const comment = parts[4] || '';

        if (!isNaN(idx) && !isNaN(score)) {
          parsedMap.set(idx, { score, clickbait: isNaN(clickbait) ? 20 : clickbait, verdict, comment });
        }
      }
    }

    sampledVideos.forEach((v, i) => {
      const idx = v.sampleIndex || (i + 1);
      const evalData = parsedMap.get(idx) || {
        score: 70,
        clickbait: 20,
        verdict: 'Non annoté',
        comment: ''
      };

      result.push({
        id: v.id,
        title: v.title || `Vidéo ${idx}`,
        url: v.url || `https://youtu.be/${v.id}`,
        meta: v.meta,
        era: v.era || 'recent',
        eraLabel: v.eraLabel || 'Récent',
        weight: v.weight || 1.0,
        score: evalData.score,
        clickbait: evalData.clickbait,
        verdict: evalData.verdict,
        comment: evalData.comment
      });
    });

    return result;
  }

  static _extractBulletSection(text, regexList) {
    for (const reg of regexList) {
      const match = text.match(new RegExp(`(?:${reg.source})[^\\n]*\\n([\\s\\S]*?)(?:###|$)`, 'i'));
      if (match && match[1]) {
        const lines = match[1].split('\n')
          .map(l => l.trim().replace(/^[-*•]\s*/, '').trim())
          .filter(l => l.length > 5 && !l.startsWith('#') && !l.startsWith('['));
        if (lines.length > 0) return lines;
      }
    }
    return [];
  }

  static _extractSectionContent(text, regexList) {
    for (const reg of regexList) {
      const match = text.match(new RegExp(`(?:${reg.source})[^\\n]*\\n([\\s\\S]*?)(?:###|$)`, 'i'));
      if (match && match[1]) {
        const cleaned = match[1].trim();
        if (cleaned.length > 10) return cleaned;
      }
    }
    return '';
  }
}

export default ChannelAuditReport;
