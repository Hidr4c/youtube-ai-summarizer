import { ChannelAuditJobTracker } from './ChannelAuditJobTracker.js';
import { QuickOnboardingHelper } from './QuickOnboardingHelper.js';

/**
 * Runtime Streaming Client for Channel Audits via Chrome MV3 Port (`ai-stream`)
 * Supports clean AbortSignal cancellation without resolving truncated streams.
 */
export class ChannelAuditStreamClient {
  /**
   * Streams an AI channel evaluation prompt and tracks line-by-line video progress
   * @param {Object} params
   * @returns {Promise<string>}
   */
  static stream({ systemPrompt, userPrompt, state, totalVideos = 10, onChunk, onProgress, signal = null, onPortCreated = null }) {
    const lang = state?.currentLang || 'fr';
    if (signal?.aborted) return Promise.reject(ChannelAuditJobTracker.createAbortError(lang));

    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.connect) {
        return reject(new Error('Chrome runtime connect non disponible'));
      }

      const provider = state?.currentProvider || 'lmstudio';
      let activeModel = typeof state?.getActiveModel === 'function' ? state.getActiveModel() : (state?.selectedModel || '');
      if (!activeModel && state?.availableLocalModels?.[provider]?.length > 0) {
        const first = state.availableLocalModels[provider][0];
        activeModel = first?.id || first?.name || '';
      }

      const port = chrome.runtime.connect({ name: 'ai-stream' });
      onPortCreated?.(port);

      let accumulated = '';
      let analyzedCount = 0;
      let isSynthesisStarted = false;
      let settled = false;

      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
        onPortCreated?.(null);
      };
      const finishReject = (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };
      const finishResolve = (val) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(val);
      };
      const onAbort = () => {
        try { port.disconnect(); } catch (_) {}
        finishReject(ChannelAuditJobTracker.createAbortError(lang));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      port.onMessage.addListener((msg) => {
        if (settled || signal?.aborted) return;
        if (msg.type === 'CHUNK') {
          if (msg.reasoning) {
            onProgress?.({
              step: 'thinking',
              percent: 26,
              message: 'Examen approfondi des vidéos en cours...',
              detail: 'Raisonnement critique du modèle sur les affirmations'
            });
          }
          if (msg.content) {
            accumulated += msg.content;
            onChunk?.(msg.content, accumulated);

            const evalMatches = accumulated.match(/(?:^|\n)\s*\d+\s*\|\s*\d+\s*\|/g);
            const currentCount = evalMatches ? evalMatches.length : 0;
            if (currentCount > analyzedCount) analyzedCount = Math.min(totalVideos, currentCount);

            const basePct = 26 + Math.round((analyzedCount / totalVideos) * 62);
            const microBonus = Math.min(3, Math.round(((accumulated.length % 500) / 500) * 3));
            let percent = Math.min(88, basePct + microBonus);
            let message = `Examen des vidéos (${analyzedCount} / ${totalVideos} analysées)`;
            let detail = 'Examen de la rigueur des faits, des sources et de la transparence commerciale';

            if (!isSynthesisStarted && (accumulated.includes('[SCORE_GLOBAL') || accumulated.includes('### [✓]') || accumulated.includes('### Synthèse'))) {
              isSynthesisStarted = true;
            }
            if (isSynthesisStarted) {
              percent = Math.max(percent, 92);
              message = 'Examen final & calcul du score global de la chaîne';
              detail = `Synthèse des ${totalVideos} vidéos, forces et trajectoire d'évolution`;
            }
            onProgress?.({ step: isSynthesisStarted ? 'synthesis' : 'evaluating', percent, message, detail });
          }
        } else if (msg.type === 'MODEL_RESOLVED') {
          QuickOnboardingHelper.syncResolvedModel(state, msg.provider || provider, msg.model);
        } else if (msg.type === 'DONE') {
          onProgress?.({
            step: 'done',
            percent: 100,
            message: '✓ Examen de la chaîne terminé',
            detail: 'Rapport d\'intégrité et statistiques disponibles'
          });
          finishResolve(accumulated);
        } else if (msg.type === 'ERROR') {
          finishReject(new Error(msg.error || 'Erreur lors de l’audit de la chaîne'));
        }
      });

      port.onDisconnect.addListener(() => {
        if (settled) return;
        if (signal?.aborted) return onAbort();
        if (!accumulated) return finishReject(new Error('Connexion interrompue avec l’IA'));
        finishResolve(accumulated);
      });

      const serverUrl = state?.serverUrls?.[provider] || state?.serverUrl || '';
      const apiKey = state?.apiKeys?.[provider] || state?.apiKey || '';
      port.postMessage({
        action: 'START_STREAM',
        systemPrompt,
        userPrompt,
        provider,
        model: activeModel,
        serverUrl,
        serverUrls: state?.serverUrls,
        apiKey,
        apiKeys: state?.apiKeys,
        messages: [{ role: 'user', content: userPrompt }]
      });
    });
  }
}

export default ChannelAuditStreamClient;
