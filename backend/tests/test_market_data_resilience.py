import asyncio
import time

import pandas as pd

from app import services
from app.main import market_data_error_handler
from app.schemas import StockQuote
from app.schemas import SignalItem


def _quote(symbol: str = "AAPL") -> StockQuote:
    return StockQuote(
        symbol=symbol,
        price=100,
        change=1,
        change_percent=1,
        currency="USD",
        exchange="NMS",
        market_time="2026-07-29T10:00:00+00:00",
    )


def test_quote_uses_stale_cache_when_provider_is_rate_limited(monkeypatch):
    services.quote_cache.clear()
    services.quote_cache["AAPL"] = {
        "timestamp": time.time() - services.QUOTE_CACHE_EXPIRY - 1,
        "data": _quote(),
    }

    def rate_limited(*_args, **_kwargs):
        raise services.MarketDataRateLimitError("rate limited")

    monkeypatch.setattr(services, "_provider_call", rate_limited)
    assert services.get_stock_quote("AAPL").price == 100


def test_batch_quotes_use_one_provider_call_and_share_five_minute_cache(monkeypatch):
    services.quote_cache.clear()
    index = pd.to_datetime(["2026-08-03", "2026-08-04"])
    columns = pd.MultiIndex.from_product([
        ["AAPL", "MSFT"], ["Open", "High", "Low", "Close", "Volume"],
    ])
    frame = pd.DataFrame(index=index, columns=columns, dtype=float)
    frame.loc[index[0], "AAPL"] = [99, 102, 98, 100, 1_000]
    frame.loc[index[1], "AAPL"] = [100, 104, 99, 103, 1_200]
    frame.loc[index[0], "MSFT"] = [198, 202, 197, 200, 900]
    frame.loc[index[1], "MSFT"] = [200, 203, 199, 202, 950]
    calls = []

    def provider(label, _operation):
        calls.append(label)
        return frame

    monkeypatch.setattr(services, "_provider_call", provider)

    first, errors = services.get_stock_quotes(["AAPL", "MSFT"])
    second, second_errors = services.get_stock_quotes(["MSFT", "AAPL"])

    assert errors == second_errors == {}
    assert first["AAPL"].price == second["AAPL"].price == 103
    assert first["MSFT"].change_percent == 1.0
    assert len(calls) == 1


def test_quote_rate_limit_is_http_429():
    response = asyncio.run(
        market_data_error_handler(None, services.MarketDataRateLimitError("ลองใหม่ภายหลัง"))
    )
    assert response.status_code == 429
    assert response.headers["retry-after"] == "300"


def test_quote_timeout_is_http_503():
    response = asyncio.run(
        market_data_error_handler(None, services.MarketDataTimeoutError("ใช้เวลาตอบนานเกินไป"))
    )
    assert response.status_code == 503
    assert response.headers["retry-after"] == "30"


def test_company_info_falls_back_to_quote_when_financials_are_limited(monkeypatch):
    monkeypatch.setattr(
        services,
        "get_raw_financials",
        lambda _symbol: (_ for _ in ()).throw(
            services.MarketDataRateLimitError("rate limited")
        ),
    )
    monkeypatch.setattr(services, "get_stock_quote", lambda _symbol: _quote())

    info = services.get_stock_info("AAPL")

    assert info.symbol == "AAPL"
    assert info.name == "AAPL"
    assert info.currency == "USD"


def test_market_signals_first_request_only_schedules_background_refresh(monkeypatch):
    from app import market_signals
    scheduled = []
    market_signals._cache.clear()
    market_signals._refreshing.clear()
    monkeypatch.setattr(
        market_signals,
        "_schedule_refresh",
        lambda key, watchlist, scope, context: scheduled.append((key, watchlist, scope, context)) or True,
    )
    monkeypatch.setattr(
        market_signals,
        "resolve_watchlist",
        lambda _db, _user_id, _scope: (["AAPL", "MSFT"], "global"),
    )
    monkeypatch.setattr(
        market_signals,
        "_load_signal_context",
        lambda _db, _user_id: {
            "positions": {"NVDA": {"shares": 2, "avg_cost": 100}},
            "max_loss_tolerance_pct": 20,
            "max_position_pct": 10,
        },
    )

    result = market_signals.get_market_signals(None, scope="global")

    assert result.refreshing is True
    assert result.portfolio_scanned == 1
    assert result.candidates_scanned == 2
    assert result.updated_at == ""
    assert len(scheduled) == 1


def test_market_signals_merge_portfolio_risk_and_new_buy_candidates():
    from app.market_signals import _apply_personal_context

    held = SignalItem(
        symbol="HELD", current_price=70, recommendation="buy",
        confidence=0.8, score=0.7,
    )
    candidate = SignalItem(
        symbol="NEW", current_price=100, recommendation="buy",
        confidence=0.8, score=0.7,
    )
    _apply_personal_context(
        [held, candidate],
        {
            "positions": {"HELD": {"shares": 10, "avg_cost": 100}},
            "max_loss_tolerance_pct": 20,
            "max_position_pct": 60,
        },
    )

    assert held.has_position is True
    assert held.signal_tier == "strong_sell"
    assert held.personalized_action == "REDUCE_OR_SELL"
    assert candidate.has_position is False
    assert candidate.signal_tier == "strong_buy"
    assert candidate.personalized_action == "CONSIDER_BUY_NEW"
