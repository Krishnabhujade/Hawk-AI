"""Request and response shapes. JSON uses camelCase to match the React frontend."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Direction = Literal["UP", "DOWN", "FLAT"]
Action = Literal["BUY", "SELL", "WAIT", "HOLD"]
Side = Literal["BUY", "SELL"]


class Schema(BaseModel):
    """Base model: snake_case in Python, camelCase in JSON."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- auth ----------
class RegisterIn(Schema):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=8, max_length=200)


class LoginIn(Schema):
    email: str = ""
    password: str = ""


class UserOut(Schema):
    name: str
    email: str


class TokenOut(Schema):
    token: str
    user: UserOut


# ---------- market ----------
class CallSummary(Schema):
    action: Action
    dir: Direction | None = None
    prob: int


class WatchItem(Schema):
    symbol: str
    name: str
    price: float
    change_pct: float
    call: CallSummary


class Quote(Schema):
    symbol: str
    price: float
    change: float
    change_pct: float
    time: int  # epoch ms of the (replayed) market time


class Candle(BaseModel):
    t: int  # epoch ms, candle open time
    o: float
    h: float
    l: float  # noqa: E741
    c: float
    v: float


class LadderBand(Schema):
    label: str
    pct: int
    favoured: bool


class PredictionOut(Schema):
    symbol: str
    name: str
    horizon_min: int
    dir: Direction
    prob: int
    action: Action
    pattern: str
    samples: int
    hit_rate: int
    expected_move_pct: float
    suggested_qty: int
    insight: str
    target: float | None = None
    stop_loss: float | None = None
    ladder: list[LadderBand] | None = None
    model: str


class Pulse(Schema):
    verdict: Literal["BULLISH", "NEUTRAL", "BEARISH"]
    score: int
    advances: int
    declines: int
    vix: float | None = None


class IndexCard(Schema):
    name: str
    price: float
    change_pct: float
    spark: list[float]


class SectorMove(Schema):
    name: str
    change_pct: float


class MarketOverview(Schema):
    pulse: Pulse
    indices: list[IndexCard]
    sectors: list[SectorMove]


class ScreenerRow(Schema):
    symbol: str
    sector: str
    ltp: float
    change_pct: float
    metric: str
    call: CallSummary


class ScreenerOut(Schema):
    id: str
    label: str
    metric_label: str
    rows: list[ScreenerRow]


class SymbolInfo(Schema):
    symbol: str
    name: str
    kind: Literal["stock", "index"]
    sector: str


# ---------- content ----------
class NewsItem(Schema):
    id: str
    time: str
    symbol: str
    sentiment: Literal["Positive", "Negative", "Neutral"]
    headline: str
    impact: str
    explanation: str


class PolicyItem(Schema):
    id: str
    source: str
    text: str


class HeadlineStat(Schema):
    label: str
    value: str


class EquityPoint(Schema):
    quarter: str
    value: float
    out_of_sample: bool


class PatternStat(Schema):
    name: str
    samples: int
    hit_rate: float
    avg_move: float
    median_min: int


class BacktestOut(Schema):
    headline: list[HeadlineStat]
    equity: list[EquityPoint]
    patterns: list[PatternStat]
    method: list[str]
    note: str | None = None


# ---------- paper trading ----------
class OrderIn(Schema):
    symbol: str
    side: Side
    quantity: int = Field(gt=0, le=1_000_000)
    order_type: Literal["BRACKET"] = "BRACKET"
    entry: float | None = None  # price the user saw; the fill uses the current market price
    target: float = Field(gt=0)
    stop_loss: float = Field(gt=0)


class OrderPlaced(Schema):
    id: str
    status: Literal["OPEN", "CLOSED"]
    fill_price: float


class OrderOut(Schema):
    id: str
    symbol: str
    side: Side
    quantity: int
    entry_price: float
    target: float
    stop_loss: float
    status: Literal["OPEN", "CLOSED"]
    placed_at: str
    market_time: str
    exit_price: float | None = None
    exit_market_time: str | None = None
    exit_reason: str | None = None
    last_price: float | None = None
    pnl: float


class Portfolio(Schema):
    open_positions: int
    closed_trades: int
    realized_pnl: float
    unrealized_pnl: float
    win_rate: float | None


class Status(Schema):
    status: str
    provider: str
    data_source: str
    replay_date: str
    market_time: str
    predictor: str
    symbols: int
