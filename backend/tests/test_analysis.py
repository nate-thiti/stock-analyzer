import pandas as pd
import pytest

from app.analysis import calculate_support_resistance, calculate_rsi


def _make_df(closes, lows=None, highs=None):
    n = len(closes)
    lows = lows or [c - 1 for c in closes]
    highs = highs or [c + 1 for c in closes]
    return pd.DataFrame({
        'Open': closes,
        'High': highs,
        'Low': lows,
        'Close': closes,
        'Volume': [1000] * n,
    })


def test_support_resistance_returns_levels():
    closes = [10, 11, 12, 11, 10, 9, 10, 11, 12, 13, 14, 15, 14, 13, 12, 11, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    df = _make_df(closes)
    support, resistance = calculate_support_resistance(df, window=5)
    assert len(support) >= 1
    assert len(resistance) >= 1
    assert all(s < closes[-1] for s in support)
    assert all(r > closes[-1] for r in resistance)


def test_rsi_range():
    closes = list(range(100, 130))
    rsi = calculate_rsi(pd.Series(closes), 14)
    last = rsi.dropna().iloc[-1]
    assert 0 <= last <= 100


def test_recommendation_buy_threshold():
    from app.risk import generate_recommendation
    from app.schemas import FundamentalAnalysis, TechnicalAnalysis, TrendAnalysis
    from datetime import datetime

    fund = FundamentalAnalysis(symbol='TEST', analysis_date=datetime.now().isoformat(), valuation_grade='fair')
    tech = TechnicalAnalysis(
        symbol='TEST', ma_5=[], ma_10=[], ma_20=[], ma_50=[], ma_200=[],
        rsi=[55], rsi_signal='neutral', macd=[1], macd_signal=[0], macd_histogram=[1],
        bollinger_upper=[], bollinger_middle=[], bollinger_lower=[],
        support_levels=[90], resistance_levels=[110], timestamps=[],
    )
    trend = TrendAnalysis(
        symbol='TEST', trend_direction='uptrend', trend_strength='strong',
        volume_trend='stable', key_levels={}, analysis_date=datetime.now().isoformat(),
    )
    rec = generate_recommendation(fund, tech, trend, 100.0)
    assert rec['action'] in ('buy', 'hold', 'sell')
    assert 0 <= rec['confidence'] <= 1
