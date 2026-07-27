from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..auth import get_current_user
from ..auth_schemas import RiskProfileOut, RiskProfileUpdate
from ..portfolio_utils import compute_portfolio_total, resolve_account_size

router = APIRouter(prefix="/api/me", tags=["me"])

_DEFAULT_ACCOUNT = 100_000.0


def _profile_out(user: User, db: Session) -> RiskProfileOut:
    portfolio_value = compute_portfolio_total(db, user.id)
    effective = resolve_account_size(db, user.id, _DEFAULT_ACCOUNT)
    return RiskProfileOut(
        max_loss_tolerance_pct=user.max_loss_tolerance_pct,
        max_position_pct=user.max_position_pct or 10.0,
        risk_per_trade_pct=user.risk_per_trade_pct or 2.0,
        configured=user.max_loss_tolerance_pct is not None,
        portfolio_value=portfolio_value,
        effective_account_size=effective,
        portfolio_from_positions=portfolio_value > 0,
    )


@router.get("/risk-profile", response_model=RiskProfileOut)
def get_risk_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _profile_out(user, db)


@router.patch("/risk-profile", response_model=RiskProfileOut)
def update_risk_profile(
    body: RiskProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.max_loss_tolerance_pct = round(body.max_loss_tolerance_pct, 1)
    if body.max_position_pct is not None:
        user.max_position_pct = round(body.max_position_pct, 1)
    if body.risk_per_trade_pct is not None:
        user.risk_per_trade_pct = round(body.risk_per_trade_pct, 2)
    db.commit()
    db.refresh(user)
    return _profile_out(user, db)
