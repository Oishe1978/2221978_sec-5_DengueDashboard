from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

from app.clock import utcnow


class Team(SQLModel, table=True):
    """A shared group. The owner is the user who created it."""

    __tablename__ = "team"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_team_owner_name"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=80)
    owner_id: UUID = Field(foreign_key="app_user.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class TeamMember(SQLModel, table=True):
    """Someone the owner added, with three on/off permissions. The owner has no row here."""

    __tablename__ = "team_member"

    team_id: UUID = Field(foreign_key="team.id", primary_key=True)
    user_id: UUID = Field(foreign_key="app_user.id", primary_key=True, index=True)
    can_create: bool = False
    can_update: bool = False
    can_assign: bool = False
    added_at: datetime = Field(default_factory=utcnow)


class TeamItem(SQLModel, table=True):
    """The shared resource: a division the team follows, with an alert level and an optional assignee."""

    __tablename__ = "team_item"
    __table_args__ = (UniqueConstraint("team_id", "division", name="uq_team_item_division"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    team_id: UUID = Field(foreign_key="team.id", index=True)
    division: str = Field(max_length=30)
    threshold: int
    note: Optional[str] = Field(default=None, max_length=500)
    assigned_to: Optional[UUID] = Field(default=None, foreign_key="app_user.id")
    created_by: UUID = Field(foreign_key="app_user.id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
