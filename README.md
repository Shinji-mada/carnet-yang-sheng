# Carnet Yang Sheng

Appli de bien-être inspirée de la médecine traditionnelle chinoise : protocoles d'auto-massage de points avec minuteurs, recettes aux portions ajustables, recherche par ingrédients et par symptômes.

Ce n'est ni un diagnostic ni un traitement. En cas de symptôme qui dure, s'aggrave ou inquiète, il faut consulter un médecin.

## Installer sur Android

Ouvrir le site dans Chrome, puis menu ⋮ et « Installer l'application ». L'appli fonctionne ensuite hors ligne.

## Organisation du dépôt

- À la racine : l'appli publiée par GitHub Pages (`index.html`, `app.js`, `app.css`, `data.json`, `manifest.webmanifest`, `sw.js`, `icons/`, `fonts/`).
- `source/` : les fichiers de travail. Le contenu (fiches, symptômes, ingrédients) se modifie dans `source/data.json`, puis `python3 source/build.py` régénère l'appli à la racine.

Polices Atkinson Hyperlegible et Noto Serif SC sous licence SIL Open Font License (voir `fonts/`).
