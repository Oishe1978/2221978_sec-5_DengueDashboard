"""Safety rules for administrators. Plain functions, so they are easy to read and to test."""

from typing import Protocol
from uuid import UUID


class _Account(Protocol):
    id: UUID
    role: str


class PolicyError(Exception):
    """A rule was broken; the endpoint turns this into 403 Forbidden."""


def check_role_change(actor: _Account, target: _Account, new_role: str) -> None:
    if new_role not in ("user", "admin"):
        raise PolicyError("Unknown role")
    if actor.id == target.id:
        raise PolicyError("You cannot change your own role")


def check_ban(actor: _Account, target: _Account) -> None:
    if actor.id == target.id:
        raise PolicyError("You cannot ban yourself")
    if target.role == "admin":
        raise PolicyError("An admin cannot ban another admin")
