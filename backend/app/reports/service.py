from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from app.reports.models import DailyReport
from app.reports.repository import ReportRepository
from app.reports.schemas import ReportCreate, ReportUpdate, today_in_dhaka


class ReportNotFoundError(Exception):
    pass


class DuplicateReportError(Exception):
    pass


class InvalidReportError(Exception):
    pass


def _check(values: dict) -> None:
    """Business rules shared by create and update."""
    if values["report_date"] > today_in_dhaka():
        raise InvalidReportError("Report date cannot be in the future")
    if values["deaths"] > values["admitted"]:
        raise InvalidReportError("Deaths cannot exceed admissions")


class ReportService:
    """Business rules live here."""

    def __init__(self, repo: ReportRepository) -> None:
        self.repo = repo

    def list_reports(self, division, date_from, date_to, source, offset, limit):
        return self.repo.find_page(division, date_from, date_to, source, offset, limit)

    def list_by_date(self, report_date: date, division: Optional[str]) -> list[DailyReport]:
        return self.repo.find_by_date(report_date, division)

    def get_report(self, report_id: UUID) -> DailyReport:
        report = self.repo.find_by_id(report_id)
        if report is None:
            raise ReportNotFoundError
        return report

    def create_report(self, data: ReportCreate) -> DailyReport:
        values = data.model_dump()
        _check(values)
        if self.repo.find_by_division_and_date(values["division"], values["report_date"]):
            raise DuplicateReportError
        return self.repo.save(DailyReport(**values, source="manual"))

    def update_report(self, report_id: UUID, data: ReportUpdate) -> DailyReport:
        report = self.get_report(report_id)
        changes = data.model_dump(exclude_unset=True)
        merged = {**report.model_dump(), **changes}
        _check(merged)
        if "division" in changes or "report_date" in changes:
            other = self.repo.find_by_division_and_date(merged["division"], merged["report_date"])
            if other is not None and other.id != report.id:
                raise DuplicateReportError
        for key, value in changes.items():
            setattr(report, key, value)
        report.source = "manual"  # an edited row is no longer the original figure
        report.updated_at = datetime.now(timezone.utc)
        return self.repo.save(report)

    def delete_report(self, report_id: UUID) -> None:
        self.repo.remove(self.get_report(report_id))
