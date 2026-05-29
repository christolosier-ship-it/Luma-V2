# Tests manuels — Luma V3.5.1 — Ergonomie dosage variable

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.1.
3. Le sous-résumé redondant sous Aujourd’hui a disparu.
4. La carte Résumé aujourd’hui est conservée.
5. La vue Traitements est organisée par protocole.
6. Les médicaments apparaissent sous leur protocole.
7. La liste séparée des protocoles n’existe plus.
8. La liste compacte séparée des médicaments n’existe plus.
9. La barre de recherche Traitements a disparu.
10. Le bouton + Protocole séparé a disparu.
11. Le gros bouton + propose Ajouter un protocole.
12. Le gros bouton + propose Ajouter un traitement simple.
13. Le gros bouton + propose Ajouter un traitement à dosage variable.
14. Le gros bouton + propose Ajouter un événement de protocole.
15. Un traitement simple fonctionne comme avant.
16. Un traitement à dosage variable n’accepte qu’un seul horaire.
17. L’horaire de prise utilise un input type time.
18. Un traitement variable ne génère qu’une prise par jour.
19. Les jours hors période active sont grisés.
20. Les jours hors période active ne peuvent pas recevoir de dosage.
21. “Dupliquer vers semaine suivante” fonctionne.
22. “Copier depuis semaine précédente” fonctionne.
23. Copier vers une semaine déjà remplie demande confirmation.
24. La carte traitement variable affiche X / 7 jours renseignés.
25. Aujourd’hui signale un traitement variable actif sans dosage aujourd’hui.
26. Changer le protocole d’un traitement variable met à jour ses dosageOverrides.
27. Modifier un dosage passé utilisé affiche une confirmation.
28. Supprimer un dosage passé utilisé affiche une confirmation.
29. createdAt d’un override existant est préservé.
30. Journal affiche les dosages datés.
31. CSV affiche les dosages datés.
32. Rapport imprimable affiche les dosages datés.
33. Export JSON V3.5.1 inclut dosageOverrides.
34. Import JSON V3.5.1 restaure dosageOverrides.
35. Import JSON V3.5.0 est refusé clairement.
36. Aucun champ alert(1) ne s’exécute.
37. L’app fonctionne hors ligne après premier chargement.
38. La Timeline reste verticale.
39. Aujourd’hui reste calé sur la vraie date du jour.
40. Le service worker autoreload fonctionne toujours à l’ouverture.
