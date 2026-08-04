from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from typing import Dict, List, Literal, Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Position, User
from ..services import (
    MarketDataError,
    get_corporate_events,
    get_stock_history,
    get_stock_quote,
    get_stock_quotes,
    resolve_symbol_profile,
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio-intelligence"])

BENCHMARKS = {
    "sp500": ("^GSPC", "S&P 500"),
    "nasdaq": ("^IXIC", "Nasdaq"),
    "set50": ("^SET50.BK", "SET50"),
}


class WhatIfRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    action: Literal["buy", "sell"]
    shares: float = Field(..., gt=0)
    price: Optional[float] = Field(None, gt=0)


def _load_snapshots(db: Session, user_id: int) -> List[dict]:
    positions = db.query(Position).filter(Position.user_id == user_id).order_by(Position.symbol).all()
    if not positions:
        return []

    quotes, _errors = get_stock_quotes([position.symbol for position in positions])
    profiles: Dict[str, tuple[Optional[str], Optional[str]]] = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(resolve_symbol_profile, position.symbol): position.symbol
            for position in positions
        }
        for future in as_completed(futures):
            symbol = futures[future]
            try:
                profiles[symbol] = future.result()
            except Exception as error:
                print(f"Portfolio profile skip {symbol}: {error}")
                profiles[symbol] = (None, None)

    snapshots = []
    for position in positions:
        quote = quotes.get(position.symbol)
        price = quote.price if quote else position.avg_cost
        market_value = position.shares * price
        cost_basis = position.shares * position.avg_cost
        pnl_pct = ((price - position.avg_cost) / position.avg_cost * 100) if position.avg_cost else 0
        name, sector = profiles.get(position.symbol, (None, None))
        snapshots.append({
            "symbol": position.symbol,
            "name": name,
            "sector": sector or "อื่นๆ",
            "shares": position.shares,
            "avg_cost": position.avg_cost,
            "price": price,
            "currency": quote.currency if quote else "USD",
            "market_value": round(market_value, 2),
            "cost_basis": round(cost_basis, 2),
            "pnl_pct": round(pnl_pct, 2),
        })
    return snapshots


def _history_series(symbol: str, period: str) -> Optional[pd.Series]:
    try:
        history = get_stock_history(symbol, period, "1d")
    except MarketDataError:
        return None
    if not history:
        return None
    series = pd.Series(
        {item.time[:10]: item.close for item in history},
        name=symbol,
        dtype=float,
    )
    series.index = pd.to_datetime(series.index)
    return series[~series.index.duplicated(keep="last")].sort_index()


def _load_histories(symbols: List[str], period: str) -> Dict[str, pd.Series]:
    histories: Dict[str, pd.Series] = {}
    with ThreadPoolExecutor(max_workers=min(6, max(1, len(symbols)))) as pool:
        futures = {pool.submit(_history_series, symbol, period): symbol for symbol in symbols}
        for future in as_completed(futures):
            symbol = futures[future]
            series = future.result()
            if series is not None:
                histories[symbol] = series
    return histories


def _correlation_payload(symbols: List[str], histories: Dict[str, pd.Series]) -> dict:
    available = [histories[symbol] for symbol in symbols if symbol in histories]
    if len(available) < 2:
        return {"symbols": [series.name for series in available], "matrix": [], "high_pairs": [], "average": None}

    prices = pd.concat(available, axis=1).sort_index().ffill().dropna()
    returns = prices.pct_change().dropna()
    if returns.empty:
        return {"symbols": list(prices.columns), "matrix": [], "high_pairs": [], "average": None}
    corr = returns.corr().fillna(0)
    corr_symbols = list(corr.columns)
    matrix = [[round(float(corr.loc[a, b]), 3) for b in corr_symbols] for a in corr_symbols]
    pairs = []
    values = []
    for i, first in enumerate(corr_symbols):
        for second in corr_symbols[i + 1:]:
            value = float(corr.loc[first, second])
            values.append(abs(value))
            if value >= 0.8:
                pairs.append({"first": first, "second": second, "correlation": round(value, 2)})
    pairs.sort(key=lambda pair: pair["correlation"], reverse=True)
    return {
        "symbols": corr_symbols,
        "matrix": matrix,
        "high_pairs": pairs,
        "average": round(sum(values) / len(values), 3) if values else None,
    }


