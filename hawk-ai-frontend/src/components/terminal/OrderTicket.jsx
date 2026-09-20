import { fmt } from '../../lib/format';

/** Quantity + price fields and the BUY / SELL buttons. */
export default function OrderTicket({ quantity, onQuantity, price, onBuy, onSell, note, disabled }) {
  return (
    <div className="order-ticket">
      <div className="ticket-fields">
        <label className="ticket-field">
          <span className="kicker">QUANTITY</span>
          <input
            className="ticket-input num"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => onQuantity(e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))))}
          />
        </label>
        <div className="ticket-field">
          <span className="kicker">PRICE</span>
          <div className="ticket-input ticket-readonly num">{price !== undefined ? fmt(price) : '—'}</div>
        </div>
      </div>
      <div className="ticket-buttons">
        <button type="button" className="btn btn-primary ticket-btn" onClick={onBuy} disabled={disabled}>
          BUY
        </button>
        <button type="button" className="btn btn-secondary ticket-btn" onClick={onSell} disabled={disabled}>
          SELL
        </button>
      </div>
      <div className="ticket-note">Stop loss and target are attached for you. {note}</div>
    </div>
  );
}
