/**
 * Builder for Logic Consistency Analysis & Fact-Checking Audit Prompts
 */
export class AuditPromptBuilder {
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

    const specificLang = langInstructions[lang] || langInstructions.en;

    const now = new Date();
    const currentDateStr = now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const temporalAnchor = lang === 'fr'
      ? `\nREPÈRE CHRONOLOGIQUE DU MONDE RÉEL :
- Date actuelle d'observation : ${currentDateStr}.
- Situe chronologiquement la vidéo et les événements relatés par rapport à cette date contemporaine.`
      : `\nREAL-WORLD TEMPORAL REFERENCE:
- Today's date: ${currentDateStr}.
- Anchor the video and reported events relative to this contemporary observation date.`;

    return `${specificLang}
${temporalAnchor}

Mission : Analyser avec méthode et impartialité la vidéo YouTube fournie (texte disponible, métadonnées, chapitrage et retours de la communauté).
Critères d'évaluation :
1. Rigueur argumentative : cohérence logique, solidité des déductions, détection des sophismes ou fausses causalités.
2. Équilibre et nuance : distinction claire entre faits établis, hypothèses techniques et opinions personnelles.
3. Transparence et discernement ("le mal n'est pas partout") : il est normal qu'un créateur vive de son travail (sponsors, partenariats commerciaux, vente de ses propres ouvrages ou formations). L'exigence clé est la transparence envers le public. Distingue avec subtilité une argumentation honnête et vérifiée d'un discours marketing répété sans esprit critique.
4. Posture déclarative vs Preuve réelle : ne prends jamais les déclarations d'honnêteté de l'auteur pour argent comptant (dire « je suis honnête », « sans filtre » ou « avis 100% indépendant » ne constitue pas une preuve). C'est à toi d'évaluer son honnêteté réelle à l'aune des faits, des chiffres, de la rigueur des arguments et du recoupement factuel.
5. Zéro malus pour contrainte technique : si les sous-titres oraux sont absents ou incomplets dans le dossier pour des raisons techniques propres à la plateforme, il est STRICTEMENT INTERDIT de pénaliser le créateur ou de dégrader sa note pour cette raison. Évalue sa rigueur à 100% sur la valeur des éléments observables.
6. Signaux communautaires : mise en perspective des observations pertinentes des spectateurs en commentaires.

Ton ton doit être constructif, précis, pédagogique et rigoureusement objectif.
Inclus toujours un indice global sur 100 au format : [SCORE: XX/100].`;
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
    const now = new Date();
    const currentDateStr = now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
  - **Arguments vérifiés vs Discours marketing répété** : Évalue si les arguments présentés sont solides, documentés et critiques... ou s'il s'agit d'un simple discours commercial préformaté (reprise sans recul des éléments de langage d'une marque, éloges systématiques, omission délibérée des compromis techniques).
  - **Vérification active de l'honnêteté (ne pas croire sur parole)** : Ce n'est pas parce que l'auteur proclame « je suis honnête », « test 100% objectif » ou « aucun sponsor ne m'influence » qu'il l'est réellement. C'est à l'auditeur de juger son honnêteté à l'aune des preuves matérielles, des données vérifiables et de la cohérence de ses démonstrations.
  - **Discernement ("le mal n'est pas partout")** : Une vidéo sponsorisée peut être excellente et rigoureuse si l'analyse reste intègre. Ne pénalise pas la présence d'un sponsor, mais juge la liberté de ton, la précision technique et l'honnêteté intellectuelle du propos.

### 🔍 Recoupement Factuel, Temporel & Spatial
- Cohérence chronologique entre la date de mise en ligne et les événements analysés.
- Pertinence des ordres de grandeur ou données physiques mentionnées.

### 💬 Éclairage des Commentaires & Consensus du Public
- Synthèse des retours du public (remarques constructives, partages d'expérience ou points de discussion soulevés).

### 📌 Conseils pour l'Esprit Critique
- 2 à 3 recommandations pédagogiques pour appréhender ce type de sujet avec discernement.

IMPORTANT : Reste constructif, neutre et factuel. N'invente pas de défauts inexistants. Rédige l'intégralité du rapport dans la langue cible : ${lang.toUpperCase()}.`;
  }
}

export default AuditPromptBuilder;
