def test_get_watchlist(user_client):
    r = user_client.get("/api/watchlist")
    assert r.status_code == 200
    data = r.json()
    assert "symbols" in data
    assert len(data["symbols"]) >= 1


def test_set_watchlist_admin(admin_client):
    symbols = ["AAPL", "GOOGL", "PTT.BK", "0700.HK"]
    r = admin_client.put("/api/watchlist", json={"symbols": symbols})
    assert r.status_code == 200
    assert r.json()["symbols"] == symbols

    r2 = admin_client.get("/api/watchlist")
    assert r2.json()["symbols"] == symbols


def test_set_watchlist_forbidden_for_user(user_client):
    r = user_client.put("/api/watchlist", json={"symbols": ["TSLA"]})
    assert r.status_code == 403


def test_watchlist_dedupes(admin_client):
    r = admin_client.put("/api/watchlist", json={"symbols": ["AAPL", "aapl", "MSFT"]})
    assert r.status_code == 200
    assert r.json()["symbols"] == ["AAPL", "MSFT"]