def _health_payload(snapshots: List[dict], correlation: dict, max_loss_pct: float) -> dict:
    total = sum(item["market_value"] for item in snapshots)
    if total <= 0:
        return {"score": 0, "grade": "ไม่มีข้อมูล", "breakdown": {}, "risks": ["ยังไม่มีมูลค่าพอร์ต"]}

    weights = [item["market_value"] / total for item in snapshots]
    max_weight = max(weights)
    hhi = sum(weight ** 2 for weight in weights)
    sectors = {
        item["sector"]: sum(
            row["market_value"] for row in snapshots if row["sector"] == item["sector"]
        ) / total
        for item in snapshots
    }
    max_sector = max(sectors.values()) if sectors else 1
    concentration_score = max(0, 100 - max(0, max_weight - 0.25) * 160 - max(0, hhi - 0.25) * 80)
    diversification_score = min(100, len(snapshots) * 14 + len(sectors) * 12)
    loss_weight = sum(
        item["market_value"] / total
        for item in snapshots
        if item["pnl_pct"] <= -max_loss_pct
    )
    downside_score = max(0, 100 - loss_weight * 100)
    avg_corr = correlation.get("average")
    correlation_score = 70 if avg_corr is None else max(0, 100 - max(0, avg_corr - 0.35) * 120)
    score = round(
        concentration_score * 0.35
        + diversification_score * 0.25
        + downside_score * 0.25
        + correlation_score * 0.15
    )
    grade = "แข็งแรง" if score >= 80 else "พอใช้" if score >= 60 else "ควรปรับ"
    risks = []
    if max_weight > 0.35:
        largest = max(snapshots, key=lambda item: item["market_value"])
        risks.append(f"{largest['symbol']} กระจุกตัว {max_weight * 100:.1f}%")
    if max_sector > 0.5:
        sector = max(sectors, key=sectors.get)
        risks.append(f"Sector {sector} สูง {max_sector * 100:.1f}%")
    if correlation.get("high_pairs"):
        risks.append(f"มีคู่หุ้น correlation สูง {len(correlation['high_pairs'])} คู่")
    if loss_weight > 0:
        risks.append(f"มี {loss_weight * 100:.1f}% ของพอร์ตเกินขีดจำกัดขาดทุน")
    if not risks:
        risks.append("ไม่พบความเสี่ยงเด่นจากข้อมูลปัจจุบัน")
    return {
        "score": score,
        "grade": grade,
        "breakdown": {
            "concentration": round(concentration_score),
            "diversification": round(diversification_score),
            "downside": round(downside_score),
            "correlation": round(correlation_score),
        },
        "risks": risks,
    }


def _rebalance_payload(snapshots: List[dict], max_position_pct: float) -> dict:
    total = sum(item["market_value"] for item in snapshots)
    if total <= 0 or not snapshots:
        return {"items": [], "target_cash_pct": 100}
    equal_pct = 100 / len(snapshots)
    target_pct = min(equal_pct, max_position_pct)
    items = []
    for item in snapshots:
        current_pct = item["market_value"] / total * 100
        target_value = total * target_pct / 100
        delta_value = target_value - item["market_value"]
        delta_shares = delta_value / item["price"] if item["price"] else 0
        threshold = total * 0.02
        action = "hold" if abs(delta_value) < threshold else "buy" if delta_value > 0 else "reduce"
        items.append({
            "symbol": item["symbol"],
            "current_pct": round(current_pct, 1),
            "target_pct": round(target_pct, 1),
            "delta_value": round(delta_value, 2),
            "delta_shares": round(delta_shares, 2),
            "action": action,
            "currency": item["currency"],
        })
    items.sort(key=lambda item: abs(item["delta_value"]), reverse=True)
    return {
        "items": items,
        "target_cash_pct": round(max(0, 100 - target_pct * len(snapshots)), 1),
        "method": "น้ำหนักเท่ากันโดยไม่เกินเพดานต่อหุ้น ส่วนที่เหลือถือเป็นเงินสด",
    }


