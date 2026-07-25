# Stock Analyzer

ระบบเว็บวิเคราะห์หุ้นไทย สหรัฐฯ ฮ่องกง และจีน โดยใช้ข้อมูลจาก **Yahoo Finance** (ผ่าน `yfinance`) — ข้อมูลอาจดีเลย์ประมาณ 5–15 นาที และเวลาซื้อขายล่าสุดอาจเป็นข้อมูลย้อนหลังเมื่อตลาดปิด

---

## ฟีเจอร์หลัก

### หน้าแรก (`/`)
- ค้นหาหุ้นและดูการ์ดราคายอดนิยม
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
- **Trading Plan** — คำแนะนำซื้อ/ถือ/ขาย, stop loss, target, position sizing, DCA
- สลับโหมด **"ถืออยู่แล้ว" / "ยังไม่ได้ซื้อ"** สำหรับคำแนะนำที่ต่างกัน
- ราคาอัปเดตอัตโนมัติทุก **30 วินาที**, กราฟทุก **5 นาที**, วิเคราะห์ทุก **5 นาที**
- แสดง **เวลาซื้อขายล่าสุด** (จาก Yahoo) และ **เวลาที่ดึงข้อมูล** (`fetched_at`) แยกกัน
- ปุ่ม ⭐ เพิ่มรายการโปรด

### พอร์ต (`/portfolio`)
- บันทึกหุ้นที่ถือ: **สัญลักษณ์ + จำนวน + ราคาซื้อเฉลี่ย**
- แสดงมูลค่าปัจจุบัน, กำไร/ขาดทุน unrealized (%)
- แก้ไข / ลบรายการ

### เปรียบเทียบ (`/compare`)
- เลือก 2–5 หุ้น เปรียบ side-by-side
- Preset 23 หมวด — กด preset เปลี่ยน **เพิ่มด่วน** (ไม่ auto compare)
- ปุ่ม **+ เลือกหุ้นจาก preset** และ **แชร์ลิงก์** (copy URL)
- สรุป Best Pick, กราฟ valuation เปรียบเทียบ, ตารางละเอียดแบบ collapsible

### รายการโปรด (`/favorites`)
- หุ้นที่บันทึกไว้ พร้อมราคาอัปเดตอัตโนมัติทุก 30 วินาที

### ระบบผู้ใช้
- Login ด้วย JWT (HttpOnly cookie)
- **Super Admin** — จัดการผู้ใช้ + **Watchlist ทั่วไป** ที่ `/admin`
- SQLite เก็บ users, favorites, positions, watchlist
- API ส่วนใหญ่ต้อง login (ยกเว้น `/api/auth/login`)

### UI / UX
- Dark/Light theme
- พื้นหลัง 3D (Three.js) แบบ full-screen
- Responsive + เมนู hamburger บนมือถือ
- ฟอนต์ขนาดใหญ่ขึ้นสำหรับอ่านง่าย

---

## สถาปัตยกรรม

| ชั้น | เทคโนโลยี |
|------|-----------|
| Backend | Python 3.10, FastAPI, Uvicorn, yfinance, pandas, SQLAlchemy, SQLite |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Charts | Lightweight Charts (TradingView), Three.js |
| Deploy | Docker Compose — nginx (frontend `:3010`) → FastAPI (`:8010`) |

```
Browser → nginx :3010 → /api/* → FastAPI :8010 → yfinance / SQLite
```

---

## โครงสร้างโฟลเดอร์

```text
stock-analyzer/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI routes
│       ├── services.py          # yfinance + cache
│       ├── analysis.py          # fundamental / technical / trend
│       ├── risk.py              # recommendation + trading plan
│       ├── fundamentals.py
│       ├── valuation_charts.py
│       ├── market_signals.py    # homepage watchlist scan
│       ├── schemas.py           # Pydantic models
│       ├── auth.py              # JWT + bcrypt
│       ├── database.py
│       ├── models.py            # User, Favorite
│       ├── init_db.py           # migrate + seed superadmin
│       └── routers/
│           ├── auth.py
│           ├── users.py
│           └── favorites.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf               # proxy /api → backend
    └── src/
        ├── App.jsx
        ├── api.js               # API client + presets
        ├── hooks/
        │   └── useQuotePoll.js  # auto-refresh quotes
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── FavoritesContext.jsx
        │   └── ThemeContext.jsx
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── StockPage.jsx
        │   ├── ComparePage.jsx
        │   ├── FavoritesPage.jsx
        │   ├── LoginPage.jsx
        │   └── AdminPage.jsx
        └── components/
            ├── Layout.jsx
            ├── StockChart.jsx
            ├── TradingPlanPanel.jsx
            ├── MarketSignalSections.jsx
            ├── QuickCompareSection.jsx
            ├── AnimatedBackground.jsx
            └── valuation/         # charts & panels
```

---

## เริ่มต้นใช้งาน (Docker — แนะนำ)

```bash
# 1. คัดลอก env (แก้ JWT_SECRET และรหัส admin ก่อน deploy จริง)
cp .env.example .env

# 2. Build และรัน
docker compose up -d --build

# 3. เปิดเบราว์เซอร์
# Frontend: http://localhost:3010
# Backend:  http://localhost:8010
```

