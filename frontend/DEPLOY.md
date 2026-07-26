# Deploy Frontend (Netlify)

## Monorepo — ไม่ต้องแยก git

ใช้ repo เดิม ตั้ง **Base directory = `frontend`** ใน Netlify

## ขั้นตอน

1. [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. เลือก repo `stock-analyzer`
3. Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build` (จาก `netlify.toml`)
   - **Publish directory:** `dist`
4. Environment variables:

| Key | Value |
|-----|-------|
| `BACKEND_URL` | `https://stock-analyzer-api.onrender.com` (URL backend ไม่มี `/api`) |
| `VITE_BMC_URL` | (optional) `https://ko-fi.com/yourname` |

5. Deploy

## ทำไมใช้ BACKEND_URL proxy?

Frontend เรียก `/api/*` (same origin) → Netlify proxy ไป backend

- Login cookie (HttpOnly) ทำงานได้ — ไม่ต้องแก้ cross-site cookie
- ไม่ต้องตั้ง `VITE_API_URL`

## Custom domain

Netlify → Domain settings → เพิ่มโดเมน  
Backend → อัปเดต `CORS_ORIGINS=https://yourdomain.com`

## ทดสอบ local แบบ Netlify

```bash
npm install -g netlify-cli
cd frontend
BACKEND_URL=https://your-api.onrender.com npm run build
netlify dev
```
