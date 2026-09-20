import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

const SETTINGS_KEY = 'hawk.settings';

export const DEFAULT_SETTINGS = {
  horizonMin: 30, // forecast horizon: 15 or 30 minutes
  callView: 'verdict', // 'verdict' (simple) or 'ladder' (probability bands)
  timeframe: '5m', // default chart timeframe
  liveUpdates: true, // poll prices every few seconds
  confirmOrders: true, // show the confirm dialog before sending an order
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...readJSON(SETTINGS_KEY, {}),
  }));

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeJSON(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    writeJSON(SETTINGS_KEY, null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
