from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RoleChangeRequest(BaseModel):
    role: Literal["user", "admin"]


class BanRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class AdminUserRead(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    is_active: bool
    banned_at: Optional[datetime]
    ban_reason: Optional[str]
    last_login_at: Optional[datetime]
