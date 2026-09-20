// Turns a prediction from the backend into the numbers the UI shows.

const sign = (dir) => (dir === 'DOWN' ? -1 : dir === 'FLAT' ? 0 : 1);

/**
 * Target and stop-loss for a call. Uses the backend's values when it sends
 * them, otherwise derives them from the expected move and the last close.
 *
 * A FLAT call has no direction, so the backend sends null for both and there
 * is no meaningful target or stop. The numbers still fall back to the last
 * close (the chart needs a line to draw its forecast cone along), but
 * `directional` is false so the Verdict panel can show "—" instead of
 * printing the same number twice.
 */
export function levels(prediction, lastClose) {
  const s = sign(prediction.dir);
  const move = Math.abs(prediction.expectedMovePct) / 100;
  const directional = s !== 0 || prediction.target != null || prediction.stopLoss != null;
  return {
    entry: lastClose,
    directional,
    target: prediction.target ?? lastClose * (1 + s * move),
    stopLoss: prediction.stopLoss ?? lastClose * (1 - s * move * 0.45),
  };
}

/** One-paragraph explanation in plain language. */
export function plainSummary(prediction, horizonLabel) {
  const times = prediction.samples.toLocaleString('en-IN');
  if (prediction.dir === 'FLAT') {
    return `${prediction.name} is likely to stay flat for the next ${horizonLabel}. Hawk AI has seen this quiet setup ${times} times before and would rather wait than guess.`;
  }
  const word = prediction.dir === 'UP' ? 'rise' : 'fall';
  return `Hawk AI expects ${prediction.name} to ${word} about ${Math.abs(prediction.expectedMovePct).toFixed(1)}% in the next ${horizonLabel}. It has seen this setup ${times} times in ten years of history and been right ${prediction.hitRate}% of the time.`;
}

/**
 * Outcome ladder: probability of the move landing in each band.
 * The backend may send `ladder: [{ label, pct, favoured }]`; if not, it is
 * estimated from the call's direction and confidence.
 */
export function outcomeLadder(prediction) {
  let rows = prediction.ladder;
  if (!rows?.length) {
    const flat = prediction.dir === 'FLAT' ? prediction.prob : 18;
    const dirP = prediction.dir === 'FLAT' ? Math.round((100 - flat) / 2) : prediction.prob;
    const opp = Math.max(4, 100 - flat - dirP);
    const strong = Math.round(dirP * 0.42);
    const soft = dirP - strong;
    const oStrong = Math.round(opp * 0.45);
    const oSoft = opp - oStrong;
    const band = (label, pct, favoured) => ({ label, pct, favoured });
    rows =
      prediction.dir === 'DOWN'
        ? [
            band('above +1.5%', oSoft, false),
            band('+0.5 → +1.5%', oStrong, false),
            band('−0.5 → +0.5%', flat, false),
            band('−1.5 → −0.5%', soft, true),
            band('below −1.5%', strong, true),
          ]
        : [
            band('above +1.5%', strong, true),
            band('+0.5 → +1.5%', soft, true),
            band('−0.5 → +0.5%', flat, prediction.dir === 'FLAT'),
            band('−1.5 → −0.5%', oStrong, false),
            band('below −1.5%', oSoft, false),
          ];
  }
  const max = Math.max(...rows.map((r) => r.pct), 1);
  return rows.map((r) => ({ ...r, width: Math.round((r.pct / max) * 100) }));
}

/** Rupee amount lost if the stop-loss is hit. */
export function capitalAtRisk(quantity, entry, stopLoss) {
  return Math.abs(entry - stopLoss) * quantity;
}


/**
 * Bracket levels for an order on `side` ('BUY' | 'SELL').
 * Trading with the call uses the call's levels; trading against it
 * mirrors them around the entry and halves the size.
 */
export function bracketFor(side, entry, prediction, quantity) {
  const withCall = side === prediction.action;
  const move = Math.max(Math.abs(prediction.expectedMovePct), 0.3) / 100;
  const s = side === 'BUY' ? 1 : -1;

  // The call's levels were worked out at the top of the market minute, but the
  // price keeps moving underneath them. If the price has already run past one,
  // it now sits on the wrong side of the entry and the backend would reject the
  // order ("the target must be above it"). So use a call level only while it is
  // still on the correct side, and otherwise derive one from the live price.
  // For a BUY (s = 1) that means target > entry > stopLoss; SELL is mirrored.
  const usableTarget = prediction.target != null && s * (prediction.target - entry) > 0;
  const usableStop = prediction.stopLoss != null && s * (entry - prediction.stopLoss) > 0;

  const target = withCall && usableTarget ? prediction.target : entry * (1 + s * move);
  const stopLoss = withCall && usableStop ? prediction.stopLoss : entry * (1 - s * move * 0.45);
  const qty = withCall ? quantity : Math.max(1, Math.floor(quantity / 2));
  return { withCall, target, stopLoss, quantity: qty, risk: capitalAtRisk(qty, entry, stopLoss) };
}
