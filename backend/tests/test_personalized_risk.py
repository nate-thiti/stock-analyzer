import pytest
from types import SimpleNamespace

from app.personalized_risk import (
    build_personalized_risk,
    classify_signal_tier,
    personalized_action,
)
from app.main import _build_holding_context, _comparison_rank
from app.schemas import AnalysisResponse, PersonalizedRiskOut, TradingPlan


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


def _comparison_result(symbol: str, action: str, score: float = 0.7) -> AnalysisResponse:
    return AnalysisResponse(
        symbol=symbol,
        recommendation="buy",
        confidence=0.8,
        trading_plan=TradingPlan(action="buy", confidence=0.8, score=score),
        personalized_risk=PersonalizedRiskOut(
            action=action,
            action_label=action,
            summary="test",
            max_loss_tolerance_pct=20,
        ),
    )


def test_comparison_rank_prioritizes_personal_risk_over_raw_buy_signal():
    suitable = _comparison_result("NEW", "CONSIDER_BUY_NEW", score=0.6)
    over_limit = _comparison_result("HELD", "REDUCE_OR_SELL", score=0.9)

    assert _comparison_rank(suitable) > _comparison_rank(over_limit)


def test_holding_context_uses_real_position_cost_and_portfolio_weight():
    position = SimpleNamespace(shares=10, avg_cost=80)
    holding = _build_holding_context(position, current_price=100, account_size=2_000)

    assert holding.cost_basis == 800
    assert holding.market_value == 1_000
    assert holding.unrealized_pnl == 200
    assert holding.unrealized_pnl_pct == 25
    assert holding.position_pct == 50
