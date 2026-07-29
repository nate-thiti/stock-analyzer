from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Depends, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import pandas as pd
import asyncio

from .init_db import init_db
from .auth import get_current_user
from .database import get_db
from .models import User, Position
from .routers import (
    auth, users, favorites, positions, watchlist, price_alerts, risk_profile,
    portfolio_intelligence,
)
from sqlalchemy.orm import Session
from .schemas import (
    StockQuote, QuoteBatchResponse, StockHistoryResponse, StockInfo, CSVImportRequest, CSVExportRequest,
    AnalysisResponse, ComparisonResponse, BatchAnalysisRequest, SearchResult,
    QuarterlyFundamentalsResponse, QuarterlyFundamentalItem,
    ValuationHistoryResponse, ValuationHistoryItem,
    MarketSignalsResponse, PersonalizedRiskOut, HoldingContextOut,
)
from .market_signals import get_market_signals
from .services import (
    MarketDataError, get_stock_quote, get_stock_quotes, get_stock_history, get_stock_info,
    get_fundamental_metrics, search_symbols,
)
from .valuation_charts import build_quarterly_series, build_pe_history
from .analysis import (
    parse_csv_data, export_to_csv, calculate_fundamental_analysis,
    calculate_technical_analysis, calculate_trend_analysis,
)
from .risk import generate_recommendation, generate_trading_plan
from .personalized_risk import build_personalized_risk
from .portfolio_utils import resolve_account_size

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
app.include_router(price_alerts.router)
app.include_router(risk_profile.router)
app.include_router(portfolio_intelligence.router)

protected = APIRouter(dependencies=[Depends(get_current_user)])


@app.exception_handler(MarketDataError)
async def market_data_error_handler(_request: Request, error: MarketDataError):
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": str(error)},
        headers={"Retry-After": str(error.retry_after)},
    )


@app.on_event("startup")
def on_startup():
    init_db()


def _history_to_df(history) -> pd.DataFrame:
    data = [{"Date": i.time, "Open": i.open, "High": i.high, "Low": i.low, "Close": i.close, "Volume": i.volume} for i in history]
    df = pd.DataFrame(data)
    df["Date"] = pd.to_datetime(df["Date"])
    df.set_index("Date", inplace=True)
    return df


def _compute_position_pct(market_value: Optional[float], account_size: float) -> Optional[float]:
    if not market_value or market_value <= 0:
        return None
    if account_size <= 0:
        return None
    return round(market_value / account_size * 100, 1)


def _build_holding_context(position: Position, current_price: float, account_size: float) -> HoldingContextOut:
    market_value = position.shares * current_price
    cost_basis = position.shares * position.avg_cost
    unrealized_pnl = market_value - cost_basis
    unrealized_pnl_pct = (
        (current_price - position.avg_cost) / position.avg_cost * 100
        if position.avg_cost > 0
        else 0.0
    )
    return HoldingContextOut(
        shares=position.shares,
        avg_cost=position.avg_cost,
        cost_basis=round(cost_basis, 2),
        market_value=round(market_value, 2),
        unrealized_pnl=round(unrealized_pnl, 2),
        unrealized_pnl_pct=round(unrealized_pnl_pct, 2),
        position_pct=_compute_position_pct(market_value, account_size),
    )


_PERSONALIZED_COMPARISON_RANK = {
    "CONSIDER_BUY_NEW": 6,
    "CONSIDER_ADDING": 6,
    "HOLD": 5,
    "HOLD_DO_NOT_ADD": 4,
    "WAIT": 3,
    "HOLD_WITH_TIGHT_RISK_CONTROL": 2,
    "CONSIDER_REDUCING": 1,
    "REDUCE_RISK": 1,
    "AVOID_NEW": 0,
    "REDUCE_OR_SELL": -1,
}


def _comparison_rank(result: AnalysisResponse) -> tuple:
    personalized = result.personalized_risk
    personal_rank = (
        _PERSONALIZED_COMPARISON_RANK.get(personalized.action, 2)
        if personalized
        else {"buy": 3, "hold": 2, "sell": 0}.get(result.recommendation, 1)
    )
    recommendation_rank = {"buy": 2, "hold": 1, "sell": 0}.get(result.recommendation, 0)
    plan_score = result.trading_plan.score if result.trading_plan else 0
    return personal_rank, recommendation_rank, result.confidence or 0, plan_score


