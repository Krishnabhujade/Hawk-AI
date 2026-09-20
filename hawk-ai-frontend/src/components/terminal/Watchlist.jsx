import { fmt, pct } from '../../lib/format';
import { ErrorBox, Loading } from '../ui/Status';

/**
 * List of tracked symbols with their AI call. A vertical column on desktop,
 * a horizontal strip of cards on tablets and phones.
 */
export default function Watchlist({ query, selected, onSelect, liveQuote }) {
  const { data, error, loading, reload } = query;

  return (
    <aside className="watchlist" aria-label="Watchlist">
      <div className="panel-title">
        <h6>Watchlist</h6>
      </div>
      <div className="watch-items">
        {!data && loading && <Loading lines={6} />}
        {!data && error && <ErrorBox error={error} onRetry={reload} />}
        {data?.map((item) => {
          const active = item.symbol === selected;
          const quote = active && liveQuote?.symbol === item.symbol ? liveQuote : null;
          const price = quote?.price ?? item.price;
          const change = quote?.changePct ?? item.changePct;
          return (
            <button
              key={item.symbol}
              type="button"
              className="watch-item"
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(item.symbol)}
            >
              <span className="watch-row">
                <span className="watch-name">{item.name}</span>
                <span className="watch-price num">{fmt(price)}</span>
              </span>
              <span className="watch-row">
                <span className="watch-call">
                  {item.call.action} · {item.call.prob}%
                </span>
                <span className="watch-change num">{pct(change)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
