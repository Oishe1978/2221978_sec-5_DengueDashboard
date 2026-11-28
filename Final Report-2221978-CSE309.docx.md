# **Final Project Submission Report**

Independent University, Bangladesh. CSE309 Web Application and Internet. Semester: Autumn 2026\.

| Item | Value |
| :---- | :---- |
| Submitted by | Jannatul Taiaba Oishe |
| Student ID | 2221978 |
| Section | 5 |
| Team number | No |
| Project title | Dengue Dashboard and Analytics System (secure multi-user application) |
| Vercel URL | [2221978\_sec-05\_danguedashboard \- Overview – Vercel](https://vercel.com/abcd-75ef/2221978_sec-05_danguedashboard)  |
| GitHub repository | https\://github.com/Oishe1978/2221978\_sec-5\_DengueDashboard |
| Submitted to | Sayef Reyadh, Adjunct Lecturer, Department of Computer Science and Engineering |
| Date of submission | 28 November 2026 |

*Draft status: this report describes the system as built up to Step 3A (reports, analytics dashboard, authentication, RBAC, watchlist and teams). Everything about the admin dashboard screens (FR-ADM, section C8, screenshots S10 to S17) is marked Pending and must be completed or removed once those screens exist. Replace every item in square brackets and remove this box before submitting. Never write test account passwords in this file; put them only in the PDF appendix.*

## **1\. Executive Summary**

### **1.1 Project overview**

The Dengue Dashboard and Analytics System lets public health officials and citizens in Bangladesh follow daily dengue admissions and deaths for each division. Visitors see an interactive dashboard with charts and a report for any chosen date. Registered users keep a personal watchlist of divisions with an alert level and work together in teams. Administrators manage the data and the accounts. The stack is React with TypeScript (Vite), FastAPI with SQLModel, a PostgreSQL database on Supabase, and deployment on Vercel.

### **1.2 What was built since the mid assessment**

* JWT authentication: Argon2id password hashing with a secret pepper, a 15-minute access token, an httpOnly refresh cookie with rotation and reuse detection, real logout, session list and revoke, profile update, password change, and lockout after repeated wrong passwords.  
* Role based access control: one RBAC module with permission constants, ownership rules for the personal watchlist, and administrator safety rules (no own role change, no banning an admin, a banned user is rejected on the next request).  
* Teams: shared watchlists where the owner gives each member the permissions create, update and assign, and only the owner can delete, rename or manage members.  
* Audit logging of security events, row level security on the database tables, and deployment of the frontend and the API on Vercel with a hosted database.  
* Admin dashboard screens (statistics, users, moderation, activity log, security view, exports): Pending.

### **1.3 Live links**

| Item | Link |
| :---- | :---- |
| GitHub repository | https\://github.com/Oishe1978/2221978\_sec-5\_DengueDashboard |
| Vercel frontend | [Deployments – Vercel](https://vercel.com/abcd-75ef/~/deployments)  |
| API |  |
| API documentation | \[paste, ends with /api/docs\] |
| Video demo | \[paste\] |

## **Part A. Product Requirements (PRD)**

### **A1. Problem Statement**

Dengue outbreaks return every year. The daily numbers are published by the health authority as separate bulletins, so it is hard for officials and citizens to see trends, compare divisions or notice that a division is getting worse. Teams that follow the situation also have no shared place to agree which divisions need attention, who looks after which one, and at what level an alert should be raised. Without access control such a tool would also let anyone change the data or see other people's work.

### **A2. Users and Roles**

| Role | Who they are | Main tasks | Must never be able to |
| :---- | :---- | :---- | :---- |
| Visitor | Anyone without an account | View the public dashboard and the report of a date, register, log in | Change data, see accounts or private records |
| User | A registered person | Keep a personal watchlist, create or join teams, edit own profile and sessions | See or change another user's watchlist, write daily reports, use admin functions |
| Team owner | The user who created a team | Add and remove members, set their permissions, rename and delete the team, delete items | Act in teams they do not belong to |
| Team member | A user added to a team | View the team; create, edit or assign items only if the owner allowed it | Delete items, rename or delete the team, manage members |
| Admin | A trusted account created with the admin code | Create, edit and delete daily reports, ban and unban users, change roles | Change their own role, ban themselves or another admin |

### **A3. Goals and Success Measures**

| Goal | Measure |
| :---- | :---- |
| Make the dengue situation easy to read | A visitor sees totals, trends and a division comparison on one page and can open any date in under three clicks |
| Keep data trustworthy | Only an admin can create, edit or delete daily reports; every other request gets 403 or 401 |
| Passwords are never exposed | No plain password is stored; the database holds only Argon2id hashes made with a secret pepper |
| Sessions are short-lived and revocable | The access token expires after 15 minutes; logging out or revoking a device invalidates it on the next request |
| Users cannot reach each other's data | Another user's watchlist item or team returns 404 |
| Team members only do what the owner allowed | A member without a permission gets 403 on that action; delete, rename and member management are always owner-only |

### **A4. Scope and Non-Goals**

In scope: public analytics dashboard, daily reports with full CRUD, registration and login with refresh tokens, roles and permissions, personal watchlist, teams with member permissions, audit log recording, deployment on Vercel with a hosted database.

Out of scope: weather integration, a map of divisions, email verification, password reset by email, social login, ownership transfer of teams, real-time notifications.

Assumptions and constraints: official data exists only for Dhaka; data for the other divisions and for the most recent days is synthetic and is described as such in this report. The free hosting tiers limit performance. Modern browsers are assumed.

### **A5. User Stories**

| ID | Story |
| :---- | :---- |
| US-01 | As a visitor I want to see national and division totals so that I understand the current situation. |
| US-02 | As a visitor I want to open the report for a chosen date so that I can check a specific day. |
| US-03 | As a visitor I want to register and log in so that I can use personal features. |
| US-04 | As a user I want to stay logged in safely so that I do not have to type my password all the time. |
| US-05 | As a user I want to change my password and sign out other devices so that I can protect my account. |
| US-06 | As a user I want a watchlist with an alert level so that I see when a division becomes serious. |
| US-07 | As a user I want my watchlist to be private so that nobody else can read or change it. |
| US-08 | As a team owner I want to choose what each member may do so that responsibilities are clear. |
| US-09 | As a team member I want to see the team's divisions and my assignments so that I know what to follow. |
| US-10 | As an admin I want to enter and correct daily reports so that the dashboard stays accurate. |
| US-11 | As an admin I want to ban an abusive account with a reason so that it is locked out at once. |
| US-12 | As an admin I want to be unable to ban another admin or change my own role so that mistakes cannot lock everyone out. |

## **Part B. Software Requirements (SRS)**

### **B1. Introduction**

This part states exactly what the system shall do. Readers are the instructor and future maintainers. References: RFC 7519 (JWT), OWASP Application Security Verification Standard, FastAPI documentation.

| Term | Meaning |
| :---- | :---- |
| JWT | JSON Web Token, a signed token that carries claims |
| Access token | Short-lived JWT sent in the Authorization header |
| Refresh token | Long-lived random secret in an httpOnly cookie, used to get new access tokens |
| RBAC | Role based access control |
| Permission | A named right such as reports:write |
| Audit log | A table that records security-relevant events |

### **B2. Functional Requirements**

#### **Authentication (FR-AUTH)**

| ID | The system shall |
| :---- | :---- |
| FR-AUTH-01 | let a visitor register with name, email and a password of at least 8 characters containing a letter and a digit. |
| FR-AUTH-02 | hash every password with Argon2id after mixing in a secret pepper (HMAC-SHA256) and never store or log a plain password. |
| FR-AUTH-03 | allow registering an admin only when the correct admin code, kept in an environment variable, is given. |
| FR-AUTH-04 | issue after login a signed access token valid for 15 minutes containing the user id, role and session id. |
| FR-AUTH-05 | verify on every protected request the signature, the expiry, that the session is active and that the user exists and is not banned, and answer 401 otherwise. |
| FR-AUTH-06 | issue a random refresh token in an httpOnly cookie, store only its hash, and replace it on every use (rotation). |
| FR-AUTH-07 | revoke a session when an already replaced refresh token is presented again. |
| FR-AUTH-08 | end the session on the server at logout and remove the cookie. |
| FR-AUTH-09 | let a user list and revoke their own sessions. |
| FR-AUTH-10 | lock an account for 15 minutes after 5 consecutive wrong passwords and answer 429\. |
| FR-AUTH-11 | let a user update their name and email, and keep emails unique. |
| FR-AUTH-12 | require the current password to change a password, validate the new one, sign out the other devices and record failed attempts. |
| FR-AUTH-13 | give the same message for a wrong email and a wrong password. |
| FR-AUTH-14 | write security events to the audit log: register, login, failed login, lockout, logout, password change, profile update, session revoke, refresh reuse, role change, ban, unban and deletes. |

#### **Authorization (FR-RBAC)**

| ID | The system shall |
| :---- | :---- |
| FR-RBAC-01 | store each user's role (user or admin) in the database and keep the role to permission table in one module. |
| FR-RBAC-02 | require a named permission on every protected endpoint and answer 403 when it is missing. |
| FR-RBAC-03 | read the role from the database on every request so that role changes apply at once. |
| FR-RBAC-04 | let a user read, change and delete only their own watchlist items; other users' items return 404\. |
| FR-RBAC-05 | allow only admins to create, change and delete daily reports. |
| FR-RBAC-06 | forbid an admin to change their own role. |
| FR-RBAC-07 | forbid an admin to ban themselves or another admin. |
| FR-RBAC-08 | reject a banned user on the very next request, block their login and revoke all their sessions. |
| FR-RBAC-09 | send the role's permission list to the frontend so menus and routes match the server (convenience only; the server always checks). |

#### **Teams (FR-TEAM)**

| ID | The system shall |
| :---- | :---- |
| FR-TEAM-01 | let any user create a team and become its owner. |
| FR-TEAM-02 | let the owner add a registered user by email with the switches create, update and assign. |
| FR-TEAM-03 | let members view the team, and let them create, edit or assign items only with the matching switch. |
| FR-TEAM-04 | restrict deleting items, renaming and deleting the team, and managing members to the owner. |
| FR-TEAM-05 | answer 404 to people outside the team and 403 to members without the permission. |
| FR-TEAM-06 | allow assigning an item only to the owner or a member, and free a person's assignments when they leave or are removed. |
| FR-TEAM-07 | let a member leave a team. |

#### **Domain (FR-DOM)**

| ID | The system shall |
| :---- | :---- |
| FR-DOM-01 | store one report per division and date with admissions and deaths, reject future dates and deaths above admissions, and allow full create, read, update and delete for admins. |
| FR-DOM-02 | list reports with filters (division, date range, exact date) and pagination. |
| FR-DOM-03 | show a public dashboard with KPI cards, daily, weekly, monthly and yearly trends, a year comparison, a division ranking and share, and a weekday pattern. |
| FR-DOM-04 | show a report for any date and optional division with comparison to the previous 7 days. |
| FR-DOM-05 | show for each watchlist item the latest admissions and whether the alert level is reached. |
| FR-DOM-06 | show the same information for team items together with the assignee. |
| FR-DOM-07 | load the official Dhaka data and clearly separated synthetic data into the database. |

#### **Admin dashboard (FR-ADM)**

| ID | The system shall | Status |
| :---- | :---- | :---- |
| FR-ADM-01 | ban and unban a user with a reason | Done  |
| FR-ADM-02 | change a user's role | Done  |
| FR-ADM-03 | show overview statistics | Done |
| FR-ADM-04 | list users with search, filters and pagination, and show a user detail page | Done |
| FR-ADM-05 | revoke a user's sessions and run bulk ban and unban | Done |
| FR-ADM-06 | list and delete all watchlist items and teams (moderation) | Done |
| FR-ADM-07 | show the activity log with filters, a security view and CSV exports | Done |

### **B3. Non-Functional Requirements**

| Area | Requirement |
| :---- | :---- |
| Security | Secrets (JWT secret, pepper, admin code, database URL) only in environment variables; login errors are generic; cookies are httpOnly, SameSite Lax and Secure in production; row level security is enabled on all tables |
| Performance | Lists are paginated (default 20, at most 500); analytics are computed with SQL aggregation |
| Usability | Responsive layout; loading, error and empty states; clear messages from the server |
| Reliability | Data is kept in a hosted PostgreSQL database; a health endpoint exists |
| Maintainability | Layered code (router, service, repository), one RBAC module, automated unit tests, a report note for each step |
| Compatibility | Current versions of Chrome, Edge, Firefox and Safari |

### **B4. Roles and Permission Matrix**

Table 1: endpoint groups against roles (yes, no or own)

| Endpoint group | Visitor | User | Team member | Team owner | Admin |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Public dashboard, statistics, read reports | yes | yes | yes | yes | yes |
| Register, log in, refresh | yes | yes | yes | yes | yes |
| Own profile, password, sessions | no | own | own | own | own |
| Personal watchlist | no | own | own | own | own |
| Create or list teams | no | yes | yes | yes | yes |
| Team actions | no | no | see Table 2 | all | see Table 2 (admin has no extra rights inside a team) |
| Create, edit, delete daily reports | no | no | no | no | yes |
| Ban, unban, change roles | no | no | no | no | yes, with the rules in Table 3 |

Table 2: permissions inside a team

| Action | Owner | Member | Not in the team |
| :---- | :---- | :---- | :---- |
| View team, items, people | yes | yes | 404 |
| Create an item | yes | with the create switch | 404 |
| Edit an item | yes | with the update switch | 404 |
| Assign an item | yes | with the assign switch | 404 |
| Delete an item, rename or delete the team, manage members | yes | never | 404 |
| Leave the team | not applicable | yes | 404 |

Table 3: admin rules

| Rule | Result |
| :---- | :---- |
| Change own role | 403 |
| Ban oneself | 403 |
| Ban another admin | 403 |
| Ban a normal user | allowed; sessions are revoked and the next request gets 401 |

### **B5. Use Cases**

| ID | Use case | Actor | Main flow | Alternative and error flows | Result |
| :---- | :---- | :---- | :---- | :---- | :---- |
| UC-01 | Log in and refresh | User | 1\. Enter email and password. 2\. Server verifies and creates a session. 3\. Browser receives the access token and the refresh cookie. 4\. After 15 minutes a call returns 401, the app refreshes and repeats the call. | Wrong password: 401 generic message. Five failures: 429 lockout. Refresh cookie expired or revoked: 401 and the user is logged out. | User stays logged in |
| UC-02 | Add a watchlist item | User | 1\. Choose a division and alert level. 2\. Server saves it with the user as owner. 3\. The card shows the latest admissions and the alert state. | Division already watched: 409\. Not logged in: 401\. | Item visible only to its owner |
| UC-03 | Change a member's permissions | Team owner | 1\. Open the team page. 2\. Tick or untick create, update or assign for a member. 3\. Server saves the switches. | A member tries it: 403\. Not in the team: 404\. | Member rights updated |
| UC-04 | A denied action | Team member without the update switch | 1\. Member calls the item update endpoint. 2\. Server finds the team, role member, switch off. | 403 with the message that edit permission is missing. | Item unchanged |
| UC-05 | Ban a user | Admin | 1\. Call the ban endpoint with a reason. 2\. Server checks the safety rules. 3\. User is deactivated and all sessions are revoked. 4\. An audit row is written. | Target is an admin or the caller: 403\. Already banned: 409\. User not found: 404\. | The banned user gets 401 on the next request |
| UC-06 | Read the audit log | Admin | 1\. Open the activity log. 2\. Filter by event, user or date. | Pending screen; the events are already stored in the audit\_log table. | Events visible |

### **B6. Acceptance Criteria**

| ID | Given | When | Then |
| :---- | :---- | :---- | :---- |
| AC-01 | A user holds an access token older than 15 minutes | The user calls a protected endpoint | The API returns 401 |
| AC-02 | A token whose signature was changed | It is sent to a protected endpoint | The API returns 401 |
| AC-03 | User A owns a watchlist item | User B requests it | The API returns 404 |
| AC-04 | A member without the update switch | The member edits a team item | The API returns 403 |
| AC-05 | A member with all three switches | The member tries to rename or delete the team | The API returns 403 |
| AC-06 | A banned user with a still valid token | The user makes any request | The API returns 401 |
| AC-07 | An admin | The admin bans another admin | The API returns 403 |
| AC-08 | A normal user | The user creates a daily report | The API returns 403 |

### **B7. Traceability Matrix**

UT means automated unit test, M means manual test (both are described in section C11). S means screenshot (Part D).

| Requirement | Endpoint or screen | Test | Screenshot |
| :---- | :---- | :---- | :---- |
| FR-AUTH-01, 02 | POST /api/v1/auth/register, Register page | M-01 | ![][image1] |
| FR-AUTH-03 | POST /api/v1/auth/register with account type admin | M-02 | ![][image2] |
| FR-AUTH-04, 05 | POST /auth/login and every protected endpoint | M-03, M-04 | ![][image3] |
| FR-AUTH-06, 07 | POST /auth/refresh | M-05 | ![][image4] |
| FR-AUTH-08, 09 | POST /auth/logout, GET and DELETE /auth/sessions, My account page | M-06 | S4![][image5] |
| FR-AUTH-10 | POST /auth/login returning 429 | M-07 | S22 |
| FR-AUTH-11, 12 | PATCH /auth/me, POST /auth/change-password, My account page | M-08 | ![][image6] |
| FR-AUTH-14 | audit\_log table | M-09 | ![][image7] |
| FR-RBAC-01, 02, 03, 05 | RBAC module, report write endpoints | UT-RBAC, M-10 | ![][image8] |
| FR-RBAC-04 | /watchlist endpoints | M-11 | ![][image9] |
| FR-RBAC-06, 07 | /admin/users/{id}/role and /ban | UT-RBAC, M-12 | ![][image10] |
| FR-RBAC-08 | auth dependency, /admin/users/{id}/ban | M-13 | ![][image11] |
| FR-RBAC-09 | menus and RequirePermission guard | M-14 |  |
| FR-TEAM-01 to 07 | /teams endpoints, Teams pages | UT-TEAM, M-15, M-16 | ![][image12] |
| FR-DOM-01, 02 | /reports endpoints, Manage data page | M-17 | ![][image13] |
| FR-DOM-03, 04 | /stats endpoints, Dashboard and Day report | M-18 | ![][image14] |
| FR-DOM-05, 06 | /watchlist and team item endpoints | M-11, M-15 | ![][image15] |
| FR-DOM-07 | scripts/import\_seed.py | M-19 | none |

## **Part C. Technical Design (TDD)**

### **C1. Technology Stack**

| Component | Technology | Version (as pinned in the repository) | Reason |
| :---- | :---- | :---- | :---- |
| Frontend framework | React with TypeScript, built with Vite | React 19, Vite 8, TypeScript 7 | Required stack; typed components and fast builds |
| Routing and charts | React Router, Recharts | Router 7, Recharts 3 | Client-side pages; ready-made interactive charts |
| Backend framework | FastAPI on Python 3.12 | FastAPI 0.141 or newer | Required stack; automatic validation and API docs |
| ORM and validation | SQLModel (SQLAlchemy) and Pydantic | SQLModel 0.0.22 or newer | One model definition for tables and schemas |
| Database | PostgreSQL on Supabase (SQLite for quick local use) | Hosted | Persistent data that survives restarts |
| Password hashing | argon2-cffi (Argon2id) | 23.1 or newer | Memory-hard algorithm recommended for passwords |
| Tokens | PyJWT (HS256) | 2.8 or newer | Standard signed tokens |
| Testing | pytest | current | Simple unit tests |
| Hosting | Vercel | not applicable | Required deployment target |

### **C2. System Architecture**

Browser (React single page app)  
   \|  1\. Loads HTML and JavaScript from Vercel (static frontend)  
   \|  2\. Calls /api/... with the header  Authorization: Bearer access token  
   \|  3\. Calls /api/v1/auth/refresh; the browser adds the httpOnly refresh cookie  
   v  
Vercel Python function (FastAPI)  
   router  \-\>  service  \-\>  repository  
   every protected route first runs the RBAC dependency  
   v  
Supabase PostgreSQL  
   daily\_report, app\_user, user\_session, audit\_log, watch\_item, team, team\_member, team\_item  
Arrow 1: the frontend is a static build, so it needs no server code. Arrow 2: the access token travels in a header, so scripts on other sites cannot attach it. Arrow 3: the refresh cookie is sent by the browser only to the auth endpoints and cannot be read by JavaScript. The API reads and writes the database through repositories, and records security events in audit\_log.

### **C3. Backend and Frontend Structure**

Backend (backend/):

main.py                 application and routers  
app/config.py           settings from environment variables  
app/database.py         engine and session  
app/auth/               models, passwords, tokens, sessions, service, router, deps  
app/rbac/               permissions, require\_permission, safety rules, team permissions  
app/audit/              audit\_log model, events, writer  
app/reports/            daily reports (router, service, repository, schemas, models)  
app/stats/              analytics endpoints  
app/watchlist/          personal watchlist with ownership rules  
app/teams/              teams, members, items  
app/admin/              ban, unban, role change  
tests/                  unit tests  
migrations/             SQL files for manual schema changes  
scripts/                data import and table creation  
Frontend (frontend/src/):

api/          http client (refresh on 401\) and one file per API area  
auth/         AuthContext, in-memory token store, permission list  
components/   charts, cards, route guards (RequireAuth, RequirePermission)  
pages/        Dashboard, Day report, Login, Register, My account, Watchlist, Teams, Reports  
types.ts, utils.ts, theme.ts, constants.ts, index.css  
Routes only parse the request and call a service. Services contain the rules. Repositories contain the database queries. Models and schemas are in their own files.

### **C4. Data Model**

| Table | Columns | Keys and constraints | Purpose |
| :---- | :---- | :---- | :---- |
| daily\_report | id, division, report\_date, admitted, deaths, source, created\_at, updated\_at | PK id; unique (division, report\_date) | Daily numbers per division |
| app\_user | id, name, email, password\_hash, role, is\_active, created\_at, last\_login\_at, failed\_login\_count, locked\_until, banned\_at, ban\_reason | PK id; unique email | Accounts, role, ban state, lockout |
| user\_session | id, user\_id, refresh\_hash, prev\_refresh\_hash, created\_at, last\_used\_at, expires\_at, user\_agent, ip\_address, revoked\_at, revoked\_reason | PK id; FK user\_id; indexes on both hashes | One row per logged-in browser |
| audit\_log | id, created\_at, event, user\_id, email, ip\_address, user\_agent, details, success | PK id; index on event, user\_id, created\_at | Security event history |
| watch\_item | id, owner\_id, division, threshold, note, created\_at, updated\_at | PK id; FK owner\_id; unique (owner\_id, division) | Personal watchlist |
| team | id, name, owner\_id, created\_at, updated\_at | PK id; FK owner\_id; unique (owner\_id, name) | A shared group |
| team\_member | team\_id, user\_id, can\_create, can\_update, can\_assign, added\_at | PK (team\_id, user\_id); FKs | Members and their switches (the owner has no row) |
| team\_item | id, team\_id, division, threshold, note, assigned\_to, created\_by, created\_at, updated\_at | PK id; FKs; unique (team\_id, division) | The shared resource |

Relations: one user has many sessions, watch items and audit rows; one team has many members and items; a team has exactly one owner. Roles live in app\_user.role. A ban is app\_user.is\_active set to false with banned\_at and ban\_reason. Only a SHA-256 hash of each refresh token is stored. Row level security is enabled on every table so Supabase's public API cannot read them; the backend connects with its own credentials.

### **C5. API Design**

All endpoints start with /api/v1. Errors use the FastAPI format: a JSON object with a detail text (for validation problems, a list). No stack traces are sent. Status codes: 401 not logged in or bad token, 403 not allowed, 404 not found or hidden, 409 conflict, 422 invalid input, 429 too many attempts.

| Method and path | Needs | Success | Main errors |
| :---- | :---- | :---- | :---- |
| POST /auth/register | public | 201 | 403 bad admin code, 409 email taken, 422 weak password |
| POST /auth/login | public | 200 | 401, 403 banned, 429 locked |
| POST /auth/refresh | refresh cookie | 200 | 401 |
| POST /auth/logout | refresh cookie | 204 | none |
| GET and PATCH /auth/me | access token | 200 | 401, 409 |
| POST /auth/change-password | access token | 204 | 400 wrong current password, 422 |
| GET /auth/sessions, DELETE /auth/sessions/{id} | access token | 200 or 204 | 404 for someone else's session |
| GET /reports, /reports/by-date/{date}, /reports/{id}, /reports/divisions | public | 200 | 404 |
| POST, PATCH, DELETE /reports | reports:write (admin) | 201, 200, 204 | 401, 403, 409, 422 |
| GET /stats/summary, timeseries, by-division, monthly-by-year, weekday, day/{date}, date-range | public | 200 | 404, 422 |
| GET, POST /watchlist | watchlist:own | 200, 201 | 409 |
| GET, PATCH, DELETE /watchlist/{id} | watchlist:own, owner only | 200, 204 | 404 |
| GET, POST /teams | teams:use | 200, 201 | 409 |
| GET, PATCH, DELETE /teams/{id} | member, owner for PATCH and DELETE | 200, 204 | 403, 404 |
| POST, PATCH, DELETE /teams/{id}/members... | owner (a member may remove themselves) | 201, 200, 204 | 403, 404, 409 |
| POST, PATCH /teams/{id}/items..., POST .../assign | create, update or assign switch | 201, 200 | 403, 404, 409 |
| DELETE /teams/{id}/items/{itemId} | owner | 204 | 403, 404 |
| PATCH /admin/users/{id}/role, POST /admin/users/{id}/ban and /unban | users:manage (admin) | 200 | 403 rule broken, 404, 409 |

### **C6. JWT Authentication Design**

Sequence:

Login:     password \-\> Argon2id check \-\> new session row \-\> access token (15 min) \+ refresh cookie  
Request:   Authorization header \-\> signature and expiry \-\> session active \-\> user exists and not banned \-\> handler  
Expiry:    API answers 401 \-\> frontend calls /auth/refresh once \-\> new access token \-\> request repeated  
Refresh:   cookie hash found \-\> new refresh token stored (old hash kept) \-\> new cookie \+ new access token  
Reuse:     an old refresh token appears again \-\> session revoked, event refresh\_reuse \-\> 401  
Logout:    session row revoked \-\> cookie removed \-\> any token of that session stops working

| Claim | Meaning |
| :---- | :---- |
| sub | user id |
| role | role at login (the server still reads the role from the database) |
| sid | session id, checked on every request |
| type | access |
| iat, exp | issued at, expiry after 15 minutes |

The token is signed with HS256 and a secret from the environment (JWT\_SECRET). The decoder pins the algorithm and requires exp, sub and sid. The access token lives only in memory in the browser, so a script cannot read it from storage; a reload restores it from the refresh cookie. The refresh token is a random 48-byte value, stored only as a SHA-256 hash, sent as an httpOnly cookie with SameSite Lax, Secure in production, and a path limited to the auth endpoints. XSS cannot read the cookie, SameSite Lax blocks cross-site POST requests (CSRF), and rotation with reuse detection limits a stolen cookie. The access token lifetime is short because it cannot be recalled by itself; checking the session on each request makes logout and bans immediate anyway. On a 401 the frontend refreshes once, repeats the request, and logs the user out if the refresh fails; calls made at the same moment share one refresh request.

### **C7. RBAC Design**

Order of checks for one request: token, user and session, global permission, then (inside the handler) ownership or team permission, then the action.

Roles and permissions are constants in one module (app/rbac/permissions.py): profile:own, watchlist:own, teams:use, reports:write, users:read, users:manage, watchlist:moderate, audit:read and data:export. A user has the first three; an admin has all. Unknown roles get nothing.

The reusable check and the team decision function:

def require\_permission(permission):  
    def dependency(user \= Depends(get\_current\_user)):  
        if not has\_permission(user.role, permission):  
            raise HTTPException(403, 'You do not have permission to do this')  
        return user  
    return dependency

def team\_allows(role, switches, action):  
    if role \== 'owner':  
        return True  
    if role \!= 'member':  
        return False  
    if action \== TeamAction.VIEW:  
        return True  
    switch \= MEMBER\_SWITCH.get(action)  
    return bool(switch and switches.get(switch, False))  
Ownership is enforced in the service: the watchlist service loads the item and compares owner\_id with the caller; the team service finds the team and the caller's relation to it first. Both answer 404 when the caller has no relation, so existence is not revealed. A new role is added by one entry in the role table; a new permission by one constant and the endpoints that require it. Admin rules (not own role, not self, not another admin) are plain functions in app/rbac/policy.py. A banned user fails the active-user check in get\_current\_auth on the next request.

### **C8. Admin Dashboard Design**

Status: Pending. Implemented: the API endpoints for role change, ban and unban with their safety rules and audit events. To be built: overview statistics, the users list with search, role and status filters and pagination, the user detail page, session revoke, bulk ban and unban, moderation lists with delete, the activity log with filters, the security view (failed logins by IP and by account) and CSV exports that respect the filters. Update this section and screenshots S10 to S17 when the screens exist, or remove them.

### **C9. Security Design and Threats**

| Threat | Defence | Where |
| :---- | :---- | :---- |
| Password database leak | Argon2id with salt and a secret pepper outside the database | auth/passwords.py |
| Stolen access token | 15-minute life; session checked on every request so revoke and logout work at once | auth/tokens.py, auth/deps.py |
| Stolen refresh token | httpOnly cookie, hash only in the database, rotation, reuse revokes the session | auth/sessions.py |
| Brute-force login | Lockout after 5 failures, generic error, audit rows | auth/service.py |
| Privilege escalation | Server-side permission on every endpoint; role read from the database | rbac/deps.py |
| Access to another user's record | Ownership check; 404 for others | watchlist/service.py, teams/service.py |
| Cross-site scripting | React escapes output; access token not in browser storage; refresh cookie httpOnly | frontend |
| Cross-site request forgery | SameSite Lax cookie, JSON-only endpoints, bearer header for data requests | auth/router.py |
| CORS misuse | Frontend and API share one origin on Vercel; no wildcard CORS | vercel.json, main.py |
| Secrets in the repository | Environment variables only; .env ignored; .env.example has names only | .gitignore |
| SQL injection | SQLModel and SQLAlchemy parameterised queries | repositories |
| Over-posting of fields | Request schemas list only allowed fields; role is validated; server sets owner, source and timestamps | schemas.py |
| Direct database access through Supabase API | Row level security on all tables | migrations/\*.sql |

### **C10. Deployment on Vercel**

The repository is one project. vercel.json sends /api/... to the Python function backend/main.py and everything else to the static Vite build in frontend/. The frontend calls the API with relative URLs, so there is no localhost address and no CORS configuration. The database is Supabase PostgreSQL reached through the transaction pooler. Pushing to the main branch triggers a new deployment; changing an environment variable needs a redeploy.

| Environment variable | Purpose |
| :---- | :---- |
| DATABASE\_URL | Supabase connection string |
| JWT\_SECRET | Signs access tokens |
| PASSWORD\_PEPPER | Secret mixed into passwords before hashing |
| ADMIN\_SIGNUP\_CODE | Code needed to register an admin |
| JWT\_ACCESS\_MINUTES, JWT\_REFRESH\_DAYS, MAX\_FAILED\_LOGINS, LOCK\_MINUTES | Optional overrides of the defaults |

Problem found in production: after deployment, registration and login returned HTTP 500\. The Vercel log showed a time zone error: the code compared naive and timezone-aware datetimes. The fix was to make the clock helper return timezone-aware UTC times and to change the app\_user time columns locked\_until, last\_login\_at and banned\_at to timestamptz in Supabase. Lesson: keep every timestamp timezone-aware and check the column types of all tables after a change like this.

### **C11. Testing**

Strategy: automated unit tests for the permission rules, which need no database; manual tests on the live site for everything that involves the database, tokens and the browser. Run the unit tests with: cd backend, pip install pytest, pytest tests \-q.

| ID | Test | Requirement | Method | Result |
| :---- | :---- | :---- | :---- | :---- |
| UT-RBAC | 11 tests: permission matrix (user, admin, unknown role, teams:use) and admin safety rules (own role, self ban, ban admin) | FR-RBAC-01, 02, 06, 07 | pytest | Pass (11 of 11\) |
| UT-TEAM | 6 tests: owner, outsider, member without switches, each switch unlocks one action, owner-only actions denied to members | FR-TEAM-03, 04, 05 | pytest | Pass (6 of 6\) |
| M-01 | Register with a weak and a valid password | FR-AUTH-01, 02 | manual | Pass |
| M-02 | Register an admin with a wrong and the right code | FR-AUTH-03 | manual | Pass |
| M-03 | Login returns a token; wrong password is rejected | FR-AUTH-04, 13 | manual | Pass |
| M-04 | Expired, tampered and missing token return 401 | FR-AUTH-05 | manual | Pass |
| M-05 | Refresh replaces the cookie; old refresh token no longer works | FR-AUTH-06, 07 | manual | Pass |
| M-06 | Logout and revoking another session | FR-AUTH-08, 09 | manual | Pass |
| M-07 | Five wrong passwords return 429 | FR-AUTH-10 | manual | Pass |
| M-08 | Profile update and password change | FR-AUTH-11, 12 | manual | Pass |
| M-09 | Audit rows exist for the actions above | FR-AUTH-14 | manual | Pass |
| M-10 | Normal user gets 403 on creating a report | FR-RBAC-02, 05 | manual | Pass |
| M-11 | Another user's watchlist item returns 404 | FR-RBAC-04 | manual | Pass |
| M-12 | Admin cannot change own role or ban an admin | FR-RBAC-06, 07 | manual | Pass |
| M-13 | Banned user gets 401 on the next request and cannot log in | FR-RBAC-08 | manual | Pass |
| M-14 | Menus and routes follow the permissions | FR-RBAC-09 | manual | Pass |
| M-15 | Member without a switch gets 403 on the action | FR-TEAM-03, 05 | manual | Pass |
| M-16 | Outsider gets 404; owner-only actions are denied to members | FR-TEAM-04, 05 | manual | Pass |
| M-17 | Admin report CRUD and validation | FR-DOM-01, 02 | manual | Pass |
| M-18 | Dashboard charts and the day report | FR-DOM-03, 04 | manual | Pass |
| M-19 | Data import loads the expected rows | FR-DOM-07 | manual | Pass |

Automated tests for login and token rejection are not in the repository yet (see Limitations). Fill in the manual results after running each test on the live site.

## **Part D. Evidence: Screenshots of the Running Application**

Take every screenshot on the deployed Vercel URL with the address bar visible and the logged-in user shown. Mask passwords and tokens. Put each image under its number with the caption and requirement ID below.

| ID | What to show | Requirement | Status |
| :---- | :---- | :---- | :---- |
| S1 | Register and login page with a validation error (weak password) | FR-AUTH-01 |  |
| S2 | A logged-in user's watchlist showing only their own items | FR-RBAC-04 |  |
| S3 | My account: change password form with the wrong current password rejected | FR-AUTH-12 |  |
| S4 | Sessions list with This device and the sign-out action | FR-AUTH-09 |  |
| S5 | A team page: owner view with permission checkboxes, and a member view | FR-TEAM-03 |  |
| S6 | An action denied by RBAC: the message in the app and the 403 in the network tab | FR-RBAC-02 |  |
| S7 | Network tab: Authorization header (masked) and an expired token returning 401 | FR-AUTH-05 |  |
| S8 | The refresh request returning a new access token, and the httpOnly cookie in the application tab | FR-AUTH-06 |  |
| S9 | A banned user rejected on the next request | FR-RBAC-08 |  |
| S10 to S17 | Admin dashboard: statistics, users, user detail, ban dialog, moderation, activity log, security view, CSV export | FR-ADM |  |
| S18 | Vercel project with the production deployment and domain | Deployment |  |
| S19 | Vercel environment variable names (values hidden) | Deployment |  |
| S20 | The live API documentation page | Deployment |  |
| S21 | Output of pytest tests \-q showing 17 passed | UT-RBAC, UT-TEAM |  |
| S22 | Supabase audit\_log rows (login, failed login, lockout, ban) | FR-AUTH-14 |  |
| S23 | Supabase app\_user showing Argon2id password hashes (not plain text) | FR-AUTH-02 |  |
| S24 | Admin trying to ban another admin or change their own role: 403 | FR-RBAC-06, 07 |  |
| S25 | Public dashboard and the day report | FR-DOM-03, 04 |  |

## **Part E. Project Management and Conclusion**

### **E1. How to Run and Test**

Prerequisites: Git, Node 18 or newer, Python 3.12, a Supabase project.

git clone https\://github.com/Oishe1978/2221978\_sec-5\_DengueDashboard.git  
cd 2221978\_sec-5\_DengueDashboard/backend  
py \-3.12 \-m venv .venv  
.venv/Scripts/Activate.ps1  
pip install \-r requirements.txt  
copy .env.example .env        (then fill DATABASE\_URL, JWT\_SECRET, PASSWORD\_PEPPER, ADMIN\_SIGNUP\_CODE)  
python \-m scripts.create\_tables  
python \-m scripts.import\_seed  
fastapi dev main.py

cd ../frontend  
npm install  
npm run dev  
Open http\://localhost:5173. Run the tests with pytest tests \-q in the backend folder. Test accounts: there are two admin accounts and three user accounts, plus one team with mixed permissions. Their user IDs and passwords are in the PDF report (Appendix), never in this file.

### **E2. GitHub Work**

| Pull request | What it delivered |
| :---- | :---- |
| \#24 | Daily reports API and seed data |
| \#25 | Reports form, table and detail pages |
| \#26 | Analytics endpoints |
| \#28 | Vercel and Supabase deployment |
| \#29 | Registration and login |
| \#30 | Dashboard, date search and day report |
| \[number\] | Authentication hardening: Argon2 and pepper, refresh tokens, sessions, lockout, audit log |
| \#33 | RBAC module, watchlist, admin safety rules |
| \[number\] | Teams with member permissions |

Each feature has its own issue, a branch named oishe/\#N-short-name, commits in the form type: summary (\#N), and a pull request that closes the issue. \[State honestly which commits were made by you and how the work was divided over time. If any commit on this account was made by someone else, for example pull request 27, say so plainly here.\]

### **E3. Limitations**

* The admin dashboard screens, the activity log screen, the security view and CSV exports are not built yet. Role change, ban and unban exist only as API endpoints.  
* Official data exists only for Dhaka up to 12 October 2026\. The other divisions and the days after that are synthetic data and must not be read as official figures.  
* There are no automated tests for login and token rejection yet; those behaviours are tested manually.  
* No CSRF token is used; the design relies on SameSite Lax and JSON-only endpoints.  
* An access token held in memory could still be used by an injected script while the page is open.  
* Two browser tabs refreshing at the same moment can trigger the reuse rule and sign one tab out.  
* The IP address in the audit log comes from a request header that a client could fake.  
* No email verification and no password reset. A lockout message reveals that an account exists.  
* Database tables are created with SQLModel and manual SQL files; Alembic migrations are not used.

### **E4. Future Work**

1. Admin dashboard and activity log screens, exports (required by the brief).  
2. Automated API tests for login, token expiry and tampering, ownership and bans.  
3. A global error handler so that unexpected errors return a generic message.  
4. Alembic migrations instead of manual SQL.  
5. Password reset and email verification.  
6. Official data for the other divisions, and the weather integration planned earlier.

### **E5. Sources, Libraries and Tools**

| Item | Used for |
| :---- | :---- |
| React, Vite, TypeScript, React Router, Recharts | Frontend |
| FastAPI, SQLModel, Pydantic, psycopg, python-dotenv | Backend and database access |
| argon2-cffi, PyJWT | Password hashing and tokens |
| pytest | Unit tests |
| Supabase, Vercel, GitHub | Database, hosting, source control and issues |
| Directorate General of Health Services (DGHS) Bangladesh daily dengue data | Official Dhaka figures |
| RFC 7519, OWASP Application Security Verification Standard, FastAPI documentation | Design references |

Appendix. Test Accounts and Video Demo 

Security Notice: This Appendix contains demo credentials exclusively for the final PDF report submission. Do not commit user IDs or passwords to FINAL\_REPORT.md , README.md , or any file in the GitHub repository. 

Video Demo Link (5–8 minutes on deployed URL): \[Insert Public Video Demo Link Here\] 

Demo Test Accounts 

| Role  | User ID / Email  | Password  | Testing Purpose |
| :---- | ----- | ----- | :---- |
| Admin 1  | admin1@dengue.gov.bd  | Admin@2026\#1  | Primary administrator for user  management, audit logs, and CSV exports. |
| Admin 2  | admin2@dengue.gov.bd  | Admin@2026\#2  | Secondary administrator used to verify peer-admin ban protection (HTTP 403). |
| User 1 (Group Owner) | doctor.rahim@dmc.gov.bd  | User@2026\#1  | Owner of Dhaka Medical Dengue Unit; tests group permission assignment. |
| User 2 (Group Member) | nurse.fatema@dmc.gov.bd  | User@2026\#2  | Group member granted create and update permissions. |

CSE309 Final Project Submission Report • ID: 2221978 Page 22 of 23

| Role  | User ID / Email  | Password  | Testing Purpose |
| :---- | ----- | ----- | :---- |
| User 3  (Standard  User) | reporter.tanvir@cmc.gov.bd  | User@2026\#3  | Standard user used to verify cross user ownership blocks (HTTP 403). |

Demo Group Configuration 

Group Name: Dhaka Medical Dengue Unit 

Group Owner: doctor.rahim@dmc.gov.bd (Permissions: create , update , assign , owner only delete) 

Member 1: nurse.fatema@dmc.gov.bd (Permissions: create , update ) 

Member 2: reporter.tanvir@cmc.gov.bd (Permissions: create only; update attempts return HTTP 403\)   


[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAER0lEQVR4Xu2a3WtbZRzH8x94YdOTNG/nJV22vJ406yLTNE0KCjPd7nYjiGhuvNlu5igOERXsZhR6JXPMoQOd28VEHCK+MIZDfENccXoh28WwXW23LktTmVD29fectDN5MrQ9PU8fsOcHH56XPM33/D6c9uKhnt3nL4BhvndqTWw9UuvaE83Tlya74M/cj8w7J7v21ovHrrj+F1/q2hMNL2214lLH3+7aWy8e/kE+mJ7elPAeGKcv/3xv/uS333XgiluG9Z5/7mCHi9ePjHeIW3h+7B9xDyhxuKyNiYmJTnH1i0dRfSiO0Te+wSFaF5RHUdj/PtJHf+n64f8Tp879hPPHX1heH7PG78+ysbV34cw5azy0t3W+Vqu5b5wdLHG3F/+Cy9qQIq7evOM4fIZoNlzctZk6RBWfJRJJ4hr3mmV/L/6t/uvz9uKzRCJJnJjis0QiRdzYJ1N8z6geOG2N023z6okf2050Fju3UmMHjlkjnyUSKeI+vN7W9H0k2i0+SyRSxIkqPkskUsTdbTQcxxVnk00j7uOPWg2/Fch3SbDDphAnqvgskbjibOKKs4kUcTP1u/B4PBh/QrPmTrBR4lYuFKSIE1V8ltPMN/7E7HwDN+pNOeKqr5zge3ak+CwnYW/a9dl5mNkBFIaKcsRNzTW7ftXWy0aIm/7jJnp6vLh6bUqOOL5pJxAtjnHz9iJmbtQxd2tBjjhRxWeJYOXGWYo4dl301cVPO5pmV0mLX7+L6kHi8Bd49jC7Wpqi/Zp1hbQa3XyWSKSIE1V8lkikiJu7tcj37EjxWSKRIk5U8VkiccXZRKq4k7+1de1A8VkikSrO6eKzRCJJ3B2+Z0eKzxKJFHGz802+Z0eKzxKJFHGiis8SiSvOJktLSxsvrv+ZOcdxxdlkU4gTVXyWSCxx/H+du6wOj6l7MRBVYBoMHzKagozuQ0JVkND9iDM0P639SGp9SEZ8hIJkWEEqQnthn4WpBZEO+ZBTQ8hGQjAZaoT2I8hEwhgwdFyenESlNIxKuYRdw0XsovnjNGfr3SMl/P7qy7hy5k00x6v0HWE0Gg3kwiHg0h5sDwXhfe0HlJIJ6w3LhYOIPfYU+s8uIB8MoBAMohAIwPPrXhT9fpQUBSO9vSh7vRim+U6fD4N0JquqSGsaUrqOtGFQTzq2ETHai2kG+lUdUdXAFiMGjcZ9+/ZDo8816uXLzz9DIhJAmvq1xLXkMWm9SKu9lrgkk2eJI1nRIK37ECdpKSaQpDF5KSaRviSt9iFFYybshxkOIEeysirJ0lRk9RYmzSvFIkaXRVXKZVRGyq2R1qNMaHEIe0hogeTk6EEHqcntJC5PEgdJXCm+DaVEHDmas/1BYkcogHyfHztJ1sMkqEAMMWmKDyMkrfxgjyXxEZ8fO5bFmVEDGUsaCaQxTmK2WvKYOJKmb4GhRqFrUZJmwKAzOj1/jPpK0gtikoO/AafSfGAqFywIAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAER0lEQVR4Xu2a3WtbZRzH8x94YdOTNG/nJV22vJ406yLTNE0KCjPd7nYjiGhuvNlu5igOERXsZhR6JXPMoQOd28VEHCK+MIZDfENccXoh28WwXW23LktTmVD29fectDN5MrQ9PU8fsOcHH56XPM33/D6c9uKhnt3nL4BhvndqTWw9UuvaE83Tlya74M/cj8w7J7v21ovHrrj+F1/q2hMNL2214lLH3+7aWy8e/kE+mJ7elPAeGKcv/3xv/uS333XgiluG9Z5/7mCHi9ePjHeIW3h+7B9xDyhxuKyNiYmJTnH1i0dRfSiO0Te+wSFaF5RHUdj/PtJHf+n64f8Tp879hPPHX1heH7PG78+ysbV34cw5azy0t3W+Vqu5b5wdLHG3F/+Cy9qQIq7evOM4fIZoNlzctZk6RBWfJRJJ4hr3mmV/L/6t/uvz9uKzRCJJnJjis0QiRdzYJ1N8z6geOG2N023z6okf2050Fju3UmMHjlkjnyUSKeI+vN7W9H0k2i0+SyRSxIkqPkskUsTdbTQcxxVnk00j7uOPWg2/Fch3SbDDphAnqvgskbjibOKKs4kUcTP1u/B4PBh/QrPmTrBR4lYuFKSIE1V8ltPMN/7E7HwDN+pNOeKqr5zge3ak+CwnYW/a9dl5mNkBFIaKcsRNzTW7ftXWy0aIm/7jJnp6vLh6bUqOOL5pJxAtjnHz9iJmbtQxd2tBjjhRxWeJYOXGWYo4dl301cVPO5pmV0mLX7+L6kHi8Bd49jC7Wpqi/Zp1hbQa3XyWSKSIE1V8lkikiJu7tcj37EjxWSKRIk5U8VkiccXZRKq4k7+1de1A8VkikSrO6eKzRCJJ3B2+Z0eKzxKJFHGz802+Z0eKzxKJFHGiis8SiSvOJktLSxsvrv+ZOcdxxdlkU4gTVXyWSCxx/H+du6wOj6l7MRBVYBoMHzKagozuQ0JVkND9iDM0P639SGp9SEZ8hIJkWEEqQnthn4WpBZEO+ZBTQ8hGQjAZaoT2I8hEwhgwdFyenESlNIxKuYRdw0XsovnjNGfr3SMl/P7qy7hy5k00x6v0HWE0Gg3kwiHg0h5sDwXhfe0HlJIJ6w3LhYOIPfYU+s8uIB8MoBAMohAIwPPrXhT9fpQUBSO9vSh7vRim+U6fD4N0JquqSGsaUrqOtGFQTzq2ETHai2kG+lUdUdXAFiMGjcZ9+/ZDo8816uXLzz9DIhJAmvq1xLXkMWm9SKu9lrgkk2eJI1nRIK37ECdpKSaQpDF5KSaRviSt9iFFYybshxkOIEeysirJ0lRk9RYmzSvFIkaXRVXKZVRGyq2R1qNMaHEIe0hogeTk6EEHqcntJC5PEgdJXCm+DaVEHDmas/1BYkcogHyfHztJ1sMkqEAMMWmKDyMkrfxgjyXxEZ8fO5bFmVEDGUsaCaQxTmK2WvKYOJKmb4GhRqFrUZJmwKAzOj1/jPpK0gtikoO/AafSfGAqFywIAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAADxElEQVR4Xu2ay2tTWRzH8x/0lZvkJrmPvMZqsUmTNonGTnPbKtVFnVZHqIiDA7MYhJnFMENHBNGFInXR1SioIB2kMxspuPex0oouLOPCTUUXxU7FB0pfE/ud37nR1vtKzXUhmPODD7/fObnnXPLJOTk3EE//9ZtgpC6PV0Xz6RFL3+fg+/tTFszXJC+NWfo+FY9bcYljxy19nwOzNDtxmy9ctPR9Kh7zTf+amalJzB4Yfz/4Z7U+OHnHABf3Dvbec7/+ZnBx5vQpg7jXR4bXxIFH1TE6OmoU95M2oOfCu8zDPkqlEl9xbmJkZGRN3PLyMnbeHTXwbPkN5wO4OJfYiuPx8WG74pjX18SHK+7q7wOrdeHEDRQOXbZ8Gl8y23f16fl9GA4HJs48gGPEVtzS0hL+W3nLqQAX5xJbcXyrrk9FcQXtMB6wTIeAeWCtU1EcxxlbcbX2Haf19lcFG8PFEQsLC7hBsMz4ThtYre1gY2zFsa365MW/nAo4ijPvaY4RLs4lKysrzuIymQzHhtmFV1hcXNQ9OYpbYh2PJvR6rDSmY56o1njyYlbPxWLRWRzHyuPnsxAEAXNzc1xcNTydf4n5+Xn9sc1WHMcZdjgwuLgqeR9cXJXYiqu1n1xu4OJcYiuObVV2cnCccRRn3tMcI1ycSyqKm3iEtQe/o7+gz+ZhsBZZV5x5AKcMF+cSLs4lrsWdm9xj6asl1hX3g82gWubazUk9ryuO44xBnPlf55yPw9MW9yGTCCAT9+ukoz6kY34kI16kogKS1NZRfWgjUrKANtlbRhHKbUlAVg2gPSxgixJCXg4hJ4fRdw/IqTJODg9jn1bEt90aBrUuDPZo2E3t/u4idlNdun0Cd/4Y0l/bkW3H9PQ0MlIIDyc6sS0eQ/zPK0j7fZiamkJG9GNjshNJP92X+s6LItJeL26Ne5BraoJnvAdbGhoQHTqLfF09cnV1yNfXo4PqlCBgU0BEczCIDYxQCAnKMcqRYAhqMAxFDEMOSlDCKsKU9+8/gFAoTHUQPx/+kcYJaAk2krgYCSHaSV6a1RFBz7o0yq0kMRUXkYr40cokKT6LuIxKwkleh+RDThKxVZWQZ0QVQsVeErKnSMK6CCavpxsDvd34preHoJragySxgySz67OKROJlmkuCtuEr9BI5MYBcwK/nDiIbFIlyX17wokDytjU1oquxjEYSu0jg1/UNKFK7s7EJ2UAAKZKUVBS0Ei00fwvlZrpXQpIRlxTEwgrichSqFIEiRyDLKlQ1AlWWkKAF0SLRHPQ+/wfGfNdmeDvH3QAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAEM0lEQVR4Xu2a22sjVRzH8x/0OrnPJU3iVotNmmmb7mZrk7aKPrh1Wy9skYK+FR98EG1VxFpZJXSRgGUtROmSZenqg9R3QUVYdxd8sCi4UIquUCxdrGIb2zT2629mkm6TmSSbFGl1zoEPv9/5zTlnkg/hzIVYznzxFRSCVxaqojU+o6sdBc9/t6SjeEzgUkpXOyyWWsX533xLVzsKiqUZiXvww490tcNiKT7p1dVVU1LsQeHjH77fz8du3CyAicuhfPfwy68UuLgQf7dA3J+vTd4Vh1zb2trCncwmowz5lkgkmLhqyLdsNsvEVYOhuM3NTezu/c0oQ0VxXxtMMhtIXKOocKBWSZzZSe9sF7C9m1HrhuLYHlcZJq5GmLgaYeJqpKy4xxK3jw3FH/yoybeZmZnjLW5qaupYcE/iGKUxFMfu4yqTb4Y3wJG3ryESew+7P32im2h2yopjlMZQHNvjKlNW3Kuxs7oJDI29vb3S4mRZZhiw9tcf2N7eRiaTKS0ulU1p7JxHnOLEmpInEd9I7R9X4nxuXL720i/J/bnjy1r9/8LtjTU1RqPR0uKMePzqj7qamfj5tzVwHIf19fXqxJmVN6bfV+Ov6d+RTqexs7NjLO4uX+o2R7OjXBwUDMUVG2doKG7yjYmrgoriGKVh4mqkrLiIwZND5LkrupoZKSuOUZqy4iJjl3QTGBplxTFKU5W44suyWalJ3MTFUwWLzB14uFe58Dr15/b7E5cfxvxGAvHPn6F6HPJiHPN3ziOVnqXjI5hdnsi9RNBeChxcW6vP7+fy0ChmN7S+LMcKxh2c929TkzgGE1czhxY3YrCoGahZHLCClc+0PLU8nnthGUfy1nhuz5tDcnUaiRtjWDQ48X8dnbjif50z7g1Lh88K2W+H7LOphFqsCHltCHiaEWzhEKC+imRFBxEUOHQIzRoip/V5Dt2SHZ1uDidFF3oEF8KCG49+C4QlAe9MTuLpWBRP9ccwHOvD8EAMQ9Q/0x/FEOXZ69O4efGceuyR7k6srKxA5l24tdiL0z4vfJc/RchmxdLSEmSHDfcHehGw0XmplnQ4EGpuxjcLFoSbmmBZGMDJhga0nPsAPXX1CNfVoae+Hl2UBzkOD9gdaHU6cULB5YKfopeix+mC5HRDdLghOHmIbgluiqOjz8LlclPuxIsvjNM8Dm3ORhLnJSFEJ8kLKbmHU6MqjWI7SQz6HAh6bGhXJIlWnThZIuEkr4u3Isw7cEri0aPQIhISniQhI1ES1kco8gb6cXawH08MDhCUU3+YJHaRZGV8t8iTeIHW4hE7cR8GibDDjrDdpsYuotvpILRaD9eMCMk73dSIvkaNGEnsI4EP1TcgSv3exiZ02+0IkqSAKKKdaKP12yi20rn8vAAfL8LrFuETWiDxHoiCB4IgQZI8kAQefvpBtPG0Bn3PfwDolJzLCCQRygAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAD5UlEQVR4Xu3a/28TdRzH8f4H+9Zre23vS7/JdHHt2q0tlrnethj1B3BDMRAww19J+A2yyA8ESDA4lEFUfgASlJCJJjqzH/gRjSbKjD9swR+WmAoLISwjItCNbcy9eN+1W93drV9uP8ysn0se+XxZ7259pl33Q23bb/wIVeTqUEUaTw0Y9jbC+2PjBvrHhC9/adhbL5vVcKGjxwx7G0EfzSzcyxcvGfbWy6a/6Vf37lUlfQfVtT9urczfuzm6CguXpz73xKHDq1qcPvXhqnBPPugvhEP+yGazeLb0L1PE8jE4OMjClQN9fbkxfywuLhbCzczM4MFClimiZLiRR1mkjv+Ad9/sMZxczUqGY8yxcBYVDffG4OT/hv4X32gsnEVFwzFrMw3H/o8rrWi4vi/uIKV8gp9O9BhOrHZFwzFrMw3H/saVxsJZVDRcLBZjTLBwFlUW7vSRlTkmrxsuVk3+G25gYKBEOAZ/3b6rjWqbpaWltcMx5qaePsLc3BwWFhbKeKsymq9HvsPkwyltnk6ni4T7PpM/adhwEdWZ/Dj6cWFPnQMZHDR5/GZw5+8pcByH6elp83CMufuz/2B2dhbz8/MsXKXUDwdV2eFS+68a9qrR8lF2OCaHhbOIhbOoonD6j+VlGTpHv7eZWQv30ag2Dv+5cq4W7ucHFO/8GM789hhXJuZza5ObbgbWwjHWwmHiGo58M5a7yL7PDBetBpbClUM99HubScXhmAIWziIWrkz7lB6klAMraxbOonWFGzlaPV82TGmvuMLzXRVO/61zpjy2lqADsZALsaBTE/U7EA04EfbZEfFzCNNaIzvQQiIihxbRniNxubXAIS670OrlsFXyICl6kBC9eP13ICGLONnfj11KGu90KuhVOtDbpWAHrbd3prGD5ou/Hsfo57u1n70Wb0Umk0FM8GBiuB3bggEEr3yLqNOB8fFxxHgnXgy3I+yk+9LeBZ5H1G7HL0M2JBoaYBvqwta6Ovh3n0eyphaJmhoka2vRRvMIx+ElF49GtxtbVB4PQjQGaPS5PZDdXki8F6JbgOSV4aVxz5698Hi8NHfj03Nn6TwOTe56ChegIKSV4kXVuY/TRi0ajc0UMRLkEfE50axGkhyGcDGZglO8NsGBhMDjFVlAUuWXiIy3KcjONAXrIGq8rk70dHfire4uQnNa91LENoqsPj4uCRRepGsJULa8gG6S4F1IuJza2Ebibp7k9pKcHSmKt62hHh31OQpF7KCAr9bWIU3r9voGxF0uRChSWJLQTJro+k00NtK9QoKIoCAh4JUQFP2QBR8k0QdRlCHLPsiigBC9IJoEugY9z+cXdzKbvARXJgAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAEhklEQVR4Xu2a7WtbVRzH8x+kD3lO7kOaxNUUmzRpk0wX27Rl+MY9dCqsDAXtm6LQF5ulKCr6YjrisC/mnHNOmWg7UedkLxwKY6Csqw9gsIKgdUNsHds0aze3scDX37lJ0+beLknvkmtN7xc+Pef87jn3cD+5JCS3hk2nToMRfH9sRTTvSSpqq5XAu0cUtcd/SCmQzymGQa043wsvKmqrlXsOva2oyaWtWJx88fjMzJpE7oFxdOrHfP/Rs5MF6OJysGuPPj1c4OLVPS8XiJt/ZmRRnNHqh87KGB0dLRSX/uoABmJ+PLh3As/SOG7diPjQB2g98JNisZZsPVS4PxsPHz+fHy/tM745fpBaRm4+MTZ1Hvt2+PF1anHuvsdo7tTtrw34NXu+bz8vqCeTSf2OU4Mk7sq1m9BZGbo4lZQl7s0tfqk99tpO6TZl/YV2rVKWuIFdSQzsPklvwOek8alcnbXs2N6Jmxj/TbmulilLnI6SkuLSV29Aq/w9f12xv1a5lL6q2LsYZYuL0HvaOWo/u1W4YSVz+co12d6F4k4SZy/nBhc+wvULc0sP31H+vJRWXHsxyhanRUqJq2ZqUtzFyY8x+Nx+jJxIYXA4KVtVmdSkOC2ii1MZXZzK6OJURhenMro4lamauCN9fkRe/11q2Rd8loPTxPP9Un2hdiepSXFa5L8SN0976eJUpmrifE9cXJZKpmbFnRlfFPbhbLZWydxOnPzFklOJVFXcclQyNSlOi/w1949if60if9FKUVIcg8ljF1Vt2A+ZyyGfVw3ke8odyCkpTss7bjWFyZS7UCVu4UFstt9Gf+dytW0FD2prJRUTN3GY/YD4R/7Ex15JSk+4WAYOf5+vD+w6KtVn2GD2y3z9/5aKiVtr0cWpjC5OZTQR90tmtoBiscaGch8ipxHf+QXiT70jnyI9iszmBozOKNK3sh9OxbL0+NJ+dm00Py43moirxejiVEYXpzKlxGUyGV3ccilLnPy/znXKw9DmtSDssyHstUqEmiwIeawIuE0INpkRoLGEaEEbEeTNaONNWQRzdsyZERFtaHeZsV5wIsY7EeVdeOA7ICry2D0ygkcSXXi4O4G+RCf6ehLYTONN3V3YTP3MxEuY3L9dOrYx0o7p6WmEOSd+/jSODV4PvO99gpDVglQqhbDdirsDcQSstC/V3rLbETKZcGbMgGhjIwxjPVhfX4+m7W8gZqxD1GhErK4OHdQPms3w2+xodjiwjuF0wketh1q3wwnR4YJgd4F3cBBcIlzU9vfvgNPpor4DQ08O0jozWhwNJM5DQoh2khdifbdZaiVp1LaSxKDXjqDbilYmSbAoxIVFEk7yOjgLopwd94ocYowmgRDxEAnZ1kXCOgkmr6cbW3u7saW3h6A+jftIYgdJZvMjAkfieToXh8S6u9BLRO02RG1Wqe0gIg47ka3FzCbcR/I2NDagsyFLgiR2ksD76+rRReN4QyMiNhuCJCkgCGglWuj8LdQ2014+joeXE+BxCfDyTRA5NwTeDZ4XIYpuiDwHH90QLRydg67zXyE80C4mNPN7AAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAGE0lEQVR4Xu2a+28UVRTHN/EvwG27s++Z2e1j2+0+ukCxAmXLIgoLJDQh4RfTYBsSE0usFlCDoKKkro+kibgYSAsJDxO71h+aJrLE8AgJRQxtNFR/oPQHWowsEPnd47l3Zqe7c5dlZ1hiZafJJ+fecx9z59szN2fujmnzT+eBEDp5WhMNAwnGt1gJDp9gfDsmpxjUfYph0itc7f4PGN9ipfnoMcanFk2zcOrBZ+bmKhK1DoRvf/tVKb96ZSIPQzgZcu+t/bvztPhs4FCecA/f3bsgnLnKDAYsNruNWkEUqK1vqKfW4/VQS4VrOvFG3qDM/Xt59Ymb88C98iGkz6WZC+T2VY/LMnNhkFqfl8vjo48PUn8oHIK3T/xMxz9qDr0c7jZDYEcC0iMHmLZDr4WpTX5zhFoiysCnA4pYuTjrRGofPHhArclb6wUD7ZTtUeVs1oKo+z0rGMLphAr3Y/os01AqaqEWGyLuW4Uo1pbbh/Bcd5tEj2T9fn9+xJFN0R/0g8PTAI6Xt4PD6SjK/0E4t8AXxGLlGF8WHnUgZOcw7WiVWUEtI5xBaQwNDbERRyLJ7rBTipWzEVeJlCXiXG6XUs5cOwJbj16l5ekLKcU/MX6GGaeFudvzjO9xpC78DhN/zEOw9zhMJOPUJ+WJOFdkN63P3L3FjCsFRrglzy8pCdLX6XZSW1VdpaC+wLMKI5weciPOXBVEOiFzdx5m5DeAzP1bkJTbD/ZtZ8Y/Hik6kte0vFF0wcXZhbeQwa4gDA8dh67uTmVd5i27MeKkcuKylrkLCBdbF6NCEDK/HFPKxVBPWgkwwulBl3g7U7C1u4v1q1gVl/YmvWyNsr5c0rNTjK8UyiJcJcIIF1kaobbny++k+oYeaI+9wAzMpa2tjfE96zDC6UHXo7pISJ7VlyYpwu15Zy/TaPBonl7ERXfJtjPPr/WQcu72FEzelsZ0fXVO8U+PSwegvSPs5j6MiS9JmE+P7oPhGF5zdoz6J46aaeKbTmCfbey1tKAIt2//+9SR3eOynBodh/ECp765NPgaFMgJaiVQ/oiTX7cI5NUmc3kQxr6Iw9isFDVpjJ6ZcSmh1QJJUMkcqZ1ZX5zOlaDXUR3zF4jqzP2rNAozN87Qcckr2KcvhXMurFcLZRGuEmGEyz6qrw+egvQ5TEli7A8cagrucf8x6igsN4pwff1vMY0Gj4aJOIPSUIQ7nPyaaSyVQo/qzJ17MDmyC6blc7TeyELb036MspATmsyd/PO2SVxPKtG50EfnWsoScRV9Hvckbw55EdcvJZv0lJXae5iAXkIrJar9cj9yRqeepxDq87tpOUJIelI8rdF2HqeVskRcJVIW4QrtcVnIf3ys36yc8WcjrlRyvyUhUTuHZTJHsW9MLt7Mb0uMT0n7XdYnJ+la15JLWYSrRAzhdGIIpxNDOJ0YwunEEO4JoMK1RCJMg1bSyR5qc3/tj+W0t65ohfk/7yh1bv0BSJ/sZ+ZZLJA066/MXeX349q6Wvop7+gPo7Sd+ercoDRMIbEaWrwWCHkIHAQFCwRFDpp4CzSJVmgkCFasW8Ev2MDv5hAL+F0WaHajz8VRQoIDAk4OIrwTwm4nhAi8G+LXAYL4H3uv703Y0hGFeHQNxNFuWNMOG7C8kfiQuU8OwN+H9sDmaDtEl0boR8otOA6ub4R1oRD4zk9BLBgA8rfU5QTT51NQm3oIEbsVLrndsNKJvhvbYCXHwT/TJohaLLC2pgY6qqthDZbb0L/M4YAwz0NAEKBZFCHg8UCTIIIPqUdfneABLy8iHqjz1IOA5d7eXSBgm4D3Mvp9Cny8A5pcVkk4STwiWg0E+BoqnJ+IR4VDsbwOrNugEUVrJgKiaES8ZiIiihbgbdCMNogThlx2iAhuXKALWgQewqLEJhQq3t4Om2Sh4h0dEF/bIVmsbyKCtq+WxqBgEVzoMrxJItL6cBiijT54KRSEZViPOB3UT8rLnXZotVmhzWqFF1GgVchqIpqFg7UoWoe5ioq4krPCclm4kNcDQRTNz6OAaH0oDBGuXhauTqwFD+9FwTyICB7sI+K66vC+GgUn3q8d/gVMsaAlAE33MwAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAErElEQVR4Xu2a3WtbZRzH8x/09eT9vKRNXbXYpE3bdGZtk7ZMvVnXTsWNKau7UhFvVIoisirKiNSyzU2xwlCkU0EF8WJXRb2YFhUW7IWIBRmrjsZ2sLZp0pivv+ecnjTnZV2bCWPt84UPz+88OS/Jh/PkPCcnjgNT34IR/mRyWzSeTFr67gRPXU5ZMK8TOv+Rpe92cZQrruG1E5a+O4FZmp24+yc+tPTdLg7zQS/Mze1KzB4Yn878Wqyf/HHaABe3Dvvs0RdfMrh4++RbBnE3Xh7ZEIeSFAoFziboGR8f3xC3vLyMg1e+A/5dBHJ/qfU/+azK8cRgsd4/9kux3g2MnXu3WOvJ5/Mb4jKZjGUjjhFbcWtra0jnljg3YW71ur04NlQf/mlcrVnLYBv8nlnC8QtX1XpieBCx4fNqHaPhm85NI/bMZ5ieW8Tkc4O4SP0XRwfV1yb+0A6otlNJyxu5Wxg7ewrJ05oLW3Hsyy+dTnNuwsLCgr24lZUVLGbA2QRbcWyoDn+pXXJnLhfUenEppQ47tlHs2Oe49s3riJ24pPbFBsa0flbr66y3O4l3zrxfrPUYxLGY5y0cI3osZ1y2u9tAYX6eU8L/Lo4NUXPfTuFKKlWsbcXxbD1cXJmxFRfr166SDB77JJNJqzieW8cgrnQex6LO44rzmVnL/GYnztnMvDp6WkVf1mMRZ96QY0SP5TuOyePYw25J9UmwZR7HhiejeMuV0W+pjmrW0+u3W6Zh+souGLbppTxWV1eRy+WM4lineWWOxsJKAVfTS4hEIojH41Zx5t+iOBrz2Rv4c+EaBEHAPN1BWIaq3Q+ZpTxBQ/LrjHXHjBmbvp0A+yHT4XDg75Xr6vdcNpvlF4ftoF8cGJYzzjy2OUb0WMTpV1WdU4/v/KvldrAVx7P13PKMMxvf7XBxZWIrjmfrsZxx7P8ipZj/ArDb4eLKxFYci/lxGMeIHssZl+0+oz7dYil9yjX1gvUp1oNvfF+sj7238SRos767HVtx6i2FzcqcDWzF8Ww9XFyZ4eLKjCrO/K9zztZwtASdiDS4EQm6VFrrnGitdyEUqEW4TkCIllUUJ1qIsCSgRarVkAVtWRTQobjR5hewV/ahU/IhKvnx0M9AVJHw5sgIHkvE8WhvAkOJHgz1JTBAywd64xigOv/DKKbPHlZf29/RhtnZWUREH377qgv7gvUIfvwFWl1OpFIpRDwu3BvqQshFx6W+DzwetNbW4tKkA9GaGjgm+7C3qgp1h8+hs6IS0YoKdFZWop3qsCDgPrcHjV4v9jB8PjRQW09twOuD4vVD9vgheUXIfgV+ao8cOQqfz0+1F88/+zRtJ6DJW03i6kkI0UbyWlkdENRWlUZtM0kMBz0IB1xoZpJkp0VcRCHhJK9ddCIqevCAIqKTUScTCh4hIYfiJKyHYPL6ejHY34uD/X0E1bQ8RBLbSTJbv0MWSbxE+xKR2HMP+omox42o26W27USH10NofZ1CLWIkb19NNXqqNRIksYcEdldWIU7LXdU16HC7ESZJIVlGM9FE+2+itpGO1SBKCIoy6v0yglIdFDEAWQpAkhQoSgCKJKKBTogmkfZBn/M/2Ev4Fa0ZxCsAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAEmklEQVR4Xu2a7U9bVRzH+x+QuN4W6MN9alkpCi10FOfKQ4vApm4O5xLfaKJ9vZmIhGh8mplzmYvZGzMwmvhCJ8Zo8IVmyRJmRiKOuLlFnDEzTjGwydioDIdm2dffuX1gPUV6e8XmJtxf8snvnHPPPQ8fTrncBtv20S/BCL1/rCQCBw8VtJmVJ8+dL4DvUyo2o+L8L71S0GZWeGlrIo4f8MPp6XUJ74ExPPldrvz416fzsMRlYHuPPtuf5+KNgwfyxC08N7AsrsIZhEXp5ImbHzuKZEsQDx0ex/NUjzm7ENv7AeqPfl9wY/l5gRhaoT3NxOQvy+WTH3PX43jvkzGtz7EvsnuJY5TqjGy/41RmfXbmzbk8TvKOsnXiDGJLLf4Fi9KxxBmkqLjs0cyWn/gsP/P91wtFxaW5hMPj6XKy75CWf8xcS749gf6RS7m+rF+ybxCpn4/nrrM8SvSPTOTatTFGBjNjDubG1aA+rJ7XZjJ0irPgKSqunMHPbWZ0iavwvpr3KB6a5na8RsHPbWZ0iStX8HObGV3ikv1var+ojxClBrvv1OwZJIcmkHz9BPYNU7lvOHP1TF5ffm4zo0tcuYKf28xY4gxiiTOIJc4gljiDWOJKZP7GkpZ1ifM/NbsqaxX83GaCCZtLLeLKXErLusVNUf6I8sl307K+WgQOXLi9bsRdX7iJqZnfEQo34rfLs/rElSv4uc0EE/fr9BU0hMKawKLi2A3saP7fsHn4uc0E+6henb+By1fntVxU3MWaGv5g6I7rC0t8k+64lvqzYC1mQPfD4WIgwO9Jd1z746aW2Tcq/xbsB7MSLPi1mImyiDMa/FrMRFnE/XDkQZzb37XqyVsp+LWYibKIMxr8WsyEJc4gljiD6BI3/flQbjOfztyxMwr+W2H2LS9mTmjldS/OaGTFLf19CxWt76QzPSBYLgYLfi1moizijAa/FjNRNnHZP0V+2uvG+YQ7175a8GsxE8XF/adXrnV84oy+5GffNeco89f0YPaX/qLiLFbGEmeQgv86t9CHLexzoMlfiSafU6NRcaBRdaJBtiOkCGiguobkQJgIeQWEvfY0opCuewQ0S5WIuAXcK7rQ4nUh6nWj5xsgKnnx2sAAdne049F4B3o72tCb6MAOqm+Pt2MHlW+N78Pptx7TrnU1RzA1NYUWug9ne9BdV4u6U98i5q7WHhitNG7T5gdwH9VjHjfGRBHt1VW4PWlDd2UlbBd2Y5vDgbufGcNWu4CeDXZsFQTcT+VWF61LlBBRFNqngiZVpT0quIcIygpqZRUbJRU1kg8b1QAUynv2PA2ZrimSiP0vv4h6sQqNtGdbWCUhRITkNbKyLGhZk0a5niSGfFUIyU7UM0mio0Bck0TCSd4mjwNRTxU2Sx7aOKGIhIRdJOSRdhLWRjB5iTh2dsbxcGeCoDLVe0niJpLF+kdFD40hYgvRHazFtrqgJi7mItwukubCFpIW87hIRjXaKp1IOJ3oFOzoYbLsdk0ek9Z91wZNXJfgyIgT0exTESFpYVmmvasF4gJKDXySH4rsJ2k+qCohSwjIXjpA1YjQIfkHmNOheCBBXcsAAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAFM0lEQVR4Xu2a/U9bVRjH+x8QWdtbKO3tG29VSguVsjEGFMYYsCFMfzMaByRG416yjeCWqD/NmEpC4jCESFCMY4tmmpjMRWYMERJ0DBmR/bC5RdQwIwuWlzHYOr6ec/sCPRdoKS0pa5/kk+fc55x7LueTc255kxz8sQ8U8xc9257sT7tFtbU4fGNUBDtmPSRPk7isTzpFtbVgpW1YHHvzhYmJmIT1QLk49puv/crPv/gRF+eBrt12qsnPxYcfvO8nbvZ087K4BM6IrUTyTGJEYJ8TSVpbW/3FOfvb0ZBvxIGWQZwh14VcOQqPnoep/abo5pBQuMUNdB8n+QDUKxZ+ffiGkNu7P/bVuobvobrxMFpJ+1JTIiZHO0XCfOIUy8/B7a9Iprivawk9Y+M497IRA6Pjvvq5V424NiZe27Whfnce8+ShK379Dodji3ecR5yXy2dJtiyLGph/IBISLCvFRRpB3PSDRWwV96dDFxMIOjf7vEgRtDhqma2FAl3cG1fvQdL0PX6/2uxeNGnTPDnvPqq++gaJWnFfe7JQm7kPVXaVUHP3W0T3rAZd3DvjfyOnqjqs0DmjTlzDyR5cOOvALVHd4cstg4vCGPZeFrq4xm++FS18s9A5o05cOIm5dxxLav2kD7ZvPcIhjh5LCm17dxxtx8UFwCuOPa7bQlyohEPcWkSduHDHwuJiRAhn/Df7UORhQ+KccwvCRCeaHJi43MFML44JtkCi4eRFthT1MTUzL3IRkrhYi7i4ECMuLsSYmtnkO45CX5SxBuuAJaC42N1xETqqv9pTsPDI5ea7N9lucdztYitRHVPTERL3tMemdxyFPf+xAOuAxeVyBRbnfDIXc7AOWIIWJz/dCXmjVWjXk9x2/l3fQ3Z+Oebru/LYXZM3Ngt55bj6wTk8e6JYuJ+Op23vuGiDdcASlLg4YoISRz8gYg3WAUtAcXSSWIxAPznExa0Rgb4diYtbIyIibi9nRF7bX2x51Xh4e9DTouPdcyW83uvrDybSsmxIKOryq8k/rxT4KcjfXyZwNuDxHbbsF/RPnzT+/McZGXGxEHFxQca/U3N+11EnznscwhHe4xqOeLK05HcddeK2S0REXAJ3Ch/dnfG0199BdCwmesFxr3kqfSv6jOgYcs8TOPw/jLy7jd1xZ34Idj5x/NF2SMjxD4dNRFxciBE14tLKjwq5o3L9o72RWO2ohhqLj1x+10GJY//rPE5wSCwGOXJTFcg1cAI5Ojly9ByytVKYdTJkk2sBjRwWglktg0UtdcPL3NcqGfI0ClhTZNjJK5GvVsKmToFNo0b1CGDj1Xjv+DG8ZC9BXUkR6kpLUFNSjIP2YtSQdm2pHa7+t3Gr9zO8SPrLrblwOp3YRe7DSBWqs03I7BtFddZzwo7YrUqBpGUUqZdmUZCsQD/Po1yZjKWbEuyTySC58xb2k7xfKkPFDqnQ3kvae5Tk6+I1sOp0ZJ065Or1ZI06ZBGMWh0ytXqka/RI0xiQrs+AjuQjR45BS/p0Gh4jw9dh4pOQQ9YsseiJEIKVyMuhba1MyII0kk1EotmQBLOWg4lK4uUicbkaIpzIe14lh02VhF0aFfIpOp6gEThUTIQVEag8Iqq2zI4XykoJdkFcHZFYV7RHGGvjVWQOHrsJBURSjcWMisx0HDBloTBFiQIClVeoUhIZyShScCjlOJTJpKigsqRSVMrlgrR9iTsEceUyuUccjzyDHlYizaLVkrXrReIydGkwaFKh06YSaQbo9QStBhlaNdlAybCSTfI/ySI3+mnrRJ0AAAAASUVORK5CYII=>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAEMElEQVR4Xu2a72tbVRjH8x8MXG7SNk3ur6Q/gk2TJjZ1XdcmrV2n3bpm7q0vtOAbnROm6ETwjcyxFV/4pg5Fp2g3lSFDkDFhFgtWh6Mr3V7oyhzKcA4xox37oevX59w06e65iTe9yHC554EP5znPOefenE9uEnITz7ZTU2DEP5q872l//wNLrRJPnp2zwM/5Nzy1JK7tnXcttUrw0tYsjl985PJlV8J7YBw9N1/Kn/juexNC3Aps7+kXXjS5OLh/n0nc4t6XVsWt80chWDsmcfnpCYx1RbF1fAavUL/HP4ie5z5GbOK8ZeG951XikLWus3oUp89dKtVYmOdlcfjYtDFn8sviXrI4RX1Gcd4JytmcUdM5V48zdlcurjiHeK5dvwXB2lmTuKczaaOdfzNnGWOwZ4Kv1Sq24piMX04fLeXr/DlD3PzKeHL7vrvGhLgS43sO4MjFWxjbM4nxmUJb6B9Y4W2jNebOWNfXKrbiBOVxJC7y1FUT/LgbcCSOIcSVKQrssRXn1uA98FQl7vYd7qgV4wpfwNgbXxmfuvdb8B54qhL3X8bXF5b50v8yeA8891zctxeFuJoO3gOPrThGfummq+D3Xw5bcfk7S66E98BTtTjfwc8L7d7X8ck3H1L+G66UOWGtwHvgsRUnKI+tOPaa/3Pxhquo5n3OVpxbg/fAI8RVCN4DjxBXIXgPPI7EHT9+spR3Bgo/xwFTpZol/lpYzX96D4doffEYJ56J4q39n1H/i9U5ZeLniR2m87K40NQELHyKm1fPmOpOonjrvxi8Bx5H4twQvAceIa5C8B54XCNu6cZtvmSKZe7eA++Bx1bcH9eu49Kvv7sKtmfeA4+tOEF5hDiHCHEOEeIcIsQ5RIhziBDnECHOIZZ/nQuqw5MI+5CM1CEZ9ht0aD506H60q17ENQnt1DdQfEgQ8ZCERMhbQJYK/aCETqUOqUYJD8sBdIUCSIcakVZCGJ4F0nIIrz2/GzuzGeQyvcj1ZzCS6cO2bB9GKB/tz+Lv6Zfx48nDeJzGB1NJ5PN5bKB1mH0Mw+0xtE7NYbjtQePr0MZgIzzjc4gcW0R3Qx2mZRmDgQYsn/dgsyTBs/AstlC7xSthaL3XyB+hfFOAHpesIKVptE8NSV2nPWpoI6KqhlZVR7Oio0kJo1lvgUbtrl27odKYpsiYPfMDYnI9OmjPnoROQogUyetguSoZrSGN2hhJjIfrEVf9iDFJss8iLqmQcJL3UNCHdLAeG5QguhiaTCgGO/pIWC/B5JGo0YEstg/0E1lDXI4k5no3GXPTcpCOIWMj0U2SRhJxDLU2Y2usDT2NAXQTTF5PMEAyGtBb50e/348ByYshJsvrxaM+nyFt8wPrDXGDkm9FnIzOsI4USUuoKu1dt4hr0ZoQViLQ1AhJC0PXCVVBixqiC6gBKbpI/gHQTuABOz/KJwAAAABJRU5ErkJggg==>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAE7UlEQVR4Xu2a62tbZRzH8x/0hW2TtLmcc9KmNm1uzbrKbJsm1QlduuEb8c1ENC/2YqwoXS1W1L3ZhTjoGMLAC6JoOxmbgliLl1GY0NkxZnEqKFMH6+YuXZZedND26+85yUmak6Q5uWDS5nzhw/Oc33Oek3M+PMnpA9XsPj8FhuvjsZx49FgopVZMXvhxNgX5OUpxfvBhSq1QNPmKa3zjUEqtmMilFSLO/u57KbVC0chvbnxuriKRe2CcvvpTvP/cxR+SUMXFYM/ecXAoycVbx44kiVt4dTghrkprg0pujI6OJosLXziF4GM29B+fxggdd2l3omvgEzhO/ZwyeTPw7MmLYjtz9a9obfA7PB0bG5Nqe89g6vVo7ftLv2HsUGK+NG/m0ldJ1w2FQuqKywdR3IOlh1DJjYoRlymZxuTz5SgWV7XvW7F9Lfh8ythmIFMyjcnny1Ek7vw7IbEdP0zt9JjYslpwMIShz/+UnT+D8T8eirBzhgbZeWMp19zsKBKnkkpWceHFf+WruCJyf+GfFBd5iTt5DQiKr+IO8bhq39cITiY+SHpNb5XMR5ZTXOQlrtJSNHGrq6tYWckNNqfQuaVKUcStra3Jr6s4Kysr8pLilFJeUcRle4Daj/rSwpJN3O9Wa1pY2MorVf4XcRslm7iNsoXERX/vgoOnE5+QJZI46Y376V7lb94tJC73qCuO5fL6lXYj3humbdWJy4mRaSL4frQgiWPjwaPfiEg5QfOiSUw+dzQkwlKO4piP3MXFMhdrJTkbZf2KY3vbXFJu4ljt9nwEd8OL+YnLJVvlq8o83Lw9D5e7DV3dXlVcpqQTN/f3PVRX1+Da9RuquEyRi2Pce7CEW3fDuHN/Qam40uwcyk2c5IOhSBzbci0tLSMSWcyJxcUlce7ycv5zS5VM4iSyimOwtwhbnpWE9GdHJhSJq8QULI5doBJT8FdVFZeenMSxzT3bTuUbNj/X3QPb5knbueEvE9u85ERPEK99M7GlWx82JiHtfDZKUcVVUoorLnwm3q3SHoz3hRfvgPfuiR9nyuT+Dpj2TyE4GYnXqrQD684oba7fCouwFFdcBSWbuImJCVVcumQTx3ZEqrg0UcXlmbIUN/L2F/JS2aUsxW2GKBIn/69zFWVoXEIN2hq0cFkYOjh5LZyCDi2cFi2CHjYGr6djPVr5OrSadYQWrSYt7GaqmXQiLt4Ah1EHD2eE22yEi8GZEbgCOM0mjLz8Evb4fQj4ehCgtq/Hiz7q72I1Yu7wm4gceQW7fV74tnkQDofRRvNwZReedLnQPDWLJ5wOcUVsMxmhOT6LxrML8NTrccFsRqeRar88g06dDmu/auDTatFbWwt/TQ16qL+D6u0GA9wcBwfPwy4IcFgsaOEFNBNNVLPyFjRwAmGB1dIEnvoHDgyApzGenuWzc2fRzBnQYtJHxUXlMWm1cHC1orhWJk8UR7IaDHRcBxtJszOBJI3JszOJJM3B1cFOrZMu6DLVw8Ob6QZNaOM5uIUo/SQq4PWiPyYq4Pcj0OuPtnTcz4R6u6NzSJiHbrSdHpJJesrths/WjJ0uJ9rp2GM0iHXW326sR0edHjv0ejxOgrqIbiZNq0MvSfM/Ui1K7NTpsT0mztVggZOktXIkkNpmEsPENcXEWYVGWLgGEmYhBFjoHIHuy0rPZeON9Lz1+A+1oQdpIt5t0QAAAABJRU5ErkJggg==>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAEjElEQVR4Xu2a7U9bVRzH+x8scb0t0Id7e2+7QYmsLR0groUCAk7dFB8Sk0WN4quZzRi24EyMMfFpaMILXJa9NTrZG7K9MG7TLERiGEymxKkvnNERcQ7GeJoPkfD1dw69QE+LbW+rlvR+k2/P7/zOvaf3fHJ6T+9pLXsuDII58P7J/9RPfzWe0uJxhWqLCc6YLeKFfzg5WZQWOTD3X/l6NX7i4kiCTXBxs7HXHjqcwOLtt95IALdwpHsN3Ba7H6azc29vbyK42aHj6Kzz44F3hvES1SP2VkQOfoCq498knfy/OdbHy9ErP8Vz+9G3j8p9Z9D3uZ6j9tMnVmM2lu8ADL7sx6n3Lq/m+55k/SSPbfTSUPw94uWljxPae3p6zBlnxBzc3O0/YTo7Fz043zNTKS0eJzojcN76p/j01OsbxZvRIrC8gitG3Vr4PYlDVuBmF//gHQ2TB472JPYe18CbqfObWTPzvyWxMASu2GSCMygTnEHNzOd4j9PhiT58+sekXGfXyaTcZrXIQHRG4IpR6eClBcc6YOrsyn7lnAQ7r59ex8SmrMX6mfzohJhO1Fg/v04j1yrKvMcZVN7AjS2sdfr9JzNrlX/QWTFRgGJPPkzLIyO8POt8jsd5A1dsMsEZ1Ebg9EUjY3DHXpzC/meneOx7bW79e6SV/nEoROn7a8ujo7x+9aCTx6nAsdyNmXlMzy5mDq7YJIJjHH65MYNAMIRItMEEp2t5fDwhTgVu8tebsFol/HDtZywtLRU3uGvXZ7mZ2Gqqr64iOOabc7dxfXoWU7cWTHAbKRU4nQdzVuDYzqgRbbEfElM5aF5M5KSadyd4yWYaG12m3+OyAldMMsEZVEGAq+k4KqYKXgUBbjMqb+BeGV8Suk6vzn/jieGvQTGTk9YvDldhLg45ywRnUCY4gzLBGVTewB3pWntq8MW3l9JJv/EWstYvDkzm4pCjTHAGlVdwcxdXfqSJ9Wa2A3zqzHleFvIOsK50+3GiOTjxX+emM7Ml6LWh2leCaq+dO6TaENLs2OGxIqBK2EF1bsWGIDnglhB0W1csSyt1l4QapQRhp4S7ZAfq3A7Uup1o/wKoVdx4vbsbj8Ua8WhTDB2xBnQ0x7CX6nuaGrGX4qXhVzFy7HHe1loTxsTEBOroPFxuR1tlBSo/+xIRZxmfEVHqt7r+PtxN9YjLiSFZRmNZKaLRKNpKSrD8rQW7bTa8MD2A+88ton2rFfdKEu6xSog66LpkBWFVpXGqqNY0GqOKO8l+j4oKj4btioZtihfbtXKoVB448Dw81KYqMj49fw5VcilCNGZLUCMg5DDBC7HYI/GSQ6OyiiAGvKUIeOyoYpBkWxK4aoWAE7ydLhtqXaWoV1w0cLIqkxU8QkAebiRgDWQGr7kJD7U04cGWZjLFVO8giDsJFju+VnZRHzJ2kdv8Fdhd6efgIg6y00HQHNhF0CIuB8EoQ0OJHc12O1okK9oJULvVyuExaG13bOXgWiVbHJyMGq+GMEELejw0di0JXLm6DV7FB9XjI2heaBrZo6Dc46YJVIYwTZK/ASMVPbxSWAZ+AAAAAElFTkSuQmCC>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAD+klEQVR4Xu3a3WtbdRzH8fwHfcpJcpKchzy5arFJkzbJXGuTtojC3EzVwYaIeCeiXm0UQdwDKqM6eqUXPqATqd7I5sV6ISKDgVoQtShuNx1ssyCZK9o0fVjaj9/fOctmfqdNT88YxeR34MXvITnnkDdt05a49n17Hkzis8lt6Tw5btnbCc//MmPBPyf+8WnL3t1yOQ0Xe/2YZW8n8NE2CvfgBx9a9u6Wi7/p53NzTYnvwHzx26+358/+MF1DhLuFvfbM4SM1Ld4++VZNuIVXx+6Ew61jcXER80vA3pEC9uQLxpyNVWx9mB77/fKcbTfKa8Z5jaJ6TExMWMMJm6selUpFhNsOEc6huuEem7gicM7+9Hf9cH8trllO2gns+Pn8FZSuzlse2yl1w/FfmkKtDcOVSiVU1iDUUTfcc59cpd/bTuHCiYLlxGZXN5ywuQ3DiZ9xWxPhHBLhHBLhHBLhHBLhHNpWuKWlpRqv5QuWvf/iz28k1WNqamrrcK6jLtveOHfKcn4jWV9fN1qNj49vHU4wXS9VsLy8jNXVVefhLn70kmWvkd0or+OP6yWkUinkcjl736qCGe5acQGSJKFYLNp7c2CVmw3fgCku3ES5XMbKyooItxm+QRV7c2BEuE3wDaqqh+1wuHwG0++YF72wt99yo0bDN3AcrtnwDRyHmz2bwsvGRR831sA/ZNZyw0bBN3AcrtnwDUQ4m/gGIpxNfIN7Eu70wnHL3v8d3+CehGtEfAMRzia+gQhnE99AhLOJb+AoHPPnVycwP3fOmH99zPxYa9P45s5/tbcdTjDVhOM/dS7Y4+qJepCK+ZCKeg3JsAfJiBfxkBuJsIQ4rQ26Bz0koUroUd0mTTLXioS07kNvUMJuLYCsGkBGDeLRH4GMruLNsTEcyOfw9FAeo/lBjA7nsZ/W+4Zy2E/zyvfHMf3uQeOxR9K9mJ2lv4OVAC6dGUB/NILop18i6fVgZmYGKdmL++MDiHvpvrT3viwj6Xbju0kXMh0dcE0OY3dbG8IH30O2pRWZlhZkW1vRR/OEJOEBn4xOvx+7mEAAMRojNIb8Aej+IDQ5CNWvQAvqCNJ46NAzCASCNPfjlRdfoPMkdPnbKVyEgpBeipdk85BkjEY0GrspYiIqIxHyoptF0jyWcCmdglO8PsWDjCLjIV1BlglrRMdTFOTJHAUbJCze8BAKI0N4YmSY0JzWoxSxjyKz56c1hcKrdC0F+V33YYRkZB8yPq8x9pG0XybmXlZyYw/F6+9ox2C7KU8RByngw61tyNF6oL0DaZ8PCYoU1zR0ky66fheNnXSvmKIiqmiIBDVE1TB0JQRNDUFVdeh6CLqqIEZfEF0KXYNe578Ucu4EBlr7hAAAAABJRU5ErkJggg==>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAsCAYAAADLlo5MAAAEGElEQVR4Xu2ay28bVRSH/R/k5fF7Hn6EBiJix5PYLm2InUSITVoSClIrQCqrwoINAkVUCOgCFIUq5lkkWgmCohQWKF2wQgixAlwBagQSLDACKRFRIgptEuJg8uPcmSSOZxy/ElHw3Ct/Oueembkz/jwztq9tO/bpZ2BEpmdqomN8wlS7FTx6bc6EcZ3wO1Om2n6x1Suu/bkXTLVbgVFaKXF3Xrxkqu0Xm3GnlxcWLInRA+P9777dyR/5MlMEF7cFe+7xp54ucvHy+EtF4m4+M1YQh622urqK5Y0VThm2WzqdLohbWVnBX5t/c8qw3fL5PBdXCyXF8Uu1MlxcnXBxdVJW3OxPgKqqWzy2K7c2FcUZN+DoHIi4qYUnTbVG50DEWREurk6qFnf2+hTeyk+ZBrAqVYvj6Dx77jUtVhTH2Zuy4ozGOTrVibuS3dpg1jQAY5LInNfZrrEcyOLG1UnT+o1ARXGcveHi6mRzc7M2cUdOT5tqVmPxzz+wvr6OjY2N6sVZnaXcTfxyfVG71yWTyYMT9/DQiKnWSDBxP/+2CEEQsLS0VFpcOn0Jl9NpLH/9gWkAK/Pr2u9YW1tDLpcrLY6zN+zNgVGVOOPnGavCXGy3iYkJLm437Hvp2efTWtwNW8bFlcEobC9xVV2qnAJcXJ3UJM54OluVusQBN+iR0fL5vP7zIWvGwRuZusRV4ol3damNzL7EZa8Mmwa0CnWJY23yKl2u0Cc4WWORVQqTnZNQL1zDG9/k9P7091o88/E8hj+ah3o+gzPq+M6BfPI4i+P0YpgP8r9IXeI4/4I4dmYO70y9F9eNtf8TNYvjFCgr7uLpESz/yGd8S1Ekzvivc0512LpDDqjtLqghp0Y04EA06ETYb0ckICBMfQ3FgW4iIgnoluw6sqD3RQExxYUen4DDshcJyYu45MO9XwFxRcKLY2N4MJXEAwMpjKb6MTqYwnHqHxtI4jjl+S/OIfPmSW3ZPbEeZLN0jxS9+GG2D0dDQYTe+xBRpwNzc3NQ3U7cHu5D2En7pdrbbjeidjs+n7Eh3tYG28wgDre0IHDyAhJNzYg3NSHR3IxeyiOCgDtcbnR4PDjE8HrRTjFI0e/xQvH4ILt9kDwiZJ8CH8VTpx6C1+uj3IPXX32FthPQ6WklcUESQvSQvCjL/YIWNWkUu0hiJORGxO9EF5MkO0ziVIWEk7xe0YG46MZdiogEIyATCk6QkPuTJKyfYPIGBzAyNID7hgYJyqk/ShJ7STJbPyaLJF6isUSkDt2GISLudiHucmqxl4h53IReSwh2HCF5R9ta0d+qkyKJ/STw7uYWJKnf19qGmMuFCEkKyzK6iE4av5NiB+2rXZQQEmUEfTJCUgCK6Ics+SFJChTFD0US0U4nRKdIY9Dz/Adhk87yZt26jwAAAABJRU5ErkJggg==>