def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "new@test.com",
        "password": "secret123",
    })
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["user"]["email"] == "new@test.com"
    assert data["user"]["role"] == "user"
    assert "session_token" in res.cookies

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "new@test.com"


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "username": "user_a",
        "email": "dup@test.com",
        "password": "secret123",
    })
    res = client.post("/api/auth/register", json={
        "username": "user_b",
        "email": "dup@test.com",
        "password": "secret123",
    })
    assert res.status_code == 400
    assert "อีเมล" in res.json()["detail"]


def test_register_duplicate_username(client):
    client.post("/api/auth/register", json={
        "username": "same_name",
        "email": "a@test.com",
        "password": "secret123",
    })
    res = client.post("/api/auth/register", json={
        "username": "same_name",
        "email": "b@test.com",
        "password": "secret123",
    })
    assert res.status_code == 400
    assert "ชื่อผู้ใช้" in res.json()["detail"]
