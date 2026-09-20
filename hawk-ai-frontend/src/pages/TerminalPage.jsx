import { useMemo, useState } from 'react';
import { api } from '../api';
import CallPanel from '../components/terminal/CallPanel';
import ChartPanel from '../components/terminal/ChartPanel';
import OrderDialog from '../components/terminal/OrderDialog';
import OrderTicket from '../components/terminal/OrderTicket';
import StepsBar from '../components/terminal/StepsBar';
import Watchlist from '../components/terminal/Watchlist';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';
import { bracketFor, levels as callLevels } from '../lib/prediction';

const DEFAULT_NOTE = 'Bracket order · 1\u2011tap';

/** Screen 01 — watch the chart, read the AI call, act. */
export default function TerminalPage() {
  usePageTitle('Terminal');
  const { settings } = useSettings();
  const live = settings.liveUpdates;
  const horizonMin = settings.horizonMin;
  const horizonLabel = `${horizonMin} min`;

  const [symbol, setSymbol] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState(settings.timeframe);
  const [view, setView] = useState(settings.callView);
  const [qtyBySymbol, setQtyBySymbol] = useState({});
  const [draft, setDraft] = useState(null); // order waiting for confirmation
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderNote, setOrderNote] = useState(DEFAULT_NOTE);

  // Each response is tagged with the symbol it belongs to, so a slow reply
  // for the previous symbol is never mixed with the new one.
  const tag = (promise) => promise.then((data) => ({ symbol, data }));
  const watchlist = useApi(() => api.getWatchlist(), [], { refreshMs: live ? 15000 : 0 });
  const candlesRes = useApi(() => tag(api.getCandles(symbol, timeframe)), [symbol, timeframe], {
    refreshMs: live ? 30000 : 0,
  });
  const predictionRes = useApi(() => tag(api.getPrediction(symbol, horizonMin)), [symbol, horizonMin], {
    refreshMs: live ? 30000 : 0,
  });
  const quoteRes = useApi(() => tag(api.getQuote(symbol)), [symbol], { refreshMs: live ? 1500 : 0 });

  const current = (res) => ({ ...res, data: res.data?.symbol === symbol ? res.data.data : null });
  const candles = current(candlesRes);
  const prediction = current(predictionRes);
  const quote = current(quoteRes).data;

  const lastClose = candles.data?.at(-1)?.c;
  const livePrice = quote?.price ?? lastClose;
  const levels = useMemo(
    () => (prediction.data && lastClose !== undefined ? callLevels(prediction.data, lastClose) : null),
    [prediction.data, lastClose],
  );

  const name = prediction.data?.name ?? watchlist.data?.find((w) => w.symbol === symbol)?.name ?? symbol;
  const quantity = qtyBySymbol[symbol] ?? prediction.data?.suggestedQty ?? 1;

  function selectSymbol(next) {
    setSymbol(next);
    setOrderNote(DEFAULT_NOTE);
  }

  async function send(order) {
    setPlacing(true);
    setOrderError('');
    try {
      const res = await api.placeOrder({
        symbol,
        side: order.side,
        quantity: order.quantity,
        orderType: 'BRACKET',
        entry: order.entry,
        target: order.target,
        stopLoss: order.stopLoss,
      });
      setOrderNote(`${order.side} queued · #${res.id}`);
      setDraft(null);
    } catch (err) {
      setOrderError(err.message);
      if (!settings.confirmOrders) setOrderNote(`Order failed · ${err.message}`);
    } finally {
      setPlacing(false);
    }
  }

  function openOrder(side) {
    if (!prediction.data || livePrice === undefined || !(quantity > 0)) return;
    const bracket = bracketFor(side, livePrice, prediction.data, quantity);
    const order = { side, name, entry: livePrice, callAction: prediction.data.action, ...bracket };
    setOrderError('');
    if (settings.confirmOrders) setDraft(order);
    else send(order);
  }

  return (
    <main className="page page-terminal">
      <StepsBar />
      <div className="terminal-grid">
        <Watchlist query={watchlist} selected={symbol} onSelect={selectSymbol} liveQuote={quote} />

        <ChartPanel
          name={name}
          quote={quote}
          timeframe={timeframe}
          onTimeframe={setTimeframe}
          candlesQuery={candles}
          target={levels?.target}
          horizonMin={horizonMin}
          pattern={prediction.data?.pattern}
        />

        <CallPanel
          predictionQuery={prediction}
          levels={levels}
          view={view}
          onView={setView}
          horizonLabel={horizonLabel}
        >
          <OrderTicket
            quantity={quantity}
            onQuantity={(q) => setQtyBySymbol((m) => ({ ...m, [symbol]: q }))}
            price={livePrice}
            onBuy={() => openOrder('BUY')}
            onSell={() => openOrder('SELL')}
            note={placing && !draft ? 'Sending…' : orderNote}
            disabled={!prediction.data || !(quantity > 0) || placing}
          />
        </CallPanel>
      </div>

      <OrderDialog
        order={draft}
        busy={placing}
        error={orderError}
        onClose={() => !placing && setDraft(null)}
        onConfirm={() => send(draft)}
      />
    </main>
  );
}
