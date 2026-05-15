# CDEJ Espoir TG0154 — Mode hors-ligne

## Présentation

Le mode hors-ligne permet de saisir les présences sur le terrain même sans connexion internet. Les données sont sauvegardées localement dans le navigateur (IndexedDB via Dexie.js) et synchronisées automatiquement dès que la connexion est rétablie.

---

## Fonctionnement

### Détection de la connexion

L'application surveille en permanence l'état de la connexion réseau. Lorsque la connexion est perdue :

1. Une bannière orange s'affiche en haut de la page : **"Vous êtes hors ligne — les présences sont sauvegardées localement"**
2. L'icône de statut dans le menu change
3. Vous pouvez continuer à travailler normalement

### Saisie hors-ligne

1. Allez dans **Présences**
2. Sélectionnez l'enseignant et la date
3. Saisissez les présences comme d'habitude
4. Cliquez sur **Enregistrer** — un badge **"Sauvegardé hors ligne"** apparaît
5. Les données sont stockées sécurisément sur votre appareil

### Synchronisation

**Automatique :** Dès que la connexion revient, l'application synchronise toutes les données en attente en arrière-plan.

**Manuelle :** Si vous souhaitez forcer la synchronisation :
1. Dans la page **Présences**, un badge indique le nombre d'enregistrements en attente
2. Cliquez sur **Synchroniser maintenant**
3. Un message de confirmation s'affiche une fois la sync terminée

---

## Données stockées localement

Seules les **présences** sont stockées hors-ligne. Les autres données (participants, fiches, etc.) nécessitent une connexion.

| Donnée | Stockage local | Synchronisable |
|--------|---------------|----------------|
| Présences | Oui | Oui |
| Participants | Non | Non |
| Enseignants | Non | Non |
| IMC | Non | Non |
| Fiches | Non | Non |

---

## Limitations du mode hors-ligne

- Vous ne pouvez pas créer de nouvelles sessions hors-ligne (vous devez créer la session quand vous êtes en ligne, puis revenir en mode hors-ligne pour saisir)
- Vous ne pouvez pas consulter les listes de participants/enseignants si elles n'ont pas été chargées au préalable
- Si vous saisissez des présences sur plusieurs appareils hors-ligne pour la même session, le dernier appareil à se synchroniser écrasera les précédents

---

## Installation comme application mobile (PWA)

Pour une meilleure expérience hors-ligne, installez l'application sur votre téléphone :

### Android (Chrome)
1. Ouvrez l'application dans Chrome
2. Appuyez sur le menu (3 points en haut à droite)
3. Sélectionnez **"Ajouter à l'écran d'accueil"**
4. Confirmez l'installation

### iOS (Safari)
1. Ouvrez l'application dans Safari
2. Appuyez sur le bouton Partager (icône avec flèche vers le haut)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Confirmez

---

## Architecture technique

```
Navigateur (PWA)
├── IndexedDB (Dexie.js)
│   └── Table: presences (session_id, eleve_id, statut, synced, saved_at)
├── Service Worker (cache des assets)
└── Sync Queue (syncPendingPresences)
    └── POST /api/presences/batch (quand online)

Serveur (API)
└── POST /api/presences/batch (accepte la synchronisation)
```

### Base de données locale

La base de données locale s'appelle `cdej_offline_v1` et est stockée dans le navigateur. Elle est accessible via les **Outils de développement → Application → IndexedDB**.

### Réinitialiser les données hors-ligne

Si vous rencontrez des problèmes de synchronisation :
1. Synchronisez d'abord toutes les données en attente
2. Ouvrez les **Outils de développement** (F12)
3. Allez dans **Application → IndexedDB → cdej_offline_v1**
4. Cliquez sur **Delete database**
5. Rechargez la page

---

## FAQ

**Q : Mes données hors-ligne sont-elles perdues si je vide le cache du navigateur ?**
R : Oui. Synchronisez avant de vider le cache.

**Q : Combien de temps mes données hors-ligne sont-elles conservées ?**
R : Jusqu'à synchronisation et jusqu'à ce que vous vidiez le stockage local du navigateur.

**Q : Puis-je utiliser l'application sur plusieurs appareils simultanément hors-ligne ?**
R : Oui, mais les conflits de synchronisation se résolvent par "le dernier gagne". Coordonnez-vous avec votre équipe.

**Q : L'application fonctionne-t-elle sans internet du tout ?**
R : Elle charge et fonctionne partiellement si les assets sont en cache (PWA). Mais pour la connexion initiale, internet est nécessaire.
