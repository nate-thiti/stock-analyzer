"""Quarterly fundamentals & historical P/E series for valuation charts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from .services import PERIOD_MAP, get_provider_history, get_raw_financials, clean_symbol


def _parse_date(value: str) -> datetime:
    try:
        return pd.Timestamp(value).to_pydatetime()
    except Exception:
        return datetime.min


def _quarter_eps(quarter: dict) -> Optional[float]:
    eps = quarter.get("eps_diluted")
    if eps is not None and eps > 0:
        return float(eps)
    net = quarter.get("net_income")
    shares = quarter.get("diluted_shares_outstanding")
    if net is not None and shares and shares > 0:
        return float(net) / float(shares)
    return None


def _sorted_quarters(raw) -> List[dict]:
    quarters = list(raw.income_quarters or [])
    quarters.sort(key=lambda q: _parse_date(q.get("fiscal_date", "")))
    return quarters


def build_quarterly_series(symbol: str) -> List[Dict[str, Any]]:
    raw = get_raw_financials(symbol)
    items: List[Dict[str, Any]] = []

    for q in _sorted_quarters(raw):
        revenue = q.get("sales")
        net_income = q.get("net_income")
        gross = q.get("gross_profit")
        eps = _quarter_eps(q)

        gross_margin = (gross / revenue) if gross is not None and revenue else None
        net_margin = (net_income / revenue) if net_income is not None and revenue else None

        items.append({
            "fiscal_date": q.get("fiscal_date"),
            "revenue": round(revenue, 2) if revenue is not None else None,
            "net_income": round(net_income, 2) if net_income is not None else None,
            "eps": round(eps, 4) if eps is not None else None,
            "gross_margin": round(gross_margin, 4) if gross_margin is not None else None,
            "net_margin": round(net_margin, 4) if net_margin is not None else None,
        })

    return items


def _ttm_eps_schedule(quarters: List[dict]) -> List[Tuple[datetime, float]]:
    schedule: List[Tuple[datetime, float]] = []
    eps_vals: List[Tuple[datetime, float]] = []

    for q in quarters:
        eps = _quarter_eps(q)
        if eps is None:
            continue
        eps_vals.append((_parse_date(q.get("fiscal_date", "")), eps))

    for i in range(3, len(eps_vals)):
        ttm = sum(v for _, v in eps_vals[i - 3 : i + 1])
        if ttm > 0:
            schedule.append((eps_vals[i][0], ttm))

    return schedule


def _lookup_ttm_eps(as_of: datetime, schedule: List[Tuple[datetime, float]]) -> Optional[float]:
    ttm = None
    for report_date, value in schedule:
        if report_date <= as_of:
            ttm = value
        else:
            break
    return ttm


def build_pe_history(symbol: str, period: str = "2y") -> List[Dict[str, Any]]:
    cleaned = clean_symbol(symbol)
    yf_period = PERIOD_MAP.get(period, "2y")
    df = get_provider_history(cleaned, period=yf_period, interval="1d")
    if df is None or df.empty:
        return []

    raw = get_raw_financials(cleaned)
    schedule = _ttm_eps_schedule(_sorted_quarters(raw))
    if not schedule:
        return []

    history: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        if hasattr(idx, "to_pydatetime"):
            as_of = idx.to_pydatetime()
            if getattr(as_of, "tzinfo", None) is not None:
                as_of = as_of.replace(tzinfo=None)
        else:
            as_of = _parse_date(str(idx))

        price = float(row["Close"])
        ttm_eps = _lookup_ttm_eps(as_of, schedule)
        pe = round(price / ttm_eps, 2) if ttm_eps and ttm_eps > 0 else None

        history.append({
            "time": as_of.strftime("%Y-%m-%d"),
            "price": round(price, 2),
            "pe_ratio": pe,
        })

    return history
