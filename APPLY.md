# Admin dashboard patch (admin only - does NOT touch your Teams code)

Extract over your project root. Every file here is either NEW or a full replacement of a file
that only gains admin additions. Nothing is deleted.

Replaced (your existing content kept, admin lines added):
  backend/app/rbac/permissions.py      + CONTENT_MODERATE
  backend/app/audit/events.py          + EXPORT, SESSIONS_REVOKED
  backend/app/admin/{router,service,schemas}.py   (extended)
  frontend/src/App.tsx                 + Admin link and /admin routes
  frontend/src/auth/permissions.ts     + CONTENT_MODERATE, DATA_EXPORT
New:
  backend/app/admin/{queries,exports}.py, backend/scripts/seed_demo.py, backend/pytest.ini,
  backend/tests/{conftest,test_admin_api}.py,
  frontend/src/{admin.css, api/admin.ts, components/Pager.tsx, pages/admin/*}
NOT included on purpose: database.py, main.py, teams/*, TeamsPage, index.css (yours stay as they are).
