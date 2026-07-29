import yfinance as yf
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError, as_completed
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import os
import time
import threading
from typing import Callable, Dict, Any, Optional, List, TypeVar
from .schemas import StockQuote, StockHistoryItem, StockInfo
from .fundamentals import RawFinancials, compute_fundamentals
from .market_hours import infer_market_state, merge_yahoo_info, pick_info_str

QUOTE_CACHE_EXPIRY = int(os.getenv("QUOTE_CACHE_SECONDS", "300"))
HISTORY_CACHE_EXPIRY = int(os.getenv("HISTORY_CACHE_SECONDS", "600"))
RAW_CACHE_EXPIRY = int(os.getenv("RAW_CACHE_SECONDS", "900"))
EVENT_CACHE_EXPIRY = int(os.getenv("EVENT_CACHE_SECONDS", "21600"))
STALE_CACHE_EXPIRY = int(os.getenv("STALE_CACHE_SECONDS", "3600"))
YAHOO_TIMEOUT_SECONDS = float(os.getenv("YAHOO_TIMEOUT_SECONDS", "12"))
YAHOO_MAX_WORKERS = int(os.getenv("YAHOO_MAX_WORKERS", "6"))
_provider_pool = ThreadPoolExecutor(max_workers=YAHOO_MAX_WORKERS, thread_name_prefix="yahoo")
_batch_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="quote-batch")
T = TypeVar("T")


class MarketDataError(RuntimeError):
    status_code = 503
    retry_after = 30


class MarketDataRateLimitError(MarketDataError):
    status_code = 429
    retry_after = 300


class MarketDataTimeoutError(MarketDataError):
    status_code = 503
    retry_after = 30


def _is_rate_limit_error(error: BaseException) -> bool:
    message = str(error).lower()
    error_type = type(error).__name__.lower()
    return (
        "ratelimit" in error_type
        or "too many requests" in message
        or "rate limit" in message
        or "429" in message
    )


def _provider_call(label: str, operation: Callable[[], T]) -> T:
    """Bound Yahoo calls so a slow upstream cannot hold a request indefinitely."""
    future = _provider_pool.submit(operation)
    try:
        return future.result(timeout=YAHOO_TIMEOUT_SECONDS)
    except FutureTimeoutError as error:
        future.cancel()
        raise MarketDataTimeoutError(
            f"ผู้ให้บริการข้อมูลใช้เวลาตอบนานเกินไป ({label})"
        ) from error
    except MarketDataError:
        raise
    except Exception as error:
        if _is_rate_limit_error(error):
            raise MarketDataRateLimitError(
                "ผู้ให้บริการข้อมูลจำกัดจำนวนคำขอ กรุณาลองใหม่ภายหลัง"
            ) from error
        raise MarketDataError(f"ผู้ให้บริการข้อมูลขัดข้อง ({label})") from error


def _cached(cache: Dict[str, Dict[str, Any]], key: str, max_age: int):
    entry = cache.get(key)
    if entry and time.time() - entry["timestamp"] < max_age:
        return entry["data"]
    return None


def _stale(cache: Dict[str, Dict[str, Any]], key: str):
    return _cached(cache, key, STALE_CACHE_EXPIRY)


def _claim_inflight(inflight: Dict[str, threading.Event], key: str) -> tuple[threading.Event, bool]:
    with _inflight_lock:
        event = inflight.get(key)
        if event is not None:
            return event, False
        event = threading.Event()
        inflight[key] = event
        return event, True


def _release_inflight(inflight: Dict[str, threading.Event], key: str, event: threading.Event) -> None:
    with _inflight_lock:
        inflight.pop(key, None)
        event.set()


