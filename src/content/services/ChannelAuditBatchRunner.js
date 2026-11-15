import { BatchPacker } from '../../services/implementations/BatchPacker.js';
import { ChannelAuditPromptBuilder } from '../../services/implementations/ChannelAuditPromptBuilder.js';
import { AuditPromptBuilder } from '../../services/implementations/AuditPromptBuilder.js';
import { ChannelAuditJobTracker } from './ChannelAuditJobTracker.js';

/**
 * Executes Map-Reduce batched channel audits when sample size exceeds single-prompt capacity.
 * Map phase evaluates greedy-packed cohorts (<= 23 videos per call) into [EVAL_VIDEOS] blocks;
 * Reduce phase aggregates statistical distributions and outliers into the final executive synthesis.
 */
export class ChannelAuditBatchRunner {
  static estimateVideoWeight(video = {}) {
    const titleLen = video.title?.length || 45;
    const descLen = video.description ? Math.min(180, video.description.length) : 0;
    const chapLen = Array.isArray(video.chapters) ? Math.min(180, video.chapters.join('|').length) : 0;
    return Math.max(520, titleLen + descLen + chapLen + 260);
  }

  /**
   * Packs videos into bounded prompt cohorts and runs Map -> Reduce evaluation.
   * @param {Object} params
   * @returns {Promise<string>} Combined raw response with all [EVAL_VIDEOS] blocks + Reduce synthesis
   */
  static async run({ channel, sampledVideos, lang = 'fr', state = {}, streamFn, onChunk, onProgress, signal = null }) {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const batches = BatchPacker.packGreedy(sampledVideos, (v) => this.estimateVideoWeight(v), 12000);
    const systemPrompt = ChannelAuditPromptBuilder.buildSystemPrompt(lang);

    const evalBlocks = [];
    const parsedEntries = [];

    for (let i = 0; i < batches.length; i++) {
      ChannelAuditJobTracker.throwIfAborted(signal, lang);
      const batch = batches[i];
      const pct = Math.min(82, 26 + Math.round(((i + 0.2) / Math.max(1, batches.length)) * 56));
      onProgress?.({
        step: 'batch',
        percent: pct,
        message: isFr
          ? `Analyse statistique lot ${i + 1}/${batches.length} (${sampledVideos.length} vidéos)...`
          : `Analyzing statistical batch ${i + 1}/${batches.length} (${sampledVideos.length} videos)...`,
        detail: isFr
          ? `${batch.length} vidéos dans ce lot (Map-Reduce multi-lots)`
          : `${batch.length} videos in this cohort (Map-Reduce)`
      });

      const batchPrompt = this._buildMapPrompt(channel, batch, i + 1, batches.length, lang);
      const rawBatch = await streamFn({
        systemPrompt,
        userPrompt: batchPrompt,
        state,
        totalVideos: batch.length,
        onChunk,
        onProgress: null,
        signal
      });
      ChannelAuditJobTracker.throwIfAborted(signal, lang);

      const block = this._extractEvalBlock(rawBatch);
      if (block) {
        evalBlocks.push(`[EVAL_VIDEOS]\n${block}\n[/EVAL_VIDEOS]`);
        parsedEntries.push(...this._parseQuickEntries(block));
      }
    }

    ChannelAuditJobTracker.throwIfAborted(signal, lang);
    onProgress?.({
      step: 'reduce',
      percent: 86,
      message: isFr
        ? `Synthèse globale sur ${sampledVideos.length} vidéos évaluées...`
        : `Synthesizing executive verdict across ${sampledVideos.length} videos...`,
      detail: isFr ? 'Consolidation statistique finale' : 'Final statistical consolidation'
    });

    const reducePrompt = this._buildReducePrompt(channel, sampledVideos.length, parsedEntries, lang);
    const reduceRaw = await streamFn({
      systemPrompt,
      userPrompt: reducePrompt,
      state,
      totalVideos: sampledVideos.length,
      onChunk,
      onProgress,
      signal
    });
    ChannelAuditJobTracker.throwIfAborted(signal, lang);

    const cleanedReduce = reduceRaw.replace(/\[EVAL_VIDEOS\][\s\S]*?\[\/EVAL_VIDEOS\]/gi, '').trim();
    return `${evalBlocks.join('\n\n')}\n\n${cleanedReduce}`;
  }

