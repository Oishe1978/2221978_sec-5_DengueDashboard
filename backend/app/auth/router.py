from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.audit import events
from app.audit.service import record
from app.auth.deps import CurrentAuth, get_current_auth
from app.auth.models import User, UserSession
from app.auth.request_info import client_ip, user_agent
from app.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    SessionRead,
    TokenResponse,
    UpdateProfileRequest,
    UserRead,
)
from app.auth.service import (
    AccountDisabledError,
    AccountLockedError,
    AdminCodeError,
    AuthService,
    EmailTakenError,
    InvalidCredentialsError,
    WeakPasswordError,
)
from app.auth.sessions import InvalidRefreshError, SessionService
from app.auth.tokens import create_access_token
from app.config import COOKIE_SECURE, REFRESH_DAYS
from app.database import get_session

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"  # the browser sends the refresh cookie only to these endpoints


def get_service(db: Annotated[Session, Depends(get_session)]) -> AuthService:
    return AuthService(db)


Service = Annotated[AuthService, Depends(get_service)]
Auth = Annotated[CurrentAuth, Depends(get_current_auth)]


def _set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=raw,
        max_age=REFRESH_DAYS * 86400,
        httponly=True,          # JavaScript cannot read it (protects against XSS theft)
        secure=COOKIE_SECURE,   # https only on Vercel
        samesite="lax",         # not sent on cross-site POSTs (protects against CSRF)
        path=COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path=COOKIE_PATH)


def _token_response(user: User, session: UserSession) -> dict:
    token = create_access_token(str(user.id), user.role, str(session.id))
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response, service: Service):
    try:
        user, session, raw = service.register(payload, client_ip(request), user_agent(request))
    except AdminCodeError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid admin code")
    except EmailTakenError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    except WeakPasswordError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, " ".join(e.problems))
    _set_refresh_cookie(response, raw)
    return _token_response(user, session)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, response: Response, service: Service):
    try:
        user, session, raw = service.login(payload.email, payload.password, client_ip(request), user_agent(request))
    except InvalidCredentialsError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    except AccountLockedError:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again later.")
    except AccountDisabledError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is disabled")
    _set_refresh_cookie(response, raw)
    return _token_response(user, session)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, service: Service):
    """Trade the refresh cookie for a new access token. The cookie itself is replaced (rotation)."""
    raw = request.cookies.get(REFRESH_COOKIE)
    try:
        if not raw:
            raise InvalidRefreshError
        user, session, new_raw = service.refresh(raw, client_ip(request), user_agent(request))
    except InvalidRefreshError:
        failed = JSONResponse({"detail": "Session expired. Please log in again."}, status_code=401)
        _clear_refresh_cookie(failed)
        return failed
    _set_refresh_cookie(response, new_raw)
    return _token_response(user, session)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, service: Service):
    """Really ends the session on the server, then removes the cookie."""
    raw = request.cookies.get(REFRESH_COOKIE)
    if raw:
        service.logout(raw, client_ip(request), user_agent(request))
    done = Response(status_code=status.HTTP_204_NO_CONTENT)
    _clear_refresh_cookie(done)
    return done


@router.get("/me", response_model=UserRead)
def me(auth: Auth):
    return auth.user


@router.patch("/me", response_model=UserRead)
def update_me(payload: UpdateProfileRequest, request: Request, auth: Auth, service: Service):
    try:
        return service.update_profile(auth.user, payload.name, payload.email, client_ip(request), user_agent(request))
    except EmailTakenError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: ChangePasswordRequest, request: Request, auth: Auth, service: Service):
    try:
        service.change_password(
            auth.user, auth.session.id, payload.current_password, payload.new_password,
            client_ip(request), user_agent(request),
        )
    except InvalidCredentialsError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The current password is incorrect")
    except WeakPasswordError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, " ".join(e.problems))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(auth: Auth, db: Annotated[Session, Depends(get_session)]):
    sessions = SessionService(db).list_active(auth.user.id)
    return [
        {
            "id": s.id,
            "user_agent": s.user_agent,
            "ip_address": s.ip_address,
            "created_at": s.created_at,
            "last_used_at": s.last_used_at,
            "expires_at": s.expires_at,
            "current": s.id == auth.session.id,
        }
        for s in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(session_id: UUID, auth: Auth, db: Annotated[Session, Depends(get_session)]):
    """Sign out one of your own devices. Someone else's session looks like 'not found'."""
    service = SessionService(db)
    target = service.get_active(session_id)
    if target is None or target.user_id != auth.user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    service.revoke(target, "revoked by user")
    record(db, events.SESSION_REVOKED, user_id=auth.user.id, email=auth.user.email, commit=False)
    db.commit()
    done = Response(status_code=status.HTTP_204_NO_CONTENT)
    if target.id == auth.session.id:
        _clear_refresh_cookie(done)
    return done
