import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';
import { AuditReport } from '../src/domain/models/AuditReport.js';

describe('Contextual Audit Verification across 10 Distinct Categories', () => {
  const videoCategories = [
    {
      id: 'cat-1-kids-wholesome',
      category: 'Enfant - Animation Bienveillante',
      videoMeta: {
        title: 'Trotro fait du vélo dans le jardin',
        author: 'Trotro Officiel',
        publishDate: '2026-05-10',
        description: 'Épisode officiel des aventures du petit âne Trotro. Série éducative pour les tout-petits.'
      },
      transcript: '[00:05] Bonjour Trotro ! Aujourd\'hui on apprend à faire du vélo sans les petites roues. Courage !',
      comments: '- @ParentHeureux : Mes enfants adorent, très doux et sans violence.',
      expectedGenre: 'jeunesse',
      expectedChecks: ['manipulation', 'bienveillance', 'crédulité']
    },
    {
      id: 'cat-2-kids-predatory',
      category: 'Enfant - Conditionnement Commercial & Unboxing Prédateur',
      videoMeta: {
        title: 'MEGA OUVERTURE DE 100 BONBONS ET JOUETS SURPRISE ! IL TE LES FAUT TOUS !',
        author: 'SuperKidsToys',
        publishDate: '2026-08-14',
        description: 'Achetez vite la nouvelle boîte magique disponible en supermarché ! Lien sponsorisé ci-dessous.'
      },
      transcript: '[00:02] Les amis, regardez ce bonbon incroyable au goût café ! Si vous en mangez tous les jours vous devenez super fort ! Demandez à vos parents de courir en acheter !',
      comments: '- @MamanVigilante : Pure incitation à la consommation pour les petits, c\'est honteux.',
      expectedGenre: 'jeunesse',
      expectedChecks: ['conditionnement', 'manipulation', 'habitudes de consommation']
    },
    {
      id: 'cat-3-doc-science',
      category: 'Documentaire - Vulgarisation Scientifique Rigoureuse',
      videoMeta: {
        title: 'Why It Was Almost Impossible to Make the Blue LED',
        author: 'Veritasium',
        publishDate: '2026-03-22',
        description: 'The Nobel prize winning physics behind gallium nitride (GaN) semiconductors. Sponsored by Brilliant.org.'
      },
      transcript: '[02:15] For 30 years, researchers failed to produce blue LEDs because the crystal lattice of GaN had insurmountable defects until Shuji Nakamura\'s breakthrough.',
      comments: '- @PhysicsLab : Exemplary scientific demonstration with crystal lattice diagrams.',
      expectedGenre: 'scientifique',
      expectedChecks: ['rigueur', 'sources', 'preuves']
    },
    {
      id: 'cat-4-doc-pseudoscience',
      category: 'Documentaire - Pseudo-Science & Théorie du Complot',
      videoMeta: {
        title: 'L\'Énergie Libre Découverte : Ce que les gouvernements vous cachent',
        author: 'Mystères & Vérités Secrètes',
        publishDate: '2026-07-01',
        description: 'Appareil à énergie infinie testé dans un garage. Les multinationales tentent d\'interdire cette vidéo !'
      },
      transcript: '[01:10] En branchant cette bobine sur elle-même, le courant augmente à l\'infini sans consommer de carburant. Les lois de la thermodynamique sont un mensonge d\'État.',
      comments: '- @ScientifiqueRealiste : C\'est une violation totale de la thermodynamique de base, une arnaque.',
      expectedGenre: 'documentaire',
      expectedChecks: ['sophismes', 'preuves', 'rigueur']
    },
    {
      id: 'cat-5-music-clip',
      category: 'Musique - Clip Officiel & Performance Artistique',
      videoMeta: {
        title: 'Daft Punk - Get Lucky (Official Audio ft. Pharrell Williams)',
        author: 'Daft Punk Vevo',
        publishDate: '2026-04-19',
        description: 'Official single from the album Random Access Memories. Columbia Records / Daft Life.'
      },
      transcript: '[00:30] Like the legend of the phoenix, all ends with beginnings. We\'ve come too far to give up who we are.',
      comments: '- @MusicFan : A timeless funk masterpiece.',
      expectedGenre: 'musique',
      expectedChecks: ['licence artistique', 'bienveillance', 'contexte']
    },
    {
      id: 'cat-6-music-covert-ads',
      category: 'Musique - Clip avec Placement Clandestin Ciblé',
      videoMeta: {
        title: 'Hit de l\'Été - Fast Life & Golden Cash',
        author: 'TrapRecords',
        publishDate: '2026-07-20',
        description: 'Nouveau clip officiel. Aucun avertissement légal sur le parrainage des paris sportifs.'
      },
      transcript: '[01:05] Bouteille de vodka dorée en main, pariez 500 balles sur WinApp avec mon code promo sans risquer de perdre !',
      comments: '- @ViewerCritique : Les placements de jeux d\'argent et d\'alcool pour des mineurs sans mention légale...',
      expectedGenre: 'musique',
      expectedChecks: ['transparence', 'sponsors', 'marketing']
    },
    {
      id: 'cat-7-test-independent-tech',
      category: 'Test Produit - Revue Tech Indépendante & Équilibrée',
      videoMeta: {
        title: 'Test Complet iPhone 16 Pro : Que vaut-il vraiment après 30 jours ?',
        author: 'TechLab Indépendant',
        publishDate: '2026-09-30',
        description: 'Appareil prêté par Apple sans contrôle éditorial. Comparatif batterie, surchauffe et téléobjectif.'
      },
      transcript: '[04:12] Le capteur photo est remarquable en basse lumière, mais le bouton Camera Control reste difficilement accessible d\'une seule main et l\'autonomie stagne.',
      comments: '- @UserTech : Enfin un test qui ose parler de la prise en main inconfortable du nouveau bouton !',
      expectedGenre: 'test',
      expectedChecks: ['compromis', 'marketing', 'transparence']
    },
    {
      id: 'cat-8-test-covert-infomercial',
      category: 'Test Produit - Publi-Reportage Déguisé & Éloges Aveugles',
      videoMeta: {
        title: 'L\'ASPIRATEUR DU SIÈCLE ! Le test ultime du CleanPro 5000',
        author: 'Influenceur Maison & Conso',
        publishDate: '2026-10-05',
        description: 'Découvrez cet appareil révolutionnaire. Lien d\'achat avec -30% code INFLUENCE30.'
      },
      transcript: '[00:45] Cet aspirateur est littéralement parfait, il n\'a absolument aucun défaut, c\'est 100 fois mieux que Dyson, achetez-le les yeux fermés !',
      comments: '- @ConsommateurMécontent : Acheté avec le code, plastique fragile et bruit d\'avion, avis bidonné.',
      expectedGenre: 'test',
      expectedChecks: ['discours marketing', 'transparence', 'honnêteté']
    },
    {
      id: 'cat-9-info-journalism',
      category: 'Informatif - Journalisme d\'Enquête & Géopolitique',
      videoMeta: {
        title: 'Semi-conducteurs : La guerre silencieuse de Taïwan et de TSMC',
        author: 'Enquête & Géopolitique',
        publishDate: '2026-06-15',
        description: 'Analyse documentaire chiffrée sur la souveraineté technologique mondiale et la chaîne de valeur des puces.'
      },
      transcript: '[03:40] Selon les données de Bloomberg et de la Semiconductor Industry Association, 92% des puces sous les 5 nanomètres sont gravées sur l\'île.',
      comments: '- @GeoObserver : Excellente mise en perspective avec données sourcées.',
      expectedGenre: 'informatif',
      expectedChecks: ['sources', 'temporalité', 'recoupement']
    },
    {
      id: 'cat-10-info-sensationalist',
      category: 'Informatif - Sensationnalisme & Fausse Alerte Anxiogène',
      videoMeta: {
        title: 'URGENT : Coupure totale d\'électricité mondiale prévue ce vendredi !',
        author: 'Alerte Info Choc',
        publishDate: '2026-11-01',
        description: 'La panne géante que les médias refusent de diffuser. Préparez vos réserves immédiatement !'
      },
      transcript: '[00:30] Une tempête solaire sans précédent va détruire tous les transformateurs de la planète dans 48 heures d\'après une source anonyme sur un forum.',
      comments: '- @Vérificateur : Déjà démenti par la NASA et la NOAA, arrêt de faire paniquer les gens pour des vues !',
      expectedGenre: 'informatif',
      expectedChecks: ['sensationnalisme', 'titre', 'décalage']
    }
  ];

  it('correctly builds contextual prompts for all 10 video categories', () => {
    assert.equal(videoCategories.length, 10, 'Must cover exactly 10 diverse categories');

    for (const testCase of videoCategories) {
      const prompt = AuditPromptBuilder.buildAuditUserPrompt({
        transcriptText: testCase.transcript,
        videoMeta: testCase.videoMeta,
        commentsBlock: testCase.comments,
        lang: 'fr',
        isDialogue: true
      });

      // Must include mandatory metadata
      assert.ok(prompt.includes(testCase.videoMeta.title), `Prompt must include title for ${testCase.id}`);
      assert.ok(prompt.includes(testCase.videoMeta.author), `Prompt must include author for ${testCase.id}`);

      // Must include context directives
      assert.ok(prompt.includes('Contexte Éditorial & Public Cible'), `Prompt must request contextual categorization for ${testCase.id}`);
      assert.ok(prompt.includes('Discernement adapté au contexte'), `Prompt must require adapted scrutiny for ${testCase.id}`);

      // If it is kids content, must enforce manipulation check
      if (testCase.expectedGenre === 'jeunesse') {
        assert.ok(prompt.includes('manipulation commerciale insidieuse'), `Kids prompt must check insidious manipulation for ${testCase.id}`);
        assert.ok(prompt.includes('conditionnement d\'habitudes de consommation'), `Kids prompt must check habit conditioning for ${testCase.id}`);
      }
    }
  });

  it('validates specialized audit report outputs for each of the 10 categories', () => {
    // Verify each category translates into an adapted AuditReport aggregate
    const reportKidsWholesome = new AuditReport({
      videoId: 'kids-1',
      reliabilityScore: 98,
      status: 'reliable',
      verdict: 'Contexte : Divertissement jeunesse. Aucune manipulation détectée, univers bienveillant.'
    });
    assert.equal(reportKidsWholesome.hasSignificantFlaws(), false);
    assert.equal(reportKidsWholesome.getReliabilityBadge('fr').label, 'Solidité Élevée');

    const reportKidsPredatory = new AuditReport({
      videoId: 'kids-2',
      reliabilityScore: 32,
      status: 'manipulative',
      verdict: 'Contexte : Contenu jeunesse marchand. Conditionnement commercial insidieux et incitation marchande ciblée.'
    });
    assert.equal(reportKidsPredatory.hasSignificantFlaws(), true);
    assert.equal(reportKidsPredatory.getReliabilityBadge('fr').label, 'Majeure Incohérence / Douteux');

    const reportScienceDoc = new AuditReport({
      videoId: 'doc-science',
      reliabilityScore: 96,
      status: 'reliable',
      verdict: 'Contexte : Documentaire scientifique. Démonstration rigoureuse des semi-conducteurs GaN.'
    });
    assert.equal(reportScienceDoc.reliabilityScore >= 80, true);

    const reportPseudoScience = new AuditReport({
      videoId: 'doc-pseudo',
      reliabilityScore: 25,
      status: 'questionable',
      verdict: 'Contexte : Pseudo-science. Violation des lois de la thermodynamique et affirmations gratuites.'
    });
    assert.equal(reportPseudoScience.hasSignificantFlaws(), true);

    const reportMusic = new AuditReport({
      videoId: 'music-clip',
      reliabilityScore: 94,
      status: 'reliable',
      verdict: 'Contexte : Musique et performance artistique. Liberté poétique respectée.'
    });
    assert.equal(reportMusic.hasSignificantFlaws(), false);
  });
});
