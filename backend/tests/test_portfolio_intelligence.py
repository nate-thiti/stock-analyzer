import pandas as pd

from app.routers.portfolio_intelligence import (
    _benchmark_payload,
    _correlation_payload,
    _health_payload,
    _rebalance_payload,
)


def _snapshots():
    return [
        {
            "symbol": "AAPL", "sector": "Technology", "market_value": 700,
            "pnl_pct": 10, "price": 100, "currency": "USD",
        },
        {
            "symbol": "JPM", "sector": "Financials", "market_value": 300,
            "pnl_pct": -5, "price": 50, "currency": "USD",
        },
    ]


def test_health_score_flags_concentration():
    health = _health_payload(
        _snapshots(),
        {"average": 0.4, "high_pairs": []},
        max_loss_pct=20,
    )
    assert 0 <= health["score"] <= 100
    assert any("AAPL" in risk for risk in health["risks"])


def test_rebalance_respects_personal_position_cap_and_keeps_cash():
    plan = _rebalance_payload(_snapshots(), max_position_pct=40)
    assert all(item["target_pct"] == 40 for item in plan["items"])
    assert plan["target_cash_pct"] == 20
    assert next(item for item in plan["items"] if item["symbol"] == "AAPL")["action"] == "reduce"


def test_correlation_finds_highly_similar_pair():
    dates = pd.date_range("2026-01-01", periods=6)
    histories = {
        "AAA": pd.Series([10, 11, 12, 13, 14, 15], index=dates, name="AAA"),
        "BBB": pd.Series([20, 22, 24, 26, 28, 30], index=dates, name="BBB"),
    }
    payload = _correlation_payload(["AAA", "BBB"], histories)
    assert payload["matrix"][0][1] == 1
    assert payload["high_pairs"][0]["correlation"] == 1


def test_benchmark_estimates_weighted_portfolio_return():
    dates = pd.date_range("2026-01-01", periods=3)
    snapshots = [
        {
            "symbol": "AAA", "sector": "Tech", "market_value": 500,
            "pnl_pct": 0, "price": 12, "currency": "USD",
        },
        {
            "symbol": "BBB", "sector": "Bank", "market_value": 500,
            "pnl_pct": 0, "price": 18, "currency": "USD",
        },
    ]
    histories = {
        "AAA": pd.Series([10, 11, 12], index=dates, name="AAA"),
        "BBB": pd.Series([20, 19, 18], index=dates, name="BBB"),
        "^GSPC": pd.Series([100, 102, 104], index=dates, name="^GSPC"),
    }
    payload = _benchmark_payload(snapshots, histories, "6mo")
    assert "portfolio" in payload["summary"]
    assert payload["summary"]["sp500"] == 4
    assert len(payload["points"]) == 3
