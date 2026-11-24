from uuid import UUID

from sqlmodel import Session

from app.audit import events
from app.audit.service import record
from app.auth.models import User
from app.auth.sessions import SessionService
from app.clock import utcnow
from app.rbac.policy import check_ban, check_role_change


class UserNotFoundError(Exception):
    pass


class AlreadyInStateError(Exception):
    pass


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get(self, user_id: UUID) -> User:
        user = self.db.get(User, user_id)
        if user is None:
            raise UserNotFoundError
        return user

    def change_role(self, actor: User, user_id: UUID, new_role: str, ip: str, agent: str) -> User:
        target = self._get(user_id)
        check_role_change(actor, target, new_role)          # safety rule: not your own role
        if target.role == new_role:
            raise AlreadyInStateError
        old_role = target.role
        target.role = new_role
        self.db.add(target)
        record(self.db, events.ROLE_CHANGE, user_id=target.id, email=target.email, ip=ip, agent=agent,
               details=f"{old_role} -> {new_role} by {actor.email}", commit=False)
        self.db.commit()
        self.db.refresh(target)
        return target

    def ban(self, actor: User, user_id: UUID, reason: str, ip: str, agent: str) -> User:
        target = self._get(user_id)
        check_ban(actor, target)                             # safety rules: not yourself, not another admin
        if not target.is_active:
            raise AlreadyInStateError
        target.is_active = False
        target.banned_at = utcnow()
        target.ban_reason = reason.strip()
        self.db.add(target)
        SessionService(self.db).revoke_all_except(target.id, None, "account banned")  # sign them out everywhere
        record(self.db, events.USER_BAN, user_id=target.id, email=target.email, ip=ip, agent=agent,
               details=f"by {actor.email}: {reason.strip()}", commit=False)
        self.db.commit()
        self.db.refresh(target)
        return target

    def unban(self, actor: User, user_id: UUID, ip: str, agent: str) -> User:
        target = self._get(user_id)
        if target.is_active:
            raise AlreadyInStateError
        target.is_active = True
        target.banned_at = None
        target.ban_reason = None
        target.failed_login_count = 0
        target.locked_until = None
        self.db.add(target)
        record(self.db, events.USER_UNBAN, user_id=target.id, email=target.email, ip=ip, agent=agent,
               details=f"by {actor.email}", commit=False)
        self.db.commit()
        self.db.refresh(target)
        return target
