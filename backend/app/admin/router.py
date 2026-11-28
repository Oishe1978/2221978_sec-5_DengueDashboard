from datetime import date
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, select

from app.admin import queries
from app.admin.exports import csv_response
from app.admin.schemas import AdminUserRead, BanRequest, BulkRequest, DeleteManyRequest, RoleChangeRequest
from app.admin.service import AdminService, AlreadyInStateError, UserNotFoundError, delete_team_rows
from app.audit import events
from app.audit.service import record
from app.auth.models import User
from app.auth.request_info import client_ip, user_agent
from app.database import get_session
from app.rbac.deps import require_permission
from app.rbac.permissions import Permission
from app.rbac.policy import PolicyError
from app.reports.models import DailyReport
from app.teams.models import Team
from app.watchlist.models import WatchItem

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Each endpoint names the permission it needs; only admins have these (see rbac/permissions.py).
Reader = Annotated[User, Depends(require_permission(Permission.USERS_READ))]
Manager = Annotated[User, Depends(require_permission(Permission.USERS_MANAGE))]
Moderator = Annotated[User, Depends(require_permission(Permission.CONTENT_MODERATE))]
AuditReader = Annotated[User, Depends(require_permission(Permission.AUDIT_READ))]
Exporter = Annotated[User, Depends(require_permission(Permission.DATA_EXPORT))]
Db = Annotated[Session, Depends(get_session)]


def get_service(db: Db) -> AdminService:
    return AdminService(db)


Service = Annotated[AdminService, Depends(get_service)]
Page = Annotated[int, Query(ge=1)]
Size = Annotated[int, Query(ge=1, le=100)]


def _run(action):
    """Turn the service's exceptions into HTTP errors in one place."""
    try:
        return action()
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    except PolicyError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(e))
    except AlreadyInStateError:
        raise HTTPException(status.HTTP_409_CONFLICT, "The user is already in that state")


# ================= overview =================
@router.get("/overview")
def overview(_: Reader, db: Db):
    return queries.overview(db)


# ================= users =================
@router.get("/users")
def list_users(_: Reader, db: Db, q: Optional[str] = None, role: Optional[str] = None,
               status_: Annotated[Optional[str], Query(alias="status")] = None, page: Page = 1, size: Size = 20):
    rows, total = queries.page_of(db, queries.users_stmt(q, role, status_), page, size)
    return {"items": [AdminUserRead.model_validate(u, from_attributes=True) for u in rows],
            "total": total, "page": page, "size": size}


@router.get("/users/{user_id}")
def user_detail(user_id: UUID, _: Reader, db: Db):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    detail = queries.user_detail(db, user)
    detail["user"] = AdminUserRead.model_validate(user, from_attributes=True)
    return detail


@router.patch("/users/{user_id}/role", response_model=AdminUserRead)
def change_role(user_id: UUID, payload: RoleChangeRequest, request: Request, actor: Manager, service: Service):
    return _run(lambda: service.change_role(actor, user_id, payload.role, client_ip(request), user_agent(request)))


@router.post("/users/{user_id}/ban", response_model=AdminUserRead)
def ban_user(user_id: UUID, payload: BanRequest, request: Request, actor: Manager, service: Service):
    return _run(lambda: service.ban(actor, user_id, payload.reason, client_ip(request), user_agent(request)))


@router.post("/users/{user_id}/unban", response_model=AdminUserRead)
def unban_user(user_id: UUID, request: Request, actor: Manager, service: Service):
    return _run(lambda: service.unban(actor, user_id, client_ip(request), user_agent(request)))


@router.post("/users/{user_id}/revoke-sessions")
def revoke_sessions(user_id: UUID, request: Request, actor: Manager, service: Service):
    count = _run(lambda: service.revoke_sessions(actor, user_id, client_ip(request), user_agent(request)))
    return {"revoked": count}


@router.post("/users/bulk-ban")
def bulk_ban(payload: BulkRequest, request: Request, actor: Manager, service: Service):
    if not payload.reason:
        raise HTTPException(422, "A reason is required to ban users")
    return service.bulk_ban(actor, payload.user_ids, payload.reason, client_ip(request), user_agent(request))


@router.post("/users/bulk-unban")
def bulk_unban(payload: BulkRequest, request: Request, actor: Manager, service: Service):
    return service.bulk_unban(actor, payload.user_ids, client_ip(request), user_agent(request))


