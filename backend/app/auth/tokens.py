"""Signed access tokens (JWT, HS256)."""

import os
from datetime import datetime, timedelta, timezone

import jwt

from app.config import IS_VERCEL, JWT_SECRET

ALGORITHM = "HS256"
ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_MINUTES", "480"))  # 8 hours


class InvalidTokenError(Exception):
    pass


def _secret() -> str:
    if JWT_SECRET:
        return JWT_SECRET
    if IS_VERCEL:
        raise RuntimeError("JWT_SECRET is not set in the Vercel environment variables")
    return "dev-only-secret-change-me-0123456789"  # local development only


def create_access_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "role": role, "iat": now, "exp": now + timedelta(minutes=ACCESS_MINUTES)}
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM], options={"require": ["exp", "sub"]})
    except jwt.PyJWTError as exc:
        raise InvalidTokenError from exc
