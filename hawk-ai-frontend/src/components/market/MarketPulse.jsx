import Blueprint from '../ui/Blueprint';

/** Overall market mood gauge with breadth and volatility stats. */
export default function MarketPulse({ pulse }) {
  const cells = Array.from({ length: 20 }, (_, i) => {
    if (i * 5 >= pulse.score) return 'var(--tint-ink-6)';
    return `var(--color-accent-${i < 7 ? 300 : i < 13 ? 500 : 700})`;
  });
  const stats = [
    pulse.advances != null && { k: 'ADVANCES', v: Number(pulse.advances).toLocaleString('en-IN') },
    pulse.declines != null && { k: 'DECLINES', v: Number(pulse.declines).toLocaleString('en-IN') },
    pulse.vix != null && { k: 'INDIA VIX', v: Number(pulse.vix).toFixed(2) },
  ].filter(Boolean);

  return (
    <Blueprint className="pulse-card">
      <h6>Market pulse</h6>
      <div className="pulse-head">
        <span className="pulse-verdict">{pulse.verdict}</span>
        <span className="pulse-score num">{pulse.score}/100</span>
      </div>
      <div className="pulse-gauge" role="meter" aria-valuenow={pulse.score} aria-valuemin={0} aria-valuemax={100} aria-label="Market pulse score">
        {cells.map((fill, i) => (
          <div key={i} style={{ background: fill }} />
        ))}
        <div className="pulse-needle" style={{ left: `${pulse.score}%` }} />
      </div>
      <div className="pulse-scale">
        <span>BEARISH</span>
        <span>NEUTRAL</span>
        <span>BULLISH</span>
      </div>
      {stats.length > 0 && (
        <div className="pulse-stats">
          {stats.map((s) => (
            <div key={s.k}>
              <div className="kicker">{s.k}</div>
              <div className="stat-value num">{s.v}</div>
            </div>
          ))}
        </div>
      )}
    </Blueprint>
  );
}
