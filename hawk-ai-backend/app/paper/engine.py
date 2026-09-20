"""Paper trading: simulated bracket orders filled at the replay price.

Rules (like an intraday MIS bracket order):
  * Fills immediately at the current market price.
  * Closes when the target or the stop loss is touched. If both are touched in the same
    minute, the stop loss is assumed to have hit first (the cautious choice).
  * Anything still open at 15:20 is squared off at that minute's price.
  * No new orders from 15:20 onwards.
Brokerage and taxes are not included in P&L.
"""

import sqlite3
from datetime import datetime, time

import pandas as pd

from ..data.market import MarketService
from ..db import utcnow
from ..schemas import OrderIn

SQUARE_OFF = time(15, 20)


class OrderRejected(ValueError):
    pass


def order_code(order_id: int) -> str:
    return f"HWK-{order_id:05d}"


def parse_code(code: str) -> int:
    digits = code.upper().removeprefix("HWK-")
    if not digits.isdigit():
        raise OrderRejected(f"Unknown order id {code}.")
    return int(digits)


def place(db: sqlite3.Connection, user_id: int, order: OrderIn, market: MarketService) -> dict:
    sym = market.resolve(order.symbol)
    now = market.clock.now()
    if now.time() >= SQUARE_OFF:
        raise OrderRejected("Intraday orders close at 15:20 IST. The replay restarts at 09:15 — try again then.")
    price = round(market.price_of(sym), 2)
    if order.side == "BUY" and not (order.target > price > order.stop_loss):
        raise OrderRejected(f"For a BUY at {price:,.2f}, the target must be above it and the stop loss below it.")
    if order.side == "SELL" and not (order.target < price < order.stop_loss):
        raise OrderRejected(f"For a SELL at {price:,.2f}, the target must be below it and the stop loss above it.")
    cur = db.execute(
        """INSERT INTO orders (user_id, symbol, side, quantity, order_type, entry_price, target, stop_loss,
                               status, created_at, market_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)""",
        (user_id, sym, order.side, order.quantity, order.order_type, price, round(order.target, 2),
         round(order.stop_loss, 2), utcnow().isoformat(), now.isoformat(timespec="seconds")),
    )
    db.commit()
    return {"id": order_code(cur.lastrowid), "status": "OPEN", "fill_price": price}


def _pnl(side: str, entry: float, exit_price: float, qty: int) -> float:
    return round((exit_price - entry) * qty * (1 if side == "BUY" else -1), 2)


def settle(db: sqlite3.Connection, row: sqlite3.Row, market: MarketService, elapsed: int | None = None) -> None:
    """Check an open order against the bars that have traded since it was filled."""
    if row["status"] != "OPEN":
        return
    if elapsed is None:
        elapsed = market.clock.elapsed_minutes(datetime.fromisoformat(row["created_at"]))
    if elapsed <= 0:
        return
    filled = pd.Timestamp(row["market_time"]).floor("min")
    bars = market.store.minutes(row["symbol"])
    window = bars[bars.index > filled].head(elapsed)
    buy = row["side"] == "BUY"
    exit_price = reason = when = None
    for ts, bar in window.iterrows():
        if ts.date() != filled.date() or ts.time() >= SQUARE_OFF:
            exit_price, reason, when = bar["o"], "SQUARE_OFF", ts
            break
        stop_hit = bar["l"] <= row["stop_loss"] if buy else bar["h"] >= row["stop_loss"]
        target_hit = bar["h"] >= row["target"] if buy else bar["l"] <= row["target"]
        if stop_hit:
            exit_price, reason, when = row["stop_loss"], "STOP", ts
            break
        if target_hit:
            exit_price, reason, when = row["target"], "TARGET", ts
            break
    if reason:
        _close(db, row, round(float(exit_price), 2), reason, when.to_pydatetime())


def _close(db, row, exit_price: float, reason: str, when: datetime) -> None:
    db.execute(
        """UPDATE orders SET status = 'CLOSED', exit_price = ?, exit_reason = ?, exit_market_time = ?, pnl = ?
           WHERE id = ? AND status = 'OPEN'""",
        (exit_price, reason, when.isoformat(timespec="seconds"),
         _pnl(row["side"], row["entry_price"], exit_price, row["quantity"]), row["id"]),
    )
    db.commit()


def close_now(db: sqlite3.Connection, user_id: int, code: str, market: MarketService) -> None:
    row = _get(db, user_id, parse_code(code))
    settle(db, row, market)
    row = _get(db, user_id, row["id"])
    if row["status"] == "OPEN":
        _close(db, row, round(market.price_of(row["symbol"]), 2), "MANUAL", market.clock.now())


def _get(db, user_id: int, order_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user_id)).fetchone()
    if row is None:
        raise LookupError(f"Order {order_code(order_id)} not found.")
    return row


def list_orders(db: sqlite3.Connection, user_id: int, market: MarketService, status: str | None = None) -> list[dict]:
    for row in db.execute("SELECT * FROM orders WHERE user_id = ? AND status = 'OPEN'", (user_id,)).fetchall():
        settle(db, row, market)
    sql, args = "SELECT * FROM orders WHERE user_id = ?", [user_id]
    if status:
        sql += " AND status = ?"
        args.append(status)
    out = []
    for row in db.execute(sql + " ORDER BY id DESC", args).fetchall():
        last = None
        if row["status"] == "OPEN":
            try:
                last = round(market.price_of(row["symbol"]), 2)
            except KeyError:
                last = row["entry_price"]
        pnl = row["pnl"] if row["status"] == "CLOSED" else _pnl(row["side"], row["entry_price"], last, row["quantity"])
        out.append({
            "id": order_code(row["id"]),
            "symbol": row["symbol"],
            "side": row["side"],
            "quantity": row["quantity"],
            "entry_price": row["entry_price"],
            "target": row["target"],
            "stop_loss": row["stop_loss"],
            "status": row["status"],
            "placed_at": row["created_at"],
            "market_time": row["market_time"],
            "exit_price": row["exit_price"],
            "exit_market_time": row["exit_market_time"],
            "exit_reason": row["exit_reason"],
            "last_price": last,
            "pnl": pnl,
        })
    return out


def portfolio(orders: list[dict]) -> dict:
    closed = [o for o in orders if o["status"] == "CLOSED"]
    open_ = [o for o in orders if o["status"] == "OPEN"]
    wins = sum(1 for o in closed if o["pnl"] > 0)
    return {
        "open_positions": len(open_),
        "closed_trades": len(closed),
        "realized_pnl": round(sum(o["pnl"] for o in closed), 2),
        "unrealized_pnl": round(sum(o["pnl"] for o in open_), 2),
        "win_rate": round(wins / len(closed) * 100, 1) if closed else None,
    }
