from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str


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
    market_value: Optional[float] = None
    cost_basis: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None


class WatchlistOut(BaseModel):
    symbols: List[str]


class WatchlistUpdate(BaseModel):
    symbols: List[str] = Field(..., min_length=1, max_length=30)
