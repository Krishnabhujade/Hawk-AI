"""Generate realistic-looking sample data so the API works before the Kaggle files are downloaded.

Runs automatically on startup when data/cache is empty. Nothing here is real market data.
Delete data/cache (or run the prepare step) to replace it.
"""

import zlib
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pandas as pd

from .cache import SESSION_MINUTES, SESSION_OPEN_MIN, reset_cache, write_meta, write_symbol

# symbol: (last price, yearly drift, daily volatility, average daily volume)
SAMPLE_STOCKS = {
    "RELIANCE": (1412.60, 0.10, 0.013, 9_000_000),
    "HDFCBANK": (1678.05, 0.08, 0.012, 11_000_000),
    "ICICIBANK": (1289.40, 0.14, 0.013, 12_000_000),
    "INFY": (1546.90, 0.06, 0.015, 7_000_000),
    "TATAMOTORS": (712.35, 0.18, 0.020, 14_000_000),
    "DIXON": (14280.50, 0.62, 0.025, 450_000),
    "CDSL": (1618.90, 0.45, 0.024, 2_600_000),
    "KAYNES": (5940.00, 0.40, 0.027, 600_000),
    "BSE": (2790.15, 0.52, 0.028, 3_200_000),
    "APARINDS": (9012.40, 0.36, 0.024, 180_000),
    "ANANTRAJ": (742.85, 0.34, 0.028, 4_000_000),
    "IDEA": (9.14, -0.05, 0.030, 450_000_000),
    "YESBANK": (21.40, 0.02, 0.022, 200_000_000),
    "SUZLON": (64.85, 0.30, 0.030, 120_000_000),
    "JPPOWER": (19.62, 0.20, 0.030, 60_000_000),
    "RVNL": (402.30, 0.35, 0.028, 18_000_000),
    "IRFC": (148.55, 0.28, 0.025, 40_000_000),
    "NESTLEIND": (2284.60, 0.04, 0.010, 1_100_000),
    "BRITANNIA": (5612.00, 0.07, 0.011, 450_000),
    "COLGATE": (2436.85, 0.06, 0.011, 600_000),
    "PIDILITIND": (2918.40, 0.05, 0.012, 700_000),
    "SIEMENS": (6740.25, 0.20, 0.018, 500_000),
    "TATASTEEL": (168.42, 0.10, 0.018, 38_000_000),
    "SBIN": (842.60, 0.12, 0.014, 17_000_000),
    "ONGC": (262.90, 0.10, 0.016, 16_000_000),
    "NHPC": (88.35, 0.15, 0.018, 15_000_000),
    "PNB": (104.70, 0.12, 0.020, 14_000_000),
    "BHARTIARTL": (1712.35, 0.25, 0.013, 7_000_000),
    "LT": (3684.20, 0.15, 0.012, 2_500_000),
}

# index: (last level, yearly drift, daily volatility)
SAMPLE_INDICES = {
    "NIFTY 50": (24313.19, 0.12, 0.009),
    "NIFTY BANK": (52184.40, 0.10, 0.011),
    "NIFTY IT": (41208.60, 0.09, 0.013),
    "NIFTY MIDCAP 100": (56120.30, 0.20, 0.012),
    "NIFTY AUTO": (23480.10, 0.18, 0.012),
    "NIFTY METAL": (9120.45, 0.12, 0.016),
    "NIFTY REALTY": (918.30, 0.16, 0.020),
    "NIFTY ENERGY": (35210.75, 0.10, 0.012),
    "NIFTY INFRA": (8720.60, 0.14, 0.011),
    "NIFTY PHARMA": (21040.20, 0.12, 0.010),
    "NIFTY FMCG": (56230.80, 0.07, 0.008),
    "NIFTY MEDIA": (1812.40, -0.04, 0.016),
    "NIFTY FIN SERVICE": (24010.35, 0.11, 0.010),
    "NIFTY PSU BANK": (6710.90, 0.15, 0.017),
    "INDIA VIX": (12.40, 0.0, 0.040),
}


def _weekdays_until(end: date, count: int) -> list[date]:
    days, d = [], end
    while len(days) < count:
        if d.weekday() < 5:
            days.append(d)
        d -= timedelta(days=1)
    return days[::-1]


def _latest_weekday() -> date:
    today = (datetime.now(timezone.utc) + timedelta(minutes=330)).date()
    while today.weekday() >= 5:
        today -= timedelta(days=1)
    return today


