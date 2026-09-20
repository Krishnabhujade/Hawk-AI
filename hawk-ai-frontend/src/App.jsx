import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RequireAuth from './components/layout/RequireAuth';
import LoginPage from './pages/LoginPage';
import MarketPage from './pages/MarketPage';
import NotFoundPage from './pages/NotFoundPage';
import ProofPage from './pages/ProofPage';
import SettingsPage from './pages/SettingsPage';
import TerminalPage from './pages/TerminalPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/terminal" replace />} />
        <Route path="terminal" element={<TerminalPage />} />
        <Route path="market" element={<MarketPage />} />
        <Route path="proof" element={<ProofPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
