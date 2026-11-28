"""Read-only admin queries (statistics, searching, audit log, security view).

The filter helpers return an un-paginated statement, so the list endpoints and the CSV exports
use exactly the same filters.
"""

from datetime import date, datetime, time, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import distinct, func, or_
from sqlmodel import Session, col, select

from app.audit import events
from app.audit.models import AuditLog
from app.auth.models import User, UserSession
from app.clock import utcnow
from app.reports.models import DailyReport
from app.teams.models import Team, TeamItem, TeamMember
from app.watchlist.models import WatchItem

MAX_EXPORT_ROWS = 10000
FAILED_EVENTS = (events.LOGIN_FAILED, events.LOGIN_LOCKED, events.LOGIN_BLOCKED)


def like(text: str) -> str:
    return f"%{text.strip().lower()}%"


def count(db: Session, stmt) -> int:
    return db.exec(select(func.count()).select_from(stmt.subquery())).one()


def page_of(db: Session, stmt, page: int, size: int) -> tuple[list, int]:
    total = count(db, stmt)
    rows = db.exec(stmt.offset((page - 1) * size).limit(size)).all()
    return list(rows), total


# ----- overview -----
def overview(db: Session) -> dict:
    now = utcnow()
    week = now - timedelta(days=7)

    def n(model, *where) -> int:
        return db.exec(select(func.count()).select_from(model).where(*where)).one()

    return {
        "users": n(User),
        "admins": n(User, User.role == "admin"),
        "banned_users": n(User, User.is_active == False),  # noqa: E712
        "reports": n(DailyReport),
        "watch_items": n(WatchItem),
        "teams": n(Team),
        "new_users_7d": n(User, User.created_at >= week),
        "new_watch_items_7d": n(WatchItem, WatchItem.created_at >= week),
        "new_teams_7d": n(Team, Team.created_at >= week),
        "failed_logins_24h": n(AuditLog, col(AuditLog.event).in_(FAILED_EVENTS), AuditLog.created_at >= now - timedelta(days=1)),
        "active_sessions": n(UserSession, UserSession.revoked_at == None, UserSession.expires_at > now),  # noqa: E711
    }


# ----- users -----
def users_stmt(q: Optional[str], role: Optional[str], status: Optional[str]):
    stmt = select(User).order_by(col(User.created_at).desc())
    if q and q.strip():
        stmt = stmt.where(or_(col(User.email).ilike(like(q)), col(User.name).ilike(like(q))))
    if role in ("user", "admin"):
        stmt = stmt.where(User.role == role)
    if status == "banned":
        stmt = stmt.where(User.is_active == False)  # noqa: E712
    elif status == "active":
        stmt = stmt.where(User.is_active == True)  # noqa: E712
    return stmt


def user_detail(db: Session, user: User) -> dict:
    watch = db.exec(select(WatchItem).where(WatchItem.owner_id == user.id).order_by(WatchItem.division)).all()
    teams = []
    owned = db.exec(select(Team).where(Team.owner_id == user.id)).all()   # the owner has no team_member row
    for t in owned:
        teams.append({"id": t.id, "name": t.name, "is_owner": True,
                      "can_create": True, "can_update": True, "can_assign": True})
    for m in db.exec(select(TeamMember).where(TeamMember.user_id == user.id)).all():
        t = db.get(Team, m.team_id)
        if t and t.owner_id != user.id:
            teams.append({"id": t.id, "name": t.name, "is_owner": False,
                          "can_create": m.can_create, "can_update": m.can_update, "can_assign": m.can_assign})
    now = utcnow()
    sessions = db.exec(
        select(UserSession).where(UserSession.user_id == user.id, UserSession.revoked_at == None,  # noqa: E711
                                  UserSession.expires_at > now).order_by(col(UserSession.last_used_at).desc())
    ).all()
    activity = db.exec(select(AuditLog).where(AuditLog.user_id == user.id).order_by(col(AuditLog.created_at).desc()).limit(25)).all()
    return {
        "user": user,
        "watch_items": [{"id": w.id, "division": w.division, "threshold": w.threshold, "note": w.note,
                         "created_at": w.created_at} for w in watch],
        "teams": teams,
        "sessions": [{"id": s.id, "user_agent": s.user_agent, "ip_address": s.ip_address,
                      "created_at": s.created_at, "last_used_at": s.last_used_at} for s in sessions],
        "activity": [audit_row(a) for a in activity],
    }


