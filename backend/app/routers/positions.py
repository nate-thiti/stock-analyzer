from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Position
from ..auth import get_current_user
from ..auth_schemas import PositionOut, PositionCreate, PositionUpdate, PositionWithQuote

router = APIRouter(prefix="/api/positions", tags=["positions"])


def _clean_symbol(symbol: str) -> str:
    return symbol.strip().upper()


@router.get("", response_model=List[PositionWithQuote])
def list_positions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    positions = db.query(Position).filter(Position.user_id == user.id).order_by(Position.symbol).all()
    # Keep persisted portfolio data independent from the market-data provider.
    # Quotes are loaded by the frontend through the batch endpoint, so a Yahoo
    # timeout/rate limit cannot make a user's saved positions disappear.
    return [
        PositionWithQuote(
            id=p.id,
            symbol=p.symbol,
            shares=p.shares,
            avg_cost=p.avg_cost,
            created_at=p.created_at,
            updated_at=p.updated_at,
            current_price=None,
            currency=None,
            name=p.symbol,
            sector=None,
            market_value=None,
            cost_basis=round(p.shares * p.avg_cost, 2),
            unrealized_pnl=None,
            unrealized_pnl_pct=None,
        )
        for p in positions
    ]


@router.post("", response_model=PositionOut, status_code=201)
def create_position(
    body: PositionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = _clean_symbol(body.symbol)
    existing = db.query(Position).filter(Position.user_id == user.id, Position.symbol == symbol).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"มีหุ้น {symbol} ในพอร์ตแล้ว — ใช้แก้ไขแทน")

    pos = Position(user_id=user.id, symbol=symbol, shares=body.shares, avg_cost=body.avg_cost)
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos


@router.put("/{position_id}", response_model=PositionOut)
def update_position(
    position_id: int,
    body: PositionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(Position.id == position_id, Position.user_id == user.id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")

    if body.shares is not None:
        pos.shares = body.shares
    if body.avg_cost is not None:
        pos.avg_cost = body.avg_cost
    db.commit()
    db.refresh(pos)
    return pos


@router.delete("/{position_id}", status_code=204)
def delete_position(
    position_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(Position.id == position_id, Position.user_id == user.id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    db.delete(pos)
    db.commit()
