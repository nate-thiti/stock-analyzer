# Stock Analyzer

ระบบเว็บวิเคราะห์หุ้นไทย สหรัฐฯ ฮ่องกง และจีน โดยใช้ข้อมูลจาก **Yahoo Finance** (ผ่าน `yfinance`) — ข้อมูลอาจดีเลย์ประมาณ 5–15 นาที และเวลาซื้อขายล่าสุดอาจเป็นข้อมูลย้อนหลังเมื่อตลาดปิด

---

## ฟีเจอร์หลัก

### หน้าแรก (`/`)
- ค้นหาหุ้นและดูการ์ดราคายอดนิยม
- **ดูล่าสุด** — หุ้นที่เปิดล่าสุด (localStorage, สูงสุด 10) ลบรายการได้ด้วยปุ่ม ×
- **Market Signals** — สแกน watchlist แยกกลุ่ม ซื้อ / ถือ / ขาย
  - **Watchlist ทั่วไป** (admin ตั้งได้) หรือ **รายการโปรด** ของ user
  - ถ้าไม่มีรายการโปรด → fallback เป็น watchlist ทั่วไป
  - Auto-refresh ทุก **15 นาที**
- **เปรียบเทียบด่วน** — preset 23 หมวด
- ราคาอัปเดตอัตโนมัติทุก **3 นาที**

### หน้าหุ้น (`/stock/:symbol`)
- ราคา, ข้อมูลบริษัท, กราฟแท่งเทียน (Lightweight Charts)
- **กราฟเทคนิคอัตโนมัติ** — EMA 9/21/50, RSI, MACD, Support/Resistance, ป้ายเทรนด์ (hover `?` อธิบายคำศัพท์)
- กราฟปรับขนาดบนมือถือ (แผน RSI/MACD เล็กลง)
- **Valuation** — P/E, PEG, P/S, P/B, ROE, radar chart, งบรายไตรมาส, ประวัติ P/E
- **เงินปันผล** — ประวัติงวด, ประมาณการ/ปี, Div Yield
- **Trading Plan** — คำแนะนำซื้อ/ถือ/ขาย, stop loss, target, position sizing, DCA
- สลับโหมด **"ถืออยู่แล้ว" / "ยังไม่ได้ซื้อ"** สำหรับคำแนะนำที่ต่างกัน
- ราคาอัปเดตอัตโนมัติทุก **30 วินาที**, กราฟทุก **5 นาที**, วิเคราะห์ทุก **5 นาที**
- แสดง **เวลาซื้อขายล่าสุด** (จาก Yahoo) และ **เวลาที่ดึงข้อมูล** (`fetched_at`) แยกกัน
- ปุ่ม ⭐ เพิ่มรายการโปรด, **Price Alert** ตั้งแจ้งเตือนเมื่อราคาถึงเป้า
- Banner แสดงถ้าถือหุ้นในพอร์ต

### พอร์ต (`/portfolio`)
- บันทึกหุ้นที่ถือ: **สัญลักษณ์ + จำนวน + ราคาซื้อเฉลี่ย**
- แสดงมูลค่าปัจจุบัน, กำไร/ขาดทุน unrealized (%)
- **Dashboard** — pie chart สัดส่วนตามหุ้น, bar chart ตาม sector, การ์ดกำไร/ขาดทุนสูงสุด
- **Price Alert** ต่อหุ้น + แบนเนอร์แจ้งเตือนที่ trigger แล้ว
- แก้ไข / ลบรายการ — ราคาอัปเดต auto **30s**

### เปรียบเทียบ (`/compare`)
- เลือก 2–5 หุ้น เปรียบ side-by-side
- Preset 23 หมวด — กด preset เปลี่ยน **เพิ่มด่วน** (ไม่ auto compare)
- ปุ่ม **+ เลือกหุ้นจาก preset** และ **แชร์ลิงก์** (copy URL)
- สรุป Best Pick, กราฟ valuation เปรียบเทียบ, ตารางละเอียดแบบ collapsible

