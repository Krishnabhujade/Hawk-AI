"""Test setup: a throwaway data folder with generated sample data and a frozen 11:00 market."""

import os
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def client(tmp_path_factory):
    data = tmp_path_factory.mktemp("data")
    shutil.copytree(BACKEND / "data" / "content", data / "content")
    os.environ.update(
        DATA_DIR=str(data),
        REPLAY_CLOCK="11:00",
        REPLAY_DATE="",
        JWT_SECRET="test-secret-that-is-long-enough-for-hs256",
        PREDICTOR="sample",
        WATCHLIST='["NIFTY","RELIANCE","HDFCBANK","INFY"]',
    )
    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import create_app

    with TestClient(create_app()) as c:
        yield c


@pytest.fixture(scope="session")
def headers(client):
    res = client.post("/api/auth/login", json={"email": "demo@hawk.ai", "password": "hawk1234"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}
