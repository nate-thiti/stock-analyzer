from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, Favorite
from ..auth import get_current_user
from ..auth_schemas import FavoriteOut, FavoriteCreate

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=List[FavoriteOut])
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )


@router.post("", response_model=FavoriteOut, status_code=201)
def add_favorite(
    body: FavoriteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = body.symbol.strip().upper()
    existing = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.symbol == symbol).first()
    if existing:
        return existing

    fav = Favorite(user_id=user.id, symbol=symbol)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/{symbol}", status_code=204)
def remove_favorite(
    symbol: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.symbol == symbol.upper())
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="ไม่พบในรายการติดดาว")
    db.delete(fav)
    db.commit()
