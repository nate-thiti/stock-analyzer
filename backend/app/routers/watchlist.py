from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, WatchlistItem
from ..auth import get_current_user, require_superadmin
from ..auth_schemas import WatchlistOut, WatchlistUpdate

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


def _clean_symbols(symbols: list[str]) -> list[str]:
    seen = set()
    result = []
    for s in symbols:
        sym = s.strip().upper()
        if sym and sym not in seen:
            seen.add(sym)
            result.append(sym)
    return result


@router.get("", response_model=WatchlistOut)
def get_watchlist(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WatchlistItem).order_by(WatchlistItem.sort_order, WatchlistItem.symbol).all()
    return WatchlistOut(symbols=[i.symbol for i in items])


@router.put("", response_model=WatchlistOut)
def set_watchlist(
    body: WatchlistUpdate,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    symbols = _clean_symbols(body.symbols)
    if not symbols:
        raise HTTPException(status_code=400, detail="ต้องมีอย่างน้อย 1 สัญลักษณ์")

    db.query(WatchlistItem).delete()
    for idx, sym in enumerate(symbols):
        db.add(WatchlistItem(symbol=sym, sort_order=idx))
    db.commit()

    items = db.query(WatchlistItem).order_by(WatchlistItem.sort_order).all()
    return WatchlistOut(symbols=[i.symbol for i in items])