# ================= content moderation =================
@router.get("/content/reports")
def content_reports(_: Moderator, db: Db, division: Optional[str] = None, source: Optional[str] = None,
                    date_from: Optional[date] = None, date_to: Optional[date] = None, page: Page = 1, size: Size = 20):
    rows, total = queries.page_of(db, queries.reports_stmt(division, source, date_from, date_to), page, size)
    items = [{"id": r.id, "division": r.division, "report_date": r.report_date, "admitted": r.admitted,
              "deaths": r.deaths, "source": r.source} for r in rows]
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/content/watch-items")
def content_watch(_: Moderator, db: Db, q: Optional[str] = None, division: Optional[str] = None,
                  page: Page = 1, size: Size = 20):
    rows, total = queries.page_of(db, queries.watch_stmt(q, division), page, size)
    items = [{"id": w.id, "owner_email": email, "division": w.division, "threshold": w.threshold,
              "note": w.note, "created_at": w.created_at} for w, email in rows]
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/content/teams")
def content_teams(_: Moderator, db: Db, q: Optional[str] = None, page: Page = 1, size: Size = 20):
    rows, total = queries.page_of(db, queries.teams_stmt(q), page, size)
    items = [{"id": t.id, "name": t.name, "owner_email": email, "created_at": t.created_at,
              **queries.team_extra(db, t)} for t, email in rows]
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/content/{kind}/delete")
def delete_content(kind: str, payload: DeleteManyRequest, request: Request, actor: Moderator, db: Db):
    """Delete one or many records. kind = reports | watch-items | teams."""
    models = {"reports": DailyReport, "watch-items": WatchItem, "teams": Team}
    model = models.get(kind)
    if model is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown content type")
    deleted = 0
    for item_id in dict.fromkeys(payload.ids):
        row = db.get(model, item_id)
        if row is None:
            continue
        if isinstance(row, Team):
            delete_team_rows(db, row)
        else:
            db.delete(row)
        deleted += 1
    record(db, events.RECORD_DELETE, user_id=actor.id, email=actor.email, ip=client_ip(request),
           agent=user_agent(request), details=f"admin deleted {deleted} {kind}", commit=False)
    db.commit()
    return {"deleted": deleted}


# ================= activity log and security =================
@router.get("/audit")
def audit_log(_: AuditReader, db: Db, event: Optional[str] = None, q: Optional[str] = None,
              success: Optional[str] = None, date_from: Optional[date] = None, date_to: Optional[date] = None,
              user_id: Optional[UUID] = None, page: Page = 1, size: Size = 25):
    rows, total = queries.page_of(db, queries.audit_stmt(event, q, success, date_from, date_to, user_id), page, size)
    return {"items": queries.audit_rows(db, rows), "total": total, "page": page, "size": size}


@router.get("/audit/events")
def audit_event_names(_: AuditReader):
    """The event names for the filter drop-down."""
    return sorted(v for k, v in vars(events).items() if k.isupper() and isinstance(v, str))


@router.get("/security")
def security(_: AuditReader, db: Db, days: Annotated[int, Query(ge=1, le=90)] = 7):
    return queries.security(db, days)


# ================= CSV exports (they use the same filters as the lists) =================
def _logged(db: Session, request: Request, actor: User, what: str, count: int) -> None:
    record(db, events.EXPORT, user_id=actor.id, email=actor.email, ip=client_ip(request),
           agent=user_agent(request), details=f"{what}: {count} row(s)")


@router.get("/export/users.csv")
def export_users(request: Request, actor: Exporter, db: Db, q: Optional[str] = None,
                 role: Optional[str] = None, status_: Annotated[Optional[str], Query(alias="status")] = None):
    rows = db.exec(queries.users_stmt(q, role, status_).limit(queries.MAX_EXPORT_ROWS)).all()
    _logged(db, request, actor, "users export", len(rows))
    return csv_response("users", ["id", "name", "email", "role", "status", "ban_reason", "created_at", "last_login_at"],
                        [[u.id, u.name, u.email, u.role, "active" if u.is_active else "banned", u.ban_reason,
                          u.created_at, u.last_login_at] for u in rows])


@router.get("/export/records.csv")
def export_records(request: Request, actor: Exporter, db: Db, kind: str = "reports",
                   division: Optional[str] = None, source: Optional[str] = None,
                   date_from: Optional[date] = None, date_to: Optional[date] = None, q: Optional[str] = None):
    limit = queries.MAX_EXPORT_ROWS
    if kind == "reports":
        rows = db.exec(queries.reports_stmt(division, source, date_from, date_to).limit(limit)).all()
        header = ["id", "division", "report_date", "admitted", "deaths", "source"]
        data = [[r.id, r.division, r.report_date, r.admitted, r.deaths, r.source] for r in rows]
    elif kind == "watch-items":
        rows = db.exec(queries.watch_stmt(q, division).limit(limit)).all()
        header = ["id", "owner_email", "division", "threshold", "note", "created_at"]
        data = [[w.id, email, w.division, w.threshold, w.note, w.created_at] for w, email in rows]
    elif kind == "teams":
        rows = db.exec(queries.teams_stmt(q).limit(limit)).all()
        header = ["id", "name", "owner_email", "members", "items", "created_at"]
        data = [[t.id, t.name, email, *queries.team_extra(db, t).values(), t.created_at] for t, email in rows]
    else:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown content type")
    _logged(db, request, actor, f"{kind} export", len(data))
    return csv_response(kind.replace("-", "_"), header, data)


@router.get("/export/activity.csv")
def export_activity(request: Request, actor: Exporter, db: Db, event: Optional[str] = None, q: Optional[str] = None,
                    success: Optional[str] = None, date_from: Optional[date] = None, date_to: Optional[date] = None,
                    user_id: Optional[UUID] = None):
    rows = db.exec(queries.audit_stmt(event, q, success, date_from, date_to, user_id).limit(queries.MAX_EXPORT_ROWS)).all()
    data = queries.audit_rows(db, list(rows))
    _logged(db, request, actor, "activity export", len(data))
    return csv_response("activity", ["time", "event", "email", "ip_address", "user_agent", "success", "details"],
                        [[d["created_at"], d["event"], d["email"], d["ip_address"], d["user_agent"], d["success"],
                          d["details"]] for d in data])