### รายการโปรด (`/favorites`)
- หุ้นที่บันทึกไว้ พร้อมราคาอัปเดตอัตโนมัติทุก 30 วินาที
- **Price Alert** ต่อหุ้น + badge เมื่อถึงราคาเป้า

### ระบบผู้ใช้
- **สมัครสมาชิก** (`/register`) — username + email + password (ไม่ใช้ OAuth)
- **Login** (`/login`) ด้วย JWT (HttpOnly cookie)
- สมัคร/ล็อกอินแล้วเข้าใช้งานทันที (auto session)
- **Super Admin** — จัดการผู้ใช้ + **Watchlist ทั่วไป** ที่ `/admin`
- **Neon Postgres** (แนะนำ) หรือ SQLite — เก็บ users, favorites, positions, watchlist, price_alerts
- API ส่วนใหญ่ต้อง login (ยกเว้น `/api/auth/login`, `/api/auth/register`, `/api/config/public`)

### Price Alerts
- ตั้งเงื่อนไข **ราคา ≥ เป้า** หรือ **ราคา ≤ เป้า**
- ตรวจอัตโนมัติทุก **30 วินาที** — แสดง badge เมื่อ trigger
- ตั้งได้จากหน้าหุ้น, พอร์ต, รายการโปรด (modal กลางจอ)

### UI / UX
- Dark/Light theme
- พื้นหลัง 3D (Three.js) แบบ full-screen
- Logo + favicon แบบ candlestick (SVG)
- Custom **SelectField** dropdown และ **SegmentedControl** ทั้งระบบ
- Responsive + เมนู hamburger บนมือถือ
- ปุ่ม **Ko-fi / สนับสนุน** ใน header, เมนูมือถือ, หน้า login/register

---

## สถาปัตยกรรม

| ชั้น | เทคโนโลยี |
|------|-----------|
| Backend | Python 3.10, FastAPI, Uvicorn, yfinance, pandas, SQLAlchemy, **PostgreSQL (Neon)** / SQLite |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Charts | Lightweight Charts (TradingView), Three.js |
| Deploy | Docker Compose — nginx (frontend `:3010`) → FastAPI (`:8010`) |

```
Browser → nginx :3010 → /api/* → FastAPI :8010 → yfinance / Neon Postgres
                                              └→ SQLite (dev fallback)
```

---

## โครงสร้างโฟลเดอร์

```text
stock-analyzer/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── deploy/
│   ├── Caddyfile.example
│   └── cron-backup.example
├── scripts/
│   ├── setup-production.sh
│   ├── backup-db.sh
│   └── test-all.sh
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── tests/
│   └── app/
│       ├── main.py
│       ├── services.py
│       ├── analysis.py
│       ├── risk.py
│       ├── fundamentals.py
│       ├── valuation_charts.py
│       ├── market_signals.py
│       ├── auth.py
│       ├── database.py
│       ├── models.py
│       ├── init_db.py
│       └── routers/
│           ├── auth.py
│           ├── users.py
│           ├── favorites.py
│           ├── positions.py
│           ├── watchlist.py
│           └── price_alerts.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── App.jsx
        ├── api.js
        ├── config.js
        ├── hooks/
        │   ├── useQuotePoll.js
        │   ├── usePriceAlerts.js
        │   └── useIsMobile.js
        ├── utils/
        │   ├── recentStocks.js
        │   ├── chartIndicators.js
        │   └── glossary.js
        ├── context/
        ├── pages/
        │   ├── LoginPage.jsx
        │   └── RegisterPage.jsx
        └── components/
            ├── Layout.jsx
            ├── BrandLogo.jsx
            ├── StockChart.jsx
            ├── TradingPlanPanel.jsx
            ├── MarketSignalSections.jsx
            ├── PortfolioDashboard.jsx
            ├── PriceAlertButton.jsx
            ├── RecentStocksSection.jsx
            ├── DividendPanel.jsx
            ├── SelectField.jsx
            ├── SegmentedControl.jsx
            ├── SupportButton.jsx
            ├── Modal.jsx
            └── valuation/
```

---

