# CDEJ Espoir TG0154 — Guide administrateur

## Accès administration

Connectez-vous avec le rôle **admin** (`admin@cdej-espoir.local` en démo).

---

## Gestion des utilisateurs

### Créer un compte utilisateur

1. Allez dans **Administration → Utilisateurs**
2. Cliquez sur **Nouvel utilisateur**
3. Remplissez : email, nom complet, rôle, mot de passe temporaire
4. L'utilisateur doit changer son mot de passe dès la première connexion (recommandé)

### Rôles disponibles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| `admin` | Administrateur | Accès complet + gestion utilisateurs, référentiels, audit |
| `coordinateur` | Coordinateur | Gestion participants, présences, affectations, export |
| `enseignant` | Enseignant | Saisie présences, lecture participants |
| `sante` | Personnel de santé | Saisie IMC/santé, lecture participants |
| `comptable` | Comptable | Fiches de paiement, lecture participants |
| `viewer` | Lecteur | Lecture seule sur toutes les données |

### Désactiver un compte

1. Dans la liste des utilisateurs, cliquez sur l'utilisateur
2. Décochez **Compte actif**
3. Enregistrez — l'utilisateur ne pourra plus se connecter

---

## Gestion des référentiels

Les référentiels définissent les listes de valeurs utilisées dans les formulaires.

1. Allez dans **Administration → Référentiels**
2. Types de référentiels disponibles :
   - Classes
   - Niveaux scolaires
   - Types de financements
   - Motifs de sortie
   - Statuts participants
3. Cliquez sur **Ajouter** pour créer une nouvelle valeur

---

## Journal d'audit

Toutes les actions sensibles sont tracées :

1. Accédez à l'API audit : `GET /api/audit-logs` (admin uniquement)
2. Chaque entrée contient :
   - Utilisateur
   - Action (create, update, delete, login, etc.)
   - Type d'entité
   - Valeurs avant/après
   - Adresse IP
   - Timestamp

---

## Import de participants

1. Allez dans **Import/Export**
2. Téléchargez le modèle Excel
3. Remplissez les données
4. Importez le fichier
5. Vérifiez les erreurs de validation

### Règles d'import

- Numéro d'ordre : automatique (ne pas remplir)
- Date de naissance : format `YYYY-MM-DD` ou `DD/MM/YYYY`
- Sexe : `M` ou `F`
- Email : optionnel, mais unique si renseigné

---

## Sauvegarde et restauration

### Sauvegarde manuelle

```bash
./scripts/backup.sh ./backups
```

### Restauration

```bash
./scripts/restore.sh ./backups/cdej_espoir_backup_20240115_020000.sql.gz
```

### Sauvegarde automatique (cron)

```bash
crontab -e
# Ajouter :
0 2 * * * /path/to/cdej-espoir/scripts/backup.sh /path/to/backups >> /var/log/cdej-backup.log 2>&1
```

---

## Départ des participants (TG0154)

Les participants sont marqués automatiquement "Départ imminent" quand leur date de départ approche.

1. Allez sur le **Tableau de bord** pour voir les départs imminents
2. Pour officialiser un départ :
   - Ouvrez le profil du participant
   - Renseignez **Date de sortie** et **Motif de sortie**
   - Le statut passe automatiquement à "sorti"

---

## Configuration SMS

Pour activer les SMS réels aux tuteurs :

1. Configurez les variables d'environnement dans `.env` :
   ```env
   AFRICAS_TALKING_API_KEY=votre_cle
   AFRICAS_TALKING_USERNAME=votre_username
   AFRICAS_TALKING_SHORTCODE=votre_shortcode
   ```
2. Si non configuré, le mode simulation est activé (SMS enregistrés mais non envoyés)

---

## Gestion des alertes d'absences

Des alertes sont créées automatiquement quand un participant dépasse le seuil d'absences.

1. Allez dans **Notifications** → onglet **Alertes absences**
2. Cliquez sur **Résoudre** pour marquer une alerte comme traitée
3. Ajoutez un commentaire de suivi

---

## Maintenance base de données

```bash
# Vérifier la taille de la base
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('cdej_espoir'));"

# Analyser les tables
psql "$DATABASE_URL" -c "ANALYZE VERBOSE;"

# Vacuum
psql "$DATABASE_URL" -c "VACUUM ANALYZE;"
```

---

## Mise à jour de l'application

```bash
# 1. Sauvegarder d'abord
./scripts/backup.sh ./backups

# 2. Mettre à jour le code
git pull

# 3. Installer les nouvelles dépendances
pnpm install

# 4. Migrer la base si nécessaire
pnpm --filter @workspace/db run push

# 5. Recompiler
pnpm run build

# 6. Redémarrer les services
sudo systemctl restart cdej-api
```

---

## Supervision

### Santé de l'API

```
GET /api/healthz
```

Réponse : `{ "status": "ok", "version": "x.y.z", "db": "connected" }`

### Métriques recommandées à surveiller

- Temps de réponse de l'API (< 500ms)
- Utilisation mémoire du processus Node (< 512Mo)
- Espace disque (base de données + sauvegardes)
- Tentatives de connexion échouées (brute force)
