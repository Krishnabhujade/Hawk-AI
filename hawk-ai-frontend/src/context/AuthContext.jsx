import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, USE_MOCK } from '../api';
import { AUTH_KEY, UNAUTHORIZED_EVENT } from '../api/client';
import { readJSON, writeJSON } from '../lib/storage';

const AuthContext = createContext(null);

/**
 * Keeps the signed-in user and token.
 * In sample-data mode any email + password signs in (demo only).
 * With a backend, POST /api/auth/login must return { token, user }.
 *
 * The saved token is checked once when the app opens, and any later 401 from a
 * request that carried a token signs the user out. Without that, an expired
 * token leaves the app looking signed in while the one action that needs auth
 * (placing an order) fails with no way to recover.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readJSON(AUTH_KEY, null));

  // One place writes the session to storage. Doing it here rather than inside a
  // setSession updater keeps those updaters pure — React is allowed to run an
  // updater more than once, and does in StrictMode.
  useEffect(() => {
    writeJSON(AUTH_KEY, session);
  }, [session]);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    const next = { token: result.token, user: result.user };
    setSession(next);
    return next.user;
  }, []);

  const logout = useCallback(() => setSession(null), []);

  // Sign out whenever the server rejects a token we sent.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  // Follow sign-in and sign-out in other tabs. Without this, signing out in one
  // tab leaves the others showing a signed-in app whose requests go out with no
  // token — they 401, but the sign-out above only fires for requests that
  // actually carried a token, so those tabs would get stuck.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== null && e.key !== AUTH_KEY) return; // null = storage cleared
      setSession(readJSON(AUTH_KEY, null));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Check the saved token once on open. A 401 fires the event above, which
  // signs the user out; anything else (server down, offline) is ignored so a
  // brief outage doesn't throw people back to the login page.
  useEffect(() => {
    if (USE_MOCK || !session?.token) return;
    // The reply belongs to the token it was issued for. If the session moves on
    // while the request is in flight — signed out, or signed in as someone else
    // — dropping it stops one account's name being pinned to another's token.
    const issuedFor = session.token;
    let alive = true;
    api.getMe().then(
      (user) => {
        if (!alive || !user) return;
        setSession((prev) => {
          if (!prev || prev.token !== issuedFor) return prev;
          if (prev.user?.name === user.name && prev.user?.email === user.email) return prev;
          return { ...prev, user }; // keep the display name in step with the server
        });
      },
      () => {
        /* 401 already handled by the event listener; other errors are ignored */
      },
    );
    return () => {
      alive = false;
    };
    // Runs once on mount: re-checking on every session change would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user: session?.user ?? null, token: session?.token ?? null, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
