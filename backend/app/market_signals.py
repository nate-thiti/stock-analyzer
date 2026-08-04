import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import threading
from typing import Dict, List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from .schemas import SignalItem, MarketSignalsResponse
from .services import (
    get_stock_history, get_stock_quotes, get_fundamental_metrics, resolve_symbol_profile,
)
from .analysis import (
    calculate_fundamental_analysis,
    calculate_technical_analysis,
    calculate_trend_analysis,
)
from .risk import generate_recommendation
from .personalized_risk import (
    PERSONALIZED_ACTION_LABELS,
    classify_signal_tier,
    personalized_action,
    signal_tier_label,
)
from .models import WatchlistItem, Favorite, Position, User
from .init_db import DEFAULT_WATCHLIST

CACHE_TTL = 900  # 15 นาที
_cache: Dict[str, Dict[str, object]] = {}
_refreshing: set[str] = set()
_cache_lock = threading.Lock()
_refresh_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="market-signals")


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


def _load_signal_context(db: Session, user_id: Optional[int]) -> dict:
    if not user_id:
        return {
            "positions": {},
            "max_loss_tolerance_pct": 20.0,
            "max_position_pct": 10.0,
        }
    positions = db.query(Position).filter(
        Position.user_id == user_id
    ).order_by(Position.symbol).all()
    user = db.get(User, user_id)
    return {
        "positions": {
            position.symbol: {
                "shares": position.shares,
                "avg_cost": position.avg_cost,
            }
            for position in positions
        },
        "max_loss_tolerance_pct": user.max_loss_tolerance_pct or 20.0 if user else 20.0,
        "max_position_pct": user.max_position_pct or 10.0 if user else 10.0,
    }


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


def _analyze_one(symbol: str, quote=None) -> Optional[SignalItem]:
    try:
        history = get_stock_history(symbol, "6mo", "1d")
        if not history:
            return None

        df = _history_to_df(history)
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
        score = rec["score"]
        tier = classify_signal_tier(score)
        if tier in ("strong_buy", "lean_buy"):
            display_action = "buy"
        elif tier in ("strong_sell", "lean_sell"):
            display_action = "sell"
        else:
            display_action = "hold"

        if display_action not in ("buy", "hold", "sell"):
            return None

        name = quote.name if quote and quote.name != symbol.upper() else None
        if not name:
            try:
                name, _sector = resolve_symbol_profile(symbol)
            except Exception:
                name = None

        return SignalItem(
            symbol=symbol.upper(),
            name=name,
            current_price=current_price,
            currency=currency,
            change_percent=quote.change_percent if quote else None,
            recommendation=display_action,
            confidence=rec["confidence"],
            score=score,
            signal_tier=tier,
            signal_tier_label=signal_tier_label(tier),
        )
    except Exception as e:
        print(f"Signal skip {symbol}: {e}")
        return None


def _apply_personal_context(items: List[SignalItem], context: dict) -> None:
    positions = context.get("positions", {})
    max_loss = context.get("max_loss_tolerance_pct") or 20.0
    max_position = context.get("max_position_pct") or 10.0
    portfolio_total = 0.0
    prices = {item.symbol: item.current_price for item in items}
    for symbol, position in positions.items():
        price = prices.get(symbol) or position["avg_cost"]
        portfolio_total += position["shares"] * price

    for item in items:
        position = positions.get(item.symbol)
        has_position = position is not None
        pnl_pct = None
        position_pct = None
        if position:
            if position["avg_cost"] > 0 and item.current_price is not None:
                pnl_pct = round(
                    (item.current_price - position["avg_cost"]) / position["avg_cost"] * 100,
                    2,
                )
            if portfolio_total > 0 and item.current_price is not None:
                position_pct = round(
                    position["shares"] * item.current_price / portfolio_total * 100,
                    1,
                )

        action = personalized_action(
            analysis_score=item.score,
            analysis_action=item.recommendation,
            pnl_pct=pnl_pct,
            max_loss_tolerance_pct=max_loss,
            technical_stop_breached=False,
            position_pct=position_pct,
            max_position_pct=max_position,
            has_position=has_position,
        )
        item.has_position = has_position
        item.personalized_action = action
        item.personalized_action_label = PERSONALIZED_ACTION_LABELS.get(action, action)
        item.unrealized_pnl_pct = pnl_pct
        item.position_pct = position_pct

        if has_position and action in ("REDUCE_OR_SELL", "CONSIDER_REDUCING", "REDUCE_RISK"):
            item.recommendation = "sell"
            item.signal_tier = "strong_sell"
            item.signal_tier_label = "ขาย / ลดสัดส่วน"
        elif action in ("CONSIDER_BUY_NEW", "CONSIDER_ADDING") and item.score >= 0.6:
            item.recommendation = "buy"
            item.signal_tier = "strong_buy"
            item.signal_tier_label = "ควรซื้อ / เพิ่ม"


