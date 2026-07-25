# Stock Analyzer Project

ระบบเว็บวิเคราะห์หุ้นไทย สหรัฐฯ และจีน โดยใช้ข้อมูลจาก Yahoo Finance (ดีเลย์ประมาณ 5-15 นาที)

## สถาปัตยกรรม (Architecture)
- **Backend**: Python (FastAPI, yfinance, Uvicorn)
- **Frontend**: React (Vite, TailwindCSS, Lightweight Charts ของ TradingView)

## โครงสร้างโฟลเดอร์ (Folder Structure)
```text
stock-analyzer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # ทางเข้าหลักของ FastAPI
│   │   ├── services.py      # ตัวดึงข้อมูลจาก yfinance และจัดการ Cache
│   │   └── schemas.py       # Pydantic models สำหรับกำหนดรูปแบบข้อมูล
│   ├── requirements.txt     # Python dependencies
│   └── README.md
└── frontend/
    # จะถูกสร้างโดย Vite (React + TypeScript/JavaScript)
```
