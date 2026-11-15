import { AuditPromptBuilder } from '../../services/implementations/AuditPromptBuilder.js';
import { AuditReport } from '../../domain/models/AuditReport.js';
import { YouTubeDOMContext } from './YouTubeDOMContext.js';
import { getVideoId } from '../ui/NavigationObserver.js';
import { ChannelAuditJobTracker } from './ChannelAuditJobTracker.js';

/**
 * Service for orchestrating critical fact-checking & logic consistency audits
 */
export class AuditService {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.transcriptController
   * @param {Object} dependencies.videoCommentsManager
   * @param {Object} [dependencies.channelManager]
   */
  constructor(dependencies = {}) {
    this.transcriptController = dependencies.transcriptController;
    this.commentsManager = dependencies.videoCommentsManager;
    this.channelManager = dependencies.channelManager;
    this.cachedAudits = new Map();
    this.currentPort = null;
    this.isAuditing = false;
    this.activeAbortController = null;
  }

  /**
   * Retrieves cached audit report for a video ID
   * @param {string} videoId
   * @returns {AuditReport|null}
   */
  getCachedAudit(videoId) {
    if (!videoId) return null;
    return this.cachedAudits.get(String(videoId).trim()) || null;
  }

  /**
   * Resets active audit cache
   */
  clearCache() {
    this.cachedAudits.clear();
  }

  /**
   * Aborts ongoing audit stream and async steps
   * @param {string} [reason='stopped']
   */
  abortAudit(reason = 'stopped') {
    if (this.activeAbortController && !this.activeAbortController.signal.aborted) {
      try { this.activeAbortController.abort(reason); } catch (_) {}
    }
    if (this.currentPort) {
      try { this.currentPort.disconnect(); } catch (_) {}
      this.currentPort = null;
    }
    this.isAuditing = false;
  }

