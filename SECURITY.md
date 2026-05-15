# CDEJ Espoir TG0154 — Politique de sécurité

## Mesures de sécurité en place

### Authentification et autorisation
- **Argon2id** pour le hachage des mots de passe (recommandé par OWASP)
- **JWT HS256** pour les tokens d'accès (durée de vie : 15 minutes)
- **Cookie httpOnly** pour les refresh tokens (durée de vie : 7 jours, sameSite: strict)
- **RBAC** (Role-Based Access Control) avec 6 rôles : admin, coordinateur, enseignant, sante, comptable, viewer
- Middleware de vérification de rôle sur toutes les routes sensibles

### Protection des données
- Validation stricte des entrées avec **Zod v4** (côté API)
- Injection SQL impossible grâce à **Drizzle ORM** (requêtes paramétrées)
- Pas de données sensibles dans les logs
- Notes confidentielles des participants protégées (accès admin uniquement)

### Transport
- HTTPS obligatoire en production (TLS 1.2+)
- Headers de sécurité HTTP (configurer via nginx)
- Cookies `secure: true` en production

### Audit
- **Journal d'audit complet** : toutes les créations, modifications, suppressions sont tracées
- Chaque entrée contient : user_id, action, entity_type, entity_id, ip, timestamp, valeurs avant/après

---

## Configuration nginx sécurisée (production)

```nginx
# Headers de sécurité recommandés
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com;" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Gestion des mots de passe

### Politique minimale
- 8 caractères minimum
- Contient majuscule, minuscule, chiffre (recommandé)
- Pas de mot de passe de la liste des 10 000 les plus courants (à implémenter)

### Pour les administrateurs
- Changer les mots de passe par défaut lors du premier déploiement
- Utiliser des mots de passe d'au moins 16 caractères
- Ne jamais réutiliser les mots de passe de démo en production

### Changement de mot de passe
Accessible depuis : **Mon profil** → **Sécurité**

---

## Gestion des secrets

1. **Ne jamais commiter** les fichiers `.env` dans git (`.gitignore` inclus)
2. Utiliser des secrets d'au moins 48 caractères aléatoires :
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Faire tourner les secrets régulièrement (recommandé : tous les 90 jours)
4. Sur Replit : utiliser les **Secrets** (onglet dédié) jamais les variables `.env`

---

## Protection des données personnelles des enfants

Cette application gère des données de mineurs. Règles à respecter :

1. **Consentement** : Les champs `consentement_photo` et `consentement_donnees` doivent être renseignés avant toute utilisation des données
2. **Accès limité** : Les notes confidentielles ne sont visibles que par les rôles admin/coordinateur
3. **Données médicales** : Accès restreint au rôle `sante`
4. **Suppression** : Le SGBD maintient un enregistrement d'audit même après suppression
5. **Export** : L'export de données est limité aux rôles admin/coordinateur

---

## Sauvegardes sécurisées

```bash
# Sauvegardes chiffrées (recommandé)
./scripts/backup.sh | gpg --symmetric --cipher-algo AES256 > backup_chiffre.sql.gz.gpg
```

- Stocker les sauvegardes dans un emplacement séparé du serveur principal
- Tester la restauration régulièrement
- Conserver au minimum 30 jours de sauvegardes

---

## Signalement de vulnérabilités

Contacter l'administrateur technique du projet CDEJ TG0154 pour tout signalement de sécurité.
