from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional, get_args
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Division = Literal[
    "Dhaka", "Chattogram", "Barishal", "Sylhet", "Rajshahi", "Rangpur", "Khulna", "Mymensingh"
]
DIVISIONS: tuple[str, ...] = get_args(Division)

Source = Literal["dghs", "synthetic", "manual"]


def today_in_dhaka() -> date:
    """Today's date in Bangladesh time (UTC+6), without needing the tzdata package."""
    return datetime.now(timezone(timedelta(hours=6))).date()


class ReportCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    division: Division
    report_date: date
    admitted: int = Field(ge=0)
    deaths: int = Field(default=0, ge=0)


class ReportUpdate(BaseModel):
    division: Optional[Division] = None
    report_date: Optional[date] = None
    admitted: Optional[int] = Field(default=None, ge=0)
    deaths: Optional[int] = Field(default=None, ge=0)


class ReportRead(BaseModel):
    id: UUID
    division: str
    report_date: date
    admitted: int
    deaths: int
    source: str
    created_at: datetime
    updated_at: datetime


class ReportPage(BaseModel):
    items: list[ReportRead]
    total: int
    offset: int
    limit: int