quote_cache: Dict[str, Dict[str, Any]] = {}
raw_cache: Dict[str, Dict[str, Any]] = {}
history_cache: Dict[str, Dict[str, Any]] = {}
extended_cache: Dict[str, Dict[str, Any]] = {}
event_cache: Dict[str, Dict[str, Any]] = {}
_ticker_cache: Dict[str, Any] = {}
_inflight_raw: Dict[str, threading.Event] = {}
_inflight_quote: Dict[str, threading.Event] = {}
_inflight_history: Dict[str, threading.Event] = {}
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


def _ticker_info(ticker) -> dict:
    return merge_yahoo_info(ticker)


def _ticker_info_for_symbol(symbol: str) -> dict:
    """Load Yahoo info; retry only when Yahoo returned no payload at all."""
    cleaned = clean_symbol(symbol)
    info = merge_yahoo_info(_get_ticker(cleaned))
    if not info:
        _ticker_cache.pop(cleaned, None)
        info = merge_yahoo_info(_get_ticker(cleaned))
    return info


def _exchange_close_time(symbol: str) -> tuple[int, int]:
    if (symbol or "").upper().endswith(".BK"):
        return 16, 30
    return 16, 0


def _is_midnight_bar(dt: datetime) -> bool:
    return dt.hour == 0 and dt.minute == 0 and dt.second == 0


def _apply_session_close(dt: datetime, symbol: str) -> datetime:
    hour, minute = _exchange_close_time(symbol)
    return dt.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _timestamp_to_local_iso(ts: int, tz_name: Optional[str]) -> str:
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    if tz_name:
        try:
            dt = dt.astimezone(ZoneInfo(tz_name))
        except Exception:
            pass
    return dt.isoformat()


def _pick_hist_bar_for_market_time(
    hist: pd.DataFrame,
    symbol: str,
    tz_name: Optional[str],
    market_state: Optional[str],
):
    if hist is None or hist.empty:
        return None
    tz = ZoneInfo(tz_name) if tz_name else timezone.utc
    now_local = datetime.now(timezone.utc).astimezone(tz)
    today = now_local.date()
    skip_today_placeholder = market_state in (None, "PRE", "PREPRE", "CLOSED")

    for idx in reversed(hist.index.tolist()):
        if not hasattr(idx, "to_pydatetime"):
            return idx
        dt = idx.to_pydatetime()
        local = dt.astimezone(tz) if dt.tzinfo else dt.replace(tzinfo=tz)
        if skip_today_placeholder and local.date() >= today and _is_midnight_bar(local):
            continue
        return idx
    return hist.index[-1]


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
        if _is_rate_limit_error(e):
            raise
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
        if _is_rate_limit_error(e):
            raise
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
    except Exception as error:
        if _is_rate_limit_error(error):
            raise
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
    except Exception as error:
        if _is_rate_limit_error(error):
            raise
        return []


def _fetch_raw_data(cleaned: str) -> RawFinancials:
    ticker = _get_ticker(cleaned)
    info = _ticker_info(ticker)
    income_quarters = _income_quarters_from_yf(ticker)

    shares = _safe_float(info.get("sharesOutstanding"))
    if income_quarters and shares and not income_quarters[0].get("diluted_shares_outstanding"):
        income_quarters[0]["diluted_shares_outstanding"] = shares

    return RawFinancials(
        symbol=cleaned,
        name=info.get("shortName") or info.get("longName"),
        currency=info.get("currency"),
        exchange=info.get("exchange") or info.get("fullExchangeName"),
        sector=pick_info_str(info, "sector", "sectorDisp"),
        industry=pick_info_str(info, "industry", "industryDisp"),
        summary=info.get("longBusinessSummary"),
        income_quarters=income_quarters,
        balance_latest=_balance_from_yf(ticker),
        earnings=_earnings_from_yf(ticker, info),
        dividends=_dividends_from_yf(ticker),
    )


