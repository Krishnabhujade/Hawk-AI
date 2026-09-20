import Blueprint from '../ui/Blueprint';

/** Quarter-by-quarter walk-forward equity. Hollow bars are out-of-sample quarters. */
export default function EquityBars({ equity }) {
  const max = Math.max(...equity.map((q) => q.value), 1);
  const firstYear = parseInt(equity[0]?.quarter, 10);
  const lastYear = parseInt(equity.at(-1)?.quarter, 10) + 1;
  const years = [];
  if (Number.isFinite(firstYear) && Number.isFinite(lastYear)) {
    for (let y = firstYear; y <= lastYear; y += 2) years.push(y);
  }

  return (
    <Blueprint className="equity-card">
      <div className="equity-head">
        <h6>Walk-forward equity · {equity.length} quarters</h6>
        <span className="section-hint">Solid = in-sample re-fit · Hollow = out-of-sample</span>
      </div>
      <div className="equity-bars" role="img" aria-label={`Equity over ${equity.length} quarters, rising overall`}>
        {equity.map((q) => (
          <div
            key={q.quarter}
            className={`equity-bar ${q.outOfSample ? 'hollow' : ''}`}
            style={{ height: `${Math.max(4, (q.value / max) * 100)}%` }}
            title={`${q.quarter}: ${q.value}${q.outOfSample ? ' (out-of-sample)' : ''}`}
          />
        ))}
      </div>
      <div className="equity-years num">
        {years.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </Blueprint>
  );
}
