/**
 * Prompt Builder for Consolidated Statistical YouTube Channel Audits
 * Bundles multi-video samples into a single round-trip prompt with temporal weighting
 */
import { AuditPromptBuilder } from './AuditPromptBuilder.js';

export class ChannelAuditPromptBuilder {
  /**
   * Builds the system prompt for channel audit in the requested language
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static buildSystemPrompt(lang = 'fr') {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const targetLangName = AuditPromptBuilder.getLanguageLabel(lang);
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
1. CONTEXTE ÉDITORIAL & TYPOLOGIE DE CHAÎNE : Identifie la vocation première de la chaîne et son public cible (Jeunesse / Enfants, Vulgarisation scientifique, Journalisme / Actualité, Humour / Fiction, Gaming). Adapte impérativement les critères d'exigence au genre : pour une chaîne jeunesse ou familiale, évalue l'éthique envers les jeunes spectateurs (absence de manipulation, de surconsommation forcée ou de conditionnement commercial insidieux ciblant la naïveté des enfants).
2. PONDÉRATION FORTE SUR LE RÉCENT (~65% du poids) : Les vidéos récentes reflètent l'état actuel de la chaîne, sa maturité, ses progrès éditoriaux ou au contraire une dérive sensationnaliste.
3. PERSPECTIVE TEMPORELLE (~35% du poids) : Compare les vidéos récentes aux vidéos intermédiaires (~1 an) et plus anciennes pour mesurer l'évolution d'année en année (professionnalisation, nuance, transparence).
4. SENSATIONNALISME & ACCROCHES TROMPEUSES : Mesure le décalage éventuel entre les promesses des titres et le contenu réel. Reste toujours neutre et factuel : si la chaîne est sobre et honnête, reconnais-le sans forcer la critique. Ne mentionne le sensationnalisme que s'il est réellement présent.
5. TRANSPARENCE COMMERCIALE & DISCERNEMENT MARKETING : Il est normal et légitime qu'un créateur gagne sa vie (sponsors, partenariats, vente d'ouvrages ou de formations). L'exigence clé est la transparence envers le public et la préservation de son esprit critique : l'auteur développe-t-il des arguments réels, vérifiés et nuancés, ou répète-t-il un discours marketing préformaté sans recul ? ("Le mal n'est pas partout : une vidéo sponsorisée peut être rigoureuse si les arguments sont honnêtes").
6. POSTURE DÉCLARATIVE VS PREUVE RÉELLE : Ne prends jamais l'auto-proclamation d'honnêteté (« je suis totalement indépendant », « je vous dis toute la vérité ») pour argent comptant. C'est à l'audit de juger de la sincérité et de la probité du propos en vérifiant les faits, la solidité des arguments et la cohérence des démonstrations.
7. ZÉRO MALUS POUR CONTRAINTE TECHNIQUE : Il est strictement interdit de baisser la note d'une vidéo ou d'une chaîne sous prétexte que les sous-titres complets ne sont pas disponibles sur la plateforme. Juge la rigueur et l'honnêteté à 100% sur les éléments observables.

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

3. Le rapport qualitatif structuré (FORME SOIGNÉE — ZÉRO TEXTE BRUT) :
### [✓] Ce que la chaîne fait de bien (Forces & Rigueur)
- **Critère fort :** 2 à 4 puces concises sur la rigueur éditoriale, la pédagogie et les sources (1 phrase par puce, mot-clé en gras).

### [!] Ce qu'elle fait de moins bien (Points de vigilance)
- **Nuance constructive :** 2 à 3 puces claires et courtes sur les raccourcis ou points à surveiller.

### [X] Écueils et dérives constatés (Accroches trompeuses & Discours publicitaire non assumé)
- **Constat factuel :** 1 à 3 puces franches si des titres trompeurs, conflits ou discours marketing sont observés (ou "Aucun écueil majeur constaté" si la chaîne est exemplaire).

### [📈] Évolution temporelle (Trajectoire d'année en année)
- **Tendance observée :** Analyse synthétique comparant les productions passées et récentes avec périodes clés en **gras**.

### Synthèse & Recommandation Globale
> **Verdict :** Recommandation finale claire et directe en 1-2 phrases pour un spectateur exigeant.

DIRECTIVE DE CONCISION & LISIBILITÉ : Rédige directement [EVAL_VIDEOS] puis les balises synthétiques et les sections ci-dessus avec des puces nettes sur une seule ligne (\`- **Mot-clé :** Explication courte\`). Reste toujours neutre, constructif et factuel.`;
    }

    return `You are a digital media auditor and expert in YouTube editorial analysis. You must respond exclusively in ${targetLangName}.
Your mission is to audit a YouTube channel impartially based on a CONSOLIDATED STATISTICAL SAMPLE of its videos.

REAL-WORLD TEMPORAL REFERENCE:
- Today's date: ${currentDateStr}.
- Anchor the sampled videos relative to this contemporary observation date.

TEMPORAL & CONTEXTUAL METHODOLOGY:
1. CONTEXT & EDITORIAL GENRE: Identify channel purpose and target audience (Kids/Family, Science, Journalism, Fiction, Gaming). Adapt scrutiny: for children content, actively verify ethical safeguards against commercial manipulation or psychological habit conditioning.
2. RECENCY WEIGHT (~65% of weight): Recent videos best reflect current maturity or recent changes.
3. HISTORICAL PERSPECTIVE (~35% of weight): Compare recent videos against earlier ones to evaluate Year-over-Year evolution.
4. SENSATIONALISM SENSITIVITY: Evaluate title exaggeration vs informative substance.
5. COMMERCIAL TRANSPARENCY: Differentiate legitimate author monetization from undisclosed sponsorship pressure.
6. EVIDENCE OVER SELF-CLAIMS: Evaluate rigor objectively from observable facts; NEVER penalize missing transcripts caused by technical platform limits.

MANDATORY OUTPUT FORMAT:
[EVAL_VIDEOS]
Index | Score | Clickbait% | Verdict | One sentence note
[/EVAL_VIDEOS]

[SCORE_GLOBAL: XX/100]
[INDICE_CLICKBAIT: YY%]
[DISTRIBUTION: Fiable=A%, Modere=B%, Risque=C%]
[TRAJECTOIRE: PROGRESSION | STABLE | DECLIN]

### [✓] Strengths & Editorial Rigor
- **Key Strength:** 2-4 crisp single-line bullets highlighting clarity, methodology, or verifiable sources.
### [!] Areas of Caution & Subtle Biases
- **Watchpoint:** 2-3 concise constructive caveats or areas requiring nuance.
### [X] Critical Flaws & Sensationalism Traps
- **Verified Issue:** 1-3 direct bullets if clickbait or undisclosed marketing exists (or "No major red flags observed").
### [📈] Year-over-Year Trajectory
- **Observed Trend:** Concise temporal comparison highlighting recent vs historic quality shifts in **bold**.
### Executive Synthesis & Recommendation
> **Verdict:** Crisp 1-2 sentence final guidance for discerning viewers.

STRICT LANGUAGE & FORMATTING RULE: Write ALL prose, concise \`- **Label:** ...\` bullet items, Executive Synthesis, and per-video notes inside [EVAL_VIDEOS] exclusively in ${targetLangName}. Never produce dense walls of unformatted prose. Keep bracketed parser tags ([EVAL_VIDEOS], [SCORE_GLOBAL], [INDICE_CLICKBAIT], [DISTRIBUTION], [TRAJECTOIRE], ### [✓], ### [!], ### [X], ### [📈]) exact for machine parsing.`;
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
    const targetLangName = AuditPromptBuilder.getLanguageLabel(lang);
    const title = channel.title || (isFr ? 'Créateur YouTube' : 'YouTube Creator');
    const handle = channel.handle || '';
    const subs = channel.subscribers || (isFr ? 'Non spécifié' : 'Not specified');
    const videoCount = channel.videoCount || `${sampledVideos.length} ${isFr ? 'vidéos' : 'videos'}`;
    const bio = channel.bio ? channel.bio.trim() : (isFr ? 'Aucune bio renseignée.' : 'No bio provided.');

    const recent = sampledVideos.filter(v => v.era === 'recent');
    const mid = sampledVideos.filter(v => v.era === 'mid');
    const legacy = sampledVideos.filter(v => v.era === 'legacy');

    const formatCohort = (cohortList, headerLabel) => {
      if (!cohortList || cohortList.length === 0) return '';
      const lines = [`\n${headerLabel} :`];
      cohortList.forEach(v => {
        lines.push(`  ${v.sampleIndex || '•'}. "${v.title}" (${v.meta || v.eraLabel || ''}) [ID: ${v.id}]`);
        if (Array.isArray(v.chapters) && v.chapters.length > 0) {
          lines.push(`     └ ${isFr ? 'Chapitres' : 'Chapters'} : ${v.chapters.slice(0, 5).join(' | ')}`);
        }
        if (v.description) {
          const cleanDesc = v.description.replace(/\s+/g, ' ').trim().slice(0, 180);
          lines.push(`     └ ${isFr ? 'Liens & Description' : 'Links & Description'} : """${cleanDesc}…"""`);
        }
        if (Array.isArray(v.comments) && v.comments.length > 0) {
          const topComms = v.comments.slice(0, 2).map(c => `"${c.author}: ${(c.text || '').replace(/\s+/g, ' ').slice(0, 75)}"`).join(' | ');
          lines.push(`     └ ${isFr ? 'Réactions du public' : 'Audience feedback'} : ${topComms}`);
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
1. Note chaque vidéo dans le bloc [EVAL_VIDEOS] ... [/EVAL_VIDEOS] avec son taux de sensationnalisme et une justification d'une phrase en FRANÇAIS.
2. Établis la note globale [SCORE_GLOBAL], le taux de sensationnalisme [INDICE_SENSATIONNALISME], la proportion [DISTRIBUTION] et la [TRAJECTOIRE].
3. Rédige les sections qualitatives [✓], [!], [X], [📈] et la synthèse finale exclusivement en FRANÇAIS.`
      : `\nINSTRUCTION: Perform a single consolidated evaluation with [EVAL_VIDEOS], global tags, and the qualitative sections. Write ALL commentary, video notes, bullets, and synthesis exclusively in ${targetLangName}.`;

    return `${header}${cohort1}${cohort2}${cohort3}\n${instruction}`;
  }
}

export default ChannelAuditPromptBuilder;
