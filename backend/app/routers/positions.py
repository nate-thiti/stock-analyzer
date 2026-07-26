from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Position
from ..auth import get_current_user
from ..auth_schemas import PositionOut, PositionCreate, PositionUpdate, PositionWithQuote
from ..services import get_stock_quote, get_raw_financials

router = APIRouter(prefix="/api/positions", tags=["positions"])


def _clean_symbol(symbol: str) -> str:
    return symbol.strip().upper()


@router.get("", response_model=List[PositionWithQuote])
def list_positions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    positions = db.query(Position).filter(Position.user_id == user.id).order_by(Position.symbol).all()
    result = []
    for p in positions:
        quote = get_stock_quote(p.symbol)
        raw = get_raw_financials(p.symbol)
        current = quote.price if quote else None
        cost_basis = p.shares * p.avg_cost
        market_value = p.shares * current if current else None
        pnl = market_value - cost_basis if market_value is not None else None
        pnl_pct = (pnl / cost_basis * 100) if pnl is not None and cost_basis else None
        result.append(PositionWithQuote(
            id=p.id,
            symbol=p.symbol,
            shares=p.shares,
            avg_cost=p.avg_cost,
            created_at=p.created_at,
            updated_at=p.updated_at,
            current_price=current,
            currency=quote.currency if quote else "USD",
            name=raw.name,
            sector=raw.sector,
            market_value=round(market_value, 2) if market_value is not None else None,
            cost_basis=round(cost_basis, 2),
            unrealized_pnl=round(pnl, 2) if pnl is not None else None,
            unrealized_pnl_pct=round(pnl_pct, 2) if pnl_pct is not None else None,
        ))
    return result


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
