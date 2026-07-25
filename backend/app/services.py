import requests
import pandas as pd
from datetime import datetime, timedelta
import time
import random
import threading
import os
from typing import Dict, Any, Optional, List
from .schemas import StockQuote, StockHistoryItem, StockInfo

# Twelve Data API Configuration
TWELVE_DATA_API_KEY = os.getenv('TWELVE_DATA_API_KEY', '3ba11a95538c4b73a9e1d9c262fa43dc')
TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com'

# สร้าง Session พร้อมกำหนด User-Agent
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.5',
})

# Rate limiting settings (Twelve Data: 800 requests/day)
MIN_DELAY = 2.0  # วินาที
MAX_DELAY = 5.0  # วินาที
MAX_RETRIES = 3

last_request_time = 0
request_lock = threading.Lock()

def rate_limit():
    """ป้องกันการ request ถี่เกินไป"""
    global last_request_time
    with request_lock:
        current_time = time.time()
        time_since_last = current_time - last_request_time
        
        if time_since_last < MIN_DELAY:
            sleep_time = MIN_DELAY - time_since_last + random.uniform(0, 1.0)
            time.sleep(sleep_time)
        
        last_request_time = time.time()

def retry_with_backoff(func, *args, max_retries=MAX_RETRIES, **kwargs):
    """Retry ด้วย exponential backoff"""
    for attempt in range(max_retries):
        try:
            rate_limit()
            return func(*args, **kwargs)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            print(f"Retry {attempt + 1}/{max_retries} after {wait_time:.1f}s: {e}")
            time.sleep(wait_time)
    return None

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
            
    def _fetch_quote():
        # Twelve Data API - Price endpoint
        params = {
            'apikey': TWELVE_DATA_API_KEY,
            'symbol': cleaned,
            'outputsize': '1'
        }
        
        response = session.get(f'{TWELVE_DATA_BASE_URL}/price', params=params)
        response.raise_for_status()
        data = response.json()
        
        if 'price' not in data:
            raise ValueError(f"No price data for {cleaned}")
        
        # ดึงข้อมูลเพิ่มเติมจาก time_series เพื่อหา previous close
        params['interval'] = '1day'
        params['outputsize'] = '2'
        ts_response = session.get(f'{TWELVE_DATA_BASE_URL}/time_series', params=params)
        ts_response.raise_for_status()
        ts_data = ts_response.json()
        
        if 'values' in ts_data and len(ts_data['values']) >= 2:
            previous_close = float(ts_data['values'][1]['close'])
        else:
            previous_close = data['price']
        
        price = float(data['price'])
        change = price - previous_close
        change_percent = (change / previous_close) * 100 if previous_close != 0 else 0
        
        quote = StockQuote(
            symbol=cleaned,
            name=cleaned,  # Twelve Data ไม่มีชื่อบริษัทใน price endpoint
            price=round(price, 2),
            change=round(change, 2),
            change_percent=round(change_percent, 2),
            currency='USD',  # Twelve Data ส่วนใหญ่เป็น USD
            exchange='Unknown',
            market_time=str(datetime.now())
        )
        
        # บันทึกลง Cache
        quote_cache[cleaned] = {
            "timestamp": now,
            "data": quote
        }
        return quote
    
    try:
        return retry_with_backoff(_fetch_quote)
    except Exception as e:
        print(f"Error fetching quote for {cleaned}: {e}")
        return None

def get_stock_info(symbol: str) -> Optional[StockInfo]:
    cleaned = clean_symbol(symbol)
    now = time.time()
    
    if cleaned in info_cache:
        cached_data = info_cache[cleaned]
        if now - cached_data["timestamp"] < CACHE_EXPIRY * 6:
            return cached_data["data"]
            
    def _fetch_info():
        # Twelve Data API - Fundamental data
        params = {
            'apikey': TWELVE_DATA_API_KEY,
            'symbol': cleaned
        }
        
        # ดึงข้อมูล fundamental
        response = session.get(f'{TWELVE_DATA_BASE_URL}/symbol_profile', params=params)
        response.raise_for_status()
        data = response.json()
        
        # ดึงข้อมูล financial ratios
        params['type'] = 'financial-ratios'
        ratios_response = session.get(f'{TWELVE_DATA_BASE_URL}/financial_ratios', params=params)
        ratios_response.raise_for_status()
        ratios_data = ratios_response.json()
        
        stock_info = StockInfo(
            symbol=cleaned,
            name=data.get('name', data.get('description', cleaned)),
            summary=data.get('description'),
            industry=data.get('industry'),
            sector=data.get('sector'),
            pe_ratio=ratios_data.get('pe_ratio'),
            market_cap=data.get('market_cap'),
            dividend_yield=ratios_data.get('dividend_yield'),
            fifty_two_week_high=data.get('fifty_two_week_high'),
            fifty_two_week_low=data.get('fifty_two_week_low')
        )
        
        info_cache[cleaned] = {
            "timestamp": now,
            "data": stock_info
        }
        return stock_info
    
    try:
        return retry_with_backoff(_fetch_info)
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
            
    def _fetch_history():
        # Twelve Data API - Time Series
        params = {
            'apikey': TWELVE_DATA_API_KEY,
            'symbol': cleaned,
            'interval': interval,
            'outputsize': '5000'  # ดึงข้อมูลให้มากที่สุด
        }
        
        response = session.get(f'{TWELVE_DATA_BASE_URL}/time_series', params=params)
        response.raise_for_status()
        data = response.json()
        
        if 'values' not in data:
           raise ValueError(f"No history data for {cleaned}")
        
        history = []
        for item in data['values']:
            # Twelve Data ส่ง datetime เป็น string
            time_str = item['datetime']
            history.append(StockHistoryItem(
                time=time_str,
                open=round(float(item['open']), 2),
                high=round(float(item['high']), 2),
                low=round(float(item['low']), 2),
                close=round(float(item['close']), 2),
                volume=int(item['volume']) if item['volume'] else 0
            ))
        
        # เรียงลำดับจากเก่าไปใหม่
        history.reverse()
        
        history_cache[cache_key] = {
            "timestamp": now,
            "data": history
        }
        return history
    
    try:
        return retry_with_backoff(_fetch_history)
    except Exception as e:
        print(f"Error fetching history for {cleaned}: {e}")
        return []
