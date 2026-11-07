from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlmodel import Session, select

from app.reports.models import DailyReport


class StatsRepository:
    """Read-only aggregate queries (plain GROUP BY, so they work on SQLite and Postgres)."""

    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def _filter(stmt, division: Optional[str], date_from: Optional[date], date_to: Optional[date]):
        if division:
            stmt = stmt.where(DailyReport.division == division)
        if date_from:
            stmt = stmt.where(DailyReport.report_date >= date_from)
        if date_to:
            stmt = stmt.where(DailyReport.report_date <= date_to)
        return stmt

    def daily_totals(self, division, date_from, date_to) -> list[tuple[date, int, int]]:
        stmt = select(
            DailyReport.report_date, func.sum(DailyReport.admitted), func.sum(DailyReport.deaths)
        )
        stmt = self._filter(stmt, division, date_from, date_to)
        stmt = stmt.group_by(DailyReport.report_date).order_by(DailyReport.report_date)
        return [(d, int(a or 0), int(x or 0)) for d, a, x in self.session.exec(stmt).all()]

    def division_totals(self, date_from, date_to) -> list[tuple[str, int, int]]:
        stmt = select(
            DailyReport.division, func.sum(DailyReport.admitted), func.sum(DailyReport.deaths)
        )
        stmt = self._filter(stmt, None, date_from, date_to).group_by(DailyReport.division)
        return [(n, int(a or 0), int(x or 0)) for n, a, x in self.session.exec(stmt).all()]

    def rows_for_date(self, day: date) -> list[tuple[str, int, int]]:
        stmt = select(DailyReport.division, DailyReport.admitted, DailyReport.deaths).where(
            DailyReport.report_date == day
        )
        return [(n, int(a), int(x)) for n, a, x in self.session.exec(stmt).all()]

    def date_bounds(self, division: Optional[str]) -> tuple[Optional[date], Optional[date]]:
        stmt = select(func.min(DailyReport.report_date), func.max(DailyReport.report_date))
        if division:
            stmt = stmt.where(DailyReport.division == division)
        lowest, highest = self.session.exec(stmt).one()
        return lowest, highest
