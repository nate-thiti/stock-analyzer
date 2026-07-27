import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from .database import Base, engine, SessionLocal, DATABASE_URL
from .models import User, WatchlistItem
from .auth import hash_password

DEFAULT_WATCHLIST = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "AMD", "INTC",
    "PTT.BK", "CPALL.BK", "AOT.BK", "KBANK.BK",
    "0700.HK", "BABA",
]


def init_db():
    if DATABASE_URL.startswith("sqlite"):
        path = DATABASE_URL.replace("sqlite:///", "")
        dirpath = os.path.dirname(path)
        if dirpath:
            os.makedirs(dirpath, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _migrate_user_risk_columns()
        _seed_superadmin(db)
        _seed_watchlist(db)
    finally:
        db.close()
    _warn_insecure_defaults()
    _enforce_production_security()


def _enforce_production_security():
    """หยุด startup ถ้า APP_ENV=production แต่ config ไม่ปลอดภัย"""
    if os.getenv("APP_ENV", "").lower() != "production":
        return

    errors = []
    jwt = os.getenv("JWT_SECRET", "")
    if not jwt or jwt in ("change-me-in-production", "dev-secret") or len(jwt) < 32:
        errors.append("JWT_SECRET ต้องเป็นค่าสุ่มอย่างน้อย 32 ตัวอักษร")

    if os.getenv("SUPERADMIN_PASSWORD", "admin1234") == "admin1234":
        errors.append("SUPERADMIN_PASSWORD ยังเป็น default (admin1234)")

    cors = os.getenv("CORS_ORIGINS", "*").strip()
    if cors == "*" or not cors:
        errors.append("CORS_ORIGINS ต้องระบุโดเมนจริง (ห้าม *)")

    if errors:
        print("❌ Production security check failed:", file=sys.stderr)
        for e in errors:
            print(f"   • {e}", file=sys.stderr)
        print("   รัน: bash scripts/setup-production.sh", file=sys.stderr)
        raise SystemExit(1)

    print("✓ Production security checks passed")


def _warn_insecure_defaults():
    jwt = os.getenv("JWT_SECRET", "change-me-in-production")
    pwd = os.getenv("SUPERADMIN_PASSWORD", "admin1234")
    if jwt in ("change-me-in-production", "dev-secret", ""):
        print("⚠️  WARNING: JWT_SECRET is using default value — change before production!")
    if pwd == "admin1234":
        print("⚠️  WARNING: SUPERADMIN_PASSWORD is default — change before production!")


def _migrate_user_risk_columns():
    """Add risk profile columns to existing deployments (create_all won't alter tables)."""
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("users")}
    additions = [
        ("max_loss_tolerance_pct", "FLOAT", None),
        ("max_position_pct", "FLOAT", "10.0"),
        ("account_size", "FLOAT", "100000.0"),
        ("risk_per_trade_pct", "FLOAT", "2.0"),
    ]
    with engine.begin() as conn:
        for name, col_type, default in additions:
            if name in existing:
                continue
            if DATABASE_URL.startswith("sqlite"):
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {col_type}"))
            else:
                default_sql = f" DEFAULT {default}" if default is not None else ""
                conn.execute(text(
                    f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {name} {col_type}{default_sql}"
                ))


def _seed_superadmin(db: Session):
    existing = db.query(User).filter(User.role == "superadmin").first()
    default_email = os.getenv("SUPERADMIN_EMAIL", "admin@example.com").lower()

    if existing:
        if existing.email.endswith(".local"):
            existing.email = default_email
            db.commit()
        return

    username = os.getenv("SUPERADMIN_USERNAME", "admin")
    password = os.getenv("SUPERADMIN_PASSWORD", "admin1234")

    db.add(User(
        username=username,
        email=default_email,
        password_hash=hash_password(password),
        role="superadmin",
    ))
    db.commit()
    print(f"Created superadmin: {default_email}")


def _seed_watchlist(db: Session):
    if db.query(WatchlistItem).count() > 0:
        return
    for idx, sym in enumerate(DEFAULT_WATCHLIST):
        db.add(WatchlistItem(symbol=sym, sort_order=idx))
    db.commit()
    print(f"Seeded watchlist with {len(DEFAULT_WATCHLIST)} symbols")
