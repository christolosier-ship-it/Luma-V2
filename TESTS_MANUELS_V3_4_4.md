# Tests manuels — Luma V3.4.4

1. L’app se lance sans erreur console.
2. La version affichée est V3.4.4.
3. Le manifest indique V3.4.4.
4. Le service worker utilise un cache V3.4.4.
5. L’export JSON indique version 3.4.4.
6. L’import JSON V3.4.4 fonctionne.
7. L’import JSON V3.4.3 est refusé clairement.
8. Le formulaire événement affiche les types en français.
9. Créer un événement “Rendez-vous” enregistre bien type = appointment en base.
10. Éditer un événement garde le bon type.
11. Timeline affiche le type événement en français.
12. Aujourd’hui affiche le type événement en français.
13. Journal / CSV n’affichent pas de type événement anglais.
14. Le filtre protocole Timeline filtre réellement les prises.
15. Le filtre protocole Timeline filtre réellement les événements.
16. Les notes et symptômes restent visibles dans Timeline même si le filtre protocole est actif.
17. Le bouton “+ Symptômes” recharge les valeurs si la date est changée dans la modale.
18. Sauvegarder les symptômes depuis Aujourd’hui met immédiatement le résumé à jour.
19. Sauvegarder la note depuis Aujourd’hui met immédiatement le résumé à jour.
20. Les symptômes restent stockés uniquement dans dailySymptoms.
21. Les notes restent stockées uniquement dans dailyNotes.
22. Le rapport imprimable n’affiche pas les symptômes à 0.
23. Le rapport imprimable garde le logo.
24. La Timeline reste verticale.
25. Aujourd’hui reste calé sur la vraie date du jour.
26. Les statuts protocoles visibles sont en français.
27. Le texte <script>alert(1)</script> est affiché comme texte partout.
28. L’app fonctionne hors ligne après premier chargement.