  static _buildMapPrompt(channel, batch, batchIndex, totalBatches, lang) {
    const basePrompt = ChannelAuditPromptBuilder.buildUserPrompt(channel, batch, lang);
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const targetLangName = AuditPromptBuilder.getLanguageLabel(lang);
    const suffix = isFr
      ? `\n\nMODE LOT (${batchIndex}/${totalBatches}) : Retourne UNIQUEMENT le bloc [EVAL_VIDEOS] ... [/EVAL_VIDEOS] en conservant l'Index exact de chaque vidéo fournie ci-dessus (Index | Score | Sensationnalisme% | Verdict | Note d'une phrase en FRANÇAIS). Ne génère pas [SCORE_GLOBAL] dans ce lot.`
      : `\n\nBATCH MODE (${batchIndex}/${totalBatches}): Output ONLY the [EVAL_VIDEOS] ... [/EVAL_VIDEOS] block preserving the exact provided Index numbers (Index | Score | Clickbait% | Verdict | One sentence note written exclusively in ${targetLangName}). Do NOT output [SCORE_GLOBAL] yet.`;
    return `${basePrompt}${suffix}`;
  }

  static _buildReducePrompt(channel, totalSampled, entries, lang) {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const targetLangName = AuditPromptBuilder.getLanguageLabel(lang);
    const scores = entries.map((e) => e.score);
    const clickbaits = entries.map((e) => e.clickbait);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
    const avgCb = clickbaits.length > 0 ? Math.round(clickbaits.reduce((a, b) => a + b, 0) / clickbaits.length) : 0;

    const sortedByScore = [...entries].sort((a, b) => a.score - b.score);
    const selectedDigest = entries.length <= 45
      ? entries
      : [...sortedByScore.slice(0, 15), ...sortedByScore.slice(-15), ...entries.slice(0, 15)];
    const uniqueDigest = Array.from(new Map(selectedDigest.map((e) => [e.raw, e.raw])).values());

    const digestLines = uniqueDigest.slice(0, 45).join('\n');
    return isFr
      ? `SYNTHÈSE FINALE D'AUDIT DE CHAÎNE (${channel.title || ''} ${channel.handle || ''}) :
- Volume total évalué : ${entries.length} / ${totalSampled} vidéos analysées par lots
- Moyenne brute observée : ${avgScore}/100 • Sensationnalisme moyen : ${avgCb}%

EXTRAIT REPRÉSENTATIF DES NOTATIONS PAR VIDÉO (Pires, Meilleures & Récentes) :
${digestLines}

CONSIGNE FINALE :
À partir de ces ${entries.length} évaluations réelles, produis UNIQUEMENT :
[SCORE_GLOBAL: ${avgScore}/100] (ajuste si la pondération récente/historique l'exige)
[INDICE_CLICKBAIT: ${avgCb}%]
[DISTRIBUTION: Fiable=A%, Modere=B%, Risque=C%]
[TRAJECTOIRE: PROGRESSION | STABLE | DECLIN]
Suivi exactement des 5 sections qualitatives rédigées en FRANÇAIS : ### [✓], ### [!], ### [X], ### [📈], ### Synthèse & Recommandation Globale. Ne répète pas [EVAL_VIDEOS].`
      : `FINAL CHANNEL AUDIT SYNTHESIS (${channel.title || ''} ${channel.handle || ''}):
- Total videos scored across batches: ${entries.length} / ${totalSampled}
- Observed raw mean score: ${avgScore}/100 • Mean sensationalism: ${avgCb}%

REPRESENTATIVE VIDEO SCORE DIGEST (Lowest, Highest & Recent):
${digestLines}

FINAL INSTRUCTION:
Based on these ${entries.length} evaluated videos, output ONLY:
[SCORE_GLOBAL: ${avgScore}/100]
[INDICE_CLICKBAIT: ${avgCb}%]
[DISTRIBUTION: Fiable=A%, Modere=B%, Risque=C%]
[TRAJECTOIRE: PROGRESSION | STABLE | DECLIN]
Followed by the 5 qualitative sections written 100% in ${targetLangName}: ### [✓], ### [!], ### [X], ### [📈], ### Executive Synthesis & Recommendation. Do not repeat [EVAL_VIDEOS].`;
  }

  static _extractEvalBlock(raw = '') {
    const match = String(raw).match(/\[EVAL_VIDEOS\]([\s\S]*?)\[\/EVAL_VIDEOS\]/i);
    if (match?.[1]) return match[1].trim();
    const pipeLines = String(raw)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\d+\s*\|\s*\d{1,3}/.test(l));
    return pipeLines.join('\n');
  }

  static _parseQuickEntries(block = '') {
    const entries = [];
    for (const line of String(block).split('\n')) {
      const m = line.trim().match(/^(\d+)\s*\|\s*(\d{1,3})\s*(?:%|\/100)?\s*\|\s*(\d{1,3})%?\s*\|\s*([^|]+)\|\s*(.+)$/);
      if (m) {
        entries.push({
          index: parseInt(m[1], 10),
          score: Math.max(0, Math.min(100, parseInt(m[2], 10))),
          clickbait: Math.max(0, Math.min(100, parseInt(m[3], 10))),
          raw: line.trim()
        });
      }
    }
    return entries;
  }
}

export default ChannelAuditBatchRunner;
