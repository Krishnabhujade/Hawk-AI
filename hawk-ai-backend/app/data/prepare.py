"""Convert the Kaggle 1-minute CSVs into the small cache the API reads.

Put the files here first:
    data/raw/stocks/RELIANCE_minute.csv, INFY_minute.csv, ...      (Nifty 500 intraday dataset)
    data/raw/indices/NIFTY 50_minute.csv, NIFTY BANK_minute.csv, ... (NSE indices minute dataset)

Then run from the backend folder:
    python -m app.data.prepare                  # everything (can take a while for 500 stocks)
    python -m app.data.prepare --only RELIANCE,INFY,"NIFTY 50"
    python -m app.data.prepare --keep-days 10

Column names are matched loosely (date/datetime/timestamp, open, high, low, close, volume),
and timestamps with a +05:30 offset are converted to plain India time.
"""

import argparse
import re
import sys
import time
from pathlib import Path

import pandas as pd

from ..config import get_settings
from .cache import SESSION_MINUTES, SESSION_OPEN_MIN, daily_from_minutes, read_meta, reset_cache, write_meta, write_symbol

_OFFSET = re.compile(r"([+-]\d{2}:?\d{2}|Z)$")


def symbol_from_file(path: Path) -> str:
    """'NIFTY 50_minute.csv' -> 'NIFTY 50', 'RELIANCE.csv' -> 'RELIANCE'."""
    name = re.sub(r"[_-]?(minute|1min|1minute)$", "", path.stem, flags=re.IGNORECASE)
    return " ".join(name.upper().split())


def _pick(columns: dict[str, str], *names: str) -> str | None:
    for n in names:
        if n in columns:
            return columns[n]
    return None


def read_raw_minutes(path: Path) -> pd.DataFrame:
    """Read one raw CSV into 1-minute bars indexed by India time, session hours only."""
    header = pd.read_csv(path, nrows=0)
    cols = {c.strip().lower(): c for c in header.columns}
    ts_col = _pick(cols, "date", "datetime", "timestamp", "date_time", "time")
    o, h, l, c = _pick(cols, "open", "o"), _pick(cols, "high", "h"), _pick(cols, "low", "l"), _pick(cols, "close", "c")
    v = _pick(cols, "volume", "vol", "v")
    if not all([ts_col, o, h, l, c]):
        raise ValueError(f"expected date/open/high/low/close columns, found {list(header.columns)}")

    df = pd.read_csv(path, usecols=[x for x in (ts_col, o, h, l, c, v) if x])
    df = df.rename(columns={ts_col: "ts", o: "o", h: "h", l: "l", c: "c", **({v: "v"} if v else {})})
    if "v" not in df:
        df["v"] = 0.0

    sample = str(df["ts"].iloc[0]) if len(df) else ""
    if _OFFSET.search(sample.strip()):
        ts = pd.to_datetime(df["ts"], utc=True, errors="coerce").dt.tz_convert("Asia/Kolkata").dt.tz_localize(None)
    else:
        ts = pd.to_datetime(df["ts"], errors="coerce")  # assumed to be India time already
    df["ts"] = ts.dt.floor("min")
    df = df.dropna(subset=["ts", "o", "h", "l", "c"])

    minute_of_day = df["ts"].dt.hour * 60 + df["ts"].dt.minute
    in_session = (minute_of_day >= SESSION_OPEN_MIN) & (minute_of_day < SESSION_OPEN_MIN + SESSION_MINUTES)
    df = df[in_session].sort_values("ts").drop_duplicates("ts", keep="last")
    df = df.set_index("ts")[["o", "h", "l", "c", "v"]].astype(float)
    df["v"] = df["v"].fillna(0)
    return df


def prepare(only: list[str] | None = None, keep_days: int | None = None) -> dict:
    settings = get_settings()
    keep = keep_days or settings.keep_days
    cache_dir = settings.cache_dir
    meta = read_meta(cache_dir)
    if meta.get("source") != "kaggle":
        reset_cache(cache_dir)  # drop generated sample data the first time real data arrives
        meta = {"source": "kaggle", "symbols": {}}

    files = [(p, "stock") for p in sorted((settings.raw_dir / "stocks").glob("*.csv"))]
    files += [(p, "index") for p in sorted((settings.raw_dir / "indices").glob("*.csv"))]
    wanted = {" ".join(s.upper().split()) for s in only} if only else None
    if wanted:
        files = [(p, k) for p, k in files if symbol_from_file(p) in wanted]
    if not files:
        print(f"No CSV files found in {settings.raw_dir / 'stocks'} or {settings.raw_dir / 'indices'}.")
        return meta

    started = time.time()
    for i, (path, kind) in enumerate(files, 1):
        symbol = symbol_from_file(path)
        t0 = time.time()
        try:
            minutes = read_raw_minutes(path)
            if minutes.empty:
                raise ValueError("no rows inside market hours")
            info = write_symbol(cache_dir, symbol, minutes, daily_from_minutes(minutes), keep)
            meta["symbols"][symbol] = {"kind": kind, **info}
            print(f"[{i}/{len(files)}] {symbol:<22} {info['first']} → {info['last']}  ({time.time() - t0:.1f}s)")
        except Exception as exc:  # keep going; one bad file shouldn't stop the rest
            print(f"[{i}/{len(files)}] {symbol:<22} SKIPPED: {exc}", file=sys.stderr)
        if i % 25 == 0:
            write_meta(cache_dir, meta)
    write_meta(cache_dir, meta)
    print(f"Done: {len(meta['symbols'])} symbols in cache ({time.time() - started:.0f}s). Restart the API to load them.")
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Kaggle minute CSVs for the Hawk AI API.")
    parser.add_argument("--only", help="comma-separated symbols, e.g. RELIANCE,INFY,\"NIFTY 50\"")
    parser.add_argument("--keep-days", type=int, help="trading days of 1-minute data to keep (default from settings)")
    args = parser.parse_args()
    prepare(only=args.only.split(",") if args.only else None, keep_days=args.keep_days)


if __name__ == "__main__":
    main()
