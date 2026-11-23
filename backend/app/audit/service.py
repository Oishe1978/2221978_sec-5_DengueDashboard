from typing import Optional
from uuid import UUID

from sqlmodel import Session

from app.audit.models import AuditLog


def record(
    db: Session,
    event: str,
    *,
    user_id: Optional[UUID] = None,
    email: Optional[str] = None,
    ip: str = "",
    agent: str = "",
    details: Optional[str] = None,
    success: bool = True,
    commit: bool = True,
) -> None:
    """Add an audit row. With commit=False the caller saves it together with its own changes."""
    db.add(
        AuditLog(
            event=event,
            user_id=user_id,
            email=email,
            ip_address=ip,
            user_agent=agent,
            details=details[:500] if details else None,
            success=success,
        )
    )
    if commit:
        db.commit()
