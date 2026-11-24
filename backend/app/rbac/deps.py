from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.auth.deps import get_current_user
from app.auth.models import User
from app.rbac.permissions import has_permission


def require_permission(permission: str):
    """Dependency factory:  Depends(require_permission(Permission.REPORTS_WRITE))

    Request flow: token verified (401 if not) -> user loaded from the database (so a changed role
    or a ban applies immediately) -> permission checked (403 if missing) -> endpoint runs.
    """

    def dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if not has_permission(user.role, permission):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to do this")
        return user

    return dependency
