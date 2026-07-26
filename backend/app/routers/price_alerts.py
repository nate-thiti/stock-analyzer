from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, PriceAlert
from ..auth import get_current_user
from ..auth_schemas import PriceAlertOut, PriceAlertCreate
from ..services import get_stock_quote

router = APIRouter(prefix="/api/price-alerts", tags=["price-alerts"])


def _clean_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def _is_triggered(current: float | None, target: float, direction: str) -> bool:
    if current is None:
        return False
    if direction == "above":
        return current >= target
    return current <= target


def _alert_out(alert: PriceAlert, current: float | None) -> PriceAlertOut:
    triggered = _is_triggered(current, alert.target_price, alert.direction)
    return PriceAlertOut(
        id=alert.id,
        symbol=alert.symbol,
        target_price=alert.target_price,
        direction=alert.direction,
        triggered_at=alert.triggered_at,
        created_at=alert.created_at,
        current_price=current,
        triggered=triggered or alert.triggered_at is not None,
    )


@router.get("", response_model=List[PriceAlertOut])
def list_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == user.id)
        .order_by(PriceAlert.symbol, PriceAlert.created_at.desc())
        .all()
    )
    result = []
    now = datetime.now(timezone.utc)
    dirty = False
    for alert in alerts:
        quote = get_stock_quote(alert.symbol)
        current = quote.price if quote else None
        if _is_triggered(current, alert.target_price, alert.direction) and alert.triggered_at is None:
            alert.triggered_at = now
            dirty = True
        result.append(_alert_out(alert, current))
    if dirty:
        db.commit()
    return result


@router.post("", response_model=PriceAlertOut, status_code=201)
def create_alert(
    body: PriceAlertCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = _clean_symbol(body.symbol)
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"ไม่พบหุ้น '{symbol}'")

    existing = (
        db.query(PriceAlert)
        .filter(
            PriceAlert.user_id == user.id,
            PriceAlert.symbol == symbol,
            PriceAlert.direction == body.direction,
            PriceAlert.target_price == body.target_price,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="มี alert นี้อยู่แล้ว")

    alert = PriceAlert(
        user_id=user.id,
        symbol=symbol,
        target_price=body.target_price,
        direction=body.direction,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _alert_out(alert, quote.price)


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id, PriceAlert.user_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="ไม่พบ alert")
    db.delete(alert)
    db.commit()
