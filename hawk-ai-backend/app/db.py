"""SQLite storage for users and paper-trading orders (no database server needed)."""

import sqlite3
from collections.abc import Iterator
from datetime import datetime, timezone

from .config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    symbol           TEXT    NOT NULL,
    side             TEXT    NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    order_type       TEXT    NOT NULL,
    entry_price      REAL    NOT NULL,
    target           REAL    NOT NULL,
    stop_loss        REAL    NOT NULL,
    status           TEXT    NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
    created_at       TEXT    NOT NULL,  -- real time the order was placed (UTC ISO)
    market_time      TEXT    NOT NULL,  -- replay market time of the fill (IST)
    exit_price       REAL,
    exit_market_time TEXT,
    exit_reason      TEXT,               -- TARGET | STOP | SQUARE_OFF | MANUAL
    pnl              REAL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, status);
"""


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def connect() -> sqlite3.Connection:
    path = get_settings().db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    # FastAPI may open the connection in one worker thread and use it in another,
    # so allow cross-thread use (each request still gets its own connection).
    conn = sqlite3.connect(path, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    # Write-ahead logging lets readers carry on while a write is in flight.
    # Orders settle (UPDATE + commit) on every GET /api/orders, from FastAPI's
    # thread pool, so the default rollback journal serialises those against
    # each other and eventually raises "database is locked".
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request, committed at the end."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
