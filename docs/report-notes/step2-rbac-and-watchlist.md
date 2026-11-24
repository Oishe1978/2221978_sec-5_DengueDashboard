# Step 2: RBAC, ownership rules and admin safety rules (report notes)

## 1. Requirements covered (brief section 2.2)

| Requirement | Where it is done |
|---|---|
| Roles (user, admin) stored in the database and enforced on the server for every endpoint | `app_user.role`; every protected endpoint uses `require_permission(...)` |
| One reusable RBAC module (permission constants and a dependency), not scattered role checks | `backend/app/rbac/` (`permissions.py`, `deps.py`, `policy.py`) |
| Ownership: a user can only read, change or delete their own records; others get 403 or 404 | Watchlist module: `WatchService._owned` returns 404 for other people's items |
| An admin cannot change their own role or ban another admin | `rbac/policy.py`, used by `admin/service.py` |
| A banned user is rejected on the very next request | `auth/deps.py` loads the user on every request and rejects `is_active = false`; banning also revokes all their sessions |
| Frontend route guards and role-based menus that match the server | `frontend/src/auth/permissions.ts`, `components/RequirePermission.tsx`, header menu |
| Content (user-owned records) a normal user manages alone | Watchlist: divisions a user follows, with an alert level |

## 2. Permission matrix

| Permission | user | admin |
|---|---|---|
| `profile:own` read and change own account | yes | yes |
| `watchlist:own` manage own watchlist items | yes | yes |
| `reports:write` create, edit, delete daily reports | no | yes |
| `users:read` see other users | no | yes |
| `users:manage` ban, unban, change roles | no | yes |
| `watchlist:moderate` see and delete anybody's watchlist items | no | yes |
| `audit:read` read the activity log | no | yes |
| `data:export` CSV exports | no | yes |

`users:read`, `watchlist:moderate`, `audit:read` and `data:export` are defined now and used by the admin
dashboard in the next step. A role that is not in the table gets no permissions (deny by default).

## 3. How an endpoint is protected (explain this in the viva)

Example: `POST /api/v1/reports` is declared with `Depends(require_permission(Permission.REPORTS_WRITE))`.

1. The request arrives with `Authorization: Bearer <access token>`.
2. `get_current_user` verifies the token (signature, expiry), loads the session and the user from the database.
   No token, a bad token or a banned user: **401**.
3. `require_permission` asks `has_permission(user.role, "reports:write")`. The role is read from the database,
   not from the token, so a role change takes effect immediately. Not allowed: **403**.
4. Only then does the endpoint run and answer (201 for a create).

The frontend uses the same permission names (the server sends the list in `/auth/me`), but hiding a menu item
is only convenience. A normal user who calls the API directly still gets 403.

## 4. Ownership rules (Watchlist)

- Table `watch_item`: id, owner_id, division, threshold, note, created_at, updated_at. One item per user and division.
- Every endpoint filters by the logged-in user. `WatchService._owned` loads the item and compares `owner_id` with the
  current user. If the item does not exist or belongs to someone else, the answer is the same **404**, so nobody can
  discover which ids exist.
- The list shows each item with the latest admissions for its division and whether that reached the alert level.

## 5. Admin safety rules

| Endpoint (needs `users:manage`) | Rules |
|---|---|
| PATCH `/api/v1/admin/users/{id}/role` | an admin cannot change their own role (403) |
| POST `/api/v1/admin/users/{id}/ban` (reason required) | cannot ban yourself or another admin (403); revokes all the user's sessions |
| POST `/api/v1/admin/users/{id}/unban` | clears the ban and any lockout |

Each action writes an activity log row: `role_change`, `user_ban`, `user_unban`. Deleting a report or a watchlist item writes `record_delete`.

## 6. Endpoints added or changed

| Method and path | Who |
|---|---|
| GET, POST `/api/v1/watchlist` | own items (user, admin) |
| GET, PATCH, DELETE `/api/v1/watchlist/{id}` | owner only |
| PATCH `/api/v1/admin/users/{id}/role`, POST `.../ban`, POST `.../unban` | admin |
| POST, PATCH, DELETE `/api/v1/reports...` | `reports:write` (admin), delete is logged |
| GET `/api/v1/auth/me` | now also returns `permissions` |

## 7. Tests and evidence

- Automated: `backend/tests/test_rbac.py` (10 tests on the permission matrix and the safety rules). Run `pytest tests -q`.
- Manual checks with two normal users and one admin are in the step instructions.
- Screenshots for the report: a normal user calling `POST /api/v1/reports` (403), user B opening user A's watchlist
  item (404), an admin trying to ban another admin (403), a banned user's next request (401), the activity log rows.

## 8. Limitations

- Permissions belong to roles, not to single users, and ownership is the only object-level rule so far.
- Shared groups with different member permissions come in the next step.
- Admin moderation lists and the activity log screen come with the admin dashboard.

## 9. Likely viva questions

- *Where is the role checked, and why not in the frontend only?* In `require_permission`, on the server for every request.
  A hidden button does not stop someone calling the API.
- *Why 404 instead of 403 for someone else's watchlist item?* It does not reveal that the item exists.
- *What happens if a banned user still holds a valid token?* The token passes the signature check, but `get_current_user`
  finds `is_active = false` (and the revoked sessions) and answers 401.
- *Why is the role read from the database and not from the JWT?* The JWT can be up to 15 minutes old; the database
  value makes role changes and bans immediate.
- *What stops an admin from locking everyone out?* `check_ban` forbids banning yourself or another admin, and
  `check_role_change` forbids changing your own role.
