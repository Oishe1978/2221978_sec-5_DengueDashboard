"""End-to-end tests through the real FastAPI app (login, tokens, RBAC, admin).

Run from the backend folder:   pip install pytest httpx   then   pytest tests -q
"""

from datetime import datetime, timedelta, timezone

import jwt

from app.auth.tokens import ALGORITHM, _secret

PASSWORD = "Passw0rd-test1"  # same as in conftest.py


# ----- login and tokens -----
def test_wrong_password_is_401(client, make_account):
    acc = make_account()
    res = client.post("/api/v1/auth/login", json={"email": acc.email, "password": "Wrong-pass-1"})
    assert res.status_code == 401


def test_login_works_and_returns_a_token(client, make_account):
    acc = make_account()
    res = client.post("/api/v1/auth/login", json={"email": acc.email, "password": PASSWORD})
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_missing_token_is_401(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_tampered_token_is_401(client, make_account):
    acc = make_account()
    bad = acc.token[:-3] + ("aaa" if not acc.token.endswith("aaa") else "bbb")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {bad}"}).status_code == 401


def test_expired_token_is_401(client, make_account):
    acc = make_account()
    old = datetime.now(timezone.utc) - timedelta(minutes=30)
    token = jwt.encode(
        {"sub": acc.id, "role": "user", "sid": "00000000-0000-0000-0000-000000000000", "type": "access",
         "iat": old, "exp": old + timedelta(minutes=15)},
        _secret(), algorithm=ALGORITHM,
    )
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_five_wrong_passwords_lock_the_account(client, make_account):
    acc = make_account()
    codes = [client.post("/api/v1/auth/login", json={"email": acc.email, "password": "Wrong-pass-1"}).status_code
             for _ in range(6)]
    assert codes[-1] == 429
    # even the right password is refused while locked
    assert client.post("/api/v1/auth/login", json={"email": acc.email, "password": PASSWORD}).status_code == 429


# ----- RBAC -----
def test_normal_user_is_denied_the_admin_api(client, make_account):
    user = make_account()
    for path in ("/api/v1/admin/overview", "/api/v1/admin/users", "/api/v1/admin/audit", "/api/v1/admin/security"):
        assert client.get(path, headers=user.h).status_code == 403


def test_admin_can_read_admin_api(client, make_account):
    admin = make_account("admin")
    res = client.get("/api/v1/admin/overview", headers=admin.h)
    assert res.status_code == 200
    assert res.json()["users"] >= 1


def test_admin_safety_rules(client, make_account):
    admin, other_admin = make_account("admin"), make_account("admin")
    assert client.patch(f"/api/v1/admin/users/{admin.id}/role", json={"role": "user"}, headers=admin.h).status_code == 403
    ban = client.post(f"/api/v1/admin/users/{other_admin.id}/ban", json={"reason": "testing"}, headers=admin.h)
    assert ban.status_code == 403


def test_banned_user_is_rejected_on_the_very_next_request(client, make_account):
    admin, user = make_account("admin"), make_account()
    assert client.get("/api/v1/auth/me", headers=user.h).status_code == 200
    assert client.post(f"/api/v1/admin/users/{user.id}/ban", json={"reason": "spam"}, headers=admin.h).status_code == 200
    assert client.get("/api/v1/auth/me", headers=user.h).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": user.email, "password": PASSWORD}).status_code == 403


def test_ownership_other_users_watch_item_is_404(client, make_account):
    a, b = make_account(), make_account()
    created = client.post("/api/v1/watchlist", json={"division": "Dhaka", "threshold": 50}, headers=a.h)
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert client.get(f"/api/v1/watchlist/{item_id}", headers=b.h).status_code == 404
    assert client.delete(f"/api/v1/watchlist/{item_id}", headers=b.h).status_code == 404
    assert client.get(f"/api/v1/watchlist/{item_id}", headers=a.h).status_code == 200


# ----- admin dashboard features -----
def test_user_list_search_filter_and_pagination(client, make_account):
    admin, user = make_account("admin"), make_account(name="Zed Findme")
    res = client.get("/api/v1/admin/users", params={"q": "findme", "role": "user", "status": "active", "size": 5}, headers=admin.h)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1 and any(u["id"] == user.id for u in body["items"])


def test_user_detail_has_sessions_and_activity(client, make_account):
    admin, user = make_account("admin"), make_account()
    res = client.get(f"/api/v1/admin/users/{user.id}", headers=admin.h)
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["id"] == user.id
    assert len(body["sessions"]) >= 1
    assert any(a["event"] == "register" for a in body["activity"])


def test_bulk_ban_reports_each_result_and_revoke_sessions(client, make_account):
    admin, other_admin, u1, u2 = make_account("admin"), make_account("admin"), make_account(), make_account()
    res = client.post("/api/v1/admin/users/bulk-ban",
                      json={"user_ids": [u1.id, u2.id, other_admin.id], "reason": "bulk test"}, headers=admin.h)
    assert res.status_code == 200
    body = res.json()
    assert set(body["done"]) == {u1.id, u2.id}
    assert [f["id"] for f in body["failed"]] == [other_admin.id]
    res = client.post("/api/v1/admin/users/bulk-unban", json={"user_ids": [u1.id, u2.id]}, headers=admin.h)
    assert len(res.json()["done"]) == 2
    u3 = make_account()
    assert client.post(f"/api/v1/admin/users/{u3.id}/revoke-sessions", headers=admin.h).json()["revoked"] >= 1
    assert client.get("/api/v1/auth/me", headers=u3.h).status_code == 401


def test_moderation_lists_and_deletes(client, make_account):
    admin, user = make_account("admin"), make_account()
    item = client.post("/api/v1/watchlist", json={"division": "Sylhet", "threshold": 10}, headers=user.h).json()
    listing = client.get("/api/v1/admin/content/watch-items", params={"q": user.email}, headers=admin.h).json()
    assert listing["total"] == 1
    assert client.post("/api/v1/admin/content/watch-items/delete", json={"ids": [item["id"]]}, headers=admin.h).json() == {"deleted": 1}
    assert client.post("/api/v1/admin/content/watch-items/delete", json={"ids": [item["id"]]}, headers=user.h).status_code == 403
    assert client.get("/api/v1/admin/content/reports", headers=admin.h).status_code == 200
    assert client.get("/api/v1/admin/content/teams", headers=admin.h).status_code == 200


def test_activity_log_security_view_and_exports(client, make_account):
    admin, user = make_account("admin"), make_account()
    client.post("/api/v1/auth/login", json={"email": user.email, "password": "Wrong-pass-1"})

    log = client.get("/api/v1/admin/audit", params={"event": "login_failed", "q": user.email}, headers=admin.h).json()
    assert log["total"] >= 1 and log["items"][0]["event"] == "login_failed"

    sec = client.get("/api/v1/admin/security", headers=admin.h).json()
    assert any(row["email"] == user.email for row in sec["by_account"])
    assert sec["by_ip"]

    users_csv = client.get("/api/v1/admin/export/users.csv", params={"q": user.email}, headers=admin.h)
    assert users_csv.status_code == 200 and users_csv.headers["content-type"].startswith("text/csv")
    assert user.email in users_csv.text and admin.email not in users_csv.text   # the filter is respected
    assert client.get("/api/v1/admin/export/records.csv", headers=admin.h).status_code == 200
    assert client.get("/api/v1/admin/export/activity.csv", params={"event": "login_failed"}, headers=admin.h).status_code == 200
    assert client.get("/api/v1/admin/export/users.csv", headers=user.h).status_code == 403
    export_log = client.get("/api/v1/admin/audit", params={"event": "export"}, headers=admin.h).json()
    assert export_log["total"] >= 1


def test_user_detail_shows_owned_teams_and_moderation_deletes_a_team(client, make_account):
    from sqlmodel import Session

    from app.database import engine
    from app.teams.models import Team, TeamItem

    admin, owner = make_account("admin"), make_account()
    with Session(engine) as db:  # created directly, so this test does not depend on the teams endpoints
        team = Team(name="Admin test team", owner_id=owner.id)
        db.add(team)
        db.flush()
        db.add(TeamItem(team_id=team.id, division="Dhaka", threshold=100, created_by=owner.id))
        db.commit()
        tid = str(team.id)
    detail = client.get(f"/api/v1/admin/users/{owner.id}", headers=admin.h).json()
    assert any(t["id"] == tid and t["is_owner"] for t in detail["teams"])
    listing = client.get("/api/v1/admin/content/teams", params={"q": owner.email}, headers=admin.h).json()
    assert listing["total"] == 1 and listing["items"][0]["members"] == 1 and listing["items"][0]["items"] == 1
    assert client.post("/api/v1/admin/content/teams/delete", json={"ids": [tid]}, headers=admin.h).json() == {"deleted": 1}
    assert client.get("/api/v1/admin/content/teams", params={"q": owner.email}, headers=admin.h).json()["total"] == 0
