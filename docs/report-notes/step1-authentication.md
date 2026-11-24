# Step 1: Authentication hardening (report notes)

These notes record what was built in this step, why, and how it works. Use them for the report
(PRD/SRS/TDD parts) and to prepare for the viva. Replace the placeholders with your own screenshots.

## 1. Requirements covered (brief section 2.1)

| Requirement | Where it is done |
|---|---|
| Passwords hashed with argon2, never plain text | `backend/app/auth/passwords.py` (Argon2id) |
| Server-side pepper from an environment variable | `PASSWORD_PEPPER`, applied with HMAC-SHA256 before hashing |
| Access token: signed JWT, 15 minutes or less, contains user id and role | `backend/app/auth/tokens.py` |
| Verified on every protected request; missing, invalid, tampered or expired returns 401 | `backend/app/auth/deps.py` |
| httpOnly refresh cookie with rotation | `backend/app/auth/router.py` (`/refresh`), `sessions.py` (`rotate`) |
| Logout that really invalidates the session | `/logout` revokes the session row; the access token carries the session id (`sid`) |
| Users can list and revoke their sessions | `GET /sessions`, `DELETE /sessions/{id}`, Profile page |
| Frontend refreshes or logs out when the server rejects a token; no flash of guest content | `frontend/src/api/http.ts`, `auth/AuthContext.tsx` |
| Profile update and password change (current password required, new password validated, failed attempts recorded) | `PATCH /me`, `POST /change-password`, `audit_log` |
| Brute-force protection (optional) | lockout after 5 wrong passwords for 15 minutes |
| Activity log events recorded | `backend/app/audit/` (viewing them in the admin dashboard is a later step) |

## 2. Data model

- `app_user`: id, name, email (unique), password_hash, role (`user` | `admin`), is_active (false = banned),
  created_at, last_login_at, failed_login_count, locked_until, banned_at, ban_reason.
- `user_session`: id, user_id, refresh_hash, prev_refresh_hash, created_at, last_used_at, expires_at,
  user_agent, ip_address, revoked_at, revoked_reason. One row per logged-in browser.
- `audit_log`: id, created_at, event, user_id, email, ip_address, user_agent, details, success.

Only a SHA-256 hash of each refresh token is stored. A database leak therefore does not reveal usable tokens.

## 3. Endpoints (`/api/v1/auth`)

| Method and path | Purpose | Auth |
|---|---|---|
| POST `/register` | Create an account (admin needs the admin code), start a session | public |
| POST `/login` | Check credentials, start a session, set the refresh cookie | public |
| POST `/refresh` | Trade the refresh cookie for a new access token; rotates the cookie | cookie |
| POST `/logout` | Revoke the session, clear the cookie | cookie |
| GET `/me`, PATCH `/me` | Read or update the profile | access token |
| POST `/change-password` | Change password; signs out the other devices | access token |
| GET `/sessions`, DELETE `/sessions/{id}` | List or revoke your own sessions | access token |

## 4. How the token flow works (explain this in the viva)

1. **Login.** The server verifies the password. Argon2 compares the hash of `HMAC(pepper, password)`.
   It creates a `user_session` row and a random refresh token. The refresh token goes to the browser in an
   httpOnly cookie, and only its hash is stored. The response body holds the access token, a JWT with
   `sub` (user id), `role`, `sid` (session id), `iat` and `exp` (15 minutes).
2. **Every protected request** sends `Authorization: Bearer <jwt>`. `get_current_auth` checks the signature
   and expiry, then loads the session (must exist, not revoked, not expired) and the user (must exist and be
   active). Any failure returns 401. Because the session is checked on every request, logout, "sign out a
   device" and a ban work on the very next request, not 15 minutes later.
3. **Expiry.** After 15 minutes the JWT fails verification and the API answers 401. The frontend catches that,
   calls `/refresh` once, and repeats the original request. If the refresh also fails, the user is shown as
   logged out.
