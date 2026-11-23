from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from app.clock import utcnow


class AuditLog(SQLModel, table=True):
    """One row per security-relevant event: who, what, from where, when."""

    __tablename__ = "audit_log"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow, index=True)
    event: str = Field(index=True, max_length=40)
    user_id: Optional[UUID] = Field(default=None, index=True)
    email: Optional[str] = Field(default=None, max_length=254)   # kept for failed logins of unknown users
    ip_address: str = Field(default="", max_length=64)
    user_agent: str = Field(default="", max_length=300)
    details: Optional[str] = Field(default=None, max_length=500)
    success: bool = True
