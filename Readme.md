<div align="center">

<br/>

# 🌿 Luma

### Suivi de traitements médicaux · PWA mobile · Offline-first

<br/>

![Version](https://img.shields.io/badge/version-2.1-7a9e87?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-4f7a62?style=flat-square)
![Offline](https://img.shields.io/badge/offline-ready-c8ddd0?style=flat-square&labelColor=4f7a62)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f5f0eb?style=flat-square&labelColor=7a7268)
![No deps](https://img.shields.io/badge/dépendances-aucune-e8a98a?style=flat-square)

<br/>


> Une application mobile douce et simple pour suivre ses traitements au quotidien.  
> Conçue pour les contextes médicaux qui changent souvent.

<br/>

</div>

-----

## ✨ Présentation

**Luma** est une application web progressive (PWA) pensée pour le suivi de traitements médicaux sur téléphone mobile. Elle fonctionne entièrement **hors ligne**, sans compte, sans serveur, sans cloud. Vos données restent sur votre téléphone.

L’interface est volontairement simple, apaisante et lisible — des gros boutons, des couleurs douces, aucune surcharge visuelle.

-----

## 📱 Fonctionnalités

### Aujourd’hui

- Vue des prises du jour sélectionné
- Pour chaque prise : heure, médicament, dosage, type, statut
- Actions en un tap :
  - **✓ Pris** — enregistre la prise avec horodatage
  - **⊘ Passer** — marque la prise comme ignorée
  - **+15 min** — reporte la prise de 15 minutes (cumulable)
  - **Annuler** — remet une prise à l’état prévu

### Calendrier

- Vue mensuelle navigable (mois précédent / suivant)
- Sélection libre de n’importe quel jour
- Indicateur visuel sur les jours avec des prises prévues
- L’écran Aujourd’hui suit automatiquement le jour sélectionné

### Traitements

- Liste de tous les médicaments configurés
- Ajout, modification et suppression de chaque traitement
- **Système de phases** : chaque médicament peut avoir plusieurs phases avec :
  - Date de début et date de fin
  - Dosage
  - Une ou plusieurs heures de prise
  - Notes libres
- Idéal pour les protocoles qui changent régulièrement

### Réglages

- **Export JSON** — sauvegarde complète de vos données
- **Import JSON** — restauration depuis une sauvegarde
- **Réinitialisation** — remise à zéro avec confirmation

-----

## 🏗️ Architecture

```
luma/
├── index.html          # Shell HTML, navigation, structure
├── manifest.json       # Configuration PWA
├── sw.js               # Service Worker (cache offline)
│
├── css/
│   └── style.css       # Design complet, variables CSS, mobile-first
│
├── js/
│   ├── db.js           # Couche IndexedDB (medications, phases, actions)
│   ├── utils.js        # Helpers : dates, toast, uid, formatage
│   ├── intakes.js      # Moteur de génération des prises depuis les phases
│   ├── today.js        # Écran Aujourd'hui
│   ├── calendar.js     # Calendrier mensuel navigable
│   ├── medications.js  # CRUD complet médicaments + phases
│   ├── settings.js     # Export / Import / Reset
│   ├── modal.js        # Système de modales bottom-sheet
│   └── app.js          # Contrôleur principal, navigation, boot
│
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

### Modèle de données

Les données sont séparées en trois entités dans IndexedDB :

|Store          |Contenu                                                 |
|---------------|--------------------------------------------------------|
|`medications`  |Nom, type/forme du médicament                           |
|`phases`       |Période, dosage, heures, notes — liées à un médicament  |
|`intakeActions`|Actions utilisateur (pris/passé/reporté) — clé composite|


> Les prises ne sont **jamais stockées en doublon**. Elles sont générées dynamiquement à partir des phases, puis enrichies avec les actions persistées. La clé d’une action est `medId|phaseId|YYYY-MM-DD|HH:MM`.

-----

## 🚀 Installation & déploiement

### Lancer en local

```bash
# Cloner le repo
git clone https://github.com/ton-pseudo/luma.git
cd luma

# Lancer un serveur local (nécessaire pour le Service Worker)
npx serve .
# ou
python3 -m http.server 8080
```

Ouvrir `http://localhost:8080` dans votre navigateur.

### Déployer sur GitHub Pages

1. Pousser le code sur votre repo GitHub
1. Aller dans **Settings → Pages → Source → Deploy from branch → `main` / `root`**
1. L’app sera accessible à `https://ton-pseudo.github.io/luma/`

> ⚠️ **Important pour GitHub Pages** : le `manifest.json` doit utiliser des chemins relatifs (`./`) et non absolus (`/`) pour que l’installation PWA fonctionne correctement depuis un sous-répertoire.

### Installer sur iPhone (Safari)

1. Ouvrir l’app dans Safari
1. Appuyer sur l’icône **Partager** (carré avec flèche)
1. Choisir **Sur l’écran d’accueil**
1. Confirmer → Luma s’installe comme une app native

-----

## 🎨 Design

L’interface suit une esthétique **douce et médicale, sans être clinique**.

|Variable      |Valeur   |Usage             |
|--------------|---------|------------------|
|`--bg`        |`#f5f0eb`|Fond général crème|
|`--sage`      |`#7a9e87`|Couleur principale|
|`--sage-dark` |`#4f7a62`|Accents, CTA      |
|`--sage-light`|`#c8ddd0`|Badges, chips     |
|`--peach`     |`#e8a98a`|Alerte, snooze    |
|`--text`      |`#3a3530`|Texte principal   |
|`--text-soft` |`#7a7268`|Texte secondaire  |

Polices : **Fraunces** (titres, serif doux) + **DM Sans** (corps, lisible)

-----

## 🔒 Vie privée

- ✅ Aucune donnée envoyée sur un serveur
- ✅ Aucun compte requis
- ✅ Aucun cookie de tracking
- ✅ Toutes les données stockées localement via **IndexedDB**
- ✅ Export/Import JSON pour la portabilité complète

-----

## 🧱 Stack technique

|Technologie            |Usage                                 |
|-----------------------|--------------------------------------|
|HTML / CSS / JS vanilla|Interface et logique — aucun framework|
|IndexedDB              |Persistance locale des données        |
|Service Worker         |Cache offline, installation PWA       |
|Web App Manifest       |Installabilité, icônes, thème         |

Aucune dépendance npm. Aucun bundler. Aucun build step.

-----

## 📋 Roadmap envisagée

- [ ] Notifications locales (rappels de prise)
- [ ] Vue hebdomadaire dans le calendrier
- [ ] Statistiques d’observance
- [ ] Thème sombre
- [ ] Partage de données entre appareils (optionnel, via export/import QR)

-----

## 🤝 Contribution

Les issues et pull requests sont les bienvenues. Ce projet est pensé pour rester simple — toute contribution doit respecter l’esprit minimaliste de l’app.

-----

<div align="center">

Fait avec 🌿 pour simplifier le quotidien médical.

</div>
