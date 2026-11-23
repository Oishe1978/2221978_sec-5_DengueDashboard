"""Login sessions. One row per logged-in browser; the refresh token is rotated on every use."""

from datetime import timedelta
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.audit import events
from app.audit.service import record
from app.auth.models import User, UserSession
from app.auth.tokens import hash_refresh_token, new_refresh_token
from app.clock import utcnow
from app.config import REFRESH_DAYS


class InvalidRefreshError(Exception):
    pass


class SessionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ----- create / look up -----
    def start(self, user: User, ip: str, agent: str) -> tuple[UserSession, str]:
        """Create a session. Returns it with the raw refresh token (shown to the browser once)."""
        raw = new_refresh_token()
        now = utcnow()
        session = UserSession(
            user_id=user.id,
            refresh_hash=hash_refresh_token(raw),
            expires_at=now + timedelta(days=REFRESH_DAYS),
            created_at=now,
            last_used_at=now,
            user_agent=agent,
            ip_address=ip,
        )
        self.db.add(session)
        return session, raw  # the caller commits

    def get_active(self, session_id: UUID) -> Optional[UserSession]:
        session = self.db.get(UserSession, session_id)
        if session is None or session.revoked_at is not None or session.expires_at <= utcnow():
            return None
        return session

    def find_by_refresh_token(self, raw: str) -> Optional[UserSession]:
        return self.db.exec(
            select(UserSession).where(UserSession.refresh_hash == hash_refresh_token(raw))
        ).first()

    def list_active(self, user_id: UUID) -> list[UserSession]:
        stmt = (
            select(UserSession)
            .where(UserSession.user_id == user_id)
            .where(UserSession.revoked_at == None)  # noqa: E711  (SQL "IS NULL")
            .where(UserSession.expires_at > utcnow())
            .order_by(UserSession.last_used_at.desc())
        )
        return list(self.db.exec(stmt).all())

    # ----- rotate (refresh) -----
    def rotate(self, raw: str, ip: str, agent: str) -> tuple[UserSession, str]:
        """Swap the presented refresh token for a new one.

        Reuse detection: if an *old* (already replaced) token shows up again, someone copied it,
        so the whole session is revoked.
        """
        digest = hash_refresh_token(raw)
        session = self.db.exec(select(UserSession).where(UserSession.refresh_hash == digest)).first()

        if session is None:
            reused = self.db.exec(
                select(UserSession).where(UserSession.prev_refresh_hash == digest)
            ).first()
            if reused is not None and reused.revoked_at is None:
                self._revoke(reused, "refresh token reuse")
                record(
                    self.db, events.REFRESH_REUSE, user_id=reused.user_id, ip=ip, agent=agent,
                    details="an old refresh token was presented again", success=False, commit=False,
                )
                self.db.commit()
            raise InvalidRefreshError

        if session.revoked_at is not None or session.expires_at <= utcnow():
            raise InvalidRefreshError

        new_raw = new_refresh_token()
        session.prev_refresh_hash = session.refresh_hash
        session.refresh_hash = hash_refresh_token(new_raw)
        session.last_used_at = utcnow()
        session.ip_address = ip or session.ip_address
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session, new_raw

    # ----- revoke -----
    def _revoke(self, session: UserSession, reason: str) -> None:
        session.revoked_at = utcnow()
        session.revoked_reason = reason
        self.db.add(session)

    def revoke(self, session: UserSession, reason: str) -> None:
        self._revoke(session, reason)  # the caller commits

    def revoke_all_except(self, user_id: UUID, keep_id: Optional[UUID], reason: str) -> int:
        count = 0
        for session in self.list_active(user_id):
            if session.id != keep_id:
                self._revoke(session, reason)
                count += 1
        return count
