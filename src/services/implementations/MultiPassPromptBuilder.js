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
Rédige un rapport visuel court, percutant et agréable à lire en commençant STRICTEMENT par ces 3 lignes techniques :

[SCORE: XX/100]
[AXES: Logic=YY, Sources=ZZ, Transparency=WW, Facts=VV]
[GENRE: Tag court du genre]

### 🎯 Indice de Fiabilité & Verdict Global
> **Verdict :** Synthèse percutante en 1–2 phrases sur la solidité et la posture éditoriale globale.
- **Posture éditoriale :** (Démarche rigoureuse / Sensationalisme / Prudence requise) en 1 phrase.

### 🔍 Recoupement Factuel, Temporel & Spatial
| Affirmation / Critère | Preuve & Vérification | Statut |
|---|---|---|
| (Date, lieu ou chiffre clé) | (Conformité à l'état de l'art ou anomalie) | (Vérifié / À nuancer / Fautif) |

### 📌 Conseils pour l'Esprit Critique
1. Point clé actionnable en 1 phrase nette.
2. Deuxième recommandation pratique de vérification.

### ⚖️ Analyse Logique & Sophismes Identifiés
- **Structure & cohérence :** Confronte les segments et relève les anomalies éventuelles avec \`[MM:SS]\` (ou confirme la solidité).
- **Preuves citables :** \`> « ... » [MM:SS]\`.

### 🔬 Rigueur du Sourçage & Niveau de Preuve
- **Niveau de preuve :** Consensus scientifique / méta-analyse vs étude isolée et conflits d'intérêts éventuels.

### 💬 Éclairage des Commentaires & Consensus du Public
- 1–2 puces courtes sur les retours pertinents du public.

IMPORTANT : Reste neutre, factuel et concis. Rédige l'intégralité du rapport dans la langue cible : ${lang.toUpperCase()}.`;
  }
}

export default MultiPassPromptBuilder;
