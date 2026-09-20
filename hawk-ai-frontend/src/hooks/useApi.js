import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data from an api.* function and keep it fresh.
 *
 *   const { data, error, loading, reload } =
 *     useApi(() => api.getCandles(symbol, tf), [symbol, tf], { refreshMs: 5000 });
 *
 * - Re-runs when anything in `deps` changes.
 * - Keeps showing the previous data while new data loads (no flicker).
 * - Ignores late responses from an older request.
 * - `refreshMs` polls in the background (0 = off).
 */
export function useApi(fetcher, deps = [], { refreshMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  // Always call the latest fetcher (runs before the effect below).
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    const run = (foreground) => {
      if (foreground) setState((s) => ({ ...s, loading: true, error: null }));
      fetcherRef
        .current()
        .then((data) => alive && setState({ data, error: null, loading: false }))
        .catch((error) => alive && setState((s) => ({ data: s.data, error, loading: false })));
    };
    run(true);
    const timer = refreshMs > 0 ? setInterval(() => run(false), refreshMs) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, refreshMs]);

  return { ...state, reload };
}
