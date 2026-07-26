from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..auth import (
    verify_password, create_access_token, get_current_user,
    hash_password, COOKIE_NAME, JWT_EXPIRE_HOURS,
)
from ..auth_schemas import LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, user: User) -> None:
    token = create_access_token(user.id, user.role)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=JWT_EXPIRE_HOURS * 3600,
        path="/",
    )


@router.post("/register", status_code=201)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้แล้ว")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="ชื่อผู้ใช้นี้ถูกใช้แล้ว")

    user = User(
        username=body.username.strip(),
        email=email,
        password_hash=hash_password(body.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _set_session_cookie(response, user)
    return {"user": UserOut.model_validate(user)}


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    _set_session_cookie(response, user)
    return {"user": UserOut.model_validate(user)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
