from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class DengueCase(SQLModel, table=True):
    __tablename__ = "dengue_case"
    __table_args__ = (UniqueConstraint("district", "report_date", name="uq_district_report_date"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    district: str = Field(index=True, max_length=60)
    report_date: date = Field(index=True)
    cases: int
    deaths: int = 0
    recovered: int = 0
    severity: str = "low"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))