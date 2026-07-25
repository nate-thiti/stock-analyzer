#!/usr/bin/env bash
# ตั้งค่า .env สำหรับ production — รันครั้งเดียวบน server
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  echo "พบ .env อยู่แล้ว — จะอัปเดตเฉพาะค่าที่ยังเป็น default"
else
  cp "$ROOT/.env.example" "$ENV_FILE"
  echo "สร้าง .env จาก .env.example"
fi

set_var() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

# JWT — สร้างใหม่ถ้ายังเป็น default
current_jwt="$(grep '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)"
if [ -z "$current_jwt" ] || [ "$current_jwt" = "change-me-in-production" ] || [ "$current_jwt" = "dev-secret" ]; then
  if command -v openssl >/dev/null 2>&1; then
    new_jwt="$(openssl rand -hex 32)"
  else
    new_jwt="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  set_var "JWT_SECRET" "$new_jwt"
  echo "✓ สร้าง JWT_SECRET ใหม่ (${#new_jwt} ตัวอักษร)"
else
  echo "• JWT_SECRET ตั้งค่าแล้ว — ข้าม"
fi

# APP_ENV
set_var "APP_ENV" "production"
echo "✓ APP_ENV=production"

# CORS
echo ""
echo "CORS_ORIGINS — โดเมนที่เปิด frontend (ไม่ใส่ path, ไม่ใช้ *)"
echo "  ตัวอย่าง: https://stocks.example.com"
read -r -p "CORS_ORIGINS: " cors_input
if [ -n "$cors_input" ]; then
  set_var "CORS_ORIGINS" "$cors_input"
  echo "✓ CORS_ORIGINS=$cors_input"
else
  echo "⚠  ยังไม่ได้ตั้ง CORS — แก้ใน .env ก่อน deploy"
fi

# Admin password
echo ""
read -r -s -p "รหัส Super Admin ใหม่ (อย่างน้อย 8 ตัว, Enter=ข้าม): " admin_pwd
echo ""
if [ -n "$admin_pwd" ]; then
  if [ "${#admin_pwd}" -lt 8 ]; then
    echo "⚠  รหัสสั้นเกินไป — ใช้ค่าเดิมใน .env"
  else
    set_var "SUPERADMIN_PASSWORD" "$admin_pwd"
    echo "✓ อัปเดต SUPERADMIN_PASSWORD"
    echo "  (มีผลเฉพาะ superadmin ที่ seed ครั้งแรก — ถ้ามี account แล้วให้เปลี่ยนผ่าน /admin)"
  fi
fi

echo ""
echo "=== ขั้นตอนถัดไป ==="
echo "1. ตรวจ .env:  cat $ENV_FILE"
echo "2. Deploy:     docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
echo "3. HTTPS:      ดู deploy/Caddyfile.example"
echo "4. Backup cron: 0 3 * * * $ROOT/scripts/backup-db.sh"
