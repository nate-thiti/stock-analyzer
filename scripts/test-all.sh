#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Frontend tests ==="
(cd "$ROOT/frontend" && npm test)

echo ""
echo "=== Backend tests ==="
if docker compose -f "$ROOT/docker-compose.yml" ps backend 2>/dev/null | grep -q "Up"; then
  docker compose -f "$ROOT/docker-compose.yml" exec -T backend \
    sh -c 'pip install -q pytest httpx && cd /app && PYTHONPATH=. pytest tests/ -q'
else
  echo "Docker backend not running — skip backend tests"
  echo "Run: docker compose up -d && bash scripts/test-all.sh"
  exit 1
fi

echo ""
echo "✓ All tests passed"
