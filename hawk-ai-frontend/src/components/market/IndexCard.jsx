import { changeGlyph, changeTone, fmt, pct } from '../../lib/format';
import Blueprint from '../ui/Blueprint';

/** Index price with a mini bar sparkline. */
export default function IndexCard({ index }) {
  const hi = Math.max(...index.spark);
  const lo = Math.min(...index.spark);
  const up = index.changePct >= 0;

  return (
    <Blueprint className="index-card">
      <div className="index-text">
        <div className="index-name">{index.name}</div>
        <div className="index-values">
          <span className="index-price num">{fmt(index.price)}</span>
          <span className="index-change num" style={{ color: changeTone(index.changePct) }}>
            {changeGlyph(index.changePct)} {pct(index.changePct)}
          </span>
        </div>
      </div>
      <div className="spark" aria-hidden="true">
        {index.spark.map((v, i) => (
          <div
            key={i}
            style={{
              height: `${Math.round(18 + ((v - lo) / (hi - lo || 1)) * 82)}%`,
              background: up ? 'var(--color-accent-400)' : 'var(--color-neutral-400)',
            }}
          />
        ))}
      </div>
    </Blueprint>
  );
}
