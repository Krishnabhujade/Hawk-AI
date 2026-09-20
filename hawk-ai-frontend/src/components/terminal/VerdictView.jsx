import { fmt, glyph } from '../../lib/format';
import { plainSummary } from '../../lib/prediction';
import Blueprint from '../ui/Blueprint';

/** Simple view: direction, confidence, what to do, and the key levels. */
export default function VerdictView({ prediction, levels, horizonLabel }) {
  // A FLAT call has no target or stop loss. Showing the last close in both
  // rows would print the same number twice and read as a bug, so show "—".
  const rows = [
    { k: 'Target', v: levels.directional ? fmt(levels.target) : '—' },
    { k: 'Stop loss', v: levels.directional ? fmt(levels.stopLoss) : '—' },
    { k: 'Time frame', v: `next ${horizonLabel}` },
  ];

  return (
    <div className="call-stack">
      <Blueprint className="verdict-card">
        <span className="verdict-kicker">LIKELY DIRECTION · NEXT {horizonLabel.toUpperCase()}</span>
        <div className="verdict-main">
          <span className="verdict-dir">
            {glyph(prediction.dir)} {prediction.dir}
          </span>
          <div className="verdict-prob">
            <span className="num">{prediction.prob}%</span>
            <div className="verdict-kicker">CONFIDENCE</div>
          </div>
        </div>
        <div className="verdict-meter" role="meter" aria-valuenow={prediction.prob} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
          <div style={{ width: `${prediction.prob}%` }} />
        </div>
        <div className="verdict-action">
          <span className="verdict-kicker">WHAT TO DO</span>
          <span className="verdict-action-word">{prediction.action}</span>
        </div>
      </Blueprint>

      <p className="call-summary">{plainSummary(prediction, horizonLabel)}</p>

      <dl className="kv-list">
        {rows.map((r) => (
          <div key={r.k} className="kv-row">
            <dt>{r.k}</dt>
            <dd className="num">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
