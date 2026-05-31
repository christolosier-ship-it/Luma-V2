# Tests manuels — Luma V3.5.8 - Compactage mobile & homogénéisation UI

## Préconditions

- Tester sur navigateur desktop et mobile, idéalement iPhone Safari en mode PWA.
- Effectuer un export JSON avant toute manipulation destructive.
- Vérifier les exports/imports avec des fichiers de sauvegarde Luma V3.5.8.

## Liste de vérification minimale V3.5.8

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.8.
3. Le bouton Terminer des événements dans Aujourd’hui a une largeur cohérente.
4. Le bouton Snooze affiche +15mn.
5. Dans Aujourd’hui, événement affiche titre et type sur une ligne si possible.
6. Dans Aujourd’hui, traitement affiche nom et dosage sur une ligne si possible.
7. Les selects symptômes ne prennent plus toute la largeur.
8. Plusieurs symptômes peuvent s’afficher sur une même ligne.
9. Dans Chronologie, les événements n’ont plus trois boutons visibles.
10. Dans Chronologie, le bouton … ouvre la modale de l’événement.
11. Dans Chronologie, un traitement tient sur une ou deux lignes.
12. Dans Chronologie, un événement tient sur une ou deux lignes.
13. Les événements sans horaire affichent toujours Sans horaire.
14. Dans Traitements, les protocoles repliables sont moins indentés.
15. Les traitements simples sont plus compacts.
16. Les traitements à dosage variable sont plus compacts.
17. Le bouton Calendrier de dosage texte a disparu.
18. Le bouton 🗓️ apparaît entre ✏️ et 🗑️.
19. Le bouton 🗓️ ouvre le calendrier de dosage.
20. Les boutons Traitements ont des couleurs cohérentes avec Aujourd’hui.
21. Les boutons Journal ont des couleurs cohérentes avec Aujourd’hui.
22. Les boutons icône ont une taille homogène.
23. Prendre une prise fonctionne toujours.
24. Passer une prise fonctionne toujours.
25. +15mn fonctionne toujours.
26. Annuler une action fonctionne toujours.
27. Modifier un événement fonctionne toujours.
28. Terminer / réouvrir un événement fonctionne depuis la modale.
29. Supprimer un événement fonctionne avec confirmation.
30. Export JSON V3.5.8 fonctionne.
31. Import JSON V3.5.8 fonctionne.
32. Export CSV fonctionne.
33. Rapport imprimable fonctionne.
34. Le texte alert(1) est affiché comme texte partout.
35. L’app fonctionne hors ligne après premier chargement.
36. Le service worker autoreload fonctionne toujours à l’ouverture.
