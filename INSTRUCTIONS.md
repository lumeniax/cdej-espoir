# Correctif déploiement GitHub Pages – CDEJ Espoir TG0154

## Diagnostic

Le site https://lumeniax.github.io/cdej-espoir/ affichait uniquement le `README.md` parce que :

1. **Le workflow GitHub Actions `deploy-github-pages.yml` était placé à la racine** du dépôt au lieu du dossier `.github/workflows/`. GitHub n'exécutait donc jamais ce workflow, et GitHub Pages se rabattait sur le rendu Jekyll par défaut du `README.md`.
2. **Aucun fichier `.nojekyll`** n'était présent dans le dossier servi par Pages — sans ce fichier, Jekyll ignore les dossiers commençant par `_` (que Vite génère parfois) et certains assets ne se chargent pas.

Le code source de l'application React/Vite est **correct et n'a pas besoin d'être modifié** :
- `vite.config.ts` gère bien `BASE_PATH`
- `src/App.tsx` utilise `import.meta.env.BASE_URL` pour le routeur Wouter
- `public/404.html` gère déjà la redirection SPA pour GitHub Pages

## Fichiers livrés dans ce ZIP

```
.github/
  workflows/
    deploy-github-pages.yml    ← NOUVEAU emplacement (avant : à la racine)
artifacts/
  cdej-espoir/
    public/
      .nojekyll                ← NOUVEAU fichier vide (anti-Jekyll)
```

## Marche à suivre

1. **Décompressez** ce ZIP à la racine du dépôt `cdej-espoir`. Cela va :
   - Créer `.github/workflows/deploy-github-pages.yml`
   - Créer `artifacts/cdej-espoir/public/.nojekyll`

2. **Supprimez** l'ancien fichier inutile à la racine du dépôt :
   ```bash
   git rm deploy-github-pages.yml
   ```

3. **Commit + push** :
   ```bash
   git add .github/workflows/deploy-github-pages.yml artifacts/cdej-espoir/public/.nojekyll
   git commit -m "fix(ci): déplace workflow Pages dans .github/workflows + ajoute .nojekyll"
   git push origin main
   ```

4. **Activez GitHub Pages en mode "GitHub Actions"** dans les paramètres du dépôt :
   - Allez sur **Settings → Pages**
   - Sous **Source**, choisissez **"GitHub Actions"** (et non plus "Deploy from a branch")
   - Sauvegardez

5. **Vérifiez le déploiement** :
   - Allez sur **Actions** dans le dépôt
   - Le workflow « Déployer sur GitHub Pages » doit se lancer automatiquement
   - Une fois terminé, le site sera disponible sur https://lumeniax.github.io/cdej-espoir/ avec l'application React (et non plus le README)

## Notes techniques

- Le workflow ajoute automatiquement `.nojekyll` et copie `index.html` vers `404.html` dans le build final pour garantir le fallback SPA, même si le `404.html` du dossier `public/` change.
- Aucune ligne de code applicatif n'a été modifiée : seul le pipeline CI/CD est corrigé.
- L'app reste 100 % compatible avec un déploiement Docker / VPS (le `BASE_PATH` reste configurable via variable d'environnement).