def get_raw_financials(symbol: str) -> RawFinancials:
    cleaned = clean_symbol(symbol)

    cached = _cached(raw_cache, cleaned, RAW_CACHE_EXPIRY)
    if cached is not None:
        return cached

    with _inflight_lock:
        if cleaned in _inflight_raw:
            evt = _inflight_raw[cleaned]
            is_owner = False
        else:
            evt = threading.Event()
            _inflight_raw[cleaned] = evt
            is_owner = True

    if not is_owner:
        evt.wait(timeout=YAHOO_TIMEOUT_SECONDS)
        cached = _stale(raw_cache, cleaned)
        if cached is not None:
            return cached
        raise MarketDataTimeoutError("กำลังรอข้อมูลการเงินชุดเดียวกันนานเกินไป")

    try:
        try:
            raw = _provider_call(f"financials:{cleaned}", lambda: _fetch_raw_data(cleaned))
        except MarketDataError:
            stale = _stale(raw_cache, cleaned)
            if stale is not None:
                return stale
            raise
        raw_cache[cleaned] = {"timestamp": time.time(), "data": raw}
        return raw
    finally:
        with _inflight_lock:
            _inflight_raw.pop(cleaned, None)
            evt.set()


def _quote_market_time(
    info: dict,
    hist: pd.DataFrame,
    symbol: str,
) -> tuple[str, Optional[str], Optional[str]]:
    tz_name = info.get("exchangeTimezoneName")
    market_state = info.get("marketState")

    ts = info.get("regularMarketTime") or info.get("postMarketTime")
    if ts:
        return _timestamp_to_local_iso(int(ts), tz_name), market_state, tz_name

    if hist is not None and not hist.empty:
        last = _pick_hist_bar_for_market_time(hist, symbol, tz_name, market_state)
        if hasattr(last, "to_pydatetime"):
            dt = last.to_pydatetime()
            if dt.tzinfo is None and tz_name:
                try:
                    dt = dt.replace(tzinfo=ZoneInfo(tz_name))
                except Exception:
                    pass
            if _is_midnight_bar(dt):
                dt = _apply_session_close(dt, symbol)
            return dt.isoformat(), market_state, tz_name
        return str(last), market_state, tz_name

    return datetime.now(timezone.utc).isoformat(), market_state, tz_name


def _day_stats_from_quote(info: dict, hist: pd.DataFrame, market_state: Optional[str]):
    day_open = _optional_quote_float(info.get("regularMarketOpen") or info.get("open"))
    day_high = _optional_quote_float(info.get("regularMarketDayHigh") or info.get("dayHigh"))
    day_low = _optional_quote_float(info.get("regularMarketDayLow") or info.get("dayLow"))

    if market_state == "REGULAR" and hist is not None and not hist.empty:
        last = hist.iloc[-1]
        if day_open is None:
            day_open = _optional_quote_float(last.get("Open"))
        if day_high is None:
            day_high = _optional_quote_float(last.get("High"))
        if day_low is None:
            day_low = _optional_quote_float(last.get("Low"))
    return day_open, day_high, day_low


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


def _optional_change_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        num = float(value)
        if num != num:
            return None
        return round(num, 2)
    except (TypeError, ValueError):
        return None


def _last_extended_price_from_intraday(ticker, symbol: str, session: str) -> Optional[float]:
    """Fallback when Yahoo omits pre/post fields — uses 1m prepost history (cached 60s)."""
    cleaned = clean_symbol(symbol)
    now = time.time()
    cache_key = f"{cleaned}:{session}"
    if cache_key in extended_cache and now - extended_cache[cache_key]["timestamp"] < QUOTE_CACHE_EXPIRY:
        return extended_cache[cache_key]["data"]

    price = None
    try:
        hist = ticker.history(period="2d", interval="1m", prepost=True)
        if hist is not None and not hist.empty:
            close_hour, _ = _exchange_close_time(cleaned)
            for idx in reversed(hist.index.tolist()):
                if not hasattr(idx, "to_pydatetime"):
                    continue
                dt = idx.to_pydatetime()
                hour = dt.hour + dt.minute / 60
                if session == "post" and hour >= close_hour + 0.01:
                    price = _optional_quote_float(hist.loc[idx, "Close"])
                    break
                if session == "pre" and hour < 9.5:
                    price = _optional_quote_float(hist.loc[idx, "Close"])
                    break
    except Exception:
        pass

    extended_cache[cache_key] = {"timestamp": now, "data": price}
    return price


