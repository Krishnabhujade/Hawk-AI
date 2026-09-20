// Deterministic price generator for the sample data.
// Same seed in -> same candles out, so the demo looks identical on every load.

export function seriesFor(key, base, vol, n) {
  let seed = 7;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) % 99991;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const out = [];
  let p = base;
  let vel = 0;
  for (let i = 0; i < n; i++) {
    const v = 0.25 + vol * 0.18;
    vel = vel * 0.66 + (rnd() - 0.5) * base * v * 0.0071;
    const o = p;
    const c = o + vel + (base - p) * 0.03;
    out.push({
      o,
      c,
      h: Math.max(o, c) + rnd() * base * vol * 0.0016,
      l: Math.min(o, c) - rnd() * base * vol * 0.0016,
    });
    p = c;
  }
  return out;
}

export const TIMEFRAME_MINUTES = { '1m': 1, '5m': 5, '15m': 15, '30m': 30 };

/** Epoch ms for the latest weekday (today, or Friday at weekends) at the given India time. */
export function todayAtIST(hours, minutes) {
  const ist = new Date(Date.now() + 330 * 60000); // shift to the IST calendar date
  let day = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  while ([0, 6].includes(new Date(day).getUTCDay())) day -= 86400000;
  return day + (hours * 60 + minutes) * 60000 - 330 * 60000;
}

const OPEN_MIN = 9 * 60 + 15; // 09:15 IST
const CLOSE_MIN = 15 * 60 + 30; // 15:30 IST
const IST_OFFSET = 330 * 60000;
const DAY = 86400000;

/**
 * Candle open times that stay inside NSE trading hours (09:15–15:30 IST,
 * Monday–Friday), counting back from `end`. Oldest first.
 */
export function sessionTimes(end, stepMin, count) {
  const step = stepMin * 60000;
  const lastSlot = OPEN_MIN + Math.floor((CLOSE_MIN - OPEN_MIN - 1) / stepMin) * stepMin;
  const times = [];
  let t = end;
  while (times.length < count) {
    times.push(t);
    t -= step;
    const ist = new Date(t + IST_OFFSET);
    const minute = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    if (minute < OPEN_MIN) {
      // jump to the last candle of the previous weekday
      let day = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - DAY;
      while ([0, 6].includes(new Date(day).getUTCDay())) day -= DAY;
      t = day + lastSlot * 60000 - IST_OFFSET;
    }
  }
  return times.reverse();
}
