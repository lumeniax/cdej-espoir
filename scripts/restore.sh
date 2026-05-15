#!/usr/bin/env bash
# ============================================================
# CDEJ Espoir TG0154 — Restauration PostgreSQL
# Usage: ./scripts/restore.sh <fichier-backup.sql.gz>
# ============================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <fichier-backup.sql.gz>" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Erreur: fichier introuvable — $BACKUP_FILE" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

DB_URL="${DATABASE_URL:-}"
if [[ -z "$DB_URL" ]]; then
  echo "Erreur: DATABASE_URL n'est pas défini." >&2
  exit 1
fi

echo "ATTENTION: Ceci va écraser la base de données courante."
read -r -p "Confirmer la restauration depuis $BACKUP_FILE ? [oui/NON] " confirm
if [[ "$confirm" != "oui" ]]; then
  echo "Restauration annulée."
  exit 0
fi

echo "Restauration en cours depuis ${BACKUP_FILE}..."
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
echo "Restauration terminée."
