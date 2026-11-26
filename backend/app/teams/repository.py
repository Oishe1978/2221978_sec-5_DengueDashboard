from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.auth.models import User
from app.teams.models import Team, TeamItem, TeamMember


class TeamRepository:
    """All database access for teams."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # teams
    def get_team(self, team_id: UUID) -> Optional[Team]:
        return self.db.get(Team, team_id)

    def teams_owned_by(self, user_id: UUID) -> list[Team]:
        return list(self.db.exec(select(Team).where(Team.owner_id == user_id)).all())

    def teams_by_ids(self, ids: list[UUID]) -> list[Team]:
        if not ids:
            return []
        return list(self.db.exec(select(Team).where(Team.id.in_(ids))).all())

    def find_team(self, owner_id: UUID, name: str) -> Optional[Team]:
        stmt = select(Team).where(Team.owner_id == owner_id, func.lower(Team.name) == name.lower())
        return self.db.exec(stmt).first()

    # members
    def memberships_of(self, user_id: UUID) -> list[TeamMember]:
        return list(self.db.exec(select(TeamMember).where(TeamMember.user_id == user_id)).all())

    def get_member(self, team_id: UUID, user_id: UUID) -> Optional[TeamMember]:
        stmt = select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        return self.db.exec(stmt).first()

    def list_members(self, team_id: UUID) -> list[TeamMember]:
        stmt = select(TeamMember).where(TeamMember.team_id == team_id).order_by(TeamMember.added_at)
        return list(self.db.exec(stmt).all())

    def count_members(self, team_id: UUID) -> int:
        return self.db.exec(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id)).one()

    # items
    def list_items(self, team_id: UUID) -> list[TeamItem]:
        stmt = select(TeamItem).where(TeamItem.team_id == team_id).order_by(TeamItem.created_at)
        return list(self.db.exec(stmt).all())

    def count_items(self, team_id: UUID) -> int:
        return self.db.exec(select(func.count()).select_from(TeamItem).where(TeamItem.team_id == team_id)).one()

    def get_item(self, team_id: UUID, item_id: UUID) -> Optional[TeamItem]:
        item = self.db.get(TeamItem, item_id)
        return item if item is not None and item.team_id == team_id else None

    def find_item_by_division(self, team_id: UUID, division: str) -> Optional[TeamItem]:
        stmt = select(TeamItem).where(TeamItem.team_id == team_id, TeamItem.division == division)
        return self.db.exec(stmt).first()

    def items_assigned_to(self, team_id: UUID, user_id: UUID) -> list[TeamItem]:
        stmt = select(TeamItem).where(TeamItem.team_id == team_id, TeamItem.assigned_to == user_id)
        return list(self.db.exec(stmt).all())

    # users
    def users_by_ids(self, ids: list[UUID]) -> dict[UUID, User]:
        if not ids:
            return {}
        users = self.db.exec(select(User).where(User.id.in_(ids))).all()
        return {u.id: u for u in users}

    def find_user_by_email(self, email: str) -> Optional[User]:
        return self.db.exec(select(User).where(User.email == email)).first()

    # generic
    def save(self, obj):
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def remove(self, obj) -> None:
        self.db.delete(obj)
        self.db.commit()

    def delete_team_cascade(self, team: Team) -> None:
        for item in self.list_items(team.id):
            self.db.delete(item)
        for member in self.list_members(team.id):
            self.db.delete(member)
        self.db.delete(team)
        self.db.commit()
