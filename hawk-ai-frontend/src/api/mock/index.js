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

export async function placeOrder(order) {
  await wait(400);
  if (!order?.symbol || !order?.side || !(order.quantity > 0)) {
    throw new ApiError('Order is missing symbol, side or quantity.', 400);
  }
  return { id: `HWK-${Math.floor(1000 + Math.random() * 9000)}`, status: 'QUEUED' };
}
