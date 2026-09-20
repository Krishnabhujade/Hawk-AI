import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, TIMEFRAMES, USE_MOCK } from '../api';
import Blueprint from '../components/ui/Blueprint';
import Segmented from '../components/ui/Segmented';
import Switch from '../components/ui/Switch';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { initials } from '../lib/format';

const BROKERS = [
  { id: 'zerodha', name: 'Zerodha', api: 'Kite Connect' },
  { id: 'upstox', name: 'Upstox', api: 'Upstox API' },
  { id: 'angel', name: 'Angel One', api: 'SmartAPI' },
];

function Row({ title, hint, children }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <div className="setting-title">{title}</div>
        {hint && <div className="setting-hint">{hint}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  usePageTitle('Settings');
  const { settings, update, reset } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="page page-scroll page-settings">
      <div className="settings-wrap">
        <div className="settings-head">
          <span className="kicker kicker-accent">PREFERENCES</span>
          <h2>Settings</h2>
          <p className="text-muted">Saved on this device. Changes apply straight away.</p>
        </div>

        <Blueprint className="settings-card">
          <h6>Predictions</h6>
          <Row title="Forecast horizon" hint="How far ahead Hawk AI predicts the move.">
            <Segmented
              label="Forecast horizon"
              options={[
                { value: 15, label: '15 min' },
                { value: 30, label: '30 min' },
              ]}
              value={settings.horizonMin}
              onChange={(v) => update({ horizonMin: v })}
            />
          </Row>
          <Row title="Default call view" hint="Verdict is the simple answer. Ladder shows the chance of each outcome.">
            <Segmented
              label="Default call view"
              options={[
                { value: 'verdict', label: 'Verdict' },
                { value: 'ladder', label: 'Ladder' },
              ]}
              value={settings.callView}
              onChange={(v) => update({ callView: v })}
            />
          </Row>
          <Row title="Default chart timeframe" hint="Candle size when the Terminal opens.">
            <Segmented label="Default timeframe" options={TIMEFRAMES} value={settings.timeframe} onChange={(v) => update({ timeframe: v })} />
          </Row>
        </Blueprint>

        <Blueprint className="settings-card">
          <h6>Trading</h6>
          <Row title="Confirm before placing orders" hint="Show the order summary before anything is sent.">
            <Switch label="Confirm before placing orders" checked={settings.confirmOrders} onChange={(v) => update({ confirmOrders: v })} />
          </Row>
          <Row title="Live price updates" hint="Refresh prices every 1.5 seconds and calls every 30 seconds.">
            <Switch label="Live price updates" checked={settings.liveUpdates} onChange={(v) => update({ liveUpdates: v })} />
          </Row>
        </Blueprint>

        <Blueprint className="settings-card">
          <h6>Broker</h6>
          <p className="setting-hint settings-card-intro">
            Orders go to your broker through the Hawk AI backend. Broker sign-in (OAuth) will be added once the server is ready.
          </p>
          {BROKERS.map((b) => (
            <Row key={b.id} title={b.name} hint={b.api}>
              <span className="tag tag-neutral">Not connected</span>
              <button type="button" className="btn btn-secondary" disabled title="Coming soon">
                Connect
              </button>
            </Row>
          ))}
        </Blueprint>

        <Blueprint className="settings-card">
          <h6>Data source</h6>
          <Row
            title={USE_MOCK ? 'Built-in sample data' : 'Hawk AI API'}
            hint={USE_MOCK ? 'Set VITE_API_URL in a .env file to use your FastAPI server.' : API_BASE_URL}
          >
            <span className={`tag ${USE_MOCK ? 'tag-neutral' : 'tag-accent'}`}>{USE_MOCK ? 'Demo' : 'Live'}</span>
          </Row>
        </Blueprint>

        <Blueprint className="settings-card">
          <h6>Account</h6>
          <div className="account-row">
            <span className="avatar avatar-lg">{initials(user?.name)}</span>
            <div>
              <div className="setting-title">{user?.name}</div>
              <div className="setting-hint">{user?.email}</div>
            </div>
          </div>
          <div className="settings-actions">
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Reset settings
            </button>
            <button type="button" className="btn btn-primary" onClick={signOut}>
              Sign out
            </button>
          </div>
        </Blueprint>
      </div>
    </main>
  );
}
