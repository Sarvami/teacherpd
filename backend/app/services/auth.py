from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext


# Use a pure-Python, bcrypt-free scheme for local dev reliability.
_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

JWT_SECRET = os.getenv("TEACHUP_JWT_SECRET", "teachup-dev-secret-change-me")
JWT_ALG = os.getenv("TEACHUP_JWT_ALG", "HS256")

ACCESS_TTL_MIN = int(os.getenv("TEACHUP_ACCESS_TTL_MIN", "30"))
REFRESH_TTL_DAYS = int(os.getenv("TEACHUP_REFRESH_TTL_DAYS", "30"))


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd.verify(password, password_hash)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: int) -> str:
    exp = _now() + timedelta(minutes=ACCESS_TTL_MIN)
    payload = {"sub": str(user_id), "type": "access", "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(user_id: int) -> str:
    exp = _now() + timedelta(days=REFRESH_TTL_DAYS)
    payload = {"sub": str(user_id), "type": "refresh", "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def get_user_id_from_access_token(token: str) -> Optional[int]:
    try:
        payload = decode_token(token)
    except ValueError:
        return None
    if payload.get("type") != "access":
        return None
    sub = payload.get("sub")
    try:
        return int(sub)
    except Exception:
        return None


def get_user_id_from_refresh_token(token: str) -> Optional[int]:
    try:
        payload = decode_token(token)
    except ValueError:
        return None
    if payload.get("type") != "refresh":
        return None
    sub = payload.get("sub")
    try:
        return int(sub)
    except Exception:
        return None
