"""Everything the market endpoints need: quotes, candles, predictions, breadth, screeners."""

import logging
import math
import threading
from datetime import date

import numpy as np
import pandas as pd

from ..config import Settings
from ..ml import Predictor, get_predictor
from .cache import SESSION_MINUTES, SESSION_OPEN_MIN
from .replay import ReplayClock
from .sample import generate_sample_cache
from .store import DayTape, MarketStore
from .symbols import OVERVIEW_INDICES, SECTOR_INDICES, VIX_SYMBOL, canonical, display_name, sector_of

log = logging.getLogger("hawk.market")

TIMEFRAMES = {"1m": 1, "5m": 5, "15m": 15, "30m": 30}
EPOCH_IST = pd.Timestamp("1970-01-01 05:30:00")  # naive India time → Unix epoch

SCREENERS = {
    "multibagger": ("Multibagger", "3Y return"),
    "volume-gainers": ("Vol gainers", "Vol vs 20D"),
    "volume-losers": ("Vol losers", "Vol vs 20D"),
    "active-volume": ("Active · vol", "Shares"),
    "active-value": ("Active · value", "Turnover"),
}


class UnknownSymbol(KeyError):
    pass


def epoch_ms(ts) -> int:
    return int((pd.Timestamp(ts) - EPOCH_IST) // pd.Timedelta(milliseconds=1))


def fmt_shares(n: float) -> str:
    if n >= 1e7:
        return f"{n / 1e7:.1f} Cr"
    if n >= 1e5:
        return f"{n / 1e5:.1f} L"
    return f"{n:,.0f}"


def fmt_rupees(x: float) -> str:
    if x >= 1e7:
        return f"₹{x / 1e7:,.0f} Cr"
    return f"₹{x / 1e5:,.1f} L"


def pick_replay_day(store: MarketStore, wanted: date | None) -> date:
    reference = "NIFTY 50" if store.has("NIFTY 50") else store.symbols()[0]
    counts = store.minutes(reference).index.normalize().value_counts().sort_index()
    days = [ts.date() for ts in counts.index]
    if wanted is not None:
        if wanted in days:
            return wanted
        log.warning("REPLAY_DATE %s has no 1-minute data for %s; using the latest day instead.", wanted, reference)
    full_days = [ts.date() for ts, n in counts.items() if n >= SESSION_MINUTES - 5]
    return (full_days or days)[-1]


class MarketService:
    def __init__(self, store: MarketStore, clock: ReplayClock, predictor: Predictor, settings: Settings):
        self.store = store
        self.clock = clock
        self.predictor = predictor
        self.settings = settings
        self._lock = threading.Lock()
        self._static: dict[str, dict] = {}
        self._snapshot: tuple[int, list[dict]] | None = None
        self._predictions: dict[tuple, dict] = {}
        self._prediction_minute = -1

    @classmethod
    def build(cls, settings: Settings) -> "MarketService":
        if settings.data_provider != "csv":
            from .upstox import UpstoxProvider

            UpstoxProvider()  # raises a clear "not built yet" error
        store = MarketStore(settings.cache_dir)
        if not store.symbols():
            log.warning("No prepared data in %s — generating SAMPLE data. See README to load the Kaggle files.", settings.cache_dir)
            generate_sample_cache(settings.cache_dir, keep_days=settings.keep_days)
            store = MarketStore(settings.cache_dir)
        day = pick_replay_day(store, settings.replay_date)
        clock = ReplayClock(day, settings.replay_clock)
        predictor = get_predictor(settings.predictor, settings.model_path)
        log.info("Replaying %s (%s data, %d symbols), predictor=%s", day, store.source, len(store.symbols()), predictor.name)
        return cls(store, clock, predictor, settings)

    def warm_up(self) -> None:
        self.store.warm_up(self.clock.day)
        try:
            self.snapshot()
        except Exception:  # never crash the server from a background thread
            log.exception("warm-up failed")

    # ---------- symbols ----------
    def resolve(self, symbol: str) -> str:
        sym = canonical(symbol)
        if not self.store.has(sym) or self.store.tape(sym, self.clock.day) is None:
            raise UnknownSymbol(sym)
        return sym

    def _tape(self, sym: str) -> DayTape:
        tape = self.store.tape(sym, self.clock.day)
        if tape is None:
            raise UnknownSymbol(sym)
        return tape

    def search(self, query: str = "", limit: int = 20) -> list[dict]:
        q = query.strip().upper()
        out = []
        for sym in self.store.symbols():
            name = display_name(sym)
            if q and q not in sym and q not in name:
                continue
            out.append({"symbol": sym, "name": name, "kind": self.store.kind(sym),
                        "sector": sector_of(sym, self.settings.reference_dir)})
            if len(out) >= limit:
                break
        return out

    # ---------- prices ----------
    def price_of(self, sym: str) -> float:
        k, frac = self.clock.position()
        return self._tape(sym).price(k, frac)

    def quote(self, symbol: str) -> dict:
        sym = self.resolve(symbol)
        tape = self._tape(sym)
        k, frac = self.clock.position()
        price = tape.price(k, frac)
        change = price - tape.prev_close
        return {
            "symbol": symbol.strip().upper(),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change / tape.prev_close * 100, 2) if tape.prev_close else 0.0,
            "time": epoch_ms(self.clock.now()),
        }

    def bars_now(self, sym: str) -> pd.DataFrame:
        """1-minute bars up to the current replay moment (last bar is still forming)."""
        start = pd.Timestamp(self.clock.minute_start())
        bars = self.store.minutes(sym)
        history = bars[bars.index < start]
        tape = self._tape(sym)
        k, frac = self.clock.position()
        i = tape.last_bar(k)
        if i >= 0 and tape.minute_idx[i] == k:
            o = float(tape.o[i])
            price = o + (float(tape.c[i]) - o) * frac
            v = float(bars.loc[start, "v"]) * frac if start in bars.index else 0.0
            partial = pd.DataFrame(
                {"o": [o], "h": [max(o, price)], "l": [min(o, price)], "c": [price], "v": [v]},
                index=pd.DatetimeIndex([start], name="ts"),
            )
            history = pd.concat([history, partial])
        return history

    def candles(self, symbol: str, timeframe: str, limit: int) -> list[dict]:
        sym = self.resolve(symbol)
        tf = TIMEFRAMES[timeframe]
        bars = self.bars_now(sym)
        minute = np.asarray(bars.index.hour * 60 + bars.index.minute) - SESSION_OPEN_MIN
        starts = bars.index.normalize() + pd.to_timedelta(SESSION_OPEN_MIN + (minute // tf) * tf, unit="min")
        grouped = bars.groupby(starts).agg(o=("o", "first"), h=("h", "max"), l=("l", "min"), c=("c", "last"), v=("v", "sum"))
        grouped = grouped.tail(limit)
        t = (grouped.index - EPOCH_IST) // pd.Timedelta(milliseconds=1)
        return [
            {"t": int(ts), "o": round(r.o, 2), "h": round(r.h, 2), "l": round(r.l, 2), "c": round(r.c, 2), "v": round(r.v)}
            for ts, r in zip(t, grouped.itertuples())
        ]

    # ---------- predictions ----------
    def prediction(self, symbol: str, horizon_min: int = 30) -> dict:
        sym = self.resolve(symbol)
        k, _ = self.clock.position()
        with self._lock:
            if k != self._prediction_minute:  # new market minute → fresh predictions
                self._predictions.clear()
                self._prediction_minute = k
            cached = self._predictions.get((sym, horizon_min))
        if cached is None:
            p = self.predictor.predict(sym, self.bars_now(sym), horizon_min)
            cached = {
                "name": display_name(sym),
                "horizon_min": horizon_min,
                "dir": p.dir,
                "prob": p.prob,
                "action": p.action,
                "pattern": p.pattern,
                "samples": p.samples,
                "hit_rate": p.hit_rate,
                "expected_move_pct": p.expected_move_pct,
                "insight": p.insight,
                "target": p.target,
                "stop_loss": p.stop_loss,
                "model": getattr(self.predictor, "name", "unknown"),
            }
            with self._lock:
                self._predictions[(sym, horizon_min)] = cached
        price = self.price_of(sym)
        qty = max(1, int(self.settings.paper_notional // price)) if price > 0 else 1
        return {"symbol": symbol.strip().upper(), "suggested_qty": qty, **cached}

    def watchlist(self) -> list[dict]:
        items = []
        for sid in self.settings.watchlist:
            try:
                q = self.quote(sid)
                p = self.prediction(sid, 30)
            except UnknownSymbol:
                log.warning("Watchlist symbol %s has no data for %s — skipped.", sid, self.clock.day)
                continue
            items.append({
                "symbol": q["symbol"],
                "name": p["name"],
                "price": q["price"],
                "change_pct": q["change_pct"],
                "call": {"action": p["action"], "dir": p["dir"], "prob": p["prob"]},
            })
        return items

    # ---------- market-wide ----------
    def _static_stats(self, sym: str) -> dict:
        stats = self._static.get(sym)
        if stats is None:
            daily = self.store.daily(sym)
            day = pd.Timestamp(self.clock.day)
            before = daily[daily.index < day]
            old = daily[daily.index <= day - pd.DateOffset(years=3)]
            stats = {
                "avg_volume_20d": float(before["v"].tail(20).mean()) if len(before) else 0.0,
                "close_3y_ago": float(old["c"].iloc[-1]) if len(old) else None,
            }
            self._static[sym] = stats
        return stats

    def snapshot(self) -> list[dict]:
        """Price, change, volume and turnover for every stock at the current minute."""
        k, _ = self.clock.position()
        if self._snapshot and self._snapshot[0] == k:
            return self._snapshot[1]
        rows = []
        for sym in self.store.symbols("stock"):
            tape = self.store.tape(sym, self.clock.day)
            if tape is None:
                continue
            stats = self._static_stats(sym)
            price = tape.price(k, 1.0)
            base = stats["close_3y_ago"]
            rows.append({
                "symbol": sym,
                "price": price,
                "change_pct": (price / tape.prev_close - 1) * 100 if tape.prev_close else 0.0,
                "volume": tape.volume(k),
                "value": tape.value(k),
                "avg_volume_20d": stats["avg_volume_20d"],
                "return_3y": (price / base - 1) if base else None,
            })
        self._snapshot = (k, rows)
        return rows

    def _index_card(self, sym: str) -> dict:
        q = self.quote(sym)
        spark = [c["c"] for c in self.candles(sym, "15m", 18)]
        return {"name": display_name(sym), "price": q["price"], "change_pct": q["change_pct"], "spark": spark}

    def overview(self) -> dict:
        rows = self.snapshot()
        advances = sum(1 for r in rows if r["change_pct"] > 0)
        declines = sum(1 for r in rows if r["change_pct"] < 0)
        breadth = (advances - declines) / (advances + declines) if advances + declines else 0.0
        nifty = self.quote("NIFTY 50")["change_pct"] if self._available("NIFTY 50") else 0.0
        score = int(round(min(100, max(0, 50 + 35 * breadth + 15 * math.tanh(nifty)))))
        verdict = "BULLISH" if score >= 60 else "BEARISH" if score <= 40 else "NEUTRAL"
        vix = round(self.price_of(VIX_SYMBOL), 2) if self._available(VIX_SYMBOL) else None
        return {
            "pulse": {"verdict": verdict, "score": score, "advances": advances, "declines": declines, "vix": vix},
            "indices": [self._index_card(s) for s in OVERVIEW_INDICES if self._available(s)],
            "sectors": [
                {"name": label, "change_pct": self.quote(idx)["change_pct"]}
                for label, idx in SECTOR_INDICES.items()
                if self._available(idx)
            ],
        }

    def _available(self, sym: str) -> bool:
        try:
            self.resolve(sym)
            return True
        except UnknownSymbol:
            return False

    def screener(self, screener_id: str, size: int = 6) -> dict:
        label, metric_label = SCREENERS[screener_id]
        k, _ = self.clock.position()
        session_share = (k + 1) / SESSION_MINUTES
        rows = self.snapshot()

        def vol_ratio(r):
            expected = r["avg_volume_20d"] * session_share
            return r["volume"] / expected if expected > 0 else None

        if screener_id == "multibagger":
            ranked = sorted((r for r in rows if r["return_3y"] is not None), key=lambda r: r["return_3y"], reverse=True)
            metric = lambda r: f"{r['return_3y'] * 100:+,.0f}%"  # noqa: E731
        elif screener_id in ("volume-gainers", "volume-losers"):
            with_ratio = [r | {"ratio": vol_ratio(r)} for r in rows if vol_ratio(r) is not None]
            ranked = sorted(with_ratio, key=lambda r: r["ratio"], reverse=screener_id == "volume-gainers")
            metric = lambda r: f"{r['ratio']:.1f}×" if r["ratio"] >= 1 else f"{r['ratio']:.2f}×"  # noqa: E731
        elif screener_id == "active-volume":
            ranked = sorted(rows, key=lambda r: r["volume"], reverse=True)
            metric = lambda r: fmt_shares(r["volume"])  # noqa: E731
        else:
            ranked = sorted(rows, key=lambda r: r["value"], reverse=True)
            metric = lambda r: fmt_rupees(r["value"])  # noqa: E731

        out = []
        for r in ranked[:size]:
            p = self.prediction(r["symbol"], 30)
            out.append({
                "symbol": r["symbol"],
                "sector": sector_of(r["symbol"], self.settings.reference_dir),
                "ltp": round(r["price"], 2),
                "change_pct": round(r["change_pct"], 2),
                "metric": metric(r),
                "call": {"action": p["action"], "prob": p["prob"]},
            })
        return {"id": screener_id, "label": label, "metric_label": metric_label, "rows": out}

    def status(self) -> dict:
        return {
            "status": "ok",
            "provider": self.settings.data_provider,
            "data_source": self.store.source,
            "replay_date": self.clock.day.isoformat(),
            "market_time": self.clock.now().strftime("%H:%M:%S"),
            "predictor": getattr(self.predictor, "name", "unknown"),
            "symbols": len(self.store.symbols()),
        }
