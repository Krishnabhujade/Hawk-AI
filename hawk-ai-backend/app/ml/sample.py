"""Placeholder prediction engine used until the real model is ready.

It is NOT a trained model: it looks at the last 30 minutes of price movement and
turns it into a call, so the frontend has sensible, changing values to show.
"""

import math
import zlib

import numpy as np
import pandas as pd

from .base import Prediction


class SamplePredictor:
    name = "sample-momentum-v0"

    def predict(self, symbol: str, bars: pd.DataFrame, horizon_min: int) -> Prediction:
        closes = bars["c"].to_numpy(dtype=float)
        last = float(closes[-1])
        lookback = min(30, len(closes) - 1)
        move = last / closes[-1 - lookback] - 1 if lookback > 0 else 0.0

        log_returns = np.diff(np.log(closes[-121:]))
        noise = float(log_returns.std()) if len(log_returns) > 5 else 0.001
        noise = max(noise, 1e-4)
        z = move / (noise * math.sqrt(max(lookback, 1)))  # move measured in "normal noise" units

        if z > 0.5:
            direction, sign = "UP", 1
        elif z < -0.5:
            direction, sign = "DOWN", -1
        else:
            direction, sign = "FLAT", 0

        if direction == "FLAT":
            prob = int(round(52 + (0.5 - abs(z)) * 10))
        else:
            prob = int(round(min(78, 52 + abs(z) * 8)))
        action = "WAIT" if direction == "FLAT" or prob < 58 else ("BUY" if sign > 0 else "SELL")

        typical = noise * math.sqrt(horizon_min) * 100  # typical % move over the horizon
        expected = round(min(max(typical * 1.2, 0.2), 2.5), 1)
        expected_move = expected * sign if sign else round(max(typical * 0.4, 0.1), 1)

        window = bars.tail(60)
        near_high = last >= float(window["h"].max()) * 0.998
        near_low = last <= float(window["l"].min()) * 1.002
        if direction == "UP":
            pattern = "Breakout" if near_high else "Higher lows"
        elif direction == "DOWN":
            pattern = "Breakdown" if near_low else "Lower highs"
        else:
            pattern = "Range compression"

        seed = zlib.crc32(f"{symbol}:{pattern}".encode())
        samples = 400 + seed % 1500
        hit_rate = max(50, prob - 3 - seed % 4)

        target = stop = None
        if sign:
            target = round(last * (1 + sign * expected / 100), 2)
            stop = round(last * (1 - sign * expected * 0.45 / 100), 2)

        insight = (
            f"Placeholder signal (model in development): price moved {move * 100:+.2f}% over the last "
            f"{lookback} minutes, about {abs(z):.1f}× its usual noise."
        )
        return Prediction(
            dir=direction,
            prob=prob,
            action=action,
            pattern=pattern,
            samples=int(samples),
            hit_rate=int(hit_rate),
            expected_move_pct=float(expected_move),
            insight=insight,
            target=target,
            stop_loss=stop,
        )
