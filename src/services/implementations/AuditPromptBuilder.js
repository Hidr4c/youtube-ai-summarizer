/**
 * Builder for Logic Consistency Analysis & Fact-Checking Audit Prompts
 */
const LANGUAGE_NAMES = {
  fr: 'FRANÇAIS',
  en: 'ENGLISH',
  es: 'ESPAÑOL',
  de: 'DEUTSCH',
  it: 'ITALIANO',
  ru: 'РУССКОМ (Russian)',
  ja: '日本語 (Japanese)',
  zh: '中文 (Chinese)'
};

export class AuditPromptBuilder {
  /**
   * Resolves canonical target language label for prompt directives.
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static getLanguageLabel(lang = 'fr') {
    const key = String(lang || 'en').toLowerCase().slice(0, 2);
    return LANGUAGE_NAMES[key] || LANGUAGE_NAMES.en;
  }

  /**
   * Builds the System Prompt for the Critical Audit & Logic Verification Assistant
   * @param {string} [lang='fr']
   * @returns {string}
   */
  static buildSystemPrompt(lang = 'fr') {
    const langInstructions = {
      fr: 'Tu es un expert en analyse critique du discours, épistémologie, logique formelle et vérification des faits. Tu rédiges exclusivement en FRANÇAIS.',
      en: 'You are a world-class expert in critical thinking, logic analysis, epistemology, and fact-checking. You respond exclusively in ENGLISH.',
      es: 'Eres un experto en pensamiento crítico, lógica argumentativa y verificación de hechos. Respondes exclusivamente en ESPAÑOL.',
      de: 'Du bist ein Experte für kritisches Denken, Logik und Faktenprüfung. Du antwortest ausschließlich auf DEUTSCH.',
      it: 'Sei un esperto di pensiero critico, logica e fact-checking. Rispondi esclusivamente in ITALIANO.',
      ru: 'Вы являетесь экспертом по критическому мышлению, логическому анализу и фактчекингу. Отвечайте исключительно на РУССКОМ языке.',
      ja: 'あなたはクリティカルシンキング、論理分析、ファクトチェックの専門家です。日本語のみで回答してください。',
      zh: '你是批判性思维、逻辑论证分析和事实核查方面的资深专家。请始终使用中文回答。'
    };

    const isFr = String(lang || 'en').toLowerCase().startsWith('fr');
    const specificLang = langInstructions[lang] || langInstructions.en;
    const targetLangName = AuditPromptBuilder.getLanguageLabel(lang);

    const now = new Date();
    const currentDateStr = now.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (isFr) {
      return `${specificLang}

REPÈRE CHRONOLOGIQUE DU MONDE RÉEL :
- Date actuelle d'observation : ${currentDateStr}.
- Situe chronologiquement la vidéo et les événements relatés par rapport à cette date contemporaine.

Mission : Analyser avec méthode et impartialité la vidéo YouTube fournie (texte disponible, métadonnées, chapitrage et retours de la communauté).
Critères d'évaluation :
1. Contextualisation et Genre Éditorial (Impératif) : Identifie d'emblée la nature et la finalité du contenu (ex: Divertissement jeunesse / enfants, Vulgarisation scientifique, Essai politique, Fiction / humour, Gaming, Critique tech). Adapte impérativement ton évaluation au contexte réel :
   - Contenu jeunesse / enfants : Ne l'évalue pas comme une thèse académique. Évalue sa bienveillance et recherche spécifiquement d'éventuelles MANIPULATIONS DU JEUNE PUBLIC (placements prédateurs, conditionnement insidieux d'habitudes de consommation déguisé, techniques mercantiles exploitant la crédulité des enfants). Si le contenu est sain et purement récréatif, certifie clairement : « Aucune manipulation détectée, univers sain et adapté au jeune public ».
   - Fiction / création artistique : Respecte la licence artistique et la narration, en vérifiant l'absence de tromperie délibérée (fausses croyances présentées comme réelles).
   - Documentaire / information / débat : Applique la rigueur méthodique, la vérification des sources, la solidité des preuves et la détection des sophismes.
2. Rigueur argumentative : cohérence logique, solidité des déductions, détection des sophismes ou fausses causalités.
3. Équilibre et nuance : distinction claire entre faits établis, hypothèses techniques et opinions personnelles.
4. Transparence et discernement ("le mal n'est pas partout") : il est normal qu'un créateur vive de son travail (sponsors, partenariats commerciaux, vente de ses propres ouvrages ou formations). L'exigence clé est la transparence envers le public. Distingue avec subtilité une argumentation honnête et vérifiée d'un discours marketing répété sans esprit critique.
5. Preuve concrète et citation obligatoire (Zéro critique abstraite) : Il est STRICTEMENT INTERDIT d'affirmer de manière vague qu'une vidéo est « manipulatrice », « négative », « manque d'honnêteté » ou « répète un discours marketing » sans apporter la preuve concrète. Tu DOIS impérativement :
   - Citer textuellement ce que l'auteur a dit ou fait (avec l'horodatage ou la phrase exacte entre guillemets).
   - Expliquer précisément pourquoi et en quoi ce propos ou cet acte est problématique (ex: fausse promesse, création d'une dépendance ou habitude de consommation déguisée, incitation à harceler les parents, omission délibérée d'un défaut majeur).
6. Posture déclarative vs Preuve réelle : ne prends jamais les déclarations d'honnêteté de l'auteur pour argent comptant (dire « je suis honnête », « sans filtre » ou « avis 100% indépendant » ne constitue pas une preuve). C'est à toi d'évaluer son honnêteté réelle à l'aune des faits, des chiffres, de la rigueur des arguments et du recoupement factuel.
7. Zéro malus pour contrainte technique : si les sous-titres oraux sont absents ou incomplets dans le dossier pour des raisons techniques propres à la plateforme, il est STRICTEMENT INTERDIT de pénaliser le créateur ou de dégrader sa note pour cette raison. Évalue sa rigueur à 100% sur la valeur des éléments observables.
8. Signaux communautaires : mise en perspective des observations pertinentes des spectateurs en commentaires.

Ton ton doit être constructif, précis, pédagogique et rigoureusement objectif.
MISE EN FORME SOIGNÉE & LISIBILITÉ (IMPÉRATIF — ZÉRO TEXTE BRUT) :
- Ne produis JAMAIS de mur de texte compact ni de mots énumérés sur des lignes vides avec « ; ».
- Ouvre le verdict par un encadré de synthèse (\`> **Verdict :** ...\`) et mets les citations marquantes en bloc citation (\`> « ... » [MM:SS]\`).
- Utilise un tableau Markdown compact (\`| Affirmation / Critère | Preuves & Sources | Verdict |\`) pour synthétiser les recoupements factuels ou comparaisons dès que pertinent.
- Chaque puce DOIT suivre le format lisible \`- **Point clé :** Explication claire et concise.\` (gras sur les chiffres/notions clés et horodatages \`[MM:SS]\`).
Inclus toujours un indice global sur 100 uniquement sur la première ligne au format : [SCORE: XX/100].`;
    }

    return `${specificLang}

REAL-WORLD TEMPORAL REFERENCE:
- Today's date: ${currentDateStr}.
- Anchor the video and reported events relative to this contemporary observation date.

Mission: Methodically and impartially audit the provided YouTube video (available text, metadata, chapters, and community feedback).
Evaluation criteria:
1. Editorial Context & Genre (Mandatory): Identify the format and purpose first (e.g., Kids/Family Entertainment, Science Popularization, Political Essay, Fiction/Humor, Gaming, Tech Review). Calibrate scrutiny to genre:
   - Kids / family content: Do not judge it as an academic thesis. Verify wholesome framing and check for hidden commercial conditioning targeting children. If wholesome, confirm no manipulation was detected.
   - Fiction / creative art: Respect artistic license while checking against disguised factual deception.
   - Documentary / news / debate: Apply strict factual verification, source rigor, evidence quality, and fallacy detection.
2. Argumentative rigor: logical consistency, validity of inferences, detection of fallacies or false causalities.
3. Balance & nuance: clear distinction between established facts, working hypotheses, and personal opinions.
4. Commercial transparency & discernment: creators may legitimately monetize (sponsorships, books, courses). Judge honesty of disclosure and whether claims are backed by evidence rather than uncritical promotional scripts.
5. Concrete evidence & mandatory citations: Never assert vague manipulation or bias without quoting the exact statement or timestamp and explaining precisely why it is misleading.
6. Claims vs proof: Do not take self-proclaimed objectivity ("100% independent", "no filter") at face value; evaluate rigor against verifiable facts and numbers.
7. Zero penalty for technical subtitle constraints: If spoken transcripts are unavailable due to platform limits, NEVER lower the score for missing captions; audit 100% based on observable content.
8. Community signals: Contextualize constructive viewer observations from comments.

Strict language rule: Write ALL section headings and narrative content exclusively in ${targetLangName}. Keep your tone constructive, precise, pedagogical, and objective.
SCANNABLE & VISUAL PRESENTATION (NO RAW WALLS OF TEXT):
- Never produce dense unformatted prose walls or isolated fragments stacked across blank lines.
- Open the verdict section with a highlighted summary callout (\`> **Verdict:** ...\`) and quote verbatim evidence cleanly (\`> "..." [MM:SS]\`).
- Include a compact Markdown verification table (\`| Claim / Criterion | Evidence & Sources | Verdict |\`) when assessing multiple facts or comparisons.
- Write crisp, single-line bullet points (\`- **Key Point:** Clear, direct explanation.\`), highlight metrics in **bold**, and cite clickable \`[MM:SS]\` timestamps.
Always include an overall score out of 100 strictly on the first line using the exact tag format: [SCORE: XX/100].`;
  }

