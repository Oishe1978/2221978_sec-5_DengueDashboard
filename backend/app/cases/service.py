from datetime import date
from uuid import UUID

from app.cases.models import DengueCase
from app.cases.repository import CaseRepository
from app.cases.schemas import CaseCreate, CaseUpdate, DengueStats


class CaseNotFoundError(Exception):
    pass


class DuplicateReportError(Exception):
    pass


class InvalidCaseError(Exception):
    pass


class CaseService:
    """Business rules live here."""

    def __init__(self, repo: CaseRepository) -> None:
        self.repo = repo

    def list_cases(self, district: str | None, severity: str | None,
                   date_from: date | None, date_to: date | None) -> list[DengueCase]:
        return self.repo.find_all(district, severity, date_from, date_to)

    def get_case(self, case_id: UUID) -> DengueCase:
        case = self.repo.find_by_id(case_id)
        if case is None:
            raise CaseNotFoundError
        return case

    def create_case(self, data: CaseCreate) -> DengueCase:
        if self.repo.find_by_district_and_date(data.district, data.report_date):
            raise DuplicateReportError
        return self.repo.save(DengueCase(**data.model_dump()))

    def update_case(self, case_id: UUID, data: CaseUpdate) -> DengueCase:
        case = self.get_case(case_id)
        changes = data.model_dump(exclude_unset=True)
        merged = {**case.model_dump(), **changes}
        if merged["deaths"] + merged["recovered"] > merged["cases"]:
            raise InvalidCaseError("deaths + recovered cannot exceed total cases")
        if "district" in changes or "report_date" in changes:
            other = self.repo.find_by_district_and_date(merged["district"], merged["report_date"])
            if other is not None and other.id != case.id:
                raise DuplicateReportError
        for key, value in changes.items():
            setattr(case, key, value)
        return self.repo.save(case)

    def delete_case(self, case_id: UUID) -> None:
        self.repo.remove(self.get_case(case_id))

    def stats(self) -> DengueStats:
        items = self.repo.find_all()
        total = sum(c.cases for c in items)
        recovered = sum(c.recovered for c in items)
        deaths = sum(c.deaths for c in items)
        return DengueStats(
            total_cases=total,
            active_cases=max(total - recovered - deaths, 0),
            recovered=recovered,
            deaths=deaths,
        )