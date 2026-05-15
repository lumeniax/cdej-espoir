# CDEJ Espoir TG0154 — Système de gestion des participants

Logiciel de gestion des participants pour le Centre de Développement de l'Enfant et du Jeune (CDEJ) Espoir, Togo — numéro de projet TG0154.

Application web full-stack **mobile-first**, **PWA**, avec mode **hors-ligne** pour les présences de terrain.

🌐 **Page vitrine du projet** : <https://lumeniax.github.io/cdej-espoir/>

> ⚠️ **Important — GitHub Pages**
>
> Le site <https://lumeniax.github.io/cdej-espoir/> ne fait tourner **que la page-vitrine** du projet (dossier `docs-site/`). L'application réelle est une **stack full-stack** (React + Express + PostgreSQL + authentification JWT par cookies httpOnly) ; elle ne peut **pas** être hébergée sur GitHub Pages qui ne sert que du statique.
>
> Pour utiliser réellement le logiciel, suivez la section [Installation locale](#installation-locale) ou [DEPLOYMENT.md](./DEPLOYMENT.md) (Docker / VPS).

---

## Stack technique

- **Frontend** : React 19 + Vite 7, React Query 5, Wouter, Tailwind CSS 4 + shadcn/ui, Dexie.js (offline)
- **API** : Express 5, Node.js 24, TypeScript 5.9
- **Base de données** : PostgreSQL 15 + Drizzle ORM
- **Validation** : Zod v4, drizzle-zod
- **Sécurité** : Argon2id (mots de passe), JWT HS256 (accès 15 min), cookie httpOnly (refresh 7 jours)
- **Monorepo** : pnpm workspaces

---

## Prérequis

- Node.js 24+
- pnpm 10+
- PostgreSQL 15+

---

## Installation locale

```bash
git clone <repo-url>
cd cdej-espoir
pnpm install
cp .env.example .env
# Éditer .env avec vos valeurs
```

---

## Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | Oui |
| `JWT_SECRET` | Secret JWT (≥32 caractères) | Oui |
| `REFRESH_SECRET` | Secret refresh token (≥32 caractères) | Oui |
| `SESSION_SECRET` | Secret session Express | Oui |
| `FRONTEND_URL` | URL frontend (production uniquement) | Prod |
| `PORT` | Port API (défaut: 8080) | Non |
| `NODE_ENV` | `development` ou `production` | Non |

---

## Base de données

```bash
pnpm --filter @workspace/db run push           # Migrer le schéma
pnpm --filter @workspace/api-server run seed   # Données de démo
```

---

## Lancement

```bash
pnpm --filter @workspace/api-server run dev    # API sur $PORT
pnpm --filter @workspace/cdej-espoir run dev   # Frontend sur $PORT
```

Sur Replit, les workflows se lancent automatiquement.

---

## Build production

```bash
pnpm run build
```

---

## Tests

```bash
pnpm run typecheck          # Vérification TypeScript complète
pnpm run build              # Typecheck + build tous les packages
```

---

## Déploiement

```bash
docker-compose up -d        # Voir DEPLOYMENT.md
```

---

## Comptes de démonstration

Mot de passe commun : **`Demo1234!`**

| Email | Rôle | Accès |
|-------|------|-------|
| admin@cdej-espoir.local | admin | Accès complet |
| coordinateur@cdej-espoir.local | coordinateur | Gestion participants, présences |
| enseignant@cdej-espoir.local | enseignant | Présences, lecture participants |
| sante@cdej-espoir.local | sante | Mesures IMC, lecture participants |
| comptable@cdej-espoir.local | comptable | Fiches paiement, lecture participants |
| viewer@cdej-espoir.local | viewer | Lecture seule |

---

## Structure du projet

```
artifacts/
  api-server/        # Serveur Express 5
  cdej-espoir/       # Application React (frontend PWA)
lib/
  db/                # Schéma Drizzle + client PostgreSQL
  api-spec/          # Contrat OpenAPI (source de vérité)
  api-client-react/  # Hooks React Query générés (Orval)
  api-zod/           # Schémas Zod générés (Orval)
scripts/             # Scripts utilitaires (backup, restore)
docs/                # Documentation complémentaire
```

---

## Modules fonctionnels

- **Participants** — Gestion complète avec identifiants TG015400XXX
- **Enseignants** — Gestion du personnel pédagogique
- **Établissements** — Écoles et structures partenaires
- **Affectations** — Liaison participants ↔ enseignants ↔ établissements
- **Présences** — Suivi par session, mode hors-ligne
- **Santé** — Suivi médical, vaccins, consultations
- **Scolarité** — Bulletins et résultats scolaires
- **Spirituel** — Suivi engagement spirituel
- **Finances** — Suivi des financements
- **Documents** — Gestion des documents attachés
- **IMC** — Mesures anthropométriques (classification OMS)
- **Fiches de paiement** — Suivi financier
- **Notifications / SMS** — Alertes et communications tuteurs
- **Import/Export** — Excel et CSV
- **Audit Log** — Journal complet des actions

---

## Commandes utiles

```bash
pnpm run typecheck                             # Vérification TypeScript
pnpm run build                                 # Build production
pnpm --filter @workspace/api-spec run codegen  # Régénérer hooks et schémas
pnpm --filter @workspace/db run push           # Pousser le schéma DB
pnpm --filter @workspace/api-server run seed   # Seeder la base
```

---

## Documentation

- [INSTALLATION.md](./INSTALLATION.md) — Installation détaillée
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Déploiement VPS/Docker
- [SECURITY.md](./SECURITY.md) — Sécurité
- [USER_GUIDE.md](./USER_GUIDE.md) — Guide utilisateur
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) — Guide administrateur
- [OFFLINE_MODE.md](./OFFLINE_MODE.md) — Mode hors-ligne
- [FINAL_REPORT.md](./FINAL_REPORT.md) — Rapport final
