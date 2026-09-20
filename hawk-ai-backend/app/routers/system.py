"""Health and status checks."""

from fastapi import APIRouter, Depends

from ..data.market import MarketService
from ..schemas import Status
from ..state import get_market

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/status", response_model=Status)
def status(market: MarketService = Depends(get_market)):
    """Which data is loaded and where the replay clock is."""
    return market.status()
