from datetime import date
from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.cases.models import DengueCase


class CaseRepository:
    """The only layer that talks to the database."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def find_all(
        self,
        district: str | None = None,
        severity: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[DengueCase]:
        stmt = select(DengueCase)
        if district:
            stmt = stmt.where(func.lower(DengueCase.district) == district.lower())
        if severity:
            stmt = stmt.where(DengueCase.severity == severity)
        if date_from:
            stmt = stmt.where(DengueCase.report_date >= date_from)
        if date_to:
            stmt = stmt.where(DengueCase.report_date <= date_to)
        stmt = stmt.order_by(DengueCase.report_date.desc(), DengueCase.created_at.desc())
        return list(self.session.exec(stmt).all())

    def find_by_id(self, case_id: UUID) -> DengueCase | None:
        return self.session.get(DengueCase, case_id)

    def find_by_district_and_date(self, district: str, report_date: date) -> DengueCase | None:
        stmt = select(DengueCase).where(
            func.lower(DengueCase.district) == district.lower(),
            DengueCase.report_date == report_date,
        )
        return self.session.exec(stmt).first()

    def save(self, case: DengueCase) -> DengueCase:
        self.session.add(case)
        self.session.commit()
        self.session.refresh(case)
        return case

    def remove(self, case: DengueCase) -> None:
        self.session.delete(case)
        self.session.commit()