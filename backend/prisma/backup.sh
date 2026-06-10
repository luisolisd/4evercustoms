#!/bin/bash
# Backup strategy - run via cron daily at 2am
# crontab: 0 2 * * * /app/prisma/backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/4evrcustoms"
FILENAME="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump
pg_dump "$DATABASE_URL" | gzip > "$FILENAME"

echo "Backup creado: $FILENAME"

# Retener últimos 30 días
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backups antiguos eliminados. Backups actuales:"
ls -lh "$BACKUP_DIR" | tail -10
