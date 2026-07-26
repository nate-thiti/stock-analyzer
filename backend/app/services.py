import yfinance as yf
import pandas as pd
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import time
import threading
from typing import Dict, Any, Optional, List
from .schemas import StockQuote, StockHistoryItem, StockInfo
from .fundamentals import RawFinancials, compute_fundamentals

QUOTE_CACHE_EXPIRY = 60
HISTORY_CACHE_EXPIRY = 60
RAW_CACHE_EXPIRY = 60

quote_cache: Dict[str, Dict[str, Any]] = {}
raw_cache: Dict[str, Dict[str, Any]] = {}
history_cache: Dict[str, Dict[str, Any]] = {}
_ticker_cache: Dict[str, Any] = {}
_inflight_raw: Dict[str, threading.Event] = {}
_inflight_lock = threading.Lock()

PERIOD_MAP = {
    "1d": "1d", "5d": "5d", "1mo": "1mo", "3mo": "3mo",
    "6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y", "max": "max",
}

INTERVAL_MAP = {
    "1m": "1m", "2m": "2m", "5m": "5m", "15m": "15m", "30m": "30m",
    "60m": "1h", "1h": "1h", "1d": "1d", "1wk": "1wk", "1mo": "1mo",
}


def clean_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        return None if f != f else f
    except (TypeError, ValueError):
        return None


def _get_ticker(symbol: str):
    cleaned = clean_symbol(symbol)
    if cleaned not in _ticker_cache:
        _ticker_cache[cleaned] = yf.Ticker(cleaned)
    return _ticker_cache[cleaned]


def _row_val(df: pd.DataFrame, col, *names) -> Optional[float]:
    if df is None or df.empty or col not in df.columns:
        return None
    for name in names:
        if name in df.index:
            v = _safe_float(df.loc[name, col])
            if v is not None:
                return v
    return None


def _income_quarters_from_yf(ticker) -> List[dict]:
    try:
        df = ticker.quarterly_income_stmt
        if df is None or df.empty:
            df = ticker.income_stmt
        if df is None or df.empty:
            return []

        quarters = []
        for col in list(df.columns):
            gross = _row_val(df, col, "Gross Profit")
            sales = _row_val(df, col, "Total Revenue", "Operating Revenue")
            net = _row_val(df, col, "Net Income", "Net Income Common Stockholders")
            op = _row_val(df, col, "Operating Income", "EBIT")
            eps = _row_val(df, col, "Diluted EPS", "Basic EPS")

            quarters.append({
                "fiscal_date": str(col.date()) if hasattr(col, "date") else str(col),
                "sales": sales,
                "net_income": net,
                "gross_profit": gross,
                "operating_income": op,
                "eps_diluted": eps,
                "diluted_shares_outstanding": _row_val(df, col, "Diluted Average Shares", "Basic Average Shares"),
            })
        return quarters
    except Exception as e:
        print(f"yfinance income error: {e}")
        return []


def _balance_from_yf(ticker) -> Optional[dict]:
    try:
        df = ticker.quarterly_balance_sheet
        if df is None or df.empty:
            df = ticker.balance_sheet
        if df is None or df.empty:
            return None

        col = df.columns[0]
        equity = _row_val(df, col, "Stockholders Equity", "Total Equity Gross Minority Interest")
        cur_assets = _row_val(df, col, "Current Assets", "Total Current Assets")
        cur_liab = _row_val(df, col, "Current Liabilities", "Total Current Liabilities")
        inventory = _row_val(df, col, "Inventory")
        total_debt = _row_val(df, col, "Total Debt", "Long Term Debt")
        short_debt = _row_val(df, col, "Current Debt", "Short Long Term Debt")
        long_debt = _row_val(df, col, "Long Term Debt")

        if total_debt is None and (short_debt or long_debt):
            total_debt = (short_debt or 0) + (long_debt or 0)

        return {
            "shareholders_equity": {"total_shareholders_equity": equity},
            "assets": {
                "current_assets": {
                    "total_current_assets": cur_assets,
                    "inventory": inventory,
                }
            },
            "liabilities": {
                "current_liabilities": {
                    "total_current_liabilities": cur_liab,
                    "short_term_debt": short_debt,
                },
                "non_current_liabilities": {
                    "long_term_debt": long_debt or (total_debt - (short_debt or 0) if total_debt else None),
                },
            },
        }
    except Exception as e:
        print(f"yfinance balance error: {e}")
        return None


