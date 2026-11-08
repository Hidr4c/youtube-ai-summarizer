/**
 * Builder for Multi-Pass / Map-Reduce Segment Prompts (Sequential Long-Video Processing)
 */
export class MultiPassPromptBuilder {
  /**
   * Builds prompt for an intermediate transcript segment
   * @param {Object} params
   * @param {Object} params.chunk - Chunk object from TranscriptChunker
   * @param {string} [params.lang='fr']
   * @returns {string}
   */
  static buildSegmentUserPrompt({ chunk, lang = 'fr' }) {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    if (isFr) {
      return `Tu analyses le SEGMENT ${chunk.index}/${chunk.total} (Période : de [${chunk.startTimestamp}] à [${chunk.endTimestamp}]) d'une longue vidéo.
Consigne : Relève brièvement et avec rigueur :
1. Les affirmations factuelles fortes et chiffres avancés avec leurs horodatages [MM:SS].
2. Les sophismes, raccourcis logiques ou extrapolations identifiés dans ce segment.
3. Les sources, études, revues ou auteurs mentionnés dans ce passage.

TRANSCRIPTION DU SEGMENT ${chunk.index}/${chunk.total} :
${chunk.text}

Réponds sous forme de notes concises d'audit pour ce segment.`;
    }

    return `You are analyzing SEGMENT ${chunk.index}/${chunk.total} (Timestamp: [${chunk.startTimestamp}] to [${chunk.endTimestamp}]) of a long video.
Instructions: Concisely and rigorously extract:
1. Key factual claims and metrics with timestamps [MM:SS].
2. Logical fallacies, cognitive biases, or extrapolations in this segment.
3. Sources, papers, journals, or authorities cited in this passage.

SEGMENT ${chunk.index}/${chunk.total} TRANSCRIPT:
${chunk.text}

Respond in concise audit notes for this segment.`;
  }

  /**
   * Builds the final consolidation prompt combining all segment analyses
   * @param {Object} params
   * @param {Array<string>} params.segmentNotes - Notes from each processed chunk
   * @param {Object} [params.videoMeta={}]
   * @param {string} [params.commentsBlock='']
   * @param {string} [params.lang='fr']
   * @returns {string}
   */
  static buildConsolidatedUserPrompt({ segmentNotes = [], videoMeta = {}, commentsBlock = '', lang = 'fr' }) {
    const isFr = (lang || 'fr').toLowerCase().startsWith('fr');
    const headerInfo = [
      videoMeta.title ? `Titre de la vidéo : "${videoMeta.title}"` : '',
      videoMeta.author ? `Chaîne / Auteur : ${videoMeta.author}` : '',
      videoMeta.publishDate ? `Date d'upload officielle : ${videoMeta.publishDate}` : '',
      videoMeta.description ? `Description & Liens/Sources cités (intégralité) :\n"""\n${videoMeta.description.trim()}\n"""` : ''
    ].filter(Boolean).join('\n');

    const compiledSegments = segmentNotes.map((note, idx) => `=== SEGMENT ${idx + 1} ===\n${note}`).join('\n\n');
    const commentsSection = commentsBlock ? `\n--- RETOURS ET SIGNAUX DES COMMENTATEURS ---\n${commentsBlock}\n` : '';

    return `Voici le dossier consolidé de l'ensemble de la vidéo (analysée intégralement sur ses ${segmentNotes.length} segments consécutifs, sans aucune coupe d'information) :

--- MÉTADONNÉES DE LA VIDÉO ---
${headerInfo || 'Non disponibles'}
${commentsSection}
--- ANALYSES DÉTAILLÉES PAR SEGMENT (100% DU CONTENU) ---
${compiledSegments}

--- DIRECTIVES DU RAPPORT D'AUDIT CRITIQUE FINAL ---
Rédige un rapport complet et structuré respectant EXACTEMENT le format Markdown :

[SCORE: XX/100]

### 🎯 Indice de Fiabilité & Verdict Global
- Score de solidité (sur 100) avec explication synthétique en 2-3 phrases.
- Évaluation globale de la posture : (Ex: Démarche rigoureuse / Sensationalisme / Rhétorique partisane / Risque de désinformation).

### ⚖️ Analyse Logique & Sophismes Identifiés
- Détecte au moins 2 à 5 anomalies de raisonnement si présentes, ou confirme la solidité logique :
  - **Fausse corrélation / Causalité douteuse** (attribuer un effet sans lien prouvé).
  - **Contradiction interne** : Confronte les différents segments temporels. Si l'auteur contredit un point plus tard, cite les deux moments [MM:SS].
  - **Faux dilemme ou Homme de paille** : Caricature ou réduction binaire.
  - **Biais statistique ou extrapolation abusive**.
- Pour chaque faille, cite le passage ou le moment [MM:SS] et explique pourquoi le raisonnement pèche.

### 🔬 Rigueur du Sourçage & Niveau de Preuve (Détection des Fake News Sourcées)
- Évalue la solidité des sources et références invoquées (dans le discours ou la description) :
  - **Niveau de preuve (Pyramide EBM)** : Consensus scientifique / méta-analyse vs étude de cas isolée, observationnelle ou animale extrapolée à l'humain.
  - **Détournement de source & Cherry-picking** : L'auteur fait-il dire à une étude ce qu'elle ne dit pas ? Isole-t-il une étude marginale contredite par l'état de l'art ?
  - **Revues prédatrices & Sourçage circulaire** : Indices d'organismes paravents, blogs d'opinion déguisés en études, ou absence de relecture par les pairs.
  - **Conflits d'intérêts et liens marchands** : Liens d'affiliation ou vente de produits corrélés au discours de la vidéo.

### 🔍 Recoupement Factuel, Temporel & Spatial
- La vidéo correspond-elle bien à l'époque et au lieu mentionnés ? Y a-t-il un risque d'anachronisme ou de séquence recyclée ?
- Les affirmations chiffrées ou factuelles fortes sont-elles conformes à l'état de l'art ou des connaissances actuelles ?

### 💬 Éclairage des Commentaires & Consensus du Public
- Résume ce que pointent les spectateurs (critiques pertinentes, signalements de fake, compléments factuels).

### 📌 Conseils pour l'Esprit Critique
- 2 à 3 points clés à retenir pour ne pas se laisser tromper par ce discours.

IMPORTANT : Reste neutre et factuel. Rédige l'intégralité du rapport dans la langue cible : ${lang.toUpperCase()}.`;
  }
}

export default MultiPassPromptBuilder;
