#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

# Load DATABASE_URL from .env if present
if [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/.env"
  set +a
fi

DATABASE_URL="${DATABASE_URL:-sqlite:////data/app.db}"

if [[ "$DATABASE_URL" == postgresql* ]]; then
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "pg_dump not found — install postgresql-client or set DATABASE_URL to SQLite" >&2
    exit 1
  fi
  OUT="$BACKUP_DIR/neondb_${TIMESTAMP}.sql"
  PG_URL="${DATABASE_URL/postgresql+psycopg/postgresql}"
  pg_dump "$PG_URL" > "$OUT"
  echo "Backed up Postgres to $OUT"
  ls -1t "$BACKUP_DIR"/neondb_*.sql 2>/dev/null | tail -n +15 | xargs -r rm --
  exit 0
fi

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

ls -1t "$BACKUP_DIR"/app_*.db 2>/dev/null | tail -n +15 | xargs -r rm --
