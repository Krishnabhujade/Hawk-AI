"""News, policy updates and backtest results, read from JSON files in data/content.

These are sample files for now. Replace them (or this router) with real feeds later.
"""

import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter

from ..config import get_settings
from ..schemas import BacktestOut, NewsItem, PolicyItem

router = APIRouter(prefix="/api", tags=["content"])


@lru_cache(maxsize=8)
def _load(name: str, mtime: float):
    path: Path = get_settings().content_dir / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def load_content(name: str):
    """Reads data/content/<name>.json, re-reading it whenever the file changes."""
    path = get_settings().content_dir / f"{name}.json"
    return _load(name, path.stat().st_mtime)


@router.get("/news", response_model=list[NewsItem])
def news():
    return load_content("news")


@router.get("/policy", response_model=list[PolicyItem])
def policy():
    return load_content("policy")


@router.get("/backtest/summary", response_model=BacktestOut)
def backtest():
    return load_content("backtest")
