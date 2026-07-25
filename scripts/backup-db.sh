#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

if docker compose -f "$ROOT/docker-compose.yml" ps backend 2>/dev/null | grep -q "Up"; then
  COMPOSE_FILES="-f $ROOT/docker-compose.yml"
  if [ -f "$ROOT/docker-compose.prod.yml" ] && docker compose $COMPOSE_FILES -f "$ROOT/docker-compose.prod.yml" ps backend 2>/dev/null | grep -q "Up"; then
    COMPOSE_FILES="$COMPOSE_FILES -f $ROOT/docker-compose.prod.yml"
  fi
  docker compose $COMPOSE_FILES exec -T backend \
    sh -c 'cat /data/app.db' > "$BACKUP_DIR/app_${TIMESTAMP}.db"
  echo "Backed up from Docker volume to $BACKUP_DIR/app_${TIMESTAMP}.db"
elif [ -f "$ROOT/backend/app.db" ]; then
  cp "$ROOT/backend/app.db" "$BACKUP_DIR/app_${TIMESTAMP}.db"
  echo "Backed up local SQLite to $BACKUP_DIR/app_${TIMESTAMP}.db"
else
  echo "No database found (Docker not running and no backend/app.db)" >&2
  exit 1
fi

# Keep last 14 backups
ls -1t "$BACKUP_DIR"/app_*.db 2>/dev/null | tail -n +15 | xargs -r rm --