def _events_payload(symbols: List[str]) -> List[dict]:
    events = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(get_corporate_events, symbol): symbol for symbol in symbols}
        for future in as_completed(futures):
            events.extend(future.result())
    today = date.today().isoformat()
    return sorted(
        [event for event in events if event.get("date") and event["date"] >= today],
        key=lambda event: event["date"],
    )[:20]


def _benchmark_payload(snapshots: List[dict], histories: Dict[str, pd.Series], period: str) -> dict:
    total = sum(item["market_value"] for item in snapshots)
    portfolio_series = []
    if total > 0:
        weighted_returns = None
        for item in snapshots:
            series = histories.get(item["symbol"])
            if series is None:
                continue
            returns = series.pct_change().fillna(0) * (item["market_value"] / total)
            weighted_returns = returns if weighted_returns is None else weighted_returns.add(returns, fill_value=0)
        if weighted_returns is not None:
            portfolio_series = ((1 + weighted_returns).cumprod() - 1) * 100

    all_series = {"portfolio": portfolio_series}
    for key, (symbol, _label) in BENCHMARKS.items():
        series = histories.get(symbol)
        if series is not None and not series.empty:
            all_series[key] = (series / series.iloc[0] - 1) * 100

    dates = sorted(set().union(*[
        set(series.index) for series in all_series.values() if hasattr(series, "index")
    ]))
    if len(dates) > 40:
        step = max(1, len(dates) // 40)
        dates = dates[::step]
        if dates[-1] != max(set().union(*[
            set(series.index) for series in all_series.values() if hasattr(series, "index")
        ])):
            dates.append(max(set().union(*[
                set(series.index) for series in all_series.values() if hasattr(series, "index")
            ])))

    points = []
    for index in dates:
        point = {"date": index.date().isoformat()}
        for key, series in all_series.items():
            if hasattr(series, "index"):
                previous = series.loc[:index]
                point[key] = round(float(previous.iloc[-1]), 2) if not previous.empty else None
        points.append(point)
    summary = {
        key: round(float(series.iloc[-1]), 2)
        for key, series in all_series.items()
        if hasattr(series, "iloc") and not series.empty
    }
    return {
        "period": period,
        "summary": summary,
        "points": points,
        "labels": {key: label for key, (_symbol, label) in BENCHMARKS.items()},
        "note": "ผลตอบแทนพอร์ตเป็นค่าประมาณจากน้ำหนักปัจจุบัน ไม่ใช่ผลตอบแทนย้อนหลังของธุรกรรมจริง",
    }


def _currency_warning(snapshots: List[dict]) -> Optional[str]:
    currencies = {item["currency"] for item in snapshots}
    if len(currencies) > 1:
        return "พอร์ตมีหลายสกุลเงิน การรวมมูลค่าเป็นค่าประมาณและยังไม่แปลงอัตราแลกเปลี่ยน"
    return None


@router.get("/intelligence")
def portfolio_intelligence(
    period: str = Query("6mo", pattern="^(3mo|6mo|1y)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snapshots = _load_snapshots(db, user.id)
    if not snapshots:
        return {
            "positions": [],
            "health": _health_payload([], {}, user.max_loss_tolerance_pct or 20),
            "rebalance": {"items": [], "target_cash_pct": 100},
            "correlation": {"symbols": [], "matrix": [], "high_pairs": [], "average": None},
            "events": [],
            "benchmark": {"period": period, "summary": {}, "points": []},
            "warning": None,
        }
    portfolio_symbols = [item["symbol"] for item in snapshots]
    history_symbols = portfolio_symbols + [symbol for symbol, _label in BENCHMARKS.values()]
    with ThreadPoolExecutor(max_workers=2) as pool:
        histories_future = pool.submit(_load_histories, history_symbols, period)
        events_future = pool.submit(_events_payload, portfolio_symbols)
        histories = histories_future.result()
        events = events_future.result()
    correlation = _correlation_payload(portfolio_symbols, histories)
    return {
        "positions": snapshots,
        "health": _health_payload(snapshots, correlation, user.max_loss_tolerance_pct or 20),
        "rebalance": _rebalance_payload(snapshots, user.max_position_pct or 10),
        "correlation": correlation,
        "events": events,
        "benchmark": _benchmark_payload(snapshots, histories, period),
        "warning": _currency_warning(snapshots),
    }


@router.post("/simulate")
def simulate_portfolio(
    body: WhatIfRequest,
    period: str = Query("6mo", pattern="^(3mo|6mo|1y)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snapshots = _load_snapshots(db, user.id)
    symbol = body.symbol.strip().upper()
    existing = next((item for item in snapshots if item["symbol"] == symbol), None)
    quote = get_stock_quote(symbol)
    price = body.price or (quote.price if quote else None)
    if price is None:
        raise HTTPException(status_code=404, detail=f"ไม่พบราคาหุ้น '{symbol}'")
    if body.action == "sell" and (not existing or body.shares > existing["shares"]):
        raise HTTPException(status_code=400, detail="จำนวนที่ขายมากกว่าจำนวนที่ถือ")

    histories = _load_histories([item["symbol"] for item in snapshots], period)
    before_corr = _correlation_payload([item["symbol"] for item in snapshots], histories)
    before_health = _health_payload(snapshots, before_corr, user.max_loss_tolerance_pct or 20)
    simulated = [dict(item) for item in snapshots]

    target = next((item for item in simulated if item["symbol"] == symbol), None)
    if body.action == "buy":
        if target:
            old_cost = target["shares"] * target["avg_cost"]
            target["shares"] += body.shares
            target["avg_cost"] = (old_cost + body.shares * price) / target["shares"]
            target["price"] = price
            target["market_value"] = target["shares"] * price
            target["cost_basis"] = target["shares"] * target["avg_cost"]
            target["pnl_pct"] = (price - target["avg_cost"]) / target["avg_cost"] * 100
        else:
            name, sector = resolve_symbol_profile(symbol)
            target = {
                "symbol": symbol, "name": name, "sector": sector or "อื่นๆ",
                "shares": body.shares, "avg_cost": price, "price": price,
                "currency": quote.currency if quote else "USD",
                "market_value": body.shares * price, "cost_basis": body.shares * price,
                "pnl_pct": 0,
            }
            simulated.append(target)
            series = _history_series(symbol, period)
            if series is not None:
                histories[symbol] = series
    else:
        target["shares"] -= body.shares
        if target["shares"] <= 0:
            simulated.remove(target)
        else:
            target["market_value"] = target["shares"] * price
            target["cost_basis"] = target["shares"] * target["avg_cost"]
            target["pnl_pct"] = (price - target["avg_cost"]) / target["avg_cost"] * 100

    after_corr = _correlation_payload([item["symbol"] for item in simulated], histories)
    after_health = _health_payload(simulated, after_corr, user.max_loss_tolerance_pct or 20)
    total_after = sum(item["market_value"] for item in simulated)
    target_after = next((item for item in simulated if item["symbol"] == symbol), None)
    return {
        "before": before_health,
        "after": after_health,
        "score_change": after_health["score"] - before_health["score"],
        "total_invested": round(total_after, 2),
        "symbol": symbol,
        "symbol_weight_pct": round(target_after["market_value"] / total_after * 100, 1)
        if target_after and total_after else 0,
        "warning": _currency_warning(simulated),
    }
