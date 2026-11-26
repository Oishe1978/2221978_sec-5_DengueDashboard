from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.reports.schemas import Division


# ----- requests -----
class TeamName(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class MemberAdd(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    can_create: bool = False
    can_update: bool = False
    can_assign: bool = False


class MemberUpdate(BaseModel):
    can_create: Optional[bool] = None
    can_update: Optional[bool] = None
    can_assign: Optional[bool] = None


class ItemCreate(BaseModel):
    division: Division
    threshold: int = Field(ge=1, le=100000)
    note: Optional[str] = Field(default=None, max_length=500)


class ItemUpdate(BaseModel):
    threshold: Optional[int] = Field(default=None, ge=1, le=100000)
    note: Optional[str] = Field(default=None, max_length=500)


class AssignRequest(BaseModel):
    user_id: Optional[UUID] = None   # null = remove the assignment


# ----- responses -----
class TeamSummary(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    owner_name: str
    my_role: Literal["owner", "member"]
    can_create: bool
    can_update: bool
    can_assign: bool
    member_count: int
    item_count: int
    created_at: datetime


class MemberRead(BaseModel):
    user_id: UUID
    name: str
    email: str
    is_owner: bool
    can_create: bool
    can_update: bool
    can_assign: bool


class ItemRead(BaseModel):
    id: UUID
    division: str
    threshold: int
    note: Optional[str]
    assigned_to: Optional[UUID]
    assigned_to_name: Optional[str]
    created_by_name: str
    created_at: datetime
    updated_at: datetime
    latest_date: Optional[date]
    latest_admitted: Optional[int]
    alert: bool


class TeamDetail(BaseModel):
    team: TeamSummary
    members: list[MemberRead]
    items: list[ItemRead]
