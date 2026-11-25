"""The ONE place that says who may do what.

Roles are stored in the database (app_user.role). Each role maps to a set of permissions.
Endpoints ask for a permission (see rbac/deps.py); they never compare role names themselves.
"""


class Permission:
    PROFILE_OWN = "profile:own"                # read and change your own account
    WATCHLIST_OWN = "watchlist:own"            # create, read, change, delete your own watchlist items
    REPORTS_WRITE = "reports:write"            # create, change, delete daily reports
    USERS_READ = "users:read"                  # see other users (admin dashboard)
    USERS_MANAGE = "users:manage"              # ban, unban, change roles
    WATCHLIST_MODERATE = "watchlist:moderate"  # see and delete anybody's watchlist items
    AUDIT_READ = "audit:read"                  # read the activity log
    DATA_EXPORT = "data:export"                # CSV exports


USER_PERMISSIONS = frozenset({Permission.PROFILE_OWN, Permission.WATCHLIST_OWN})

ADMIN_PERMISSIONS = USER_PERMISSIONS | frozenset(
    {
        Permission.REPORTS_WRITE,
        Permission.USERS_READ,
        Permission.USERS_MANAGE,
        Permission.WATCHLIST_MODERATE,
        Permission.AUDIT_READ,
        Permission.DATA_EXPORT,
    }
)

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "user": USER_PERMISSIONS,
    "admin": ADMIN_PERMISSIONS,
}


def permissions_for(role: str) -> frozenset[str]:
    """Unknown roles get nothing (deny by default)."""
    return ROLE_PERMISSIONS.get(role, frozenset())


def has_permission(role: str, permission: str) -> bool:
    return permission in permissions_for(role)
