# Tests manuels — Luma V3.5.4 — Déroulé chronologique & fiabilité historique

## Socle application

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.4.
3. L’app fonctionne hors ligne après premier chargement.
4. Le service worker autoreload fonctionne toujours à l’ouverture.
5. La Timeline reste verticale.
6. Aujourd’hui reste calé sur la vraie date du jour.

## Aujourd’hui — Déroulé du jour

7. Aujourd’hui affiche une section “Déroulé du jour”.
8. Aujourd’hui n’affiche plus séparément “Prises du jour” et “Événements du jour”.
9. Dans Aujourd’hui, un événement à 08:30 apparaît avant une prise à 23:00.
10. Dans Aujourd’hui, un événement sans heure affiche “Sans horaire”.
11. Les cartes médicament conservent les actions Pris / Passer / Snooze / Annuler selon état.
12. Les cartes événement conservent les actions Terminer / Réouvrir.
13. La carte Résumé aujourd’hui reste correcte : prises prévues, réalisées, retard, événements.
14. Une prise en retard non finalisée reste prioritaire comme prochaine action.
15. Un événement sans horaire n’est proposé comme prochaine action qu’après les actions horaires pertinentes.

## Journal — chronologie et historique

16. Dans le Journal, prises et événements sont triés chronologiquement dans chaque journée.
17. Dans le Journal, les événements sans horaire apparaissent après les items horaires.
18. Dans le Journal, Note du jour et Symptômes restent séparés après le déroulé.
19. Une journée avec prise à 23:00 et événement à 08:30 affiche l’événement avant la prise.
20. Une prise historique reste visible après suppression du dosageOverride.
21. Une prise historique reste compréhensible après modification du dosageOverride.
22. Un badge “Historique” ou “Traitement modifié depuis” apparaît pour une prise affichée depuis un snapshot.
23. Aucune prise en doublon n’apparaît si la prise est encore générée normalement.

### Scénario A : suppression d’un dosage passé

1. Créer un traitement à dosage variable.
2. Renseigner un dosage pour aujourd’hui.
3. Marquer la prise comme prise.
4. Ouvrir le calendrier de dosage.
5. Supprimer le dosage du jour.
6. Aller dans Journal.
7. Vérifier que la prise reste visible avec le dosage snapshot.
8. Vérifier qu’un badge Historique ou équivalent apparaît.

### Scénario B : modification d’un dosage passé

1. Créer un dosage 75 mg.
2. Marquer la prise comme prise.
3. Modifier le dosage en 50 mg.
4. Aller dans Journal.
5. Vérifier que l’action historique reste compréhensible.
6. Vérifier que le rapport imprimable reste cohérent.

## Rapport imprimable

24. Le rapport imprimable affiche le déroulé du jour dans l’ordre chronologique.
25. Le rapport imprimable affiche les événements sans horaire après les lignes horaires.
26. Le rapport imprimable conserve logo et footer.
27. Le rapport imprimable n’affiche pas les symptômes à 0.
28. Le rapport imprimable n’affiche pas la section Symptômes si aucun symptôme > 0.
29. Le rapport imprimable n’affiche pas la section Note si aucune note libre.

## Export CSV

30. Le CSV respecte l’ordre chronologique par jour.
31. Le CSV place les événements sans horaire après les lignes horaires.
32. Le CSV exporte correctement les lignes note et symptômes.
33. Le CSV n’exporte pas les symptômes à 0.

## Calendrier de dosage — actions de semaine

34. Copier depuis semaine précédente avec une source vide ne modifie rien.
35. Copier depuis semaine précédente avec une semaine cible déjà remplie demande confirmation.
36. Copier depuis semaine précédente ne touche pas les jours hors période active.
37. Appliquer aux jours actifs ne touche pas les jours hors période active.
38. Effacer les jours actifs ne touche pas les jours hors période active.
39. Dupliquer vers semaine suivante reste clair et ne touche pas les jours hors période active.

### Scénario C : copie semaine précédente vide

1. Ouvrir une semaine sans dosages.
2. Aller sur la semaine suivante.
3. Cliquer “Copier depuis semaine précédente”.
4. Vérifier qu’aucun dosage existant n’est supprimé si la source est vide.
5. Vérifier que le message “Aucun dosage à copier depuis la semaine précédente.” apparaît.

## Import / export

40. Export JSON V3.5.4 fonctionne.
41. Le fichier JSON exporté suit le nom `luma-v3.5.4-backup-YYYY-MM-DD.json`.
42. Import JSON V3.5.4 fonctionne.
43. Le fichier CSV exporté suit le nom `luma-journal-v3.5.4-YYYY-MM-DD.csv`.

## Sécurité d’affichage

44. Le texte `<script>alert(1)</script>` est affiché comme texte dans le nom médicament.
45. Le texte `<script>alert(1)</script>` est affiché comme texte dans le type, le dosage saisi, les notes, les symptômes, autre symptôme, protocole et événement.
46. Le texte `<script>alert(1)</script>` est affiché comme texte dans Aujourd’hui, Timeline, Journal, rapport imprimable et CSV.
47. Aucun script ne s’exécute pendant ces essais.
