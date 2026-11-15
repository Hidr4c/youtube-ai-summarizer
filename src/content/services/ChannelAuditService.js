import { ChannelStatisticalSampler } from '../../services/implementations/ChannelStatisticalSampler.js';
import { ChannelAuditPromptBuilder } from '../../services/implementations/ChannelAuditPromptBuilder.js';
import { ChannelAuditReport } from '../../domain/models/ChannelAuditReport.js';
import { parseChannelAuditLimit } from '../../config/ExtensionConstants.js';
import { ChannelAuditBatchRunner } from './ChannelAuditBatchRunner.js';
import { ChannelAuditJobTracker } from './ChannelAuditJobTracker.js';
import { ChannelAuditStreamClient } from './ChannelAuditStreamClient.js';

/**
 * Orchestrates consolidated statistical channel audits with SPA navigation recovery,
 * instant cancellation via AbortSignal, and persisted report hydration.
 */
export class ChannelAuditService {
  constructor(dependencies = {}) {
    this.channelManager = dependencies.channelManager;
    this.cachedReports = new Map();
    this.listeners = new Set();
    this.activeJob = null;
    this.currentPort = null;
    this.isAuditing = false;
    this._hydratedPromise = ChannelAuditJobTracker.hydrateReports(this.cachedReports);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(event) {
    for (const fn of this.listeners) {
      try { fn(event); } catch (_) {}
    }
  }

  getActiveJob(channelQuery = null) {
    if (!this.activeJob || this.activeJob.status !== 'running') return null;
    if (!channelQuery) return this.activeJob;
    const targetKey = ChannelAuditJobTracker.normalizeKey(channelQuery);
    if (!targetKey) return null;
    return (this.activeJob.channelKey === targetKey || this.activeJob.handleKey === targetKey)
      ? this.activeJob
      : null;
  }

  isAuditRunning(channelQuery = null) {
    return Boolean(this.getActiveJob(channelQuery));
  }

  async ensureHydrated() {
    if (this._hydratedPromise) await this._hydratedPromise.catch(() => {});
  }

  getCachedReport(query, period = null, maxVideos = null) {
    if (!query) return null;
    const key = String(query).trim().toLowerCase();
    const norm = ChannelAuditJobTracker.normalizeKey(query);
    if (period !== null || maxVideos !== null) {
      const parsed = parseChannelAuditLimit(maxVideos ?? 30);
      return this.cachedReports.get(`${key}::${period || 'all'}::${parsed.key}`)
        || (norm ? this.cachedReports.get(`${norm}::${period || 'all'}::${parsed.key}`) : null)
        || null;
    }
    return this.cachedReports.get(key) || (norm ? this.cachedReports.get(norm) : null) || null;
  }

  clearCache() {
    this.cachedReports.clear();
    ChannelAuditJobTracker.clearPersistedReports();
  }

  abortAudit(reason = 'stopped') {
    if (this.activeJob) {
      this.activeJob.abortReason = reason;
      this.activeJob.status = 'aborted';
      try { this.activeJob.abortController?.abort(reason); } catch (_) {}
    }
    if (this.currentPort) {
      try { this.currentPort.disconnect(); } catch (_) {}
      this.currentPort = null;
    }
    this.isAuditing = false;
  }

  async executeChannelAudit(options = {}) {
    const { channelQuery, period = 'all', lang = 'fr', state = {} } = options;
    const parsedLimit = parseChannelAuditLimit(options.maxVideos ?? state.channelAuditMaxVideos ?? 30);
    const maxSample = parsedLimit.fetchCap;
    const fetchLimit = parsedLimit.isAll ? parsedLimit.fetchCap : (period !== 'all' ? Math.max(90, maxSample) : Math.max(30, maxSample));
    if (!channelQuery) throw new Error('Identifiant ou URL de chaîne manquant pour l’audit');

    await this.ensureHydrated();
    const qNorm = String(channelQuery).trim().toLowerCase();
    const channelKey = ChannelAuditJobTracker.normalizeKey(channelQuery) || qNorm;
    const cacheKey = `${channelKey}::${period}::${parsedLimit.key}`;
    const existing = this.getCachedReport(channelQuery, period, parsedLimit.key);
    if (existing) return existing;

    this.abortAudit('superseded');
    const abortController = new AbortController();
    const signal = abortController.signal;
    const job = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelQuery,
      channelKey,
      handleKey: channelKey,
      period,
      maxVideos: parsedLimit.key,
      lang,
      status: 'running',
      progress: {
        step: 'fetch',
        percent: 8,
        message: lang.startsWith('fr') ? 'Collecte du dossier de la chaîne...' : 'Fetching channel catalog...',
        detail: parsedLimit.isAll ? (lang.startsWith('fr') ? 'Indexation du catalogue complet' : 'Full catalog indexing') : `${maxSample} max`
      },
      abortController,
      startedAt: Date.now()
    };
    this.activeJob = job;
    this.isAuditing = true;

    const emitProgress = (p) => {
      if (!p || signal.aborted || this.activeJob?.id !== job.id) return;
      job.progress = { ...p };
      options.onProgress?.(job.progress);
      this._emit({ type: 'progress', job, progress: job.progress });
    };
    this._emit({ type: 'started', job, progress: job.progress });

    try {
      emitProgress(job.progress);
      const channelData = await ChannelAuditJobTracker.raceWithAbort(
        this._resolveChannelDossier(channelQuery, fetchLimit),
        signal,
        lang
      );
      ChannelAuditJobTracker.throwIfAborted(signal, lang);
      if (channelData.handle) {
        job.handleKey = ChannelAuditJobTracker.normalizeKey(channelData.handle) || job.channelKey;
      }

      emitProgress({
        step: 'sample',
        percent: 18,
        message: lang.startsWith('fr') ? 'Échantillonnage statistique (pondération temporelle)...' : 'Statistical stratified sampling...',
        detail: `${period === 'all' ? 'récent ~65%, historique ~35%' : period}`
      });
      const allVideos = channelData.recentVideos || [];
      const filteredVideos = ChannelStatisticalSampler.filterVideosByPeriod(allVideos, period);
      const sampledVideos = ChannelStatisticalSampler.selectStratifiedSample(
        filteredVideos.length > 0 ? filteredVideos : allVideos,
        { maxSample }
      );
      if (sampledVideos.length === 0) throw new Error('Aucune vidéo trouvée sur cette chaîne pour constituer un échantillon.');

      await this._enrichSampledVideos(sampledVideos, lang, emitProgress, signal);
      ChannelAuditJobTracker.throwIfAborted(signal, lang);

      let accumulatedText = '';
      if (sampledVideos.length > 30) {
        accumulatedText = await ChannelAuditBatchRunner.run({
          channel: channelData,
          sampledVideos,
          lang,
          state,
          streamFn: (params) => this._streamAI(params),
          onChunk: options.onChunk,
          onProgress: emitProgress,
          signal
        });
      } else {
        emitProgress({
          step: 'prompt',
          percent: 24,
          message: `Lancement de l'examen des ${sampledVideos.length} vidéos...`,
          detail: 'Préparation du dossier consolidé pour le modèle'
        });
        accumulatedText = await this._streamAI({
          systemPrompt: ChannelAuditPromptBuilder.buildSystemPrompt(lang),
          userPrompt: ChannelAuditPromptBuilder.buildUserPrompt(channelData, sampledVideos, lang),
          state,
          totalVideos: sampledVideos.length,
          onChunk: options.onChunk,
          onProgress: emitProgress,
          signal
        });
      }
      ChannelAuditJobTracker.throwIfAborted(signal, lang);

      const exactChannelTotal = channelData.totalChannelVideos || (channelData.hasMore === false ? allVideos.length : null);
      const report = ChannelAuditReport.fromRawResponse(accumulatedText, {
        channel: channelData,
        sampledVideos,
        totalAvailable: exactChannelTotal || allVideos.length,
        requestedLimit: parsedLimit.key,
        lang
      });
      report.channelTotalVideos = exactChannelTotal;

      this._storeReport(cacheKey, qNorm, channelKey, period, parsedLimit.key, channelData.handle, report);

      job.status = 'completed';
      if (this.activeJob?.id === job.id) this.activeJob = null;
      this.isAuditing = false;
      this._emit({ type: 'completed', job, report });
      return report;
    } catch (err) {
      if (this.activeJob?.id === job.id) {
        this.activeJob = null;
        this.isAuditing = false;
        this.currentPort = null;
      }
      if (ChannelAuditJobTracker.isAbortError(err)) {
        job.status = 'aborted';
        if (job.abortReason !== 'superseded') this._emit({ type: 'aborted', job, error: err });
        throw err;
      }
      job.status = 'error';
      this._emit({ type: 'error', job, error: err });
      throw err;
    }
  }

