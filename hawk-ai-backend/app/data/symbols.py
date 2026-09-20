"""Symbol names, aliases and sectors."""

import csv
from functools import lru_cache
from pathlib import Path

# Short IDs the frontend can use for indices -> the name used in the data files.
ALIASES = {
    "NIFTY": "NIFTY 50",
    "NIFTY50": "NIFTY 50",
    "BANKNIFTY": "NIFTY BANK",
    "NIFTYBANK": "NIFTY BANK",
    "NIFTYIT": "NIFTY IT",
    "FINNIFTY": "NIFTY FIN SERVICE",
}

# How names appear in the UI (anything missing shows its symbol).
DISPLAY_NAMES = {
    "NIFTY 50": "NIFTY 50",
    "HDFCBANK": "HDFC BANK",
    "ICICIBANK": "ICICI BANK",
    "INFY": "INFOSYS",
    "TATAMOTORS": "TATA MOTORS",
    "BHARTIARTL": "BHARTI AIRTEL",
    "SBIN": "SBI",
    "LT": "L&T",
}

# Index cards on the Market screen.
OVERVIEW_INDICES = ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY MIDCAP 100"]

# Sector heatmap tiles: label -> NSE sector index.
SECTOR_INDICES = {
    "Auto": "NIFTY AUTO",
    "Metals": "NIFTY METAL",
    "Realty": "NIFTY REALTY",
    "Energy": "NIFTY ENERGY",
    "Infra": "NIFTY INFRA",
    "Pharma": "NIFTY PHARMA",
    "FMCG": "NIFTY FMCG",
    "IT": "NIFTY IT",
    "Media": "NIFTY MEDIA",
    "Financials": "NIFTY FIN SERVICE",
    "Banks": "NIFTY BANK",
    "PSU Bank": "NIFTY PSU BANK",
}

VIX_SYMBOL = "INDIA VIX"

# Fallback sectors (used when data/reference/ind_nifty500list.csv is missing).
BUILTIN_SECTORS = {
    "RELIANCE": "Oil & Gas", "HDFCBANK": "Financials", "ICICIBANK": "Financials", "INFY": "IT",
    "TATAMOTORS": "Automobile", "DIXON": "Consumer Elec.", "CDSL": "Financials", "KAYNES": "Industrials",
    "BSE": "Financials", "APARINDS": "Capital Goods", "ANANTRAJ": "Realty", "IDEA": "Telecom",
    "YESBANK": "Financials", "SUZLON": "Renewables", "JPPOWER": "Utilities", "RVNL": "Infrastructure",
    "IRFC": "Financials", "NESTLEIND": "FMCG", "BRITANNIA": "FMCG", "COLGATE": "FMCG",
    "PIDILITIND": "Chemicals", "SIEMENS": "Capital Goods", "TATASTEEL": "Metals", "SBIN": "Financials",
    "ONGC": "Energy", "NHPC": "Utilities", "PNB": "Financials", "BHARTIARTL": "Telecom", "LT": "Infrastructure",
}


def canonical(symbol: str) -> str:
    """'nifty' -> 'NIFTY 50', ' reliance ' -> 'RELIANCE'."""
    key = " ".join(symbol.strip().upper().split())
    return ALIASES.get(key.replace(" ", ""), ALIASES.get(key, key))


def display_name(symbol: str) -> str:
    return DISPLAY_NAMES.get(symbol, symbol)


@lru_cache
def _reference_sectors(reference_dir: str) -> dict[str, str]:
    """Reads NSE's ind_nifty500list.csv (columns include Symbol and Industry) if present."""
    path = Path(reference_dir) / "ind_nifty500list.csv"
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as f:
        rows = csv.DictReader(f)
        return {r["Symbol"].strip().upper(): r["Industry"].strip() for r in rows if r.get("Symbol") and r.get("Industry")}


def sector_of(symbol: str, reference_dir: Path) -> str:
    return _reference_sectors(str(reference_dir)).get(symbol) or BUILTIN_SECTORS.get(symbol, "—")
