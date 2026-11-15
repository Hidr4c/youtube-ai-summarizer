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
Inclus toujours un indice global sur 100 au format : [SCORE: XX/100].`;
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
Always include an overall score out of 100 using the exact tag format: [SCORE: XX/100].`;
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
Write a structured Markdown report keeping [SCORE: XX/100] intact and translating all section titles below into ${targetLangName}:

[SCORE: XX/100]

### 🎭 Editorial Context & Target Audience
- **Genre & Format**: Clarify the content type and evaluate proportionally to that genre.

### 🎯 Reliability Score & Overall Verdict
- Concise 2-3 sentence rationale and posture assessment.

### ⚖️ Logical Analysis & Argumentative Rigor
- Reasoning clarity, methodological caution, and any fallacies or shortcuts observed.

### 🔬 Source Rigor & Level of Evidence
- Empirical/official sources vs hypotheses, plus temporal nuance if covering recent events.

### 💼 Commercial Transparency & Marketing Discernment
- Disclosure clarity, verified reasoning vs promotional scripting (quote exact phrases if problematic), and proof over self-proclaimed objectivity.

### 🔍 Factual, Temporal & Spatial Cross-Check
- Timeline alignment and plausibility of numerical/physical claims.

### 💬 Community Feedback & Viewer Consensus
- Key constructive takeaways from viewer comments.

### 📌 Critical Thinking Takeaways
- 2 to 3 actionable viewer guidelines.

CRITICAL LANGUAGE REQUIREMENT: Translate every heading and write 100% of the audit report exclusively in ${targetLangName}.`;
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
Rédige un rapport structuré respectant EXACTEMENT le format Markdown suivant :

[SCORE: XX/100]

### 🎭 Contexte Éditorial & Public Cible
- **Genre & Typologie** : (Ex: Divertissement jeunesse / Documentaire scientifique / Fiction / Gaming / Débat).
- **Discernement adapté au contexte** : Évaluation adaptée au genre. Pour un contenu jeunesse : analyse de la bienveillance, absence ou présence de manipulation commerciale insidieuse (conditionnement d'habitudes de consommation déguisé, placements prédateurs, exploitation de la crédulité infantile). Pour un contenu documentaire/informatif : niveau de preuve et rigueur de démonstration.

### 🎯 Indice de Fiabilité & Verdict Global
- Score de solidité (sur 100) avec explication synthétique en 2-3 phrases.
- Évaluation globale de la posture : (Ex: Démarche rigoureuse / Vulgarisation équilibrée / Posture engagée / Prudence requise).

### ⚖️ Analyse Logique & Rigueur Argumentative
- Analyse la cohérence de l'argumentation :
  - **Structure du raisonnement** : Clarté des déductions, présence ou absence de contradictions internes.
  - **Prudence méthodologique** : Précision du vocabulaire employé, distinction entre certitudes, indices et hypothèses de travail.
  - **Biais ou raccourcis éventuels** : Causalités hâtives, généralisations excessives ou extrapolations si constatées (ou confirmer la solidité du raisonnement).

### 🔬 Rigueur des Sources & Niveau de Preuve
- Évalue les références et données présentées :
  - **Niveau de preuve** : Références techniques ou officielles vs témoignages préliminaires ou déductions logiques.
  - **Prise en compte de la temporalité de l'enquête** : S'il s'agit d'un événement récent, vérifier si l'auteur précise les limites des données préliminaires disponibles.

### 💼 Transparence Commerciale & Discernement Marketing
- Évalue avec subtilité la sincérité éditoriale et la valeur réelle de l'argumentation :
  - **Transparence du modèle économique (légitime et assumé)** : Il est parfaitement normal qu'un créateur vive de son travail (sponsors, partenariats commerciaux, affiliations ou promotion de ses propres livres/conférences). L'exigence clé est la transparence : ces collaborations sont-elles annoncées de manière claire et loyale au spectateur ?
  - **Arguments vérifiés vs Discours marketing répété** : Évalue si les arguments présentés sont solides, documentés et critiques... ou s'il s'agit d'un simple discours commercial préformaté. [OBLIGATION DE CITATION : Si tu juges un argument marketing ou manipulateur, cite la phrase exacte de l'auteur et explique pourquoi elle pose problème].
  - **Démonstration concrète du préjudice ou du biais** : Explique ce que l'auteur a dit ou fait de concret et pourquoi c'est préjudiciable ou négatif pour le spectateur (ex: fausse promesse santé, conditionnement d'habitudes d'achat précoce chez l'enfant, omission volontaire de dysfonctionnements).
  - **Vérification active de l'honnêteté (ne pas croire sur parole)** : Ce n'est pas parce que l'auteur proclame « je suis honnête », « test 100% objectif » ou « aucun sponsor ne m'influence » qu'il l'est réellement. C'est à l'auditeur de juger son honnêteté à l'aune des preuves matérielles, des données vérifiables et de la cohérence de ses démonstrations.
  - **Discernement ("le mal n'est pas partout")** : Une vidéo sponsorisée peut être excellente et rigoureuse si l'analyse reste intègre. Ne pénalise pas la présence d'un sponsor, mais juge la liberté de ton, la précision technique et l'honnêteté intellectuelle du propos.

### 🔍 Recoupement Factuel, Temporel & Spatial
- Cohérence chronologique entre la date de mise en ligne et les événements analysés.
- Pertinence des ordres de grandeur ou données physiques mentionnées.

### 💬 Éclairage des Commentaires & Consensus du Public
- Synthèse des retours du public (remarques constructives, partages d'expérience ou points de discussion soulevés).

### 📌 Conseils pour l'Esprit Critique
- 2 à 3 recommandations pédagogiques pour appréhender ce type de sujet avec discernement.

IMPORTANT : Reste constructif, neutre et factuel. N'invente pas de défauts inexistants. Rédige l'intégralité du rapport dans la langue cible : FRANÇAIS.`;
  }
}

export default AuditPromptBuilder;
