"""Features and labels from 1-minute bars.

Use the SAME functions when training your model and inside the API, so the model sees
exactly the same inputs in both places (avoids "training/serving skew").
"""

import numpy as np
import pandas as pd

FEATURES = ["ret_1", "ret_5", "ret_15", "ret_30", "vol_30", "range_30", "volume_ratio", "session_pos", "dist_vwap"]


def feature_frame(bars: pd.DataFrame) -> pd.DataFrame:
    """One row of features per bar. `bars`: index = India time, columns o, h, l, c, v."""
    c = bars["c"]
    logc = np.log(c)
    out = pd.DataFrame(index=bars.index)
    for n in (1, 5, 15, 30):
        out[f"ret_{n}"] = logc.diff(n)
    out["vol_30"] = logc.diff().rolling(30).std()
    out["range_30"] = (bars["h"].rolling(30).max() - bars["l"].rolling(30).min()) / c
    vol = bars["v"].replace(0, np.nan)
    out["volume_ratio"] = (vol.rolling(15).mean() / vol.rolling(120).mean()).fillna(1.0)
    minute = bars.index.hour * 60 + bars.index.minute - (9 * 60 + 15)
    out["session_pos"] = np.asarray(minute) / 375
    day = bars.index.normalize()
    pv = (c * bars["v"]).groupby(day).cumsum()
    vv = bars["v"].groupby(day).cumsum().replace(0, np.nan)
    out["dist_vwap"] = (c / (pv / vv) - 1).fillna(0.0)
    return out[FEATURES]


def labels(bars: pd.DataFrame, horizon_min: int = 30, flat_band: float = 0.001) -> pd.Series:
    """Training target: UP / DOWN / FLAT by the return over the next `horizon_min` minutes.

    Moves smaller than `flat_band` (0.1%) count as FLAT. The last `horizon_min` rows of
    each day have no future inside the session and are returned as NaN — drop them.
    """
    c = bars["c"]
    day = bars.index.normalize()
    future = c.groupby(day).shift(-horizon_min)
    ret = future / c - 1
    lab = pd.Series(np.where(ret > flat_band, "UP", np.where(ret < -flat_band, "DOWN", "FLAT")), index=bars.index)
    return lab.where(future.notna())
