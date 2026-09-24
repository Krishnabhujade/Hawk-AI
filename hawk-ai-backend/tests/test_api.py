"""API tests. Run from the backend folder:  pytest -q"""

import pandas as pd

# ---------- system & auth ----------


def test_health_and_status(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    status = client.get("/api/status").json()
    assert status["dataSource"] == "sample"
    assert status["marketTime"] == "11:00:00"
    assert status["symbols"] > 20


def test_login_and_me(client, headers):
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "demo@hawk.ai"
    assert client.post("/api/auth/login", json={"email": "demo@hawk.ai", "password": "nope"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "", "password": ""}).status_code == 400
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_register(client):
    body = {"name": "Krishna", "email": "Krishna@Example.com", "password": "secret123"}
    res = client.post("/api/auth/register", json=body)
    assert res.status_code == 201, res.text
    assert res.json()["user"] == {"name": "Krishna", "email": "krishna@example.com"}
    assert client.post("/api/auth/register", json=body).status_code == 409
    assert client.post("/api/auth/register", json={**body, "email": "bad", "password": "secret123"}).status_code == 400
    assert client.post("/api/auth/register", json={**body, "email": "x@y.io", "password": "short"}).status_code == 422
    login = client.post("/api/auth/login", json={"email": "krishna@example.com", "password": "secret123"})
    assert login.status_code == 200


# ---------- market ----------


def test_watchlist(client):
    items = client.get("/api/watchlist").json()
    assert [i["symbol"] for i in items] == ["NIFTY", "RELIANCE", "HDFCBANK", "INFY"]
    first = items[0]
    assert first["name"] == "NIFTY 50"
    assert set(first) == {"symbol", "name", "price", "changePct", "call"}
    assert first["call"]["action"] in {"BUY", "SELL", "WAIT"}


def test_quote_aliases(client):
    a = client.get("/api/quote/NIFTY").json()
    b = client.get("/api/quote/nifty%2050").json()
    assert a["price"] == b["price"] > 0
    assert set(a) == {"symbol", "price", "change", "changePct", "time"}


def test_candles(client):
    for tf, step in {"1m": 1, "5m": 5, "15m": 15, "30m": 30}.items():
        rows = client.get(f"/api/candles/RELIANCE?timeframe={tf}&limit=58").json()
        assert len(rows) == 58
        times = [r["t"] for r in rows]
        assert times == sorted(times)
        assert all(r["l"] <= min(r["o"], r["c"]) and r["h"] >= max(r["o"], r["c"]) for r in rows)
        last = pd.Timestamp(times[-1], unit="ms", tz="UTC").tz_convert("Asia/Kolkata")
        assert (last.hour, last.minute) == (11, 0) or step > 1  # frozen clock: 1m bar opens at 11:00
    assert client.get("/api/candles/RELIANCE?timeframe=2h").status_code == 400
    assert client.get("/api/candles/RELIANCE?limit=0").status_code == 422


def test_prediction(client):
    for horizon in (15, 30):
        p = client.get(f"/api/prediction/HDFCBANK?horizon={horizon}").json()
        assert p["horizonMin"] == horizon
        assert p["dir"] in {"UP", "DOWN", "FLAT"} and 0 <= p["prob"] <= 100
        assert p["suggestedQty"] >= 1
        assert p["model"] == "sample-momentum-v0"
        if p["dir"] == "UP":
            assert p["target"] > p["stopLoss"]
    assert client.get("/api/prediction/HDFCBANK?horizon=500").status_code == 422


def test_unknown_symbol(client):
    res = client.get("/api/quote/NOTREAL")
    assert res.status_code == 404
    assert "NOTREAL" in res.json()["detail"]


def test_overview(client):
    o = client.get("/api/market/overview").json()
    assert o["pulse"]["verdict"] in {"BULLISH", "NEUTRAL", "BEARISH"}
    assert o["pulse"]["advances"] + o["pulse"]["declines"] > 0
    assert [i["name"] for i in o["indices"]][0] == "NIFTY 50"
    assert all(len(i["spark"]) == 18 for i in o["indices"])
    assert len(o["sectors"]) == 12


def test_screeners(client):
    for sid in ["multibagger", "volume-gainers", "volume-losers", "active-volume", "active-value"]:
        s = client.get(f"/api/screeners/{sid}").json()
        assert s["id"] == sid and len(s["rows"]) == 6
        assert set(s["rows"][0]) == {"symbol", "sector", "ltp", "changePct", "metric", "call"}
    assert client.get("/api/screeners/nope").status_code == 404


def test_content(client):
    assert len(client.get("/api/news").json()) == 5
    assert len(client.get("/api/policy").json()) == 3
    bt = client.get("/api/backtest/summary").json()
    assert len(bt["equity"]) == 40 and "outOfSample" in bt["equity"][0]


# ---------- paper trading ----------


def _bracket(client, symbol, side):
    price = client.get(f"/api/quote/{symbol}").json()["price"]
    s = 1 if side == "BUY" else -1
    return {"symbol": symbol, "side": side, "quantity": 10, "orderType": "BRACKET",
            "entry": price, "target": round(price * (1 + s * 0.004), 2), "stopLoss": round(price * (1 - s * 0.002), 2)}


def test_orders_need_login(client):
    assert client.post("/api/orders", json=_bracket(client, "INFY", "BUY")).status_code == 401
    assert client.get("/api/orders").status_code == 401


def test_place_list_close(client, headers):
    res = client.post("/api/orders", json=_bracket(client, "INFY", "BUY"), headers=headers)
    assert res.status_code == 201, res.text
    code = res.json()["id"]
    assert code.startswith("HWK-")

    open_orders = client.get("/api/orders?status=OPEN", headers=headers).json()
    assert any(o["id"] == code for o in open_orders)

    closed = client.post(f"/api/orders/{code}/close", headers=headers)
    assert closed.status_code == 200, closed.text
    assert closed.json()["status"] == "CLOSED" and closed.json()["exitReason"] == "MANUAL"

    p = client.get("/api/portfolio", headers=headers).json()
    assert p["closedTrades"] >= 1
    assert client.post("/api/orders/HWK-99999/close", headers=headers).status_code == 404


def test_bracket_validation(client, headers):
    bad = _bracket(client, "INFY", "BUY")
    bad["target"], bad["stopLoss"] = bad["stopLoss"], bad["target"]  # swapped
    res = client.post("/api/orders", json=bad, headers=headers)
    assert res.status_code == 400
    assert "target must be above" in res.json()["detail"]


def test_orders_settle_on_target_stop_or_square_off(client, headers):
    """With time moving on, every bracket order must close with a consistent P&L."""
    from app import state
    from app.db import connect
    from app.paper import engine

    ids = [client.post("/api/orders", json=_bracket(client, s, side), headers=headers).json()["id"]
           for s, side in [("RELIANCE", "BUY"), ("HDFCBANK", "SELL"), ("NIFTY", "BUY")]]
    market = state.get_market()
    with connect() as db:
        for code in ids:
            row = db.execute("SELECT * FROM orders WHERE id = ?", (engine.parse_code(code),)).fetchone()
            engine.settle(db, row, market, elapsed=400)  # more than a full session later
            done = db.execute("SELECT * FROM orders WHERE id = ?", (row["id"],)).fetchone()
            assert done["status"] == "CLOSED"
            assert done["exit_reason"] in {"TARGET", "STOP", "SQUARE_OFF"}
            if done["exit_reason"] == "TARGET":
                assert done["pnl"] > 0
            if done["exit_reason"] == "STOP":
                assert done["pnl"] < 0
            assert done["exit_market_time"] <= f"{market.clock.day}T15:20:00"


# ---------- robustness ----------


def test_verify_password_rejects_unreadable_hashes():
    """A corrupt password_hash must answer "no", not raise (which would be a 500)."""
    from app.security import hash_password, verify_password

    good = hash_password("hawk1234")
    assert verify_password("hawk1234", good)
    assert not verify_password("wrong", good)
    for broken in ["", "nope", "a$b$c$d", "pbkdf2_sha256$abc$x$y", "pbkdf2_sha256$600000$!!$!!", good[:-4]]:
        assert verify_password("hawk1234", broken) is False


def test_replay_clock_parsing():
    """REPLAY_CLOCK is user-facing config, so a bad value must say so clearly."""
    import datetime

    import pytest

    from app.data.replay import ReplayClock

    day = datetime.date(2025, 1, 2)
    assert ReplayClock(day, "live").fixed_minute is None
    assert ReplayClock(day, "09:15").fixed_minute == 0
    assert ReplayClock(day, "14:00").fixed_minute == 285
    assert ReplayClock(day, " 14:00 ").fixed_minute == 285
    assert ReplayClock(day, "08:00").fixed_minute == 0  # before the open, clamped
    assert ReplayClock(day, "23:00").fixed_minute == 374  # after the close, clamped
    for bad in ["1400", "2pm", "25:00", "14:99", "14:", ":30", "abc"]:
        with pytest.raises(ValueError):
            ReplayClock(day, bad)


def test_insecure_defaults_are_flagged_only_when_deployed(caplog):
    """A deployed host must be told it is still on local-only defaults."""
    import logging
    from types import SimpleNamespace

    from app.security import looks_deployed, warn_about_insecure_defaults

    local = ["http://localhost:5173", "http://127.0.0.1:5173"]
    assert looks_deployed(SimpleNamespace(cors_origins=local)) is False
    assert looks_deployed(SimpleNamespace(cors_origins=[])) is False
    assert looks_deployed(SimpleNamespace(cors_origins=local + ["https://hawk.vercel.app"])) is True

    # The running test app is local-only, so it must stay quiet.
    with caplog.at_level(logging.WARNING, logger="hawk.security"):
        warn_about_insecure_defaults()
    assert "SECURITY" not in caplog.text


def test_sqlite_uses_wal():
    """WAL keeps concurrent order settlement from hitting "database is locked"."""
    from app.db import connect

    with connect() as conn:
        assert conn.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"


# ---------- Kaggle CSV parsing ----------


def test_prepare_reads_kaggle_style_csv(tmp_path):
    from app.data.prepare import read_raw_minutes, symbol_from_file

    raw = tmp_path / "NIFTY 50_minute.csv"
    raw.write_text(
        "Date,Open,High,Low,Close,Volume\n"
        "2025-01-02 09:14:00+05:30,1,1,1,1,0\n"  # pre-open: dropped
        "2025-01-02 09:15:00+05:30,100,101,99,100.5,10\n"
        "2025-01-02 09:16:00+05:30,100.5,102,100,101.5,12\n"
        "2025-01-02 15:30:00+05:30,1,1,1,1,0\n"  # after close: dropped
    )
    df = read_raw_minutes(raw)
    assert symbol_from_file(raw) == "NIFTY 50"
    assert list(df.index.strftime("%H:%M")) == ["09:15", "09:16"]
    assert df["c"].tolist() == [100.5, 101.5]