# ----- content moderation -----
def reports_stmt(division: Optional[str], source: Optional[str], date_from: Optional[date], date_to: Optional[date]):
    stmt = select(DailyReport).order_by(col(DailyReport.report_date).desc(), DailyReport.division)
    if division:
        stmt = stmt.where(DailyReport.division == division)
    if source:
        stmt = stmt.where(DailyReport.source == source)
    if date_from:
        stmt = stmt.where(DailyReport.report_date >= date_from)
    if date_to:
        stmt = stmt.where(DailyReport.report_date <= date_to)
    return stmt


def watch_stmt(q: Optional[str], division: Optional[str]):
    stmt = (select(WatchItem, User.email).join(User, User.id == WatchItem.owner_id)
            .order_by(col(WatchItem.created_at).desc()))
    if division:
        stmt = stmt.where(WatchItem.division == division)
    if q and q.strip():
        stmt = stmt.where(or_(col(User.email).ilike(like(q)), col(WatchItem.note).ilike(like(q))))
    return stmt


def teams_stmt(q: Optional[str]):
    stmt = (select(Team, User.email).join(User, User.id == Team.owner_id).order_by(col(Team.created_at).desc()))
    if q and q.strip():
        stmt = stmt.where(or_(col(Team.name).ilike(like(q)), col(User.email).ilike(like(q))))
    return stmt


def team_extra(db: Session, team: Team) -> dict:
    members = db.exec(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team.id)).one()
    items = db.exec(select(func.count()).select_from(TeamItem).where(TeamItem.team_id == team.id)).one()
    return {"members": members + 1, "items": items}   # +1: the owner has no team_member row


# ----- activity log -----
def audit_stmt(event: Optional[str], q: Optional[str], success: Optional[str],
               date_from: Optional[date], date_to: Optional[date], user_id: Optional[UUID] = None):
    stmt = select(AuditLog).order_by(col(AuditLog.created_at).desc())
    if event:
        stmt = stmt.where(AuditLog.event == event)
    if success in ("true", "false"):
        stmt = stmt.where(AuditLog.success == (success == "true"))
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(AuditLog.created_at < datetime.combine(date_to + timedelta(days=1), time.min))
    if q and q.strip():
        pattern = like(q)
        stmt = stmt.where(or_(
            col(AuditLog.email).ilike(pattern), col(AuditLog.ip_address).ilike(pattern),
            col(AuditLog.details).ilike(pattern), col(AuditLog.event).ilike(pattern),
            col(AuditLog.user_id).in_(select(User.id).where(col(User.email).ilike(pattern))),
        ))
    return stmt


def audit_row(a: AuditLog, emails: Optional[dict] = None) -> dict:
    email = a.email or (emails or {}).get(a.user_id)
    return {"id": a.id, "created_at": a.created_at, "event": a.event, "email": email, "user_id": a.user_id,
            "ip_address": a.ip_address, "user_agent": a.user_agent, "details": a.details, "success": a.success}


def audit_rows(db: Session, rows: list[AuditLog]) -> list[dict]:
    ids = {a.user_id for a in rows if a.user_id and not a.email}
    emails = {}
    if ids:
        emails = {u.id: u.email for u in db.exec(select(User).where(col(User.id).in_(ids))).all()}
    return [audit_row(a, emails) for a in rows]


# ----- security view -----
def security(db: Session, days: int = 7) -> dict:
    now = utcnow()
    since = now - timedelta(days=days)
    failed = (col(AuditLog.event).in_(FAILED_EVENTS), AuditLog.created_at >= since)
    by_ip = db.exec(
        select(AuditLog.ip_address, func.count().label("n"), func.count(distinct(AuditLog.email)))
        .where(*failed, AuditLog.ip_address != "").group_by(AuditLog.ip_address)
        .order_by(func.count().desc()).limit(10)
    ).all()
    by_account = db.exec(
        select(AuditLog.email, func.count().label("n"), func.count(distinct(AuditLog.ip_address)))
        .where(*failed, col(AuditLog.email).is_not(None)).group_by(AuditLog.email)
        .order_by(func.count().desc()).limit(10)
    ).all()
    locked = db.exec(select(User).where(col(User.locked_until).is_not(None), User.locked_until > now)).all()
    return {
        "days": days,
        "total_failed": db.exec(select(func.count()).select_from(AuditLog).where(*failed)).one(),
        "by_ip": [{"ip_address": ip, "failures": n, "accounts": a} for ip, n, a in by_ip],
        "by_account": [{"email": e, "failures": n, "ips": i} for e, n, i in by_account],
        "locked_accounts": [{"id": u.id, "email": u.email, "locked_until": u.locked_until} for u in locked],
    }
