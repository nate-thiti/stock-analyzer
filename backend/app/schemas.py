from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class StockQuote(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: float
    change: float
    change_percent: float
    currency: str
    exchange: str
    market_time: str

class StockHistoryItem(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class StockHistoryResponse(BaseModel):
    symbol: str
    interval: str
    history: List[StockHistoryItem]

class StockInfo(BaseModel):
    symbol: str
    name: Optional[str] = None
    summary: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    pe_ratio: Optional[float] = None
    market_cap: Optional[float] = None
    dividend_yield: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
