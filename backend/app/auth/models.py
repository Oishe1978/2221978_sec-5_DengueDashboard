from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "app_user"  # "user" is a reserved word in PostgreSQL

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    email: str = Field(index=True, unique=True, max_length=254)
    password_hash: str
    role: str = Field(default="user", max_length=10)  # user | admin
    is_active: bool = True
    created_at: datetime = Field(default_factory=_now)
