"""Upstox live data — not built yet.

Plan for when you add it (set DATA_PROVIDER=upstox):
  1. Create an app at https://account.upstox.com/developer/apps and get an access token.
  2. Candles:   GET https://api.upstox.com/v3/historical-candle/{instrument_key}/minutes/1/{to}/{from}
     Today:     GET https://api.upstox.com/v3/historical-candle/intraday/{instrument_key}/minutes/1
     Prices:    GET https://api.upstox.com/v2/market-quote/ltp?instrument_key=...
     (instrument keys look like "NSE_EQ|INE002A01018" or "NSE_INDEX|Nifty 50")
  3. Implement the same methods MarketService uses from the CSV store (minutes, daily, tape)
     and a clock that returns the real time instead of the replay time.

Check the current Upstox API docs before building — endpoints and limits change.
"""


class UpstoxProvider:
    def __init__(self, *args, **kwargs):
        raise NotImplementedError(
            "DATA_PROVIDER=upstox is not built yet. Use DATA_PROVIDER=csv for now (see app/data/upstox.py)."
        )