4. **Refresh and rotation.** `/refresh` hashes the cookie value and finds the session. If the session is
   active it creates a new refresh token, stores its hash, keeps the old hash as `prev_refresh_hash`, and sends
   the new cookie. The old token no longer works.
5. **Reuse detection.** If the old token (matching `prev_refresh_hash`) is presented again, someone copied it.
   The whole session is revoked and a `refresh_reuse` event is logged.
6. **Page reload.** The access token lives only in memory, so a reload starts without one. The app calls
   `/refresh` first, with the cookie, and shows a loading state until it has the user. That is why guest
   content does not flash.
7. **Logout.** `/logout` revokes the session row and clears the cookie. Even a stolen access token stops
   working at once, because its session is revoked.

## 5. Design decisions and why

- **Argon2id plus pepper.** Argon2id is memory-hard and recommended for passwords. The pepper is a secret kept
  outside the database, so stolen hashes alone cannot be cracked offline.
- **Short access token (15 minutes).** Limits the damage of a leaked token. The refresh token gives a smooth
  experience without long-lived access tokens.
- **Refresh token in an httpOnly, SameSite=Lax cookie, path limited to `/api/v1/auth`.** JavaScript cannot read it
  (XSS cannot steal it). SameSite=Lax stops cross-site POSTs (CSRF). The path means the browser sends it only to
  the auth endpoints. `Secure` is on in production (https).
- **Access token in memory only.** Not in localStorage, so injected scripts cannot read it from storage.
- **Constant-time work for unknown emails** (a dummy hash is verified) and the same message for wrong email or wrong
  password, so the login form does not reveal which accounts exist.
- **Lockout.** 5 wrong passwords lock the account for 15 minutes; the attempts are written to the audit log.
- **Old accounts keep working.** Hashes from the previous step (scrypt) are accepted and upgraded to Argon2id at the
  next successful login.

## 6. Known limitations (be honest about these)

- No CSRF token. We rely on SameSite=Lax and on JSON-only endpoints.
- An access token in memory can still be used by an injected script while the page is open.
- Two tabs refreshing at exactly the same moment can trigger the reuse rule and sign one out (the frontend shares one
  refresh request inside a tab, but not across tabs).
- The IP address comes from `x-forwarded-for` and can be spoofed by a client; it is used for the audit trail only.
- The lockout message reveals that an account exists. No email verification or password reset yet.

## 7. Evidence to collect (screenshots and video)

- Login, then `/api/v1/auth/me` in the docs page with the token.
- An expired token rejected: set `JWT_ACCESS_MINUTES=1` locally, wait two minutes, call a protected endpoint (401).
- Browser devtools: the refresh cookie (HttpOnly, SameSite, Path) and a `/refresh` call replacing it.
- Profile page: the sessions list with "This device", and signing out another device.
- A wrong-password lockout (429) and the matching rows in `audit_log` (Supabase table editor).

## 8. Likely viva questions

- *What is in the JWT and why is `sid` there?* `sub`, `role`, `sid`, `type`, `iat`, `exp`. `sid` ties the token to a
  session row, so revoking the session invalidates the token immediately.
- *What happens when the token expires?* 401, one automatic refresh, then the request is repeated; if refresh fails, logout.
- *Why store only a hash of the refresh token?* A database leak must not give attackers usable tokens.
- *What would happen if the pepper were removed from the environment?* Nobody could log in: every verify would compute a
  different value. (On Vercel the app refuses to start hashing without it.)
- *Why is the session checked on every request?* So a ban, a logout or a revoke takes effect on the next request.
- *What does `SameSite=Lax` do?* The browser does not send the cookie on cross-site POST requests.
- *What if `algorithms=["HS256"]` were removed from `jwt.decode`?* The library could accept tokens signed with another
  algorithm, including `none`; pinning the algorithm prevents that.
