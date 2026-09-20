import { glyph } from '../../lib/format';
import { outcomeLadder } from '../../lib/prediction';
import Blueprint from '../ui/Blueprint';

/** Detailed view: probability of each outcome band. */
export default function LadderView({ prediction, horizonLabel }) {
  const ladder = outcomeLadder(prediction);
  const move = prediction.expectedMovePct;
  const stats = [
    { k: 'EXPECTED', v: `${move > 0 ? '+' : move < 0 ? '−' : ''}${Math.abs(move).toFixed(1)}%` },
    { k: 'SAMPLES', v: prediction.samples.toLocaleString('en-IN') },
    { k: 'HIT RATE', v: `${prediction.hitRate}%` },
  ];

  return (
    <div className="call-stack">
      <div>
        <span className="kicker">OUTCOME DISTRIBUTION · NEXT {horizonLabel.toUpperCase()}</span>
        <h4 className="ladder-title">Where the next move lands</h4>
      </div>

      <div className="ladder">
        {ladder.map((band) => (
          <div key={band.label} className="ladder-row">
            <span className="ladder-label num">{band.label}</span>
            <div className="ladder-track">
              <div className={`ladder-bar ${band.favoured ? 'favoured' : ''}`} style={{ width: `${band.width}%` }} />
            </div>
            <span className="ladder-pct num" style={{ opacity: band.favoured ? 1 : 0.45 }}>
              {band.pct}%
            </span>
          </div>
        ))}
      </div>

      <div className="stat-row">
        {stats.map((s) => (
          <div key={s.k}>
            <div className="kicker">{s.k}</div>
            <div className="stat-value num">{s.v}</div>
          </div>
        ))}
      </div>

      <Blueprint className="derived-call">
        <div className="kicker">DERIVED CALL</div>
        <div className="derived-call-value">
          {prediction.action} · {glyph(prediction.dir)} {prediction.dir} {prediction.prob}%
        </div>
      </Blueprint>

      <p className="call-insight">{prediction.insight}</p>
    </div>
  );
}
