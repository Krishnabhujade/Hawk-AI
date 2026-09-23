import { useCallback, useState } from 'react';
import { api } from '../api';
import Segmented from '../components/ui/Segmented';
import { ErrorBox, Loading } from '../components/ui/Status';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';
import { changeTone, fmt, signed } from '../lib/format';

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

// How an order ended, in words the user can read.
const REASON_TEXT = {
  TARGET: 'Target hit',
  STOP: 'Stop loss hit',
  SQUARE_OFF: 'Squared off 15:20',
  MANUAL: 'Closed by you',
};

/** "2026-09-18T14:05:00" -> "14:05". Falls back to the raw text if it's an odd shape. */
function timeOf(marketTime) {
  if (!marketTime) return '—';
  const t = String(marketTime).split('T')[1];
  return t ? t.slice(0, 5) : String(marketTime);
}

/** Screen 04 — paper orders and what they made or lost. */
export default function OrdersPage() {
  usePageTitle('Orders');
  const { settings } = useSettings();
  const refreshMs = settings.liveUpdates ? 5000 : 0;

  const [filter, setFilter] = useState('ALL');
  const [closingId, setClosingId] = useState(null);
  const [closeError, setCloseError] = useState('');

  // The backend settles orders (target / stop / 15:20 square-off) whenever the
  // list is fetched, so polling here also keeps their status up to date.
  const orders = useApi(() => api.getOrders(filter === 'ALL' ? undefined : filter), [filter], { refreshMs });
  const portfolio = useApi(() => api.getPortfolio(), [], { refreshMs });

  const { reload: reloadOrders } = orders;
  const { reload: reloadPortfolio } = portfolio;

  const closeOne = useCallback(
    async (id) => {
      setClosingId(id);
      setCloseError('');
      try {
        await api.closeOrder(id);
        reloadOrders();
        reloadPortfolio();
      } catch (err) {
        setCloseError(`Could not close ${id}: ${err.message}`);
      } finally {
        setClosingId(null);
      }
    },
    [reloadOrders, reloadPortfolio],
  );

  const p = portfolio.data;
  const stats = p
    ? [
        { label: 'Open positions', value: String(p.openPositions) },
        { label: 'Closed trades', value: String(p.closedTrades) },
        // `signed` keeps the sign and 2 decimals, so a small loss reads as
        // "₹−0.20" rather than rounding to a confusing "₹-0".
        { label: 'Realised P&L', value: `₹${signed(p.realizedPnl)}`, tone: p.realizedPnl },
        { label: 'Unrealised P&L', value: `₹${signed(p.unrealizedPnl)}`, tone: p.unrealizedPnl },
        { label: 'Win rate', value: p.winRate == null ? '—' : `${p.winRate}%` },
      ]
    : [];

  const rows = orders.data ?? [];

  return (
    <main className="page page-scroll page-orders">
      <div className="orders-wrap">
        <div className="orders-head">
          <div>
            <span className="kicker kicker-accent">PAPER TRADING · NO REAL MONEY</span>
            <h2 className="orders-title">Orders &amp; P&amp;L</h2>
            <p className="text-muted orders-lead">
              Every bracket order you have placed, with live profit and loss. Open positions close automatically when the
              target or the stop loss is touched, and anything still open is squared off at 15:20.
            </p>
          </div>
          <Segmented label="Order filter" options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        {/* Portfolio summary */}
        {p ? (
          <div className="orders-summary">
            {stats.map((s) => (
              <div key={s.label} className="headline-stat">
                <div className="headline-value num" style={s.tone !== undefined ? { color: changeTone(s.tone) } : undefined}>
                  {s.value}
                </div>
                <div className="headline-label">{s.label}</div>
              </div>
            ))}
          </div>
        ) : portfolio.error ? (
          <ErrorBox error={portfolio.error} onRetry={portfolio.reload} />
        ) : (
          <Loading lines={2} label="Loading portfolio…" />
        )}

        {closeError && (
          <p className="form-error" role="alert">
            {closeError}
          </p>
        )}

        {/* Order table */}
        <section className="orders-section">
          {orders.data ? (
            rows.length === 0 ? (
              <div className="orders-empty">
                <p className="orders-empty-title">No {filter === 'ALL' ? '' : filter.toLowerCase()} orders yet.</p>
                <p className="text-muted">
                  Place a bracket order from the Terminal and it will show up here with live P&amp;L.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="table orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th className="right">Qty</th>
                      <th className="right">Entry</th>
                      <th className="right">Target</th>
                      <th className="right">Stop</th>
                      <th className="right">Last / Exit</th>
                      <th className="right">P&amp;L</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => {
                      const open = o.status === 'OPEN';
                      return (
                        <tr key={o.id}>
                          <td className="num cell-order-id">{o.id}</td>
                          <td className="cell-symbol">{o.symbol}</td>
                          <td>
                            <span className={`tag ${o.side === 'BUY' ? 'tag-accent' : 'tag-neutral'}`}>{o.side}</span>
                          </td>
                          <td className="right num">{o.quantity.toLocaleString('en-IN')}</td>
                          <td className="right num">{fmt(o.entryPrice)}</td>
                          <td className="right num">{fmt(o.target)}</td>
                          <td className="right num">{fmt(o.stopLoss)}</td>
                          <td className="right num">{fmt(open ? o.lastPrice : o.exitPrice)}</td>
                          <td className="right num" style={{ color: changeTone(o.pnl) }}>
                            {signed(o.pnl)}
                          </td>
                          <td className="cell-status">
                            {open ? (
                              <span className="tag tag-outline">OPEN · {timeOf(o.marketTime)}</span>
                            ) : (
                              <span className="order-reason">
                                {REASON_TEXT[o.exitReason] ?? o.exitReason ?? 'Closed'}
                                <span className="order-reason-time num"> · {timeOf(o.exitMarketTime)}</span>
                              </span>
                            )}
                          </td>
                          <td className="right">
                            {open && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-close-order"
                                onClick={() => closeOne(o.id)}
                                disabled={closingId === o.id}
                              >
                                {closingId === o.id ? 'Closing…' : 'Close'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : orders.error ? (
            <ErrorBox error={orders.error} onRetry={orders.reload} />
          ) : (
            <Loading lines={6} label="Loading orders…" />
          )}
        </section>

        <p className="orders-disclaimer">
          Paper trading only — no real broker order is ever placed. P&amp;L is gross: brokerage, taxes and slippage are
          not included.
        </p>
      </div>
    </main>
  );
}
