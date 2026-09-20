import { Link, NavLink } from 'react-router-dom';
import { USE_MOCK } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useClock } from '../../hooks/useClock';
import { initials } from '../../lib/format';

export const NAV_ITEMS = [
  { to: '/terminal', label: 'Terminal' },
  { to: '/market', label: 'Market' },
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
        <span className="header-clock num">{clock} IST</span>
        <span className="tag tag-outline header-engine">Engine v2.4</span>
        <Link to="/settings" className="avatar" title={`${user?.name ?? 'Account'} · Settings`}>
          {initials(user?.name)}
        </Link>
      </div>
    </header>
  );
}
