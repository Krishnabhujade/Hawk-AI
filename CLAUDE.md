# Hawk AI — project context for Claude Code

## What this project is

**SNP HAWK AI** is a final-year IT engineering major project (academic year 2026–27, team of 4),
sponsored by SNP Innovation Pvt. Ltd. It is an AI-assisted trading terminal for Indian markets
(NSE). The user watches a live chart, reads an AI call ("UP 75% in the next 30 min → BUY") and
acts with one tap: a bracket order with target and stop loss attached. The project also needs a
research paper, so results must be honest and reproducible.

Scope rule: **paper trading only**. No real broker orders, and no real money.

## Repository layout

```
HAWK-AI/
├── hawk-ai-frontend/   React 19 + Vite 7, plain JavaScript (no TypeScript), react-router-dom 7
└── hawk-ai-backend/    Python 3.10+, FastAPI, pandas, SQLite, PyJWT
```

Each folder has a README with setup steps and the full API contract. Read both READMEs first.

The developer works on **Windows PowerShell**. They are strongest in **Python/FastAPI** and are
still learning React. So keep the React code simple and well commented, and explain frontend
changes in plain language. Give terminal commands one per line, because pasting several lines
at once into PowerShell has caused problems before.

---

## What has been built so far

### Frontend (`hawk-ai-frontend/`)

- A rebuild of the team's original design (a Claude Design export on Vercel), with the same look:
  the "Industry" design system (steel-blue accents, Barlow and Barlow Condensed fonts, blueprint
  frames with corner marks).
- **Screens**:
  - **Terminal**: watchlist, candlestick chart with a forecast cone (plain divs + SVG, no chart
    library), "Hawk AI says" panel with Verdict and Ladder views, and an order ticket with a
    confirm dialog.
  - **Market**: market pulse, index cards, 5 screeners, sector heatmap, news and sentiment,
    policy watch.
  - **Proof**: backtest stats, walk-forward equity bars, pattern table, method.
  - **Login**, **Settings** and a **404** page. There is no sign-up screen yet —
    create extra accounts with `POST /api/auth/register` from `/docs`.
- **Responsive layouts**: desktop (1100px and up), tablet, and phone (bottom tab bar, watchlist
  as a sideways-scrolling strip).
- **Data layer**:
  - `src/api/index.js` is the ONLY place components get data from. Components never call
    `fetch()` directly.
  - With `VITE_API_URL` empty, the app uses the mock data in `src/api/mock/`. With it set (the
    `.env` has `VITE_API_URL=http://localhost:8000`), it calls the backend.
  - `src/hooks/useApi.js` handles loading, polling and stale responses.
- **Auth**:
  - `AuthContext` stores `{token, user}` in localStorage.
  - When the app opens with a saved token, it checks it with `GET /api/auth/me`.
  - Any 401 on a request that sent a token signs the user out (`hawk:unauthorized` event).
- **Settings** are stored in localStorage: forecast horizon 15/30, default call view, default
  timeframe, live updates, confirm orders.
- **Known gap**: the Terminal's default symbol is hardcoded to `'NIFTY'` in `TerminalPage.jsx`.

### Backend (`hawk-ai-backend/`)

- Serves exactly the JSON contract the frontend expects. JSON is camelCase through Pydantic alias
  generators (`app/schemas.py`); Python code is snake_case.
- **Market data**: Kaggle NSE 1-minute CSVs are **replayed**.
  - `python -m app.data.prepare` converts the raw files in `data/raw/stocks` and
    `data/raw/indices` into `data/cache/`. The cache holds the last `KEEP_DAYS` days of minute
    bars plus the full daily history.
  - `ReplayClock` plays one past day. `REPLAY_CLOCK=live` follows the real clock through
    09:15–15:30 and loops all day; `REPLAY_CLOCK=HH:MM` freezes the market at that time.
  - If there's no cache, it generates **sample data** (`app/data/sample.py`).
  - Datasets used:
    - Stocks: `kaggle.com/datasets/debashis74017/algo-trading-data-nifty-100-data-with-indicators`
    - Indices: `kaggle.com/datasets/debashis74017/nifty-50-minute-data`
- **Predictions**:
  - `PREDICTOR=sample` is a placeholder momentum rule (`app/ml/sample.py`). Its insight text
    clearly says it's a placeholder.
  - The team is developing the real model separately. The plug-in point is the `Predictor`
    protocol (`app/ml/base.py`) and the template `app/ml/model.py`, which loads a joblib bundle
    `{model, features, horizon_min, name}`.
  - `app/ml/features.py` has `feature_frame()` and `labels()`, to be shared by training and
    serving.