def _extended_session(
    info: dict,
    market_state: Optional[str],
    reference_close: Optional[float],
    ticker=None,
    symbol: Optional[str] = None,
) -> dict:
    """Extract pre/post-market from Yahoo — fallback to currentPrice in PRE/POST."""
    pre_price = _optional_quote_float(info.get("preMarketPrice"))
    pre_change = _optional_change_float(info.get("preMarketChange"))
    pre_change_pct = _optional_change_float(info.get("preMarketChangePercent"))

    post_price = _optional_quote_float(info.get("postMarketPrice"))
    post_change = _optional_change_float(info.get("postMarketChange"))
    post_change_pct = _optional_change_float(info.get("postMarketChangePercent"))

    current = _optional_quote_float(info.get("currentPrice"))

    if market_state == "PRE" and pre_price is None and current is not None:
        pre_price = current
    if market_state == "POST" and post_price is None and current is not None:
        post_price = current

    if ticker is not None and symbol and post_price is None and market_state in ("POST", "POSTPOST", "PREPRE"):
        post_price = _last_extended_price_from_intraday(ticker, symbol, session="post")
    if ticker is not None and symbol and pre_price is None and market_state == "PRE":
        pre_price = _last_extended_price_from_intraday(ticker, symbol, session="pre")

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


def _fetch_stock_quote(cleaned: str) -> Optional[StockQuote]:
    ticker = _get_ticker(cleaned)
    info = _ticker_info_for_symbol(cleaned)
    hist = ticker.history(
        period="5d",
        timeout=YAHOO_TIMEOUT_SECONDS,
        raise_errors=True,
    )

    if hist.empty:
        return None

    market_time, market_state, exchange_timezone = _quote_market_time(info, hist, cleaned)
    if not market_state:
        market_state = infer_market_state(cleaned, exchange_timezone)
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

    extended = _extended_session(info, market_state, prev_close or price, ticker=ticker, symbol=cleaned)

    day_open, day_high, day_low = _day_stats_from_quote(info, hist, market_state)
    return StockQuote(
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
        day_open=day_open,
        day_high=day_high,
        day_low=day_low,
        **extended,
    )


def get_stock_quote(symbol: str) -> Optional[StockQuote]:
    cleaned = clean_symbol(symbol)
    cached = _cached(quote_cache, cleaned, QUOTE_CACHE_EXPIRY)
    if cached is not None:
        return cached

    event, is_owner = _claim_inflight(_inflight_quote, cleaned)
    if not is_owner:
        event.wait(timeout=YAHOO_TIMEOUT_SECONDS)
        cached = _stale(quote_cache, cleaned)
        if cached is not None:
            return cached
        raise MarketDataTimeoutError("กำลังรอราคาหุ้นชุดเดียวกันนานเกินไป")

    try:
        try:
            quote = _provider_call(f"quote:{cleaned}", lambda: _fetch_stock_quote(cleaned))
            if quote is not None:
                quote_cache[cleaned] = {"timestamp": time.time(), "data": quote}
            return quote
        except MarketDataError as error:
            stale = _stale(quote_cache, cleaned)
            if stale is not None:
                print(f"yfinance quote stale fallback for {cleaned}: {error}")
                return stale
            print(f"yfinance quote error for {cleaned}: {error}")
            raise
    finally:
        _release_inflight(_inflight_quote, cleaned, event)


