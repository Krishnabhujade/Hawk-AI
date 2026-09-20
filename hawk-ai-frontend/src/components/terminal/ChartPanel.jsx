import { TIMEFRAMES } from '../../api';
import { changeGlyph, changeTone, fmt, signed } from '../../lib/format';
import Segmented from '../ui/Segmented';
import { ErrorBox, Loading } from '../ui/Status';
import CandleChart from './CandleChart';

/** Centre column: symbol header, timeframe switch and the chart. */
export default function ChartPanel({ name, quote, timeframe, onTimeframe, candlesQuery, target, horizonMin, pattern }) {
  const { data: candles, error, loading, reload } = candlesQuery;
  const livePrice = quote?.price ?? candles?.at(-1)?.c;

  return (
    <section className="chart-panel" aria-label={`${name} chart`}>
      <div className="chart-head">
        <div className="chart-title">
          <span className="chart-symbol">{name}</span>
          {livePrice !== undefined && <span className="chart-price num">{fmt(livePrice)}</span>}
          {quote && (
            <span className="chart-change num" style={{ color: changeTone(quote.change) }}>
              {changeGlyph(quote.change)} {signed(quote.change)} ({signed(quote.changePct)}%)
            </span>
          )}
        </div>
        <Segmented label="Chart timeframe" options={TIMEFRAMES} value={timeframe} onChange={onTimeframe} className="chart-tf" />
      </div>

      <div className="chart-body">
        {candles?.length && target !== undefined ? (
          <CandleChart candles={candles} livePrice={livePrice} target={target} horizonMin={horizonMin} pattern={pattern} />
        ) : error ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : (
          <Loading lines={5} label={loading ? 'Loading chart…' : 'No chart data'} />
        )}
      </div>
    </section>
  );
}
