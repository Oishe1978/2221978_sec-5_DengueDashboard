from collections.abc import Iterator

from sqlalchemy.pool import NullPool
from sqlmodel import Session, SQLModel, create_engine

from app.config import DATABASE_URL


def _make_engine():
    if DATABASE_URL.startswith("sqlite"):
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    # Supabase transaction pooler: no client-side pooling and no prepared statements.
    return create_engine(DATABASE_URL, poolclass=NullPool, connect_args={"prepare_threshold": None})


engine = _make_engine()


def create_db_and_tables() -> None:
    from app.audit import models as audit_models  # noqa: F401  (registers the audit_log table)
    from app.auth import models as auth_models  # noqa: F401  (registers users and sessions)
    from app.reports import models  # noqa: F401  (registers the reports table)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
