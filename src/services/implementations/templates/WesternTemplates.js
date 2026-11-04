/**
 * Western language templates: French, English, Spanish, Italian, German
 */

export const WESTERN_TEMPLATES = {
  fr: {
    quick: `Produis un résumé COURT, CONCIS et DIRECT sous cette forme :
### ⚡ En Bref
(2 à 3 phrases percutantes résumant l'essentiel absolu)

### 🎯 Points Clés à Retenir
- **[00:00] [Point 1]** : Explication courte et concrète en 1 phrase.
- **[02:15] [Point 2]** : Explication courte et concrète en 1 phrase.
- **[04:48] [Point 3]** : Explication courte et concrète en 1 phrase.
(Cite obligatoirement les horodatages réels [mm:ss] de la transcription pour chaque point)

### 📌 Conclusion
(1 phrase de conclusion finale)`,
    detailed: `Produis une synthèse COMPLÈTE, DÉTAILLÉE et EXHAUSTIVE :
### 🎯 Vue d'ensemble & Enjeux
(Contexte, problème abordé et thèse de la vidéo)

### ⏱️ Déroulé chronologique & Chapitres clés
- **[00:00] [Étape 1]** : Analyse et faits marquants.
- **[02:15] [Étape 2]** : Analyse et faits marquants.
- **[04:48] [Étape 3]** : Analyse et faits marquants.
(Reconstitue les grandes étapes avec leurs horodatages réels [mm:ss] de la transcription)

### 💡 Analyses, Arguments & Exemples cités
(Décortique les données, anecdotes ou concepts expliqués)

### 🛠️ Conseils pratiques & Actions concrètes
(Tout ce qui est actionnable pour le spectateur)

### 📌 Conclusion & Perspective
(Message final et conclusion de l'auteur)`,
    standard: `Produis un résumé ÉQUILIBRÉ, NATUREL et STRUCTURÉ (format intermédiaire d'environ 350 à 450 mots) :

DIRECTIVE DE CALIBRAGE : Ne sois ni trop expéditif comme le format court, ni trop exhaustif comme le format détaillé. Reste direct, fluide et percutant en évitant les digressions.

### 🎯 Synthèse Globale
(Un paragraphe fluide de 3 à 4 phrases résumant le sujet central, les enjeux et l'intérêt principal de la vidéo)

### ⏱️ Déroulé & Temps Forts
- **[00:00] [Étape 1]** : Analyse claire et fait marquant en 2 phrases concrètes.
- **[02:15] [Étape 2]** : Analyse claire et fait marquant en 2 phrases concrètes.
- **[04:48] [Étape 3]** : Analyse claire et fait marquant en 2 phrases concrètes.
- **[07:30] [Étape 4]** : Analyse claire et fait marquant en 2 phrases concrètes.
(Reconstitue les 4 à 5 étapes majeures avec leurs horodatages réels [mm:ss] de la transcription)

### 📌 L'Enseignement Clé & Conclusion
(2 phrases synthétisant le conseil majeur de l'auteur et ce qu'il faut absolument en retenir)`
  },
  es: {
    quick: `Produce un resumen CORTO, CONCISO y DIRECTO en este formato:
### ⚡ En Breve
(2 a 3 frases impactantes resumiendo lo esencial)

### 🎯 Puntos Clave a Recordar
- **[00:00] [Punto 1]** : Explicación corta y concreta en 1 frase.
- **[02:15] [Punto 2]** : Explicación corta y concreta en 1 frase.
- **[04:48] [Punto 3]** : Explicación corta y concreta en 1 frase.
(Cita obligatoriamente las marcas de tiempo reales [mm:ss] de la transcripción)

### 📌 Conclusión
(1 frase de conclusión final)`,
    detailed: `Produce una síntesis COMPLETA, DETALLADA y EXHAUSTIVA:
### 🎯 Visión General & Contexto
(Contexto, problema abordado y tesis del vídeo)

### ⏱️ Desarrollo Cronológico & Capítulos Clave
- **[00:00] [Etapa 1]** : Análisis y hechos destacados.
- **[02:15] [Etapa 2]** : Análisis y hechos destacados.
- **[04:48] [Etapa 3]** : Análisis y hechos destacados.
(Reconstruye las etapas principales con marcas de tiempo reales [mm:ss])

### 💡 Análisis, Argumentos & Ejemplos
(Detalla datos, anécdotas o conceptos expuestos)

### 🛠️ Consejos Prácticos & Acciones Concretas
(Todo lo accionable para el espectador)

### 📌 Conclusión & Perspectiva
(Mensaje final y conclusión del autor)`,
    standard: `Produce un resumen EQUILIBRADO, NATURAL y BIEN ESTRUCTURADO (formato intermedio de ~350 a 450 palabras):

DIRECTIVA DE CALIBRACIÓN: No seas demasiado breve como en el modo rápido, ni excesivamente extenso como en el modo detallado. Mantén un auténtico término medio: fluido, conciso y sustancioso.

### 🎯 Síntesis Global
(Un párrafo fluido de 3 a 4 frases resumiendo el tema principal, el contexto y el mensaje central)

### ⏱️ Momentos Clave & Desarrollo
- **[00:00] [Hito 1]** : Explicación concreta y punto clave en 2 frases concisas.
- **[02:15] [Hito 2]** : Explicación concreta y punto clave en 2 frases concisas.
- **[04:48] [Hito 3]** : Explicación concreta y punto clave en 2 frases concisas.
- **[07:30] [Hito 4]** : Explicación concreta y punto clave en 2 frases concisas.
(Reúne 4 a 5 momentos clave con sus marcas de tiempo reales [mm:ss] de la transcripción)

### 📌 Conclusión & Aprendizaje Clave
(2 frases sintetizando el consejo principal del autor y la conclusión definitiva)`
  },
  it: {
    quick: `Produci un riassunto BREVE, CONCISO e DIRETTO in questo formato:
### ⚡ In Breve
(2-3 frasi incisive che riassumono l'essenziale)

### 🎯 Punti Chiave da Ricordare
- **[00:00] [Punto 1]** : Spiegazione breve e concreta in 1 frase.
- **[02:15] [Punto 2]** : Spiegazione breve e concreta in 1 frase.
- **[04:48] [Punto 3]** : Spiegazione breve e concreta in 1 frase.
(Cita obbligatoriamente i timestamp reali [mm:ss] della trascrizione per ogni punto)

### 📌 Conclusione
(1 frase di conclusione finale)`,
    detailed: `Produci una sintesi COMPLETA, DETTAGLIATA ed ESAUSTIVA:
### 🎯 Panoramica & Obiettivi
(Contesto, problema affrontato e tesi del video)

### ⏱️ Svolgimento Cronologico & Capitoli Chiave
- **[00:00] [Fase 1]** : Analisi e fatti salienti.
- **[02:15] [Fase 2]** : Analisi e fatti salienti.
- **[04:48] [Fase 3]** : Analisi e fatti salienti.
(Ricostruisci i passaggi chiave con i timestamp reali [mm:ss] della trascrizione)

### 💡 Analisi, Argomentazioni & Esempi
(Analizza dati, aneddoti o concetti illustrati)

### 🛠️ Consigli Pratici & Azioni Concrete
(Tutto ciò che è attuabile per lo spettatore)

### 📌 Conclusione & Prospettiva
(Messaggio finale e conclusione dell'autore)`,
    standard: `Produci un riassunto EQUILIBRATO, NATURALE e BEN STRUTTURATO (formato intermedio di ~350 a 450 parole):

DIRETTIVA DI CALIBRAZIONE: Non essere troppo sbrigativo come nel formato rapido, né prolisso come nel formato dettagliato. Offri un vero punto d'incontro: fluido, concreto e senza divagazioni.

### 🎯 Panoramica Globale
(Un paragrafo scorrevole di 3-4 frasi che riassume il tema centrale, il contesto e il messaggio)

### ⏱️ Momenti Salienti & Svolgimento
- **[00:00] [Fase 1]** : Spiegazione concreta e punto chiave in 2 frasi concise.
- **[02:15] [Fase 2]** : Spiegazione concreta e punto chiave in 2 frasi concise.
- **[04:48] [Fase 3]** : Spiegazione concreta e punto chiave in 2 frasi concise.
- **[07:30] [Fase 4]** : Spiegazione concreta e punto chiave in 2 frasi concise.
(Seleziona 4 o 5 tappe salienti con i loro timestamp reali [mm:ss] della trascrizione)

### 📌 Conclusione & Insegnamento Chiave
(2 frasi che sintetizzano il consiglio principale dell'autore e il messaggio finale)`
  },
  de: {
    quick: `Erstelle eine KURZE, PRÄGNANTE und DIREKTE Zusammenfassung:
### ⚡ Kurz & Bündig
(2 bis 3 treffende Sätze, die das Wesentliche zusammenfassen)

### 🎯 Die wichtigsten Kernpunkte
- **[00:00] [Punkt 1]**: Kurze und konkrete Erklärung in 1 Satz.
- **[02:15] [Punkt 2]**: Kurze und konkrete Erklärung in 1 Satz.
- **[04:48] [Punkt 3]**: Kurze und konkrete Erklärung in 1 Satz.
(Nenne zwingend die echten Zeitstempel [mm:ss] aus dem Transkript)

### 📌 Fazit
(1 abschließender Schlusssatz)`,
    detailed: `Erstelle eine VOLLSTÄNDIGE, DETAILLIERTE und ERSCHÖPFENDE Analyse:
### 🎯 Überblick & Fragestellung
(Kontext, behandelte Problemstellung und Hauptthese des Videos)

### ⏱️ Chronologischer Ablauf & Schlüsselkapitel
- **[00:00] [Phase 1]**: Analyse und wesentliche Fakten.
- **[02:15] [Phase 2]**: Analyse und wesentliche Fakten.
- **[04:48] [Phase 3]**: Analyse und wesentliche Fakten.
(Stelle die Hauptetappen mit ihren realen Zeitstempeln [mm:ss] aus dem Transkript dar)

### 💡 Tiefenanalyse: Argumente, Daten & Beispiele
(Untersuche die dargelegten Fakten, Anekdoten oder Konzepte)

### 🛠️ Praktische Ratschläge & Handlungsschritte
(Alle sofort anwendbaren Erkenntnisse für den Zuschauer)

### 📌 Fazit & Ausblick
(Abschließende Botschaft und Ausblick des Autors)`,
    standard: `Erstelle eine AUSGEWOGENE, NATÜRLICHE und GUT STRUKTURIERTE Zusammenfassung (mittleres Format, ca. 350 bis 450 Wörter):

KALIBRIERUNGS-RICHTLINIE: Sei weder zu knapp wie im Kurzmodus, noch ausufernd wie im Detailmodus. Biete einen echten Mittelweg: prägnant, informativ und flüssig ohne Füllwörter.

### 🎯 Gesamtüberblick & Kernaussage
(Ein flüssiger Absatz aus 3-4 Sätzen, der das Thema, den Kontext und die Hauptbotschaft zusammenfasst)

### ⏱️ Wichtige Stationen & Ablauf
- **[00:00] [Meilenstein 1]**: Konkrete Erklärung und Kernpunkt in 2 prägnanten Sätzen.
- **[02:15] [Meilenstein 2]**: Konkrete Erklärung und Kernpunkt in 2 prägnanten Sätzen.
- **[04:48] [Meilenstein 3]**: Konkrete Erklärung und Kernpunkt in 2 prägnanten Sätzen.
- **[07:30] [Meilenstein 4]**: Konkrete Erklärung und Kernpunkt in 2 prägnanten Sätzen.
(Wähle 4 bis 5 Meilensteine mit ihren echten Zeitstempeln [mm:ss] aus dem Transkript)

### 📌 Kernaussage & Fazit
(2 Sätze mit der wichtigsten Handlungsempfehlung des Autors und dem abschließenden Fazit)`
  },
  en: {
    quick: `Produce a SHORT, CONCISE, and DIRECT summary in this format:
### ⚡ Quick Summary
(2 to 3 impactful sentences capturing the absolute essence)

### 🎯 Key Takeaways
- **[00:00] [Point 1]**: Short, concrete explanation in 1 sentence.
- **[02:15] [Point 2]**: Short, concrete explanation in 1 sentence.
- **[04:48] [Point 3]**: Short, concrete explanation in 1 sentence.
(Mandatorily cite real timestamps [mm:ss] from the transcript for each key takeaway)

### 📌 Conclusion
(1 final concluding sentence)`,
    detailed: `Produce a THOROUGH, DETAILED, and COMPREHENSIVE study guide:
### 🎯 Overview & Core Thesis
(Context, problem addressed, and central thesis of the video)

### ⏱️ Chronological Breakdown & Key Chapters
- **[00:00] [Milestone 1]**: In-depth analysis and key observations.
- **[02:15] [Milestone 2]**: In-depth analysis and key observations.
- **[04:48] [Milestone 3]**: In-depth analysis and key observations.
(Reconstruct key sections using their real timestamps [mm:ss] to enable player navigation)

### 💡 Deep Dive: Arguments, Data & Examples
(Analyze the data, case studies, or concepts presented)

### 🛠️ Actionable Advice & Practical Steps
(Actionable takeaways for the viewer)

### 📌 Author's Conclusion & Key Takeaway
(Final takeaway and perspective)`,
    standard: `Produce a BALANCED, NATURAL, and STRUCTURED summary (intermediate format, ~350 to 450 words):

CALIBRATION DIRECTIVE: Do not be overly brief like quick mode, nor excessively exhaustive like deep mode. Deliver a true middle-ground: substantive, engaging, and to the point without fluff.

### 🎯 Overview & Core Idea
(One engaging paragraph of 3-4 sentences establishing the video's context, thesis, and core message)

### ⏱️ Key Milestones & Breakdown
- **[00:00] [Highlight 1]**: Concrete explanation and key takeaway in 2 focused sentences.
- **[02:15] [Highlight 2]**: Concrete explanation and key takeaway in 2 focused sentences.
- **[04:48] [Highlight 3]**: Concrete explanation and key takeaway in 2 focused sentences.
- **[07:30] [Highlight 4]**: Concrete explanation and key takeaway in 2 focused sentences.
(Select 4 to 5 key milestones with their real [mm:ss] timestamps from the transcript)

### 📌 Main Takeaway & Conclusion
(2 sentences summarizing the author's primary actionable advice and concluding perspective)`
  }
};

export default WESTERN_TEMPLATES;
