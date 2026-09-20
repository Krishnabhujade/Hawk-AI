import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';

/** Frame shared by every signed-in screen: header, page, phone tab bar. */
export default function AppShell() {
  return (
    <div className="app">
      <Header />
      <Outlet />
      <BottomNav />
    </div>
  );
}
