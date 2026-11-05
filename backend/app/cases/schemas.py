from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Severity = Literal["low", "medium", "high"]


class CaseCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    district: str = Field(min_length=2, max_length=60)
    report_date: date
    cases: int = Field(ge=0)
    deaths: int = Field(default=0, ge=0)
    recovered: int = Field(default=0, ge=0)
    severity: Severity = "low"

    @model_validator(mode="after")
    def check_totals(self) -> "CaseCreate":
        if self.deaths + self.recovered > self.cases:
            raise ValueError("deaths + recovered cannot exceed total cases")
        return self


class CaseUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    district: str | None = Field(default=None, min_length=2, max_length=60)
    report_date: date | None = None
    cases: int | None = Field(default=None, ge=0)
    deaths: int | None = Field(default=None, ge=0)
    recovered: int | None = Field(default=None, ge=0)
    severity: Severity | None = None


class CaseRead(BaseModel):
    id: UUID
    district: str
    report_date: date
    cases: int
    deaths: int
    recovered: int
    severity: str
    created_at: datetime


class DengueStats(BaseModel):
    total_cases: int
    active_cases: int
    recovered: int
    deaths: int