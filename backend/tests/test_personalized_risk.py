import pytest

from app.personalized_risk import (
    build_personalized_risk,
    classify_signal_tier,
    personalized_action,
)


def test_classify_signal_tiers():
    assert classify_signal_tier(0.65) == "strong_buy"
    assert classify_signal_tier(0.35) == "lean_buy"
    assert classify_signal_tier(0.0) == "hold"
    assert classify_signal_tier(-0.25) == "lean_sell"
    assert classify_signal_tier(-0.5) == "strong_sell"


def test_personalized_action_profit_hold():
    action = personalized_action(
        analysis_score=0.0,
        analysis_action="hold",
        pnl_pct=0.9,
        max_loss_tolerance_pct=40.0,
        technical_stop_breached=False,
        position_pct=5.0,
        max_position_pct=10.0,
        has_position=True,
    )
    assert action == "HOLD"


def test_personalized_action_near_loss_limit():
    action = personalized_action(
        analysis_score=0.0,
        analysis_action="hold",
        pnl_pct=-35.0,
        max_loss_tolerance_pct=40.0,
        technical_stop_breached=False,
        position_pct=8.0,
        max_position_pct=10.0,
        has_position=True,
    )
    assert action == "HOLD_WITH_TIGHT_RISK_CONTROL"


def test_personalized_action_exceeded_loss():
    action = personalized_action(
        analysis_score=0.5,
        analysis_action="buy",
        pnl_pct=-45.0,
        max_loss_tolerance_pct=40.0,
        technical_stop_breached=False,
        position_pct=5.0,
        max_position_pct=10.0,
        has_position=True,
    )
    assert action == "REDUCE_OR_SELL"


def test_personalized_action_position_cap():
    action = personalized_action(
        analysis_score=0.7,
        analysis_action="buy",
        pnl_pct=5.0,
        max_loss_tolerance_pct=40.0,
        technical_stop_breached=False,
        position_pct=35.0,
        max_position_pct=10.0,
        has_position=True,
    )
    assert action == "HOLD_DO_NOT_ADD"


def test_build_personalized_risk_effective_stop():
    result = build_personalized_risk(
        analysis_score=0.0,
        analysis_action="hold",
        current_price=206.84,
        stop_loss=195.35,
        max_loss_tolerance_pct=40.0,
        max_position_pct=10.0,
        avg_cost=204.98,
        pnl_pct=0.9,
        position_pct=5.0,
        currency="USD",
    )
    assert result.personal_risk_floor == pytest.approx(122.99, abs=0.01)
    assert result.effective_stop == pytest.approx(195.35, abs=0.01)
    assert result.risk_usage_pct == 0.0
