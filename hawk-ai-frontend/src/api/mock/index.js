// Mock implementation of every backend endpoint.
// Returns the same JSON shapes the real FastAPI server should return
// (see README.md → "Backend contract").

import { ApiError, AUTH_KEY } from '../client';
import {
  UNIVERSE, SCREENERS, NEWS, POLICY, PULSE, INDICES, SECTORS,
  BACKTEST_HEADLINE, PATTERNS, METHOD, BACKTEST_NOTE,
} from './data';
import { seriesFor, sessionTimes, TIMEFRAME_MINUTES, todayAtIST } from './series';

const CANDLES = 58;

// Pretend network latency so loading states are visible during development.
const wait = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 140));
const round = (value, digits = 2) => Number(value.toFixed(digits));

function findSymbol(symbol) {
  const item = UNIVERSE.find((u) => u.symbol === symbol);
  if (!item) throw new ApiError(`Unknown symbol ${symbol}`, 404);
  return item;
}

// The 5-minute series defines "today": its first open is the day open and its
// last close is the last traded price. Other timeframes are shifted to agree.
const daySeries = (u) => seriesFor(`${u.symbol}5m`, u.base, u.vol, CANDLES);
const lastPrice = (u) => daySeries(u).at(-1).c;
const dayOpen = (u) => daySeries(u)[0].o;

function livePrice(u, live) {
  const wobble = live ? Math.sin(Date.now() / 3600) * u.base * 0.0006 : 0;
  return lastPrice(u) + wobble;
}

function quoteFor(u, live = true) {
  const price = livePrice(u, live);
  const open = dayOpen(u);
  return {
    symbol: u.symbol,
    price: round(price),
    change: round(price - open),
    changePct: round(((price - open) / open) * 100),
    time: Date.now(),
  };
}

export async function login(email, password) {
  await wait(350);
  if (!email?.trim() || !password) throw new ApiError('Enter your email and password.', 400);
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const name = local.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Trader';
  return { token: 'demo-token', user: { name, email: email.trim() } };
}

// Sample-data mode has no server to check the token against, so "me" just
// echoes back whoever is saved in this browser.
export async function getMe() {
  await wait(80);
  let saved = null;
  try {
    saved = JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    /* storage blocked or corrupt */
  }
  if (!saved?.user) throw new ApiError('Please sign in again.', 401);
  return saved.user;
}

export async function getWatchlist() {
  await wait();
  return UNIVERSE.map((u) => {
    const q = quoteFor(u, false);
    return {
      symbol: u.symbol,
      name: u.name,
      price: q.price,
      changePct: q.changePct,
      call: { action: u.action, dir: u.dir, prob: u.prob },
    };
  });
}

export async function getQuote(symbol) {
  await wait(60);
  return quoteFor(findSymbol(symbol), true);
}

export async function getCandles(symbol, timeframe = '5m', limit = CANDLES) {
  await wait();
  const u = findSymbol(symbol);
  const minutes = TIMEFRAME_MINUTES[timeframe];
  if (!minutes) throw new ApiError(`Unsupported timeframe ${timeframe}`, 400);

  const raw = seriesFor(`${u.symbol}${timeframe}`, u.base, u.vol, limit);
  const shift = lastPrice(u) - raw.at(-1).c;
  // Last sample candle opens at 14:00 IST; older ones skip nights and weekends.
  const times = sessionTimes(todayAtIST(14, 0), minutes, limit);

  return raw.map((d, i) => ({
    t: times[i],
    o: round(d.o + shift),
    h: round(d.h + shift),
    l: round(d.l + shift),
    c: round(d.c + shift),
    v: Math.round(40000 + (Math.abs(d.c - d.o) / u.base) * 9e7),
  }));
}

export async function getPrediction(symbol, horizonMin = 30) {
  await wait();
  const u = findSymbol(symbol);
  const scale = Math.sqrt(horizonMin / 30); // shorter horizon, smaller expected move
  return {
    symbol: u.symbol,
    name: u.name,
    horizonMin,
    dir: u.dir,
    prob: u.prob,
    action: u.action,
    pattern: u.pattern,
    samples: u.samples,
    hitRate: u.hitRate,
    expectedMovePct: round(u.move * scale, 1),
    suggestedQty: u.qty,
    insight: u.insight,
    // target / stopLoss / ladder are optional — the frontend derives them when absent
  };
}

export async function getMarketOverview() {
  await wait();
  return {
    pulse: PULSE,
    indices: INDICES.map((i) => ({
      name: i.name,
      price: i.price,
      changePct: i.changePct,
      spark: seriesFor(i.key, 100, 0.6, 18).map((d) => round(d.c)),
    })),
    sectors: SECTORS,
  };
}

export async function getScreener(id) {
  await wait();
  const screener = SCREENERS.find((s) => s.id === id);
  if (!screener) throw new ApiError(`Unknown screener ${id}`, 404);
  return screener;
}

export async function getNews() {
  await wait();
  return NEWS;
}

export async function getPolicy() {
  await wait();
  return POLICY;
}

