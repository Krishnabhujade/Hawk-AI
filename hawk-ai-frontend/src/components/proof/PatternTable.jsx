import { pct } from '../../lib/format';

/** How each chart formation performed in the backtest. */
export default function PatternTable({ patterns }) {
  return (
    <section>
      <h4 className="section-title">Pattern performance</h4>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Formation</th>
              <th className="right">Samples</th>
              <th className="right">Hit rate</th>
              <th className="right">Avg move</th>
              <th className="right">Median time</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td className="right num">{p.samples.toLocaleString('en-IN')}</td>
                <td className="right num">{p.hitRate.toFixed(1)}%</td>
                <td className="right num">{pct(p.avgMove, 1)}</td>
                <td className="right num">{p.medianMin} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
