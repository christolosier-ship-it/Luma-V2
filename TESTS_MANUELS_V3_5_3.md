# Tests manuels — Luma V3.5.3 — Consolidation & confort terrain

1. L’app se lance sans erreur console.
2. La version affichée est V3.5.3.
3. Un protocole vide apparaît dans Traitements.
4. L’état vide complet apparaît seulement si aucun protocole et aucun médicament n’existent.
5. Un protocole vide propose Ajouter traitement simple.
6. Un protocole vide propose Ajouter traitement à dosage variable.
7. La prochaine action privilégie une prise en retard.
8. Une action future ne masque pas une action en retard.
9. Le service worker ne recharge pas inutilement à la première installation.
10. Le service worker recharge une seule fois lors d’une mise à jour.
11. Une création n’est jamais rattachée automatiquement à un protocole archivé.
12. Si aucun protocole actif n’existe, Traitement principal actif est créé.
13. Plusieurs traitements variables sans dosage aujourd’hui sont listés séparément.
14. Chaque traitement variable sans dosage a son bouton Ouvrir calendrier.
15. Les protocoles actifs sont ouverts par défaut.
16. Les protocoles terminés ou archivés sont fermés par défaut.
17. Appliquer aux jours actifs fonctionne.
18. Appliquer aux jours actifs ne touche pas les jours hors période.
19. Copier lundi sur les jours actifs fonctionne.
20. Copier lundi affiche un message si lundi est vide ou hors période.
21. Modifier un dosage passé utilisé laisse la prise visible dans le Journal via historique.
22. Supprimer un dosage passé utilisé laisse la prise visible dans le Journal via historique.
23. Une note libre peut être supprimée depuis la modale.
24. Supprimer une note ne supprime pas les symptômes.
25. Une journée avec seulement des symptômes apparaît dans le CSV.
26. Le CSV n’affiche pas les symptômes à 0.
27. La suppression d’un protocole avec événements liés est refusée ou protégée.
28. La suppression d’un protocole avec dosageOverrides liés est refusée ou protégée.
29. Effacer les jours actifs ne supprime que les jours actifs de la semaine.
30. Le CSS Timeline reste visuellement correct.
31. Le README indique V3.5.3.
32. Export JSON V3.5.3 fonctionne.
33. Import JSON V3.5.3 fonctionne.
34. Export CSV fonctionne.
35. Rapport imprimable fonctionne.
36. Le texte alert(1) est affiché comme texte partout.
37. L’app fonctionne hors ligne après premier chargement.
38. La Timeline reste verticale.
39. Aujourd’hui reste calé sur la vraie date du jour.
40. Le service worker autoreload fonctionne toujours à l’ouverture.
