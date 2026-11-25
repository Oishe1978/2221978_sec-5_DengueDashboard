"""Tests for the RBAC rules. They need no database: the rules are plain functions.

Run from the backend folder:   pip install pytest   then   pytest tests -q
"""

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.rbac.permissions import Permission, has_permission, permissions_for
from app.rbac.policy import PolicyError, check_ban, check_role_change


def account(role: str):
    return SimpleNamespace(id=uuid4(), role=role)


# ----- permission matrix -----
def test_user_can_manage_own_watchlist_but_not_reports():
    assert has_permission("user", Permission.WATCHLIST_OWN)
    assert not has_permission("user", Permission.REPORTS_WRITE)


def test_user_has_no_admin_permissions():
    for permission in (Permission.USERS_MANAGE, Permission.USERS_READ, Permission.AUDIT_READ,
                       Permission.WATCHLIST_MODERATE, Permission.DATA_EXPORT):
        assert not has_permission("user", permission)


def test_admin_has_every_user_permission_plus_admin_ones():
    assert permissions_for("user") < permissions_for("admin")
    assert has_permission("admin", Permission.REPORTS_WRITE)
    assert has_permission("admin", Permission.USERS_MANAGE)


def test_unknown_role_is_denied_everything():
    assert permissions_for("hacker") == frozenset()
    assert not has_permission("hacker", Permission.WATCHLIST_OWN)


# ----- safety rules -----
def test_admin_cannot_change_own_role():
    admin = account("admin")
    with pytest.raises(PolicyError):
        check_role_change(admin, admin, "user")


def test_admin_can_change_another_users_role():
    check_role_change(account("admin"), account("user"), "admin")  # no exception


def test_unknown_role_value_is_rejected():
    with pytest.raises(PolicyError):
        check_role_change(account("admin"), account("user"), "superuser")


def test_admin_cannot_ban_another_admin():
    with pytest.raises(PolicyError):
        check_ban(account("admin"), account("admin"))


def test_admin_cannot_ban_self():
    admin = account("admin")
    with pytest.raises(PolicyError):
        check_ban(admin, admin)


def test_admin_can_ban_a_normal_user():
    check_ban(account("admin"), account("user"))  # no exception
