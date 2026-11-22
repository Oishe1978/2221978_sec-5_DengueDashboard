import hmac

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth.models import User
from app.auth.passwords import hash_password, verify_password
from app.auth.schemas import RegisterRequest
from app.config import ADMIN_SIGNUP_CODE

# Used to spend the same time on unknown e-mail addresses as on wrong passwords.
_DUMMY_HASH = hash_password("not-a-real-password")


class EmailTakenError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AccountDisabledError(Exception):
    pass


class AdminCodeError(Exception):
    pass


class AuthService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _find_by_email(self, email: str) -> User | None:
        return self.session.exec(select(User).where(User.email == email)).first()

    def register(self, data: RegisterRequest) -> User:
        if data.role == "admin":
            expected = ADMIN_SIGNUP_CODE
            given = data.admin_code or ""
            if not expected or not hmac.compare_digest(given.encode(), expected.encode()):
                raise AdminCodeError

        email = data.email.strip().lower()
        if self._find_by_email(email):
            raise EmailTakenError

        user = User(
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        self.session.add(user)
        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            raise EmailTakenError
        self.session.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User:
        user = self._find_by_email(email.strip().lower())
        if user is None:
            verify_password(password, _DUMMY_HASH)
            raise InvalidCredentialsError
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError
        if not user.is_active:
            raise AccountDisabledError
        return user
