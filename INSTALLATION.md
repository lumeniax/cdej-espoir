# CDEJ Espoir TG0154 — Guide d'installation

## Prérequis système

| Composant | Version minimale | Recommandée |
|-----------|-----------------|-------------|
| Node.js | 20.x | 24.x LTS |
| pnpm | 9.x | 10.x |
| PostgreSQL | 14 | 15 |
| Système d'exploitation | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |
| RAM | 512 Mo | 2 Go |
| Disque | 2 Go | 10 Go |

---

## Installation Node.js 24

```bash
# Via nvm (recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
node --version   # → v24.x.x

# Installer pnpm
npm install -g pnpm@10
pnpm --version   # → 10.x.x
```

---

## Installation PostgreSQL 15

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Créer la base et l'utilisateur
sudo -u postgres psql << SQL
CREATE DATABASE cdej_espoir;
CREATE USER cdej_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE cdej_espoir TO cdej_user;
ALTER DATABASE cdej_espoir OWNER TO cdej_user;
SQL
```

---

## Installation de l'application

```bash
# 1. Récupérer le code source
git clone <url-du-depot> cdej-espoir
cd cdej-espoir

# 2. Installer les dépendances
pnpm install

# 3. Variables d'environnement
cp .env.example .env
nano .env   # éditer avec vos valeurs réelles
```

### Contenu minimal du .env

```env
DATABASE_URL=postgresql://cdej_user:votre_mot_de_passe@localhost:5432/cdej_espoir
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire_ici
REFRESH_SECRET=votre_secret_refresh_tres_long_et_aleatoire_ici
SESSION_SECRET=votre_secret_session_tres_long
NODE_ENV=development
PORT=8080
```

#### Générer des secrets sécurisés

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Initialisation de la base de données

```bash
# Pousser le schéma Drizzle
pnpm --filter @workspace/db run push

# Initialiser les données de référence et comptes de démo
pnpm --filter @workspace/api-server run seed
```

---

## Lancement en développement

```bash
# Terminal 1 — API
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/cdej-espoir run dev
```

---

## Vérification de l'installation

```bash
# Tester l'API
curl http://localhost:8080/api/healthz

# Réponse attendue
# {"status":"ok","version":"..."}
```

Ouvrez http://localhost:5173 dans un navigateur et connectez-vous avec :
- Email : `admin@cdej-espoir.local`
- Mot de passe : `Demo1234!`

---

## Compilation et vérification TypeScript

```bash
pnpm run typecheck   # Vérification TypeScript complète
pnpm run build       # Build de production
```

---

## Mise à jour

```bash
git pull
pnpm install
pnpm --filter @workspace/db run push
```
