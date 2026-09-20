// The one place the UI gets data from.
// Each function calls the FastAPI backend, or the sample data when
// VITE_API_URL is not set. Components never call fetch() directly.

import { request, USE_MOCK } from './client';
import * as mock from './mock';

export { USE_MOCK, API_BASE_URL, ApiError } from './client';

/** Screener tabs shown on the Market screen (ids are sent to the backend). */
export const SCREENER_TABS = [
  { id: 'multibagger', label: 'Multibagger' },
  { id: 'volume-gainers', label: 'Vol gainers' },
  { id: 'volume-losers', label: 'Vol losers' },
  { id: 'active-volume', label: 'Active · vol' },
  { id: 'active-value', label: 'Active · value' },
];

export const TIMEFRAMES = ['1m', '5m', '15m', '30m'];

const enc = encodeURIComponent;

export const api = {
  /** POST /api/auth/login → { token, user: { name, email } } */
  login: (email, password) =>
    USE_MOCK
      ? mock.login(email, password)
      : request('/api/auth/login', { method: 'POST', body: { email, password } }),

  /** GET /api/auth/me → { name, email }. 401 if the saved token is no longer good. */
  getMe: () => (USE_MOCK ? mock.getMe() : request('/api/auth/me')),

  /** GET /api/watchlist → [{ symbol, name, price, changePct, call: { action, dir, prob } }] */
  getWatchlist: () => (USE_MOCK ? mock.getWatchlist() : request('/api/watchlist')),

  /** GET /api/quote/{symbol} → { symbol, price, change, changePct, time } */
  getQuote: (symbol) => (USE_MOCK ? mock.getQuote(symbol) : request(`/api/quote/${enc(symbol)}`)),

  /** GET /api/candles/{symbol}?timeframe=5m&limit=58 → [{ t, o, h, l, c, v }] (t = epoch ms) */
  getCandles: (symbol, timeframe, limit = 58) =>
    USE_MOCK
      ? mock.getCandles(symbol, timeframe, limit)
      : request(`/api/candles/${enc(symbol)}`, { query: { timeframe, limit } }),

  /** GET /api/prediction/{symbol}?horizon=30 → see README for fields */
  getPrediction: (symbol, horizonMin) =>
    USE_MOCK
      ? mock.getPrediction(symbol, horizonMin)
      : request(`/api/prediction/${enc(symbol)}`, { query: { horizon: horizonMin } }),

  /** GET /api/market/overview → { pulse, indices, sectors } */
  getMarketOverview: () => (USE_MOCK ? mock.getMarketOverview() : request('/api/market/overview')),

  /** GET /api/screeners/{id} → { id, label, metricLabel, rows } */
  getScreener: (id) => (USE_MOCK ? mock.getScreener(id) : request(`/api/screeners/${enc(id)}`)),

  /** GET /api/news → [{ id, time, symbol, sentiment, headline, impact, explanation }] */
  getNews: () => (USE_MOCK ? mock.getNews() : request('/api/news')),

  /** GET /api/policy → [{ id, source, text }] */
  getPolicy: () => (USE_MOCK ? mock.getPolicy() : request('/api/policy')),

  /** GET /api/backtest/summary → { headline, equity, patterns, method, note } */
  getBacktest: () => (USE_MOCK ? mock.getBacktest() : request('/api/backtest/summary')),

  /** POST /api/orders → { id, status } */
  placeOrder: (order) =>
    USE_MOCK ? mock.placeOrder(order) : request('/api/orders', { method: 'POST', body: order }),
};
