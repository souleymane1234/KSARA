# KSARA Plateforme — Vite + React

Plateforme SIGRH & SIGL de l'agence KSARA (site vitrine, connexion, RH/paie, gestion locative,
finance, juridique, relation client, portail client), convertie en projet Vite + React.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production → dist/
npm run preview
```

Comptes de démonstration (mot de passe : `ksara2026`) : `admin`, `service_paie1`,
`service_juridique1`, `service_syndic1`, `service_marketing1`, `client_aka`.
Les données sont stockées dans le `localStorage` du navigateur (clé `ksara_platform_v1`).

## Structure

```
index.html                  point d'entrée Vite (polices Google Fonts)
public/media/               vidéo d'accueil (hero.mp4, hero.webm)
src/
  main.jsx                  montage React
  App.jsx                   composant racine (démarre / arrête le moteur)
  components/MountPoints.jsx conteneurs #root, #modal-root, #drawer-root, #tour-root, #toast-root
  styles/global.css         feuille de style complète (thème clair/sombre)
  assets/images/            logo + photos des biens (fichiers réels, plus de base64)
  lib/                      utils, icônes, config, assets
  data/                     référentiels (services, modules, permissions), jeu de données de démo
  legacy/engine.js          moteur : vues, modules, formulaires, actions, événements
```

## Note sur l'architecture

Les vues du moteur (`src/legacy/engine.js`) sont des fonctions qui produisent du HTML et
gèrent les événements par délégation (`data-act`, `data-form`). React héberge ce moteur :
il fournit les conteneurs et gère le cycle de vie (démarrage, nettoyage). Pour migrer
un module vers de vrais composants React, remplacez sa fonction de page dans l'objet `PAGES`
par un composant monté dans un conteneur dédié, module par module.
