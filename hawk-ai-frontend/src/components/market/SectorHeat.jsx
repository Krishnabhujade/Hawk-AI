import { pct } from '../../lib/format';

/** Sector heatmap — deeper steel means a stronger move. */
export default function SectorHeat({ sectors }) {
  return (
    <section className="market-section">
      <div className="section-head">
        <h4>Sector heat</h4>
        <span className="section-hint">Depth of steel = strength of the move.</span>
      </div>
      <div className="heat-grid">
        {sectors.map((s) => {
          const a = Math.abs(s.changePct);
          const step = a > 1.8 ? 700 : a > 1.2 ? 500 : a > 0.6 ? 300 : 200;
          const fill = s.changePct >= 0 ? `var(--color-accent-${step})` : `var(--color-neutral-${step})`;
          return (
            <div
              key={s.name}
              className="heat-cell"
              style={{ background: fill, color: step >= 500 ? 'var(--color-bg)' : 'var(--color-text)' }}
            >
              <span className="heat-name">{s.name}</span>
              <span className="heat-change num">{pct(s.changePct, 1)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
