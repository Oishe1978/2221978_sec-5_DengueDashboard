"""Names of the events written to the activity (audit) log."""

REGISTER = "register"
LOGIN = "login"
LOGIN_FAILED = "login_failed"
LOGIN_LOCKED = "login_locked"
LOGIN_BLOCKED = "login_blocked"          # correct password but the account is banned
ADMIN_CODE_REJECTED = "admin_code_rejected"
LOGOUT = "logout"
SESSION_REVOKED = "session_revoked"
REFRESH_REUSE = "refresh_reuse"          # an already-used refresh token was presented again
PASSWORD_CHANGE = "password_change"
PASSWORD_CHANGE_FAILED = "password_change_failed"
PROFILE_UPDATE = "profile_update"
