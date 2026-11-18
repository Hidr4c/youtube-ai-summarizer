/**
 * Classifies and formats Cloud AI HTTP errors (JSON objects, Google array-wrapped payloads, Anthropic errors).
 */
export class CloudErrorClassifier {
  /**
   * Unwraps error message text from either JSON objects or array-wrapped error payloads.
   * @param {string} [rawText='']
   * @returns {string}
   */
  static extractErrorDetail(rawText = '') {
    const clean = String(rawText || '').trim();
    if (!clean) return '';
    try {
      const rawParsed = JSON.parse(clean);
      const item = Array.isArray(rawParsed) ? rawParsed[0] : rawParsed;
      return String(item?.error?.message || item?.message || clean).trim();
    } catch (_) {
      return clean;
    }
  }

  /**
   * Detects HTTP status/payload indicating an invalid or unauthorized API key.
   * @param {number} status
   * @param {string} [errText='']
   * @returns {boolean}
   */
  static isAuthError(status, errText = '') {
    const raw = String(errText || '').toLowerCase();
    const msg = CloudErrorClassifier.extractErrorDetail(errText).toLowerCase();
    return status === 401 || status === 403
      || /(?:api key not valid|api_key_invalid|invalid_api_key|authentication_error|unauthorized|permission_denied|clé api refusée)/.test(`${msg} ${raw}`);
  }

  /**
   * Detects temporary server overload / high-demand errors suitable for alternate-model failover.
   * @param {number} status
   * @param {string} [errText='']
   * @returns {boolean}
   */
  static isTransientOverloadError(status, errText = '') {
    const raw = String(errText || '').toLowerCase();
    const msg = CloudErrorClassifier.extractErrorDetail(errText).toLowerCase();
    return status === 502 || status === 503 || status === 504 || status === 529
      || /(?:unavailable|high demand|overloaded|overloaded_error|try again later|service unavailable)/.test(`${msg} ${raw}`);
  }

  /**
   * Detects HTTP status/payload indicating a retired, decommissioned, or unknown model ID.
   * @param {number} status
   * @param {string} [errText='']
   * @returns {boolean}
   */
  static isRetiredModelError(status, errText = '') {
    const raw = String(errText || '').toLowerCase();
    const msg = CloudErrorClassifier.extractErrorDetail(errText).toLowerCase();
    if (status === 404 || status === 410) return true;
    return (status === 400 || status === 422)
      && /(?:not found|not_found_error|decommissioned|deprecated|not supported for generatecontent|does not exist|model_not_found)/.test(`${msg} ${raw}`);
  }

  /**
   * Classifies HTTP error into UI badge category ('auth' | 'busy' | 'other').
   * @param {number} status
   * @param {string} [errText='']
   * @returns {'auth'|'busy'|'other'}
   */
  static classifyHttpError(status, errText = '') {
    if (CloudErrorClassifier.isAuthError(status, errText)) return 'auth';
    if (CloudErrorClassifier.isTransientOverloadError(status, errText) || status === 429) return 'busy';
    return 'other';
  }

  /**
   * Parses raw provider HTTP error payload into a concise, actionable user message.
   * @param {string} provider
   * @param {number} status
   * @param {string} [errText='']
   * @returns {string}
   */
  static formatHttpError(provider, status, errText = '') {
    const tag = String(provider || 'AI').toUpperCase();
    const detail = CloudErrorClassifier.extractErrorDetail(errText);

    if (CloudErrorClassifier.isAuthError(status, detail)) {
      return `Erreur ${tag} (${status}) : Clé API refusée ou invalide. Vérifiez ou régénérez votre clé API. Détail : ${detail}`;
    }
    if (CloudErrorClassifier.isTransientOverloadError(status, detail)) {
      return `Serveur ${tag} temporairement saturé (${status} — forte demande). Réessayez dans un instant ou choisissez un autre modèle (ex. flash-lite). Détail : ${detail}`;
    }
    if (status === 429 || /resource_exhausted|rate limit|quota/i.test(detail)) {
      return `Quota / limite atteinte sur ${tag} (${status}). Patientez un instant ou essayez un modèle plus léger (ex. flash-lite). Détail : ${detail}`;
    }
    if (CloudErrorClassifier.isRetiredModelError(status, detail)) {
      return `Modèle introuvable ou retiré sur ${tag} (${status}). Sélectionnez un autre modèle ou actualisez la liste dans Réglages. Détail : ${detail}`;
    }
    return `Erreur ${tag} (${status}) : ${detail || 'HTTP Error'}`;
  }
}

export default CloudErrorClassifier;