  _storeReport(cacheKey, qNorm, channelKey, period, limitKey, handle, report) {
    this.cachedReports.set(cacheKey, report);
    this.cachedReports.set(`${qNorm}::${period}::${limitKey}`, report);
    this.cachedReports.set(qNorm, report);
    this.cachedReports.set(channelKey, report);
    if (handle) {
      const handleLower = handle.toLowerCase();
      this.cachedReports.set(`${handleLower}::${period}::${limitKey}`, report);
      this.cachedReports.set(handleLower, report);
    }
    ChannelAuditJobTracker.persistReport(cacheKey, channelKey, report);
  }

  async _resolveChannelDossier(channelQuery, fetchLimit) {
    if (typeof this.channelManager?.getOrFetchChannelDossier === 'function') {
      const res = await this.channelManager.getOrFetchChannelDossier(channelQuery, fetchLimit);
      if (res?.success && res.channel) return res.channel;
    }
    const bgRes = await new Promise((res) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: 'FETCH_CHANNEL_DOSSIER', query: channelQuery, limit: fetchLimit }, (r) => res(r || {}));
      } else {
        res({ success: false, error: 'Runtime unavailable' });
      }
    });
    if (!bgRes?.success || !bgRes.channel) throw new Error(bgRes?.error || `Impossible de récupérer les vidéos pour : ${channelQuery}`);
    return bgRes.channel;
  }

  async _enrichSampledVideos(sampledVideos, lang, emitProgress, signal) {
    const enrichPool = sampledVideos.length <= 35
      ? sampledVideos
      : sampledVideos.filter((_, i) => i % Math.ceil(sampledVideos.length / 35) === 0).slice(0, 35);
    emitProgress({
      step: 'enrich',
      percent: 21,
      message: `Collecte approfondie (${enrichPool.length}/${sampledVideos.length} vidéos)...`,
      detail: 'Recueil des descriptions, chapitres et signaux éditoriaux'
    });
    const videoIds = enrichPool.map((v) => v.id).filter(Boolean);
    if (videoIds.length === 0 || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    try {
      const enrichPromise = new Promise((res) => chrome.runtime.sendMessage(
        { action: 'FETCH_BATCH_DOSSIERS', videoIds, lang, includeComments: sampledVideos.length <= 30 },
        (r) => res(r || {})
      ));
      const enrichRes = await ChannelAuditJobTracker.raceWithAbort(enrichPromise, signal, lang);
      if (enrichRes?.success && enrichRes.dossiers) {
        enrichPool.forEach((v) => {
          const d = enrichRes.dossiers[v.id];
          if (d) Object.assign(v, { description: d.description || v.description, chapters: d.chapters || v.chapters, hasCaptions: d.hasCaptions ?? v.hasCaptions, comments: d.comments || v.comments });
        });
      }
    } catch (err) {
      if (ChannelAuditJobTracker.isAbortError(err)) throw err;
    }
  }

  _streamAI(params) {
    return ChannelAuditStreamClient.stream({
      ...params,
      onPortCreated: (p) => { this.currentPort = p; }
    });
  }
}

export default ChannelAuditService;
