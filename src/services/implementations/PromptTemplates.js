/**
 * Multi-language formatting templates and language guidelines for AI Prompts
 */

export const TARGET_LANG_NAMES = {
  fr: 'FRANÇAIS',
  en: 'ENGLISH',
  es: 'ESPAÑOL',
  it: 'ITALIANO',
  de: 'DEUTSCH',
  ja: '日本語 (JAPANESE)',
  ru: 'РУССКИЙ',
  zh: '中文 (SIMPLIFIED CHINESE)'
};

const TEMPLATES = {
  fr: {
    quick: `Produis un résumé COURT, CONCIS et DIRECT sous cette forme :
### ⚡ En Bref
(2 à 3 phrases percutantes résumant l'essentiel absolu)

### 🎯 Points Clés à Retenir
- **[Point 1]** : Explication courte et concrète.
- **[Point 2]** : Explication courte et concrète.
- **[Point 3]** : Explication courte et concrète.

### 📌 Conclusion
(1 phrase de conclusion finale)`,
    detailed: `Produis une synthèse COMPLÈTE, DÉTAILLÉE et EXHAUSTIVE :
### 🎯 Vue d'ensemble & Enjeux
(Contexte, problème abordé et thèse de la vidéo)

### ⏱️ Déroulé chronologique & Chapitres clés
(Reconstitue les grandes étapes avec timestamps si mentionnés)

### 💡 Analyses, Arguments & Exemples cités
(Décortique les données, anecdotes ou concepts expliqués)

### 🛠️ Conseils pratiques & Actions concrètes
(Tout ce qui est actionnable pour le spectateur)

### 📌 Conclusion & Perspective
(Message final et conclusion de l'auteur)`,
    standard: `Produis un résumé ÉQUILIBRÉ, NATUREL et STRUCTURÉ :
### 🎯 L'Essentiel
(2-3 phrases résumant le sujet et le message central)

### ⏱️ Moments Clés & Déroulement
- **[Thème 1]** : Ce qui est expliqué ou démontré.
- **[Thème 2]** : Ce qui est expliqué ou démontré.
- **[Thème 3]** : Ce qui est expliqué ou démontré.

### 💡 Enseignements & Conseils
- **[Leçon clé]** : Détail concret et utile.
- **[Actionable]** : Recommandation de l'auteur.

### 📌 Ce qu'il faut en retenir
(Conclusion synthétique)`
  },
  es: {
    quick: `Produce un resumen CORTO, CONCISO y DIRECTO en este formato:
### ⚡ En Breve
(2 a 3 frases impactantes resumiendo lo esencial)

### 🎯 Puntos Clave a Recordar
- **[Punto 1]** : Explicación corta y concreta.
- **[Punto 2]** : Explicación corta y concreta.
- **[Punto 3]** : Explicación corta y concreta.

### 📌 Conclusión
(1 frase de conclusión final)`,
    detailed: `Produce una síntesis COMPLETA, DETALLADA y EXHAUSTIVA:
### 🎯 Visión General & Contexto
(Contexto, problema abordado y tesis del vídeo)

### ⏱️ Desarrollo Cronológico & Capítulos Clave
(Reconstruye las etapas principales con marcas de tiempo)

### 💡 Análisis, Argumentos & Ejemplos
(Detalla datos, anécdotas o conceptos expuestos)

### 🛠️ Consejos Prácticos & Acciones Concretas
(Todo lo accionable para el espectador)

### 📌 Conclusión & Perspectiva
(Mensaje final y conclusión del autor)`,
    standard: `Produce un resumen EQUILIBRADO, NATURAL y ESTRUCTURADO:
### 🎯 Lo Esencial
(2-3 frases resumiendo el tema y mensaje principal)

### ⏱️ Momentos Clave & Desarrollo
- **[Tema 1]** : Lo que se explica o demuestra.
- **[Tema 2]** : Lo que se explica o demuestra.
- **[Tema 3]** : Lo que se explica o demuestra.

### 💡 Enseñanzas & Consejos
- **[Lección clave]** : Detalle concreto y útil.
- **[Acción práctica]** : Recomendación del autor.

### 📌 Conclusión General
(Conclusión sintética)`
  },
  it: {
    quick: `Produci un riassunto BREVE, CONCISO e DIRETTO in questo formato:
### ⚡ In Breve
(2-3 frasi incisive che riassumono l'essenziale)

### 🎯 Punti Chiave da Ricordare
- **[Punto 1]** : Spiegazione breve e concreta.
- **[Punto 2]** : Spiegazione breve e concreta.
- **[Punto 3]** : Spiegazione breve e concreta.

### 📌 Conclusione
(1 frase di conclusione finale)`,
    detailed: `Produci una sintesi COMPLETA, DETTAGLIATA ed ESAUSTIVA:
### 🎯 Panoramica & Obiettivi
(Contesto, problema affrontato e tesi del video)

### ⏱️ Svolgimento Cronologico & Capitoli Chiave
(Ricostruisci i passaggi chiave con timestamp se presenti)

### 💡 Analisi, Argomentazioni & Esempi
(Analizza dati, aneddoti o concetti illustrati)

### 🛠️ Consigli Pratici & Azioni Concrete
(Tutto ciò che è attuabile per lo spettatore)

### 📌 Conclusione & Prospettiva
(Messaggio finale e conclusione dell'autore)`,
    standard: `Produci un riassunto EQUILIBRATO, NATURALE e STRUTTURATO:
### 🎯 L'Essenziale
(2-3 frasi che riassumono l'argomento e il messaggio centrale)

### ⏱️ Momenti Chiave & Svolgimento
- **[Tema 1]** : Spiegazione o dimostrazione.
- **[Tema 2]** : Spiegazione o dimostrazione.
- **[Tema 3]** : Spiegazione o dimostrazione.

### 💡 Insegnamenti & Consigli Pratici
- **[Lezione chiave]** : Dettaglio concreto e utile.
- **[Azione pratica]** : Raccomandazione dell'autore.

### 📌 Da Ricordare
(Conclusione sintetica)`
  },
  de: {
    quick: `Erstelle eine KURZE, PRÄZISE und DIREKTE Zusammenfassung:
### ⚡ Kurz & Bündig
(2 bis 3 prägnante Sätze mit dem Wesentlichen)

### 🎯 Wichtigste Erkenntnisse
- **[Punkt 1]** : Kurze, konkrete Erklärung.
- **[Punkt 2]** : Kurze, konkrete Erklärung.
- **[Punkt 3]** : Kurze, konkrete Erklärung.

### 📌 Fazit
(1 abschließender Schlusssatz)`,
    detailed: `Erstelle eine VOLLSTÄNDIGE, DETAILLIERTE und UMFASSENDE Analyse:
### 🎯 Überblick & Kernfrage
(Kontext, Thema und Hauptthese des Videos)

### ⏱️ Chronologischer Ablauf & Wichtige Kapitel
(Hauptabschnitte mit Zeitstempeln)

### 💡 Analysen, Argumente & Beispiele
(Daten, Fakten oder erklärte Konzepte)

### 🛠️ Praktische Ratschläge & Handlungsschritte
(Konkret anwendbare Tipps für den Zuschauer)

### 📌 Fazit & Ausblick
(Schlussgedanke des Autors)`,
    standard: `Erstelle eine AUSGEWOGENE, NATÜRLICHE und STRUKTURIERTE Zusammenfassung:
### 🎯 Das Wesentliche
(2-3 Sätze als Zusammenfassung des Themas)

### ⏱️ Wichtige Abschnitte & Verlauf
- **[Thema 1]** : Was erklärt oder gezeigt wird.
- **[Thema 2]** : Was erklärt oder gezeigt wird.
- **[Thema 3]** : Was erklärt oder gezeigt wird.

### 💡 Erkenntnisse & Praktische Tipps
- **[Kernlektion]** : Konkretes und nützliches Detail.
- **[Handlungsempfehlung]** : Empfehlung des Autors.

### 📌 Wichtigste Erkenntnis
(Synthetisches Fazit)`
  },
  en: {
    quick: `Produce a SHORT, CONCISE, and DIRECT summary in this format:
### ⚡ Quick Summary
(2 to 3 impactful sentences capturing the absolute essence)

### 🎯 Key Takeaways
- **[Point 1]**: Short, concrete explanation.
- **[Point 2]**: Short, concrete explanation.
- **[Point 3]**: Short, concrete explanation.

### 📌 Conclusion
(1 final concluding sentence)`,
    detailed: `Produce a THOROUGH, DETAILED, and COMPREHENSIVE study guide:
### 🎯 Overview & Core Thesis
(Context, problem addressed, and central thesis of the video)

### ⏱️ Chronological Breakdown & Key Chapters
(Reconstruct key sections with timestamps if present)

### 💡 Deep Dive: Arguments, Data & Examples
(Analyze the data, case studies, or concepts presented)

### 🛠️ Actionable Advice & Practical Steps
(Actionable takeaways for the viewer)

### 📌 Author's Conclusion & Key Takeaway
(Final takeaway and perspective)`,
    standard: `Produce a BALANCED, NATURAL, and STRUCTURED summary:
### 🎯 Core Takeaways
(2-3 sentences summarizing the topic and central message)

### ⏱️ Key Highlights & Chapters
- **[Topic 1]**: What is explained or demonstrated.
- **[Topic 2]**: What is explained or demonstrated.
- **[Topic 3]**: What is explained or demonstrated.

### 💡 Insights & Practical Advice
- **[Key insight]**: Concrete and actionable takeaway.
- **[Actionable item]**: Author recommendation.

### 📌 Final Summary
(Synthetic concluding thought)`
  }
};

/**
 * Returns localized summary formatting instructions
 * @param {string} mode
 * @param {string|boolean} langOrIsFr
 * @returns {string}
 */
export function getFormatInstructions(mode, langOrIsFr = 'en') {
  let lang = 'en';
  if (typeof langOrIsFr === 'boolean') {
    lang = langOrIsFr ? 'fr' : 'en';
  } else if (typeof langOrIsFr === 'string') {
    lang = langOrIsFr;
  }
  const langTemplates = TEMPLATES[lang] || TEMPLATES.en;
  return langTemplates[mode] || langTemplates.standard;
}