def _daily_path(rng, last: float, drift: float, vol: float, n: int, mean_revert: bool) -> np.ndarray:
    rets = rng.normal(drift / 252 - vol**2 / 2, vol, n)
    if mean_revert:  # VIX-like: wander around its level instead of trending
        path = np.empty(n)
        x = 0.0
        for i in range(n):
            x = 0.9 * x + rets[i]
            path[i] = x
        return last * np.exp(path - path[-1])
    closes = np.exp(np.cumsum(rets))
    return closes * last / closes[-1]


def _minute_bars(rng, day: date, open_: float, close: float, vol: float, day_volume: float) -> pd.DataFrame:
    """A 375-minute path from open to close (Brownian bridge) with U-shaped volume."""
    n = SESSION_MINUTES
    t = np.arange(n + 1) / n
    walk = np.concatenate([[0.0], np.cumsum(rng.normal(0, 1, n))])
    bridge = walk - t * walk[-1]
    path = open_ + (close - open_) * t + bridge * open_ * vol / np.sqrt(n) * 1.6
    o, c = path[:-1], path[1:]
    wiggle = np.abs(rng.normal(0, open_ * vol / np.sqrt(n) * 0.5, (2, n)))
    h, l = np.maximum(o, c) + wiggle[0], np.minimum(o, c) - wiggle[1]
    shape = 1 + 1.6 * ((np.arange(n) - n / 2) / (n / 2)) ** 2
    v = day_volume * shape / shape.sum() * rng.lognormal(0, 0.35, n)
    start = datetime.combine(day, datetime.min.time()) + timedelta(minutes=SESSION_OPEN_MIN)
    idx = pd.DatetimeIndex([start + timedelta(minutes=i) for i in range(n)], name="ts")
    return pd.DataFrame({"o": o, "h": h, "l": l, "c": c, "v": np.round(v)}, index=idx)


def _one_symbol(symbol: str, last: float, drift: float, vol: float, avg_volume: float, days: list[date], keep_days: int):
    rng = np.random.default_rng(zlib.crc32(symbol.encode()))
    is_vix = symbol == "INDIA VIX"
    closes = _daily_path(rng, last, drift, vol, len(days), mean_revert=is_vix)
    prev = np.concatenate([[closes[0] * (1 - rng.normal(0, vol))], closes[:-1]])
    opens = prev * (1 + rng.normal(0, vol * 0.35, len(days)))
    highs = np.maximum(opens, closes) * (1 + np.abs(rng.normal(0, vol * 0.5, len(days))))
    lows = np.minimum(opens, closes) * (1 - np.abs(rng.normal(0, vol * 0.5, len(days))))
    volumes = avg_volume * rng.lognormal(0, 0.35, len(days))
    volumes[-1] *= rng.lognormal(0, 0.8)  # some stocks trade unusually heavy or light on the last day
    volumes = np.round(volumes)
    daily = pd.DataFrame(
        {"o": opens, "h": highs, "l": lows, "c": closes, "v": volumes},
        index=pd.DatetimeIndex(pd.to_datetime(days), name="date"),
    )

    minute_frames = []
    for i in range(len(days) - keep_days, len(days)):
        bars = _minute_bars(rng, days[i], opens[i], closes[i], vol, volumes[i])
        if avg_volume == 0:
            bars["v"] = 0.0
        minute_frames.append(bars)
        # keep the daily bar consistent with its minutes
        daily.iloc[i] = [bars["o"].iloc[0], bars["h"].max(), bars["l"].min(), bars["c"].iloc[-1], bars["v"].sum()]
    return pd.concat(minute_frames), daily


def generate_sample_cache(cache_dir, keep_days: int = 7, years: int = 4) -> dict:
    reset_cache(cache_dir)
    days = _weekdays_until(_latest_weekday(), years * 252)
    meta = {"source": "sample", "symbols": {}}
    for symbol, (last, drift, vol, avg_volume) in SAMPLE_STOCKS.items():
        minutes, daily = _one_symbol(symbol, last, drift, vol, avg_volume, days, keep_days)
        meta["symbols"][symbol] = {"kind": "stock", **write_symbol(cache_dir, symbol, minutes, daily, keep_days)}
    for symbol, (last, drift, vol) in SAMPLE_INDICES.items():
        minutes, daily = _one_symbol(symbol, last, drift, vol, 0, days, keep_days)
        meta["symbols"][symbol] = {"kind": "index", **write_symbol(cache_dir, symbol, minutes, daily, keep_days)}
    write_meta(cache_dir, meta)
    return meta
