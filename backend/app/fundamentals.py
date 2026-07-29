"""คำนวณตัวชี้วัดมูลค่าจากข้อมูลดิบ — ไม่ใช้ ratio สำเร็จรูปจาก API"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import pandas as pd


@dataclass
class RawFinancials:
    symbol: str
    name: Optional[str] = None
    currency: Optional[str] = None
    exchange: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    summary: Optional[str] = None
    income_quarters: List[dict] = field(default_factory=list)
    balance_latest: Optional[dict] = None
    earnings: List[dict] = field(default_factory=list)
    dividends: List[dict] = field(default_factory=list)
    market_cap: Optional[float] = None
    dividend_yield: Optional[float] = None
    beta: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None


def _f(val) -> Optional[float]:
    if val is None or val == "":
        return None
    try:
        v = float(val)
        return None if v != v else v
    except (TypeError, ValueError):
        return None


def _sum_field(quarters: List[dict], key: str) -> Optional[float]:
    vals = [_f(q.get(key)) for q in quarters[:4]]
    vals = [v for v in vals if v is not None]
    return sum(vals) if vals else None


def _growth(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / abs(previous)


def compute_fundamentals(
    price: float,
    raw: RawFinancials,
    history_df: Optional[pd.DataFrame] = None,
) -> Dict[str, Optional[float]]:
    """คำนวณ P/E, P/S, PEG, ROE ฯลฯ จากข้อมูลดิบ"""
    q = raw.income_quarters
    bal = raw.balance_latest or {}

    # --- TTM จาก 4 ไตรมาสล่าสุด ---
    revenue_ttm = _sum_field(q, "sales")
    net_income_ttm = _sum_field(q, "net_income")
    gross_profit_ttm = _sum_field(q, "gross_profit")

    operating_ttm = None
    if q:
        ops = []
        for item in q[:4]:
            op = _f(item.get("operating_income"))
            if op is None and item.get("operating_expense"):
                gp = _f(item.get("gross_profit"))
                oe = item["operating_expense"]
                rd = _f(oe.get("research_and_development")) or 0
                sga = _f(oe.get("selling_general_and_administrative")) or 0
                other = _f(oe.get("other_operating_expenses")) or 0
                if gp is not None:
                    op = gp - rd - sga - other
            if op is not None:
                ops.append(op)
        operating_ttm = sum(ops) if ops else None

    shares = _f(q[0].get("diluted_shares_outstanding")) if q else None
    if shares is None and q:
        shares = _f(q[0].get("basic_shares_outstanding"))

    eps_ttm = None
    if net_income_ttm and shares and shares > 0:
        eps_ttm = net_income_ttm / shares
    elif q:
        eps_vals = [_f(item.get("eps_diluted")) for item in q[:4]]
        eps_vals = [v for v in eps_vals if v is not None]
        if eps_vals:
            eps_ttm = sum(eps_vals)

    market_cap = price * shares if shares else None

    # --- Valuation ratios ---
    pe_ratio = price / eps_ttm if eps_ttm and eps_ttm > 0 else None
    ps_ratio = market_cap / revenue_ttm if market_cap and revenue_ttm and revenue_ttm > 0 else None

    equity = _f((bal.get("shareholders_equity") or {}).get("total_shareholders_equity"))
    total_debt = None
    liab = bal.get("liabilities") or {}
    if liab:
        cur = liab.get("current_liabilities") or {}
        non = liab.get("non_current_liabilities") or {}
        std = _f(cur.get("short_term_debt")) or 0
        ltd = _f(non.get("long_term_debt")) or 0
        total_debt = std + ltd if (std or ltd) else None

    pb_ratio = market_cap / equity if market_cap and equity and equity > 0 else None

    # --- Profitability ---
    roe = net_income_ttm / equity if net_income_ttm and equity and equity > 0 else None
    debt_to_equity = total_debt / equity if total_debt is not None and equity and equity > 0 else None

    assets = bal.get("assets") or {}
    cur_ca = assets.get("current_assets") or {}
    cur_assets = _f(cur_ca.get("total_current_assets"))

    liab = bal.get("liabilities") or {}
    cur_cl = liab.get("current_liabilities") or {}
    cur_liab = _f(cur_cl.get("total_current_liabilities"))
    current_ratio = cur_assets / cur_liab if cur_assets and cur_liab and cur_liab > 0 else None

    quick_assets = cur_assets
    if quick_assets is not None:
        inv = _f(cur_ca.get("inventory")) or 0
        quick_assets = cur_assets - inv
    quick_ratio = quick_assets / cur_liab if quick_assets is not None and cur_liab and cur_liab > 0 else None

    gross_margin = gross_profit_ttm / revenue_ttm if gross_profit_ttm and revenue_ttm else None
    operating_margin = operating_ttm / revenue_ttm if operating_ttm and revenue_ttm else None
    net_margin = net_income_ttm / revenue_ttm if net_income_ttm and revenue_ttm else None

    # --- Growth YoY (ไตรมาสล่าสุด vs ไตรมาสเดียวกันปีก่อน) ---
    revenue_growth = None
    earnings_growth = None
    if len(q) >= 5:
        revenue_growth = _growth(_f(q[0].get("sales")), _f(q[4].get("sales")))
        eps_now = _f(q[0].get("eps_diluted"))
        eps_prev = _f(q[4].get("eps_diluted"))
        earnings_growth = _growth(eps_now, eps_prev)
    elif len(q) >= 2:
        revenue_growth = _growth(_f(q[0].get("sales")), _f(q[1].get("sales")))
        earnings_growth = _growth(_f(q[0].get("eps_diluted")), _f(q[1].get("eps_diluted")))

    # --- Forward P/E จาก earnings estimate ---
    forward_pe = None
    if raw.earnings:
        est = _f(raw.earnings[0].get("eps_estimate"))
        if est and est > 0:
            forward_pe = price / est

    # --- PEG = P/E / growth% ---
    peg_ratio = None
    if pe_ratio and earnings_growth and earnings_growth > 0:
        growth_pct = earnings_growth * 100 if abs(earnings_growth) < 1 else earnings_growth
        if growth_pct > 0:
            peg_ratio = pe_ratio / growth_pct

    # --- Dividend yield จาก dividends ย้อนหลัง 4 งวด ---
    dividend_yield = None
    if raw.dividends and price > 0:
        amounts = [_f(d.get("amount")) for d in raw.dividends[:4]]
        amounts = [a for a in amounts if a is not None]
        if amounts:
            annual_div = sum(amounts)
            if len(amounts) < 4:
                annual_div = annual_div * (4 / len(amounts))
            dividend_yield = annual_div / price

    # --- 52-week high/low จาก price history ---
    fifty_two_week_high = None
    fifty_two_week_low = None
    if history_df is not None and len(history_df) >= 20:
        window = history_df.tail(min(252, len(history_df)))
        fifty_two_week_high = float(window["High"].max())
        fifty_two_week_low = float(window["Low"].min())

    return {
        "pe_ratio": _round(pe_ratio),
        "forward_pe": _round(forward_pe),
        "peg_ratio": _round(peg_ratio),
        "ps_ratio": _round(ps_ratio),
        "pb_ratio": _round(pb_ratio),
        "roe": _round(roe),
        "debt_to_equity": _round(debt_to_equity),
        "current_ratio": _round(current_ratio),
        "quick_ratio": _round(quick_ratio),
        "gross_margin": _round(gross_margin),
        "operating_margin": _round(operating_margin),
        "net_margin": _round(net_margin),
        "revenue_growth": _round(revenue_growth),
        "earnings_growth": _round(earnings_growth),
        "market_cap": _round(market_cap),
        "dividend_yield": _round(dividend_yield),
        "fifty_two_week_high": _round(fifty_two_week_high),
        "fifty_two_week_low": _round(fifty_two_week_low),
        "eps_ttm": _round(eps_ttm),
        "revenue_ttm": _round(revenue_ttm),
    }


def _round(val: Optional[float], digits: int = 4) -> Optional[float]:
    if val is None:
        return None
    return round(val, digits)
