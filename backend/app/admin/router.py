from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from app.admin.schemas import AdminUserRead, BanRequest, RoleChangeRequest
from app.admin.service import AdminService, AlreadyInStateError, UserNotFoundError
from app.auth.models import User
from app.auth.request_info import client_ip, user_agent
from app.database import get_session
from app.rbac.deps import require_permission
from app.rbac.permissions import Permission
from app.rbac.policy import PolicyError

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Everything under /admin needs the users:manage permission, which only admins have.
Actor = Annotated[User, Depends(require_permission(Permission.USERS_MANAGE))]


def get_service(db: Annotated[Session, Depends(get_session)]) -> AdminService:
    return AdminService(db)


Service = Annotated[AdminService, Depends(get_service)]


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


@router.patch("/users/{user_id}/role", response_model=AdminUserRead)
def change_role(user_id: UUID, payload: RoleChangeRequest, request: Request, actor: Actor, service: Service):
    return _run(lambda: service.change_role(actor, user_id, payload.role, client_ip(request), user_agent(request)))


@router.post("/users/{user_id}/ban", response_model=AdminUserRead)
def ban_user(user_id: UUID, payload: BanRequest, request: Request, actor: Actor, service: Service):
    return _run(lambda: service.ban(actor, user_id, payload.reason, client_ip(request), user_agent(request)))


@router.post("/users/{user_id}/unban", response_model=AdminUserRead)
def unban_user(user_id: UUID, request: Request, actor: Actor, service: Service):
    return _run(lambda: service.unban(actor, user_id, client_ip(request), user_agent(request)))
