from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from app.auth.deps import get_current_user
from app.auth.models import User
from app.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.auth.service import (
    AccountDisabledError,
    AdminCodeError,
    AuthService,
    EmailTakenError,
    InvalidCredentialsError,
)
from app.auth.tokens import create_access_token
from app.database import get_session

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def get_service(session: Annotated[Session, Depends(get_session)]) -> AuthService:
    return AuthService(session)


Service = Annotated[AuthService, Depends(get_service)]


def _token_response(user: User) -> dict:
    return {"access_token": create_access_token(str(user.id), user.role), "token_type": "bearer", "user": user}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, service: Service):
    try:
        user = service.register(payload)
    except AdminCodeError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid admin code")
    except EmailTakenError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, service: Service):
    try:
        user = service.authenticate(payload.email, payload.password)
    except InvalidCredentialsError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    except AccountDisabledError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is disabled")
    return _token_response(user)


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """Tokens are stateless: the client discards its token. Kept so the API is complete."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)
