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
    created_at: datetime


class BulkRequest(BaseModel):
    user_ids: list[UUID] = Field(min_length=1, max_length=100)
    reason: Optional[str] = Field(default=None, min_length=3, max_length=300)  # needed for ban only


class DeleteManyRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=200)
