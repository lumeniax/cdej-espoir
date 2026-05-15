# CDEJ Espoir TG0154 — Guide de déploiement

## Option 1 — Docker Compose (recommandée)

### Prérequis
- Docker Engine 24+
- Docker Compose v2

### Déploiement rapide

```bash
# 1. Configurer les variables d'environnement
cp .env.example .env
nano .env   # Remplir JWT_SECRET, REFRESH_SECRET, SESSION_SECRET, PGPASSWORD

# 2. Lancer tous les services
docker-compose up -d

# 3. Initialiser la base de données
docker-compose exec api node dist/seed.mjs

# 4. Vérifier
docker-compose ps
docker-compose logs api
```

### Services démarrés

| Service | Port | Description |
|---------|------|-------------|
| db | 5432 | PostgreSQL 15 |
| api | 8080 | Serveur Express |
| frontend | 3000 | Fichiers statiques (nginx) |
| nginx | 80/443 | Proxy inverse |

---

## Option 2 — VPS Linux (Ubuntu 22.04)

### 1. Préparer le serveur

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql-15 nodejs npm

# Installer nvm + Node.js 24
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 24
npm install -g pnpm@10
```

### 2. Déployer l'application

```bash
# Créer l'utilisateur applicatif
sudo useradd -m -s /bin/bash cdejapp

# Cloner et builder
sudo -u cdejapp bash << 'DEPLOY'
cd ~
git clone <url-repo> cdej-espoir
cd cdej-espoir
pnpm install
pnpm run build
DEPLOY
```

### 3. Service systemd

```bash
sudo tee /etc/systemd/system/cdej-api.service << 'SERVICE'
[Unit]
Description=CDEJ Espoir API Server
After=network.target postgresql.service

[Service]
Type=simple
User=cdejapp
WorkingDirectory=/home/cdejapp/cdej-espoir
ExecStart=/home/cdejapp/.nvm/versions/node/v24.0.0/bin/node artifacts/api-server/dist/index.mjs
Restart=always
RestartSec=5
EnvironmentFile=/home/cdejapp/cdej-espoir/.env

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable cdej-api
sudo systemctl start cdej-api
```

### 4. Nginx (reverse proxy)

```bash
sudo tee /etc/nginx/sites-available/cdej-espoir << 'NGINX'
server {
    listen 80;
    server_name cdej-espoir.votre-domaine.tg;

    # Frontend statique
    location / {
        root /home/cdejapp/cdej-espoir/artifacts/cdej-espoir/dist/public;
        try_files $uri $uri/ /index.html;
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/cdej-espoir /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. HTTPS avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cdej-espoir.votre-domaine.tg
```

---

## Sauvegarde automatique

```bash
# Crontab pour sauvegardes quotidiennes
crontab -e
# Ajouter :
0 2 * * * cd /home/cdejapp/cdej-espoir && ./scripts/backup.sh /home/cdejapp/backups
```

---

## Déploiement sur Replit

L'application est préconfigurée pour Replit. Les workflows se lancent automatiquement :

1. **API Server** → `pnpm --filter @workspace/api-server run dev`
2. **Frontend** → `pnpm --filter @workspace/cdej-espoir run dev`

Cliquez sur **"Publish"** dans l'interface Replit pour déployer en production.

---

## Variables de production obligatoires

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<valeur_aleatoire_≥48_chars>
REFRESH_SECRET=<valeur_aleatoire_≥48_chars>
SESSION_SECRET=<valeur_aleatoire_≥32_chars>
FRONTEND_URL=https://cdej-espoir.votre-domaine.tg
```

---

## Vérification post-déploiement

```bash
# Vérifier l'API
curl https://votre-domaine.tg/api/healthz

# Vérifier les logs
sudo journalctl -u cdej-api -f
```
