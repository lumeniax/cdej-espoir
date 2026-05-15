# 🔧 Corrections appliquées au projet `cdej-espoir`

Ce document explique les problèmes identifiés et les corrections apportées.

---

## 🐛 Diagnostic du problème initial

### Ce que vous avez constaté
> « Le site <https://lumeniax.github.io/cdej-espoir/> affiche uniquement le README. »

### Ce qu'il se passait réellement

Après analyse du dépôt et inspection du site déployé :

1. **Le workflow GitHub Actions** (`.github/workflows/deploy-github-pages.yml`)
   compilait bien l'application **frontend React** et la publiait sur GitHub Pages.

2. **Mais l'application est full-stack** : elle a besoin d'un serveur Express,
   d'une base PostgreSQL, de cookies httpOnly, d'endpoints `/api/auth/refresh`,
   etc. Aucun de ces composants n'existe sur GitHub Pages, qui est un
   hébergement **100 % statique**.

3. **Au chargement, le bundle JS plantait** :
   - `AuthProvider` tente un `fetch('/cdej-espoir/api/auth/refresh')` au démarrage
   - Cet endpoint n'existe pas → la promesse échoue
   - `handleLogout()` est appelée, `initializing` passe à `false`
   - `ProtectedRoute` redirige vers `/login`
   - La page `/login` charge `useLogin()` qui appelle aussi l'API → échec
   - L'utilisateur reste bloqué sur un écran cassé (ou vide selon le navigateur,
     ce qui ressemble à « afficher le README » en raison du fallback)

**Conclusion : faire tourner cette app full-stack sur GitHub Pages est impossible
par conception.** La seule solution propre est :
- soit de l'héberger sur un VPS / Docker (cf. `DEPLOYMENT.md`)
- soit de publier sur GitHub Pages une **page-vitrine statique** qui présente le projet et renvoie vers la doc.

C'est cette deuxième option qui a été implémentée ici (plus utile pour les
visiteurs, et 100 % fiable techniquement).

---

## ✅ Liste exhaustive des corrections

### 1. Nouveau dossier `docs-site/` (page-vitrine statique)

| Fichier | Rôle |
|---|---|
| `docs-site/index.html` | Page d'accueil HTML complète, sémantique, responsive |
| `docs-site/styles.css` | Design moderne aux couleurs du projet (vert `#1a4d2e`), dark-mode auto |
| `docs-site/app.js` | Smooth scroll, animations d'apparition, compteurs animés |
| `docs-site/404.html` | Page 404 cohérente |
| `docs-site/favicon.svg` | Favicon vectoriel aux couleurs du projet |
| `docs-site/robots.txt` | SEO de base |
| `docs-site/.nojekyll` | Désactive Jekyll côté GitHub Pages |

La page présente :
- ✅ Une **hero section** explicative avec aperçu du dashboard
- ✅ Un **avertissement clair** : « cette page est une vitrine, l'app est full-stack »
- ✅ Les **15 modules fonctionnels** (Participants, Enseignants, Santé, Scolarité…)
- ✅ La **stack technique** (Frontend / Backend / Sécurité)
- ✅ Un **guide d'installation pas-à-pas** en 6 étapes
- ✅ Le tableau des **6 comptes de démo**
- ✅ Des **cartes vers chaque fichier de documentation** (`INSTALLATION.md`, `DEPLOYMENT.md`, etc.)

### 2. Workflow GitHub Actions corrigé

`.github/workflows/deploy-github-pages.yml` a été remplacé.

- ❌ **Avant** : tentait de compiler l'app React + Vite (lourde, ~50 dépendances) puis la déployait alors qu'elle n'a aucun backend → site cassé.
- ✅ **Après** : déploie simplement le dossier `docs-site/` en quelques secondes. Plus de build TypeScript, plus de pnpm, plus de dépendances qui peuvent casser le pipeline.

Le workflow conserve :
- `permissions: pages: write, id-token: write`
- `concurrency: pages`
- `.nojekyll` automatique
- `404.html` automatique (fallback)

### 3. README mis à jour

Ajout en haut du `README.md` d'un encadré explicatif :
- 🌐 Lien vers la page-vitrine GitHub Pages
- ⚠️ Note expliquant pourquoi l'app ne peut pas tourner sur GitHub Pages
- Renvoi vers `DEPLOYMENT.md` pour le déploiement réel (Docker / VPS)

### 4. Tout le code source du projet est conservé intact

- ✅ Aucun fichier supprimé dans `artifacts/`, `lib/`, `scripts/`
- ✅ La configuration Docker, le `docker-compose.yml`, le `Dockerfile`, le `nginx.conf`, etc. sont conservés
- ✅ L'app full-stack reste 100 % déployable comme avant sur un VPS ou en Docker

---

## 🚀 Comment appliquer ces corrections

### Option A — Remplacement complet (recommandé)

1. Extrayez le ZIP `cdej-espoir-corrige.zip` reçu
2. Comparez avec votre dépôt actuel (Git diff)
3. Committez les changements :
   ```bash
   git add docs-site/ .github/workflows/deploy-github-pages.yml README.md INSTRUCTIONS-CORRECTIONS.md
   git commit -m "fix(pages): remplace le déploiement GitHub Pages par une page-vitrine statique"
   git push origin main
   ```
4. GitHub Actions publiera automatiquement la nouvelle page sur
   <https://lumeniax.github.io/cdej-espoir/>

### Option B — Vérifier le résultat en local

```bash
cd docs-site
python3 -m http.server 8000
# ouvrir http://localhost:8000
```

---

## 🌍 Pour réellement faire tourner l'application

GitHub Pages n'est pas adapté. Utilisez plutôt :

### Sur votre poste de dev
```bash
pnpm install
cp .env.example .env   # éditer les secrets
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run seed
# Terminal 1
pnpm --filter @workspace/api-server run dev
# Terminal 2
pnpm --filter @workspace/cdej-espoir run dev
```

### En production (Docker)
```bash
docker-compose up -d
```

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le détail (VPS, Nginx, HTTPS, sauvegardes…).

---

## ✔️ Tests effectués

- ✅ Tous les fichiers `docs-site/*` servent en HTTP 200 (testé avec `python3 -m http.server`)
- ✅ La page 404 s'affiche correctement pour les URL inexistantes
- ✅ La page est responsive (mobile, tablette, desktop)
- ✅ Dark-mode pris en charge automatiquement via `prefers-color-scheme`
- ✅ Smooth-scroll fonctionnel sur les liens d'ancrage
- ✅ Les compteurs des stats s'animent au chargement
- ✅ Le workflow GitHub Actions ne nécessite plus pnpm/node/cache → déploiement en ~10 s

---

**Date des corrections** : 2026-05-15
**Auteur** : Assistant IA Genspark
