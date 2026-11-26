from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from app.audit import events
from app.audit.service import record
from app.auth.models import User
from app.auth.request_info import client_ip, user_agent
from app.database import get_session
from app.rbac.deps import require_permission
from app.rbac.permissions import Permission
from app.teams.schemas import (
    AssignRequest,
    ItemCreate,
    ItemRead,
    ItemUpdate,
    MemberAdd,
    MemberRead,
    MemberUpdate,
    TeamDetail,
    TeamName,
    TeamSummary,
)
from app.teams.service import (
    ConflictError,
    TargetNotFoundError,
    TeamForbiddenError,
    TeamNotFoundError,
    TeamService,
)

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])

# Every endpoint needs the teams:use permission; what you may do inside a team is decided by TeamService.
Me = Annotated[User, Depends(require_permission(Permission.TEAMS_USE))]
Db = Annotated[Session, Depends(get_session)]


def get_service(db: Db) -> TeamService:
    return TeamService(db)


Service = Annotated[TeamService, Depends(get_service)]


def _run(action):
    """Turn the service's exceptions into HTTP errors in one place."""
    try:
        return action()
    except TeamNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    except TeamForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(e))
    except ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    except TargetNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found in this team (check the email or the item)")


def _summary(service: TeamService, user: User, team_id: UUID) -> dict:
    return service.detail(user, team_id)["team"]


# ---------------------------------------------------------------- teams
@router.get("", response_model=list[TeamSummary])
def list_teams(user: Me, service: Service):
    return service.list_for(user)


@router.post("", response_model=TeamSummary, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamName, user: Me, service: Service):
    team = _run(lambda: service.create_team(user, payload.name))
    return _summary(service, user, team.id)


@router.get("/{team_id}", response_model=TeamDetail)
def get_team(team_id: UUID, user: Me, service: Service):
    return _run(lambda: service.detail(user, team_id))


@router.patch("/{team_id}", response_model=TeamSummary)
def rename_team(team_id: UUID, payload: TeamName, user: Me, service: Service):
    _run(lambda: service.rename(user, team_id, payload.name))
    return _summary(service, user, team_id)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: UUID, request: Request, user: Me, service: Service, db: Db):
    name = _run(lambda: service.delete_team(user, team_id))
    record(db, events.RECORD_DELETE, user_id=user.id, email=user.email, ip=client_ip(request),
           agent=user_agent(request), details=f"team {name}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- members (owner only)
@router.post("/{team_id}/members", response_model=list[MemberRead], status_code=status.HTTP_201_CREATED)
def add_member(team_id: UUID, payload: MemberAdd, user: Me, service: Service):
    _run(lambda: service.add_member(user, team_id, payload))
    return service.detail(user, team_id)["members"]


@router.patch("/{team_id}/members/{member_id}", response_model=list[MemberRead])
def update_member(team_id: UUID, member_id: UUID, payload: MemberUpdate, user: Me, service: Service):
    _run(lambda: service.update_member(user, team_id, member_id, payload))
    return service.detail(user, team_id)["members"]


@router.delete("/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(team_id: UUID, member_id: UUID, user: Me, service: Service):
    _run(lambda: service.remove_member(user, team_id, member_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- items
@router.post("/{team_id}/items", response_model=list[ItemRead], status_code=status.HTTP_201_CREATED)
def create_item(team_id: UUID, payload: ItemCreate, user: Me, service: Service):
    _run(lambda: service.create_item(user, team_id, payload))
    return service.detail(user, team_id)["items"]


@router.patch("/{team_id}/items/{item_id}", response_model=list[ItemRead])
def update_item(team_id: UUID, item_id: UUID, payload: ItemUpdate, user: Me, service: Service):
    _run(lambda: service.update_item(user, team_id, item_id, payload))
    return service.detail(user, team_id)["items"]


@router.post("/{team_id}/items/{item_id}/assign", response_model=list[ItemRead])
def assign_item(team_id: UUID, item_id: UUID, payload: AssignRequest, user: Me, service: Service):
    _run(lambda: service.assign_item(user, team_id, item_id, payload.user_id))
    return service.detail(user, team_id)["items"]


@router.delete("/{team_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(team_id: UUID, item_id: UUID, request: Request, user: Me, service: Service, db: Db):
    division = _run(lambda: service.delete_item(user, team_id, item_id))
    record(db, events.RECORD_DELETE, user_id=user.id, email=user.email, ip=client_ip(request),
           agent=user_agent(request), details=f"team item {division}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
