"""Access tokens (short-lived signed JWTs) and refresh tokens (random secrets)."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config import ACCESS_MINUTES, IS_VERCEL, JWT_SECRET

ALGORITHM = "HS256"


class InvalidTokenError(Exception):
    pass


def _secret() -> str:
    if JWT_SECRET:
        return JWT_SECRET
    if IS_VERCEL:
        raise RuntimeError("JWT_SECRET is not set in the Vercel environment variables")
    return "dev-only-secret-change-me-0123456789"  # local development only


def create_access_token(user_id: str, role: str, session_id: str) -> str:
    """Claims: sub = user id, role, sid = session id, exp = expiry (15 minutes by default)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "sid": session_id,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_MINUTES),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Verify signature and expiry. Raises InvalidTokenError for anything wrong."""
    try:
        payload = jwt.decode(
            token, _secret(), algorithms=[ALGORITHM], options={"require": ["exp", "sub", "sid"]}
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError from exc
    if payload.get("type") != "access":
        raise InvalidTokenError
    return payload


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)  # 384 bits of randomness


def hash_refresh_token(token: str) -> str:
    """Only this hash is stored, so a database leak does not reveal usable refresh tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
