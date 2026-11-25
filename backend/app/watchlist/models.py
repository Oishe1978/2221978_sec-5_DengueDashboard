from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

from app.clock import utcnow


class WatchItem(SQLModel, table=True):
    """A division a user keeps an eye on, with the daily admissions that should raise an alert.

    Every item belongs to exactly one user (owner_id). That is the basis of the ownership rules.
    """

    __tablename__ = "watch_item"
    __table_args__ = (UniqueConstraint("owner_id", "division", name="uq_watch_owner_division"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="app_user.id", index=True)
    division: str = Field(index=True, max_length=30)
    threshold: int
    note: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
