from app.market_signals import resolve_watchlist
from app.models import Favorite, User
from app.database import SessionLocal


def test_resolve_global_watchlist():
    db = SessionLocal()
    try:
        syms, scope = resolve_watchlist(db, user_id=999, scope="global")
        assert scope == "global"
        assert len(syms) >= 1
    finally:
        db.close()


def test_resolve_personal_from_favorites():
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email="user@test.com").first()
        if not user:
            return
        db.add(Favorite(user_id=user.id, symbol="TEST.BK"))
        db.commit()

        syms, scope = resolve_watchlist(db, user_id=user.id, scope="personal")
        assert scope == "personal"
        assert "TEST.BK" in syms
    finally:
        db.rollback()
        db.close()


def test_resolve_personal_fallback_to_global():
    db = SessionLocal()
    try:
        syms, scope = resolve_watchlist(db, user_id=99999, scope="personal")
        assert scope == "global"
        assert len(syms) >= 1
    finally:
        db.close()
