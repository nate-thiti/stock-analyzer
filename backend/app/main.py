from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from .schemas import StockQuote, StockHistoryResponse, StockInfo
from .services import get_stock_quote, get_stock_history, get_stock_info

app = FastAPI(
    title="Stock Analyzer API",
    description="API สำหรับดึงข้อมูลหุ้นดีเลย์ 5-15 นาที รองรับหุ้นไทย (SET), สหรัฐฯ (US), จีน (CN)",
    version="1.0.0"
)

# เปิด CORS เพื่อให้ Frontend (React) เชื่อมต่อได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ในโปรดักชันควรจำกัด origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Stock Analyzer API is running"}

@app.get("/api/stock/quote", response_model=StockQuote)
def get_quote(symbol: str = Query(..., description="ชื่อย่อหุ้น เช่น AAPL, PTT.BK, 0700.HK")):
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol}' not found or error fetching data")
    return quote

@app.get("/api/stock/info", response_model=StockInfo)
def get_info(symbol: str = Query(..., description="ชื่อย่อหุ้น เช่น AAPL, PTT.BK, 0700.HK")):
    info = get_stock_info(symbol)
    if not info:
        raise HTTPException(status_code=404, detail=f"Stock info for '{symbol}' not found")
    return info

@app.get("/api/stock/history", response_model=StockHistoryResponse)
def get_history(
    symbol: str = Query(..., description="ชื่อย่อหุ้น"),
    period: str = Query("1mo", description="ช่วงเวลา: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max"),
    interval: str = Query("15m", description="ระยะห่างของแท่งกราฟ: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo")
):
    # ป้องกันการดึง interval สั้นเกินไปกับ period ยาวมากๆ ซึ่ง Yahoo จะไม่อนุญาต
    history = get_stock_history(symbol, period, interval)
    if not history:
        raise HTTPException(status_code=404, detail=f"History for '{symbol}' not found with period={period} and interval={interval}")
    
    return StockHistoryResponse(
        symbol=symbol,
        interval=interval,
        history=history
    )
