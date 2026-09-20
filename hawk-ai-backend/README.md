# Hawk AI — FastAPI backend

Backend for the Hawk AI React terminal. It serves every endpoint the frontend calls:

- **Market data**, replayed from the Kaggle NSE 1-minute files. A past trading day plays back as "today",
  so prices move at any time of day.
- **AI calls** from a placeholder engine until your model is ready (one setting switches to the model).
- **Paper trading**: bracket orders with target, stop loss, 15:20 square-off and P&L. No real money.
- **Accounts** in SQLite: register and login with hashed passwords and JWT tokens.

It starts on **generated sample data**, so you can run it before downloading anything.

---

## 1. Run it (Windows PowerShell)

You need **Python 3.10 or newer** (`python --version`).

```powershell
cd hawk-ai-backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open **http://localhost:8000/docs** to see and try every endpoint.
The demo account is **demo@hawk.ai** / **hawk1234**.

> If `Activate.ps1` is blocked, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
> On macOS or Linux, use `source .venv/bin/activate` instead.

## 2. Connect the React frontend

In the **hawk-ai-frontend** folder, create a file called `.env` containing:

```
VITE_API_URL=http://localhost:8000
```

Restart `npm run dev`. The header now says **Live · API**. Sign in with the demo account.

The frontend has no sign-up page yet. To create more accounts, use `POST /api/auth/register` in `/docs`.

---

## 3. Load the real Kaggle data

1. Download the two datasets:
   - Stocks: https://www.kaggle.com/datasets/debashis74017/algo-trading-data-nifty-100-data-with-indicators
   - Indices: https://www.kaggle.com/datasets/debashis74017/nifty-50-minute-data
2. Copy the files in:
   - stock files (`RELIANCE_minute.csv`, …) → `data/raw/stocks/`
   - index files (`NIFTY 50_minute.csv`, `NIFTY BANK_minute.csv`, `INDIA VIX_minute.csv`, sector indices …) → `data/raw/indices/`
   - optional: NSE's `ind_nifty500list.csv` (from niftyindices.com) → `data/reference/`, for real sector names
3. Convert them into the small cache the API reads:

   ```powershell
   # quick start: just a few symbols (a minute or two)
   python -m app.data.prepare --only 'NIFTY 50,NIFTY BANK,NIFTY IT,RELIANCE,HDFCBANK,INFY,ICICIBANK'

   # everything (can take 15–30 minutes for ~500 files)
   python -m app.data.prepare
   ```

4. Restart the API. `GET /api/status` now shows `"dataSource": "kaggle"`.

The prepare step keeps the last `KEEP_DAYS` (default 7) trading days of 1-minute bars plus the full daily
history for each symbol. It replaces the sample data the first time it runs. If a watchlist symbol has no
file (for example, a stock that was renamed), it is skipped; edit `WATCHLIST` in `.env`.

### How the replay works

- `REPLAY_DATE` chooses which day is played back. It defaults to the latest full day in your data.
- With `REPLAY_CLOCK=live`, the replay follows the real clock through the 09:15–15:30 session and loops
  all day. At 11:00 real time the replay is at 11:00; at night it keeps cycling so the demo always moves.
- With `REPLAY_CLOCK=14:00`, the market is frozen at 14:00, which is handy for screenshots and tests.

Upstox live data is planned. `app/data/upstox.py` has the plan and the endpoints to use.

---

## 4. Plug in your model

`GET /api/prediction/{symbol}` uses `PREDICTOR=sample` for now. This is a simple momentum rule, and its
insight text says it's a placeholder. When your model is ready:

1. Build features with `app/ml/features.py` (`feature_frame`, and `labels` for the training target).
   Using the same functions in training and in the API keeps the model's inputs identical.
2. Save the trained model:

   ```python
   import joblib
   from app.ml.features import FEATURES
   joblib.dump({"model": clf, "features": FEATURES, "horizon_min": 30, "name": "hawk-gbm-v1"},
               "models/hawk_model.joblib")
   ```

   `clf` can be any scikit-learn classifier with `predict_proba` and classes `UP`, `DOWN`, `FLAT`.
3. Run `pip install scikit-learn joblib`, set `PREDICTOR=model` in `.env`, and restart.
   Fill in the `TODO`s in `app/ml/model.py`: expected move, pattern, samples and hit rate.

To use a completely different model, write a class with the same `predict()` method as in
`app/ml/base.py` and register it in `get_predictor()`.

---

## 5. Paper trading rules

- Orders fill immediately at the current replay price. The target and stop loss must sit on the correct
  sides of that price.
- An order closes when its **target** or **stop loss** is touched. If both are touched in the same minute,
  the stop loss is assumed to have hit first.
- Anything still open at **15:20** is squared off. No new orders are accepted from 15:20.
- P&L is gross: brokerage and taxes are not included.

| Endpoint | What it does |
|---|---|
| `POST /api/orders` | place a bracket order (sign-in required) |
| `GET /api/orders?status=OPEN` | your orders with live or closed P&L |
| `POST /api/orders/{id}/close` | close an open order at the current price |
| `GET /api/portfolio` | open positions, realised and unrealised P&L, win rate |

---

## 6. All endpoints

| Method & path | Returns |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | accounts |
| `GET /api/watchlist` | watchlist with prices and AI calls |
| `GET /api/quote/{symbol}` | last price and change (`NIFTY` = NIFTY 50) |
| `GET /api/candles/{symbol}?timeframe=5m&limit=58` | OHLCV candles (1m, 5m, 15m, 30m) |
| `GET /api/prediction/{symbol}?horizon=30` | AI call |
| `GET /api/market/overview` | market pulse (breadth), index cards, sector heat |
| `GET /api/screeners/{id}` | `multibagger`, `volume-gainers`, `volume-losers`, `active-volume`, `active-value` |
| `GET /api/symbols?q=bank` | search loaded symbols |
| `GET /api/news` · `/api/policy` · `/api/backtest/summary` | sample content from `data/content/*.json` |
| `GET /api/health` · `GET /api/status` | health check, and which data is loaded |

News, policy and backtest are **sample JSON files** for now. Replace them in `data/content/` (they reload
automatically), or swap in a real news source later.

---

## 7. Project structure

```
app/
├── main.py            ← creates the app, CORS, startup
├── config.py          ← all settings (see .env.example)
├── db.py, security.py ← SQLite tables, password hashing, JWT
├── schemas.py         ← request/response shapes (camelCase JSON for the frontend)
├── routers/           ← auth, market, content, orders, system
├── data/
│   ├── prepare.py     ← Kaggle CSV → cache
│   ├── sample.py      ← generated sample data
│   ├── store.py       ← loads the cache
│   ├── replay.py      ← replay clock
│   ├── market.py      ← quotes, candles, breadth, screeners
│   └── upstox.py      ← plan for live data
├── ml/                ← predictor interface, sample engine, features, model template
└── paper/engine.py    ← paper trading
data/
├── raw/stocks, raw/indices   ← put Kaggle CSVs here
├── cache/                    ← created by prepare (or sample data)
├── content/                  ← news, policy, backtest JSON
└── hawk.db                   ← SQLite database (created on first run)
tests/                        ← pytest suite
```

## 8. Tests

```powershell
pip install -r requirements-dev.txt
pytest -q
```

## 9. Settings

Copy `.env.example` to `.env` and change what you need: allowed frontend URLs (`CORS_ORIGINS`), replay
date and clock, watchlist, predictor, paper position size, JWT secret and demo account.
For a deployed server, set `JWT_SECRET` to a long random string (32+ characters) and add your Vercel URL to
`CORS_ORIGINS`.
