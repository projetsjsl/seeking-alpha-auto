# Seeking Alpha Dashboard

Dashboard automatisé pour tracker les analyses Seeking Alpha.

## Installation

1. Ouvrez le dashboard: https://projetsjsl.github.io/seeking-alpha-auto/
2. Entrez votre token GitHub (créé sur https://github.com/settings/tokens avec permission "repo")
3. Ajoutez vos tickers via l'interface

## Scraping des données

1. Téléchargez `scraper-snippet.js`
2. Ouvrez Chrome et connectez-vous à Seeking Alpha
3. F12 > Sources > Snippets > New snippet
4. Collez le code de `scraper-snippet.js`
5. Remplacez VOTRE_TOKEN_ICI par votre token GitHub
6. Clic droit > Run

Le scraper va automatiquement extraire toutes les données et les sauvegarder sur GitHub.

## Fichiers

- `index.html` - Dashboard web
- `scraper-snippet.js` - Script de scraping Chrome
- `tickers.json` - Liste des tickers à suivre
- `stock_data.json` - Données scrapées
