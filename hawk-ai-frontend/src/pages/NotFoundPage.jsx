import { Link } from 'react-router-dom';
import { Brand } from '../components/layout/Header';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Not found');
  return (
    <main className="not-found">
      <Brand />
      <h2>This page doesn’t exist.</h2>
      <Link to="/terminal" className="btn btn-primary">
        Back to the terminal
      </Link>
    </main>
  );
}
