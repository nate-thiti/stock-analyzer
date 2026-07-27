"""Infer market session when Yahoo omits marketState."""
from __future__ import annotations

from datetime import datetime, time
from typing import Optional, Tuple
from zoneinfo import ZoneInfo


def resolve_exchange_timezone(symbol: str, timezone_name: Optional[str]) -> str:
    if timezone_name:
        try:
            ZoneInfo(timezone_name)
            return timezone_name
        except Exception:
            pass
    sym = (symbol or "").upper()
    if sym.endswith(".BK"):
        return "Asia/Bangkok"
    if sym.endswith(".HK"):
        return "Asia/Hong_Kong"
    return "America/New_York"


def _session_for_us(now: datetime) -> str:
    if now.weekday() >= 5:
        return "CLOSED"
    t = now.time()
    if time(4, 0) <= t < time(9, 30):
        return "PRE"
    if time(9, 30) <= t < time(16, 0):
        return "REGULAR"
    if time(16, 0) <= t < time(20, 0):
        return "POST"
    return "CLOSED"


def _session_for_th(now: datetime) -> str:
    if now.weekday() >= 5:
        return "CLOSED"
    t = now.time()
    if time(10, 0) <= t < time(12, 30):
        return "REGULAR"
    if time(12, 30) <= t < time(14, 30):
        return "CLOSED"
    if time(14, 30) <= t < time(16, 30):
        return "REGULAR"
    return "CLOSED"


def infer_market_state(
    symbol: str,
    timezone_name: Optional[str] = None,
    now: Optional[datetime] = None,
) -> str:
    tz_name = resolve_exchange_timezone(symbol, timezone_name)
    local_now = (now or datetime.now(ZoneInfo("UTC"))).astimezone(ZoneInfo(tz_name))
    sym = (symbol or "").upper()
    if sym.endswith(".BK"):
        return _session_for_th(local_now)
    return _session_for_us(local_now)


def merge_yahoo_info(ticker) -> dict:
    """Merge ticker.info with fast_info fallbacks — Yahoo often returns sparse info."""
    info = dict(ticker.info or {})

    try:
        fast = ticker.fast_info
        fast_map = {
            "last_price": "currentPrice",
            "pre_market_price": "preMarketPrice",
            "post_market_price": "postMarketPrice",
            "open": "regularMarketOpen",
            "day_high": "regularMarketDayHigh",
            "day_low": "regularMarketDayLow",
            "year_high": "fiftyTwoWeekHigh",
            "year_low": "fiftyTwoWeekLow",
        }
        for src, dst in fast_map.items():
            if info.get(dst) is None:
                val = getattr(fast, src, None)
                if val is not None:
                    info[dst] = val
    except Exception:
        pass

    return info


def pick_info_str(info: dict, *keys: str) -> Optional[str]:
    for key in keys:
        val = info.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None
