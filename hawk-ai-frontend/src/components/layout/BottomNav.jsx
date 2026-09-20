import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/terminal', label: 'Terminal', icon: 'M3 17l5-6 4 4 7-9' },
  { to: '/market', label: 'Market', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { to: '/proof', label: 'Proof', icon: 'M4 12l5 5L20 6' },
  { to: '/settings', label: 'Settings', icon: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6' },
];

/** Tab bar pinned to the bottom of the screen on phones. */
export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d={item.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
          </svg>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
