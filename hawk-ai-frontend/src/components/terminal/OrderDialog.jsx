import { fmt, rupees } from '../../lib/format';
import Dialog from '../ui/Dialog';

/** Confirmation step before an order is sent to the broker. */
export default function OrderDialog({ order, onClose, onConfirm, busy, error }) {
  const rows = order
    ? [
        { k: 'Order type', v: 'Bracket · Market' },
        { k: 'Quantity', v: order.quantity.toLocaleString('en-IN') },
        { k: 'Entry', v: fmt(order.entry) },
        { k: 'Target', v: fmt(order.target) },
        { k: 'Stop loss', v: fmt(order.stopLoss) },
        { k: 'Capital at risk', v: rupees(order.risk) },
      ]
    : [];

  return (
    <Dialog open={Boolean(order)} onClose={onClose} labelledBy="order-dialog-title">
      {order && (
        <>
          <span className="kicker kicker-accent">CONFIRM ORDER · {order.side}</span>
          <h3 id="order-dialog-title" className="dialog-title">
            {order.side} {order.quantity.toLocaleString('en-IN')} {order.name}
          </h3>
          <div className="dialog-rows">
            {rows.map((r) => (
              <div key={r.k} className="dialog-row">
                <span>{r.k}</span>
                <span className="num">{r.v}</span>
              </div>
            ))}
          </div>
          <p className="dialog-note">
            {order.withCall
              ? 'This matches the engine call. Stop loss and target are pre-attached as a bracket order.'
              : order.callAction === 'WAIT'
                ? 'The engine says WAIT for this symbol, so the position size has been halved automatically.'
                : 'This trades against the engine call, so the position size has been halved automatically.'}
          </p>
          {error && (
            <p className="dialog-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary dialog-confirm" onClick={onConfirm} disabled={busy}>
              {busy ? 'PLACING…' : 'PLACE ORDER'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
