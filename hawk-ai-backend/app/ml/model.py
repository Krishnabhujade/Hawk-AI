"""Template for serving your trained model (PREDICTOR=model).

Save your model like this at the end of training:

    import joblib
    from app.ml.features import FEATURES
    joblib.dump({"model": clf, "features": FEATURES, "horizon_min": 30, "name": "hawk-gbm-v1"},
                "models/hawk_model.joblib")

`clf` must have predict_proba() and classes_ containing "UP", "DOWN" and "FLAT"
(any scikit-learn classifier works). Needs `pip install scikit-learn joblib`.
"""

from pathlib import Path

import pandas as pd

from .base import Prediction
from .features import feature_frame


class ModelPredictor:
    def __init__(self, model_path: Path | None):
        import joblib  # only needed when the real model is used

        path = Path(model_path or "models/hawk_model.joblib")
        if not path.exists():
            raise FileNotFoundError(f"PREDICTOR=model but {path} does not exist. Train and save the model first.")
        bundle = joblib.load(path)
        self.model = bundle["model"]
        self.features = bundle["features"]
        self.name = bundle.get("name", path.stem)

    def predict(self, symbol: str, bars: pd.DataFrame, horizon_min: int) -> Prediction:
        row = feature_frame(bars)[self.features].tail(1).fillna(0.0)
        proba = dict(zip(self.model.classes_, self.model.predict_proba(row)[0]))
        direction = max(proba, key=proba.get)
        prob = int(round(proba[direction] * 100))
        last = float(bars["c"].iloc[-1])

        sign = {"UP": 1, "DOWN": -1}.get(direction, 0)
        expected = 0.5  # TODO: replace with your model's expected move, e.g. from a regression head
        action = "WAIT" if sign == 0 or prob < 58 else ("BUY" if sign > 0 else "SELL")
        return Prediction(
            dir=direction,
            prob=prob,
            action=action,
            pattern="Model signal",  # TODO: plug in your pattern detector
            samples=0,  # TODO: number of similar historical setups
            hit_rate=prob,  # TODO: measured hit rate from your backtest
            expected_move_pct=expected * sign if sign else 0.1,
            insight=f"{self.name}: P(up) {proba.get('UP', 0):.0%}, P(down) {proba.get('DOWN', 0):.0%}.",
            target=round(last * (1 + sign * expected / 100), 2) if sign else None,
            stop_loss=round(last * (1 - sign * expected * 0.45 / 100), 2) if sign else None,
        )