## เริ่มต้นใช้งาน (Docker — แนะนำ)

```bash
# 1. คัดลอก env
cp .env.example .env

# 2. ตั้ง DATABASE_URL — Neon Postgres (แนะนำ)
#    ไปที่ neon.tech → สร้าง project → copy connection string
# DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/neondb?sslmode=require
#    หรือ SQLite สำหรับ dev แบบ offline:
# DATABASE_URL=sqlite:////data/app.db

# 3. แก้ JWT_SECRET และรหัส admin ก่อน deploy จริง

# 4. Build และรัน
docker compose up -d --build

# 5. เปิดเบราว์เซอร์
# Frontend: http://localhost:3010
# Backend:  http://localhost:8010
```

**บัญชีเริ่มต้น**

| วิธี | รายละเอียด |
|------|------------|
| สมัครเอง | เปิด `/register` — สร้างบัญชี user ได้ทันที |
| Super Admin | seed ครั้งแรกจาก `.env` (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`) |

**Login superadmin (ค่า default ใน `.env.example`):**

| ฟิลด์ | ค่า default |
|-------|-------------|
| Email | `admin@example.com` |
| Password | `admin1234` |

> เปลี่ยน `JWT_SECRET` และ `SUPERADMIN_PASSWORD` ใน `.env` ก่อนใช้งาน production

---

## พัฒนาในเครื่อง (Local Dev)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=sqlite:///./app.db
export JWT_SECRET=dev-secret
export SUPERADMIN_EMAIL=admin@example.com
export SUPERADMIN_PASSWORD=admin1234

uvicorn app.main:app --reload --host 0.0.0.0 --port 8010
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# เปิด http://localhost:5173 (proxy /api → localhost:8010)
```

---

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | Default | คำอธิบาย |
|--------|---------|----------|
| `JWT_SECRET` | `change-me-in-production` | คีย์ลงนาม JWT (อย่างน้อย 32 ตัวอักษรใน production) |
| `APP_ENV` | `development` | `development` หรือ `production` (production = ตรวจ security ตอน startup) |
| `CORS_ORIGINS` | `*` | โดเมนที่อนุญาต (คั่นด้วยจุลภาค) |
| `SUPERADMIN_USERNAME` | `admin` | ชื่อ superadmin ตอน seed |
| `SUPERADMIN_EMAIL` | `admin@example.com` | อีเมล superadmin |
| `SUPERADMIN_PASSWORD` | `admin1234` | รหัสผ่าน superadmin |
| `DATABASE_URL` | `sqlite:////data/app.db` | **Neon Postgres** (`postgresql+psycopg://...?sslmode=require`) หรือ SQLite |

### ตั้ง Neon Postgres

1. สมัคร [neon.tech](https://neon.tech) → สร้าง project
2. Copy **connection string** (Direct หรือ Pooler — ใช้ pooler ได้)
3. แปลงเป็น SQLAlchemy format ใน `.env`:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/neondb?sslmode=require
```

4. Restart backend — `init_db()` สร้างตาราง + seed superadmin/watchlist อัตโนมัติ

> อย่า commit `.env` — เก็บ credentials ใน env เท่านั้น
| `BMC_URL` | — | ลิงก์สนับสนุน (Ko-fi / Buy Me a Coffee) — แสดงปุ่มใน UI |
| `VITE_BMC_URL` | — | (optional) ลิงก์สนับสนุนตอน build frontend — ถ้าไม่ตั้งจะอ่านจาก API |

### ตั้งลิงก์ Ko-fi / Buy Me a Coffee

```env
# .env
BMC_URL=https://ko-fi.com/yourname
```

```bash
docker compose up -d   # restart backend — ไม่ต้อง rebuild frontend
```

---

## API Endpoints

### Public (ไม่ต้อง login)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/config/public` | ค่า public เช่น `bmc_url` สำหรับปุ่มสนับสนุน |

### Auth

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/auth/register` | สมัครสมาชิก → set HttpOnly cookie |
| POST | `/api/auth/login` | เข้าสู่ระบบ → set HttpOnly cookie |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/auth/me` | ข้อมูล user ปัจจุบัน |

### Users (superadmin only)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/users` | รายชื่อผู้ใช้ |
| POST | `/api/users` | สร้างผู้ใช้ |
| PUT | `/api/users/{id}` | แก้ไขผู้ใช้ |
| DELETE | `/api/users/{id}` | ลบผู้ใช้ |

### Favorites (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/favorites` | รายการโปรด |
| POST | `/api/favorites` | เพิ่มโปรด `{ "symbol": "AAPL" }` |
| DELETE | `/api/favorites/{symbol}` | ลบโปรด |

### Portfolio (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/positions` | รายการถือหุ้น + P/L + sector |
| POST | `/api/positions` | เพิ่ม `{ "symbol", "shares", "avg_cost" }` |
| PUT | `/api/positions/{id}` | แก้ไขจำนวน/ราคาทุน |
| DELETE | `/api/positions/{id}` | ลบ |

### Price Alerts (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/price-alerts` | รายการ alert + สถานะ triggered |
| POST | `/api/price-alerts` | สร้าง `{ "symbol", "target_price", "direction": "above\|below" }` |
| DELETE | `/api/price-alerts/{id}` | ลบ alert |

### Watchlist (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/watchlist` | ดู watchlist ทั่วไป |
| PUT | `/api/watchlist` | ตั้ง watchlist (superadmin) `{ "symbols": [...] }` |

### Stock & Analysis (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/stock/quote?symbol=` | ราคาปัจจุบัน + `market_time` + `fetched_at` |
| GET | `/api/stock/info?symbol=` | ข้อมูลบริษัท + dividends |
| GET | `/api/stock/history?symbol=&period=&interval=` | OHLCV |
| GET | `/api/stock/search?q=` | ค้นหาสัญลักษณ์ |
| GET | `/api/stock/fundamentals/quarterly?symbol=` | งบรายไตรมาส |
| GET | `/api/stock/fundamentals/pe-history?symbol=` | ประวัติ P/E |
| GET | `/api/analysis/full?symbol=` | วิเคราะห์ครบ (fundamental + technical + plan) |
| GET | `/api/analysis/compare?symbols=AAPL,MSFT` | เปรียบเทียบ 2–5 หุ้น |
| GET | `/api/analysis/market-signals?scope=global\|personal` | สัญญาณตลาด |
| POST | `/api/analysis/batch` | วิเคราะห์หลาย symbol |
| POST | `/api/csv/import` | วิเคราะห์จาก CSV |
| POST | `/api/csv/export` | export ประวัติราคาเป็น CSV |

---

## การอัปเดตข้อมูล & Cache

### Frontend (auto-poll)

| หน้า | สิ่งที่ refresh | ช่วงเวลา |
|------|-----------------|----------|
| StockPage | ราคา | 30 วินาที |
| StockPage | กราฟราคา | 5 นาที |
| StockPage | วิเคราะห์ | 5 นาที |
| FavoritesPage | ราคา | 30 วินาที |
| PortfolioPage | ราคา + P/L | 30 วินาที |
| Price Alerts | ตรวจ trigger | 30 วินาที |
| HomePage Market Signals | สัญญาณ | 15 นาที |
| HomePage | การ์ดราคา / ดูล่าสุด | 3 นาที |

- กลับมาแท็บเบราว์เซอร์ → ดึงข้อมูลทันที
- `market_time` = เวลาซื้อขายล่าสุดจาก Yahoo (อาจไม่เปลี่ยนเมื่อตลาดปิด)
- `fetched_at` = เวลาที่ backend ดึงจาก Yahoo ล่าสุด

### Backend cache

| ประเภท | TTL |
|--------|-----|
| Quote | 30 วินาที |
| History | 5 นาที |
| Raw financials | 30 นาที |
| Market signals | 15 นาที |

### ดูล่าสุด (localStorage)

- เก็บใน browser ของ user — ไม่ sync ข้ามเครื่อง
- สูงสุด 10 หุ้น, ลบได้จากหน้าแรก

---

## Watchlist & Market Signals

| แหล่ง | ใครตั้ง | ใช้เมื่อ |
|-------|---------|---------|
| Global | Super Admin ที่ `/admin` | Market Signals → "Watchlist ทั่วไป" |
| Personal | ⭐ รายการโปรดของ user | Market Signals → "รายการโปรด" |
| Fallback | Global | ถ้า user ไม่มีโปรด |

Watchlist เริ่มต้น: `AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, AMD, INTC, PTT.BK, CPALL.BK, AOT.BK, KBANK.BK, 0700.HK, BABA`

---

## ตรรกะการวิเคราะห์

### คำแนะนำ (rule-based จาก `risk.py`)

```
total_score = fundamental × 0.45 + technical × 0.55

≥ 0.6  → ซื้อ (buy)
≤ -0.4 → ขาย (sell)
อื่นๆ  → ถือ/รอ (hold)
```

### Trading Plan
- Stop loss / target จาก ATR และ support-resistance
- Position sizing จาก `account_size` (default 100,000) และ `risk_pct` (default 2%)
- DCA 3 งวด เมื่อสัญญาณซื้อ
- โหมด **"ถืออยู่แล้ว" / "ยังไม่ได้ซื้อ"** แสดงคำแนะนำที่ต่างกัน
- ถ้าถือหุ้นในพอร์ต → ใช้ข้อมูล position จริงในแผน

---

## Preset เปรียบเทียบ (23 หมวด)

| กลุ่ม | Presets |
|-------|---------|
| เทคโนโลยี | Big Tech, Chips, Cloud & AI, China Tech |
| พลังงาน & โครงสร้างพื้นฐาน | พลังงาน, พลังงานไทย, สาธารณูปโภ, โทรคม |
| ผู้บริโภค | สินค้าฟุ่มเฟือย, สินค้าอุปโภค, ค้าปลีก, ร้านอาหาร |
| การเงิน & สุขภาพ | ธนาคาร, ธนาคารไทย, สุขภาพ, ยา & Biotech |
| อุตสาหกรรม & อื่นๆ | รถยนต์ & EV, อุตสาหกรรม, วัสดุ & เหมือง, อสังหา REIT |
| ตลาดเอเชีย | SET ยอดนิยม, SET ค้าปลีก, Hong Kong |

---

## รูปแบบสัญลักษณ์หุ้น

| ตลาด | ตัวอย่าง |
|------|----------|
| สหรัฐฯ | `AAPL`, `MSFT`, `NVDA` |
| ไทย (SET) | `PTT.BK`, `CPALL.BK`, `KBANK.BK` |
| ฮ่องกง | `0700.HK`, `9988.HK` |
| จีน (ADR) | `BABA`, `JD` |

---

## Deploy แยก Frontend + Backend

### ควรแยก git ไหม?

**ไม่จำเป็น** — monorepo ใช้ได้ดี:

| | Monorepo (แนะนำ) | แยก 2 repo |
|---|------------------|------------|
| Deploy | Netlify base=`frontend`, Render root=`backend` | แต่ละ repo deploy เอง |
| แชร์ code/docs | ง่าย | ยาก |
| CI/CD | 1 repo, 2 pipeline | 2 pipeline แยก |
| เหมาะเมื่อ | โปรเจกต์เดียว / ทีมเล็ก | ทีมแยก, release คนละรอบ, open-source เฉพาะ frontend |

โครงสร้างปัจจุบันแยกโฟลเดอร์อยู่แล้ว — **ไม่ต้องย้าย git**

```
stock-analyzer/          ← repo เดียว
├── frontend/            → Netlify (static)
├── backend/             → Render / Railway / VPS
└── docker-compose.yml   → dev ในเครื่อง (ทั้งคู่)
```

### Architecture (production)

```
User → Netlify (React static)
         └─ /api/* proxy → Backend (FastAPI :8010)
                              └─ Neon Postgres
```

- Frontend เรียก `/api` same-origin → Netlify proxy ไป backend (cookie login ใช้ได้)
- ตั้ง `BACKEND_URL` บน Netlify (ดู `frontend/DEPLOY.md`)
- Backend ตั้ง `CORS_ORIGINS=https://your-app.netlify.app` (ดู `backend/DEPLOY.md`)

### Quick start

**1. Backend (Render + Neon)**

```bash
# render.com → New Blueprint → เลือก repo
# ใส่ DATABASE_URL, CORS_ORIGINS, SUPERADMIN_*
# ได้ URL เช่น https://stock-analyzer-api.onrender.com
```

**2. Frontend (Netlify)**

```bash
# netlify.com → Import Git → Base directory: frontend
# Env: BACKEND_URL=https://stock-analyzer-api.onrender.com
```

รายละเอียด: [`frontend/DEPLOY.md`](frontend/DEPLOY.md) · [`backend/DEPLOY.md`](backend/DEPLOY.md)

---

## Production Deploy (Docker รวม — VPS)

### 1. ตั้งค่า environment

```bash
bash scripts/setup-production.sh
# สร้าง JWT สุ่ม, ตั้ง APP_ENV=production, CORS, รหัส admin
```

### 2. Deploy (production mode)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- Frontend: `127.0.0.1:3010` (localhost เท่านั้น — ให้ Caddy/nginx proxy)
- Backend: `127.0.0.1:8010` (ไม่ expose สาธารณะ)
- `APP_ENV=production` → **หยุด startup** ถ้า JWT/CORS/password ยังไม่ปลอดภัย

### 3. HTTPS ด้วย Caddy

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
# แก้ stocks.example.com → โดเมนจริง
sudo systemctl reload caddy
```

### 4. Backup อัตโนมัติ

```bash
bash scripts/backup-db.sh          # Postgres → pg_dump / SQLite → copy .db
# cron รายวัน — ดู deploy/cron-backup.example
```

> ใช้ Neon แล้ว — backup ผ่าน `pg_dump` (ต้องมี `postgresql-client` บน host) หรือใช้ Neon built-in backup

### Dev vs Production

| | Dev | Production |
|---|-----|------------|
| คำสั่ง | `docker compose up -d` | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |
| `APP_ENV` | `development` | `production` |
| CORS | `*` OK | ต้องระบุโดเมน |
| Ports | `:3010`, `:8010` เปิดทุก interface | bind `127.0.0.1` เท่านั้น |

### Production Checklist

- [ ] ตั้ง `DATABASE_URL` เป็น Neon Postgres (production)
- [ ] เปลี่ยน `JWT_SECRET` เป็นค่าสุ่มยาว (≥ 32 ตัวอักษร)
- [ ] เปลี่ยน `SUPERADMIN_PASSWORD` ทันทีหลัง first login
- [ ] ตั้ง `CORS_ORIGINS` เป็นโดเมนจริง (ไม่ใช้ `*`)
- [ ] ตั้ง reverse proxy + HTTPS (Caddy/nginx)
- [ ] Backup DB: `bash scripts/backup-db.sh` (cron รายวัน)
- [ ] ข้อมูล Yahoo Finance ไม่เหมาะสำหรับ trading แบบ real-time

---

## ทดสอบ (Tests)

```bash
bash scripts/test-all.sh
# หรือแยก:
cd frontend && npm test
docker compose exec backend sh -c 'pip install -q -r requirements-dev.txt && cd /app && PYTHONPATH=. pytest tests/ -q'
```

| ชุด | ไฟล์ | ครอบคลุม |
|-----|------|----------|
| Backend | `tests/test_auth.py` | register, duplicate email/username |
| Backend | `tests/test_analysis.py` | RSI, S/R, recommendation |
| Backend | `tests/test_positions.py` | CRUD + auth |
| Backend | `tests/test_watchlist.py` | admin/user permissions |
| Backend | `tests/test_market_signals.py` | scope global/personal |
| Frontend | `src/utils/chartIndicators.test.js` | EMA, RSI, MACD, trend |

---

## License

Private / internal use — ปรับตามนโยบายของโปรเจกต์
