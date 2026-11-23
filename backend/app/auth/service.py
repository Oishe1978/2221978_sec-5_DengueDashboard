import hmac
from datetime import timedelta
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.audit import events
from app.audit.service import record
from app.auth.models import User, UserSession
from app.auth.passwords import hash_password, needs_rehash, verify_password
from app.auth.policy import validate_new_password
from app.auth.schemas import RegisterRequest
from app.auth.sessions import InvalidRefreshError, SessionService
from app.clock import utcnow
from app.config import ADMIN_SIGNUP_CODE, LOCK_MINUTES, MAX_FAILED_LOGINS

# Used to spend the same time on unknown e-mail addresses as on wrong passwords.
_DUMMY_HASH = hash_password("not-a-real-password-1")


class EmailTakenError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AccountDisabledError(Exception):
    pass


class AccountLockedError(Exception):
    pass


class AdminCodeError(Exception):
    pass


class WeakPasswordError(Exception):
    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.sessions = SessionService(db)

    def _find_by_email(self, email: str) -> Optional[User]:
        return self.db.exec(select(User).where(User.email == email)).first()

    # ----- registration -----
    def register(self, data: RegisterRequest, ip: str, agent: str) -> tuple[User, UserSession, str]:
        email = data.email.strip().lower()

        if data.role == "admin":
            expected = ADMIN_SIGNUP_CODE
            given = data.admin_code or ""
            if not expected or not hmac.compare_digest(given.encode(), expected.encode()):
                record(self.db, events.ADMIN_CODE_REJECTED, email=email, ip=ip, agent=agent, success=False)
                raise AdminCodeError

        problems = validate_new_password(data.password, email=email, name=data.name)
        if problems:
            raise WeakPasswordError(problems)
        if self._find_by_email(email):
            raise EmailTakenError

        user = User(
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        self.db.add(user)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise EmailTakenError
        self.db.refresh(user)

        session, raw = self.sessions.start(user, ip, agent)
        record(self.db, events.REGISTER, user_id=user.id, email=email, ip=ip, agent=agent, commit=False)
        self.db.commit()
        self.db.refresh(session)
        return user, session, raw

    # ----- login -----
    def login(self, email: str, password: str, ip: str, agent: str) -> tuple[User, UserSession, str]:
        email = email.strip().lower()
        user = self._find_by_email(email)
        now = utcnow()

        if user is None:
            verify_password(password, _DUMMY_HASH)
            record(self.db, events.LOGIN_FAILED, email=email, ip=ip, agent=agent,
                   details="unknown account", success=False)
            raise InvalidCredentialsError

        if user.locked_until is not None and user.locked_until > now:
            record(self.db, events.LOGIN_LOCKED, user_id=user.id, email=email, ip=ip, agent=agent,
                   details="login attempt while locked", success=False)
            raise AccountLockedError

        if not verify_password(password, user.password_hash):
            user.failed_login_count += 1
            details = f"wrong password ({user.failed_login_count} in a row)"
            if user.failed_login_count >= MAX_FAILED_LOGINS:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_login_count = 0
                details = f"wrong password; account locked for {LOCK_MINUTES} minutes"
            self.db.add(user)
            record(self.db, events.LOGIN_FAILED, user_id=user.id, email=email, ip=ip, agent=agent,
                   details=details, success=False)
            raise InvalidCredentialsError

        if not user.is_active:
            record(self.db, events.LOGIN_BLOCKED, user_id=user.id, email=email, ip=ip, agent=agent,
                   details="account is banned", success=False)
            raise AccountDisabledError

        if needs_rehash(user.password_hash):  # upgrade old hashes while we hold the real password
            user.password_hash = hash_password(password)
        user.failed_login_count = 0
        user.locked_until = None
        user.last_login_at = now
        self.db.add(user)

        session, raw = self.sessions.start(user, ip, agent)
        record(self.db, events.LOGIN, user_id=user.id, email=email, ip=ip, agent=agent, commit=False)
        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(session)
        return user, session, raw

    # ----- refresh / logout -----
    def refresh(self, raw: str, ip: str, agent: str) -> tuple[User, UserSession, str]:
        session, new_raw = self.sessions.rotate(raw, ip, agent)
        user = self.db.get(User, session.user_id)
        if user is None or not user.is_active:
            self.sessions.revoke(session, "account disabled")
            self.db.commit()
            raise InvalidRefreshError
        return user, session, new_raw

    def logout(self, raw: str, ip: str, agent: str) -> None:
        session = self.sessions.find_by_refresh_token(raw)
        if session is None or session.revoked_at is not None:
            return
        self.sessions.revoke(session, "logout")
        record(self.db, events.LOGOUT, user_id=session.user_id, ip=ip, agent=agent, commit=False)
        self.db.commit()

    # ----- profile and password -----
    def update_profile(self, user: User, name: Optional[str], email: Optional[str], ip: str, agent: str) -> User:
        if name is not None:
            user.name = name.strip()
        if email is not None:
            new_email = email.strip().lower()
            if new_email != user.email:
                if self._find_by_email(new_email):
                    raise EmailTakenError
                user.email = new_email
        self.db.add(user)
        record(self.db, events.PROFILE_UPDATE, user_id=user.id, email=user.email, ip=ip, agent=agent, commit=False)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise EmailTakenError
        self.db.refresh(user)
        return user

    def change_password(
        self, user: User, current_session_id, current_password: str, new_password: str, ip: str, agent: str
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            record(self.db, events.PASSWORD_CHANGE_FAILED, user_id=user.id, email=user.email, ip=ip,
                   agent=agent, details="current password was wrong", success=False)
            raise InvalidCredentialsError

        problems = validate_new_password(new_password, email=user.email, name=user.name)
        if verify_password(new_password, user.password_hash):
            problems.append("The new password must be different from the current one.")
        if problems:
            raise WeakPasswordError(problems)

        user.password_hash = hash_password(new_password)
        self.db.add(user)
        revoked = self.sessions.revoke_all_except(user.id, current_session_id, "password changed")
        record(self.db, events.PASSWORD_CHANGE, user_id=user.id, email=user.email, ip=ip, agent=agent,
               details=f"{revoked} other session(s) signed out", commit=False)
        self.db.commit()
