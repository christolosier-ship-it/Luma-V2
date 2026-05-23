# TESTS MANUELS Luma V3.3

## Découplage Aujourd’hui / Timeline
- [ ] En Timeline, sélectionner une date future (J+10).
- [ ] Aller dans Aujourd’hui : la date affichée reste la date réelle du jour.
- [ ] Revenir Timeline : la sélection Timeline reste indépendante.

## Timeline verticale
- [ ] Toolbar sticky visible (filtre protocole + bouton Aujourd’hui).
- [ ] Rail vertical visible avec dots et cartes.
- [ ] Fenêtre -3j / +14j affichée.
- [ ] Journée avec seulement protocolEvents visible sans prises.

## Icônes
- [ ] `icons/icon-192.png` = 192x192.
- [ ] `icons/icon-512.png` = 512x512.
- [ ] Manifest déclare uniquement des tailles réelles.

## Protocoles et protocolId
- [ ] Éditer un médicament lié à un protocole conserve `protocolId`.
- [ ] Les phases sauvegardées gardent le même `protocolId`.
- [ ] Protocoles paused/completed/archived absents d’Aujourd’hui.

## Journal
- [ ] Filtres période et protocole opérationnels.
- [ ] Stats observance cohérentes selon filtre.
- [ ] Export CSV respecte les filtres actifs.
- [ ] Rapport imprimable lisible.
