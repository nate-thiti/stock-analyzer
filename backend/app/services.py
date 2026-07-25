import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import time
import requests
from typing import Dict, Any, Optional, List
from .schemas import StockQuote, StockHistoryItem, StockInfo

# สร้าง Session พร้อมกำหนด User-Agent เพื่อป้องกันการโดน Yahoo บล็อก (429 Too Many Requests)
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://finance.yahoo.com/'
})

# ระบบ Cache ง่ายๆ เพื่อป้องกันการโหลดซ้ำในเวลา 5 นาที (300 วินาที)
CACHE_EXPIRY = 300
quote_cache: Dict[str, Dict[str, Any]] = {}
info_cache: Dict[str, Dict[str, Any]] = {}
history_cache: Dict[str, Dict[str, Any]] = {}  # key format: {symbol}_{period}_{interval}

def clean_symbol(symbol: str) -> str:
    """ช่วยแปลง format ชื่อหุ้น เช่น PTT -> PTT.BK สำหรับหุ้นไทย"""
    s = symbol.strip().upper()
    # ถ้าพิมพ์เลขหุ้นจีน เช่น 000001 แปลงเป็นตลาดเซินเจิ้น/เซี่ยงไฮ้ หรือใช้ .SS / .SZ ตามความเหมาะสม
    # แต่โดยทั่วไปผู้ใช้พิมพ์ชื่อหุ้นตรงๆ ได้เลย
    return s

def get_stock_quote(symbol: str) -> Optional[StockQuote]:
    cleaned = clean_symbol(symbol)
    now = time.time()
    
    # ตรวจสอบ Cache
    if cleaned in quote_cache:
        cached_data = quote_cache[cleaned]
        if now - cached_data["timestamp"] < CACHE_EXPIRY:
            return cached_data["data"]
            
    try:
        ticker = yf.Ticker(cleaned, session=session)
        # ดึงราคาแบบเร็วที่สุดผ่าน fast_info
        fast_info = ticker.fast_info
        
        # ดึง info ทั่วไป (อาจใช้เวลาโหลดมากกว่า)
        info = ticker.info
        name = info.get("longName", info.get("shortName", cleaned))
        
        quote = StockQuote(
            symbol=cleaned,
            name=name,
            price=round(fast_info.last_price, 2) if fast_info.last_price else 0.0,
            change=round(fast_info.last_price - fast_info.previous_close, 2) if fast_info.last_price and fast_info.previous_close else 0.0,
            change_percent=round(((fast_info.last_price - fast_info.previous_close) / fast_info.previous_close) * 100, 2) if fast_info.last_price and fast_info.previous_close else 0.0,
            currency=fast_info.currency or "USD",
            exchange=fast_info.exchange or "Unknown",
            market_time=str(datetime.now())
        )
        
        # บันทึกลง Cache
        quote_cache[cleaned] = {
            "timestamp": now,
            "data": quote
        }
        return quote
    except Exception as e:
        print(f"Error fetching quote for {cleaned}: {e}")
        return None

def get_stock_info(symbol: str) -> Optional[StockInfo]:
    cleaned = clean_symbol(symbol)
    now = time.time()
    
    if cleaned in info_cache:
        cached_data = info_cache[cleaned]
        if now - cached_data["timestamp"] < CACHE_EXPIRY * 6:  # ข้อมูลบริษัทเก็บไว้ได้นานกว่า (30 นาที)
            return cached_data["data"]
            
    try:
        ticker = yf.Ticker(cleaned, session=session)
        info = ticker.info
        fast_info = ticker.fast_info
        
        stock_info = StockInfo(
            symbol=cleaned,
            name=info.get("longName", info.get("shortName", cleaned)),
            summary=info.get("longBusinessSummary"),
            industry=info.get("industry"),
            sector=info.get("sector"),
            pe_ratio=info.get("trailingPE"),
            market_cap=info.get("marketCap"),
            dividend_yield=info.get("dividendYield"),
            fifty_two_week_high=fast_info.year_high,
            fifty_two_week_low=fast_info.year_low
        )
        
        info_cache[cleaned] = {
            "timestamp": now,
            "data": stock_info
        }
        return stock_info
    except Exception as e:
        print(f"Error fetching info for {cleaned}: {e}")
        return None

def get_stock_history(symbol: str, period: str = "1mo", interval: str = "15m") -> List[StockHistoryItem]:
    cleaned = clean_symbol(symbol)
    cache_key = f"{cleaned}_{period}_{interval}"
    now = time.time()
    
    if cache_key in history_cache:
        cached_data = history_cache[cache_key]
        if now - cached_data["timestamp"] < CACHE_EXPIRY:
            return cached_data["data"]
            
    try:
        ticker = yf.Ticker(cleaned, session=session)
        df = ticker.history(period=period, interval=interval)
        
        history = []
        for index, row in df.iterrows():
            # แปลงเวลาดัชนี (Index) เป็น string ISO
            time_str = index.isoformat()
            history.append(StockHistoryItem(
                time=time_str,
                open=round(row['Open'], 2),
                high=round(row['High'], 2),
                low=round(row['Low'], 2),
                close=round(row['Close'], 2),
                volume=int(row['Volume'])
            ))
            
        history_cache[cache_key] = {
            "timestamp": now,
            "data": history
        }
        return history
    except Exception as e:
        print(f"Error fetching history for {cleaned}: {e}")
        return []
