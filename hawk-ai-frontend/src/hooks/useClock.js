import { useEffect, useState } from 'react';
import { timeIST } from '../lib/format';

/** Current India time as "HH:MM:SS", updated every second. */
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return timeIST(now, true);
}
