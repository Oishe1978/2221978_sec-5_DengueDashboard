from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel

Granularity = Literal["day", "week", "month", "year"]


class DateRange(BaseModel):
    min_date: Optional[date]
    max_date: Optional[date]


class Summary(BaseModel):
    date_from: date
    date_to: date
    days: int
    admitted: int
    deaths: int
    fatality_rate: float
    avg_daily: float
    peak_date: Optional[date]
    peak_admitted: int
    previous_admitted: int
    previous_deaths: int
    admitted_change_pct: Optional[float]
    deaths_change_pct: Optional[float]


class TimePoint(BaseModel):
    period_start: date
    admitted: int
    deaths: int
    days: int
    admitted_avg7: Optional[float]


class DivisionStat(BaseModel):
    division: str
    admitted: int
    deaths: int
    fatality_rate: float
    share_pct: float


class MonthsByYear(BaseModel):
    year: int
    months: list[Optional[int]]
    total: int


class WeekdayStat(BaseModel):
    weekday: str
    admitted_avg: float
    deaths_avg: float
    days: int


class DayDivision(BaseModel):
    division: str
    admitted: int
    deaths: int


class DayReport(BaseModel):
    report_date: date
    division: Optional[str]
    admitted: int
    deaths: int
    fatality_rate: float
    avg_prev_7_days: Optional[float]
    change_vs_avg_pct: Optional[float]
    prev_day_admitted: Optional[int]
    change_vs_prev_day_pct: Optional[float]
    divisions: list[DayDivision]
