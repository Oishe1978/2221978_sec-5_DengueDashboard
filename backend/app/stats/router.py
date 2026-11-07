from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.reports.schemas import Division
from app.stats.repository import StatsRepository
from app.stats.schemas import (
    DateRange,
    DayReport,
    DivisionStat,
    Granularity,
    MonthsByYear,
    Summary,
    TimePoint,
    WeekdayStat,
)
from app.stats.service import InvalidRangeError, NoDataError, StatsService

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


def get_service(session: Annotated[Session, Depends(get_session)]) -> StatsService:
    return StatsService(StatsRepository(session))


Service = Annotated[StatsService, Depends(get_service)]


def _bad_range(e: InvalidRangeError) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e))


@router.get("/date-range", response_model=DateRange)
def date_range(service: Service, division: Optional[Division] = None):
    """Earliest and latest date with data (for the date picker)."""
    return service.date_range(division)


@router.get("/summary", response_model=Summary)
def summary(
    service: Service,
    division: Optional[Division] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    try:
        return service.summary(division, date_from, date_to)
    except InvalidRangeError as e:
        raise _bad_range(e)


@router.get("/timeseries", response_model=list[TimePoint])
def timeseries(
    service: Service,
    granularity: Granularity = "day",
    division: Optional[Division] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    try:
        return service.timeseries(division, date_from, date_to, granularity)
    except InvalidRangeError as e:
        raise _bad_range(e)


@router.get("/by-division", response_model=list[DivisionStat])
def by_division(
    service: Service,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    try:
        return service.by_division(date_from, date_to)
    except InvalidRangeError as e:
        raise _bad_range(e)


@router.get("/monthly-by-year", response_model=list[MonthsByYear])
def monthly_by_year(service: Service, division: Optional[Division] = None):
    return service.monthly_by_year(division)


@router.get("/weekday", response_model=list[WeekdayStat])
def weekday(
    service: Service,
    division: Optional[Division] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    try:
        return service.weekday(division, date_from, date_to)
    except InvalidRangeError as e:
        raise _bad_range(e)


@router.get("/day/{report_date}", response_model=DayReport)
def day_report(report_date: date, service: Service, division: Optional[Division] = None):
    """Everything for one date: the chosen division (or all) versus the previous 7 days."""
    try:
        return service.day_report(report_date, division)
    except NoDataError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No data for this date")
