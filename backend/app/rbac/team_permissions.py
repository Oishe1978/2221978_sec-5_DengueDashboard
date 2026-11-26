"""Permissions INSIDE a team (group). Separate from the global role permissions in permissions.py.

A person has one of three relations to a team:
  owner   - created it; may do everything
  member  - added by the owner, with three switches: can_create, can_update, can_assign
  (none)  - not in the team; the team does not even appear to exist for them (404)
"""

from typing import Mapping, Optional


class TeamAction:
    VIEW = "team:view"
    CREATE_ITEM = "item:create"
    UPDATE_ITEM = "item:update"
    ASSIGN_ITEM = "item:assign"
    DELETE_ITEM = "item:delete"          # owner only
    RENAME_TEAM = "team:rename"          # owner only
    DELETE_TEAM = "team:delete"          # owner only
    MANAGE_MEMBERS = "members:manage"    # owner only


OWNER_ONLY = frozenset(
    {TeamAction.DELETE_ITEM, TeamAction.RENAME_TEAM, TeamAction.DELETE_TEAM, TeamAction.MANAGE_MEMBERS}
)

# which member switch unlocks which action
MEMBER_SWITCH = {
    TeamAction.CREATE_ITEM: "can_create",
    TeamAction.UPDATE_ITEM: "can_update",
    TeamAction.ASSIGN_ITEM: "can_assign",
}


def team_allows(role: Optional[str], switches: Mapping[str, bool], action: str) -> bool:
    """role is "owner", "member" or None. Deny by default."""
    if role == "owner":
        return True
    if role != "member":
        return False
    if action == TeamAction.VIEW:
        return True
    switch = MEMBER_SWITCH.get(action)
    return bool(switch and switches.get(switch, False))