def get_stock_quotes(symbols: List[str]) -> tuple[Dict[str, StockQuote], Dict[str, str]]:
    cleaned = list(dict.fromkeys(clean_symbol(symbol) for symbol in symbols if symbol.strip()))
    quotes: Dict[str, StockQuote] = {}
    errors: Dict[str, str] = {}
    futures = {_batch_pool.submit(get_stock_quote, symbol): symbol for symbol in cleaned}
    for future in as_completed(futures):
        symbol = futures[future]
        try:
            quote = future.result()
            if quote is not None:
                quotes[symbol] = quote
            else:
                errors[symbol] = "ไม่พบข้อมูลหุ้น"
        except MarketDataError as error:
            errors[symbol] = str(error)
    return quotes, errors


def get_stock_info(symbol: str, price: Optional[float] = None, history_df=None) -> Optional[StockInfo]:
    cleaned = clean_symbol(symbol)
    raw = get_raw_financials(cleaned)

    if price is None:
        quote = get_stock_quote(cleaned)
        price = quote.price if quote else None
    if price is None:
        return None

    metrics = compute_fundamentals(price, raw, history_df)
    try:
        info = _provider_call(
            f"info:{cleaned}",
            lambda: _ticker_info_for_symbol(cleaned),
        )
    except MarketDataError:
        if not any((raw.name, raw.summary, raw.sector, raw.industry)):
            raise
        info = {}

    dividends = raw.dividends or []
    annual_dividend = round(sum(d["amount"] for d in dividends[:4]), 4) if dividends else None

    return StockInfo(
            symbol=cleaned,
        name=raw.name or info.get("shortName") or info.get("longName"),
        summary=raw.summary or info.get("longBusinessSummary"),
        industry=raw.industry or pick_info_str(info, "industry", "industryDisp"),
        sector=raw.sector or pick_info_str(info, "sector", "sectorDisp"),
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


def resolve_symbol_profile(symbol: str) -> tuple[Optional[str], Optional[str]]:
    """Return (name, sector) with ticker.info fallback when raw financials are sparse."""
    cleaned = clean_symbol(symbol)
    raw = get_raw_financials(cleaned)
    name = raw.name
    sector = raw.sector
    if name and sector:
        return name, sector
    try:
        info = _provider_call(
            f"profile:{cleaned}",
            lambda: _ticker_info(_get_ticker(cleaned)),
        )
        if not name:
            name = pick_info_str(info, "shortName", "longName")
        if not sector:
            sector = pick_info_str(info, "sector", "sectorDisp")
    except Exception:
        pass
    return name, sector


def get_fundamental_metrics(symbol: str, price: float, history_df=None) -> dict:
    raw = get_raw_financials(symbol)
    return compute_fundamentals(price, raw, history_df)


def get_provider_history(symbol: str, **kwargs):
    """Timed Yahoo history helper for specialized chart builders."""
    cleaned = clean_symbol(symbol)
    params = dict(kwargs)
    params.setdefault("timeout", YAHOO_TIMEOUT_SECONDS)
    params.setdefault("raise_errors", True)
    return _provider_call(
        f"history-special:{cleaned}",
        lambda: _get_ticker(cleaned).history(**params),
    )


def _event_date(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (list, tuple)):
        value = value[0] if value else None
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).date().isoformat()
    try:
        return pd.Timestamp(value).date().isoformat()
    except Exception:
        return None