def _build_market_signals(watchlist: List[str], resolved_scope: str, context: dict) -> MarketSignalsResponse:
    items: List[SignalItem] = []
    quotes, _quote_errors = get_stock_quotes(watchlist)
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_analyze_one, sym, quotes.get(sym)): sym for sym in watchlist}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                items.append(result)

    _apply_personal_context(items, context)

    buy = sorted(
        [i for i in items if i.signal_tier == "strong_buy"],
        key=lambda x: (x.confidence, x.score),
        reverse=True,
    )
    lean_buy = sorted(
        [i for i in items if i.signal_tier == "lean_buy"],
        key=lambda x: (x.confidence, x.score),
        reverse=True,
    )
    hold = sorted(
        [i for i in items if i.signal_tier == "hold"],
        key=lambda x: abs(x.score),
    )
    lean_sell = sorted(
        [i for i in items if i.signal_tier == "lean_sell"],
        key=lambda x: (x.confidence, abs(x.score)),
        reverse=True,
    )
    sell = sorted(
        [i for i in items if i.signal_tier == "strong_sell"],
        key=lambda x: (x.confidence, abs(x.score)),
        reverse=True,
    )

    payload = MarketSignalsResponse(
        buy=buy,
        lean_buy=lean_buy,
        hold=hold,
        lean_sell=lean_sell,
        sell=sell,
        scanned=len(watchlist),
        updated_at=datetime.now(timezone.utc).isoformat(),
        scope_used=resolved_scope,
        refreshing=False,
        portfolio_scanned=len(context.get("positions", {})),
        candidates_scanned=len(watchlist) - len(context.get("positions", {})),
    )
    return payload


def _refresh_signals(cache_key: str, watchlist: List[str], resolved_scope: str, context: dict) -> None:
    try:
        payload = _build_market_signals(watchlist, resolved_scope, context)
        with _cache_lock:
            _cache[cache_key] = {
                "payload": payload,
                "expires": time.time() + CACHE_TTL,
            }
    except Exception as error:
        print(f"Market signals refresh failed for {cache_key}: {error}")
    finally:
        with _cache_lock:
            _refreshing.discard(cache_key)


def _schedule_refresh(cache_key: str, watchlist: List[str], resolved_scope: str, context: dict) -> bool:
    with _cache_lock:
        if cache_key in _refreshing:
            return False
        _refreshing.add(cache_key)
    _refresh_pool.submit(_refresh_signals, cache_key, list(watchlist), resolved_scope, context)
    return True


def get_market_signals(
    db: Session,
    user_id: Optional[int] = None,
    scope: str = "global",
    force_refresh: bool = False,
) -> MarketSignalsResponse:
    """Return cached signals immediately and refresh expired data off-request."""
    watchlist, resolved_scope = resolve_watchlist(db, user_id, scope)
    context = _load_signal_context(db, user_id)
    position_context = context["positions"]
    universe = list(dict.fromkeys(watchlist + list(position_context)))
    position_key = ",".join(
        f"{symbol}:{value['shares']}:{value['avg_cost']}" for symbol, value in position_context.items()
    )
    cache_key = (
        f"{user_id}:{resolved_scope}:{','.join(universe)}:{position_key}:"
        f"{context['max_loss_tolerance_pct']}:{context['max_position_pct']}"
    )
    now = time.time()

    with _cache_lock:
        entry = _cache.get(cache_key)
        payload = entry.get("payload") if entry else None
        is_fresh = bool(entry and now < float(entry["expires"]))
        already_refreshing = cache_key in _refreshing

    should_refresh = force_refresh or not is_fresh
    if should_refresh and not already_refreshing:
        _schedule_refresh(cache_key, universe, resolved_scope, context)
        already_refreshing = True

    if isinstance(payload, MarketSignalsResponse):
        return payload.copy(update={"refreshing": should_refresh or already_refreshing})

    return MarketSignalsResponse(
        scanned=len(universe),
        scope_used=resolved_scope,
        refreshing=True,
        portfolio_scanned=len(position_context),
        candidates_scanned=len(universe) - len(position_context),
    )
