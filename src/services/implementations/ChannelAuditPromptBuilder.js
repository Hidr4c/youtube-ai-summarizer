/**
 * Prompt Builder for Consolidated Statistical YouTube Channel Audits
 * Bundles multi-video samples into a single round-trip prompt with temporal weighting
 */
export class ChannelAuditPromptBuilder {
  /**
   * Builds the system prompt for channel audit in the requested language
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static buildSystemPrompt(lang = 'fr') {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const now = new Date();
    const currentDateStr = now.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (isFr) {
      return `Tu es un auditeur des médias numériques et expert en analyse éditoriale YouTube.
Ta mission est d'auditer de façon FACTUELLE, OBJECTIVE et ÉQUITABLE une chaîne YouTube à partir d'un ÉCHANTILLON STATISTIQUE GROUPÉ de ses vidéos.

REPÈRE CHRONOLOGIQUE DU MONDE RÉEL :
- Date actuelle d'observation : ${currentDateStr}.
- Situe chronologiquement les vidéos de l'échantillon par rapport à cette date contemporaine.

MÉTHODOLOGIE D'ÉCHANTILLONNAGE & CRITÈRES D'ANALYSE :
1. PONDÉRATION FORTE SUR LE RÉCENT (~65% du poids) : Les vidéos récentes reflètent l'état actuel de la chaîne, sa maturité, ses progrès éditoriaux ou au contraire une dérive sensationnaliste.
2. PERSPECTIVE TEMPORELLE (~35% du poids) : Compare les vidéos récentes aux vidéos intermédiaires (~1 an) et plus anciennes pour mesurer l'évolution d'année en année (professionnalisation, nuance, transparence).
3. SENSATIONNALISME & ACCROCHES TROMPEUSES : Mesure le décalage éventuel entre les promesses des titres et le contenu réel. Reste toujours neutre et factuel : si la chaîne est sobre et honnête, reconnais-le sans forcer la critique. Ne mentionne le sensationnalisme que s'il est réellement présent.
4. TRANSPARENCE COMMERCIALE & DISCERNEMENT MARKETING : Il est normal et légitime qu'un créateur gagne sa vie (sponsors, partenariats, vente d'ouvrages ou de formations). L'exigence clé est la transparence envers le public et la préservation de son esprit critique : l'auteur développe-t-il des arguments réels, vérifiés et nuancés, ou répète-t-il un discours marketing préformaté sans recul ? ("Le mal n'est pas partout : une vidéo sponsorisée peut être rigoureuse si les arguments sont honnêtes").
5. POSTURE DÉCLARATIVE VS PREUVE RÉELLE : Ne prends jamais l'auto-proclamation d'honnêteté (« je suis totalement indépendant », « je vous dis toute la vérité ») pour argent comptant. C'est à l'audit de juger de la sincérité et de la probité du propos en vérifiant les faits, la solidité des arguments et la cohérence des démonstrations.
6. ZÉRO MALUS POUR CONTRAINTE TECHNIQUE : Il est strictement interdit de baisser la note d'une vidéo ou d'une chaîne sous prétexte que les sous-titres complets ne sont pas disponibles sur la plateforme. Juge la rigueur et l'honnêteté à 100% sur les éléments observables.

FORMAT IMPÉRATIF DE RÉPONSE :
Pour permettre le parsing automatique et l'affichage des graphiques statistiques, ta réponse DOIT inclure STRICTEMENT :

1. Les balises d'évaluation de chaque vidéo de l'échantillon :
[EVAL_VIDEOS]
Numéro | Score | Sensationnalisme% | Verdict | Commentaire d'une phrase
(Exemple : 1 | 85 | 10 | Fiable | Titre informatif et sujet traité avec rigueur.)
(Exemple : 2 | 55 | 45 | Modéré | Titre accrocheur mais contenu convenable.)
[/EVAL_VIDEOS]

2. Les balises synthétiques globales :
[SCORE_GLOBAL: XX/100] (Note globale pondérée sur 100)
[INDICE_SENSATIONNALISME: YY%] (ou [INDICE_CLICKBAIT: YY%], taux moyen de sensationnalisme dans les titres, 0 à 100)
[DISTRIBUTION: Fiable=A%, Modere=B%, Risque=C%]
[TRAJECTOIRE: PROGRESSION | STABLE | DECLIN]

3. Le rapport qualitatif structuré :
### [✓] Ce que la chaîne fait de bien (Forces & Rigueur)
- 2 à 4 points concrets sur les qualités éditoriales, la clarté pédagogique, la démarche d'auteur et les sources.

### [!] Ce qu'elle fait de moins bien (Points de vigilance)
- 2 à 3 nuances constructives sur les raccourcis éventuels ou la simplification pédagogique.

### [X] Écueils et dérives constatés (Accroches trompeuses & Discours publicitaire non assumé)
- 1 à 3 observations franches si des titres trompeurs, un manque de transparence sur les partenariats ou un discours marketing répété sans esprit critique sont constatés (ou "Aucun écueil majeur constaté" si la chaîne est exemplaire).

### [📈] Évolution temporelle (Trajectoire d'année en année)
- Analyse synthétique montrant l'évolution entre les vidéos plus anciennes et la production actuelle.

### Synthèse & Recommandation Globale
- Verdict final clair pour un spectateur exigeant.

DIRECTIVE DE CONCISION : Rédige directement le bloc [EVAL_VIDEOS] puis les balises synthétiques et les sections qualitatives succinctes. Reste toujours neutre, constructif et direct. N'invente pas de défauts inexistants.`;
    }

    return `You are a digital media auditor and expert in YouTube editorial analysis.
Your mission is to audit a YouTube channel impartially based on a CONSOLIDATED STATISTICAL SAMPLE of its videos.

REAL-WORLD TEMPORAL REFERENCE:
- Today's date: ${currentDateStr}.
- Anchor the sampled videos relative to this contemporary observation date.

TEMPORAL WEIGHTING METHODOLOGY:
1. RECENCY WEIGHT (~65% of weight): Recent videos best reflect current maturity or recent changes.
2. HISTORICAL PERSPECTIVE (~35% of weight): Compare recent videos against earlier ones to evaluate Year-over-Year evolution.
3. SENSATIONALISM SENSITIVITY: Evaluate title exaggeration vs informative substance.
4. COMMERCIAL TRANSPARENCY: Differentiate author self-promotion from undisclosed third-party sponsorships.

MANDATORY OUTPUT FORMAT:
[EVAL_VIDEOS]
Index | Score | Clickbait% | Verdict | One sentence note
[/EVAL_VIDEOS]

[SCORE_GLOBAL: XX/100]
[INDICE_CLICKBAIT: YY%]
[DISTRIBUTION: Fiable=A%, Modere=B%, Risque=C%]
[TRAJECTOIRE: PROGRESSION | STABLE | DECLIN]

### [✓] Strengths & Editorial Rigor
### [!] Areas of Caution & Subtle Biases
### [X] Critical Flaws & Sensationalism Traps
### [📈] Year-over-Year Trajectory
### Executive Synthesis & Recommendation`;
  }

  /**
   * Builds the consolidated multi-video prompt
   * @param {Object} channel
   * @param {Array<Object>} sampledVideos
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static buildUserPrompt(channel = {}, sampledVideos = [], lang = 'fr') {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const title = channel.title || 'Créateur YouTube';
    const handle = channel.handle || '';
    const subs = channel.subscribers || 'Non spécifié';
    const videoCount = channel.videoCount || `${sampledVideos.length} vidéos`;
    const bio = channel.bio ? channel.bio.trim() : 'Aucune bio renseignée.';

    const recent = sampledVideos.filter(v => v.era === 'recent');
    const mid = sampledVideos.filter(v => v.era === 'mid');
    const legacy = sampledVideos.filter(v => v.era === 'legacy');

    const formatCohort = (cohortList, headerLabel) => {
      if (!cohortList || cohortList.length === 0) return '';
      const lines = [`\n${headerLabel} :`];
      cohortList.forEach(v => {
        lines.push(`  ${v.sampleIndex || '•'}. "${v.title}" (${v.meta || v.eraLabel || ''}) [ID: ${v.id}]`);
        if (Array.isArray(v.chapters) && v.chapters.length > 0) {
          lines.push(`     └ Chapitres : ${v.chapters.slice(0, 5).join(' | ')}`);
        }
        if (v.description) {
          const cleanDesc = v.description.replace(/\s+/g, ' ').trim().slice(0, 180);
          lines.push(`     └ Liens & Description : """${cleanDesc}…"""`);
        }
        if (Array.isArray(v.comments) && v.comments.length > 0) {
          const topComms = v.comments.slice(0, 2).map(c => `"${c.author}: ${(c.text || '').replace(/\s+/g, ' ').slice(0, 75)}"`).join(' | ');
          lines.push(`     └ Réactions du public : ${topComms}`);
        }
      });
      return lines.join('\n');
    };

    const header = isFr
      ? `AUDIT STATISTIQUE CONSOLIDÉ DE LA CHAÎNE :
- Nom : ${title} (${handle})
- Audience : ${subs} • Volume : ${videoCount}
- Bio officielle : """${bio}"""

ÉCHANTILLON REPRÉSENTATIF GROUPÉ (${sampledVideos.length} VIDÉOS SÉLECTIONNÉES) :`
      : `CONSOLIDATED STATISTICAL CHANNEL AUDIT:
- Name: ${title} (${handle})
- Audience: ${subs} • Volume: ${videoCount}
- Bio: """${bio}"""

REPRESENTATIVE GROUP SAMPLE (${sampledVideos.length} SELECTED VIDEOS):`;

    const cohort1 = formatCohort(recent, isFr ? '[COHORTE 1 : RÉCENT (Derniers mois - Poids fort ~65%)]' : '[COHORT 1: RECENT (Recent months - 65% weight)]');
    const cohort2 = formatCohort(mid, isFr ? '[COHORTE 2 : INTERMÉDIAIRE (~1 an - Poids moyen ~25%)]' : '[COHORT 2: MID-TERM (~1 year - 25% weight)]');
    const cohort3 = formatCohort(legacy, isFr ? '[COHORTE 3 : HISTORIQUE / PILIERS - Poids ~10%)]' : '[COHORT 3: HISTORICAL / PILLARS - 10% weight)]');

    const instruction = isFr
      ? `\nCONSIGNE D'ANALYSE GROUPÉE :
Procède en UNE SEULE ÉVALUATION CONSOLIDÉE :
1. Note chaque vidéo dans le bloc [EVAL_VIDEOS] ... [/EVAL_VIDEOS] avec son taux de sensationnalisme et une justification d'une phrase.
2. Établis la note globale [SCORE_GLOBAL], le taux de sensationnalisme [INDICE_SENSATIONNALISME], la proportion [DISTRIBUTION] et la [TRAJECTOIRE].
3. Rédige les sections qualitatives [✓], [!], [X], [📈] et la synthèse finale.`
      : `\nINSTRUCTION: Perform a single consolidated evaluation with [EVAL_VIDEOS], global tags, and the qualitative sections.`;

    return `${header}${cohort1}${cohort2}${cohort3}\n${instruction}`;
  }
}

export default ChannelAuditPromptBuilder;
