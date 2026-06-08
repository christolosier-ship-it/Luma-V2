# Tests manuels — Luma V3.5.9 - Correction manuelle des heures de prise

## Préconditions

- Tester sur navigateur desktop et mobile, idéalement iPhone Safari en mode PWA.
- Effectuer un export JSON avant toute manipulation destructive.
- Vérifier les exports/imports avec des fichiers de sauvegarde Luma V3.5.9.

## Liste de vérification minimale V3.5.9

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.9.
3. Le bouton Terminer des événements dans Aujourd’hui a une largeur cohérente.
4. Le bouton Snooze affiche +15mn.
5. Dans Aujourd’hui, événement affiche titre et type sur une ligne si possible.
6. Dans Aujourd’hui, traitement affiche nom et dosage sur une ligne si possible.
7. Les selects ressentis ne prennent plus toute la largeur.
8. Plusieurs ressentis peuvent s’afficher sur une même ligne.
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
30. Export JSON V3.5.9 fonctionne.
31. Import JSON V3.5.9 fonctionne.
32. Export CSV fonctionne.
33. Rapport imprimable fonctionne.
34. Le texte alert(1) est affiché comme texte partout.
35. L’app fonctionne hors ligne après premier chargement.
36. Le service worker autoreload fonctionne toujours à l’ouverture.


## Scénario V3.5.9 — Correction manuelle des heures réelles depuis la Timeline

1. Créer un traitement simple avec une prise à 08:00.
2. Attendre ou simuler une prise passée.
3. Depuis la Timeline, ouvrir le bouton … de la prise et corriger l’heure réelle à 09:15.
4. Vérifier que le badge devient **Pris en retard**.
5. Vérifier que le détail affiche **Prévu 08:00 · Pris 09:15** avec le retard.
6. Vérifier que l’heure prévue reste 08:00 dans la Timeline et le Journal.
7. Vérifier que le Journal affiche l’heure réelle et la mention **corrigé manuellement**.
8. Vérifier que l’export CSV contient Heure prévue = 08:00, Heure réelle = 09:15, Retard minutes = 75 et Détails contient **Correction manuelle**.
9. Corriger ensuite la même prise à 07:55.
10. Vérifier que le badge redevient **Pris** et que le détail indique la correction manuelle.
11. Marquer une autre prise comme **Passé**, puis la corriger depuis la Timeline.
12. Vérifier qu’elle redevient une prise réelle avec `status: taken`.
13. Corriger une prise déjà **Pris** et vérifier que l’heure réelle est mise à jour.
14. Corriger une prise **Pris en retard** vers une autre heure réelle.
15. Vérifier sur mobile narrow width que le bouton …, la modale et le détail restent lisibles.
16. Recharger complètement la PWA et vérifier que les corrections persistent.
17. Tester un export JSON puis un import JSON avec des données V3.5.9.
18. Tester l’import d’une sauvegarde V3.5.8 sans champs `manualTimeEdit*`.
19. Vérifier que les actions Aujourd’hui **Pris**, **Passer**, **+15mn** et **Annuler** fonctionnent toujours.
20. Vérifier que les boutons … existants des événements protocole et notes de Timeline sont conservés.
21. Vérifier qu’aucune notification Web Push n’a été ajoutée ou modifiée.
