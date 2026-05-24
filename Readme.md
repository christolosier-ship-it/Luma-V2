# 🌿 Luma V3.3

Luma est une PWA mobile (offline-first) pour suivre les traitements, les événements protocole et le journal quotidien.

## Nouveautés V3.3

- Gestion multi-protocoles (actif, en pause, terminé, archivé).
- Timeline enrichie (prises, événements, notes libres).
- Notes du jour avec symptômes notés de **0 à 3**.
- Export / import JSON consolidé pour toutes les entités.
- Export CSV et rapport imprimable depuis le Journal.

## Fonctionnalités principales

### 1) Écran “Aujourd’hui”
- Liste des prises prévues sur la date sélectionnée.
- Actions rapides: pris, passer, reporter (+15 min), annuler.
- Bloc “Note du jour”:
  - Note libre.
  - Suivi des symptômes avec échelle:
    - 0 = aucun
    - 1 = léger
    - 2 = modéré
    - 3 = fort

### 2) Timeline
- Affichage chronologique des prises, événements et notes.
- Filtres par protocole.
- Les symptômes de la note du jour sont visibles dans la timeline avec la note libre.

### 3) Journal
- Consultation sur 7/30/90/180 jours ou période personnalisée.
- Statistiques d’observance.
- Export CSV v3.3.
- Rapport imprimable.

### 4) Traitements & Protocoles
- CRUD des médicaments et des phases.
- Gestion des protocoles et de leurs événements.

### 5) Réglages
- Export JSON complet.
- Import JSON validé.
- Réinitialisation totale des données.

## Stack technique

- HTML/CSS/JavaScript (vanilla)
- IndexedDB (stockage local)
- Service Worker + Manifest (PWA installable)

## Données locales

Toutes les données restent sur l’appareil utilisateur (pas de backend).

## Lancement local

```bash
python3 -m http.server 8080
```

Puis ouvrir: `http://localhost:8080`

## Version

Version actuelle: **3.3**
