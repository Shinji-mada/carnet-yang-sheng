# Carnet Yang Sheng

Appli de bien-être inspirée de la médecine traditionnelle chinoise : protocoles d'auto-massage de points avec minuteurs, recettes aux portions ajustables, recherche par ingrédients et par symptômes.

Ce n'est ni un diagnostic ni un traitement. En cas de symptôme qui dure, s'aggrave ou inquiète, il faut consulter un médecin.

## Installer sur Android

Ouvrir le site dans Chrome, puis menu ⋮ et « Installer l'application ». L'appli fonctionne ensuite hors ligne.

## Organisation du dépôt

- À la racine : l'appli publiée par GitHub Pages (`index.html`, `app.js`, `app.css`, `data.json`, `manifest.webmanifest`, `sw.js`, `icons/`, `fonts/`).
- `source/` : les fichiers de travail. Le contenu se modifie dans `source/contenu/` (organes et ingrédients dans `base.json`, puis symptômes, points, tableaux, recettes et protocoles). `python3 source/build.py` vérifie les références croisées et régénère l'appli à la racine.
- Les carnets personnels, favoris et récents restent dans le téléphone (stockage local du navigateur).

Polices Atkinson Hyperlegible et Noto Serif SC sous licence SIL Open Font License (voir `fonts/`).

## Comptes (facultatifs)

La connexion (e-mail et mot de passe, Google, Facebook en option) et la synchronisation des carnets passent par Firebase.
- `source/compte/compte.src.js` : le module de compte ; `sh source/compte/build.sh` le regroupe avec le SDK Firebase dans `source/vendor/compte.js`.
- `source/firebase.json` : la configuration web du projet Firebase (identifiants publics). Sans ce fichier, l'appli fonctionne sans comptes.
- `source/compte/firestore.rules` : les règles de sécurité à coller dans la console Firebase (chacun ne lit et n'écrit que son propre document).
- Ne sont synchronisés que les carnets, favoris, récents, fiches masquées, classements, le nom et la photo. Les symptômes et les ingrédients restent sur l'appareil.
