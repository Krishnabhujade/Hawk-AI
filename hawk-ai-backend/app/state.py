"""Shared objects created once at startup."""

from .data.market import MarketService

_market: MarketService | None = None


def set_market(market: MarketService) -> None:
    global _market
    _market = market


def get_market() -> MarketService:
    """FastAPI dependency: the market data service."""
    if _market is None:
        raise RuntimeError("Market service not started yet")
    return _market
