from dataclasses import dataclass
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.auth.models import User, UserSession
from app.auth.sessions import SessionService
from app.auth.tokens import InvalidTokenError, decode_access_token
from app.database import get_session

_bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentAuth:
    user: User
    session: UserSession


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, message, headers={"WWW-Authenticate": "Bearer"})


def get_current_auth(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_bearer)],
    db: Annotated[Session, Depends(get_session)],
) -> CurrentAuth:
    """Every protected request passes through here.

    1. the token must be present, correctly signed and not expired
    2. the session it belongs to must still be active (logout and revoke work immediately)
    3. the user must exist and must not be banned (a ban takes effect on the very next request)
    """
    if credentials is None:
        raise _unauthorized("Not authenticated")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
        session_id = UUID(payload["sid"])
    except (InvalidTokenError, KeyError, ValueError):
        raise _unauthorized("Invalid or expired token")

    session = SessionService(db).get_active(session_id)
    user = db.get(User, user_id)
    if session is None or user is None or session.user_id != user.id or not user.is_active:
        raise _unauthorized("Invalid or expired token")
    return CurrentAuth(user=user, session=session)


def get_current_user(auth: Annotated[CurrentAuth, Depends(get_current_auth)]) -> User:
    return auth.user