def _run_analysis(
    symbol: str,
    period: str = "6mo",
    interval: str = "1d",
    account_size: float = 100_000,
    risk_pct: float = 2.0,
    user: Optional[User] = None,
    db: Optional[Session] = None,
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

    personalized = None
    holding = None
    pos = None
    pnl_pct = None
    avg_cost = None
    position_pct = None

    if user and db is not None:
        cleaned = symbol.upper()
        pos = db.query(Position).filter(
            Position.user_id == user.id,
            Position.symbol == cleaned,
        ).first()
        if pos:
            holding = _build_holding_context(pos, current_price, account_size)
            avg_cost = holding.avg_cost
            pnl_pct = holding.unrealized_pnl_pct
            position_pct = holding.position_pct

    if user and user.max_loss_tolerance_pct is not None and db is not None:
        pr = build_personalized_risk(
            analysis_score=recommendation.get("score", 0),
            analysis_action=recommendation["action"],
            current_price=current_price,
            stop_loss=trading_plan.stop_loss,
            max_loss_tolerance_pct=user.max_loss_tolerance_pct,
            max_position_pct=user.max_position_pct or 10.0,
            avg_cost=avg_cost,
            pnl_pct=pnl_pct,
            position_pct=position_pct,
            currency=currency,
        )
        personalized = PersonalizedRiskOut(**pr.to_dict())

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
        personalized_risk=personalized,
        holding=holding,
    )


@app.get("/")
def read_root():
    return {"status": "online", "message": "Stock Analyzer API v2.1", "data_source": "Yahoo Finance (yfinance)"}


@app.get("/api/config/public")
def public_config():
    """ค่า public สำหรับ frontend — ไม่ต้อง login"""
    bmc = os.getenv("BMC_URL", "").strip() or os.getenv("VITE_BMC_URL", "").strip()
    return {"bmc_url": bmc}


@protected.get("/api/stock/quote", response_model=StockQuote)
def get_quote(symbol: str = Query(...)):
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"ไม่พบหุ้น '{symbol}'")
    return quote


@protected.get("/api/stock/quotes", response_model=QuoteBatchResponse)
def get_quotes(symbols: str = Query(..., description="สัญลักษณ์คั่นด้วยจุลภาค สูงสุด 30 ตัว")):
    symbol_list = [symbol.strip() for symbol in symbols.split(",") if symbol.strip()]
    if not symbol_list:
        raise HTTPException(status_code=400, detail="ต้องระบุหุ้นอย่างน้อย 1 ตัว")
    if len(symbol_list) > 30:
        raise HTTPException(status_code=400, detail="ขอราคาได้สูงสุด 30 หุ้นต่อครั้ง")
    quotes, errors = get_stock_quotes(symbol_list)
    return QuoteBatchResponse(quotes=quotes, errors=errors)


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
    account_size: float = Query(None, description="เงินทุนพอร์ต"),
    risk_pct: float = Query(None, description="ความเสี่ยงต่อเทรด (%)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acct = account_size if account_size is not None else resolve_account_size(db, user.id, 100_000.0)
    risk = risk_pct if risk_pct is not None else (user.risk_per_trade_pct or 2.0)
    try:
        return _run_analysis(symbol, period, interval, acct, risk, user=user, db=db)
    except HTTPException:
        raise
    except MarketDataError:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@protected.get("/api/analysis/compare", response_model=ComparisonResponse)
def compare_stocks(
    symbols: str = Query(..., description="สัญลักษณ์คั่นด้วยจุลภาค เช่น AAPL,MSFT,GOOGL"),
    period: str = Query("6mo"),
    interval: str = Query("1d"),
    account_size: float = Query(None),
    risk_pct: float = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acct = account_size if account_size is not None else resolve_account_size(db, user.id, 100_000.0)
    risk = risk_pct if risk_pct is not None else (user.risk_per_trade_pct or 2.0)
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="ต้องระบุอย่างน้อย 2 หุ้น")
    if len(symbol_list) > 5:
        raise HTTPException(status_code=400, detail="เปรียบเทียบได้สูงสุด 5 หุ้น")

    results = []
    for sym in symbol_list:
        try:
            results.append(_run_analysis(sym, period, interval, acct, risk, user=user, db=db))
        except HTTPException:
            results.append(AnalysisResponse(symbol=sym, recommendation="error", confidence=0))

    valid = [r for r in results if r.recommendation != "error" and r.trading_plan]
    best = None
    if valid:
        best = max(valid, key=_comparison_rank).symbol

    summary_parts = []
    for r in valid:
        if r.personalized_risk:
            holding_note = ""
            if r.holding:
                holding_note = f", ในพอร์ต P/L {r.holding.unrealized_pnl_pct:+.1f}%"
            summary_parts.append(
                f"{r.symbol}: {r.personalized_risk.action_label}{holding_note}"
            )
        else:
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
async def batch_analysis(
    body: BatchAnalysisRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acct = body.account_size if body.account_size else resolve_account_size(db, user.id, 100_000.0)
    risk = body.risk_pct if body.risk_pct else (user.risk_per_trade_pct or 2.0)
    results = []
    for symbol in body.symbols:
        try:
            results.append(_run_analysis(symbol, body.period, body.interval, acct, risk, user=user, db=db))
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
