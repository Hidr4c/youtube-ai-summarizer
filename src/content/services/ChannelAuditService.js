import { ChannelStatisticalSampler } from '../../services/implementations/ChannelStatisticalSampler.js';
import { ChannelAuditPromptBuilder } from '../../services/implementations/ChannelAuditPromptBuilder.js';
import { ChannelAuditReport } from '../../domain/models/ChannelAuditReport.js';

/**
 * Service for orchestrating consolidated statistical channel audits
 * Analyzes multi-video samples in a single AI round-trip with recency weighting
 */
export class ChannelAuditService {
  /**
   * @param {Object} [dependencies]
   * @param {Object} [dependencies.channelManager]
   */
  constructor(dependencies = {}) {
    this.channelManager = dependencies.channelManager;
    this.cachedReports = new Map();
    this.currentPort = null;
    this.isAuditing = false;
  }

  /**
   * Retrieves cached audit report for a given channel query/handle
   * @param {string} query
   * @returns {ChannelAuditReport|null}
   */
  getCachedReport(query) {
    if (!query) return null;
    const key = String(query).trim().toLowerCase();
    return this.cachedReports.get(key) || null;
  }

  /**
   * Clears active in-memory cache
   */
  clearCache() {
    this.cachedReports.clear();
  }

  /**
   * Aborts ongoing channel audit stream
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
   * Executes a consolidated statistical audit for a channel
   * @param {Object} options
   * @param {string} options.channelQuery - Channel handle (@name) or URL
   * @param {string} [options.lang='fr']
   * @param {Object} options.state - InPageState instance
   * @param {Function} [options.onChunk] - Stream chunk callback
   * @param {Function} [options.onProgress] - Status update callback
   * @returns {Promise<ChannelAuditReport>}
   */
  async executeChannelAudit(options = {}) {
    const { channelQuery, period = 'all', lang = 'fr', state = {} } = options;
    if (!channelQuery) {
      throw new Error('Identifiant ou URL de chaîne manquant pour l’audit');
    }

    const cacheKey = `${String(channelQuery).trim().toLowerCase()}::${period}`;
    if (this.cachedReports.has(cacheKey)) {
      return this.cachedReports.get(cacheKey);
    }

    this.abortAudit();
    this.isAuditing = true;

    try {
      options.onProgress?.({
        step: 'fetch',
        percent: 10,
        message: 'Collecte du dossier de la chaîne et des vidéos...',
        detail: 'Recueil des métadonnées et descriptions (0 coupure)'
      });

      // 1. Fetch channel dossier & video catalog
      let channelData = null;
      if (this.channelManager && typeof this.channelManager.getOrFetchChannelDossier === 'function') {
        const res = await this.channelManager.getOrFetchChannelDossier(channelQuery, 30);
        if (res && res.success && res.channel) {
          channelData = res.channel;
        }
      }

      if (!channelData) {
        const bgRes = await new Promise((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage(
              { action: 'FETCH_CHANNEL_DOSSIER', query: channelQuery, limit: 30 },
              (res) => resolve(res || { success: false, error: 'No response' })
            );
          } else {
            resolve({ success: false, error: 'Runtime unavailable' });
          }
        });
        if (bgRes?.success && bgRes.channel) {
          channelData = bgRes.channel;
        } else {
          throw new Error(bgRes?.error || `Impossible de récupérer les vidéos pour : ${channelQuery}`);
        }
      }

      // 2. Select stratified statistical sample filtered by requested period
      options.onProgress?.({
        step: 'sample',
        percent: 18,
        message: 'Échantillonnage statistique (pondération temporelle)...',
        detail: `Sélection des vidéos représentatives (${period === 'all' ? 'récent ~65%, historique ~35%' : period})`
      });
      const allVideos = channelData.recentVideos || [];
      const filteredVideos = ChannelStatisticalSampler.filterVideosByPeriod(allVideos, period);
      const sampledVideos = ChannelStatisticalSampler.selectStratifiedSample(
        filteredVideos.length > 0 ? filteredVideos : allVideos,
        { maxSample: 10 }
      );

      if (sampledVideos.length === 0) {
        throw new Error('Aucune vidéo trouvée sur cette chaîne pour constituer un échantillon.');
      }

      // 2b. Enrich sample with rich dossiers (descriptions, chapters, sources)
      options.onProgress?.({
        step: 'enrich',
        percent: 21,
        message: `Collecte approfondie des ${sampledVideos.length} vidéos...`,
        detail: 'Recueil des descriptions, chapitres, sources et partenaires'
      });
      const videoIds = sampledVideos.map(v => v.id).filter(Boolean);
      if (videoIds.length > 0 && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const enrichRes = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'FETCH_BATCH_DOSSIERS', videoIds, lang }, (r) => {
              resolve(r || {});
            });
          });
          if (enrichRes?.success && enrichRes.dossiers) {
            sampledVideos.forEach(v => {
              const d = enrichRes.dossiers[v.id];
              if (d) {
                if (d.description) v.description = d.description;
                if (Array.isArray(d.chapters) && d.chapters.length > 0) v.chapters = d.chapters;
                if (d.hasCaptions !== undefined) v.hasCaptions = d.hasCaptions;
                if (Array.isArray(d.comments) && d.comments.length > 0) v.comments = d.comments;
              }
            });
          }
        } catch (_) {}
      }

      // 3. Build consolidated prompts
      options.onProgress?.({
        step: 'prompt',
        percent: 24,
        message: `Lancement de l'examen des ${sampledVideos.length} vidéos...`,
        detail: 'Préparation du dossier consolidé pour le modèle'
      });
      const systemPrompt = ChannelAuditPromptBuilder.buildSystemPrompt(lang);
      const userPrompt = ChannelAuditPromptBuilder.buildUserPrompt(channelData, sampledVideos, lang);

      // 4. Single consolidated streaming call to background
      const accumulatedText = await this._streamAI({
        systemPrompt,
        userPrompt,
        state,
        totalVideos: sampledVideos.length,
        onChunk: options.onChunk,
        onProgress: options.onProgress
      });

      // 5. Parse aggregate report
      const report = ChannelAuditReport.fromRawResponse(accumulatedText, {
        channel: channelData,
        sampledVideos
      });

      this.cachedReports.set(cacheKey, report);
      if (channelData.handle) {
        this.cachedReports.set(channelData.handle.toLowerCase(), report);
      }

      return report;
    } finally {
      this.isAuditing = false;
      this.currentPort = null;
    }
  }

  /**
   * Handles AI streaming via background port
   * @private
   */
  async _streamAI({ systemPrompt, userPrompt, state, totalVideos = 10, onChunk, onProgress }) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.connect) {
        return reject(new Error('Chrome runtime connect non disponible'));
      }

      const activeModel = typeof state?.getActiveModel === 'function'
        ? state.getActiveModel()
        : (state?.selectedModel || 'default');

      const port = chrome.runtime.connect({ name: 'ai_stream' });
      this.currentPort = port;

      let accumulated = '';
      let analyzedCount = 0;
      let isSynthesisStarted = false;

      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          if (msg.reasoning) {
            onProgress?.({
              step: 'thinking',
              percent: 26,
              message: `Examen approfondi des vidéos en cours...`,
              detail: 'Raisonnement critique du modèle sur les affirmations'
            });
          }
          if (msg.content) {
            accumulated += msg.content;
            onChunk?.(msg.content, accumulated);

            const evalMatches = accumulated.match(/(?:^|\n)\s*\d+\s*\|\s*\d+\s*\|/g);
            const currentCount = evalMatches ? evalMatches.length : 0;
            if (currentCount > analyzedCount) {
              analyzedCount = Math.min(totalVideos, currentCount);
            }

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

            onProgress?.({
              step: isSynthesisStarted ? 'synthesis' : 'evaluating',
              percent,
              message,
              detail
            });
          }
        } else if (msg.type === 'DONE') {
          onProgress?.({
            step: 'done',
            percent: 100,
            message: '✓ Examen de la chaîne terminé',
            detail: 'Rapport d\'intégrité et statistiques disponibles'
          });
          resolve(accumulated);
          resolve(accumulated);
        } else if (msg.type === 'ERROR') {
          reject(new Error(msg.error || 'Erreur lors de l’audit de la chaîne'));
        }
      });

      port.onDisconnect.addListener(() => {
        if (!accumulated && this.isAuditing) {
          reject(new Error('Connexion interrompue avec l’IA'));
        } else {
          resolve(accumulated);
        }
      });

      port.postMessage({
        action: 'START_STREAM',
        systemPrompt,
        userPrompt,
        provider: state?.currentProvider || 'lmstudio',
        model: activeModel,
        serverUrls: state?.serverUrls,
        apiKeys: state?.apiKeys
      });
    });
  }
}

export default ChannelAuditService;
