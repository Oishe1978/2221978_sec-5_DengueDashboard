from datetime import date
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlmodel import Session

from app.audit import events
from app.audit.service import record
from app.auth.models import User
from app.auth.request_info import client_ip, user_agent
from app.database import get_session
from app.rbac.deps import require_permission
from app.rbac.permissions import Permission
from app.reports.repository import ReportRepository
from app.reports.schemas import (
    DIVISIONS,
    Division,
    ReportCreate,
    ReportPage,
    ReportRead,
    ReportUpdate,
    Source,
)
from app.reports.service import (
    DuplicateReportError,
    InvalidReportError,
    ReportNotFoundError,
    ReportService,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
DUPLICATE = HTTPException(
    status.HTTP_409_CONFLICT, "A report for this division and date already exists"
)


def get_service(session: Annotated[Session, Depends(get_session)]) -> ReportService:
    return ReportService(ReportRepository(session))


Service = Annotated[ReportService, Depends(get_service)]

# Reading is public; creating, editing and deleting need the reports:write permission (admins).
WriteAccess = Annotated[User, Depends(require_permission(Permission.REPORTS_WRITE))]


@router.get("/divisions", response_model=list[str])
def list_divisions():
    """The fixed list used by the form's dropdown."""
    return list(DIVISIONS)


@router.get("", response_model=ReportPage)
def list_reports(
    service: Service,
    division: Optional[Division] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    source: Optional[Source] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 20,
):
    items, total = service.list_reports(division, date_from, date_to, source, offset, limit)
    return {"items": items, "total": total, "offset": offset, "limit": limit}


@router.get("/by-date/{report_date}", response_model=list[ReportRead])
def list_reports_by_date(report_date: date, service: Service, division: Optional[Division] = None):
    """Exact-date search: every division reported on that day (empty list if none)."""
    return service.list_by_date(report_date, division)


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: UUID, service: Service):
    try:
        return service.get_report(report_id)
    except ReportNotFoundError:
        raise NOT_FOUND


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, _user: WriteAccess, service: Service):
    try:
        return service.create_report(payload)
    except DuplicateReportError:
        raise DUPLICATE
    except InvalidReportError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e))


@router.patch("/{report_id}", response_model=ReportRead)
def update_report(report_id: UUID, payload: ReportUpdate, _user: WriteAccess, service: Service):
    try:
        return service.update_report(report_id, payload)
    except ReportNotFoundError:
        raise NOT_FOUND
    except DuplicateReportError:
        raise DUPLICATE
    except InvalidReportError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e))


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: UUID,
    request: Request,
    user: WriteAccess,
    service: Service,
    db: Annotated[Session, Depends(get_session)],
):
    try:
        service.delete_report(report_id)
    except ReportNotFoundError:
        raise NOT_FOUND
    record(db, events.RECORD_DELETE, user_id=user.id, email=user.email, ip=client_ip(request),
           agent=user_agent(request), details=f"daily report {report_id}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