export async function getBacktest() {
  await wait();
  const equity = Array.from({ length: 40 }, (_, i) => {
    const s = seriesFor(`wf${i}`, 100, 1, 3);
    const value = Math.max(8, Math.min(100, 34 + (i / 39) * 52 + (s[2].c - 100) * 1.6));
    return {
      quarter: `${2016 + Math.floor(i / 4)} Q${(i % 4) + 1}`,
      value: round(value, 1),
      outOfSample: i % 5 === 4,
    };
  });
  return { headline: BACKTEST_HEADLINE, equity, patterns: PATTERNS, method: METHOD, note: BACKTEST_NOTE };
}

// ---------------------------------------------------------------- paper orders
// Sample-data mode keeps orders in memory for the life of the page, so the
// Orders screen has something real to show in the demo. A refresh clears them;
// the real backend stores them in SQLite.

const ORDERS = [];
let nextOrderId = 1;

const pnlOf = (side, entry, exit, qty) =>
  round((exit - entry) * qty * (side === 'BUY' ? 1 : -1));

/** Current price for an order's symbol, falling back to its entry if unknown. */
function priceFor(order) {
  try {
    return livePrice(findSymbol(order.symbol), true);
  } catch {
    return order.entryPrice;
  }
}

export async function placeOrder(order) {
  await wait(400);
  if (!order?.symbol || !order?.side || !(order.quantity > 0)) {
    throw new ApiError('Order is missing symbol, side or quantity.', 400);
  }
  const fillPrice = round(livePrice(findSymbol(order.symbol), true));
  // Same bracket rule the backend applies, so the demo rejects the same orders.
  const ok = order.side === 'BUY'
    ? order.target > fillPrice && fillPrice > order.stopLoss
    : order.target < fillPrice && fillPrice < order.stopLoss;
  if (!ok) {
    throw new ApiError(
      order.side === 'BUY'
        ? `For a BUY at ${fillPrice.toFixed(2)}, the target must be above it and the stop loss below it.`
        : `For a SELL at ${fillPrice.toFixed(2)}, the target must be below it and the stop loss above it.`,
      400,
    );
  }
  const now = new Date();
  const id = `HWK-${String(nextOrderId++).padStart(5, '0')}`;
  ORDERS.unshift({
    id,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    entryPrice: fillPrice,
    target: round(order.target),
    stopLoss: round(order.stopLoss),
    status: 'OPEN',
    placedAt: now.toISOString(),
    marketTime: now.toISOString().slice(0, 19),
    exitPrice: null,
    exitMarketTime: null,
    exitReason: null,
    lastPrice: fillPrice,
    pnl: 0,
  });
  return { id, status: 'OPEN', fillPrice };
}

export async function getOrders(status) {
  await wait(120);
  // Mark to market, and close anything that has touched its target or stop.
  for (const o of ORDERS) {
    if (o.status !== 'OPEN') continue;
    const price = priceFor(o);
    const buy = o.side === 'BUY';
    const hitStop = buy ? price <= o.stopLoss : price >= o.stopLoss;
    const hitTarget = buy ? price >= o.target : price <= o.target;
    if (hitStop || hitTarget) {
      // Stop wins a tie, same as the backend engine.
      o.exitPrice = hitStop ? o.stopLoss : o.target;
      o.exitReason = hitStop ? 'STOP' : 'TARGET';
      o.exitMarketTime = new Date().toISOString().slice(0, 19);
      o.status = 'CLOSED';
      o.lastPrice = null;
      o.pnl = pnlOf(o.side, o.entryPrice, o.exitPrice, o.quantity);
    } else {
      o.lastPrice = round(price);
      o.pnl = pnlOf(o.side, o.entryPrice, price, o.quantity);
    }
  }
  const wanted = status ? String(status).toUpperCase() : null;
  return ORDERS.filter((o) => !wanted || o.status === wanted).map((o) => ({ ...o }));
}

export async function closeOrder(id) {
  await wait(250);
  const order = ORDERS.find((o) => o.id === id);
  if (!order) throw new ApiError(`Order ${id} not found.`, 404);
  if (order.status === 'OPEN') {
    order.exitPrice = round(priceFor(order));
    order.exitReason = 'MANUAL';
    order.exitMarketTime = new Date().toISOString().slice(0, 19);
    order.status = 'CLOSED';
    order.lastPrice = null;
    order.pnl = pnlOf(order.side, order.entryPrice, order.exitPrice, order.quantity);
  }
  return { ...order };
}

export async function getPortfolio() {
  const all = await getOrders();
  const closed = all.filter((o) => o.status === 'CLOSED');
  const open = all.filter((o) => o.status === 'OPEN');
  const wins = closed.filter((o) => o.pnl > 0).length;
  return {
    openPositions: open.length,
    closedTrades: closed.length,
    realizedPnl: round(closed.reduce((s, o) => s + o.pnl, 0)),
    unrealizedPnl: round(open.reduce((s, o) => s + o.pnl, 0)),
    winRate: closed.length ? round((wins / closed.length) * 100, 1) : null,
  };
}

export async function getStatus() {
  await wait(60);
  return {
    status: 'ok',
    provider: 'mock',
    dataSource: 'sample',
    replayDate: new Date().toISOString().slice(0, 10),
    marketTime: new Date().toTimeString().slice(0, 8),
    predictor: 'sample-frontend-demo',
    symbols: UNIVERSE.length,
  };
}