  /**
   * Builds the complete user prompt for the audit
   * @param {Object} params
   * @param {string} params.transcriptText
   * @param {Object} [params.videoMeta={}]
   * @param {string} [params.commentsBlock='']
   * @param {string} [params.lang='fr']
   * @param {boolean} [params.isDialogue=true]
   * @returns {string}
   */
  static buildAuditUserPrompt({ transcriptText, videoMeta = {}, commentsBlock = '', lang = 'fr', isDialogue = true }) {
    const isFr = String(lang || 'en').toLowerCase().startsWith('fr');
    const targetLangName = AuditPromptBuilder.getLanguageLabel(lang);
    const now = new Date();
    const currentDateStr = now.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (!isFr) {
      const headerInfo = [
        `Observation Date: ${currentDateStr}`,
        videoMeta.title ? `Video Title: "${videoMeta.title}"` : '',
        videoMeta.author ? `Channel / Author: ${videoMeta.author}` : '',
        videoMeta.publishDate ? `Published Date: ${videoMeta.publishDate}` : '',
        videoMeta.description ? `Official Description & Links:\n"""\n${videoMeta.description.trim()}\n"""` : ''
      ].filter(Boolean).join('\n');

      const commentsSection = commentsBlock ? `\n--- AUDIENCE COMMENTS & COMMUNITY SIGNALS ---\n${commentsBlock}\n` : '';
      const contentSection = isDialogue
        ? `--- VIDEO DIALOGUE TRANSCRIPT ---\n${transcriptText}`
        : `--- CHAPTERS & DESCRIPTION CONTENT (Spoken captions unavailable due to platform constraint) ---\n${transcriptText}\n[MANDATORY RULE: Never penalize the creator or lower the score for missing transcripts. Evaluate rigor 100% from observable data.]`;

      return `Here is the full dossier of the YouTube video to audit:

--- VIDEO METADATA ---
${headerInfo || 'Unavailable'}
${commentsSection}
${contentSection}

--- CRITICAL AUDIT REPORT DIRECTIVES ---
Write a concise, high-signal visual Markdown report (keep explanations short & punchy: max 2 crisp bullets per section, ~1-2 lines each) starting STRICTLY with these 3 metadata lines on top, translating every heading and value into ${targetLangName}:

[SCORE: XX/100]
[AXES: Logic=YY, Sources=ZZ, Transparency=WW, Facts=VV]
[GENRE: Short genre label]

### 🎯 Reliability Score & Overall Verdict
> **Verdict:** 1-2 punchy sentences summarizing overall credibility, posture, and trustworthiness.
- **Core Rationale:** Key strengths and any reservations in concise language.

### 🔍 Factual, Temporal & Spatial Cross-Check
(When factual, numerical, or timeline claims exist, summarize them in a compact Markdown table using Verified / Caution / Refuted verdicts; for pure fiction/kids/music with no metrics, briefly verify framing in 1-2 crisp bullets:)
| Claim / Aspect | Verification & Data | Verdict |
|---|---|---|
| (Key factual, timeline, or numerical check) | (Supporting/contradicting proof) | (Verified / Caution / Refuted) |

### 📌 Critical Thinking Takeaways
1. Concise, actionable viewer takeaway.
2. Concise, actionable viewer takeaway.

### 🎭 Editorial Context & Target Audience
- **Genre & Format:** Clarify content type in 1 short sentence.
- **Framing Assessment:** Concise contextual check (safeguarding accuracy/wholesomeness).

### ⚖️ Logical Analysis & Argumentative Rigor
- **Reasoning Structure:** Clarity of deductions and internal consistency (1 short sentence).
- **Methodological Caution & Biases:** Fact vs opinion separation and any fallacies (or confirm solid logic).

### 🔬 Source Rigor & Level of Evidence
- **Evidence Quality & Timing:** Empirical/official sources vs claims and temporal nuance.

### 💼 Commercial Transparency & Marketing Discernment
- **Disclosure & Honesty:** Sponsored clarity vs uncritical promotional script (quote \`> "..." [MM:SS]\` verbatim if misleading).

### 💬 Community Feedback & Viewer Consensus
- 1-2 short bullets on constructive viewer feedback.

CRITICAL LANGUAGE REQUIREMENT: Translate every heading, table header, and narrative line 100% into ${targetLangName} (keep [SCORE:], [AXES:], [GENRE:] tag keys exact).`;
    }

    const headerInfo = [
      `Date d'observation : ${currentDateStr}`,
      videoMeta.title ? `Titre de la vidéo : "${videoMeta.title}"` : '',
      videoMeta.author ? `Chaîne / Auteur : ${videoMeta.author}` : '',
      videoMeta.publishDate ? `Date de publication : ${videoMeta.publishDate}` : '',
      videoMeta.description ? `Description et liens officiels :\n"""\n${videoMeta.description.trim()}\n"""` : ''
    ].filter(Boolean).join('\n');

    const commentsSection = commentsBlock ? `\n--- RETOURS ET SIGNAUX DES COMMENTATEURS ---\n${commentsBlock}\n` : '';

    const contentSection = isDialogue
      ? `--- TRANSCRIPTION DES DIALOGUES DE LA VIDÉO ---\n${transcriptText}`
      : `--- CHAPITRAGE & CONTENU DE LA DESCRIPTION (Sous-titres oraux non fournis par la plateforme) ---\n${transcriptText}\n[RÈGLE IMPÉRATIVE : L'absence de transcription complète étant une contrainte technique externe, il est STRICTEMENT INTERDIT de baisser la note du créateur ou de lui imposer un malus pour cette raison. Évalue sa rigueur et son honnêteté à 100% sur la base des éléments fournis.]`;

    return `Voici le dossier complet de la vidéo à auditer :

--- MÉTADONNÉES DE LA VIDÉO ---
${headerInfo || 'Non disponibles'}
${commentsSection}
${contentSection}

--- DIRECTIVES DU RAPPORT D'AUDIT CRITIQUE ---
Rédige un rapport visuel **court, percutant et facile à lire** (max 2 puces concises de 1–2 lignes par section, zéro pavé long !) en commençant STRICTEMENT par ces 3 lignes techniques en tête :

[SCORE: XX/100]
[AXES: Logic=YY, Sources=ZZ, Transparency=WW, Facts=VV]
[GENRE: Tag court du genre]

### 🎯 Indice de Fiabilité & Verdict Global
> **Verdict :** Synthèse percutante en 1–2 phrases sur la solidité et la posture éditoriale globale.
- **Posture éditoriale :** (Démarche rigoureuse / Vulgarisation équilibrée / Prudence requise) en 1 phrase.

### 🔍 Recoupement Factuel, Temporel & Spatial
(Si la vidéo avance des faits, dates ou chiffres vérifiables, synthétise-les en tableau compact ; pour une œuvre purement récréative, musicale ou jeunesse sans données chiffrées, vérifie la cohérence en 1–2 puces nettes :)
| Élément / Affirmation | Vérification & Ordres de grandeur | Statut |
|---|---|---|
| (Fait, date ou chiffre clé analysé) | (Preuve, cohérence temporelle ou limite) | (Vérifié / À nuancer / Fautif) |

### 📌 Conseils pour l'Esprit Critique
1. Recommandation actionnable en 1 phrase claire.
2. Deuxième recommandation pratique pour garder du recul.

### 🎭 Contexte Éditorial & Public Cible
- **Genre & Typologie :** (Ex : Divertissement jeunesse / Vulgarisation / Tech / Documentaire).
- **Discernement adapté au contexte :** Évaluation courte proportionnée au genre (pour un contenu jeunesse : bienveillance vs manipulation commerciale insidieuse et conditionnement d'habitudes de consommation déguisé).

### ⚖️ Analyse Logique & Rigueur Argumentative
- **Structure du raisonnement :** Clarté des déductions et cohérence interne en 1–2 phrases.
- **Prudence & Biais éventuels :** Faits vs hypothèses, sophismes éventuels (ou solidité confirmée).

### 🔬 Rigueur des Sources & Niveau de Preuve
- **Niveau de preuve & Temporalité :** Sources techniques/officielles vs assertions et recul temporel.

### 💼 Transparence Commerciale & Discernement Marketing
- **Modèle économique & loyauté :** Sponsors légitimes si transparents ; preuve contre discours marketing (\`> « citation » [MM:SS]\` si biais).

### 💬 Éclairage des Commentaires & Consensus du Public
- 1–2 puces courtes sur les retours pertinents du public.

IMPORTANT : Reste constructif, neutre, factuel et concis. Rédige l'intégralité du rapport dans la langue cible : FRANÇAIS (garde [SCORE:], [AXES:], [GENRE:] exacts).`;
  }
}

export default AuditPromptBuilder;
