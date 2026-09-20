import EquityBars from '../components/proof/EquityBars';
import PatternTable from '../components/proof/PatternTable';
import Blueprint from '../components/ui/Blueprint';
import { ErrorBox, Loading } from '../components/ui/Status';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';

/** Screen 03 — 10-year backtest validation. */
export default function ProofPage() {
  usePageTitle('Proof');
  const { data, error, reload } = useApi(() => api.getBacktest(), []);

  return (
    <main className="page page-scroll page-proof">
      <div className="proof-wrap">
        <div className="proof-hero">
          <div>
            <span className="kicker proof-kicker">10-YEAR BACKTEST VALIDATION</span>
            <h2 className="proof-title">Every call is a number we already tested.</h2>
            <p className="proof-lead">
              NIFTY 500 and sector indices, 1-minute to 15-minute frames, walk-forward re-fit every quarter with the final
              20% of history never touched. Slippage, brokerage and latency are priced in before a metric is published.
            </p>
          </div>
          {data && (
            <div className="proof-headline">
              {data.headline.map((h) => (
                <div key={h.label} className="headline-stat">
                  <div className="headline-value num">{h.value}</div>
                  <div className="headline-label">{h.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!data && (error ? <ErrorBox error={error} onRetry={reload} /> : <Loading lines={6} />)}

        {data && (
          <>
            <EquityBars equity={data.equity} />
            <div className="proof-grid">
              <PatternTable patterns={data.patterns} />
              <div className="proof-side">
                <section>
                  <h4 className="section-title">Method</h4>
                  <ol className="method-list">
                    {data.method.map((text, i) => (
                      <li key={text}>
                        <span className="method-num">{String(i + 1).padStart(2, '0')}</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ol>
                </section>
                {data.note && (
                  <Blueprint className="proof-note">
                    <span>{data.note}</span>
                  </Blueprint>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
