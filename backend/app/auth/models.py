from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from app.clock import utcnow


class User(SQLModel, table=True):
    __tablename__ = "app_user"  # "user" is a reserved word in PostgreSQL

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    email: str = Field(index=True, unique=True, max_length=254)
    password_hash: str
    role: str = Field(default="user", max_length=10)  # user | admin
    is_active: bool = True                            # False = banned
    created_at: datetime = Field(default_factory=utcnow)
    last_login_at: Optional[datetime] = None
    failed_login_count: int = 0
    locked_until: Optional[datetime] = None           # brute-force lockout
    banned_at: Optional[datetime] = None
    ban_reason: Optional[str] = Field(default=None, max_length=300)


class UserSession(SQLModel, table=True):
    """One logged-in browser/device. Only a hash of its refresh token is stored."""

    __tablename__ = "user_session"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="app_user.id", index=True)
    refresh_hash: str = Field(index=True, max_length=64)
    prev_refresh_hash: Optional[str] = Field(default=None, index=True, max_length=64)
    expires_at: datetime
    created_at: datetime = Field(default_factory=utcnow)
    last_used_at: datetime = Field(default_factory=utcnow)
    user_agent: str = Field(default="", max_length=300)
    ip_address: str = Field(default="", max_length=64)
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = Field(default=None, max_length=100)
