from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=64)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)


class FavoriteOut(BaseModel):
    id: int
    symbol: str
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)


class PositionOut(BaseModel):
    id: int
    symbol: str
    shares: float
    avg_cost: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PositionCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    shares: float = Field(..., gt=0)
    avg_cost: float = Field(..., gt=0)


class PositionUpdate(BaseModel):
    shares: Optional[float] = Field(None, gt=0)
    avg_cost: Optional[float] = Field(None, gt=0)


class PositionWithQuote(PositionOut):
    current_price: Optional[float] = None
    currency: Optional[str] = "USD"
    name: Optional[str] = None
    sector: Optional[str] = None
    market_value: Optional[float] = None
    cost_basis: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None


class PriceAlertOut(BaseModel):
    id: int
    symbol: str
    target_price: float
    direction: str
    triggered_at: Optional[datetime] = None
    created_at: datetime
    current_price: Optional[float] = None
    change_percent: Optional[float] = None
    triggered: bool = False

    class Config:
        from_attributes = True


class PriceAlertCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    target_price: float = Field(..., gt=0)
    direction: str = Field(..., pattern="^(above|below)$")


class WatchlistOut(BaseModel):
    symbols: List[str]


class WatchlistUpdate(BaseModel):
    symbols: List[str] = Field(..., min_length=1, max_length=30)


class RiskProfileOut(BaseModel):
    max_loss_tolerance_pct: Optional[float] = None
    max_position_pct: float = 10.0
    risk_per_trade_pct: float = 2.0
    configured: bool = False
    portfolio_value: float = 0.0
    effective_account_size: float = 100_000.0
    portfolio_from_positions: bool = False

    class Config:
        from_attributes = True


class RiskProfileUpdate(BaseModel):
    max_loss_tolerance_pct: float = Field(..., ge=5, le=80)
    max_position_pct: Optional[float] = Field(None, ge=5, le=50)
    risk_per_trade_pct: Optional[float] = Field(None, ge=0.5, le=10)
