#!/bin/sh
# Regroupe le module de compte et le SDK Firebase en un seul fichier ES.
# Prérequis : npm i firebase esbuild (dans ce dossier ou un dossier parent).
cd "$(dirname "$0")"
npx esbuild compte.src.js --bundle --format=esm --minify --target=es2020 --legal-comments=eof --outfile=../vendor/compte.js
