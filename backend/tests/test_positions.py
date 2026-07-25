from fastapi.testclient import TestClient
from app.main import app


def test_create_and_list_positions(user_client):
    r = user_client.post("/api/positions", json={
        "symbol": "AAPL",
        "shares": 10,
        "avg_cost": 150.0,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["symbol"] == "AAPL"
    assert data["shares"] == 10

    r2 = user_client.get("/api/positions")
    assert r2.status_code == 200
    items = r2.json()
    assert len(items) >= 1
    aapl = next(p for p in items if p["symbol"] == "AAPL")
    assert aapl["cost_basis"] == 1500.0


def test_duplicate_position_rejected(user_client):
    user_client.post("/api/positions", json={"symbol": "MSFT", "shares": 5, "avg_cost": 300})
    r = user_client.post("/api/positions", json={"symbol": "MSFT", "shares": 3, "avg_cost": 310})
    assert r.status_code == 400


def test_update_and_delete_position(user_client):
    r = user_client.post("/api/positions", json={"symbol": "NVDA", "shares": 2, "avg_cost": 500})
    pid = r.json()["id"]

    r2 = user_client.put(f"/api/positions/{pid}", json={"shares": 4, "avg_cost": 480})
    assert r2.status_code == 200
    assert r2.json()["shares"] == 4

    r3 = user_client.delete(f"/api/positions/{pid}")
    assert r3.status_code == 204

    items = user_client.get("/api/positions").json()
    assert not any(p["symbol"] == "NVDA" for p in items)


def test_positions_require_auth():
    with TestClient(app) as anon:
        r = anon.get("/api/positions")
        assert r.status_code == 401
