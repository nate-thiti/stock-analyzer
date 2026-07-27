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
    market_state: Optional[str] = None
    exchange_timezone: Optional[str] = None
    fetched_at: Optional[str] = None
    pre_market_price: Optional[float] = None
    pre_market_change: Optional[float] = None
    pre_market_change_percent: Optional[float] = None
    post_market_price: Optional[float] = None
    post_market_change: Optional[float] = None
    post_market_change_percent: Optional[float] = None
    day_open: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None

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

class DividendItem(BaseModel):
    ex_date: str
    amount: float


class StockInfo(BaseModel):
    symbol: str
    name: Optional[str] = None
    summary: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    dividends: List[DividendItem] = []
    annual_dividend: Optional[float] = None
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    peg_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    profit_margin: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    market_cap: Optional[float] = None
    dividend_yield: Optional[float] = None
    beta: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    currency: Optional[str] = None
    exchange: Optional[str] = None

class FundamentalAnalysis(BaseModel):
    symbol: str
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
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
    valuation_grade: Optional[str] = None
    analysis_date: str

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

class TrendAnalysis(BaseModel):
    symbol: str
    trend_direction: str
    trend_strength: str
    volume_trend: str
    price_pattern: Optional[str] = None
    key_levels: Dict[str, Optional[float]]
    analysis_date: str

class TradingPlan(BaseModel):
    action: str
    confidence: float
    reasons: List[str] = []
    score: float = 0
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    stop_loss_method: Optional[str] = None
    position_size_shares: int = 0
    position_size_amount: float = 0
    portfolio_allocation_pct: float = 0
    dca_splits: List[Dict[str, Any]] = []
    risk_reward_ratio: Optional[float] = None
    atr: Optional[float] = None
    account_size: float = 100_000
    risk_pct: float = 2.0
    currency: str = "USD"
    summary: str = ""
    plan_date: str = ""
    detailed_analysis: str = ""
    fundamental_notes: List[str] = []
    technical_notes: List[str] = []
    risk_notes: List[str] = []


class PersonalizedRiskOut(BaseModel):
    action: str
    action_label: str
    summary: str
    max_loss_tolerance_pct: float
    max_position_pct: float = 10.0
    current_loss_pct: Optional[float] = None
    risk_usage_pct: Optional[float] = None
    risk_usage_band: Optional[str] = None
    personal_risk_floor: Optional[float] = None
    technical_stop: Optional[float] = None
    effective_stop: Optional[float] = None
    position_pct: Optional[float] = None
    technical_stop_breached: bool = False
    has_position: bool = False
    notes: List[str] = []


class AnalysisResponse(BaseModel):
    symbol: str
    current_price: Optional[float] = None
    currency: Optional[str] = None
    fundamental: Optional[FundamentalAnalysis] = None
    technical: Optional[TechnicalAnalysis] = None
    trend: Optional[TrendAnalysis] = None
    recommendation: Optional[str] = None
    confidence: Optional[float] = None
    trading_plan: Optional[TradingPlan] = None
    personalized_risk: Optional[PersonalizedRiskOut] = None

class ComparisonResponse(BaseModel):
    symbols: List[str]
    results: List[AnalysisResponse]
    best_pick: Optional[str] = None
    summary: Optional[str] = None


class SignalItem(BaseModel):
    symbol: str
    name: Optional[str] = None
    current_price: Optional[float] = None
    currency: Optional[str] = "USD"
    change_percent: Optional[float] = None
    recommendation: str
    confidence: float = 0
    score: float = 0
    signal_tier: str = "hold"
    signal_tier_label: str = "ถือ/รอดู"


class MarketSignalsResponse(BaseModel):
    buy: List[SignalItem] = []
    hold: List[SignalItem] = []
    sell: List[SignalItem] = []
    lean_buy: List[SignalItem] = []
    lean_sell: List[SignalItem] = []
    scanned: int = 0
    updated_at: str = ""
    scope_used: str = "global"


class CSVImportRequest(BaseModel):
    symbol: str
    csv_data: str

class CSVExportRequest(BaseModel):
    symbol: str
    period: str = "1mo"
    interval: str = "1d"

class BatchAnalysisRequest(BaseModel):
    symbols: List[str]
    period: str = "6mo"
    interval: str = "1d"
    account_size: float = 100_000
    risk_pct: float = 2.0

class SearchResult(BaseModel):
    symbol: str
    name: Optional[str] = None
    exchange: Optional[str] = None
    type: Optional[str] = None


class QuarterlyFundamentalItem(BaseModel):
    fiscal_date: str
    revenue: Optional[float] = None
    net_income: Optional[float] = None
    eps: Optional[float] = None
    gross_margin: Optional[float] = None
    net_margin: Optional[float] = None


class QuarterlyFundamentalsResponse(BaseModel):
    symbol: str
    quarters: List[QuarterlyFundamentalItem]


class ValuationHistoryItem(BaseModel):
    time: str
    price: float
    pe_ratio: Optional[float] = None


class ValuationHistoryResponse(BaseModel):
    symbol: str
    period: str
    history: List[ValuationHistoryItem]
