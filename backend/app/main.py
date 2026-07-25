from fastapi import FastAPI, HTTPException, Query, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import pandas as pd
import asyncio

from .init_db import init_db
from .auth import get_current_user
from .database import get_db
from .models import User
from .routers import auth, users, favorites, positions, watchlist
from sqlalchemy.orm import Session
from .schemas import (
    StockQuote, StockHistoryResponse, StockInfo, CSVImportRequest, CSVExportRequest,
    AnalysisResponse, ComparisonResponse, BatchAnalysisRequest, SearchResult,
    QuarterlyFundamentalsResponse, QuarterlyFundamentalItem,
    ValuationHistoryResponse, ValuationHistoryItem,
    MarketSignalsResponse,
)
from .market_signals import get_market_signals
from .services import (
    get_stock_quote, get_stock_history, get_stock_info, get_fundamental_metrics, search_symbols,
)
from .valuation_charts import build_quarterly_series, build_pe_history
from .analysis import (
    parse_csv_data, export_to_csv, calculate_fundamental_analysis,
    calculate_technical_analysis, calculate_trend_analysis,
)
from .risk import generate_recommendation, generate_trading_plan

app = FastAPI(
    title="Stock Analyzer API",
    description="วิเคราะห์หุ้นทั่วโลก — P/E, PEG, P/S, Technical, Position Sizing, Stop Loss",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(favorites.router)
app.include_router(positions.router)
app.include_router(watchlist.router)

protected = APIRouter(dependencies=[Depends(get_current_user)])


@app.on_event("startup")
def on_startup():
    init_db()


def _history_to_df(history) -> pd.DataFrame:
    data = [{"Date": i.time, "Open": i.open, "High": i.high, "Low": i.low, "Close": i.close, "Volume": i.volume} for i in history]
    df = pd.DataFrame(data)
    df["Date"] = pd.to_datetime(df["Date"])
    df.set_index("Date", inplace=True)
    return df


def _run_analysis(
    symbol: str,
    period: str = "6mo",
    interval: str = "1d",
    account_size: float = 100_000,
    risk_pct: float = 2.0,
) -> AnalysisResponse:
    history = get_stock_history(symbol, period, interval)
    if not history:
        raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูลราคา '{symbol}'")

    df = _history_to_df(history)
    quote = get_stock_quote(symbol)
    current_price = quote.price if quote else float(df["Close"].iloc[-1])
    currency = quote.currency if quote else "USD"

    try:
        metrics = get_fundamental_metrics(symbol, current_price, df)
    except Exception as e:
        print(f"Fundamentals skip for {symbol}: {e}")
        metrics = {}

    fundamental = calculate_fundamental_analysis(df, symbol, metrics)
    technical = calculate_technical_analysis(df, symbol)
    trend = calculate_trend_analysis(df, symbol)
    recommendation = generate_recommendation(fundamental, technical, trend, current_price)

    trading_plan = generate_trading_plan(
        df, fundamental, technical, trend, recommendation,
        current_price, account_size, risk_pct, currency,
    )

    return AnalysisResponse(
        symbol=symbol.upper(),
        current_price=current_price,
        currency=currency,
        fundamental=fundamental,
        technical=technical,
        trend=trend,
        recommendation=recommendation["action"],
        confidence=recommendation["confidence"],
        trading_plan=trading_plan,
    )


@app.get("/")
def read_root():
    return {"status": "online", "message": "Stock Analyzer API v2.1", "data_source": "Yahoo Finance (yfinance)"}


@protected.get("/api/stock/quote", response_model=StockQuote)
def get_quote(symbol: str = Query(...)):
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"ไม่พบหุ้น '{symbol}'")
    return quote


@protected.get("/api/stock/info", response_model=StockInfo)
def get_info(symbol: str = Query(...)):
    info = get_stock_info(symbol)
    if not info:
        raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูล '{symbol}'")
    return info


@protected.get("/api/stock/history", response_model=StockHistoryResponse)
def get_history(
    symbol: str = Query(...),
    period: str = Query("6mo"),
    interval: str = Query("1d"),
):
    history = get_stock_history(symbol, period, interval)
    if not history:
        raise HTTPException(status_code=404, detail=f"ไม่พบประวัติราคา '{symbol}'")
    return StockHistoryResponse(symbol=symbol.upper(), interval=interval, history=history)


@protected.get("/api/stock/search", response_model=List[SearchResult])
def search_stocks(q: str = Query(..., min_length=1), limit: int = Query(10, le=20)):
    results = search_symbols(q, limit)
    return [SearchResult(**r) for r in results if r.get("symbol")]


@protected.get("/api/stock/fundamentals/quarterly", response_model=QuarterlyFundamentalsResponse)
def get_quarterly_fundamentals(symbol: str = Query(...)):
    quarters = build_quarterly_series(symbol)
    if not quarters:
        raise HTTPException(status_code=404, detail=f"ไม่พบงบรายไตรมาส '{symbol}'")
    return QuarterlyFundamentalsResponse(
        symbol=symbol.upper(),
        quarters=[QuarterlyFundamentalItem(**q) for q in quarters],
    )


