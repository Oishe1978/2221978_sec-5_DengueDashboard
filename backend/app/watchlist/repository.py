from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.watchlist.models import WatchItem


class WatchRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_owner(self, owner_id: UUID) -> list[WatchItem]:
        stmt = select(WatchItem).where(WatchItem.owner_id == owner_id).order_by(WatchItem.created_at)
        return list(self.db.exec(stmt).all())

    def get(self, item_id: UUID) -> Optional[WatchItem]:
        return self.db.get(WatchItem, item_id)

    def find_by_owner_and_division(self, owner_id: UUID, division: str) -> Optional[WatchItem]:
        stmt = select(WatchItem).where(WatchItem.owner_id == owner_id, WatchItem.division == division)
        return self.db.exec(stmt).first()

    def save(self, item: WatchItem) -> WatchItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove(self, item: WatchItem) -> None:
        self.db.delete(item)
        self.db.commit()