def _earnings_from_yf(ticker, info: dict) -> List[dict]:
    earnings = []
    forward_eps = _safe_float(info.get("forwardEps"))
    if forward_eps:
        earnings.append({"eps_estimate": forward_eps})

    try:
        cal = ticker.calendar
        if isinstance(cal, dict) and cal.get("Earnings Estimate"):
            est = _safe_float(cal["Earnings Estimate"])
            if est and not earnings:
                earnings.append({"eps_estimate": est})
    except Exception:
        pass

    return earnings


def _dividends_from_yf(ticker) -> List[dict]:
    try:
        divs = ticker.dividends
        if divs is None or divs.empty:
            return []
        items = []
        for date, amount in divs.tail(20).items():
            items.append({
                "ex_date": str(date.date()) if hasattr(date, "date") else str(date),
                "amount": float(amount),
            })
        return list(reversed(items))
    except Exception:
        return []


def _fetch_raw_data(cleaned: str) -> RawFinancials:
    ticker = _get_ticker(cleaned)
    info = ticker.info or {}
    income_quarters = _income_quarters_from_yf(ticker)

    shares = _safe_float(info.get("sharesOutstanding"))
    if income_quarters and shares and not income_quarters[0].get("diluted_shares_outstanding"):
        income_quarters[0]["diluted_shares_outstanding"] = shares

    return RawFinancials(
        symbol=cleaned,
        name=info.get("shortName") or info.get("longName"),
        currency=info.get("currency"),
        exchange=info.get("exchange") or info.get("fullExchangeName"),
        sector=info.get("sector"),
        industry=info.get("industry"),
        summary=info.get("longBusinessSummary"),
        income_quarters=income_quarters,
        balance_latest=_balance_from_yf(ticker),
        earnings=_earnings_from_yf(ticker, info),
        dividends=_dividends_from_yf(ticker),
    )


def get_raw_financials(symbol: str) -> RawFinancials:
    cleaned = clean_symbol(symbol)
    now = time.time()

    if cleaned in raw_cache and now - raw_cache[cleaned]["timestamp"] < RAW_CACHE_EXPIRY:
        return raw_cache[cleaned]["data"]

    with _inflight_lock:
        if cleaned in _inflight_raw:
            evt = _inflight_raw[cleaned]
            is_owner = False
        else:
            evt = threading.Event()
            _inflight_raw[cleaned] = evt
            is_owner = True

    if not is_owner:
        evt.wait(timeout=30)
        if cleaned in raw_cache:
            return raw_cache[cleaned]["data"]
        return RawFinancials(symbol=cleaned)

    try:
        raw = _fetch_raw_data(cleaned)
        raw_cache[cleaned] = {"timestamp": time.time(), "data": raw}
        return raw
    finally:
        with _inflight_lock:
            _inflight_raw.pop(cleaned, None)
            evt.set()


def _quote_market_time(info: dict, hist: pd.DataFrame) -> tuple[str, Optional[str], Optional[str]]:
    tz_name = info.get("exchangeTimezoneName")
    market_state = info.get("marketState")

    ts = info.get("regularMarketTime")
    if ts:
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        if tz_name:
            try:
                dt = dt.astimezone(ZoneInfo(tz_name))
            except Exception:
                pass
        return dt.isoformat(), market_state, tz_name

    if hist is not None and not hist.empty:
        last = hist.index[-1]
        if hasattr(last, "to_pydatetime"):
            dt = last.to_pydatetime()
            if dt.tzinfo is None and tz_name:
                try:
                    dt = dt.replace(tzinfo=ZoneInfo(tz_name))
                except Exception:
                    pass
            return dt.isoformat(), market_state, tz_name
        return str(last), market_state, tz_name

    return datetime.now(timezone.utc).isoformat(), market_state, tz_name


def _optional_quote_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        num = float(value)
        if num != num or num <= 0:  # NaN or invalid
            return None
        return round(num, 2)
    except (TypeError, ValueError):
        return None