- **Paper trading** (`app/paper/engine.py`):
  - Orders fill at the replay price, and the bracket levels are validated.
  - An order closes on target or stop. If both are hit in the same minute, the stop wins.
  - Open orders are squared off at 15:20, and no new orders are accepted from 15:20.
  - P&L is gross (no brokerage or tax).
  - Endpoints: `POST /api/orders`, `GET /api/orders`, `POST /api/orders/{id}/close`,
    `GET /api/portfolio`.
- **Auth**:
  - SQLite (`data/hawk.db`), PBKDF2 password hashing from the standard library, JWT (PyJWT).
  - The demo user **demo@hawk.ai / hawk1234** is created on startup.
  - Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.
- **Content**: news, policy and backtest are **sample JSON** files in `data/content/`. The
  backtest numbers are placeholders, not real results.
- **Tests**: `tests/test_api.py` (16 tests, pytest + TestClient).

### Important: how the code was verified

The previous assistant could NOT run `npm install`, Vite, real FastAPI or pytest in its sandbox.
It verified the work in other ways:

- The frontend was bundled with esbuild using a stand-in for react-router-dom, then tested in
  headless Chromium at desktop, tablet and phone sizes.
- The backend was run with a FastAPI stand-in built on Starlette + Pydantic. The pytest suite
  passed, and the React build was tested end to end against it.

The user has since run both apps successfully on Windows. Still, treat the real toolchain as
not yet fully exercised.

---

## Rules for working on this project

1. **Don't break the API contract.** If you change a response shape, update the backend schema,
   the frontend mock and both READMEs together.
2. **Honesty matters (research paper).** Never present sample or placeholder numbers as real
   results. Keep the "placeholder" wording until real results replace it.
3. **Keep dependencies minimal.** No new UI libraries or state managers unless clearly needed.
   Plain CSS in `src/styles/`, with design tokens in `tokens.css`.
4. **Paper trading only.** Don't add real order placement.
5. **Run the checks after changes.** Backend: `pytest -q`. Frontend: `npm run build`. Add tests
   for new backend behaviour.
6. **Ask before big changes** (a new dependency, a schema change, a database migration, a
   deployment).

---

## What to do next (in this order)

1. **Verify on the real toolchain.** Backend: `pip install -r requirements-dev.txt`, then
   `pytest -q`. Frontend: `npm run build`. Fix anything that fails. Report what you changed.
2. **Load the real Kaggle data.**
   - Check the actual CSV column names and index file names against what `app/data/prepare.py`
     and `app/data/symbols.py` assume. The assumptions are: stock files named `RELIANCE_minute.csv`;
     index files named like `NIFTY 50_minute.csv`; timestamps possibly with `+05:30`; sector index
     names such as `NIFTY AUTO`, `NIFTY METAL`, `NIFTY PSU BANK`, `NIFTY FIN SERVICE`, `INDIA VIX`.
   - Adjust the name mappings if they differ.
   - Some watchlist symbols may have been renamed (for example TATAMOTORS). Update the `WATCHLIST`
     default if so.
3. **Frontend: Orders & P&L screen.** Add a screen listing paper orders (open and closed, with
   P&L), with a Close button and a portfolio summary, using the existing endpoints. Also:
   - Make the Terminal's default symbol the first watchlist item instead of `'NIFTY'`.
   - Show the replay date and time from `GET /api/status` in the header when connected to the
     API.
4. **Model integration, only when the team's model is ready.**
   - Help write the training script using `app/ml/features.py`, with a **time-based**
     train/validation/test split (never shuffled) and walk-forward evaluation.
   - Compare against baselines ("always UP", "same direction as last candle"), and include costs
     in backtests.
   - Save the model to `models/hawk_model.joblib`, switch to `PREDICTOR=model`, fill in the
     TODOs in `app/ml/model.py`, and replace `data/content/backtest.json` with the real
     backtest output.
   - Expect realistic direction accuracy around 52–56%. Treat much higher numbers as a likely
     data leak.
5. **Later:**
   - Upstox live data provider (`app/data/upstox.py` has the plan).
   - A real news feed with sentiment.
   - Deployment: frontend on Vercel; backend on Render or Railway, with `JWT_SECRET` and
     `CORS_ORIGINS` set. Note that SQLite on ephemeral disks resets.

Start with step 1 and tell me the results before moving on.
