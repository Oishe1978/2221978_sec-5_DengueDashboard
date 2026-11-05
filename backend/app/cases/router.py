from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from app.cases.repository import CaseRepository
from app.cases.schemas import CaseCreate, CaseRead, CaseUpdate, DengueStats, Severity
from app.cases.service import (
    CaseNotFoundError,
    CaseService,
    DuplicateReportError,
    InvalidCaseError,
)
from app.database import get_session

router = APIRouter(prefix="/api/v1", tags=["cases"])

NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Case report not found")
DUPLICATE = HTTPException(
    status.HTTP_409_CONFLICT, "A report for this district and date already exists"
)


def get_service(session: Annotated[Session, Depends(get_session)]) -> CaseService:
    return CaseService(CaseRepository(session))


Service = Annotated[CaseService, Depends(get_service)]


@router.get("/cases", response_model=list[CaseRead])
def list_cases(
    service: Service,
    district: str | None = None,
    severity: Severity | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    return service.list_cases(district, severity, date_from, date_to)


@router.get("/cases/{case_id}", response_model=CaseRead)
def get_case(case_id: UUID, service: Service):
    try:
        return service.get_case(case_id)
    except CaseNotFoundError:
        raise NOT_FOUND


@router.post("/cases", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
def create_case(payload: CaseCreate, service: Service):
    try:
        return service.create_case(payload)
    except DuplicateReportError:
        raise DUPLICATE


@router.patch("/cases/{case_id}", response_model=CaseRead)
def update_case(case_id: UUID, payload: CaseUpdate, service: Service):
    try:
        return service.update_case(case_id, payload)
    except CaseNotFoundError:
        raise NOT_FOUND
    except DuplicateReportError:
        raise DUPLICATE
    except InvalidCaseError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e))


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: UUID, service: Service):
    try:
        service.delete_case(case_id)
    except CaseNotFoundError:
        raise NOT_FOUND
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/dengue-stats", response_model=DengueStats)
def dengue_stats(service: Service):
    return service.stats()