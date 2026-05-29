from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.db.database import User, get_db
from app.routes.deps import get_current_user
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    get_user_id_from_refresh_token,
    hash_password,
    verify_password,
)
from models.teachup_schemas import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/api/auth", tags=["teachup-auth"])


REFRESH_COOKIE = "upteach_refresh"


def _set_refresh_cookie(response: Response, token: str) -> None:
    # Dev-friendly defaults; tighten domain/secure flags in production.
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/api/auth",
        max_age=60 * 60 * 24 * 30,
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh)
    return {"token": access, "user": user}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh)
    return {"token": access, "user": user}


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(key=REFRESH_COOKIE, path="/api/auth")
    return Response(status_code=204)


@router.post("/refresh", response_model=AuthResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    user_id = get_user_id_from_refresh_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access = create_access_token(user.id)
    refresh2 = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh2)
    return {"token": access, "user": user}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name}
