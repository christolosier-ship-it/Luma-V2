# Tests manuels — Luma V3.5.5 - Correctifs terrain & simplification dosage

## Préparation

- Ouvrir l'application en PWA ou dans Safari/Chrome mobile.
- Ouvrir la console navigateur si possible.
- Tester au moins un traitement simple, un traitement à dosage variable, un protocole et un événement.
- Vérifier les exports/imports uniquement avec des fichiers de sauvegarde Luma V3.5.5.

## Liste de vérification minimale V3.5.5

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.5.
3. Les boutons de l’état vide Aujourd’hui fonctionnent.
4. Ajouter un protocole depuis Aujourd’hui fonctionne.
5. Ajouter un traitement simple depuis Aujourd’hui fonctionne.
6. Ajouter un traitement à dosage variable depuis Aujourd’hui fonctionne.
7. Le bouton Ouvrir calendrier depuis Aujourd’hui fonctionne.
8. Plusieurs traitements variables sans dosage ont chacun un bouton fonctionnel.
9. La prochaine action affiche une prise en retard avant une action future.
10. La prochaine action affiche un événement en retard avant une action future.
11. Un événement terminé n’est pas proposé comme prochaine action.
12. Modifier un dosage du jour déjà pris demande confirmation.
13. Supprimer un dosage du jour déjà pris demande confirmation.
14. Modifier un dosage futur ne demande pas de confirmation historique.
15. Le calendrier de dosage affiche les actions rapides dans un bloc repliable.
16. Le bouton Enregistrer la semaine reste visible.
17. Copier depuis une semaine précédente vide ne modifie rien.
18. Copier depuis une semaine précédente vide affiche un message clair.
19. Copier vers une semaine déjà remplie demande confirmation.
20. Le démarrage ne rend pas Journal immédiatement.
21. Naviguer vers Journal déclenche bien son rendu.
22. Naviguer vers Timeline déclenche bien son rendu.
23. Naviguer vers Traitements déclenche bien son rendu.
24. Le Déroulé du jour existe toujours.
25. Médicaments et événements restent triés chronologiquement dans Aujourd’hui.
26. Les événements sans heure affichent Sans horaire.
27. Les actions médicaments fonctionnent dans le Déroulé du jour.
28. Les actions événements fonctionnent dans le Déroulé du jour.
29. Export JSON V3.5.5 fonctionne.
30. Import JSON V3.5.5 fonctionne.
31. Export CSV fonctionne.
32. Rapport imprimable fonctionne.
33. Le texte `<script>alert(1)</script>` est affiché comme texte partout.
34. L’app fonctionne hors ligne après premier chargement.
35. La Timeline reste verticale.
36. Aujourd’hui reste calé sur la vraie date du jour.
37. Le service worker ne reload pas inutilement à la première installation.
38. Le service worker autoreload fonctionne lors d’une mise à jour.

## Scénarios détaillés recommandés

### État vide Aujourd’hui

1. Effacer ou importer une base vide V3.5.5.
2. Ouvrir Aujourd’hui.
3. Cliquer successivement sur Ajouter un protocole, Ajouter traitement simple, Ajouter traitement à dosage variable et Importer JSON.
4. Vérifier qu’aucun clic ne produit d’erreur JavaScript ou d’action muette.
5. Vérifier que Traitement principal est créé automatiquement si un formulaire de traitement nécessite un protocole.

### Prochaine action avec événements en retard

1. Créer un événement horaire aujourd’hui à 08:30, non terminé.
2. Créer une prise future aujourd’hui à 23:00.
3. Tester après 08:30.
4. Vérifier que le résumé affiche l’événement comme action en retard avant la prise future.
5. Marquer l’événement terminé et vérifier qu’il disparaît de la prochaine action.

### Protection des dosages d’aujourd’hui

1. Créer un traitement à dosage variable actif aujourd’hui.
2. Saisir le dosage du jour et marquer la prise comme prise.
3. Retourner dans le calendrier de dosage.
4. Modifier le dosage du jour : une confirmation doit apparaître.
5. Supprimer le dosage du jour : une confirmation doit apparaître.
6. Modifier un dosage futur : aucune confirmation liée à l’historique ne doit apparaître.

### Copier depuis semaine précédente

1. Ouvrir une semaine dont la semaine précédente ne contient aucun dosage copiable.
2. Cliquer Copier depuis semaine précédente dans Actions rapides.
3. Vérifier que rien n’est modifié et que le message “Aucun dosage à copier depuis la semaine précédente.” apparaît.
4. Remplir partiellement la semaine précédente.
5. Revenir à la semaine cible déjà partiellement remplie.
6. Cliquer Copier depuis semaine précédente et vérifier la confirmation “Certains jours vont être remplacés. Continuer ?”.
7. Confirmer et vérifier que seuls les dosages source existants des jours actifs sont copiés.

### Lazy render au démarrage

1. Recharger l’application avec la console ouverte.
2. Rester sur Aujourd’hui.
3. Vérifier que Journal n’est pas rendu immédiatement au démarrage.
4. Naviguer vers Journal et vérifier que son rendu se déclenche à ce moment.
5. Refaire la vérification pour Timeline et Traitements.
