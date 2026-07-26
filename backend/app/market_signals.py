import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from .schemas import SignalItem, MarketSignalsResponse
from .services import get_stock_history, get_stock_quote, get_fundamental_metrics
from .analysis import (
    calculate_fundamental_analysis,
    calculate_technical_analysis,
    calculate_trend_analysis,
)
from .risk import generate_recommendation
from .models import WatchlistItem, Favorite
from .init_db import DEFAULT_WATCHLIST

CACHE_TTL = 60  # 1 นาที
_cache: Dict[str, object] = {"expires": 0.0, "payload": None, "key": ""}


def get_global_watchlist(db: Session) -> List[str]:
    items = db.query(WatchlistItem).order_by(WatchlistItem.sort_order, WatchlistItem.symbol).all()
    if items:
        return [i.symbol for i in items]
    return list(DEFAULT_WATCHLIST)


def get_user_watchlist(db: Session, user_id: int) -> List[str]:
    favs = db.query(Favorite).filter(Favorite.user_id == user_id).order_by(Favorite.symbol).all()
    return [f.symbol for f in favs]


def resolve_watchlist(db: Session, user_id: Optional[int], scope: str) -> tuple[List[str], str]:
    if scope == "personal" and user_id:
        personal = get_user_watchlist(db, user_id)
        if personal:
            return personal, "personal"
    global_list = get_global_watchlist(db)
    return global_list, "global"


def _history_to_df(history) -> pd.DataFrame:
    data = [
        {
            "Date": i.time, "Open": i.open, "High": i.high,
            "Low": i.low, "Close": i.close, "Volume": i.volume,
        }
        for i in history
    ]
    df = pd.DataFrame(data)
    df["Date"] = pd.to_datetime(df["Date"])
    df.set_index("Date", inplace=True)
    return df


def _analyze_one(symbol: str) -> Optional[SignalItem]:
    try:
        history = get_stock_history(symbol, "6mo", "1d")
        if not history:
            return None

        df = _history_to_df(history)
        quote = get_stock_quote(symbol)
        current_price = quote.price if quote else float(df["Close"].iloc[-1])
        currency = quote.currency if quote else "USD"

        try:
            metrics = get_fundamental_metrics(symbol, current_price, df)
        except Exception:
            metrics = {}

        fundamental = calculate_fundamental_analysis(df, symbol, metrics)
        technical = calculate_technical_analysis(df, symbol)
        trend = calculate_trend_analysis(df, symbol)
        rec = generate_recommendation(fundamental, technical, trend, current_price)

        action = rec["action"]
        if action not in ("buy", "hold", "sell"):
            return None

        return SignalItem(
            symbol=symbol.upper(),
            name=quote.name if quote else None,
            current_price=current_price,
            currency=currency,
            change_percent=quote.change_percent if quote else None,
            recommendation=action,
            confidence=rec["confidence"],
            score=rec["score"],
        )
    except Exception as e:
        print(f"Signal skip {symbol}: {e}")
        return None


def get_market_signals(
    db: Session,
    user_id: Optional[int] = None,
    scope: str = "global",
    force_refresh: bool = False,
) -> MarketSignalsResponse:
    watchlist, resolved_scope = resolve_watchlist(db, user_id, scope)
    cache_key = f"{resolved_scope}:{','.join(watchlist)}"
    now = time.time()

    if (
        not force_refresh
        and _cache["payload"]
        and now < _cache["expires"]
        and _cache["key"] == cache_key
    ):
        return _cache["payload"]  # type: ignore

    items: List[SignalItem] = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_analyze_one, sym): sym for sym in watchlist}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                items.append(result)

    buy = sorted(
        [i for i in items if i.recommendation == "buy"],
        key=lambda x: (x.confidence, x.score),
        reverse=True,
    )
    hold = sorted(
        [i for i in items if i.recommendation == "hold"],
        key=lambda x: abs(x.score),
    )
    sell = sorted(
        [i for i in items if i.recommendation == "sell"],
        key=lambda x: (x.confidence, abs(x.score)),
        reverse=True,
    )

    payload = MarketSignalsResponse(
        buy=buy,
        hold=hold,
        sell=sell,
        scanned=len(watchlist),
        updated_at=datetime.now(timezone.utc).isoformat(),
        scope_used=resolved_scope,
    )
    _cache["payload"] = payload
    _cache["expires"] = now + CACHE_TTL
    _cache["key"] = cache_key
    return payload
