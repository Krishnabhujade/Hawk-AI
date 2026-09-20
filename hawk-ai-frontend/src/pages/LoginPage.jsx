import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { USE_MOCK } from '../api';
import { Brand } from '../components/layout/Header';
import Blueprint from '../components/ui/Blueprint';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

const STEPS = [
  { n: 1, title: 'Watch', text: 'Follow the live chart for NIFTY 500 stocks and indices.' },
  { n: 2, title: 'Read the call', text: 'Hawk AI predicts the next 15–30 minutes and explains why.' },
  { n: 3, title: 'Act', text: 'Place a bracket order with stop loss and target attached.' },
];

export default function LoginPage() {
  usePageTitle('Sign in');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/terminal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={from} replace />;

  async function signIn(e, creds = { email, password }) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(creds.email, creds.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <Blueprint className="login-hero-inner">
          <Brand />
          <div>
            <span className="kicker login-kicker">AI &amp; ML INTEGRATED GUIDANCE PLATFORM</span>
            <h1 className="login-tagline">Trade the future, before it happens.</h1>
          </div>
          <ol className="login-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="step-num">{s.n}</span>
                <div>
                  <div className="login-step-title">{s.title}</div>
                  <div className="login-step-text">{s.text}</div>
                </div>
              </li>
            ))}
          </ol>
        </Blueprint>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={signIn} noValidate>
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <h2 className="login-title">Sign in</h2>
          <p className="text-muted login-sub">Use your Hawk AI account to open the terminal.</p>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="btn btn-ghost password-toggle" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          {USE_MOCK && (
            <>
              <div className="login-divider">
                <span>or</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={busy}
                onClick={() => signIn(null, { email: 'demo.trader@hawk.ai', password: 'demo' })}
              >
                Try the demo
              </button>
              <p className="login-note">Demo mode: any email and password will work. Real sign-in needs the backend.</p>
            </>
          )}

          <p className="login-disclaimer">
            Hawk AI gives probability-based guidance, not investment advice. Trading carries risk.
          </p>
        </form>
      </section>
    </main>
  );
}
