// Sample data used when no backend is configured.
// Every figure here is illustrative — not real market data.

export const UNIVERSE = [
  {
    symbol: 'NIFTY', name: 'NIFTY 50', base: 24313.19, vol: 0.3,
    dir: 'UP', prob: 75, action: 'BUY', pattern: 'Ascending triangle',
    samples: 1842, hitRate: 71, move: 1.8, qty: 75,
    insight: 'This formation moved +1.8% within 20 minutes in 71% of 1,842 historical matches carrying similar news sentiment.',
  },
  {
    symbol: 'RELIANCE', name: 'RELIANCE', base: 1412.6, vol: 0.55,
    dir: 'UP', prob: 68, action: 'BUY', pattern: 'Bull flag',
    samples: 964, hitRate: 66, move: 1.2, qty: 250,
    insight: 'Volume expansion on the breakout leg matches 66% of prior bull flags that resolved higher inside 25 minutes.',
  },
  {
    symbol: 'HDFCBANK', name: 'HDFC BANK', base: 1678.05, vol: 0.42,
    dir: 'DOWN', prob: 61, action: 'SELL', pattern: 'Rising wedge',
    samples: 731, hitRate: 63, move: -0.9, qty: 200,
    insight: 'Momentum divergence plus a fading banking-sector bid: comparable wedges gave back 0.9% within half an hour.',
  },
  {
    symbol: 'INFY', name: 'INFOSYS', base: 1546.9, vol: 0.5,
    dir: 'FLAT', prob: 57, action: 'WAIT', pattern: 'Range compression',
    samples: 1105, hitRate: 58, move: 0.3, qty: 150,
    insight: 'Volatility is compressing into the close. No edge until the range breaks — the engine holds fire.',
  },
  {
    symbol: 'TATAMOTORS', name: 'TATA MOTORS', base: 712.35, vol: 0.85,
    dir: 'UP', prob: 72, action: 'BUY', pattern: 'Cup and handle',
    samples: 508, hitRate: 69, move: 2.1, qty: 600,
    insight: 'Auto-sector rotation is confirmed by order-flow. 69% of matched cups delivered +2.1% inside the horizon.',
  },
  {
    symbol: 'ICICIBANK', name: 'ICICI BANK', base: 1289.4, vol: 0.46,
    dir: 'DOWN', prob: 64, action: 'SELL', pattern: 'Head and shoulders',
    samples: 846, hitRate: 65, move: -1.4, qty: 250,
    insight: 'Neckline lost on rising volume — the closest 846 analogues averaged −1.4% before stabilising.',
  },
];

// [symbol, sector, ltp, changePct, metric, action, prob]
const row = (symbol, sector, ltp, changePct, metric, action, prob) =>
  ({ symbol, sector, ltp, changePct, metric, call: { action, prob } });

export const SCREENERS = [
  {
    id: 'multibagger', label: 'Multibagger', metricLabel: '3Y return',
    rows: [
      row('DIXON TECH', 'Consumer Elec.', 14280.5, 3.42, '+412%', 'BUY', 74),
      row('CDSL', 'Financials', 1618.9, 2.11, '+286%', 'BUY', 69),
      row('KAYNES TECH', 'Industrials', 5940.0, -1.08, '+248%', 'HOLD', 58),
      row('BSE LTD', 'Financials', 2790.15, 4.06, '+236%', 'BUY', 71),
      row('APAR INDS', 'Capital Goods', 9012.4, 1.55, '+204%', 'BUY', 66),
      row('ANANT RAJ', 'Realty', 742.85, -0.62, '+189%', 'HOLD', 55),
    ],
  },
  {
    id: 'volume-gainers', label: 'Vol gainers', metricLabel: 'Vol vs 20D',
    rows: [
      row('IDEA', 'Telecom', 9.14, 7.82, '8.4×', 'BUY', 67),
      row('YES BANK', 'Financials', 21.4, 4.15, '6.1×', 'BUY', 63),
      row('SUZLON', 'Renewables', 64.85, 5.9, '5.7×', 'BUY', 70),
      row('JP POWER', 'Utilities', 19.62, 3.44, '4.9×', 'HOLD', 57),
      row('RVNL', 'Infrastructure', 402.3, -2.1, '4.2×', 'SELL', 61),
      row('IRFC', 'Financials', 148.55, 1.28, '3.8×', 'HOLD', 54),
    ],
  },
  {
    id: 'volume-losers', label: 'Vol losers', metricLabel: 'Vol vs 20D',
    rows: [
      row('NESTLE IND', 'FMCG', 2284.6, -0.42, '0.31×', 'HOLD', 52),
      row('BRITANNIA', 'FMCG', 5612.0, -0.18, '0.36×', 'HOLD', 51),
      row('COLGATE', 'FMCG', 2436.85, 0.24, '0.39×', 'HOLD', 53),
      row('PIDILITE', 'Chemicals', 2918.4, -0.66, '0.42×', 'SELL', 56),
      row('SIEMENS', 'Capital Goods', 6740.25, 0.31, '0.44×', 'HOLD', 52),
      row('GILLETTE', 'FMCG', 8102.9, -0.28, '0.47×', 'HOLD', 50),
    ],
  },
  {
    id: 'active-volume', label: 'Active · vol', metricLabel: 'Shares',
    rows: [
      row('TATA STEEL', 'Metals', 168.42, 2.06, '41.2 Cr', 'BUY', 68),
      row('ZOMATO', 'Consumer Tech', 284.15, 1.44, '28.7 Cr', 'BUY', 64),
      row('SBI', 'Financials', 842.6, -0.88, '19.4 Cr', 'SELL', 60),
      row('ONGC', 'Energy', 262.9, 1.12, '17.8 Cr', 'HOLD', 57),
      row('NHPC', 'Utilities', 88.35, -1.34, '16.1 Cr', 'SELL', 59),
      row('PNB', 'Financials', 104.7, 0.62, '14.9 Cr', 'HOLD', 55),
    ],
  },
  {
    id: 'active-value', label: 'Active · value', metricLabel: 'Turnover',
    rows: [
      row('RELIANCE', 'Energy', 1412.6, 1.06, '₹4,280 Cr', 'BUY', 68),
      row('HDFC BANK', 'Financials', 1678.05, -0.54, '₹3,910 Cr', 'SELL', 61),
      row('ICICI BANK', 'Financials', 1289.4, -0.72, '₹3,140 Cr', 'SELL', 64),
      row('INFOSYS', 'IT', 1546.9, 0.28, '₹2,760 Cr', 'WAIT', 57),
      row('BHARTI AIRTEL', 'Telecom', 1712.35, 1.88, '₹2,410 Cr', 'BUY', 72),
      row('L&T', 'Infrastructure', 3684.2, 0.94, '₹2,105 Cr', 'BUY', 65),
    ],
  },
];

