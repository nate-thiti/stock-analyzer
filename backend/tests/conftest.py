"""Pytest fixtures — ตั้ง env ก่อน import app"""
import os
import tempfile

_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["JWT_SECRET"] = "test-secret-key-for-pytest-min-32-chars"
os.environ["APP_ENV"] = "development"
os.environ["SUPERADMIN_EMAIL"] = "admin@test.com"
os.environ["SUPERADMIN_PASSWORD"] = "testpass123"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import User
from app.auth import hash_password


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def ensure_test_user(client):
    """Seed regular user if not exists (superadmin created by init_db on startup)."""
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "user@test.com").first():
            db.add(User(
                username="user1",
                email="user@test.com",
                password_hash=hash_password("userpass1234"),
                role="user",
            ))
            db.commit()
    finally:
        db.close()
    yield


def login_as(client, email: str, password: str):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return client


@pytest.fixture
def user_client(client):
    return login_as(client, "user@test.com", "userpass1234")


@pytest.fixture
def admin_client(client):
    return login_as(client, "admin@test.com", "testpass123")
