# Hawk AI — React frontend

React (Vite) version of the **SNP HAWK AI** trading terminal. It has the same look as the
original design, plus a phone/tablet layout, a login page and a settings page.

| Screen | What it shows |
|---|---|
| **Terminal** | Watchlist, candle chart with the AI forecast cone, the AI call (Verdict or Ladder view), order ticket with a confirm step |
| **Market** | Market pulse, index cards, 5 screeners, sector heatmap, news & sentiment, policy watch |
| **Proof** | 10-year backtest stats, walk-forward equity, pattern performance, method |
| **Login** | Sign-in form (demo mode accepts any email + password) |
| **Settings** | Forecast horizon, default call view and timeframe, live updates, order confirmation, broker placeholders, sign out |

It runs on **built-in sample data** until you point it at your FastAPI backend.

---

## 1. Run it

You need **Node.js 20.19+ or 22.12+** (check with `node -v`).

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **Try the demo**.

Other commands:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

---

## 2. Project structure

```
src/
├── api/
│   ├── index.js          ← the ONLY place the UI gets data from (api.getCandles, api.placeOrder, …)
│   ├── client.js         ← fetch wrapper: base URL, auth token, timeouts, error messages
│   └── mock/             ← sample data used when VITE_API_URL is empty
├── components/
│   ├── layout/           ← Header, BottomNav (phones), AppShell, RequireAuth
│   ├── terminal/         ← Watchlist, ChartPanel, CandleChart, CallPanel, VerdictView, LadderView, OrderTicket, OrderDialog
│   ├── market/           ← MarketPulse, IndexCard, ScreenerTable, SectorHeat, NewsFeed, PolicyWatch
│   ├── proof/            ← EquityBars, PatternTable
│   └── ui/               ← Blueprint, Segmented, Switch, Dialog, Status (loading / error)
├── context/              ← AuthContext (login state), SettingsContext (saved preferences)
├── hooks/                ← useApi (load + poll data), useClock, usePageTitle
├── lib/                  ← chart geometry, prediction maths (target, stop, ladder), formatting
├── pages/                ← TerminalPage, MarketPage, ProofPage, LoginPage, SettingsPage, NotFoundPage
└── styles/
    ├── tokens.css        ← design system: colours, fonts, buttons, tables (change the look here)
    └── app.css           ← layout for every screen + responsive rules
```

Components never call `fetch()` themselves. They call functions in `src/api/index.js`, so switching
from sample data to your backend doesn't change any component.

---

## 3. Connect your FastAPI backend

1. Copy `.env.example` to `.env` and set your server URL:

   ```
   VITE_API_URL=http://localhost:8000
   ```

2. Restart `npm run dev`. The header changes from **Sample data · demo** to **Live · API**.

3. Allow the frontend in FastAPI (CORS):

   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],   # add your Vercel URL later
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

After login, every request sends `Authorization: Bearer <token>`.
Errors should use FastAPI's normal shape `{"detail": "message"}`, and the message is shown in the UI.

### Backend contract

Your endpoints must return these shapes (the sample data in `src/api/mock/` returns exactly the same).
Times are epoch **milliseconds**; percentages are plain numbers (`0.56` means +0.56%).

| Method & path | Returns |
|---|---|
| `POST /api/auth/login` body `{email, password}` | `{ token, user: { name, email } }` |
| `GET /api/watchlist` | `[{ symbol, name, price, changePct, call: { action, dir, prob } }]` |
| `GET /api/quote/{symbol}` | `{ symbol, price, change, changePct, time }` |
| `GET /api/candles/{symbol}?timeframe=5m&limit=58` | `[{ t, o, h, l, c, v }]` oldest first |
| `GET /api/prediction/{symbol}?horizon=30` | see below |
| `GET /api/market/overview` | `{ pulse, indices, sectors }` |
| `GET /api/screeners/{id}` | `{ id, label, metricLabel, rows }` |
| `GET /api/news` | `[{ id, time, symbol, sentiment, headline, impact, explanation }]` |
| `GET /api/policy` | `[{ id, source, text }]` |
| `GET /api/backtest/summary` | `{ headline, equity, patterns, method, note }` |
| `POST /api/orders` | `{ id, status }` |

Timeframes: `1m`, `5m`, `15m`, `30m`. Screener ids: `multibagger`, `volume-gainers`, `volume-losers`,
`active-volume`, `active-value`.

**Prediction** (this is where your ML model's output goes):

```json
{
  "symbol": "NIFTY",
  "name": "NIFTY 50",
  "horizonMin": 30,
  "dir": "UP",
  "prob": 75,
  "action": "BUY",
  "pattern": "Ascending triangle",
  "samples": 1842,
  "hitRate": 71,
  "expectedMovePct": 1.8,
  "suggestedQty": 75,
  "insight": "This formation moved +1.8% within 20 minutes in 71% of 1,842 historical matches…",

  "target": 24650.38,
  "stopLoss": 24018.38,
  "ladder": [{ "label": "above +1.5%", "pct": 32, "favoured": true }]
}
```

`dir` is `UP` | `DOWN` | `FLAT`, and `action` is `BUY` | `SELL` | `WAIT`.
`target`, `stopLoss` and `ladder` are optional. If you leave them out, the frontend works them out
from `expectedMovePct` and the latest candle.

**Order request** sent to `POST /api/orders`:

```json
{ "symbol": "NIFTY", "side": "BUY", "quantity": 75, "orderType": "BRACKET",
  "entry": 24214.52, "target": 24650.38, "stopLoss": 24018.38 }
```

**Market overview**:

```json
{
  "pulse": { "verdict": "BULLISH", "score": 68, "advances": 1412, "declines": 608, "vix": 11.84 },
  "indices": [{ "name": "NIFTY 50", "price": 24313.19, "changePct": 0.56, "spark": [100.2, 100.5] }],
  "sectors": [{ "name": "Auto", "changePct": 2.4 }]
}
```

**Backtest summary**:

```json
{
  "headline": [{ "label": "CAGR", "value": "24.6%" }],
  "equity": [{ "quarter": "2016 Q1", "value": 34.2, "outOfSample": false }],
  "patterns": [{ "name": "Bull flag", "samples": 964, "hitRate": 66.2, "avgMove": 1.2, "medianMin": 17 }],
  "method": ["OHLCV across NIFTY 500 …"],
  "note": "Figures shown are illustrative …"
}
```

---

## 4. Deploy to Vercel

`vercel.json` is already set up so page refreshes on `/market`, `/proof` and so on work.

1. Push this folder to GitHub and import it in Vercel (framework preset: **Vite**).
2. Under **Settings → Environment Variables**, add `VITE_API_URL` with your deployed backend URL.
   Leave it out to deploy the sample-data demo.

---

## 5. Good to know

- **Live updates**: prices refresh every 1.5 s, the chart and AI call every 30 s, the watchlist every 15 s.
  You can turn this off in Settings.
- **Settings and login** are saved in the browser's localStorage.
- **Demo login is not real security.** Real sign-in has to be checked by the backend.
- **Fonts** (Barlow and Barlow Condensed) load from Google Fonts in `index.html`.
- All sample figures are illustrative. Hawk AI gives probability-based guidance, not investment advice.
