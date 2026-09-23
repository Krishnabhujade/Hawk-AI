import { Link, NavLink } from 'react-router-dom';
import { api, USE_MOCK } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useApi } from '../../hooks/useApi';
import { useClock } from '../../hooks/useClock';
import { initials } from '../../lib/format';

/** "2026-09-18" -> "18 Sep". Returns '' for anything unexpected. */
function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export const NAV_ITEMS = [
  { to: '/terminal', label: 'Terminal' },
  { to: '/market', label: 'Market' },
  { to: '/orders', label: 'Orders' },
  { to: '/proof', label: 'Proof' },
];

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-hawk">HAWK</span>
      <span className="brand-ai">AI</span>
    </span>
  );
}

export default function Header() {
  const clock = useClock();
  const { user } = useAuth();
  const { settings } = useSettings();

  // Which market day the backend is replaying, and where its clock has got to.
  // Only meaningful against a real backend, so it is skipped in sample-data mode.
  const status = useApi(() => (USE_MOCK ? Promise.resolve(null) : api.getStatus()), [], {
    refreshMs: settings.liveUpdates ? 15000 : 0,
  });
  const replayDate = shortDate(status.data?.replayDate);

  return (
    <header className="app-header">
      <Link to="/terminal" className="brand-link" aria-label="Hawk AI home">
        <Brand />
      </Link>

      <nav className="header-nav" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-tab">
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="header-right">
        <div className="data-status" title={USE_MOCK ? 'Showing built-in sample data' : 'Connected to the Hawk AI API'}>
          <i className="pulse-dot" aria-hidden="true" />
          <span>{USE_MOCK ? 'Sample data · demo' : 'Live · API'}</span>
        </div>
        {replayDate && (
          <span
            className="header-replay"
            title={`Replaying ${status.data.replayDate} as today. Market time ${status.data.marketTime} IST. Data source: ${status.data.dataSource}.`}
          >
            <span className="kicker">REPLAY</span>
            <span className="num">
              {replayDate} · {String(status.data.marketTime).slice(0, 5)}
            </span>
          </span>
        )}
        <span className="header-clock num">{clock} IST</span>
        <span className="tag tag-outline header-engine">Engine v2.4</span>
        <Link to="/settings" className="avatar" title={`${user?.name ?? 'Account'} · Settings`}>
          {initials(user?.name)}
        </Link>
      </div>
    </header>
  );
}
