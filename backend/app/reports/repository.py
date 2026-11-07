from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.reports.models import DailyReport


class ReportRepository:
    """The only layer that talks to the database."""

    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def _conditions(division, date_from, date_to, source) -> list:
        conditions = []
        if division:
            conditions.append(DailyReport.division == division)
        if date_from:
            conditions.append(DailyReport.report_date >= date_from)
        if date_to:
            conditions.append(DailyReport.report_date <= date_to)
        if source:
            conditions.append(DailyReport.source == source)
        return conditions

    def find_page(
        self,
        division: Optional[str],
        date_from: Optional[date],
        date_to: Optional[date],
        source: Optional[str],
        offset: int,
        limit: int,
    ) -> tuple[list[DailyReport], int]:
        conditions = self._conditions(division, date_from, date_to, source)

        count_stmt = select(func.count()).select_from(DailyReport)
        items_stmt = select(DailyReport)
        for condition in conditions:
            count_stmt = count_stmt.where(condition)
            items_stmt = items_stmt.where(condition)

        total = self.session.exec(count_stmt).one()
        items_stmt = (
            items_stmt.order_by(DailyReport.report_date.desc(), DailyReport.division)
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(items_stmt).all()), total

    def find_by_date(self, report_date: date, division: Optional[str] = None) -> list[DailyReport]:
        stmt = select(DailyReport).where(DailyReport.report_date == report_date)
        if division:
            stmt = stmt.where(DailyReport.division == division)
        return list(self.session.exec(stmt.order_by(DailyReport.division)).all())

    def find_by_id(self, report_id: UUID) -> Optional[DailyReport]:
        return self.session.get(DailyReport, report_id)

    def find_by_division_and_date(self, division: str, report_date: date) -> Optional[DailyReport]:
        stmt = select(DailyReport).where(
            DailyReport.division == division, DailyReport.report_date == report_date
        )
        return self.session.exec(stmt).first()

    def save(self, report: DailyReport) -> DailyReport:
        self.session.add(report)
        self.session.commit()
        self.session.refresh(report)
        return report

    def remove(self, report: DailyReport) -> None:
        self.session.delete(report)
        self.session.commit()
