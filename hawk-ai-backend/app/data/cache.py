"""Read/write helpers for the prepared data cache (data/cache).

Layout:
    data/cache/meta.json          which symbols exist, stock or index, date range, data source
    data/cache/minute/<SYM>.csv   last KEEP_DAYS trading days of 1-minute bars   (ts,o,h,l,c,v)
    data/cache/daily/<SYM>.csv    full history of daily bars                     (date,o,h,l,c,v)
"""

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

SESSION_OPEN_MIN = 9 * 60 + 15  # 09:15 IST
SESSION_MINUTES = 375  # 09:15 .. 15:29


def meta_path(cache_dir: Path) -> Path:
    return cache_dir / "meta.json"


def read_meta(cache_dir: Path) -> dict:
    path = meta_path(cache_dir)
    if not path.exists():
        return {"source": None, "symbols": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def write_meta(cache_dir: Path, meta: dict) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    meta["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    meta_path(cache_dir).write_text(json.dumps(meta, indent=1, sort_keys=True), encoding="utf-8")


def reset_cache(cache_dir: Path) -> None:
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
    (cache_dir / "minute").mkdir(parents=True)
    (cache_dir / "daily").mkdir(parents=True)


def daily_from_minutes(minutes: pd.DataFrame) -> pd.DataFrame:
    """Aggregate 1-minute bars (indexed by ts) into daily bars (indexed by date)."""
    day = minutes.index.normalize()
    daily = minutes.groupby(day).agg(o=("o", "first"), h=("h", "max"), l=("l", "min"), c=("c", "last"), v=("v", "sum"))
    daily.index.name = "date"
    return daily


def write_symbol(cache_dir: Path, symbol: str, minutes: pd.DataFrame, daily: pd.DataFrame, keep_days: int) -> dict:
    """Save one symbol: the last `keep_days` sessions of minutes + all daily bars."""
    days = minutes.index.normalize().unique()
    tail = minutes[minutes.index.normalize() >= days[-keep_days]] if len(days) > keep_days else minutes
    (cache_dir / "minute").mkdir(parents=True, exist_ok=True)
    (cache_dir / "daily").mkdir(parents=True, exist_ok=True)
    tail.round(4).to_csv(cache_dir / "minute" / f"{symbol}.csv", index_label="ts", date_format="%Y-%m-%d %H:%M:%S")
    daily.round(4).to_csv(cache_dir / "daily" / f"{symbol}.csv", index_label="date", date_format="%Y-%m-%d")
    return {
        "first": daily.index[0].strftime("%Y-%m-%d"),
        "last": daily.index[-1].strftime("%Y-%m-%d"),
        "minute_days": int(min(len(days), keep_days)),
    }


def load_minutes(cache_dir: Path, symbol: str) -> pd.DataFrame:
    df = pd.read_csv(cache_dir / "minute" / f"{symbol}.csv")
    df.index = pd.DatetimeIndex(pd.to_datetime(df.pop("ts")), name="ts")
    return df.astype(float)


def load_daily(cache_dir: Path, symbol: str) -> pd.DataFrame:
    df = pd.read_csv(cache_dir / "daily" / f"{symbol}.csv")
    df.index = pd.DatetimeIndex(pd.to_datetime(df.pop("date")), name="date")
    return df.astype(float)
