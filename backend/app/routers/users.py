from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User
from ..auth import require_superadmin, hash_password
from ..auth_schemas import UserOut, UserCreate, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(_: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้แล้ว")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="ชื่อผู้ใช้นี้ถูกใช้แล้ว")

    user = User(
        username=body.username,
        email=email,
        password_hash=hash_password(body.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")

    if user.role == "superadmin" and user.id != admin.id:
        raise HTTPException(status_code=403, detail="ไม่สามารถแก้ไข Super Admin คนอื่น")

    if body.email:
        email = body.email.lower()
        existing = db.query(User).filter(User.email == email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้แล้ว")
        user.email = email

    if body.username:
        existing = db.query(User).filter(User.username == body.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="ชื่อผู้ใช้นี้ถูกใช้แล้ว")
        user.username = body.username

    if body.password:
        user.password_hash = hash_password(body.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    if user.role == "superadmin":
        raise HTTPException(status_code=403, detail="ไม่สามารถลบ Super Admin")
    if user.id == admin.id:
        raise HTTPException(status_code=403, detail="ไม่สามารถลบตัวเอง")

    db.delete(user)
    db.commit()
