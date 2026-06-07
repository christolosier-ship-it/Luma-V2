# Tests manuels — Luma V3.6.0 - Notifications locales améliorées

## Préconditions

- Servir l’application depuis un serveur local ou HTTPS pour que la PWA, le service worker et l’API Notification fonctionnent correctement.
- Vérifier que Luma reste locale/offline-first : aucun compte, aucun backend, aucun Cloudflare Worker et aucun Web Push.
- Se souvenir de la limite produit : les notifications locales fonctionnent lorsque Luma est ouverte, active ou récemment active selon le navigateur/PWA. Elles ne sont pas garanties si l’application est totalement fermée par le système.

## Liste de vérification V3.6.0

1. Installer/ouvrir Luma V3.6.0.
2. Aller dans Réglages.
3. Vérifier présence de la carte Notifications locales.
4. Activer la bascule.
5. Accepter la permission navigateur.
6. Cliquer sur Tester.
7. Vérifier qu’une notification système apparaît.
8. Créer une prise dans 2 minutes.
9. Laisser Luma ouverte.
10. Vérifier qu’une seule notification apparaît à l’heure exacte.
11. Vérifier qu’aucune deuxième notification n’apparaît après.
12. Créer un événement dans 20 minutes.
13. Vérifier qu’une seule notification apparaît 15 minutes avant.
14. Marquer l’événement terminé avant le déclenchement.
15. Vérifier qu’aucune notification n’apparaît.
16. Créer une prise dans 2 minutes puis la marquer Pris avant l’heure.
17. Vérifier qu’aucune notification n’apparaît.
18. Créer une prise dans 2 minutes puis la marquer Passer avant l’heure.
19. Vérifier qu’aucune notification n’apparaît.
20. Désactiver la bascule.
21. Vérifier que plus aucune notification n’est programmée.
22. Réactiver et vérifier que les notifications du jour sont reprogrammées.
23. Modifier l’heure d’une prise future et vérifier que l’ancien timer disparaît.
24. Modifier l’heure d’un événement futur et vérifier que l’ancien timer disparaît.
25. Importer une sauvegarde JSON et vérifier que les notifications sont reprogrammées si la bascule est active.
26. Recharger complètement la PWA et vérifier que la planification reprend.
27. Tester sur mobile avec PWA ajoutée à l’écran d’accueil.
28. Vérifier que la documentation ne promet pas une notification garantie si l’app est complètement fermée.

## Anti-régression import/export

- Exporter un JSON V3.6.0 et vérifier que `version` vaut `3.6.0`.
- Importer une sauvegarde V3.5.8, V3.5.9 puis V3.6.0.
- Vérifier que le réglage local des notifications n’est pas exporté dans les données médicales.
- Exporter le Journal CSV et vérifier que le nom du fichier contient `luma-journal-v3.6.0`.

## Règles à confirmer

- Une prise prévue à 08:00 notifie à 08:00, pas à 08:15.
- Un événement prévu à 10:00 notifie à 09:45, pas à 10:00.
- Aucune notification de retard ou de rattrapage n’est envoyée après un horaire manqué.
- Une notification déjà livrée n’est pas renvoyée après rechargement.
- Le clic sur une notification rouvre ou recentre Luma via le service worker.