def get_corporate_events(symbol: str) -> List[dict]:
    """Upcoming earnings/dividend dates, cached separately because they change slowly."""
    cleaned = clean_symbol(symbol)
    cached = _cached(event_cache, cleaned, EVENT_CACHE_EXPIRY)
    if cached is not None:
        return cached

    def fetch() -> List[dict]:
        ticker = _get_ticker(cleaned)
        calendar = ticker.calendar
        info = _ticker_info_for_symbol(cleaned)
        events: List[dict] = []

        if isinstance(calendar, dict):
            earnings_date = _event_date(calendar.get("Earnings Date"))
            if earnings_date:
                events.append({"symbol": cleaned, "type": "earnings", "date": earnings_date})
            dividend_date = _event_date(
                calendar.get("Ex-Dividend Date") or calendar.get("Dividend Date")
            )
            if dividend_date:
                events.append({"symbol": cleaned, "type": "dividend", "date": dividend_date})

        ex_dividend = _event_date(info.get("exDividendDate"))
        if ex_dividend and not any(
            event["type"] == "dividend" and event["date"] == ex_dividend for event in events
        ):
            events.append({"symbol": cleaned, "type": "dividend", "date": ex_dividend})
        return events

    try:
        events = _provider_call(f"events:{cleaned}", fetch)
        event_cache[cleaned] = {"timestamp": time.time(), "data": events}
        return events
    except MarketDataError:
        stale = _cached(event_cache, cleaned, 86_400)
        if stale is not None:
            return stale
        return []


def _format_history_time(idx, interval: str, tz_name: Optional[str] = None) -> str:
    """Daily bars use YYYY-MM-DD (exchange calendar date). Intraday uses ISO with timezone."""
    if interval in ("1d", "1wk", "1mo"):
        if hasattr(idx, "to_pydatetime"):
            dt = idx.to_pydatetime()
            if tz_name:
                try:
                    tz = ZoneInfo(tz_name)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=tz)
                    else:
                        dt = dt.astimezone(tz)
                except Exception:
                    pass
            elif hasattr(idx, "strftime"):
                return idx.strftime("%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
        if hasattr(idx, "strftime"):
            return idx.strftime("%Y-%m-%d")
        return str(idx)[:10]

    if hasattr(idx, "to_pydatetime"):
        dt = idx.to_pydatetime()
        if tz_name and dt.tzinfo is not None:
            try:
                dt = dt.astimezone(ZoneInfo(tz_name))
            except Exception:
                pass
        if hasattr(dt, "isoformat"):
            return dt.isoformat()
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
    cached = _cached(history_cache, cache_key, HISTORY_CACHE_EXPIRY)
    if cached is not None:
        return cached

    event, is_owner = _claim_inflight(_inflight_history, cache_key)
    if not is_owner:
        event.wait(timeout=YAHOO_TIMEOUT_SECONDS)
        cached = _stale(history_cache, cache_key)
        if cached is not None:
            return cached
        raise MarketDataTimeoutError("กำลังรอประวัติราคาชุดเดียวกันนานเกินไป")

    try:
        try:
            def fetch():
                ticker = _get_ticker(cleaned)
                info = _ticker_info(ticker)
                return info.get("exchangeTimezoneName"), ticker.history(
                    period=yf_period,
                    interval=yf_interval,
                    timeout=YAHOO_TIMEOUT_SECONDS,
                    raise_errors=True,
                )

            tz_name, df = _provider_call(f"history:{cache_key}", fetch)
            if df.empty:
                return []

            history = []
            for idx, row in df.iterrows():
                history.append(StockHistoryItem(
                    time=_format_history_time(idx, yf_interval, tz_name),
                    open=round(float(row["Open"]), 2),
                    high=round(float(row["High"]), 2),
                    low=round(float(row["Low"]), 2),
                    close=round(float(row["Close"]), 2),
                    volume=int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                ))

            history_cache[cache_key] = {"timestamp": time.time(), "data": history}
            return history
        except MarketDataError as error:
            stale = _stale(history_cache, cache_key)
            if stale is not None:
                print(f"yfinance history stale fallback for {cleaned}: {error}")
                return stale
            print(f"yfinance history error for {cleaned}: {error}")
            raise
    finally:
        _release_inflight(_inflight_history, cache_key, event)


def search_symbols(query: str, limit: int = 10) -> List[dict]:
    try:
        results = _provider_call(
            f"search:{query}",
            lambda: yf.Search(query, max_results=limit, timeout=YAHOO_TIMEOUT_SECONDS),
        )
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
    except MarketDataError as error:
        print(f"yfinance search error: {error}")
        raise
