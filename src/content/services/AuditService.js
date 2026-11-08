import { AuditPromptBuilder } from '../../services/implementations/AuditPromptBuilder.js';
import { AuditReport } from '../../domain/models/AuditReport.js';
import { YouTubeDOMContext } from './YouTubeDOMContext.js';
import { getVideoId } from '../ui/NavigationObserver.js';

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
   * Aborts ongoing audit stream
   */
  abortAudit() {
    if (this.currentPort) {
      try {
        this.currentPort.disconnect();
      } catch (_) {}
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
    this.isAuditing = true;

    try {
      options.onProgress?.({
        step: 'transcript',
        percent: 12,
        message: 'Collecte de la transcription intégrale (0 coupure)...',
        detail: 'Recueil des sous-titres et horodatages complets'
      });

      // 1. Ensure transcript is loaded (prefer dialogues, fallback cleanly to chapters)
      let transcriptText = '';
      let isDialogue = false;
      const cached = this.transcriptController?.cachedTranscript;
      if (cached && cached.videoId === videoId && cached.fullText && !cached.isChapterOnly) {
        transcriptText = cached.segments?.map(s => `[${s.timestamp}] ${s.text}`).join(' ') || cached.fullText;
        isDialogue = true;
      }

      if (!transcriptText) {
        const segments = await this.transcriptController?.extractYouTubeTranscript?.(lang, true);
        const updated = this.transcriptController?.cachedTranscript;
        if (segments && segments.length > 0 && !updated?.isChapterOnly) {
          transcriptText = segments.map(s => `[${s.timestamp}] ${s.text}`).join(' ');
          isDialogue = true;
        } else if (segments && segments.length > 0) {
          transcriptText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
          isDialogue = false;
        }
      }

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

      // 2. Fetch community comments signals
      options.onProgress?.({
        step: 'comments',
        percent: 22,
        message: 'Scan des signaux communautaires & commentaires...',
        detail: 'Analyse des commentaires et des liens en description'
      });
      let commentsBlock = '';
      if (this.commentsManager && typeof this.commentsManager.getOrFetchComments === 'function') {
        const commentsRes = await this.commentsManager.getOrFetchComments(videoId, 30).catch(() => null);
        if (commentsRes?.success && commentsRes.markdownDossier) {
          commentsBlock = commentsRes.markdownDossier;
        }
      }

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
        let accumulatedMarkdown = '';
        let reasoningChars = 0;
        const port = chrome.runtime.connect({ name: 'ai-stream' });
        this.currentPort = port;

        port.onMessage.addListener((msg) => {
          if (msg.type === 'CHUNK') {
            if (msg.reasoning) {
              reasoningChars += msg.reasoning.length;
              const approxTokens = Math.round(reasoningChars / 4);
              const reasonPct = Math.min(42, 28 + Math.round(approxTokens / 45));
              options.onProgress?.({
                step: 'reasoning',
                percent: reasonPct,
                message: `Réflexion critique du modèle (${approxTokens} tokens)...`,
                detail: 'Raisonnement sur la structure des arguments et des sources'
              });
            }
            const chunkText = msg.content || msg.text || '';
            if (chunkText) {
              accumulatedMarkdown += chunkText;
              const len = accumulatedMarkdown.length;
              const textPct = Math.min(46, Math.round((len / 2200) * 46));
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

              options.onProgress?.({
                step: 'streaming',
                percent,
                message,
                detail
              });
              options.onChunk?.(chunkText, accumulatedMarkdown);
            }
          } else if (msg.type === 'DONE') {
            this.isAuditing = false;
            this.currentPort = null;
            options.onProgress?.({
              step: 'done',
              percent: 100,
              message: '✓ Examen de la vidéo terminé',
              detail: 'Rapport d\'intégrité et score de fiabilité prêts'
            });

            // Extract reliability score [SCORE: XX/100]
            const scoreMatch = accumulatedMarkdown.match(/\[SCORE:\s*(\d{1,3})\/100\]/i);
            const reliabilityScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 80;

            let status = 'reliable';
            if (reliabilityScore < 50) status = 'manipulative';
            else if (reliabilityScore < 70) status = 'caution';

            const auditReport = new AuditReport({
              videoId,
              reliabilityScore,
              status,
              rawMarkdown: accumulatedMarkdown,
              lang,
              createdAt: Date.now()
            });

            this.cachedAudits.set(videoId, auditReport);
            options.onDone?.(auditReport);
            resolve(auditReport);
          } else if (msg.type === 'ERROR') {
            this.isAuditing = false;
            this.currentPort = null;
            const err = new Error(msg.error || 'Erreur lors de la génération de l’audit');
            options.onError?.(err);
            reject(err);
          }
        });

        port.onDisconnect.addListener(() => {
          if (this.isAuditing) {
            this.isAuditing = false;
            const err = new Error('Flux de connexion interrompu');
            options.onError?.(err);
            reject(err);
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
    }
  }
}

export default AuditService;
