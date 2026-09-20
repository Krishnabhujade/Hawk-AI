import { useMemo } from 'react';
import { buildChart, OBSERVED_WIDTH } from '../../lib/chart';
import { fmt } from '../../lib/format';

/**
 * Candlestick chart for today's session plus the AI forecast cone.
 * Built with plain divs + one SVG so it needs no chart library.
 */
export default function CandleChart({ candles, livePrice, target, horizonMin, pattern }) {
  const chart = useMemo(
    () => buildChart(candles, { livePrice, target, horizonMin }),
    [candles, livePrice, target, horizonMin],
  );

  return (
    <div className="chart">
      <div className="chart-plot">
        <div className="chart-forecast-zone" style={{ left: `${OBSERVED_WIDTH}%` }} />
        <div className="chart-midline" />

        {chart.bars.map((b) => (
          <div key={b.key} className="candle" style={{ left: `${b.x}%`, width: `${b.w}%` }}>
            <div
              className={`candle-wick ${b.up ? 'up' : 'down'}`}
              style={{ top: `${b.wickTop}%`, height: `${b.wickH}%` }}
            />
            <div
              className={`candle-body ${b.up ? 'up' : 'down'}`}
              style={{ top: `${b.bodyTop}%`, height: `${b.bodyH}%` }}
            />
          </div>
        ))}

        <svg className="chart-cone" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={chart.band} className="cone-band" />
          <polyline points={chart.median} className="cone-median" vectorEffect="non-scaling-stroke" />
        </svg>

        <span className="chart-label chart-label-actual">ACTUAL · TODAY SO FAR</span>
        <span className="chart-label chart-label-now" style={{ left: `${OBSERVED_WIDTH}%` }}>
          NOW
        </span>
        <span className="chart-label chart-label-forecast">
          <span className="long-label">HAWK AI </span>FORECAST<span className="long-label"> · NEXT {horizonMin} MIN</span>
        </span>
        {pattern && <span className="tag tag-accent chart-pattern">Pattern found · {pattern}</span>}
        <div className="chart-target num" style={{ top: `${chart.targetY}%` }}>
          Target {fmt(target)}
        </div>
        <div className="chart-live num" style={{ top: `${chart.liveY}%` }}>
          {fmt(livePrice)}
        </div>
      </div>

      <div className="chart-axis-y num" aria-hidden="true">
        {chart.axisY.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="chart-axis-x num" aria-hidden="true">
        {chart.axisX.map((tick) => (
          <span key={`${tick.label}-${tick.x}`} className={`tick-${tick.align}`} style={{ left: `${tick.x}%` }}>
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
