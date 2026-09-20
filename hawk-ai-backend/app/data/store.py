"""In-memory access to the prepared cache, loaded lazily and shared by all requests."""

import threading
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from .cache import SESSION_OPEN_MIN, load_daily, load_minutes, read_meta


@dataclass
class DayTape:
    """One symbol's bars for the replay day, as arrays for fast lookups."""

    minute_idx: np.ndarray  # position in the session, 0 = 09:15 … 374 = 15:29
    o: np.ndarray
    h: np.ndarray
    l: np.ndarray  # noqa: E741
    c: np.ndarray
    cum_volume: np.ndarray
    cum_value: np.ndarray  # rupee turnover so far (close × volume)
    prev_close: float

    def last_bar(self, k: int) -> int:
        """Index of the last bar at or before session minute k (-1 = no trade yet)."""
        return int(np.searchsorted(self.minute_idx, k, side="right")) - 1

    def price(self, k: int, frac: float) -> float:
        """Price at session minute k, `frac` of the way through that minute."""
        i = self.last_bar(k)
        if i < 0:
            return self.prev_close
        if self.minute_idx[i] == k:
            return float(self.o[i] + (self.c[i] - self.o[i]) * frac)
        return float(self.c[i])

    def volume(self, k: int) -> float:
        i = self.last_bar(k)
        return float(self.cum_volume[i]) if i >= 0 else 0.0

    def value(self, k: int) -> float:
        i = self.last_bar(k)
        return float(self.cum_value[i]) if i >= 0 else 0.0


class MarketStore:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.meta = read_meta(cache_dir)
        self._lock = threading.Lock()
        self._minutes: dict[str, pd.DataFrame] = {}
        self._daily: dict[str, pd.DataFrame] = {}
        self._tapes: dict[tuple[str, date], DayTape | None] = {}

    # ---- catalogue ----
    @property
    def source(self) -> str:
        return self.meta.get("source") or "empty"

    def symbols(self, kind: str | None = None) -> list[str]:
        return sorted(s for s, m in self.meta["symbols"].items() if kind is None or m["kind"] == kind)

    def has(self, symbol: str) -> bool:
        return symbol in self.meta["symbols"]

    def kind(self, symbol: str) -> str:
        return self.meta["symbols"][symbol]["kind"]

    # ---- data ----
    def minutes(self, symbol: str) -> pd.DataFrame:
        df = self._minutes.get(symbol)
        if df is None:
            df = load_minutes(self.cache_dir, symbol)
            with self._lock:
                self._minutes[symbol] = df
        return df

    def daily(self, symbol: str) -> pd.DataFrame:
        df = self._daily.get(symbol)
        if df is None:
            df = load_daily(self.cache_dir, symbol)
            with self._lock:
                self._daily[symbol] = df
        return df

    def minute_days(self, symbol: str) -> list[date]:
        return [ts.date() for ts in self.minutes(symbol).index.normalize().unique()]

    def tape(self, symbol: str, day: date) -> DayTape | None:
        """The replay-day tape for a symbol, or None if it has no bars that day."""
        key = (symbol, day)
        if key in self._tapes:
            return self._tapes[key]
        tape = self._build_tape(symbol, day)
        with self._lock:
            self._tapes[key] = tape
        return tape

    def _build_tape(self, symbol: str, day: date) -> DayTape | None:
        bars = self.minutes(symbol)
        today = bars[bars.index.normalize() == pd.Timestamp(day)]
        if today.empty:
            return None
        daily = self.daily(symbol)
        before = daily[daily.index < pd.Timestamp(day)]
        prev_close = float(before["c"].iloc[-1]) if len(before) else float(today["o"].iloc[0])
        idx = today.index.hour * 60 + today.index.minute - SESSION_OPEN_MIN
        c, v = today["c"].to_numpy(), today["v"].to_numpy()
        return DayTape(
            minute_idx=np.asarray(idx, dtype=int),
            o=today["o"].to_numpy(),
            h=today["h"].to_numpy(),
            l=today["l"].to_numpy(),
            c=c,
            cum_volume=np.cumsum(v),
            cum_value=np.cumsum(c * v),
            prev_close=prev_close,
        )

    def warm_up(self, day: date) -> None:
        """Load every symbol once (runs in a background thread at startup)."""
        for symbol in self.symbols():
            try:
                self.tape(symbol, day)
            except Exception:  # a broken file shouldn't stop the others
                continue
