"""The contract between the API and a prediction engine.

To plug in your trained model, write a class with a `predict` method that returns a
`Prediction`, then select it with PREDICTOR in .env. See app/ml/model.py for a template.
"""

from dataclasses import dataclass
from typing import Protocol

import pandas as pd


@dataclass
class Prediction:
    dir: str  # "UP" | "DOWN" | "FLAT"
    prob: int  # confidence 0–100
    action: str  # "BUY" | "SELL" | "WAIT"
    pattern: str
    samples: int  # how many similar historical setups the engine has seen
    hit_rate: int  # % of those setups that went the predicted way
    expected_move_pct: float  # signed, e.g. -0.9
    insight: str
    target: float | None = None
    stop_loss: float | None = None


class Predictor(Protocol):
    name: str

    def predict(self, symbol: str, bars: pd.DataFrame, horizon_min: int) -> Prediction:
        """
        symbol:      e.g. "RELIANCE" or "NIFTY 50"
        bars:        1-minute bars up to now, index = India time, columns o, h, l, c, v
                     (today plus the previous few sessions)
        horizon_min: minutes ahead to predict (15 or 30 from the frontend)
        """
        ...


def get_predictor(kind: str, model_path=None) -> Predictor:
    if kind == "sample":
        from .sample import SamplePredictor

        return SamplePredictor()
    if kind == "model":
        from .model import ModelPredictor

        return ModelPredictor(model_path)
    raise ValueError(f"Unknown PREDICTOR '{kind}'. Use 'sample' or 'model'.")
