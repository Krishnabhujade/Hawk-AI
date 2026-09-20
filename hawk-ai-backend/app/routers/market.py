"""Market data and AI calls: watchlist, quotes, candles, predictions, overview, screeners."""

from fastapi import APIRouter, Depends, HTTPException, Query

from ..data.market import SCREENERS, TIMEFRAMES, MarketService
from ..schemas import Candle, MarketOverview, PredictionOut, Quote, ScreenerOut, SymbolInfo, WatchItem
from ..state import get_market

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/watchlist", response_model=list[WatchItem])
def watchlist(market: MarketService = Depends(get_market)):
    return market.watchlist()


@router.get("/quote/{symbol}", response_model=Quote)
def quote(symbol: str, market: MarketService = Depends(get_market)):
    return market.quote(symbol)


@router.get("/candles/{symbol}", response_model=list[Candle])
def candles(
    symbol: str,
    timeframe: str = Query("5m", description="1m, 5m, 15m or 30m"),
    limit: int = Query(58, ge=1, le=1000),
    market: MarketService = Depends(get_market),
):
    if timeframe not in TIMEFRAMES:
        raise HTTPException(status_code=400, detail=f"Unsupported timeframe {timeframe}. Use 1m, 5m, 15m or 30m.")
    return market.candles(symbol, timeframe, limit)


@router.get("/prediction/{symbol}", response_model=PredictionOut)
def prediction(
    symbol: str,
    horizon: int = Query(30, ge=5, le=120, description="minutes ahead"),
    market: MarketService = Depends(get_market),
):
    return market.prediction(symbol, horizon)


@router.get("/market/overview", response_model=MarketOverview)
def overview(market: MarketService = Depends(get_market)):
    return market.overview()


@router.get("/screeners/{screener_id}", response_model=ScreenerOut)
def screener(screener_id: str, market: MarketService = Depends(get_market)):
    if screener_id not in SCREENERS:
        raise HTTPException(status_code=404, detail=f"Unknown screener {screener_id}. Use one of: {', '.join(SCREENERS)}.")
    return market.screener(screener_id)


@router.get("/symbols", response_model=list[SymbolInfo])
def symbols(q: str = Query("", description="search text"), market: MarketService = Depends(get_market)):
    return market.search(q)