@protected.get("/api/stock/fundamentals/pe-history", response_model=ValuationHistoryResponse)
def get_pe_history(
    symbol: str = Query(...),
    period: str = Query("2y"),
):
    history = build_pe_history(symbol, period)
    if not history:
        raise HTTPException(status_code=404, detail=f"ไม่พบประวัติ P/E '{symbol}'")
    return ValuationHistoryResponse(
        symbol=symbol.upper(),
        period=period,
        history=[ValuationHistoryItem(**h) for h in history],
    )


@protected.get("/api/analysis/market-signals", response_model=MarketSignalsResponse)
def market_signals(
    refresh: bool = Query(False),
    scope: str = Query("global", description="global | personal (ใช้รายการโปรด)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if scope not in ("global", "personal"):
        raise HTTPException(status_code=400, detail="scope ต้องเป็น global หรือ personal")
    return get_market_signals(db, user.id, scope, force_refresh=refresh)


@protected.get("/api/analysis/full", response_model=AnalysisResponse)
def get_full_analysis(
    symbol: str = Query(...),
    period: str = Query("6mo"),
    interval: str = Query("1d"),
    account_size: float = Query(100_000, description="เงินทุนพอร์ต"),
    risk_pct: float = Query(2.0, description="ความเสี่ยงต่อเทรด (%)"),
):
    try:
        return _run_analysis(symbol, period, interval, account_size, risk_pct)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@protected.get("/api/analysis/compare", response_model=ComparisonResponse)
def compare_stocks(
    symbols: str = Query(..., description="สัญลักษณ์คั่นด้วยจุลภาค เช่น AAPL,MSFT,GOOGL"),
    period: str = Query("6mo"),
    interval: str = Query("1d"),
    account_size: float = Query(100_000),
    risk_pct: float = Query(2.0),
):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="ต้องระบุอย่างน้อย 2 หุ้น")
    if len(symbol_list) > 5:
        raise HTTPException(status_code=400, detail="เปรียบเทียบได้สูงสุด 5 หุ้น")

    results = []
    for sym in symbol_list:
        try:
            results.append(_run_analysis(sym, period, interval, account_size, risk_pct))
        except HTTPException:
            results.append(AnalysisResponse(symbol=sym, recommendation="error", confidence=0))

    valid = [r for r in results if r.recommendation != "error" and r.trading_plan]
    best = None
    if valid:
        buys = [r for r in valid if r.recommendation == "buy"]
        pool = buys if buys else valid
        best = max(pool, key=lambda r: (r.confidence or 0, r.trading_plan.score if r.trading_plan else 0)).symbol

    summary_parts = []
    for r in valid:
        summary_parts.append(
            f"{r.symbol}: {r.recommendation.upper()} ({(r.confidence or 0)*100:.0f}%) "
            f"P/E={r.fundamental.pe_ratio or 'N/A'}"
        )

    return ComparisonResponse(
        symbols=symbol_list,
        results=results,
        best_pick=best,
        summary=" | ".join(summary_parts) if summary_parts else "ไม่พบข้อมูลเพียงพอ",
    )


@protected.post("/api/analysis/batch")
async def batch_analysis(body: BatchAnalysisRequest):
    results = []
    for symbol in body.symbols:
        try:
            results.append(_run_analysis(symbol, body.period, body.interval, body.account_size, body.risk_pct))
        except HTTPException as e:
            results.append({"symbol": symbol, "error": e.detail})
        except Exception as e:
            results.append({"symbol": symbol, "error": str(e)})
        await asyncio.sleep(0.5)
    return {"results": results}


@protected.post("/api/csv/import")
def import_csv(request: CSVImportRequest):
    try:
        df = parse_csv_data(request.csv_data)
        fundamental = calculate_fundamental_analysis(df, request.symbol)
        technical = calculate_technical_analysis(df, request.symbol)
        trend = calculate_trend_analysis(df, request.symbol)
        current_price = float(df["Close"].iloc[-1])
        recommendation = generate_recommendation(fundamental, technical, trend, current_price)
        trading_plan = generate_trading_plan(df, fundamental, technical, trend, recommendation, current_price)
        return AnalysisResponse(
            symbol=request.symbol, current_price=current_price,
            fundamental=fundamental, technical=technical, trend=trend,
            recommendation=recommendation["action"], confidence=recommendation["confidence"],
            trading_plan=trading_plan,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@protected.post("/api/csv/export")
def export_csv(request: CSVExportRequest):
    history = get_stock_history(request.symbol, request.period, request.interval)
    if not history:
        raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูล '{request.symbol}'")
    df = _history_to_df(history)
    return {
        "symbol": request.symbol,
        "csv_data": export_to_csv(df),
        "period": request.period,
        "interval": request.interval,
    }


app.include_router(protected)
