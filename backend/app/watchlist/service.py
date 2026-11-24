from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.clock import utcnow
from app.stats.repository import StatsRepository
from app.watchlist.models import WatchItem
from app.watchlist.repository import WatchRepository
from app.watchlist.schemas import WatchCreate, WatchUpdate


class WatchNotFoundError(Exception):
    pass


class DuplicateWatchError(Exception):
    pass


class WatchService:
    """Ownership rule: a user can only touch their own items. Anyone else's item looks like 'not found'."""

    def __init__(self, db: Session) -> None:
        self.repo = WatchRepository(db)
        self.stats = StatsRepository(db)

    def _owned(self, owner: User, item_id: UUID) -> WatchItem:
        item = self.repo.get(item_id)
        if item is None or item.owner_id != owner.id:  # 404 for both: do not reveal that it exists
            raise WatchNotFoundError
        return item

    def _view(self, item: WatchItem) -> dict:
        _, latest = self.stats.date_bounds(item.division)
        admitted = None
        if latest is not None:
            rows = self.stats.daily_totals(item.division, latest, latest)
            admitted = rows[0][1] if rows else None
        return {
            "id": item.id,
            "division": item.division,
            "threshold": item.threshold,
            "note": item.note,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "latest_date": latest,
            "latest_admitted": admitted,
            "alert": admitted is not None and admitted >= item.threshold,
        }

    def list_for(self, owner: User) -> list[dict]:
        return [self._view(item) for item in self.repo.list_by_owner(owner.id)]

    def get(self, owner: User, item_id: UUID) -> dict:
        return self._view(self._owned(owner, item_id))

    def create(self, owner: User, data: WatchCreate) -> dict:
        if self.repo.find_by_owner_and_division(owner.id, data.division):
            raise DuplicateWatchError
        note = data.note.strip() if data.note else None
        item = WatchItem(owner_id=owner.id, division=data.division, threshold=data.threshold, note=note or None)
        return self._view(self.repo.save(item))

    def update(self, owner: User, item_id: UUID, data: WatchUpdate) -> dict:
        item = self._owned(owner, item_id)
        changes = data.model_dump(exclude_unset=True)
        if "threshold" in changes and changes["threshold"] is not None:
            item.threshold = changes["threshold"]
        if "note" in changes:
            note = changes["note"].strip() if changes["note"] else None
            item.note = note or None
        item.updated_at = utcnow()
        return self._view(self.repo.save(item))

    def delete(self, owner: User, item_id: UUID) -> WatchItem:
        item = self._owned(owner, item_id)
        self.repo.remove(item)
        return item
