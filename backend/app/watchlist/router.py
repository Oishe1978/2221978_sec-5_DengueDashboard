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
from app.watchlist.schemas import WatchCreate, WatchRead, WatchUpdate
from app.watchlist.service import DuplicateWatchError, WatchNotFoundError, WatchService

router = APIRouter(prefix="/api/v1/watchlist", tags=["watchlist"])

NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Watchlist item not found")

# Every endpoint here needs the watchlist:own permission (users and admins have it).
Owner = Annotated[User, Depends(require_permission(Permission.WATCHLIST_OWN))]


def get_service(db: Annotated[Session, Depends(get_session)]) -> WatchService:
    return WatchService(db)


Service = Annotated[WatchService, Depends(get_service)]


@router.get("", response_model=list[WatchRead])
def list_items(user: Owner, service: Service):
    return service.list_for(user)


@router.post("", response_model=WatchRead, status_code=status.HTTP_201_CREATED)
def create_item(payload: WatchCreate, user: Owner, service: Service):
    try:
        return service.create(user, payload)
    except DuplicateWatchError:
        raise HTTPException(status.HTTP_409_CONFLICT, "You are already watching this division")


@router.get("/{item_id}", response_model=WatchRead)
def get_item(item_id: UUID, user: Owner, service: Service):
    try:
        return service.get(user, item_id)
    except WatchNotFoundError:
        raise NOT_FOUND


@router.patch("/{item_id}", response_model=WatchRead)
def update_item(item_id: UUID, payload: WatchUpdate, user: Owner, service: Service):
    try:
        return service.update(user, item_id, payload)
    except WatchNotFoundError:
        raise NOT_FOUND


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: UUID, request: Request, user: Owner, service: Service, db: Annotated[Session, Depends(get_session)]
):
    try:
        item = service.delete(user, item_id)
    except WatchNotFoundError:
        raise NOT_FOUND
    record(db, events.RECORD_DELETE, user_id=user.id, email=user.email, ip=client_ip(request),
           agent=user_agent(request), details=f"watchlist item {item.division}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