export const NEWS = [
  {
    id: 'n1', time: '11:42', symbol: 'NIFTY 50', sentiment: 'Positive',
    headline: 'FII cash-market buying turns net positive for a fourth straight session',
    impact: 'Index breadth improving',
    explanation: 'Similar FII flow prints preceded a +0.8% index drift within the hour in 64% of matched cases.',
  },
  {
    id: 'n2', time: '11:31', symbol: 'TATAMOTORS', sentiment: 'Positive',
    headline: 'Auto retail volumes beat street estimates for the festive quarter',
    impact: 'Sector rotation live',
    explanation: 'Engine lifted the TATA MOTORS call from 64% to 72% on this headline.',
  },
  {
    id: 'n3', time: '11:18', symbol: 'HDFCBANK', sentiment: 'Negative',
    headline: 'Deposit-cost commentary trims private-bank margin outlook',
    impact: 'Banking bid fading',
    explanation: 'Sentiment shift is what flipped the HDFC BANK wedge into a SELL.',
  },
  {
    id: 'n4', time: '10:57', symbol: 'INFY', sentiment: 'Neutral',
    headline: 'Rupee holds range as IT majors trade sideways into the US open',
    impact: 'No edge yet',
    explanation: 'Range compression keeps the INFOSYS call on WAIT until the break.',
  },
  {
    id: 'n5', time: '10:34', symbol: 'RELIANCE', sentiment: 'Positive',
    headline: 'Retail arm signals faster store additions in second half',
    impact: 'Volume confirming',
    explanation: 'Order-flow imbalance supports the bull-flag continuation read.',
  },
];

export const POLICY = [
  { id: 'p1', source: 'MINISTRY OF FINANCE', text: 'Draft amendment trims import duty on EV components — reviewed for long-term auto exposure.' },
  { id: 'p2', source: 'SEBI', text: 'Revised intraday leverage norms take effect next settlement cycle.' },
  { id: 'p3', source: 'MINISTRY OF POWER', text: 'Renewable capacity tender calendar published for FY27.' },
];

export const PULSE = { verdict: 'BULLISH', score: 68, advances: 1412, declines: 608, vix: 11.84 };

export const INDICES = [
  { key: 'NIFTY', name: 'NIFTY 50', price: 24313.19, changePct: 0.56 },
  { key: 'BANKNIFTY', name: 'BANK NIFTY', price: 52184.4, changePct: -0.28 },
  { key: 'SENSEX', name: 'SENSEX', price: 79642.85, changePct: 0.41 },
  { key: 'NIFTYIT', name: 'NIFTY IT', price: 41208.6, changePct: 1.12 },
];

export const SECTORS = [
  ['Auto', 2.4], ['Metals', 1.9], ['Realty', 1.6], ['Energy', 1.1], ['Infra', 0.8], ['Pharma', 0.4],
  ['FMCG', 0.1], ['IT', -0.3], ['Media', -0.7], ['Telecom', -1.0], ['Banks', -1.4], ['PSU Bank', -2.1],
].map(([name, changePct]) => ({ name, changePct }));

export const BACKTEST_HEADLINE = [
  { label: 'CAGR', value: '24.6%' },
  { label: 'Sharpe', value: '1.82' },
  { label: 'Max drawdown', value: '−11.3%' },
  { label: 'Profit factor', value: '1.94' },
];

export const PATTERNS = [
  { name: 'Ascending triangle', samples: 1842, hitRate: 71.4, avgMove: 1.8, medianMin: 19 },
  { name: 'Cup and handle', samples: 508, hitRate: 69.1, avgMove: 2.1, medianMin: 26 },
  { name: 'Bull flag', samples: 964, hitRate: 66.2, avgMove: 1.2, medianMin: 17 },
  { name: 'Head and shoulders', samples: 846, hitRate: 65.4, avgMove: -1.4, medianMin: 23 },
  { name: 'Rising wedge', samples: 731, hitRate: 63.0, avgMove: -0.9, medianMin: 21 },
  { name: 'Range compression', samples: 1105, hitRate: 57.8, avgMove: 0.3, medianMin: 31 },
];

export const METHOD = [
  'OHLCV across NIFTY 500 and every sector index, at 1-minute, 5-minute and 15-minute resolution.',
  'Walk-forward re-fit every three to six months; the final 20% of history is held out untouched.',
  'Monte Carlo simulation of slippage and latency, plus full brokerage and tax modelling.',
  'Cross-market verification against equity, futures and index series.',
  'News-sentiment tagging and volatility clustering applied before pattern matching.',
];

export const BACKTEST_NOTE =
  'Figures shown are illustrative placeholders for the concept build. Published metrics will be regenerated from the audited backtest run before any investor release.';
