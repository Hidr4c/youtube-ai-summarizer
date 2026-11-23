/**
 * Global Extension Constants, Storage Keys & Action Enums
 */

export const ACTIONS = {
  STREAM_CHAT: 'STREAM_CHAT',
  FETCH_MODELS: 'FETCH_MODELS',
  PING_SERVER: 'PING_SERVER',
  FETCH_TIMEDTEXT: 'FETCH_TIMEDTEXT',
  EXTRACT_PAGE_TRANSCRIPT: 'EXTRACT_PAGE_TRANSCRIPT'
};

export const DEFAULT_URLS = {
  LMSTUDIO: 'http://localhost:1234',
  OLLAMA: 'http://localhost:11434'
};

export const FORMAT_MODES = {
  QUICK: 'quick',
  STANDARD: 'standard',
  DETAILED: 'detailed'
};

export const DEFAULT_SETTINGS = {
  aiProvider: 'lmstudio',
  targetLang: 'en',
  summaryMode: 'standard',
  serverUrl_lmstudio: 'http://localhost:1234',
  serverUrl_ollama: 'http://localhost:11434',
  temperature: '0.3',
  maxTokens: 'auto',
  localContextLength: 'auto',
  ttsSpeed: '1.0',
  autoSummarize: false,
  customPrompt: ''
};

export const LOCAL_CONTEXT_RANGE = { min: 0, max: 1048576, step: 1024 };

export const CHANNEL_AUDIT_LIMIT_OPTIONS = ['10', '15', '20', '30', '50', '100', '500', '1000', 'all'];
export const CHANNEL_AUDIT_NUMERIC_PRESETS = [10, 15, 20, 30, 50, 100, 500, 1000];
export const CHANNEL_AUDIT_ALL_CAP = 5000;

/**
 * Parses human-readable YouTube channel video counts ("37 vidéos", "1,5 k vidéos", "1,234 videos")
 * @param {string|number|null} rawValue
 * @returns {number|null}
 */
export function parseChannelVideoCount(rawValue) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
    return Math.floor(rawValue);
  }
  if (!rawValue || typeof rawValue !== 'string') return null;
  const match = rawValue.match(/([\d\s\u00a0\u202f.,]+)\s*([km])?\b/i);
  if (!match || !match[1]) return null;
  const rawNum = match[1].trim();
  const suffix = (match[2] || '').toLowerCase();
  if (suffix === 'k' || suffix === 'm') {
    const floatVal = parseFloat(rawNum.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
    if (Number.isNaN(floatVal) || floatVal <= 0) return null;
    return Math.round(floatVal * (suffix === 'k' ? 1000 : 1000000));
  }
  const intVal = parseInt(rawNum.replace(/[^\d]/g, ''), 10);
  return !Number.isNaN(intVal) && intVal > 0 ? intVal : null;
}

/**
 * Normalizes a requested channel audit video limit ('10'..'1000' or 'all')
 * @param {string|number} rawValue
 * @returns {{ key: string, numericLimit: number, fetchCap: number, isAll: boolean }}
 */
export function parseChannelAuditLimit(rawValue) {
  if (rawValue === 'all' || rawValue === Infinity) {
    return { key: 'all', numericLimit: Infinity, fetchCap: CHANNEL_AUDIT_ALL_CAP, isAll: true };
  }
  const parsed = parseInt(rawValue, 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return { key: String(parsed), numericLimit: parsed, fetchCap: parsed, isAll: false };
  }
  return { key: '30', numericLimit: 30, fetchCap: 30, isAll: false };
}

/**
 * Builds valid selector options constrained to channel total video count (< total) plus "Toutes (N) / All (N)".
 * Preserves all presets (10..1000) when total > 1000 or when total is not yet known.
 */
export function getChannelAuditOptionsForTotal(totalVideos = null, isFr = true) {
  const total = parseChannelVideoCount(totalVideos);
  const presets = (total && total > 0)
    ? CHANNEL_AUDIT_NUMERIC_PRESETS.filter((n) => n < total)
    : CHANNEL_AUDIT_NUMERIC_PRESETS;

  const suffix = isFr ? 'vidéos' : 'videos';
  const defTag = isFr ? ' (défaut)' : ' (default)';
  const opts = presets.map((n) => ({
    value: String(n),
    label: `${n} ${suffix}${n === 30 ? defTag : ''}`
  }));

  if (total && total > 0) {
    const formattedTotal = total >= 1000
      ? total.toLocaleString(isFr ? 'fr-FR' : 'en-US').replace(/[\u00a0\u202f]/g, ' ')
      : String(total);
    opts.push({
      value: 'all',
      label: isFr ? `Toutes (${formattedTotal})` : `All (${formattedTotal})`
    });
  } else {
    opts.push({
      value: 'all',
      label: isFr ? 'Toutes les vidéos' : 'All videos'
    });
  }
  return opts;
}

/**
 * Resolves effective option value when channel total is smaller than saved default.
 */
export function resolveEffectiveChannelLimit(selectedValue = 30, totalVideos = null) {
  const parsed = parseChannelAuditLimit(selectedValue);
  if (parsed.isAll) return 'all';
  const total = parseChannelVideoCount(totalVideos);
  if (total && total > 0 && parsed.numericLimit >= total) return 'all';
  return parsed.key;
}

/**
 * Renders standardized <option> elements for channel audit max videos selector
 */
export function renderChannelMaxOptionsHtml(selectedValue = 30, isFr = true, totalVideos = null) {
  const activeKey = resolveEffectiveChannelLimit(selectedValue, totalVideos);
  return getChannelAuditOptionsForTotal(totalVideos, isFr).map((opt) => {
    const isSel = opt.value === activeKey ? ' selected' : '';
    return `<option value="${opt.value}"${isSel}>${opt.label}</option>`;
  }).join('');
}

/**
 * Dynamically synchronizes an existing <select> element when channel video count resolves.
 */
export function syncChannelMaxSelectElement(selectEl, selectedValue = 30, isFr = true, totalVideos = null) {
  if (!selectEl) return null;
  const activeKey = resolveEffectiveChannelLimit(selectedValue, totalVideos);
  selectEl.innerHTML = renderChannelMaxOptionsHtml(activeKey, isFr, totalVideos);
  selectEl.value = activeKey;
  return activeKey;
}
