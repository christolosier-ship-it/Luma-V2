# Tests manuels Luma V3.4.3 (correction ciblée)

1. L’app se lance sans erreur console.
2. La Timeline reste verticale.
3. Le bouton de création/édition événement Timeline fonctionne.
4. Un événement créé apparaît au bon jour dans Timeline.
5. Un événement créé pour aujourd’hui apparaît dans Aujourd’hui.
6. Un événement peut être modifié.
7. Un événement peut être supprimé avec confirmation.
8. Aucun placeholder openEventForm ne reste dans timeline.js.
9. Le rapport imprimable affiche la note si une note existe.
10. Le rapport imprimable affiche les symptômes uniquement si au moins un symptôme > 0.
11. Le rapport imprimable n’affiche jamais les symptômes à 0.
12. Le rapport imprimable n’affiche pas le titre “Symptômes” si tous les symptômes valent 0.
13. Le rapport imprimable échappe correctement <script>alert(1)</script>.
14. Export JSON fonctionne.
15. Import JSON V3.4.3 fonctionne.
16. Export CSV fonctionne.
17. Aujourd’hui reste calé sur la vraie date du jour.
