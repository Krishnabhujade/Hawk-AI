"""Paper trading: place, list and close simulated orders (sign-in required)."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..data.market import MarketService
from ..db import get_db
from ..paper import engine
from ..schemas import OrderIn, OrderOut, OrderPlaced, Portfolio
from ..security import current_user
from ..state import get_market

router = APIRouter(prefix="/api", tags=["paper trading"])


@router.post("/orders", response_model=OrderPlaced, status_code=status.HTTP_201_CREATED)
def place_order(
    order: OrderIn,
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
    market: MarketService = Depends(get_market),
):
    try:
        return engine.place(db, user["id"], order, market)
    except engine.OrderRejected as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None


@router.get("/orders", response_model=list[OrderOut])
def list_orders(
    status_filter: str | None = Query(None, alias="status", description="OPEN or CLOSED"),
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
    market: MarketService = Depends(get_market),
):
    if status_filter and status_filter.upper() not in ("OPEN", "CLOSED"):
        raise HTTPException(status_code=400, detail="status must be OPEN or CLOSED.")
    return engine.list_orders(db, user["id"], market, status_filter.upper() if status_filter else None)


@router.post("/orders/{order_id}/close", response_model=OrderOut)
def close_order(
    order_id: str,
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
    market: MarketService = Depends(get_market),
):
    try:
        engine.close_now(db, user["id"], order_id, market)
    except (engine.OrderRejected, LookupError) as exc:
        raise HTTPException(status_code=404, detail=str(exc).strip("'\"")) from None
    code = engine.order_code(engine.parse_code(order_id))
    return next(o for o in engine.list_orders(db, user["id"], market) if o["id"] == code)


@router.get("/portfolio", response_model=Portfolio)
def portfolio(
    user: sqlite3.Row = Depends(current_user),
    db: sqlite3.Connection = Depends(get_db),
    market: MarketService = Depends(get_market),
):
    return engine.portfolio(engine.list_orders(db, user["id"], market))
