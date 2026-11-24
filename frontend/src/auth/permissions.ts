import type { AuthUser } from "../types";

/** Same names as backend/app/rbac/permissions.py. The server decides; the UI only mirrors it. */
export const PERMISSIONS = {
  WATCHLIST_OWN: "watchlist:own",
  REPORTS_WRITE: "reports:write",
  USERS_MANAGE: "users:manage",
  USERS_READ: "users:read",
  AUDIT_READ: "audit:read",
  WATCHLIST_MODERATE: "watchlist:moderate",
  DATA_EXPORT: "data:export",
} as const;

/** Hiding a button is only convenience: every endpoint checks the permission again on the server. */
export function can(user: AuthUser | null, permission: string): boolean {
  return user !== null && user.permissions.includes(permission);
}
