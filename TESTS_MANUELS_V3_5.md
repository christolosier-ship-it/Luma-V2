# Tests manuels — Luma V3.5 — Dosages variables

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.
3. Le bouton + propose Traitement simple et Traitement à dosage variable.
4. Traitement simple fonctionne comme avant.
5. Création d’un traitement à dosage variable fonctionne.
6. Le calendrier hebdomadaire affiche lundi à dimanche.
7. Saisie lundi 75 mg, mardi 50 mg, mercredi 50 mg fonctionne.
8. La Timeline affiche les bons dosages aux bonnes dates.
9. Aujourd’hui affiche le dosage daté du jour.
10. Un jour sans dosageOverride ne génère pas de prise variable.
11. La semaine suivante peut avoir des dosages différents.
12. Le bouton semaine précédente fonctionne.
13. Le bouton semaine suivante fonctionne.
14. Dupliquer cette semaine vers la suivante fonctionne.
15. Effacer la semaine supprime les dosageOverrides de la semaine.
16. Modifier un dosage existant remplace l’ancien.
17. Modifier un traitement variable ne supprime pas ses dosages datés.
18. Le bouton Calendrier dosage ouvre l’éditeur du médicament.
19. Supprimer un traitement variable supprime ses dosageOverrides.
20. L’historique des prises conserve le dosageSnapshot.
21. Journal affiche les dosages datés.
22. CSV affiche les dosages datés.
23. Rapport imprimable affiche les dosages datés.
24. Export JSON V3.5 inclut dosageOverrides.
25. Import JSON V3.5 restaure dosageOverrides.
26. Import JSON V3.4.4 est refusé clairement.
27. Aucun champ alert(1) ne s’exécute.
28. L’app fonctionne hors ligne après premier chargement.
29. La Timeline reste verticale.
30. Aujourd’hui reste calé sur la vraie date du jour.
31. Installer Luma en PWA.
32. Modifier CACHE_NAME dans sw.js et déployer sur GitHub Pages.
33. Fermer complètement la PWA.
34. Rouvrir la PWA.
35. Vérifier qu’elle recharge automatiquement une seule fois.
36. Vérifier que la nouvelle version est affichée après reload.
37. Vérifier qu’il n’y a pas de boucle de rechargement.
38. Vérifier que les anciens caches Luma sont supprimés.
39. Vérifier que l’app fonctionne toujours hors ligne après mise à jour.
