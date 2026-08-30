#!/bin/bash
# Mi-Hawk database backup.
#
# Runs on the Singapore main server via cron. Dumps the MariaDB `mi_hawk`
# database with mysqldump (safe to run while the app is writing, via
# --single-transaction), keeps a short local history, and ships a copy to
# the India VPS so a disk failure / corruption on Singapore doesn't lose the
# data.

set -euo pipefail

DB_NAME="mi_hawk"
CREDENTIALS_FILE="/opt/mi-hawk/.db-backup.cnf"
LOCAL_BACKUP_DIR="/opt/backups/mi-hawk"
REMOTE_DIR="/opt/backups/mi-hawk"
REMOTE_KEY="/root/.ssh/mi-hawk-backup"
KEEP_DAYS=7

# Remote backup target host kept in /opt/mi-hawk/.db-backup.env (not
# committed to the repo) so this script stays safe to keep in a public repo.
source /opt/mi-hawk/.db-backup.env
: "${REMOTE_HOST:?Set REMOTE_HOST in /opt/mi-hawk/.db-backup.env}"

mkdir -p "$LOCAL_BACKUP_DIR"

stamp=$(date -u +"%Y%m%d-%H%M%S")
backup_file="$LOCAL_BACKUP_DIR/mi_hawk-$stamp.sql.gz"

mysqldump --defaults-extra-file="$CREDENTIALS_FILE" --single-transaction --routines "$DB_NAME" | gzip > "$backup_file"

scp -i "$REMOTE_KEY" -o ConnectTimeout=10 "$backup_file" "$REMOTE_HOST:$REMOTE_DIR/" >/dev/null

# Prune backups older than KEEP_DAYS, locally and on the remote.
find "$LOCAL_BACKUP_DIR" -name 'mi_hawk-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" \
  "find '$REMOTE_DIR' -name 'mi_hawk-*.sql.gz' -mtime +$KEEP_DAYS -delete"
