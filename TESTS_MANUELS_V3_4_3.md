# Tests manuels Luma V3.4.3

1. L’app se lance sans erreur console.
2. La version affichée est V3.4.3.
3. Le manifest indique une version cohérente.
4. Aujourd’hui reste calé sur la vraie date du jour.
5. Aujourd’hui affiche deux blocs distincts : Note du jour et Symptômes du jour.
6. Enregistrer la note modifie uniquement dailyNotes.
7. Enregistrer les symptômes modifie uniquement dailySymptoms.
8. dailyNotes ne contient pas symptoms.
9. dailySymptoms contient les symptômes.
10. Le bloc Note du jour est ouvert si une note existe.
11. Le bloc Symptômes du jour est ouvert si au moins un symptôme > 0.
12. Les symptômes à 0 ne s’affichent pas dans le résumé fermé.
13. Timeline affiche la note libre dans une carte séparée.
14. Timeline affiche les symptômes dans une carte séparée.
15. Timeline n’affiche pas de carte symptômes si tous les symptômes sont à 0.
16. Timeline n’affiche pas de carte note si la note est vide.
17. Le bouton unique “+ Symptômes” existe dans la toolbar Timeline.
18. Le bouton “+ Symptômes” ouvre une modale avec choix de date.
19. Le bouton “+ Symptômes” permet d’ajouter des symptômes à la veille.
20. Si un symptôme existe déjà pour une date, l’enregistrement le remplace.
21. Remettre tous les symptômes à 0 fait disparaître la carte symptômes.
22. Le bouton “Aujourd’hui” de Timeline ramène visiblement au bloc d’aujourd’hui.
23. Cliquer sur “Aujourd’hui” dans Timeline ne modifie pas l’onglet Aujourd’hui.
24. Le Journal sépare Note du jour et Symptômes.
25. Le Journal n’affiche pas les symptômes à 0.
26. Le rapport imprimable n’affiche pas les symptômes à 0.
27. Le rapport imprimable affiche encore correctement le logo.
28. Le rapport imprimable reste imprimable/enregistrable en PDF.
29. Le CSV sépare note et symptômes.
30. Le texte <script>alert(1)</script> est affiché comme texte partout.
31. Export JSON V3.4.3 fonctionne.
32. Import JSON V3.4.3 fonctionne.
33. Export CSV fonctionne.
34. La Timeline reste verticale.
35. L’app fonctionne hors ligne après premier chargement.