**Login เริ่มต้น (superadmin):**

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
python -m venv .venv
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
# เปิด http://localhost:5173 (proxy /api → localhost:8010 ถ้ามีใน vite.config)
```

---

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | Default | คำอธิบาย |
|--------|---------|----------|
| `JWT_SECRET` | `change-me-in-production` | คีย์ลงนาม JWT |
| `APP_ENV` | `development` | `development` หรือ `production` (production = ตรวจ security ตอน startup) |
| `CORS_ORIGINS` | `*` | โดเมนที่อนุญาต (คั่นด้วยจุลภาค) |
| `SUPERADMIN_USERNAME` | `admin` | ชื่อ superadmin ตอน seed |
| `SUPERADMIN_EMAIL` | `admin@example.com` | อีเมล superadmin |
| `SUPERADMIN_PASSWORD` | `admin1234` | รหัสผ่าน superadmin |
| `DATABASE_URL` | `sqlite:////data/app.db` | SQLite path (Docker ใช้ volume `app-data`) |
| `VITE_API_URL` | `/api` | Base URL ของ API (frontend build) |

---

## API Endpoints

### Auth (ไม่ต้อง login)

| Method | Path | คำอธิบาย |
|--------|------|----------|
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
| GET | `/api/positions` | รายการถือหุ้น + P/L |
| POST | `/api/positions` | เพิ่ม `{ "symbol", "shares", "avg_cost" }` |
| PUT | `/api/positions/{id}` | แก้ไขจำนวน/ราคาทุน |
| DELETE | `/api/positions/{id}` | ลบ |

### Watchlist (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/watchlist` | ดู watchlist ทั่วไป |
| PUT | `/api/watchlist` | ตั้ง watchlist (superadmin) `{ "symbols": [...] }` |

### Stock & Analysis (login required)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/stock/quote?symbol=` | ราคาปัจจุบัน + `market_time` + `fetched_at` |
| GET | `/api/stock/info?symbol=` | ข้อมูลบริษัท |
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
| FavoritesPage | ราคา | 30 วินาที |
| StockPage | วิเคราะห์ | 5 นาที |
| HomePage Market Signals | สัญญาณ | 15 นาที |
| HomePage | การ์ดราคา | 3 นาที |

- กลับมาแท็บเบราว์เซอร์ → ดึงข้อมูลทันที
- `market_time` = เวลาซื้อขายล่าสุดจาก Yahoo (อาจไม่เปลี่ยนเมื่อตลาดปิด)
- `fetched_at` = เวลาที่ backend ดึงจาก Yahoo ล่าสุด (จะขยับทุก ~30 วิ)

### Backend cache

| ประเภท | TTL |
|--------|-----|
| Quote | 30 วินาที |
| History | 5 นาที |
| Raw financials | 30 นาที |
| Market signals | 15 นาที |

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
- โหมด "ถืออยู่แล้ว" แสดงคำแนะนำลด/เพิ่ม/ถือ แทนแผนซื้อใหม่

### Market Signals Watchlist
`AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, AMD, INTC, PTT.BK, CPALL.BK, AOT.BK, KBANK.BK, 0700.HK, BABA`

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

## Production Deploy (Phase 2)

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
bash scripts/backup-db.sh          # รัน manual
# cron รายวัน — ดู deploy/cron-backup.example
```

### Dev vs Production

| | Dev | Production |
|---|-----|------------|
| คำสั่ง | `docker compose up -d` | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |
| `APP_ENV` | `development` | `production` |
| CORS | `*` OK | ต้องระบุโดเมน |
| Ports | `:3010`, `:8010` เปิดทุก interface | bind `127.0.0.1` เท่านั้น |

---

## Production Checklist

- [ ] เปลี่ยน `JWT_SECRET` เป็นค่าสุ่มยาว
- [ ] เปลี่ยน `SUPERADMIN_PASSWORD` ทันทีหลัง first login
- [ ] ตั้ง `CORS_ORIGINS` เป็นโดเมนจริง (ไม่ใช้ `*`)
- [ ] ตั้ง reverse proxy + HTTPS (Caddy/nginx — ดูตัวอย่างด้านล่าง)
- [ ] Backup SQLite: `bash scripts/backup-db.sh` (cron รายวัน)
- [ ] Backup volume `app-data`
- [ ] ข้อมูล Yahoo Finance ไม่เหมาะสำหรับ trading แบบ real-time

### Backup

```bash
bash scripts/backup-db.sh
# ไฟล์อยู่ที่ backups/app_YYYYMMDD_HHMMSS.db
```

### HTTPS ตัวอย่าง (Caddy)

```text
your-domain.com {
  reverse_proxy localhost:3010
}
```

---

---

## Phase 3 — Portfolio & Watchlist

### พอร์ต (`/portfolio`)
- บันทึก **symbol + shares + avg_cost**
- P/L unrealized อัปเดต auto **30s**
- หน้าหุ้นแสดง banner ถ้าถืออยู่ + ส่งข้อมูลเข้า Trading Plan

### Watchlist (แบบ C)
| แหล่ง | ใครตั้ง | ใช้เมื่อ |
|-------|---------|---------|
| Global | Super Admin ที่ `/admin` | Market Signals → "Watchlist ทั่วไป" |
| Personal | ⭐ รายการโปรดของ user | Market Signals → "รายการโปรด" |
| Fallback | Global | ถ้า user ไม่มีโปรด |

---

## Phase 4 — Tests

```bash
bash scripts/test-all.sh
# หรือแยก:
cd frontend && npm test
docker compose exec backend sh -c 'pip install -q pytest httpx && cd /app && PYTHONPATH=. pytest tests/ -q'
```

| ชุด | ไฟล์ | ครอบคลุม |
|-----|------|----------|
| Backend | `tests/test_analysis.py` | RSI, S/R, recommendation |
| Backend | `tests/test_positions.py` | CRUD + auth |
| Backend | `tests/test_watchlist.py` | admin/user permissions |
| Backend | `tests/test_market_signals.py` | scope global/personal |
| Frontend | `src/utils/chartIndicators.test.js` | EMA, RSI, MACD, trend |

---

## ทดสอบ (Tests)

```bash
bash scripts/test-all.sh
```

---

## License

Private / internal use — ปรับตามนโยบายของโปรเจกต์
