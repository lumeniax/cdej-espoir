#!/usr/bin/env bash
# ============================================================
# CDEJ Espoir TG0154 — Sauvegarde PostgreSQL
# Usage: ./scripts/backup.sh [répertoire-destination]
# ============================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="cdej_espoir_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"

# Charger .env si présent
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

mkdir -p "$BACKUP_DIR"

echo "Sauvegarde en cours → ${BACKUP_PATH}"
pg_dump "$DB_URL" --no-owner --no-acl | gzip > "$BACKUP_PATH"

SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "Sauvegarde terminée : ${BACKUP_PATH} (${SIZE})"

# Supprimer les sauvegardes de plus de 30 jours
find "$BACKUP_DIR" -name "cdej_espoir_backup_*.sql.gz" -mtime +30 -delete
echo "Anciennes sauvegardes (>30j) supprimées."
