# Tests manuels — Luma V3.5.6 - Polish mobile & priorité du jour

## Préparation

- Ouvrir l'application en PWA ou dans Safari/Chrome mobile.
- Ouvrir la console navigateur si possible.
- Tester au moins un traitement simple, un traitement à dosage variable, un protocole actif, des événements horaires et des événements sans horaire.
- Vérifier les exports/imports uniquement avec des fichiers de sauvegarde Luma V3.5.6.
- Tester les champs utilisateur avec le texte `<script>alert(1)</script>`.

## Liste de vérification minimale V3.5.6

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.6.
3. Aujourd’hui affiche toujours “Déroulé du jour”.
4. Une prise prise passe en bas du Déroulé du jour.
5. Un événement terminé passe en bas du Déroulé du jour.
6. Une prise en retard reste en haut.
7. Un événement non terminé reste dans les actions actives.
8. Les terminés apparaissent sous un séparateur discret ou en bas visuellement.
9. La prochaine action choisit un événement futur à 09:00 avant une prise à 23:00.
10. La prochaine action choisit une prise en retard avant un événement futur.
11. Les cartes Aujourd’hui médicament et événement ont une apparence cohérente.
12. Les cartes terminées sont plus compactes.
13. Les actions médicament fonctionnent encore.
14. Les actions événement fonctionnent encore.
15. La Timeline reste verticale.
16. Les cartes Timeline sont plus compactes.
17. Les boutons Timeline tiennent sur une ou deux lignes maximum.
18. Les statuts Timeline appliquent bien leurs couleurs.
19. Le bouton Aujourd’hui de Timeline provoque un highlight visible.
20. La note libre Timeline a une action Modifier plus discrète.
21. Les boutons compacts restent tactiles sur mobile.
22. Les couleurs de statut sont lisibles.
23. Les badges de statut sont homogènes.
24. Le résumé Aujourd’hui reste lisible et plus compact.
25. Export JSON V3.5.6 fonctionne.
26. Import JSON V3.5.6 fonctionne.
27. Export CSV fonctionne.
28. Rapport imprimable fonctionne.
29. Le texte alert(1) est affiché comme texte partout.
30. L’app fonctionne hors ligne après premier chargement.
31. Le service worker autoreload fonctionne toujours à l’ouverture.
32. Aucun changement de modèle IndexedDB inutile n’a été introduit.

## Scénarios ciblés recommandés

### Priorité Aujourd’hui

1. Créer une prise à 08:00, une prise à 23:00 et un événement à 09:00.
2. Marquer la prise de 08:00 comme prise : elle doit descendre sous “Terminés aujourd’hui”.
3. Marquer l’événement de 09:00 terminé : il doit descendre sous “Terminés aujourd’hui”.
4. Revenir avec un événement 09:00 non terminé et une prise 23:00 à venir : la prochaine action doit être l’événement 09:00.
5. Ajouter une prise en retard : la prochaine action doit afficher “Action en retard”.

### UI mobile et Timeline

1. Sur une largeur proche iPhone, vérifier que les cartes Aujourd’hui médicament et événement ont la même densité visuelle.
2. Vérifier qu’un élément terminé est compact et atténué sans perdre l’action d’annulation/réouverture.
3. Dans Chronologie, vérifier que les cartes prise et événement restent verticales, compactes et lisibles.
4. Cliquer sur Aujourd’hui dans Chronologie : le bloc du jour doit recevoir un halo discret.
5. Vérifier que les boutons compacts restent utilisables au doigt.

### Sécurité d’affichage

1. Saisir `<script>alert(1)</script>` comme nom de traitement, dosage, note libre, libellé autre symptôme et titre d’événement.
2. Ouvrir Aujourd’hui, Chronologie, Journal, export CSV et rapport imprimable.
3. Vérifier qu’aucun script ne s’exécute et que le texte reste affiché comme texte.