def _extended_session(
    info: dict,
    market_state: Optional[str],
    reference_close: Optional[float],
) -> dict:
    """Extract pre/post-market from Yahoo — fallback to currentPrice in PRE/POST."""
    pre_price = _optional_quote_float(info.get("preMarketPrice"))
    pre_change = _optional_quote_float(info.get("preMarketChange"))
    pre_change_pct = _optional_quote_float(info.get("preMarketChangePercent"))

    post_price = _optional_quote_float(info.get("postMarketPrice"))
    post_change = _optional_quote_float(info.get("postMarketChange"))
    post_change_pct = _optional_quote_float(info.get("postMarketChangePercent"))

    current = _optional_quote_float(info.get("currentPrice"))

    if market_state == "PRE" and pre_price is None and current is not None:
        pre_price = current
    if market_state == "POST" and post_price is None and current is not None:
        post_price = current

    ref = reference_close or _optional_quote_float(
        info.get("regularMarketPreviousClose") or info.get("previousClose")
    )

    if pre_price is not None and pre_change is None and ref is not None:
        pre_change = round(pre_price - ref, 2)
        pre_change_pct = round(pre_change / ref * 100, 2) if ref else None

    if post_price is not None and post_change is None and ref is not None:
        post_change = round(post_price - ref, 2)
        post_change_pct = round(post_change / ref * 100, 2) if ref else None

    return {
        "pre_market_price": pre_price,
        "pre_market_change": pre_change,
        "pre_market_change_percent": pre_change_pct,
        "post_market_price": post_price,
        "post_market_change": post_change,
        "post_market_change_percent": post_change_pct,
    }


def get_stock_quote(symbol: str) -> Optional[StockQuote]:
    cleaned = clean_symbol(symbol)
    now = time.time()

    if cleaned in quote_cache and now - quote_cache[cleaned]["timestamp"] < QUOTE_CACHE_EXPIRY:
        cached = quote_cache[cleaned]["data"]
        if isinstance(cached, StockQuote):
            return cached
        return cached

    try:
        ticker = _get_ticker(cleaned)
        info = ticker.info or {}
        hist = ticker.history(period="5d")

        if hist.empty:
            return None

        market_time, market_state, exchange_timezone = _quote_market_time(info, hist)
        fetched_at = datetime.now(timezone.utc).isoformat()

        regular_price = _optional_quote_float(info.get("regularMarketPrice"))
        prev_close = _optional_quote_float(
            info.get("regularMarketPreviousClose") or info.get("previousClose")
        )

        if regular_price is not None:
            price = regular_price
            if prev_close is not None:
                change = round(price - prev_close, 2)
                change_pct = round(change / prev_close * 100, 2) if prev_close else 0
            else:
                change = round(float(hist["Close"].iloc[-1]) - float(hist["Close"].iloc[-2]), 2) if len(hist) > 1 else 0
                change_pct = round(change / float(hist["Close"].iloc[-2]) * 100, 2) if len(hist) > 1 else 0
        else:
            price = round(float(hist["Close"].iloc[-1]), 2)
            prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price
            change = round(price - prev, 2)
            change_pct = round(change / prev * 100, 2) if prev else 0

        extended = _extended_session(info, market_state, prev_close or price)

        quote = StockQuote(
            symbol=cleaned,
            name=info.get("shortName") or info.get("longName") or cleaned,
            price=price,
            change=change,
            change_percent=change_pct,
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange") or info.get("fullExchangeName") or "Unknown",
            market_time=market_time,
            market_state=market_state,
            exchange_timezone=exchange_timezone,
            fetched_at=fetched_at,
            **extended,
        )
        quote_cache[cleaned] = {"timestamp": now, "data": quote}
        return quote
    except Exception as e:
        print(f"yfinance quote error for {cleaned}: {e}")
        return None


