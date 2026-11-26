from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.clock import utcnow
from app.rbac.team_permissions import TeamAction, team_allows
from app.stats.alerts import latest_status
from app.stats.repository import StatsRepository
from app.teams.models import Team, TeamItem, TeamMember
from app.teams.repository import TeamRepository
from app.teams.schemas import ItemCreate, ItemUpdate, MemberAdd, MemberUpdate

ALL_ON = {"can_create": True, "can_update": True, "can_assign": True}


class TeamNotFoundError(Exception):
    """The team does not exist, or the user is not in it (the two look the same on purpose)."""


class TeamForbiddenError(Exception):
    """The user is in the team but may not do this."""


class ConflictError(Exception):
    pass


class TargetNotFoundError(Exception):
    pass


@dataclass
class Access:
    team: Team
    role: str                 # "owner" or "member"
    switches: dict[str, bool]


class TeamService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = TeamRepository(db)
        self.stats = StatsRepository(db)

    # ------------------------------------------------------------------ access control
    def _access(self, user: User, team_id: UUID) -> Access:
        team = self.repo.get_team(team_id)
        if team is None:
            raise TeamNotFoundError
        if team.owner_id == user.id:
            return Access(team, "owner", dict(ALL_ON))
        member = self.repo.get_member(team_id, user.id)
        if member is None:
            raise TeamNotFoundError          # outsiders cannot tell that the team exists
        return Access(
            team,
            "member",
            {"can_create": member.can_create, "can_update": member.can_update, "can_assign": member.can_assign},
        )

    @staticmethod
    def _need(access: Access, action: str, message: str) -> None:
        if not team_allows(access.role, access.switches, action):
            raise TeamForbiddenError(message)

    # ------------------------------------------------------------------ views
    def _summary(self, team: Team, role: str, switches: dict[str, bool], owner_name: str) -> dict:
        return {
            "id": team.id,
            "name": team.name,
            "owner_id": team.owner_id,
            "owner_name": owner_name,
            "my_role": role,
            "can_create": switches["can_create"],
            "can_update": switches["can_update"],
            "can_assign": switches["can_assign"],
            "member_count": self.repo.count_members(team.id) + 1,   # + the owner
            "item_count": self.repo.count_items(team.id),
            "created_at": team.created_at,
        }

    def list_for(self, user: User) -> list[dict]:
        owned = self.repo.teams_owned_by(user.id)
        memberships = {m.team_id: m for m in self.repo.memberships_of(user.id)}
        joined = self.repo.teams_by_ids(list(memberships))
        owners = self.repo.users_by_ids([t.owner_id for t in joined])
        out = [self._summary(t, "owner", dict(ALL_ON), user.name) for t in owned]
        for t in joined:
            m = memberships[t.id]
            switches = {"can_create": m.can_create, "can_update": m.can_update, "can_assign": m.can_assign}
            owner = owners.get(t.owner_id)
            out.append(self._summary(t, "member", switches, owner.name if owner else "?"))
        out.sort(key=lambda s: s["name"].lower())
        return out

    def detail(self, user: User, team_id: UUID) -> dict:
        access = self._access(user, team_id)
        team = access.team
        member_rows = self.repo.list_members(team.id)
        items = self.repo.list_items(team.id)
        ids = {team.owner_id, *[m.user_id for m in member_rows], *[i.created_by for i in items],
               *[i.assigned_to for i in items if i.assigned_to]}
        people = self.repo.users_by_ids(list(ids))
        owner = people.get(team.owner_id)

        members = [{
            "user_id": team.owner_id, "name": owner.name if owner else "?", "email": owner.email if owner else "",
            "is_owner": True, **ALL_ON,
        }]
        for m in member_rows:
            person = people.get(m.user_id)
            members.append({
                "user_id": m.user_id, "name": person.name if person else "?", "email": person.email if person else "",
                "is_owner": False, "can_create": m.can_create, "can_update": m.can_update, "can_assign": m.can_assign,
            })

        item_views = []
        for item in items:
            assignee = people.get(item.assigned_to) if item.assigned_to else None
            creator = people.get(item.created_by)
            item_views.append({
                "id": item.id, "division": item.division, "threshold": item.threshold, "note": item.note,
                "assigned_to": item.assigned_to, "assigned_to_name": assignee.name if assignee else None,
                "created_by_name": creator.name if creator else "?",
                "created_at": item.created_at, "updated_at": item.updated_at,
                **latest_status(self.stats, item.division, item.threshold),
            })
        return {
            "team": self._summary(team, access.role, access.switches, owner.name if owner else "?"),
            "members": members,
            "items": item_views,
        }

    # ------------------------------------------------------------------ team (owner)
    def create_team(self, user: User, name: str) -> Team:
        name = name.strip()
        if self.repo.find_team(user.id, name):
            raise ConflictError("You already have a team with that name")
        return self.repo.save(Team(name=name, owner_id=user.id))

    def rename(self, user: User, team_id: UUID, name: str) -> Team:
        access = self._access(user, team_id)
        self._need(access, TeamAction.RENAME_TEAM, "Only the team owner can rename the team")
        name = name.strip()
        other = self.repo.find_team(user.id, name)
        if other is not None and other.id != access.team.id:
            raise ConflictError("You already have a team with that name")
        access.team.name = name
        access.team.updated_at = utcnow()
        return self.repo.save(access.team)

    def delete_team(self, user: User, team_id: UUID) -> str:
        access = self._access(user, team_id)
        self._need(access, TeamAction.DELETE_TEAM, "Only the team owner can delete the team")
        name = access.team.name              # read before the row is gone
        self.repo.delete_team_cascade(access.team)
        return name

    # ------------------------------------------------------------------ members (owner)
    def add_member(self, user: User, team_id: UUID, data: MemberAdd) -> TeamMember:
        access = self._access(user, team_id)
        self._need(access, TeamAction.MANAGE_MEMBERS, "Only the team owner can manage members")
        target = self.repo.find_user_by_email(data.email.strip().lower())
        if target is None or not target.is_active:
            raise TargetNotFoundError
        if target.id == access.team.owner_id:
            raise ConflictError("The owner is already in the team")
        if self.repo.get_member(team_id, target.id):
            raise ConflictError("That person is already a member")
        member = TeamMember(
            team_id=team_id, user_id=target.id,
            can_create=data.can_create, can_update=data.can_update, can_assign=data.can_assign,
        )
        return self.repo.save(member)

    def update_member(self, user: User, team_id: UUID, member_id: UUID, data: MemberUpdate) -> TeamMember:
        access = self._access(user, team_id)
        self._need(access, TeamAction.MANAGE_MEMBERS, "Only the team owner can manage members")
        member = self.repo.get_member(team_id, member_id)
        if member is None:
            raise TargetNotFoundError
        changes = data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            if value is not None:
                setattr(member, key, value)
        return self.repo.save(member)

    def remove_member(self, user: User, team_id: UUID, member_id: UUID) -> None:
        access = self._access(user, team_id)
        leaving = access.role == "member" and member_id == user.id     # a member may always leave
        if not leaving:
            self._need(access, TeamAction.MANAGE_MEMBERS, "Only the team owner can manage members")
        member = self.repo.get_member(team_id, member_id)
        if member is None:
            raise TargetNotFoundError
        for item in self.repo.items_assigned_to(team_id, member_id):   # their assignments become free again
            item.assigned_to = None
            self.db.add(item)
        self.repo.remove(member)

    # ------------------------------------------------------------------ items
    def create_item(self, user: User, team_id: UUID, data: ItemCreate) -> TeamItem:
        access = self._access(user, team_id)
        self._need(access, TeamAction.CREATE_ITEM, "You do not have permission to add items")
        if self.repo.find_item_by_division(team_id, data.division):
            raise ConflictError("The team already follows that division")
        note = data.note.strip() if data.note else None
        item = TeamItem(team_id=team_id, division=data.division, threshold=data.threshold,
                        note=note or None, created_by=user.id)
        return self.repo.save(item)

    def _item(self, team_id: UUID, item_id: UUID) -> TeamItem:
        item = self.repo.get_item(team_id, item_id)
        if item is None:
            raise TargetNotFoundError
        return item

    def update_item(self, user: User, team_id: UUID, item_id: UUID, data: ItemUpdate) -> TeamItem:
        access = self._access(user, team_id)
        self._need(access, TeamAction.UPDATE_ITEM, "You do not have permission to edit items")
        item = self._item(team_id, item_id)
        changes = data.model_dump(exclude_unset=True)
        if changes.get("threshold") is not None:
            item.threshold = changes["threshold"]
        if "note" in changes:
            note = changes["note"].strip() if changes["note"] else None
            item.note = note or None
        item.updated_at = utcnow()
        return self.repo.save(item)

    def assign_item(self, user: User, team_id: UUID, item_id: UUID, assignee: Optional[UUID]) -> TeamItem:
        access = self._access(user, team_id)
        self._need(access, TeamAction.ASSIGN_ITEM, "You do not have permission to assign items")
        item = self._item(team_id, item_id)
        if assignee is not None and assignee != access.team.owner_id and not self.repo.get_member(team_id, assignee):
            raise TargetNotFoundError
        item.assigned_to = assignee
        item.updated_at = utcnow()
        return self.repo.save(item)

    def delete_item(self, user: User, team_id: UUID, item_id: UUID) -> str:
        access = self._access(user, team_id)
        self._need(access, TeamAction.DELETE_ITEM, "Only the team owner can delete items")
        item = self._item(team_id, item_id)
        division = item.division             # read before the row is gone
        self.repo.remove(item)
        return division
