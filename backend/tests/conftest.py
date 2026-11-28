"""Shared test setup. The environment is set BEFORE the app is imported, so the tests always use a
throw-away SQLite file and never touch the real (Supabase) database named in backend/.env."""

import os
import tempfile
import uuid
from pathlib import Path

_DB_FILE = Path(tempfile.gettempdir()) / f"dengue-test-{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_FILE.as_posix()}"
os.environ["ADMIN_SIGNUP_CODE"] = "test-admin-code"
os.environ["JWT_SECRET"] = "test-secret-test-secret-test-secret-123"
os.environ["PASSWORD_PEPPER"] = "test-pepper"
os.environ.pop("VERCEL", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import DATABASE_URL  # noqa: E402

assert DATABASE_URL.startswith("sqlite"), "tests must never run against the real database"

from main import app  # noqa: E402

PASSWORD = "Passw0rd-test1"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:  # "with" runs the startup code that creates the tables
        yield c
    try:
        _DB_FILE.unlink()
    except OSError:
        pass


class Account:
    def __init__(self, client, token, user):
        self.client, self.token, self.user = client, token, user
        self.id = user["id"]
        self.email = user["email"]

    @property
    def h(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}


@pytest.fixture(scope="session")
def make_account(client):
    def make(role: str = "user", name: str = "Test Person") -> Account:
        email = f"{role}-{uuid.uuid4().hex[:8]}@example.com"
        body = {"name": name, "email": email, "password": PASSWORD, "role": role}
        if role == "admin":
            body["admin_code"] = "test-admin-code"
        res = client.post("/api/v1/auth/register", json=body)
        assert res.status_code == 201, res.text
        data = res.json()
        return Account(client, data["access_token"], data["user"])

    return make
