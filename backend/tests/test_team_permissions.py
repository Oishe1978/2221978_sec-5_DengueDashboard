"""Tests for the permissions inside a team. No database needed.

Run from the backend folder:   pytest tests -q
"""

from app.rbac.team_permissions import OWNER_ONLY, TeamAction, team_allows

NO_SWITCHES = {"can_create": False, "can_update": False, "can_assign": False}
ALL_SWITCHES = {"can_create": True, "can_update": True, "can_assign": True}
ALL_ACTIONS = [
    TeamAction.VIEW, TeamAction.CREATE_ITEM, TeamAction.UPDATE_ITEM, TeamAction.ASSIGN_ITEM,
    TeamAction.DELETE_ITEM, TeamAction.RENAME_TEAM, TeamAction.DELETE_TEAM, TeamAction.MANAGE_MEMBERS,
]


def test_owner_may_do_everything():
    for action in ALL_ACTIONS:
        assert team_allows("owner", {}, action)


def test_outsider_may_do_nothing():
    for action in ALL_ACTIONS:
        assert not team_allows(None, ALL_SWITCHES, action)


def test_member_without_switches_can_only_view():
    assert team_allows("member", NO_SWITCHES, TeamAction.VIEW)
    for action in ALL_ACTIONS[1:]:
        assert not team_allows("member", NO_SWITCHES, action)


def test_each_switch_unlocks_exactly_one_action():
    assert team_allows("member", {**NO_SWITCHES, "can_create": True}, TeamAction.CREATE_ITEM)
    assert not team_allows("member", {**NO_SWITCHES, "can_create": True}, TeamAction.UPDATE_ITEM)
    assert team_allows("member", {**NO_SWITCHES, "can_update": True}, TeamAction.UPDATE_ITEM)
    assert not team_allows("member", {**NO_SWITCHES, "can_update": True}, TeamAction.ASSIGN_ITEM)
    assert team_allows("member", {**NO_SWITCHES, "can_assign": True}, TeamAction.ASSIGN_ITEM)
    assert not team_allows("member", {**NO_SWITCHES, "can_assign": True}, TeamAction.CREATE_ITEM)


def test_owner_only_actions_are_denied_even_to_a_member_with_all_switches():
    for action in OWNER_ONLY:
        assert not team_allows("member", ALL_SWITCHES, action)


def test_owner_only_set_matches_the_brief():
    assert OWNER_ONLY == {
        TeamAction.DELETE_ITEM, TeamAction.RENAME_TEAM, TeamAction.DELETE_TEAM, TeamAction.MANAGE_MEMBERS,
    }