def get_stock_info(symbol: str, price: Optional[float] = None, history_df=None) -> Optional[StockInfo]:
    cleaned = clean_symbol(symbol)
    raw = get_raw_financials(cleaned)

    if price is None:
        quote = get_stock_quote(cleaned)
        price = quote.price if quote else None
    if price is None:
        return None

    metrics = compute_fundamentals(price, raw, history_df)
    ticker = _get_ticker(cleaned)
    info = ticker.info or {}

    dividends = raw.dividends or []
    annual_dividend = round(sum(d["amount"] for d in dividends[:4]), 4) if dividends else None

    return StockInfo(
        symbol=cleaned,
        name=raw.name,
        summary=raw.summary,
        industry=raw.industry,
        sector=raw.sector,
        dividends=dividends,
        annual_dividend=annual_dividend,
        pe_ratio=metrics.get("pe_ratio"),
        forward_pe=metrics.get("forward_pe"),
        peg_ratio=metrics.get("peg_ratio"),
        ps_ratio=metrics.get("ps_ratio"),
        pb_ratio=metrics.get("pb_ratio"),
        roe=metrics.get("roe"),
        debt_to_equity=metrics.get("debt_to_equity"),
        current_ratio=metrics.get("current_ratio"),
        profit_margin=metrics.get("net_margin"),
        revenue_growth=metrics.get("revenue_growth"),
        earnings_growth=metrics.get("earnings_growth"),
        market_cap=metrics.get("market_cap") or _safe_float(info.get("marketCap")),
        dividend_yield=metrics.get("dividend_yield") or _safe_float(info.get("dividendYield")),
        beta=_safe_float(info.get("beta")),
        fifty_two_week_high=metrics.get("fifty_two_week_high") or _safe_float(info.get("fiftyTwoWeekHigh")),
        fifty_two_week_low=metrics.get("fifty_two_week_low") or _safe_float(info.get("fiftyTwoWeekLow")),
        currency=raw.currency,
        exchange=raw.exchange,
    )


def get_fundamental_metrics(symbol: str, price: float, history_df=None) -> dict:
    raw = get_raw_financials(symbol)
    return compute_fundamentals(price, raw, history_df)


def _format_history_time(idx, interval: str) -> str:
    """Daily bars use YYYY-MM-DD (exchange date). Intraday uses ISO with timezone."""
    if interval in ("1d", "1wk", "1mo"):
        if hasattr(idx, "strftime"):
            return idx.strftime("%Y-%m-%d")
        return str(idx)[:10]

    if hasattr(idx, "isoformat"):
        return idx.isoformat()
    if hasattr(idx, "strftime"):
        return idx.strftime("%Y-%m-%d %H:%M:%S")
    return str(idx)


def get_stock_history(symbol: str, period: str = "1mo", interval: str = "1d") -> List[StockHistoryItem]:
    cleaned = clean_symbol(symbol)
    yf_period = PERIOD_MAP.get(period, "6mo")
    yf_interval = INTERVAL_MAP.get(interval, "1d")
    cache_key = f"{cleaned}_{yf_period}_{yf_interval}"
    now = time.time()

    if cache_key in history_cache and now - history_cache[cache_key]["timestamp"] < HISTORY_CACHE_EXPIRY:
        return history_cache[cache_key]["data"]

    try:
        ticker = _get_ticker(cleaned)
        df = ticker.history(period=yf_period, interval=yf_interval)
        if df.empty:
            return []

        history = []
        for idx, row in df.iterrows():
            history.append(StockHistoryItem(
                time=_format_history_time(idx, yf_interval),
                open=round(float(row["Open"]), 2),
                high=round(float(row["High"]), 2),
                low=round(float(row["Low"]), 2),
                close=round(float(row["Close"]), 2),
                volume=int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
            ))

        history_cache[cache_key] = {"timestamp": now, "data": history}
        return history
    except Exception as e:
        print(f"yfinance history error for {cleaned}: {e}")
        return []


def search_symbols(query: str, limit: int = 10) -> List[dict]:
    try:
        results = yf.Search(query, max_results=limit)
        items = []
        for q in (results.quotes or [])[:limit]:
            sym = q.get("symbol", "")
            if sym:
                items.append({
                    "symbol": sym,
                    "name": q.get("shortname") or q.get("longname"),
                    "exchange": q.get("exchange"),
                    "type": q.get("quoteType"),
                })
        return items
    except Exception as e:
        print(f"yfinance search error: {e}")
        return []
