from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DailyReport(SQLModel, table=True):
    """One row = one division on one day."""

    __tablename__ = "daily_report"
    __table_args__ = (
        UniqueConstraint("division", "report_date", name="uq_daily_report_division_date"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    division: str = Field(index=True, max_length=30)
    report_date: date = Field(index=True)
    admitted: int = 0
    deaths: int = 0
    source: str = Field(default="manual", index=True, max_length=20)  # dghs | synthetic | manual
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
