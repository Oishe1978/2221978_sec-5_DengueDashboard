# Step 3A: Teams with member permissions (report notes)

## 1. Requirements covered (brief section 2.2)

| Requirement | Where it is done |
|---|---|
| The main resource can be shared in groups where members have different permissions (create, update, assign) | `Team`, `TeamMember` (three switches), `TeamItem` |
| Only the owner can delete, rename or manage members | `OWNER_ONLY` in `backend/app/rbac/team_permissions.py` |
| One reusable RBAC module, not scattered checks | `team_allows(...)` is the single decision function; `TeamService._need` calls it |
| Other users cannot see a team they are not in | outsiders get 404 (`TeamService._access`) |
| Frontend role-based menus and guards that match the server | Teams link and routes use the `teams:use` permission; buttons are shown only when the server-sent switches allow |

## 2. Data model

- `team`: id, name, owner_id, created_at, updated_at. A user cannot have two teams with the same name.
- `team_member`: team_id, user_id (together the key), can_create, can_update, can_assign, added_at. The owner has no row; ownership is `team.owner_id`.
- `team_item`: id, team_id, division, threshold, note, assigned_to, created_by, created_at, updated_at. One item per division per team.

## 3. Who may do what inside a team

| Action | Owner | Member | Not in the team |
|---|---|---|---|
| View the team, its items and people | yes | yes | 404 |
| Create an item | yes | only with `can_create` | 404 |
| Edit an item (alert level, note) | yes | only with `can_update` | 404 |
| Assign an item to a person | yes | only with `can_assign` | 404 |
| Delete an item | yes | **no** | 404 |
| Rename the team | yes | **no** | 404 |
| Delete the team | yes | **no** | 404 |
| Add, remove or change members | yes | **no** (a member may remove themselves, that is "leave") | 404 |

A member who lacks a switch gets **403** with a clear message. A person who is not in the team gets **404**, so the team's
existence is not revealed. Everyone needs the global `teams:use` permission first (users and admins have it).

## 4. Endpoints (`/api/v1/teams`)

| Method and path | Needs |
|---|---|
| GET `/` | logged in (`teams:use`): teams you own or belong to |
| POST `/` | create a team (you become the owner) |
| GET `/{id}` | member or owner |
| PATCH `/{id}` | owner: rename |
| DELETE `/{id}` | owner: deletes the team with its items and members |
| POST `/{id}/members` | owner: add a registered user by email, with the three switches |
| PATCH `/{id}/members/{userId}` | owner: change the switches |
| DELETE `/{id}/members/{userId}` | owner, or the member themselves (leave) |
| POST `/{id}/items` | owner or `can_create` |
| PATCH `/{id}/items/{itemId}` | owner or `can_update` |
| POST `/{id}/items/{itemId}/assign` | owner or `can_assign`; the assignee must be in the team |
| DELETE `/{id}/items/{itemId}` | owner |

Deleting a team or an item writes a `record_delete` row in the activity log.

## 5. How a request is decided (explain this in the viva)

1. `require_permission("teams:use")` checks the token and the global permission.
2. `TeamService._access(user, team_id)` finds the team. The user is either the owner (all switches on), a member (the
   switches from `team_member`), or neither: the answer is 404.
3. `TeamService._need(access, action, message)` calls `team_allows(role, switches, action)`. If it returns false the answer is 403.
4. Only then does the action run.

`team_allows` is a pure function with unit tests (`backend/tests/test_team_permissions.py`): the owner may do everything,
an outsider nothing, a member only what the three switches allow, and the four owner-only actions are denied to every member
even if all three switches are on.

## 6. Design decisions and why

- **Switches per member** instead of fixed roles: the owner can give one person "create and assign" and another "view only".
- **Owner-only deletion and member management** follows the brief; the stricter reading (members cannot delete items) is used.
- **404 for outsiders** avoids revealing which team ids exist.
- **Removing a member frees their assigned items** so nothing stays assigned to someone who left.

## 7. Limitations

- There are no invitations: the owner adds someone who is already registered, by email.
- A team has exactly one owner and ownership cannot be transferred.
- Admin moderation of teams (listing and deleting any team) comes with the admin dashboard.

## 8. Evidence to collect

- A member without `can_create` trying to add an item: 403 message in the page and in the docs page.
- A user who is not in the team calling `GET /api/v1/teams/{id}`: 404.
- A member with all three switches trying to rename or delete the team: 403.
- The team page as owner (people table with checkboxes) next to the same team as a member (read-only ticks).

## 9. Likely viva questions

- *Where is the group permission decided?* In `team_allows`, called by `TeamService._need` for every action.
- *Why is `delete` not a switch?* The brief reserves it for the owner, so it is a fixed rule that no switch can unlock.
- *Why does an outsider get 404 and a member without permission get 403?* A member already knows the team exists; an outsider must not learn that.
- *What happens to a person's assigned items when they are removed?* They are set back to unassigned in the same operation.
- *How do global roles and team permissions fit together?* Global: `teams:use` lets you take part at all. Team: the owner/member switches decide what you may do in that team.
