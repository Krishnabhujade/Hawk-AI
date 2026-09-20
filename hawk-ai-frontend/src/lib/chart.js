// Geometry for the candlestick chart + forecast cone.
// Everything is in percentages of the plot area, so the chart
// scales to any container size without a charting library.

import { dayIST, fmt, timeIST } from './format';

/** Share of the plot width used by real candles; the rest is the forecast zone. */
export const OBSERVED_WIDTH = 70;

export function buildChart(candles, { livePrice, target, horizonMin }) {
  const n = candles.length;
  const lastClose = candles[n - 1].c;
  const move = target - lastClose;
  const spread = Math.abs(move) * 0.4 + lastClose * 0.0012;

  let hi = Math.max(...candles.map((d) => d.h), target + spread, livePrice);
  let lo = Math.min(...candles.map((d) => d.l), target - spread, livePrice);
  const pad = (hi - lo) * 0.06;
  hi += pad;
  lo -= pad;
  const range = hi - lo || 1;
  const toY = (v) => ((hi - v) / range) * 100;

  const cw = OBSERVED_WIDTH / n;
  const bars = candles.map((d, i) => ({
    key: d.t ?? i,
    x: i * cw + cw * 0.14,
    w: cw * 0.72,
    wickTop: toY(d.h),
    wickH: Math.max(((d.h - d.l) / range) * 100, 0.4),
    bodyTop: toY(Math.max(d.o, d.c)),
    bodyH: Math.max((Math.abs(d.c - d.o) / range) * 100, 0.7),
    up: d.c >= d.o,
  }));

  // Forecast cone: median path plus a band that widens with time.
  const steps = [0, 0.3, 0.6, 1];
  const fx = (t) => (OBSERVED_WIDTH + t * (100 - OBSERVED_WIDTH)).toFixed(2);
  const mid = (t) => lastClose + move * t;
  const width = (t) => spread * (0.12 + 0.88 * t);
  const point = (t, v) => `${fx(t)},${toY(v).toFixed(2)}`;
  const median = steps.map((t) => point(t, mid(t))).join(' ');
  const band = [
    ...steps.map((t) => point(t, mid(t) + width(t))),
    ...[...steps].reverse().map((t) => point(t, mid(t) - width(t))),
  ].join(' ');

  // Time labels under the observed candles, then "now" and the horizon.
  // Ticks from an earlier session get the weekday, e.g. "Tue 14:45".
  const lastDay = candles[n - 1].t ? dayIST(candles[n - 1].t) : '';
  const timeTicks = [0, Math.round(n / 3), Math.round((2 * n) / 3)]
    .filter((i) => i < n)
    .map((i) => {
      const t = candles[i].t;
      const day = t ? dayIST(t) : '';
      return {
        x: i * cw,
        label: t ? `${day !== lastDay ? `${day.split(' ')[0]} ` : ''}${timeIST(t)}` : '',
        align: i === 0 ? 'start' : 'center',
      };
    });
  const axisX = [
    ...timeTicks,
    { x: OBSERVED_WIDTH, label: 'now', align: 'center' },
    { x: 100, label: `+${horizonMin}m`, align: 'end' },
  ];

  return {
    bars,
    median,
    band,
    targetY: toY(target),
    liveY: toY(livePrice),
    axisY: [hi, hi - range / 2, lo].map((v) => fmt(v)),
    axisX,
  };
}