  /**
   * Executes a full critical logic & veracity audit for a video
   * @param {Object} options
   * @param {string} [options.videoId]
   * @param {string} [options.lang='fr']
   * @param {Object} options.state - InPageState instance
   * @param {Function} [options.onChunk]
   * @param {Function} [options.onDone]
   * @param {Function} [options.onError]
   * @param {Function} [options.onProgress]
   * @returns {Promise<AuditReport>}
   */
  async executeAudit(options = {}) {
    const videoId = options.videoId || getVideoId();
    if (!videoId) {
      throw new Error('Identifiant vidéo manquant pour l’audit');
    }

    const lang = options.lang || 'fr';
    const state = options.state || {};
    this.abortAudit();
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.activeAbortController = abortController;
    const signal = abortController?.signal || null;
    this.isAuditing = true;

    try {
      options.onProgress?.({ step: 'transcript', percent: 12, message: 'Collecte de la transcription intégrale (0 coupure)...', detail: 'Recueil des sous-titres et horodatages complets' });

      let transcriptText = '';
      let isDialogue = false;
      const cached = this.transcriptController?.cachedTranscript;
      if (cached && cached.videoId === videoId && cached.fullText && !cached.isChapterOnly) {
        transcriptText = cached.segments?.map(s => `[${s.timestamp}] ${s.text}`).join(' ') || cached.fullText;
        isDialogue = true;
      }

      if (!transcriptText) {
        const extractPromise = this.transcriptController?.extractYouTubeTranscript?.(lang, true);
        const segments = extractPromise ? await ChannelAuditJobTracker.raceWithAbort(extractPromise, signal, lang) : null;
        const updated = this.transcriptController?.cachedTranscript;
        if (segments && segments.length > 0 && !updated?.isChapterOnly) {
          transcriptText = segments.map(s => `[${s.timestamp}] ${s.text}`).join(' ');
          isDialogue = true;
        } else if (segments && segments.length > 0) {
          transcriptText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
          isDialogue = false;
        }
      }

      ChannelAuditJobTracker.throwIfAborted(signal, lang);

      if (!transcriptText) {
        const chapters = YouTubeDOMContext.extractChaptersFromDescription();
        if (chapters && chapters.length > 0) {
          transcriptText = chapters.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
          isDialogue = false;
        }
      }

      if (!transcriptText) {
        throw new Error('Données textuelles indisponibles pour réaliser l’audit (ni sous-titres, ni chapitrage disponible).');
      }

      options.onProgress?.({ step: 'comments', percent: 22, message: 'Scan des signaux communautaires & commentaires...', detail: 'Analyse des commentaires et des liens en description' });
      let commentsBlock = '';
      if (this.commentsManager && typeof this.commentsManager.getOrFetchComments === 'function') {
        const commentsRes = await ChannelAuditJobTracker.raceWithAbort(this.commentsManager.getOrFetchComments(videoId, 30).catch(() => null), signal, lang);
        if (commentsRes?.success && commentsRes.markdownDossier) {
          commentsBlock = commentsRes.markdownDossier;
        }
      }

      ChannelAuditJobTracker.throwIfAborted(signal, lang);

      // 3. Extract rich video metadata
      const videoMeta = YouTubeDOMContext.getVideoMetadata(this.transcriptController?.cachedVideoMetadata || {});

      // 4. Formulate audit prompts
      const systemPrompt = AuditPromptBuilder.buildSystemPrompt(lang);
      const userPrompt = AuditPromptBuilder.buildAuditUserPrompt({
        transcriptText,
        videoMeta,
        commentsBlock,
        lang,
        isDialogue
      });

      // 5. Connect and stream from background
      options.onProgress?.({
        step: 'streaming',
        percent: 28,
        message: 'Examen de la cohérence logique et véracité...',
        detail: 'Transmission du dossier intégral au modèle'
      });

      const provider = state.currentProvider || 'lmstudio';
      const activeModel = typeof state.getActiveModel === 'function' ? state.getActiveModel() : (state.selectedModel || '');
      const serverUrls = state.serverUrls || {};
      const serverUrl = serverUrls[provider] || '';
      const apiKeys = state.apiKeys || {};
      const apiKey = apiKeys[provider] || '';

      const report = await new Promise((resolve, reject) => {
        if (signal?.aborted) {
          this.isAuditing = false;
          reject(ChannelAuditJobTracker.createAbortError(lang));
          return;
        }
        let accumulatedMarkdown = '';
        let reasoningChars = 0;
        let settled = false;
        const port = chrome.runtime.connect({ name: 'ai-stream' });
        this.currentPort = port;

        const onAbort = () => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          this.isAuditing = false;
          if (this.currentPort === port) this.currentPort = null;
          try { port.disconnect(); } catch (_) {}
          reject(ChannelAuditJobTracker.createAbortError(lang));
        };
        signal?.addEventListener('abort', onAbort, { once: true });

        const finishResolve = (rep) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          this.isAuditing = false;
          this.currentPort = null;
          options.onDone?.(rep);
          resolve(rep);
        };

        const finishReject = (err) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          this.isAuditing = false;
          this.currentPort = null;
          options.onError?.(err);
          reject(err);
        };

        port.onMessage.addListener((msg) => {
          if (settled) return;
          if (msg.type === 'CHUNK') {
            if (msg.reasoning) {
              reasoningChars += msg.reasoning.length;
              const approxTokens = Math.round(reasoningChars / 4);
              options.onProgress?.({
                step: 'reasoning',
                percent: Math.min(42, 28 + Math.round(approxTokens / 45)),
                message: `Réflexion critique du modèle (${approxTokens} tokens)...`,
                detail: 'Raisonnement sur la structure des arguments et des sources'
              });
            }
            const chunkText = msg.content || msg.text || '';
            if (chunkText) {
              accumulatedMarkdown += chunkText;
              const textPct = Math.min(46, Math.round((accumulatedMarkdown.length / 2200) * 46));
              let percent = Math.min(88, 42 + textPct);
              let message = 'Examen critique : cohérence logique et véracité...';
              let detail = 'Contrôle des affirmations et recherche des sophismes';

              if (accumulatedMarkdown.includes('[SCORE') || accumulatedMarkdown.includes('Synthèse')) {
                percent = Math.max(percent, 92);
                message = 'Examen final & calcul du score de fiabilité...';
                detail = 'Synthèse des forces, faiblesses et verdict d\'intégrité';
              } else if (accumulatedMarkdown.match(/affiliation|partenariat|commission|vendeur/i)) {
                message = 'Examen critique : transparence commerciale...';
                detail = 'Détection de promotion non déclarée ou liens avec commission';
              } else if (accumulatedMarkdown.match(/source|étude|chiffre|statistique/i)) {
                message = 'Examen critique : rigueur des sources et citations...';
                detail = 'Vérification de l\'exactitude des références et données';
              }

              options.onProgress?.({ step: 'streaming', percent, message, detail });
              options.onChunk?.(chunkText, accumulatedMarkdown);
            }
          } else if (msg.type === 'DONE') {
            options.onProgress?.({ step: 'done', percent: 100, message: '✓ Examen de la vidéo terminé', detail: 'Rapport d\'intégrité et score de fiabilité prêts' });
            const scoreMatch = accumulatedMarkdown.match(/\[SCORE:\s*(\d{1,3})\/100\]/i);
            const reliabilityScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 80;
            const status = reliabilityScore < 50 ? 'manipulative' : reliabilityScore < 70 ? 'caution' : 'reliable';
            const auditReport = new AuditReport({ videoId, reliabilityScore, status, rawMarkdown: accumulatedMarkdown, lang, createdAt: Date.now() });
            this.cachedAudits.set(videoId, auditReport);
            finishResolve(auditReport);
          } else if (msg.type === 'ERROR') {
            finishReject(new Error(msg.error || 'Erreur lors de la génération de l’audit'));
          }
        });

        port.onDisconnect.addListener(() => {
          if (settled) return;
          if (signal?.aborted || !this.isAuditing) {
            onAbort();
          } else {
            finishReject(new Error('Flux de connexion interrompu'));
          }
        });

        port.postMessage({
          action: 'START_STREAM',
          provider,
          serverUrl,
          apiKey,
          model: activeModel,
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: '0.2',
          maxTokens: 'auto'
        });
      });

      return report;
    } catch (err) {
      this.isAuditing = false;
      this.currentPort = null;
      throw err;
    } finally {
      if (this.activeAbortController === abortController) {
        this.activeAbortController = null;
      }
    }
  }
}

export default AuditService;
