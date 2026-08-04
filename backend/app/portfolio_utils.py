"""Portfolio totals from user-recorded positions."""
from __future__ import annotations

from sqlalchemy.orm import Session

from .models import Position
from .services import get_stock_quotes


def compute_portfolio_total(db: Session, user_id: int) -> float:
    positions = db.query(Position).filter(Position.user_id == user_id).all()
    quotes, _errors = get_stock_quotes([position.symbol for position in positions])
    total = 0.0
    for p in positions:
        quote = quotes.get(p.symbol)
        if quote and quote.price:
            total += p.shares * quote.price
    return round(total, 2)


def resolve_account_size(db: Session, user_id: int, fallback: float = 100_000.0) -> float:
    total = compute_portfolio_total(db, user_id)
    if total > 0:
        return total
    return fallback
