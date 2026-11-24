from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.reports.schemas import Division


class WatchCreate(BaseModel):
    division: Division
    threshold: int = Field(ge=1, le=100000)
    note: Optional[str] = Field(default=None, max_length=500)


class WatchUpdate(BaseModel):
    threshold: Optional[int] = Field(default=None, ge=1, le=100000)
    note: Optional[str] = Field(default=None, max_length=500)


class WatchRead(BaseModel):
    id: UUID
    division: str
    threshold: int
    note: Optional[str]
    created_at: datetime
    updated_at: datetime
    latest_date: Optional[date]        # newest day with data for this division
    latest_admitted: Optional[int]     # admissions on that day
    alert: bool                        # latest_admitted >= threshold
