"""App settings, read from environment variables or a .env file."""

from datetime import date
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Hawk AI API"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    data_dir: Path = BASE_DIR / "data"
    database_path: Path | None = None  # default: data/hawk.db

    # Market data
    data_provider: str = "csv"  # "csv" (Kaggle files, replayed) | "upstox" (not built yet)
    replay_date: date | None = None  # None = latest full day in the data
    replay_clock: str = "live"  # "live" or a fixed "HH:MM"
    keep_days: int = 7
    watchlist: list[str] = ["NIFTY", "RELIANCE", "HDFCBANK", "INFY", "TATAMOTORS", "ICICIBANK"]

    # Predictions
    predictor: str = "sample"  # "sample" | "model"
    model_path: Path = BASE_DIR / "models" / "hawk_model.joblib"

    # Paper trading
    paper_notional: float = 100_000

    # Auth
    jwt_secret: str | None = None
    jwt_expire_hours: int = 24
    seed_demo_user: bool = True
    demo_email: str = "demo@hawk.ai"
    demo_password: str = "hawk1234"

    @field_validator("replay_date", "jwt_secret", "database_path", mode="before")
    @classmethod
    def empty_is_none(cls, value):
        return None if value == "" else value

    @property
    def db_path(self) -> Path:
        return self.database_path or self.data_dir / "hawk.db"

    @property
    def raw_dir(self) -> Path:
        return self.data_dir / "raw"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"

    @property
    def content_dir(self) -> Path:
        return self.data_dir / "content"

    @property
    def reference_dir(self) -> Path:
        return self.data_dir / "reference"


@lru_cache
def get_settings() -> Settings:
    return Settings()
