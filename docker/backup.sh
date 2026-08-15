#!/bin/bash
# Backup script — run nightly via cron:
# 0 2 * * * /app/docker/backup.sh
#
# Backs up:
# 1. Postgres database (pg_dump)
# 2. Style store JSON (git commit)
# 3. Harness logs + memories (tar)

set -e

BACKUP_DIR="/app/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup to $BACKUP_DIR"

# 1. Postgres dump
if command -v pg_dump &> /dev/null; then
    echo "Backing up Postgres..."
    PGPASSWORD="${POSTGRES_PASSWORD:-harness_dev}" \
        pg_dump -h postgres -U harness -d harness > "$BACKUP_DIR/postgres.sql"
    echo "  Postgres backup: $(du -h $BACKUP_DIR/postgres.sql | cut -f1)"
fi

# 2. Style store (already in git, but also copy)
echo "Backing up style store..."
cp /app/libraries/04-visual/isaacverse-style.json "$BACKUP_DIR/isaacverse-style.json"

# 3. Harness logs + memories
echo "Backing up logs + memories..."
tar czf "$BACKUP_DIR/harness-data.tar.gz" \
    -C /app/harness logs/ memories/

# 4. Git commit style changes
cd /app
if git diff --quiet libraries/04-visual/isaacverse-style.json; then
    echo "No style changes to commit."
else
    git add libraries/04-visual/isaacverse-style.json
    git commit -m "backup: style store snapshot $(date +%Y-%m-%d)"
    echo "Committed style store changes."
fi

# Clean up backups older than 30 days
find /app/backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "[$(date)] Backup complete: $BACKUP_DIR"
