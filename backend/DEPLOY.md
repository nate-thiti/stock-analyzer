# Deploy Backend

FastAPI + Neon Postgres — รันแยกจาก frontend (Netlify)

## Render (แนะนำ — ฟรี tier)

1. Push repo ไป GitHub
2. [render.com](https://render.com) → **New → Blueprint**
3. เลือก repo — Render อ่าน `backend/render.yaml`
4. ใส่ env:
   - `DATABASE_URL` — Neon connection string
   - `CORS_ORIGINS` — `https://your-app.netlify.app`
   - `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`
5. Deploy → copy URL เช่น `https://stock-analyzer-api.onrender.com`
6. ไป Netlify ตั้ง `BACKEND_URL` = URL นั้น (ไม่มี `/api` ท้าย)

## Docker / VPS

```bash
cd backend
docker build -t stock-analyzer-api .
docker run -d -p 8010:8010 --env-file .env stock-analyzer-api
```

## Env ที่ต้องมี (production)

| ตัวแปร | ตัวอย่าง |
|--------|----------|
| `DATABASE_URL` | `postgresql+psycopg://...?sslmode=require` |
| `JWT_SECRET` | สุ่ม ≥ 32 ตัว |
| `APP_ENV` | `production` |
| `CORS_ORIGINS` | `https://your-app.netlify.app` |
| `SUPERADMIN_*` | บัญชี admin เริ่มต้น |

> Free tier Render อาจ sleep — request แรกช้า ~30–60 วิ
