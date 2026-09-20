import { SCREENER_TABS } from '../../api';
import { changeGlyph, changeTone, fmt, pct } from '../../lib/format';
import Segmented from '../ui/Segmented';
import { ErrorBox, Loading } from '../ui/Status';

/** Ready-made stock scans: multibaggers, volume gainers/losers, most active. */
export default function ScreenerTable({ active, onChange, query }) {
  const { data, error, loading, reload } = query;
  const screener = data?.id === active ? data : null;

  return (
    <section className="market-section">
      <div className="section-head">
        <h4>Screeners</h4>
        <span className="section-hint">Hours of stock hunting, answered in one pass.</span>
        <Segmented
          label="Screener"
          options={SCREENER_TABS.map((t) => ({ value: t.id, label: t.label }))}
          value={active}
          onChange={onChange}
          className="section-seg"
        />
      </div>

      {screener ? (
        <div className="table-scroll">
          <table className="table screener-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Sector</th>
                <th className="right">LTP</th>
                <th className="right">Change</th>
                <th className="right">{screener.metricLabel}</th>
                <th className="right">AI call</th>
              </tr>
            </thead>
            <tbody>
              {screener.rows.map((r) => (
                <tr key={r.symbol}>
                  <td className="cell-symbol">{r.symbol}</td>
                  <td className="cell-sector">{r.sector}</td>
                  <td className="right num">{fmt(r.ltp)}</td>
                  <td className="right num" style={{ color: changeTone(r.changePct) }}>
                    {changeGlyph(r.changePct)} {pct(r.changePct)}
                  </td>
                  <td className="right num">{r.metric}</td>
                  <td className="right">
                    <span className="tag tag-accent">
                      {r.call.action} {r.call.prob}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : (
        <Loading lines={6} label={loading ? 'Scanning…' : 'No results'} />
      )}
    </section>
  );
}
