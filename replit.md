# CDEJ Espoir TG0154

Application de gestion des participants du Centre de Développement de l'Enfant et de la Jeunesse (CDEJ) Espoir, Togo - TG0154.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — démarrer le serveur API (port 8080)
- `pnpm --filter @workspace/cdej-espoir run dev` — démarrer le frontend (port 19229)
- `pnpm run typecheck` — vérification TypeScript complète
- `pnpm run build` — typecheck + build tous les packages
- `pnpm --filter @workspace/api-spec run codegen` — régénérer les hooks React Query et schémas Zod depuis l'OpenAPI spec
- `pnpm --filter @workspace/db run push` — pousser les changements de schéma DB (dev uniquement)
- `pnpm --filter @workspace/api-server run seed` — peupler la base de données avec des données de démo
- Required env: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter (routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (access + refresh tokens) + argon2 (hash)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cdej-espoir/` — Frontend React/Vite
- `artifacts/api-server/` — Backend Express API
- `lib/db/` — Schéma Drizzle + migrations
- `lib/db/src/schema/` — Tables: participants, enseignants, etablissements, presences, fiches, sante, scolarite, spirituel, finances, documents, notifications, affectations, tuteurs, referentiels, audit_log, users, imc

## Architecture decisions

- JWT avec access token (15min) + refresh token (7j) dans des cookies HttpOnly
- Tous les endpoints API protégés sauf `/api/auth/login` et `/api/healthz`
- Rate limiting sur `/api/auth/login` (10 req/15min)
- Audit log pour toutes les actions importantes
- Mode offline avec Dexie (IndexedDB) pour la résilience

## Product

Application complète de gestion pour CDEJ Espoir TG0154 :
- Gestion des participants (inscription, fiches, tuteurs)
- Présences et suivi scolaire
- Santé et IMC
- Finances et documents
- Suivi spirituel
- Statistiques et rapports
- Export Excel
- Notifications

## Comptes de démonstration (mot de passe: Demo1234!)

- `admin@cdej-espoir.local` — Administrateur
- `coordinateur@cdej-espoir.local` — Coordinatrice
- `enseignant@cdej-espoir.local` — Enseignant
- `sante@cdej-espoir.local` — Responsable Santé
- `comptable@cdej-espoir.local` — Comptable
- `viewer@cdej-espoir.local` — Lecteur

## User preferences

- Langue française pour l'interface et les messages
- Projet monorepo pnpm

## Gotchas

- Le seed utilise `tsx` comme fallback si le chargement direct ESM échoue — c'est normal
- `BASE_PATH` et `PORT` sont obligatoires pour le frontend Vite (fournis par le workflow)
- Pour GitHub Pages (frontend uniquement), utiliser le workflow `.github/workflows/deploy-github-pages.yml`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
