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

# Fundamental Analysis Schemas
class FundamentalAnalysis(BaseModel):
    symbol: str
    pe_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    analysis_date: str

# Technical Analysis Schemas
class TechnicalIndicator(BaseModel):
    name: str
    values: List[Optional[float]]
    signal: Optional[str] = None  # "buy", "sell", "neutral"

class TechnicalAnalysis(BaseModel):
    symbol: str
    ma_5: List[Optional[float]]
    ma_10: List[Optional[float]]
    ma_20: List[Optional[float]]
    ma_50: List[Optional[float]]
    ma_200: List[Optional[float]]
    rsi: List[Optional[float]]
    rsi_signal: Optional[str]
    macd: List[Optional[float]]
    macd_signal: List[Optional[float]]
    macd_histogram: List[Optional[float]]
    bollinger_upper: List[Optional[float]]
    bollinger_middle: List[Optional[float]]
    bollinger_lower: List[Optional[float]]
    support_levels: List[float]
    resistance_levels: List[float]
    timestamps: List[str]

# Trend Analysis Schemas
class TrendAnalysis(BaseModel):
    symbol: str
    trend_direction: str  # "uptrend", "downtrend", "sideways"
    trend_strength: str  # "strong", "moderate", "weak"
    volume_trend: str  # "increasing", "decreasing", "stable"
    price_pattern: Optional[str] = None  # "head_and_shoulders", "double_top", etc.
    key_levels: Dict[str, float]
    analysis_date: str

# CSV Import/Export Schemas
class CSVImportRequest(BaseModel):
    symbol: str
    csv_data: str  # CSV string

class CSVExportRequest(BaseModel):
    symbol: str
    period: str = "1mo"
    interval: str = "1d"

class AnalysisResponse(BaseModel):
    symbol: str
    fundamental: Optional[FundamentalAnalysis] = None
    technical: Optional[TechnicalAnalysis] = None
    trend: Optional[TrendAnalysis] = None
    recommendation: Optional[str] = None  # "buy", "sell", "hold"
    confidence: Optional[float] = None
