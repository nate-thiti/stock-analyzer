from app.fundamentals import RawFinancials
from app import services


def test_resolve_symbol_profile_uses_raw_when_present(monkeypatch):
    monkeypatch.setattr(
        services,
        "get_raw_financials",
        lambda _sym: RawFinancials(symbol="NVDA", name="NVIDIA", sector="Technology"),
    )
    monkeypatch.setattr(services, "_ticker_info", lambda _t: (_ for _ in ()).throw(AssertionError("should not call")))

    name, sector = services.resolve_symbol_profile("NVDA")
    assert name == "NVIDIA"
    assert sector == "Technology"


def test_resolve_symbol_profile_falls_back_to_ticker_info(monkeypatch):
    monkeypatch.setattr(
        services,
        "get_raw_financials",
        lambda _sym: RawFinancials(symbol="PLUG"),
    )
    monkeypatch.setattr(services, "_get_ticker", lambda _sym: object())
    monkeypatch.setattr(
        services,
        "_ticker_info",
        lambda _t: {
            "shortName": "Plug Power",
            "sector": "Industrials",
            "sectorDisp": "Industrials",
        },
    )

    name, sector = services.resolve_symbol_profile("PLUG")
    assert name == "Plug Power"
    assert sector == "Industrials"
